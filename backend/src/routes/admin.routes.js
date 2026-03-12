const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  let seedRunning = false;
  let resetRunning = false;
  const {
    prisma,
    authRequired,
    requireAdmin,
    audit,
    scheduleForUser,
    syncAdUsers,
    clearReportCache,
  } = ctx;

  router.post("/admin/reset", authRequired, requireAdmin, async (req, res) => {
    if (seedRunning) {
      return res.status(409).json({ error: "Generation en cours. Reessayez apres la fin." });
    }
    if (resetRunning) {
      return res.status(409).json({ error: "Reinitialisation deja en cours." });
    }
    resetRunning = true;
    try {
    const fullReset = String(req.query?.full || req.body?.full || "").toLowerCase() === "true";
    // Evite le timeout de transaction interactive Prisma sur gros volumes.
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    try {
      await prisma.$executeRawUnsafe("TRUNCATE TABLE `Clock`");
      await prisma.$executeRawUnsafe("TRUNCATE TABLE `AuditLog`");
      if (fullReset) {
        await prisma.$executeRawUnsafe("TRUNCATE TABLE `TeamMember`");
        await prisma.$executeRawUnsafe("TRUNCATE TABLE `Team`");
      }
    } finally {
      await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    }
    await audit({
      actorUserId: req.user.id,
      action: "RESET_DATA",
      meta: { fullReset },
    });
    if (typeof clearReportCache === "function") clearReportCache();
    return res.json({ ok: true, fullReset });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Reset failed" });
    } finally {
      resetRunning = false;
    }
  });

  let seedStatus = {
    running: false,
    days: 0,
    maxUsers: 0,
    eligibleUsers: 0,
    totalUsers: 0,
    processedUsers: 0,
    generated: 0,
    startedAt: null,
    finishedAt: null,
    error: null,
  };

  const generateSeedData = async ({ daysToGenerate, maxUsers, actorUserId }) => {
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const randNormal = (mean = 0, stdDev = 1) => {
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return mean + z * stdDev;
    };
    const toLocalDateKey = (dateObj) =>
      `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    const timeToMinutes = (timeStr) => {
      const [h, m] = String(timeStr || "00:00").split(":").map((v) => parseInt(v, 10));
      return (h || 0) * 60 + (m || 0);
    };
    const makeProfile = (user) => {
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      const isManagerUser = roles.includes("MANAGER");
      const isFinance = String(user?.department || "").toLowerCase() === "finance";
      const absenceRate = isManagerUser ? 0.012 + Math.random() * 0.03 : 0.02 + Math.random() * 0.05;
      const halfDayRate = isManagerUser ? 0.01 + Math.random() * 0.03 : 0.015 + Math.random() * 0.05;
      const remoteRate = 0.08 + Math.random() * 0.22;
      const overtimeRate = (isManagerUser ? 0.14 : 0.08) + (isFinance ? 0.04 : 0);
      const lateMean = isManagerUser ? -2 + Math.random() * 8 : -1 + Math.random() * 14;
      const lateStd = 6 + Math.random() * 9;
      return { absenceRate, halfDayRate, remoteRate, overtimeRate, lateMean, lateStd };
    };

    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        isProvisioned: true,
        OR: [
          // Employés: uniquement ceux affectés à une équipe.
          {
            AND: [
              { roles: { path: "$", array_contains: "EMPLOYEE" } },
              { teams: { some: {} } },
            ],
          },
          // Managers provisionnés: toujours inclus.
          { roles: { path: "$", array_contains: "MANAGER" } },
        ],
      },
      select: {
        id: true,
        roles: true,
        department: true,
        contractType: true,
        scheduleAmStart: true,
        scheduleAmEnd: true,
        schedulePmStart: true,
        schedulePmEnd: true,
        workingDays: true,
        graceMinutes: true,
      },
    });
    if (!users.length) throw new Error("No users");
    const totalEligibleUsers = users.length;
    const requestedMaxUsers = Number.isFinite(maxUsers) ? maxUsers : null;
    const effectiveMaxUsers = requestedMaxUsers && requestedMaxUsers > 0
      ? Math.max(1, Math.min(totalEligibleUsers, requestedMaxUsers))
      : totalEligibleUsers;
    let seededUsers = users;
    if (totalEligibleUsers > effectiveMaxUsers) {
      // Echantillonnage aléatoire pour accélérer la génération sur gros annuaires.
      seededUsers = [...users];
      for (let i = seededUsers.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = seededUsers[i];
        seededUsers[i] = seededUsers[j];
        seededUsers[j] = tmp;
      }
      seededUsers = seededUsers.slice(0, effectiveMaxUsers);
    }
    seedStatus.eligibleUsers = totalEligibleUsers;
    seedStatus.totalUsers = seededUsers.length;

    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const from = new Date(base);
    from.setDate(from.getDate() - (daysToGenerate - 1));

    const dayContextByKey = new Map();
    const days = [];
    const monthLoadFactor = [0.03, 0.01, 0.02, 0.05, 0.04, -0.02, -0.05, -0.04, 0.0, 0.04, 0.08, 0.1];
    const weekdayLoadFactor = [-0.16, 0.1, 0.05, 0.03, -0.01, -0.1, -0.14];
    for (let i = 0; i < daysToGenerate; i += 1) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = toLocalDateKey(d);
      const seasonal = monthLoadFactor[d.getMonth()] || 0;
      const weekly = weekdayLoadFactor[d.getDay()] || 0;
      const loadFactor = clamp(seasonal + weekly + randNormal(0, 0.16), -0.45, 0.55);
      const incident = Math.random() < 0.12;
      const monthEndRush = d.getDate() >= 25 && Math.random() < 0.35;
      const transportIssue = Math.random() < 0.06;
      const remoteBoost = transportIssue ? 0.22 : (incident ? 0.08 : 0);
      const absenceBoost = transportIssue ? 0.08 : (incident ? 0.03 : 0);
      const overtimeBoost = monthEndRush ? 0.2 : (loadFactor > 0.18 ? 0.1 : 0);
      dayContextByKey.set(key, {
        loadFactor,
        incident,
        monthEndRush,
        transportIssue,
        remoteBoost,
        absenceBoost,
        overtimeBoost,
        incidentPenaltyMin: incident ? randInt(25, 95) : 0,
        earlyLeavePenaltyMin: transportIssue ? randInt(15, 55) : 0,
        lateShiftMin: (incident ? randInt(6, 24) : 0) + (transportIssue ? randInt(8, 22) : 0),
      });
      days.push({
        dateKey: key,
        weekday: d.getDay(),
        localStartMs: new Date(`${key}T00:00:00`).getTime(),
        utcDate: new Date(`${key}T00:00:00.000Z`),
      });
    }

    if (daysToGenerate >= 365) {
      // Rebuild complet annuel: TRUNCATE est beaucoup plus rapide qu'un DELETE massif.
      await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      try {
        await prisma.$executeRawUnsafe("TRUNCATE TABLE `Clock`");
      } finally {
        await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
      }
    } else {
      let deleted = false;
      for (let attempt = 1; attempt <= 3 && !deleted; attempt += 1) {
        try {
          await prisma.clock.deleteMany({
            where: {
              date: {
                gte: new Date(`${toLocalDateKey(from)}T00:00:00.000Z`),
                lte: new Date(`${toLocalDateKey(base)}T00:00:00.000Z`),
              },
            },
          });
          deleted = true;
        } catch (err) {
          const isWriteConflict = err?.code === "P2034";
          if (!isWriteConflict || attempt === 3) throw err;
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        }
      }
    }

    const insertChunkSize = 15000;
    let totalGenerated = 0;
    let rowsBuffer = [];

    for (let userIdx = 0; userIdx < seededUsers.length; userIdx += 1) {
      const u = seededUsers[userIdx];
      const profile = makeProfile(u);
      const sched = scheduleForUser(u);
      const workingDays = Array.isArray(u.workingDays) && u.workingDays.length
        ? new Set(u.workingDays.map((v) => parseInt(v, 10)).filter((v) => Number.isFinite(v) && v >= 0 && v <= 6))
        : new Set([1, 2, 3, 4, 5]);
      const amStartOffsetMs = timeToMinutes(sched.amStart) * 60000;
      const amEndOffsetMs = timeToMinutes(sched.amEnd) * 60000;
      const pmStartOffsetMs = timeToMinutes(sched.pmStart) * 60000;
      const pmEndOffsetMs = timeToMinutes(sched.pmEnd) * 60000;
      const graceMin = sched.graceMin || 15;

      for (const day of days) {
        if (!workingDays.has(day.weekday)) continue;
        const dateKey = day.dateKey;
        const weekday = day.weekday;
        const dayCtx = dayContextByKey.get(dateKey) || {
          loadFactor: 0,
          incident: false,
          monthEndRush: false,
          transportIssue: false,
          remoteBoost: 0,
          absenceBoost: 0,
          overtimeBoost: 0,
          incidentPenaltyMin: 0,
          earlyLeavePenaltyMin: 0,
          lateShiftMin: 0,
        };

        const amStartMs = day.localStartMs + amStartOffsetMs;
        const amEndMs = day.localStartMs + amEndOffsetMs;
        const pmStartMs = day.localStartMs + pmStartOffsetMs;
        const pmEndMs = day.localStartMs + pmEndOffsetMs;

        const weekdayAbsenceFactor = weekday === 1 ? 1.2 : weekday === 5 ? 1.1 : 1.0;
        const absenceChance = profile.absenceRate * weekdayAbsenceFactor;
        const adjustedAbsenceChance = clamp(
          absenceChance + Math.max(0, dayCtx.loadFactor) * 0.14 + dayCtx.absenceBoost + (dayCtx.incident ? 0.03 : 0),
          0,
          0.45
        );
        if (Math.random() < adjustedAbsenceChance) continue;

        const halfDayChance = clamp(
          profile.halfDayRate * (weekday === 5 ? 1.35 : 1.0) + (dayCtx.transportIssue ? 0.06 : 0),
          0,
          0.5
        );
        const isHalfDay = Math.random() < halfDayChance;
        const isMorningOnly = isHalfDay && Math.random() < 0.55;
        const isAfternoonOnly = isHalfDay && !isMorningOnly;
        const isRemote = Math.random() < clamp(profile.remoteRate + dayCtx.remoteBoost, 0, 0.75);

        let clockInMs = amStartMs;
        let clockOutMs = pmEndMs;

        if (isMorningOnly) clockOutMs = amEndMs;
        else if (isAfternoonOnly) clockInMs = pmStartMs;

        const lateIn = Math.round(randNormal(profile.lateMean + dayCtx.lateShiftMin, profile.lateStd + (dayCtx.incident ? 2 : 0)));
        clockInMs += clamp(lateIn, -20, 90) * 60000;

        let exitDelta = 0;
        if (Math.random() < clamp(profile.overtimeRate + dayCtx.overtimeBoost, 0, 0.8) && !isHalfDay) exitDelta += randInt(10, 75);
        else if (Math.random() < 0.22) exitDelta -= randInt(10, 55);
        else exitDelta += randInt(-10, 20);

        if (weekday === 5) exitDelta -= randInt(5, 20);
        if (isRemote) exitDelta -= randInt(0, 20);
        if (dayCtx.loadFactor > 0.08 && !isHalfDay) exitDelta += randInt(10, 40);
        if (dayCtx.loadFactor < -0.08) exitDelta -= randInt(10, 35);
        if (dayCtx.incident) exitDelta -= dayCtx.incidentPenaltyMin;
        if (dayCtx.transportIssue) exitDelta -= dayCtx.earlyLeavePenaltyMin;
        if (dayCtx.monthEndRush && !isHalfDay && !isRemote) exitDelta += randInt(20, 70);

        if (isMorningOnly) {
          exitDelta = clamp(exitDelta, -20, 25);
          clockOutMs = amEndMs + exitDelta * 60000;
        } else if (isAfternoonOnly) {
          const pmLateIn = Math.round(randNormal(profile.lateMean + 3, profile.lateStd));
          clockInMs = pmStartMs + clamp(pmLateIn, -15, 70) * 60000;
          exitDelta = clamp(exitDelta, -25, 30);
          clockOutMs = pmEndMs + exitDelta * 60000;
        } else {
          clockOutMs += exitDelta * 60000;
        }

        if (clockOutMs < clockInMs) clockOutMs = clockInMs + randInt(90, 300) * 60000;

        const scheduledStart = clockInMs < pmStartMs ? amStartMs : pmStartMs;
        const lateMinutes = Math.max(0, Math.floor((clockInMs - (scheduledStart + graceMin * 60000)) / 60000));
        const workedMinutes = Math.max(0, Math.floor((clockOutMs - clockInMs) / 60000));

        rowsBuffer.push({
          userId: u.id,
          date: day.utcDate,
          clockInAt: new Date(clockInMs),
          clockOutAt: new Date(clockOutMs),
          lateMinutes,
          workedMinutes,
          source: "manual",
        });

        if (rowsBuffer.length >= insertChunkSize) {
          await prisma.clock.createMany({ data: rowsBuffer });
          totalGenerated += rowsBuffer.length;
          seedStatus.generated = totalGenerated;
          rowsBuffer = [];
        }
      }

      if ((userIdx + 1) % 50 === 0 || userIdx + 1 === seededUsers.length) {
        seedStatus.processedUsers = userIdx + 1;
      }
    }

    if (rowsBuffer.length) {
      await prisma.clock.createMany({ data: rowsBuffer });
      totalGenerated += rowsBuffer.length;
      seedStatus.generated = totalGenerated;
      rowsBuffer = [];
    }

    await audit({
      actorUserId,
      action: "SEED_DATA",
      meta: {
        days: daysToGenerate,
        eligibleUsers: totalEligibleUsers,
        users: seededUsers.length,
        generated: totalGenerated,
      },
    });
    if (typeof clearReportCache === "function") clearReportCache();
    return {
      ok: true,
      days: daysToGenerate,
      eligibleUsers: totalEligibleUsers,
      users: seededUsers.length,
      generated: totalGenerated,
    };
  };

  router.get("/admin/seed-status", authRequired, requireAdmin, async (req, res) => {
    return res.json({ ok: true, status: seedStatus });
  });

  router.post("/admin/seed", authRequired, requireAdmin, async (req, res) => {
    if (resetRunning) {
      return res.status(409).json({ error: "Reinitialisation en cours. Reessayez apres la fin." });
    }

    const requestedDays = parseInt(req.body?.days ?? req.query?.days ?? "30", 10);
    const daysToGenerate = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 365) : 30;
    const rawMaxUsers = req.body?.maxUsers ?? req.query?.maxUsers;
    const parsedMaxUsers = parseInt(String(rawMaxUsers ?? ""), 10);
    const maxUsers = Number.isFinite(parsedMaxUsers) && parsedMaxUsers > 0 ? parsedMaxUsers : null;
    const asyncMode = String(req.query?.async ?? req.body?.async ?? "false").toLowerCase() === "true";

    if (seedRunning && asyncMode) {
      return res.status(202).json({ ok: true, started: false, status: seedStatus });
    }
    if (seedRunning) {
      return res.status(409).json({ error: "Generation deja en cours." });
    }

    seedRunning = true;
    seedStatus = {
      running: true,
      days: daysToGenerate,
      maxUsers,
      eligibleUsers: 0,
      totalUsers: 0,
      processedUsers: 0,
      generated: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    };

    if (asyncMode) {
      const actorUserId = req.user.id;
      (async () => {
        try {
          const result = await generateSeedData({ daysToGenerate, maxUsers, actorUserId });
          seedStatus = {
            ...seedStatus,
            running: false,
            finishedAt: new Date().toISOString(),
            error: null,
            generated: result.generated,
            eligibleUsers: result.eligibleUsers,
            totalUsers: result.users,
            processedUsers: result.users,
          };
        } catch (err) {
          seedStatus = {
            ...seedStatus,
            running: false,
            finishedAt: new Date().toISOString(),
            error: err?.message || "Seed failed",
          };
        } finally {
          seedRunning = false;
        }
      })();
      return res.status(202).json({ ok: true, started: true, status: seedStatus });
    }

    try {
      const result = await generateSeedData({ daysToGenerate, maxUsers, actorUserId: req.user.id });
      seedStatus = {
        ...seedStatus,
        running: false,
        finishedAt: new Date().toISOString(),
        error: null,
        generated: result.generated,
        eligibleUsers: result.eligibleUsers,
        totalUsers: result.users,
        processedUsers: result.users,
      };
      return res.json(result);
    } catch (err) {
      seedStatus = {
        ...seedStatus,
        running: false,
        finishedAt: new Date().toISOString(),
        error: err?.message || "Seed failed",
      };
      return res.status(500).json({ error: err.message || "Seed failed" });
    } finally {
      seedRunning = false;
    }
  });

  router.post("/admin/seed-users", authRequired, requireAdmin, async (req, res) => {
    const workingDays = [1, 2, 3, 4, 5];
    const baseSchedule = {
      contractType: "CDI",
      scheduleAmStart: "08:00",
      scheduleAmEnd: "12:00",
      schedulePmStart: "14:00",
      schedulePmEnd: "18:00",
      workingDays,
      isProvisioned: true,
      isActive: true,
      isDeleted: false,
    };

    const seedUsers = [
      { username: "employee01", displayName: "Employé 01", firstName: "Jean", lastName: "Durand" },
      { username: "employee02", displayName: "Employé 02", firstName: "Marie", lastName: "Martin" },
      { username: "employee03", displayName: "Employé 03", firstName: "Paul", lastName: "Bernard" },
      { username: "employee04", displayName: "Employé 04", firstName: "Julie", lastName: "Lefevre" },
      { username: "employee05", displayName: "Employé 05", firstName: "Nicolas", lastName: "Petit" },
      { username: "employee06", displayName: "Employé 06", firstName: "Sophie", lastName: "Robert" },
      { username: "employee07", displayName: "Employé 07", firstName: "Thomas", lastName: "Moreau" },
      { username: "employee08", displayName: "Employé 08", firstName: "Laura", lastName: "Fournier" },
      { username: "employee09", displayName: "Employé 09", firstName: "Pierre", lastName: "Roux" },
      { username: "employee10", displayName: "Employé 10", firstName: "Emma", lastName: "Garcia" },
    ];

    const created = [];
    for (const u of seedUsers) {
      const user = await prisma.user.upsert({
        where: { username: u.username },
        update: {
          displayName: u.displayName,
          firstName: u.firstName,
          lastName: u.lastName,
          roles: ["EMPLOYEE"],
          ...baseSchedule,
        },
        create: {
          username: u.username,
          displayName: u.displayName,
          firstName: u.firstName,
          lastName: u.lastName,
          roles: ["EMPLOYEE"],
          ...baseSchedule,
        },
      });
      created.push(user.id);
    }

    await audit({
      actorUserId: req.user.id,
      action: "SEED_USERS",
      targetType: "User",
      meta: { count: created.length },
    });
    return res.json({ ok: true, count: created.length });
  });

  router.post("/admin/sync-ad", authRequired, requireAdmin, async (req, res) => {
    try {
      const result = await syncAdUsers();
      if (typeof clearReportCache === "function") clearReportCache();
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message || "Sync failed" });
    }
  });

  return router;
};

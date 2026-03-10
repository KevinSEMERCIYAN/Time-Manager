const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const {
    prisma,
    authRequired,
    requireAdmin,
    audit,
    isWorkingDay,
    scheduleForUser,
    parseTimeOnDate,
    syncAdUsers,
  } = ctx;

  router.post("/admin/reset", authRequired, requireAdmin, async (req, res) => {
    const fullReset = String(req.query?.full || req.body?.full || "").toLowerCase() === "true";
    // deleteMany() sur de gros volumes peut dépasser le timeout proxy (504).
    // TRUNCATE est quasi immédiat en MySQL/MariaDB.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      await tx.$executeRawUnsafe("TRUNCATE TABLE `Clock`");
      await tx.$executeRawUnsafe("TRUNCATE TABLE `AuditLog`");
      if (fullReset) {
        await tx.$executeRawUnsafe("TRUNCATE TABLE `TeamMember`");
        await tx.$executeRawUnsafe("TRUNCATE TABLE `Team`");
      }
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    });
    await audit({
      actorUserId: req.user.id,
      action: "RESET_DATA",
      meta: { fullReset },
    });
    return res.json({ ok: true, fullReset });
  });

  router.post("/admin/seed", authRequired, requireAdmin, async (req, res) => {
    // IMPORTANT: cette route doit rester raisonnable en temps d'exécution.
    // On limite à 365 jours max pour couvrir la vue "année écoulée".
    const requestedDays = parseInt(req.body?.days ?? req.query?.days ?? "30", 10);
    const daysToGenerate = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 365) : 30;

    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        contractType: { not: null },
      },
    });
    if (!users.length) return res.status(400).json({ error: "No users" });
    const userIds = users.map((u) => u.id);

    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const randNormal = (mean = 0, stdDev = 1) => {
      // Box-Muller transform
      let u = 0;
      let v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return mean + z * stdDev;
    };
    const toLocalDateKey = (dateObj) =>
      `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    const makeProfile = (user) => {
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      const isManagerUser = roles.includes("MANAGER");
      const isFinance = String(user?.department || "").toLowerCase() === "finance";
      const absenceRate = isManagerUser ? 0.012 + Math.random() * 0.03 : 0.02 + Math.random() * 0.05;
      const halfDayRate = isManagerUser ? 0.01 + Math.random() * 0.03 : 0.015 + Math.random() * 0.05;
      const remoteRate = 0.08 + Math.random() * 0.22;
      const overtimeRate = (isManagerUser ? 0.14 : 0.08) + (isFinance ? 0.04 : 0);
      const lateMean = isManagerUser ? -2 + Math.random() * 8 : -1 + Math.random() * 14; // minutes
      const lateStd = 6 + Math.random() * 9;
      return { absenceRate, halfDayRate, remoteRate, overtimeRate, lateMean, lateStd };
    };
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const from = new Date(base);
    from.setDate(from.getDate() - (daysToGenerate - 1));

    // Contexte journalier partagé pour créer des fluctuations réalistes au niveau global:
    // météo, charge opérationnelle, incidents ponctuels, etc.
    const dayContextByKey = new Map();
    for (let i = 0; i < daysToGenerate; i += 1) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = toLocalDateKey(d);
      const loadFactor = clamp(randNormal(0, 0.08), -0.2, 0.2); // +/-20%
      const incident = Math.random() < 0.07; // journée perturbée
      dayContextByKey.set(key, {
        loadFactor,
        incident,
        incidentPenaltyMin: incident ? randInt(15, 80) : 0,
        lateShiftMin: incident ? randInt(4, 18) : 0,
      });
    }

    // Suppression globale de la fenêtre (beaucoup plus rapide qu'un deleteMany par utilisateur).
    await prisma.clock.deleteMany({
      where: {
        userId: { in: userIds },
        date: {
          gte: new Date(`${toLocalDateKey(from)}T00:00:00.000Z`),
          lte: new Date(`${toLocalDateKey(base)}T00:00:00.000Z`),
        },
      },
    });

    const insertChunkSize = 5000;
    let totalGenerated = 0;
    let rowsBuffer = [];

    for (const u of users) {
      if (!u.scheduleAmStart || !u.scheduleAmEnd || !u.schedulePmStart || !u.schedulePmEnd) continue;
      const profile = makeProfile(u);
      for (let i = 0; i < daysToGenerate; i += 1) {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        if (!isWorkingDay(u, d)) continue;
        const dateKey = toLocalDateKey(d);
        const weekday = d.getDay(); // 0=dimanche ... 6=samedi
        const dayCtx = dayContextByKey.get(dateKey) || {
          loadFactor: 0,
          incident: false,
          incidentPenaltyMin: 0,
          lateShiftMin: 0,
        };

        const sched = scheduleForUser(u);
        const amStart = parseTimeOnDate(dateKey, sched.amStart);
        const amEnd = parseTimeOnDate(dateKey, sched.amEnd);
        const pmStart = parseTimeOnDate(dateKey, sched.pmStart);
        const pmEnd = parseTimeOnDate(dateKey, sched.pmEnd);
        const graceMin = sched.graceMin || 15;

        const weekdayAbsenceFactor = weekday === 1 ? 1.2 : weekday === 5 ? 1.1 : 1.0;
        const absenceChance = profile.absenceRate * weekdayAbsenceFactor;
        const adjustedAbsenceChance = clamp(absenceChance + Math.max(0, dayCtx.loadFactor) * 0.08 + (dayCtx.incident ? 0.025 : 0), 0, 0.35);
        if (Math.random() < adjustedAbsenceChance) continue;

        const halfDayChance = profile.halfDayRate * (weekday === 5 ? 1.3 : 1.0);
        const isHalfDay = Math.random() < halfDayChance;
        const isMorningOnly = isHalfDay && Math.random() < 0.55;
        const isAfternoonOnly = isHalfDay && !isMorningOnly;
        const isRemote = Math.random() < profile.remoteRate;

        let clockIn = new Date(amStart);
        let clockOut = new Date(pmEnd);

        if (isMorningOnly) {
          clockOut = new Date(amEnd);
        } else if (isAfternoonOnly) {
          clockIn = new Date(pmStart);
        }

        // Heures d'arrivée: distribution normale, avec variabilité et ponctualité propre à l'utilisateur.
        const lateIn = Math.round(randNormal(profile.lateMean + dayCtx.lateShiftMin, profile.lateStd + (dayCtx.incident ? 2 : 0)));
        const boundedLateIn = clamp(lateIn, -20, 90);
        clockIn.setMinutes(clockIn.getMinutes() + boundedLateIn);

        let exitDelta = 0;
        if (Math.random() < profile.overtimeRate && !isHalfDay) {
          exitDelta += randInt(10, 75);
        } else if (Math.random() < 0.22) {
          exitDelta -= randInt(10, 55);
        } else {
          exitDelta += randInt(-10, 20);
        }
        if (weekday === 5) exitDelta -= randInt(5, 20); // vendredi: départ un peu plus tôt
        if (isRemote) exitDelta -= randInt(0, 20);
        if (dayCtx.loadFactor > 0.08 && !isHalfDay) exitDelta += randInt(10, 40);
        if (dayCtx.loadFactor < -0.08) exitDelta -= randInt(10, 35);
        if (dayCtx.incident) exitDelta -= dayCtx.incidentPenaltyMin;

        if (isMorningOnly) {
          exitDelta = clamp(exitDelta, -20, 25);
          clockOut = new Date(amEnd);
          clockOut.setMinutes(clockOut.getMinutes() + exitDelta);
        } else if (isAfternoonOnly) {
          const pmLateIn = Math.round(randNormal(profile.lateMean + 3, profile.lateStd));
          clockIn = new Date(pmStart);
          clockIn.setMinutes(clockIn.getMinutes() + clamp(pmLateIn, -15, 70));
          exitDelta = clamp(exitDelta, -25, 30);
          clockOut = new Date(pmEnd);
          clockOut.setMinutes(clockOut.getMinutes() + exitDelta);
        } else {
          clockOut.setMinutes(clockOut.getMinutes() + exitDelta);
        }

        if (clockOut < clockIn) {
          clockOut = new Date(clockIn);
          clockOut.setMinutes(clockOut.getMinutes() + randInt(90, 300));
        }

        const scheduledStart = clockIn < pmStart ? amStart : pmStart;
        const lateMinutes = Math.max(
          0,
          Math.floor((clockIn.getTime() - (scheduledStart.getTime() + graceMin * 60000)) / 60000)
        );
        const workedMinutes = Math.max(0, Math.floor((clockOut - clockIn) / 60000));

        rowsBuffer.push({
          userId: u.id,
          date: new Date(`${dateKey}T00:00:00.000Z`),
          clockInAt: clockIn,
          clockOutAt: clockOut,
          lateMinutes,
          workedMinutes,
          source: "manual",
        });

        if (rowsBuffer.length >= insertChunkSize) {
          await prisma.clock.createMany({ data: rowsBuffer });
          totalGenerated += rowsBuffer.length;
          rowsBuffer = [];
        }
      }
    }
    if (rowsBuffer.length) {
      await prisma.clock.createMany({ data: rowsBuffer });
      totalGenerated += rowsBuffer.length;
      rowsBuffer = [];
    }

    await audit({
      actorUserId: req.user.id,
      action: "SEED_DATA",
      meta: { days: daysToGenerate, users: users.length, generated: totalGenerated },
    });
    return res.json({ ok: true, days: daysToGenerate, users: users.length, generated: totalGenerated });
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
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message || "Sync failed" });
    }
  });

  return router;
};

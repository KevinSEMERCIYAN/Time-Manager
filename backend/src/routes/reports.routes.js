const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const reportCache = new Map();
  ctx.clearReportCache = () => reportCache.clear();
  const REPORT_CACHE_TTL_MS = parseInt(process.env.REPORT_CACHE_TTL_MS || "60000", 10);
  const emptySummary = () => ({
    totalHours: 0,
    latenessRate: 0,
    attendanceRate: 0,
    averageHours: 0,
    shiftCount: 0,
    expectedShiftCount: 0,
    lateCount: 0,
    workedHours: 0,
    expectedHours: 0,
    absenceCount: 0,
    absenceRate: 0,
    scopedUserCount: 0,
    dailyWorked: [],
    dailyAverageWorked: [],
    dailyExpectedShiftSeries: [],
    dailyLatenessRate: [],
    dailyAttendanceRate: [],
    dailyAbsenceRate: [],
  });
  const {
    prisma,
    authRequired,
    canAccessUser,
    isManagerOfTeam,
    listAccessibleUsers,
    isAdmin,
    isManager,
    autoCloseOpenClocks,
    expectedDailyHours,
  } = ctx;

  router.get("/reports", authRequired, async (req, res) => {
    const { from, to, teamId, userId } = req.query || {};
    const service = String(req.query?.service || "").trim();
    if (!from || !to) return res.status(400).json({ error: "from/to required" });
    const cacheKey = JSON.stringify({
      actorId: req.user.id,
      actorRoles: req.user.roles || [],
      actorDept: req.user.department || null,
      from,
      to,
      teamId: teamId || null,
      userId: userId || null,
      service: service || null,
    });
    const cached = reportCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < REPORT_CACHE_TTL_MS) {
      return res.json(cached.payload);
    }

    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);

    let userIds = [];
    if (userId) {
      const allowed = await canAccessUser(req.user, userId);
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
      userIds = [userId];
    } else if (teamId) {
      const allowed = await isManagerOfTeam(req.user, teamId);
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
      const members = await prisma.teamMember.findMany({ where: { teamId } });
      userIds = members.map((m) => m.userId);
    } else {
      if (isAdmin(req.user)) {
        // Dashboard admin: tous les EMPLOYEE + MANAGER uniquement.
        const users = await prisma.user.findMany({
          where: {
            isDeleted: false,
            isActive: true,
            isProvisioned: true,
            teams: { some: {} },
            OR: [
              { roles: { path: "$", array_contains: "EMPLOYEE" } },
              { roles: { path: "$", array_contains: "MANAGER" } },
            ],
          },
          select: { id: true },
        });
        userIds = users.map((u) => u.id);
      } else if (isManager(req.user)) {
        // Dashboard manager: uniquement les EMPLOYEE des équipes managées.
        const memberships = await prisma.teamMember.findMany({
          where: {
            team: { managerUserId: req.user.id },
          },
          select: { userId: true },
        });
        userIds = [...new Set(memberships.map((m) => m.userId))];
      } else {
        const users = await listAccessibleUsers(req.user);
        userIds = users.map((u) => u.id);
      }
    }

    if (userId || teamId) {
      await autoCloseOpenClocks(userIds);
    }

    const whereUsers = {
      id: { in: userIds },
      isDeleted: false,
      isActive: true,
    };
    if (!userId && !teamId) {
      if (isAdmin(req.user)) {
        whereUsers.isProvisioned = true;
        whereUsers.teams = { some: {} };
        whereUsers.OR = [
          { roles: { path: "$", array_contains: "EMPLOYEE" } },
          { roles: { path: "$", array_contains: "MANAGER" } },
        ];
      } else if (isManager(req.user)) {
        whereUsers.isProvisioned = true;
        whereUsers.roles = { path: "$", array_contains: "EMPLOYEE" };
      }
    }
    if (service) {
      if (isAdmin(req.user)) {
        whereUsers.department = service;
      } else if (isManager(req.user)) {
        const managerService = req.user.department || null;
        if (managerService && managerService !== service) {
          return res.json({ summary: emptySummary() });
        }
        whereUsers.department = service;
      } else if (req.user.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const users = await prisma.user.findMany({
      where: {
        ...whereUsers,
      },
      select: {
        id: true,
        roles: true,
        contractType: true,
        scheduleAmStart: true,
        scheduleAmEnd: true,
        schedulePmStart: true,
        schedulePmEnd: true,
        workingDays: true,
        graceMinutes: true,
      },
    });
    const effectiveUserIds = users.map((u) => u.id);
    if (!effectiveUserIds.length) {
      return res.json({ summary: emptySummary() });
    }

    const dateStart = new Date(`${from}T00:00:00.000Z`);
    const dateEnd = new Date(`${to}T00:00:00.000Z`);
    const daySpan = Math.max(1, Math.floor((dateEnd.getTime() - dateStart.getTime()) / 86400000) + 1);
    const canUseJoinAggregation =
      !userId && !teamId && isAdmin(req.user) && daySpan <= 62;
    let dailyAggRows = [];

    if (canUseJoinAggregation) {
      let whereSql = "c.`date` >= ? AND c.`date` <= ? AND u.`isDeleted` = false AND u.`isActive` = true";
      const sqlParams = [dateStart, dateEnd];

      if (isAdmin(req.user) && service) {
        whereSql += " AND u.`department` = ?";
        sqlParams.push(service);
      }
      whereSql += " AND u.`isProvisioned` = true AND (JSON_CONTAINS(u.`roles`, '\"EMPLOYEE\"') OR JSON_CONTAINS(u.`roles`, '\"MANAGER\"'))";

      const dailySql = `SELECT DATE(c.\`date\`) AS day, SUM(c.\`workedMinutes\`) AS workedMinutes, COUNT(*) AS shiftCount, SUM(CASE WHEN c.\`lateMinutes\` > 0 THEN 1 ELSE 0 END) AS lateCount FROM \`Clock\` c INNER JOIN \`User\` u ON u.\`id\` = c.\`userId\` WHERE ${whereSql} GROUP BY DATE(c.\`date\`) ORDER BY DATE(c.\`date\`) ASC`;
      dailyAggRows = await prisma.$queryRawUnsafe(dailySql, ...sqlParams);
    } else {
      const inClause = effectiveUserIds.map(() => "?").join(",");
      const dailySql = `SELECT DATE(\`date\`) AS day, SUM(\`workedMinutes\`) AS workedMinutes, COUNT(*) AS shiftCount, SUM(CASE WHEN \`lateMinutes\` > 0 THEN 1 ELSE 0 END) AS lateCount FROM \`Clock\` WHERE \`userId\` IN (${inClause}) AND \`date\` >= ? AND \`date\` <= ? GROUP BY DATE(\`date\`) ORDER BY DATE(\`date\`) ASC`;
      const sqlParams = [...effectiveUserIds, dateStart, dateEnd];
      dailyAggRows = await prisma.$queryRawUnsafe(dailySql, ...sqlParams);
    }

    if (!dailyAggRows.length) {
      return res.json({ summary: emptySummary() });
    }

    // KPI: inclure tous les utilisateurs du scope (admin/manager/team), même sans activité,
    // pour refléter l'ensemble des utilisateurs rattachés aux équipes.
    const reportUsers = users;
    if (!reportUsers.length) {
      return res.json({ summary: emptySummary() });
    }

    let expectedShiftCount = 0;
    let workedMinutesTotal = 0;
    let lateCount = 0;
    let shiftCount = 0;
    const workedByDay = new Map();
    const dailyShiftCount = new Map();
    const dailyLateCount = new Map();

    for (const row of dailyAggRows) {
      const dayKey = new Date(row.day).toISOString().slice(0, 10);
      const worked = Number(row.workedMinutes || 0);
      const shifts = Number(row.shiftCount || 0);
      const lates = Number(row.lateCount || 0);
      workedMinutesTotal += worked;
      shiftCount += shifts;
      lateCount += lates;
      workedByDay.set(dayKey, worked);
      dailyShiftCount.set(dayKey, shifts);
      dailyLateCount.set(dayKey, lates);
    }

    let expectedMinutes = 0;
    // Fenêtre KPI: utiliser toute la période demandée.
    const periodStartKey = from;
    const periodEndKey = to;
    const metricsStartKey = periodStartKey;
    const metricsEndKey = periodEndKey;
    const dayKeys = [];
    for (let d = new Date(`${metricsStartKey}T00:00:00.000Z`); d <= new Date(`${metricsEndKey}T00:00:00.000Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      dayKeys.push(d.toISOString().slice(0, 10));
    }

    const userExpectedByWeekday = reportUsers.map((u) => {
      const minutesByWeekday = new Array(7).fill(0);
      for (let wd = 0; wd < 7; wd++) {
        const ref = new Date(Date.UTC(2026, 0, 4 + wd, 12, 0, 0)); // 2026-01-04 est un dimanche (0)
        minutesByWeekday[wd] = Math.max(0, expectedDailyHours(u, ref) * 60);
      }
      return {
        userId: u.id,
        minutesByWeekday,
        startKey: metricsStartKey,
        endKey: metricsEndKey,
      };
    });
    const totalHours = workedMinutesTotal / 60;

    const dailyWorked = [];
    const dailyAverageWorked = [];
    const dailyExpectedShiftSeries = [];
    const dailyLatenessRate = [];
    const dailyAttendanceRate = [];
    const dailyAbsenceRate = [];
    for (const key of dayKeys) {
      const d = new Date(`${key}T00:00:00.000Z`);
      const worked = workedByDay.get(key) || 0;
      const late = dailyLateCount.get(key) || 0;
      const weekday = d.getUTCDay();
      let dailyExpected = 0;
      let dailyExpectedShifts = 0;
      for (const u of userExpectedByWeekday) {
        if (key < u.startKey || key > u.endKey) continue;
        const m = Number(u.minutesByWeekday[weekday] || 0);
        dailyExpected += m;
        if (m > 0) dailyExpectedShifts += 1;
      }
      expectedMinutes += dailyExpected;
      expectedShiftCount += dailyExpectedShifts;

      dailyWorked.push({ date: key, hours: worked / 60 });
      dailyAverageWorked.push({ date: key, hours: users.length ? worked / 60 / users.length : 0 });
      dailyExpectedShiftSeries.push({ date: key, value: dailyExpectedShifts });
      dailyLatenessRate.push({ date: key, value: dailyExpectedShifts ? (late / dailyExpectedShifts) * 100 : 0 });
      const dailyPresentShifts = dailyShiftCount.get(key) || 0;
      const dailyAttendance = dailyExpectedShifts ? (dailyPresentShifts / dailyExpectedShifts) * 100 : 0;
      const dailyAttendanceCapped = Math.max(0, Math.min(100, dailyAttendance));
      dailyAttendanceRate.push({ date: key, value: dailyAttendanceCapped });
      dailyAbsenceRate.push({ date: key, value: dailyExpectedShifts ? Math.max(0, 100 - dailyAttendanceCapped) : 0 });
    }

    const finalLatenessRate = expectedShiftCount ? (lateCount / expectedShiftCount) * 100 : 0;
    const finalAbsenceCount = Math.max(0, expectedShiftCount - shiftCount);
    const finalAbsenceRate = expectedShiftCount ? (finalAbsenceCount / expectedShiftCount) * 100 : 0;
    const finalAttendanceRate = expectedShiftCount ? Math.max(0, Math.min(100, (shiftCount / expectedShiftCount) * 100)) : 0;
    // KPI demandé: moyenne d'heures travaillées par utilisateur sur la période.
    // - Manager: employés de ses équipes
    // - Admin: employés + managers
    const averageHours = users.length ? totalHours / users.length : 0;

    const payload = {
      summary: {
        totalHours,
        latenessRate: finalLatenessRate,
        attendanceRate: finalAttendanceRate,
        averageHours,
        shiftCount,
        expectedShiftCount,
        lateCount,
        workedHours: workedMinutesTotal / 60,
        expectedHours: expectedMinutes / 60,
        absenceCount: finalAbsenceCount,
        absenceRate: finalAbsenceRate,
        scopedUserCount: users.length,
        dailyWorked,
        dailyAverageWorked,
        dailyExpectedShiftSeries,
        dailyLatenessRate,
        dailyAttendanceRate,
        dailyAbsenceRate,
      },
    };
    reportCache.set(cacheKey, { ts: Date.now(), payload });
    if (reportCache.size > 200) {
      const oldestKey = reportCache.keys().next().value;
      if (oldestKey) reportCache.delete(oldestKey);
    }
    return res.json(payload);
  });

  router.get("/reports/team", authRequired, async (req, res) => {
    const { from, to, teamId } = req.query || {};
    if (!from || !to || !teamId) return res.status(400).json({ error: "from/to/teamId required" });
    const allowed = await isManagerOfTeam(req.user, teamId);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    const members = await prisma.teamMember.findMany({ where: { teamId }, include: { user: true } });
    const userIds = members.map((m) => m.userId);
    const clocks = await prisma.clock.findMany({
      where: { userId: { in: userIds }, clockInAt: { gte: start, lte: end } },
      orderBy: { clockInAt: "asc" },
    });
    const daily = {};
    const weekly = {};
    for (const c of clocks) {
      const dayKey = c.clockInAt.toISOString().slice(0, 10);
      daily[dayKey] = (daily[dayKey] || 0) + (c.workedMinutes || 0);
      const weekKey = `${dayKey.slice(0, 4)}-W${Math.ceil(new Date(dayKey).getDate() / 7)}`;
      weekly[weekKey] = (weekly[weekKey] || 0) + (c.workedMinutes || 0);
    }
    return res.json({ daily, weekly });
  });

  router.get("/reports/user", authRequired, async (req, res) => {
    const { from, to, userId } = req.query || {};
    if (!from || !to || !userId) return res.status(400).json({ error: "from/to/userId required" });
    const allowed = await canAccessUser(req.user, userId);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    const clocks = await prisma.clock.findMany({
      // Reporting utilisateur: ne calculer que les pointages complets IN+OUT.
      where: { userId, clockInAt: { gte: start, lte: end }, clockOutAt: { not: null } },
      orderBy: { clockInAt: "asc" },
    });
    const daily = {};
    const weekly = {};
    const dailyDetailsMap = new Map();
    for (const c of clocks) {
      const dayKey = c.clockInAt.toISOString().slice(0, 10);
      const workedMinutes = Number(c.workedMinutes || 0);
      daily[dayKey] = (daily[dayKey] || 0) + workedMinutes;
      const weekKey = `${dayKey.slice(0, 4)}-W${Math.ceil(new Date(dayKey).getDate() / 7)}`;
      weekly[weekKey] = (weekly[weekKey] || 0) + workedMinutes;

      const prev = dailyDetailsMap.get(dayKey);
      if (!prev) {
        dailyDetailsMap.set(dayKey, {
          date: dayKey,
          firstClockInAt: c.clockInAt,
          lastClockOutAt: c.clockOutAt,
          workedMinutes,
        });
      } else {
        const firstClockInAt = c.clockInAt < prev.firstClockInAt ? c.clockInAt : prev.firstClockInAt;
        const lastClockOutAt = c.clockOutAt > prev.lastClockOutAt ? c.clockOutAt : prev.lastClockOutAt;
        dailyDetailsMap.set(dayKey, {
          date: dayKey,
          firstClockInAt,
          lastClockOutAt,
          workedMinutes: prev.workedMinutes + workedMinutes,
        });
      }
    }
    const dailyDetails = Array.from(dailyDetailsMap.values())
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((d) => ({
        date: d.date,
        workedMinutes: d.workedMinutes,
        arrivalAt: d.firstClockInAt ? d.firstClockInAt.toISOString() : null,
        departureAt: d.lastClockOutAt ? d.lastClockOutAt.toISOString() : null,
      }));

    return res.json({ daily, weekly, dailyDetails });
  });

  return router;
};

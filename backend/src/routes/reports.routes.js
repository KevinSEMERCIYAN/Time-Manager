const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const reportCache = new Map();
  const REPORT_CACHE_TTL_MS = parseInt(process.env.REPORT_CACHE_TTL_MS || "20000", 10);
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
      const users = await listAccessibleUsers(req.user);
      userIds = users.map((u) => u.id);
    }

    if (userId || teamId) {
      await autoCloseOpenClocks(userIds);
    }

    const whereUsers = {
      id: { in: userIds },
      isDeleted: false,
      isActive: true,
    };
    if (service) {
      if (isAdmin(req.user)) {
        whereUsers.department = service;
      } else if (isManager(req.user)) {
        const managerService = req.user.department || null;
        if (!managerService || managerService !== service) {
          return res.json({
            summary: {
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
            },
          });
        }
        whereUsers.department = managerService;
      } else if (req.user.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const users = await prisma.user.findMany({
      where: {
        ...whereUsers,
      },
    });
    const effectiveUserIds = users.map((u) => u.id);
    if (!effectiveUserIds.length) {
      return res.json({
        summary: {
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
        },
      });
    }

    const dateStart = new Date(`${from}T00:00:00.000Z`);
    const dateEnd = new Date(`${to}T00:00:00.000Z`);

    const [activeUserRows, dailyRows, dailyLateRows] = await Promise.all([
      prisma.clock.groupBy({
        by: ["userId"],
        where: {
          userId: { in: effectiveUserIds },
          date: { gte: dateStart, lte: dateEnd },
        },
      }),
      prisma.clock.groupBy({
        by: ["date"],
        where: {
          userId: { in: effectiveUserIds },
          date: { gte: dateStart, lte: dateEnd },
        },
        _sum: { workedMinutes: true },
        _count: { _all: true },
        orderBy: { date: "asc" },
      }),
      prisma.$queryRawUnsafe(
        "SELECT DATE(`date`) AS day, SUM(CASE WHEN `lateMinutes` > 0 THEN 1 ELSE 0 END) AS lateCount FROM `Clock` WHERE `userId` IN (" +
          effectiveUserIds.map(() => "?").join(",") +
          ") AND `date` >= ? AND `date` <= ? GROUP BY DATE(`date`)",
        ...effectiveUserIds,
        dateStart,
        dateEnd
      ),
    ]);

    if (!dailyRows.length) {
      return res.json({
        summary: {
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
        },
      });
    }

    // Vue globale/équipe: base KPI sur les utilisateurs réellement actifs dans la période.
    // Vue utilisateur (userId): conserver l'utilisateur demandé même sans activité.
    const activeUserIdSet = new Set(activeUserRows.map((r) => r.userId));
    const reportUsers = userId ? users : users.filter((u) => activeUserIdSet.has(u.id));
    if (!reportUsers.length) {
      return res.json({
        summary: {
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
        },
      });
    }

    let expectedShiftCount = 0;
    let workedMinutesTotal = 0;
    let lateCount = 0;
    let shiftCount = 0;
    const workedByDay = new Map();
    const dailyShiftCount = new Map();
    const dailyLateCount = new Map();

    for (const row of dailyRows) {
      const dayKey = new Date(row.date).toISOString().slice(0, 10);
      const worked = Number(row._sum?.workedMinutes || 0);
      const shifts = Number(row._count?._all || 0);
      workedMinutesTotal += worked;
      shiftCount += shifts;
      workedByDay.set(dayKey, worked);
      dailyShiftCount.set(dayKey, shifts);
    }
    for (const row of dailyLateRows || []) {
      const dayKey = new Date(row.day).toISOString().slice(0, 10);
      const lates = Number(row.lateCount || 0);
      lateCount += lates;
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
    const averageHours = reportUsers.length ? totalHours / reportUsers.length : 0;

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
      dailyAverageWorked.push({ date: key, hours: reportUsers.length ? worked / 60 / reportUsers.length : 0 });
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
        scopedUserCount: reportUsers.length,
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
      where: { userId, clockInAt: { gte: start, lte: end } },
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

  return router;
};

const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
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
              dailyWorked: [],
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
          dailyWorked: [],
          dailyLatenessRate: [],
          dailyAttendanceRate: [],
          dailyAbsenceRate: [],
        },
      });
    }

    const clockRows = await prisma.clock.findMany({
      where: {
        userId: { in: effectiveUserIds },
        clockInAt: { gte: start, lte: end },
      },
      select: {
        userId: true,
        clockInAt: true,
        workedMinutes: true,
        lateMinutes: true,
      },
      orderBy: { clockInAt: "asc" },
    });

    const groupedMap = new Map();
    for (const row of clockRows) {
      const dayKey = new Date(row.clockInAt).toISOString().slice(0, 10);
      const key = `${row.userId}::${dayKey}`;
      const prev = groupedMap.get(key);
      if (!prev) {
        groupedMap.set(key, {
          userId: row.userId,
          dayKey,
          workedMinutes: Number(row.workedMinutes || 0),
          lateMinutes: Number(row.lateMinutes || 0),
        });
      } else {
        prev.workedMinutes += Number(row.workedMinutes || 0);
        prev.lateMinutes += Number(row.lateMinutes || 0);
      }
    }
    const grouped = Array.from(groupedMap.values());

    if (!grouped.length) {
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
          dailyWorked: [],
          dailyLatenessRate: [],
          dailyAttendanceRate: [],
          dailyAbsenceRate: [],
        },
      });
    }

    // Vue globale/équipe: base KPI sur les utilisateurs réellement actifs dans la période.
    // Vue utilisateur (userId): conserver l'utilisateur demandé même sans activité.
    const activeUserIdSet = new Set(grouped.map((g) => g.userId));
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
          dailyWorked: [],
          dailyLatenessRate: [],
          dailyAttendanceRate: [],
          dailyAbsenceRate: [],
        },
      });
    }

    let lateCount = 0;
    let shiftCount = 0;
    let expectedShiftCount = 0;
    let workedMinutesTotal = 0;
    const workedByDay = new Map();
    const dailyShiftCount = new Map();
    const dailyLateCount = new Map();

    for (const row of grouped) {
      const dayKey = row.dayKey;
      const worked = Number(row.workedMinutes || 0);
      const late = Number(row.lateMinutes || 0);
      workedMinutesTotal += worked;
      shiftCount += 1; // 1 user-day
      if (late > 0) lateCount += 1;
      workedByDay.set(dayKey, (workedByDay.get(dayKey) || 0) + worked);
      dailyShiftCount.set(dayKey, (dailyShiftCount.get(dayKey) || 0) + 1);
      if (late > 0) dailyLateCount.set(dayKey, (dailyLateCount.get(dayKey) || 0) + 1);
    }

    let expectedMinutes = 0;
    const activeRangeByUser = new Map();
    let globalMinKey = null;
    let globalMaxKey = null;
    for (const row of grouped) {
      const key = row.dayKey;
      if (!globalMinKey || key < globalMinKey) globalMinKey = key;
      if (!globalMaxKey || key > globalMaxKey) globalMaxKey = key;
      const prev = activeRangeByUser.get(row.userId);
      if (!prev) {
        activeRangeByUser.set(row.userId, { startKey: key, endKey: key });
      } else {
        if (key < prev.startKey) prev.startKey = key;
        if (key > prev.endKey) prev.endKey = key;
      }
    }

    // Fenêtre KPI: intersection [from,to] avec les dates réellement présentes pour éviter
    // de mesurer de faux "jours absents" hors couverture de données.
    const periodStartKey = from;
    const periodEndKey = to;
    const metricsStartKey = userId ? periodStartKey : (globalMinKey && globalMinKey > periodStartKey ? globalMinKey : periodStartKey);
    const metricsEndKey = userId ? periodEndKey : (globalMaxKey && globalMaxKey < periodEndKey ? globalMaxKey : periodEndKey);
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
      const range = activeRangeByUser.get(u.id) || null;
      return {
        userId: u.id,
        minutesByWeekday,
        startKey: range?.startKey || metricsStartKey,
        endKey: range?.endKey || metricsEndKey,
      };
    });
    const totalHours = workedMinutesTotal / 60;
    const averageHours = reportUsers.length ? totalHours / reportUsers.length : 0;

    const dailyWorked = [];
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

    return res.json({
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
        dailyWorked,
        dailyLatenessRate,
        dailyAttendanceRate,
        dailyAbsenceRate,
      },
    });
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

const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const {
    prisma,
    authRequired,
    canAccessUser,
    isManagerOfTeam,
    listAccessibleUsers,
    autoCloseOpenClocks,
    expectedDailyHours,
  } = ctx;

  router.get("/reports", authRequired, async (req, res) => {
    const { from, to, teamId, userId } = req.query || {};
    if (!from || !to) return res.status(400).json({ error: "from/to required" });

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);

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

    await autoCloseOpenClocks(userIds);

    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
    const clocks = await prisma.clock.findMany({
      where: { userId: { in: userIds }, clockInAt: { gte: start, lte: end } },
      orderBy: { clockInAt: "asc" },
    });

    let lateCount = 0;
    let shiftCount = 0;
    let expectedShiftCount = 0;
    let workedMinutesTotal = 0;
    const workedByDay = new Map();
    const dailyShiftCount = new Map();
    const dailyLateCount = new Map();

    const byUserDay = new Map();
    for (const c of clocks) {
      const key = `${c.userId}::${c.date.toISOString().slice(0, 10)}`;
      const list = byUserDay.get(key) || [];
      list.push(c);
      byUserDay.set(key, list);
      const worked = c.workedMinutes || 0;
      workedMinutesTotal += worked;
      const dayKey = c.clockInAt.toISOString().slice(0, 10);
      workedByDay.set(dayKey, (workedByDay.get(dayKey) || 0) + worked);
    }

    for (const list of byUserDay.values()) {
      list.sort((a, b) => a.clockInAt - b.clockInAt);
      const first = list[0];
      shiftCount += 1;
      if ((first.lateMinutes || 0) > 0) lateCount += 1;
      const dayKey = first.clockInAt.toISOString().slice(0, 10);
      dailyShiftCount.set(dayKey, (dailyShiftCount.get(dayKey) || 0) + 1);
      if ((first.lateMinutes || 0) > 0) {
        dailyLateCount.set(dayKey, (dailyLateCount.get(dayKey) || 0) + 1);
      }
    }

    let expectedMinutes = 0;
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    for (const day of days) {
      for (const u of users) {
        const dailyHours = expectedDailyHours(u, day);
        if (dailyHours > 0) expectedShiftCount += 1;
        expectedMinutes += dailyHours * 60;
      }
    }

    const latenessRate = expectedShiftCount ? (lateCount / expectedShiftCount) * 100 : 0;
    const attendanceRate = expectedMinutes ? (workedMinutesTotal / expectedMinutes) * 100 : 0;
    const totalHours = workedMinutesTotal / 60;
    const averageHours = users.length ? totalHours / users.length : 0;
    const absenceCount = Math.max(0, expectedShiftCount - shiftCount);
    const absenceRate = expectedShiftCount ? (absenceCount / expectedShiftCount) * 100 : 0;

    const dailyWorked = [];
    const dailyLatenessRate = [];
    const dailyAttendanceRate = [];
    const dailyAbsenceRate = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const worked = workedByDay.get(key) || 0;
      const late = dailyLateCount.get(key) || 0;
      const dailyExpected = users.reduce((sum, u) => sum + expectedDailyHours(u, d) * 60, 0);
      const dailyExpectedShifts = users.reduce(
        (sum, u) => sum + (expectedDailyHours(u, d) > 0 ? 1 : 0),
        0
      );

      dailyWorked.push({ date: key, hours: worked / 60 });
      dailyLatenessRate.push({ date: key, value: dailyExpectedShifts ? (late / dailyExpectedShifts) * 100 : 0 });
      dailyAttendanceRate.push({ date: key, value: dailyExpected ? (worked / dailyExpected) * 100 : 0 });
      dailyAbsenceRate.push({ date: key, value: dailyExpected ? (1 - worked / dailyExpected) * 100 : 0 });
    }

    return res.json({
      summary: {
        totalHours,
        latenessRate,
        attendanceRate,
        averageHours,
        shiftCount,
        expectedShiftCount,
        lateCount,
        workedHours: workedMinutesTotal / 60,
        expectedHours: expectedMinutes / 60,
        absenceCount,
        absenceRate,
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

const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const {
    prisma,
    authRequired,
    canManageClockFor,
    canAccessUser,
    isManagerOfTeam,
    listAccessibleUsers,
    autoCloseOpenClocks,
    isWorkingDay,
    scheduleForUser,
    parseTimeOnDate,
    audit,
  } = ctx;

  router.post("/clocks", authRequired, async (req, res) => {
    const { type, userId } = req.body || {};
    const targetId = userId || req.user.id;
    const allowed = await canManageClockFor(req.user, targetId);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) return res.status(404).json({ error: "Not found" });
    if (user.isDeleted) return res.status(403).json({ error: "Forbidden" });

    await autoCloseOpenClocks([user.id]);

    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const isDevUser =
      process.env.DEV_AUTH === "true" && user.username === (process.env.DEV_AUTH_USER || "dev");

    if (!user.contractType) return res.status(400).json({ error: "Clock-in not allowed" });
    if (!user.scheduleAmStart || !user.scheduleAmEnd || !user.schedulePmStart || !user.schedulePmEnd) {
      return res.status(400).json({ error: "Clock-in not allowed" });
    }
    if (!isDevUser && !isWorkingDay(user, now)) return res.status(400).json({ error: "Clock-in not allowed" });
    const sched = scheduleForUser(user);
    const amStart = parseTimeOnDate(dateKey, sched.amStart);
    const pmStart = parseTimeOnDate(dateKey, sched.pmStart);
    const pmEnd = parseTimeOnDate(dateKey, sched.pmEnd);
    const graceMs = (sched.graceMin || 15) * 60000;

    const active = await prisma.clock.findFirst({
      where: { userId: user.id, clockOutAt: null },
    });

    if ((type || "IN") === "IN") {
      if (active) return res.status(400).json({ error: "Already clocked in" });
      if (!isDevUser && now.getTime() >= pmEnd.getTime()) return res.status(400).json({ error: "Clock-in not allowed" });

      let lateMinutes = 0;
      if (!isDevUser) {
        const nowTs = now.getTime();
        const amStartTs = amStart.getTime();
        const pmStartTs = pmStart.getTime();
        const canClockInMorning = nowTs >= amStartTs && nowTs <= amStartTs + graceMs;
        const canClockInAfternoon = nowTs >= pmStartTs && nowTs <= pmStartTs + graceMs;
        if (!canClockInMorning && !canClockInAfternoon) {
          return res.status(400).json({ error: "Clock-in not allowed" });
        }
        const scheduledStart = canClockInAfternoon ? pmStart : amStart;
        lateMinutes = Math.max(0, Math.floor((nowTs - (scheduledStart.getTime() + graceMs)) / 60000));
      }

      const clock = await prisma.clock.create({
        data: {
          userId: user.id,
          date: new Date(`${dateKey}T00:00:00`),
          clockInAt: now,
          clockOutAt: null,
          lateMinutes,
          workedMinutes: 0,
          source: "manual",
        },
      });

      await audit({
        actorUserId: req.user.id,
        action: "CLOCK_IN",
        targetType: "Clock",
        targetId: clock.id,
        meta: { lateMinutes, targetUserId: user.id },
      });

      return res.json({ clock });
    }

    if (!active) return res.status(400).json({ error: "No active clock" });
    if (!isDevUser && now.getTime() >= pmEnd.getTime()) {
      return res.status(400).json({ error: "Clock-out not allowed after end time" });
    }

    const workedMinutes = Math.max(0, Math.floor((now - active.clockInAt) / 60000));
    const clock = await prisma.clock.update({
      where: { id: active.id },
      data: {
        clockOutAt: now,
        workedMinutes,
        source: "manual",
      },
    });

    await audit({
      actorUserId: req.user.id,
      action: "CLOCK_OUT",
      targetType: "Clock",
      targetId: clock.id,
      meta: { workedMinutes, targetUserId: user.id },
    });

    return res.json({ clock });
  });

  router.get("/clocks", authRequired, async (req, res) => {
    const { from, to, teamId, userId } = req.query || {};
    const start = from ? new Date(`${from}T00:00:00`) : null;
    const end = to ? new Date(`${to}T23:59:59`) : null;

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

    const where = {
      userId: { in: userIds },
    };
    if (start || end) {
      where.clockInAt = {};
      if (start) where.clockInAt.gte = start;
      if (end) where.clockInAt.lte = end;
    }

    const clocks = await prisma.clock.findMany({
      where,
      orderBy: { clockInAt: "desc" },
      include: { user: true },
    });

    return res.json({ clocks });
  });

  router.get("/users/:id/clocks", authRequired, async (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query || {};
    const allowed = await canAccessUser(req.user, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    await autoCloseOpenClocks([id]);

    const start = from ? new Date(`${from}T00:00:00`) : null;
    const end = to ? new Date(`${to}T23:59:59`) : null;
    const where = { userId: id };
    if (start || end) {
      where.clockInAt = {};
      if (start) where.clockInAt.gte = start;
      if (end) where.clockInAt.lte = end;
    }

    const clocks = await prisma.clock.findMany({
      where,
      orderBy: { clockInAt: "desc" },
    });

    return res.json({ clocks });
  });

  return router;
};

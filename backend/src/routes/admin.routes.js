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
    await prisma.clock.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.auditLog.deleteMany();
    await audit({
      actorUserId: req.user.id,
      action: "RESET_DATA",
    });
    return res.json({ ok: true });
  });

  router.post("/admin/seed", authRequired, requireAdmin, async (req, res) => {
    const users = await prisma.user.findMany();
    if (!users.length) return res.status(400).json({ error: "No users" });

    const randomMinutes = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const base = new Date();
    const daysToGenerate = 730;

    for (const u of users) {
      if (!u.contractType) continue;
      if (!u.scheduleAmStart || !u.scheduleAmEnd || !u.schedulePmStart || !u.schedulePmEnd) continue;
      for (let i = 0; i < daysToGenerate; i += 1) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        if (!isWorkingDay(u, d)) continue;
        const dateKey = d.toISOString().slice(0, 10);

        const sched = scheduleForUser(u);
        const amStart = parseTimeOnDate(dateKey, sched.amStart);
        const amEnd = parseTimeOnDate(dateKey, sched.amEnd);
        const pmStart = parseTimeOnDate(dateKey, sched.pmStart);
        const pmEnd = parseTimeOnDate(dateKey, sched.pmEnd);
        const graceMin = sched.graceMin || 15;

        const absenceChance = Math.random();
        if (absenceChance < 0.06) continue;

        const halfDayChance = Math.random();
        const lateIn = randomMinutes(-5, 20);
        const extraOut = randomMinutes(-30, 15);

        let clockIn = new Date(amStart);
        let clockOut = new Date(pmEnd);

        if (halfDayChance < 0.05) {
          clockOut = new Date(amEnd);
        } else if (halfDayChance < 0.1) {
          clockIn = new Date(pmStart);
        }

        clockIn.setMinutes(clockIn.getMinutes() + lateIn);
        clockOut.setMinutes(clockOut.getMinutes() + extraOut);

        if (clockOut < clockIn) {
          clockOut = new Date(clockIn);
          clockOut.setMinutes(clockOut.getMinutes() + randomMinutes(60, 240));
        }

        const scheduledStart = clockIn < pmStart ? amStart : pmStart;
        const lateMinutes = Math.max(
          0,
          Math.floor((clockIn.getTime() - (scheduledStart.getTime() + graceMin * 60000)) / 60000)
        );
        const workedMinutes = Math.max(0, Math.floor((clockOut - clockIn) / 60000));

        await prisma.clock.create({
          data: {
            userId: u.id,
            date: new Date(`${dateKey}T00:00:00`),
            clockInAt: clockIn,
            clockOutAt: clockOut,
            lateMinutes,
            workedMinutes,
            source: "manual",
          },
        });
      }
    }

    await audit({
      actorUserId: req.user.id,
      action: "SEED_DATA",
    });
    return res.json({ ok: true });
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

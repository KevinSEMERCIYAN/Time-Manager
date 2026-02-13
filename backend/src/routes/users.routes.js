const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const {
    prisma,
    authRequired,
    requireAdmin,
    isAdmin,
    isManager,
    audit,
    canAccessUser,
    listAccessibleUsers,
    getManagerTeamIds,
    DEFAULT_SCHEDULE,
  } = ctx;

  router.get("/users", authRequired, async (req, res) => {
    const users = await listAccessibleUsers(req.user);
    return res.json({ users });
  });

  router.get("/users/:id", authRequired, async (req, res) => {
    const { id } = req.params;
    const allowed = await canAccessUser(req.user, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    const user = await prisma.user.findUnique({
      where: { id },
      include: { teams: { include: { team: true } } },
    });
    if (!user || user.isDeleted) return res.status(404).json({ error: "Not found" });
    return res.json({ user });
  });

  router.post("/users", authRequired, async (req, res) => {
    if (!isAdmin(req.user) && !isManager(req.user)) return res.status(403).json({ error: "Forbidden" });
    const {
      username,
      displayName,
      firstName,
      lastName,
      email,
      phone,
      contractType,
      schedule,
      isActive = true,
      teamIds = [],
    } = req.body || {};
    if (!username || !displayName) return res.status(400).json({ error: "username/displayName required" });

    if (isManager(req.user) && !isAdmin(req.user)) {
      const managerTeams = await getManagerTeamIds(req.user.id);
      if (!teamIds.every((t) => managerTeams.includes(t))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        roles: ["EMPLOYEE"],
        contractType: contractType || null,
        scheduleAmStart: schedule?.amStart || null,
        scheduleAmEnd: schedule?.amEnd || null,
        schedulePmStart: schedule?.pmStart || null,
        schedulePmEnd: schedule?.pmEnd || null,
        graceMinutes: Number.isFinite(schedule?.graceMin) ? schedule.graceMin : DEFAULT_SCHEDULE.graceMin,
        isActive: !!isActive,
        isDeleted: false,
        isProvisioned: false,
      },
    });

    if (Array.isArray(teamIds) && teamIds.length) {
      await prisma.teamMember.createMany({
        data: teamIds.map((teamId) => ({ teamId, userId: user.id })),
        skipDuplicates: true,
      });
    }

    await audit({
      actorUserId: req.user.id,
      action: "CREATE_USER",
      targetType: "User",
      targetId: user.id,
    });

    return res.status(201).json({ user });
  });

  router.put("/users/:id", authRequired, async (req, res) => {
    const { id } = req.params;
    const { displayName, firstName, lastName, email, phone, contractType, schedule, isActive, teamIds, workingDays } = req.body || {};

    if (!isAdmin(req.user) && !isManager(req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (isManager(req.user) && !isAdmin(req.user)) {
      const allowed = await canAccessUser(req.user, id);
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }

    if (isManager(req.user) && !isAdmin(req.user) && Array.isArray(teamIds)) {
      const managerTeams = await getManagerTeamIds(req.user.id);
      if (!teamIds.every((t) => managerTeams.includes(t))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        displayName: displayName || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        contractType: contractType || undefined,
        scheduleAmStart: schedule?.amStart || undefined,
        scheduleAmEnd: schedule?.amEnd || undefined,
        schedulePmStart: schedule?.pmStart || undefined,
        schedulePmEnd: schedule?.pmEnd || undefined,
        graceMinutes: Number.isFinite(schedule?.graceMin) ? schedule.graceMin : undefined,
        workingDays: Array.isArray(workingDays) ? workingDays : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      },
    });

    if (Array.isArray(teamIds)) {
      await prisma.teamMember.deleteMany({ where: { userId: id } });
      if (teamIds.length) {
        await prisma.teamMember.createMany({
          data: teamIds.map((teamId) => ({ teamId, userId: id })),
          skipDuplicates: true,
        });
      }
    }

    await audit({
      actorUserId: req.user.id,
      action: "UPDATE_USER",
      targetType: "User",
      targetId: user.id,
    });

    return res.json({ user });
  });

  router.post("/users/:id/provision", authRequired, async (req, res) => {
    const { id } = req.params;
    if (!isAdmin(req.user) && !isManager(req.user)) return res.status(403).json({ error: "Forbidden" });
    const { contractType, schedule, teamId, firstName, lastName, email, phone, workingDays } = req.body || {};

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: "Not found" });

    if (isManager(req.user) && !isAdmin(req.user) && teamId) {
      const managerTeams = await getManagerTeamIds(req.user.id);
      if (!managerTeams.includes(teamId)) return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.user.update({
      where: { id },
      data: {
        contractType: contractType || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        scheduleAmStart: schedule?.amStart || undefined,
        scheduleAmEnd: schedule?.amEnd || undefined,
        schedulePmStart: schedule?.pmStart || undefined,
        schedulePmEnd: schedule?.pmEnd || undefined,
        graceMinutes: Number.isFinite(schedule?.graceMin) ? schedule.graceMin : undefined,
        workingDays: Array.isArray(workingDays)
          ? workingDays
          : (Array.isArray(target.workingDays) ? target.workingDays : [1, 2, 3, 4, 5]),
        isProvisioned: true,
        isDeleted: false,
        isActive: true,
      },
    });

    if (teamId) {
      await prisma.teamMember.deleteMany({ where: { userId: id } });
      await prisma.teamMember.create({ data: { userId: id, teamId } });
    }

    await audit({
      actorUserId: req.user.id,
      action: "PROVISION_USER",
      targetType: "User",
      targetId: id,
    });

    return res.json({ ok: true });
  });

  router.delete("/users/:id", authRequired, requireAdmin, async (req, res) => {
    const { id } = req.params;
    await prisma.teamMember.deleteMany({ where: { userId: id } });
    await prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false, isProvisioned: false },
    });
    await audit({
      actorUserId: req.user.id,
      action: "DELETE_USER",
      targetType: "User",
      targetId: id,
    });
    return res.json({ ok: true });
  });

  return router;
};

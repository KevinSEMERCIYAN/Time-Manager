const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const { prisma, authRequired, isAdmin, isManager, isManagerOfTeam, audit } = ctx;

  router.get("/teams", authRequired, async (req, res) => {
    let teams;
    if (isAdmin(req.user)) {
      teams = await prisma.team.findMany({ include: { members: true }, orderBy: { name: "asc" } });
    } else if (isManager(req.user)) {
      teams = await prisma.team.findMany({
        where: { managerUserId: req.user.id },
        include: { members: true },
        orderBy: { name: "asc" },
      });
    } else {
      const memberships = await prisma.teamMember.findMany({
        where: { userId: req.user.id },
        include: { team: true },
      });
      teams = memberships.map((m) => m.team).filter(Boolean);
    }
    return res.json({ teams });
  });

  router.post("/teams", authRequired, async (req, res) => {
    if (!isAdmin(req.user) && !isManager(req.user)) return res.status(403).json({ error: "Forbidden" });
    const { name, description, managerUserId, memberIds = [] } = req.body || {};
    if (!name) return res.status(400).json({ error: "name required" });

    let managerId = managerUserId || null;
    if (isManager(req.user) && !isAdmin(req.user)) {
      managerId = req.user.id;
    }

    // Department (pôle): par défaut, un manager crée des équipes dans son pôle.
    // Un admin peut laisser null ou gérer explicitement via managerUserId (on dérive du manager si possible).
    let department = null;
    if (isManager(req.user) && !isAdmin(req.user)) {
      department = req.user.department || null;
      if (!department) return res.status(400).json({ error: "manager department missing" });
    } else if (managerId) {
      const manager = await prisma.user.findUnique({ where: { id: managerId } });
      department = manager?.department || null;
    }

    // Si on fournit des membres, on vérifie qu'ils appartiennent au même pôle que l'équipe (si défini).
    if (Array.isArray(memberIds) && memberIds.length && department) {
      const members = await prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, department: true },
      });
      const bad = members.find((m) => (m.department || null) !== department);
      if (bad) return res.status(403).json({ error: "Forbidden (cross-department member)" });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description: description || null,
        department,
        managerUserId: managerId,
      },
    });

    if (Array.isArray(memberIds) && memberIds.length) {
      await prisma.teamMember.createMany({
        data: memberIds.map((userId) => ({ teamId: team.id, userId })),
        skipDuplicates: true,
      });
    }

    await audit({
      actorUserId: req.user.id,
      action: "CREATE_TEAM",
      targetType: "Team",
      targetId: team.id,
    });

    return res.status(201).json({ team });
  });

  router.put("/teams/:id", authRequired, async (req, res) => {
    const { id } = req.params;
    const allowed = await isManagerOfTeam(req.user, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const { name, description, managerUserId, memberIds } = req.body || {};

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description || undefined,
        managerUserId: isAdmin(req.user) ? managerUserId || undefined : undefined,
      },
    });

    if (Array.isArray(memberIds)) {
      // Enforce department scoping (si l'équipe a un department défini, les membres doivent correspondre).
      const dept = existing.department || null;
      if (dept && memberIds.length) {
        const members = await prisma.user.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, department: true },
        });
        const bad = members.find((m) => (m.department || null) !== dept);
        if (bad) return res.status(403).json({ error: "Forbidden (cross-department member)" });
      }
      await prisma.teamMember.deleteMany({ where: { teamId: id } });
      if (memberIds.length) {
        await prisma.teamMember.createMany({
          data: memberIds.map((userId) => ({ teamId: id, userId })),
          skipDuplicates: true,
        });
      }
    }

    await audit({
      actorUserId: req.user.id,
      action: "UPDATE_TEAM",
      targetType: "Team",
      targetId: team.id,
    });

    return res.json({ team });
  });

  router.delete("/teams/:id", authRequired, async (req, res) => {
    const { id } = req.params;
    const allowed = await isManagerOfTeam(req.user, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    await prisma.team.delete({ where: { id } });
    await audit({
      actorUserId: req.user.id,
      action: "DELETE_TEAM",
      targetType: "Team",
      targetId: id,
    });
    return res.json({ ok: true });
  });

  return router;
};

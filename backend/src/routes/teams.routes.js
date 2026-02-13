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

    const team = await prisma.team.create({
      data: {
        name,
        description: description || null,
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

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description || undefined,
        managerUserId: isAdmin(req.user) ? managerUserId || undefined : undefined,
      },
    });

    if (Array.isArray(memberIds)) {
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

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
    const view = String(req.query.view || "").toLowerCase();
    if (view === "members") {
      const pageRaw = parseInt(String(req.query.page || "1"), 10);
      const pageSizeRaw = parseInt(String(req.query.pageSize || "30"), 10);
      const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
      const pageSize = Number.isFinite(pageSizeRaw) && [15, 30, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 30;

      const search = String(req.query.search || "").trim();
      const role = String(req.query.role || "").trim().toUpperCase();
      const service = String(req.query.service || "").trim();
      const team = String(req.query.team || "").trim();

      const where = {
        isDeleted: false,
        isActive: true,
        isProvisioned: true,
      };

      if (isManager(req.user) && !isAdmin(req.user)) {
        const dept = req.user.department || null;
        if (!dept) {
          return res.json({
            users: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          });
        }
        where.department = dept;
        where.roles = { path: "$", array_contains: "EMPLOYEE" };
      } else if (role && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(role)) {
        where.roles = { path: "$", array_contains: role };
      }

      if (service) {
        where.department = service;
      }

      if (team === "__NONE__") {
        where.teams = { none: {} };
      } else if (team) {
        where.teams = { some: { team: { name: team } } };
      }

      if (search) {
        where.OR = [
          { displayName: { contains: search } },
          { username: { contains: search } },
          { department: { contains: search } },
        ];
      }

      const total = await prisma.user.count({ where });
      const users = await prisma.user.findMany({
        where,
        include: {
          teams: {
            include: {
              team: {
                select: { id: true, name: true, department: true },
              },
            },
          },
        },
        orderBy: { displayName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const mapped = users.map((u) => ({
        ...u,
        teams: (u.teams || []).map((m) => ({
          id: m.team?.id,
          name: m.team?.name,
          department: m.team?.department || null,
        })).filter((t) => t.id && t.name),
      }));

      return res.json({
        users: mapped,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }

    const users = await listAccessibleUsers(req.user);
    const userIds = users.map((u) => u.id);

    const memberships = userIds.length
      ? await prisma.teamMember.findMany({
          where: { userId: { in: userIds } },
          include: { team: { select: { id: true, name: true, department: true } } },
        })
      : [];

    const teamsByUserId = new Map();
    for (const m of memberships) {
      if (!teamsByUserId.has(m.userId)) teamsByUserId.set(m.userId, []);
      teamsByUserId.get(m.userId).push({
        id: m.team.id,
        name: m.team.name,
        department: m.team.department || null,
      });
    }

    const enriched = users.map((u) => ({
      ...u,
      teams: teamsByUserId.get(u.id) || [],
    }));

    return res.json({ users: enriched });
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
      department,
      roles,
      contractType,
      schedule,
      isActive = true,
      isProvisioned = false,
      teamIds = [],
    } = req.body || {};
    if (!username || !displayName) return res.status(400).json({ error: "username/displayName required" });

    let finalDepartment = department || null;
    let finalRoles = ["EMPLOYEE"];
    let finalProvisioned = !!isProvisioned;

    if (isManager(req.user) && !isAdmin(req.user)) {
      // Manager: ne peut créer que des EMPLOYEE dans SON pôle.
      finalDepartment = req.user.department || null;
      if (!finalDepartment) return res.status(400).json({ error: "manager department missing" });
      finalRoles = ["EMPLOYEE"];
      finalProvisioned = false;
      if (Array.isArray(teamIds) && teamIds.length) {
        const managerTeams = await getManagerTeamIds(req.user.id);
        if (!teamIds.every((t) => managerTeams.includes(t))) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }
    } else if (isAdmin(req.user)) {
      // Admin: peut choisir rôles + department.
      if (Array.isArray(roles) && roles.length) {
        finalRoles = roles
          .map((r) => String(r || "").trim().toUpperCase())
          .filter(Boolean);
      }
      // Garde-fou: si aucun rôle fourni, on force EMPLOYEE.
      if (!finalRoles.length) finalRoles = ["EMPLOYEE"];
    }

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        department: finalDepartment,
        roles: finalRoles,
        contractType: contractType || null,
        scheduleAmStart: schedule?.amStart || null,
        scheduleAmEnd: schedule?.amEnd || null,
        schedulePmStart: schedule?.pmStart || null,
        schedulePmEnd: schedule?.pmEnd || null,
        graceMinutes: Number.isFinite(schedule?.graceMin) ? schedule.graceMin : DEFAULT_SCHEDULE.graceMin,
        isActive: !!isActive,
        isDeleted: false,
        isProvisioned: finalProvisioned,
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
    const { displayName, firstName, lastName, email, phone, contractType, schedule, isActive, teamIds, workingDays, roles, department } = req.body || {};

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

    const isAdminActor = isAdmin(req.user);
    const nextRoles = isAdminActor && Array.isArray(roles)
      ? roles.map((r) => String(r || "").trim().toUpperCase()).filter(Boolean)
      : undefined;
    const nextDepartment = isAdminActor
      ? (typeof department === "string" ? department : department === null ? null : undefined)
      : undefined;

    const user = await prisma.user.update({
      where: { id },
      data: {
        displayName: displayName || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        roles: nextRoles && nextRoles.length ? nextRoles : undefined,
        department: nextDepartment,
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

    if (isManager(req.user) && !isAdmin(req.user)) {
      // Manager: ne provisionne que dans son pôle.
      const actorDept = req.user.department || null;
      if (!actorDept) return res.status(403).json({ error: "Forbidden" });
      if ((target.department || null) !== actorDept) return res.status(403).json({ error: "Forbidden" });
      if (teamId) {
        const managerTeams = await getManagerTeamIds(req.user.id);
        if (!managerTeams.includes(teamId)) return res.status(403).json({ error: "Forbidden" });
      }
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

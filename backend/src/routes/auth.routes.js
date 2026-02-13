const express = require("express");

module.exports = (ctx) => {
  const router = express.Router();
  const {
    prisma,
    authRequired,
    isAdmin,
    audit,
    getUserRolesFromAD,
    getTeamFromDn,
    splitDisplayName,
    hashToken,
    createRefreshToken,
    signAccessToken,
    setAuthCookies,
    clearAuthCookies,
    buildLdapClient,
    ldapBind,
  } = ctx;

  router.post("/auth/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "username/password required" });

    const rawUsername = String(username);
    const normalizedUsername = rawUsername.includes("\\")
      ? rawUsername.split("\\").pop()
      : rawUsername.includes("@")
        ? rawUsername.split("@")[0]
        : rawUsername;

    const BASE_DN = process.env.LDAP_BASE_DN;
    const BIND_DN = process.env.LDAP_BIND_DN;
    const BIND_PW = process.env.LDAP_BIND_PASSWORD;
    const FILTER = (process.env.LDAP_USER_FILTER || "(sAMAccountName={{username}})").replace(
      "{{username}}",
      normalizedUsername
    );
    const DIRECT_BIND = process.env.LDAP_DIRECT_BIND === "true";
    const UPN_DOMAIN = process.env.LDAP_UPN_DOMAIN;
    const AD_DERIVE_TEAM = process.env.AD_DERIVE_TEAM === "true";

    const client = buildLdapClient();

    const searchUser = () =>
      new Promise((resolve, reject) => {
        client.search(
          BASE_DN,
          { scope: "sub", filter: FILTER, attributes: ["dn", "memberOf", "displayName", "mail"] },
          (err, r) => {
            if (err) return reject(err);
            let entry;
            r.on("searchEntry", (e) => (entry = e.object));
            r.on("error", reject);
            r.on("end", () => (entry ? resolve(entry) : reject(new Error("User not found"))));
          }
        );
      });

    try {
      let u;
      if (DIRECT_BIND) {
        if (!UPN_DOMAIN) throw new Error("LDAP_UPN_DOMAIN missing");
        const upn = `${normalizedUsername}@${UPN_DOMAIN}`;
        await ldapBind(client, upn, password);
        u = await searchUser();
      } else {
        await ldapBind(client, BIND_DN, BIND_PW);
        u = await searchUser();
        await ldapBind(client, u.dn, password);
      }

      const roles = getUserRolesFromAD(u.memberOf);
      if (!roles.length) return res.status(403).json({ error: "No allowed AD group" });

      const displayName = u.displayName || normalizedUsername;
      const { firstName, lastName } = splitDisplayName(displayName);
      const adDn = typeof u.dn === "string" ? u.dn : null;
      const adEmail = u.mail || null;
      const teamName = AD_DERIVE_TEAM ? getTeamFromDn(adDn) : null;

      const user = await prisma.user.upsert({
        where: { username: normalizedUsername },
        update: {
          displayName,
          firstName,
          lastName,
          roles,
          adDn,
          email: adEmail || undefined,
        },
        create: {
          username: normalizedUsername,
          displayName,
          firstName,
          lastName,
          roles,
          adDn,
          email: adEmail || undefined,
          isProvisioned: false,
          isDeleted: false,
        },
      });

      if ((user.isDeleted || user.isActive === false || !user.isProvisioned) && !roles.includes("ADMIN")) {
        return res.status(403).json({ error: "Profile not provisioned" });
      }

      if (teamName) {
        const existingTeam = await prisma.team.findFirst({ where: { name: teamName } });
        const team = existingTeam || (await prisma.team.create({ data: { name: teamName } }));
        await prisma.teamMember.upsert({
          where: { teamId_userId: { teamId: team.id, userId: user.id } },
          update: {},
          create: { teamId: team.id, userId: user.id },
        });
      }

      const refreshToken = createRefreshToken();
      const refreshTokenHash = hashToken(refreshToken);
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash },
      });

      const accessToken = signAccessToken({ id: user.id, username: user.username, roles });
      setAuthCookies(res, accessToken, refreshToken);

      await audit({
        actorUserId: user.id,
        action: "LOGIN",
        targetType: "User",
        targetId: user.id,
      });

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          roles,
        },
      });
    } catch (err) {
      console.error("LDAP auth error:", err?.code || err?.name, err?.message || err);
      return res.status(401).json({ error: "Invalid credentials" });
    } finally {
      client.unbind(() => {});
    }
  });

  router.post("/auth/refresh", async (req, res) => {
    const refreshToken = req.cookies.tm_refresh;
    if (!refreshToken) return res.status(401).json({ error: "Unauthorized" });
    const refreshTokenHash = hashToken(refreshToken);
    const user = await prisma.user.findFirst({ where: { refreshTokenHash } });
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const accessToken = signAccessToken({ id: user.id, username: user.username, roles: user.roles || [] });
    setAuthCookies(res, accessToken, refreshToken);
    return res.json({ ok: true });
  });

  router.post("/auth/logout", authRequired, async (req, res) => {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshTokenHash: null },
    });
    clearAuthCookies(res);
    await audit({
      actorUserId: req.user.id,
      action: "LOGOUT",
      targetType: "User",
      targetId: req.user.id,
    });
    return res.json({ ok: true });
  });

  router.get("/auth/me", authRequired, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        teams: { include: { team: true } },
        managedTeams: true,
      },
    });
    if (!user || user.isDeleted) return res.status(404).json({ error: "Not found" });
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        roles: user.roles || [],
        contractType: user.contractType,
        schedule: {
          amStart: user.scheduleAmStart,
          amEnd: user.scheduleAmEnd,
          pmStart: user.schedulePmStart,
          pmEnd: user.schedulePmEnd,
          graceMin: user.graceMinutes,
        },
        workingDays: user.workingDays || [1, 2, 3, 4, 5],
        teamIds: user.teams.map((t) => t.teamId),
        managedTeamIds: user.managedTeams.map((t) => t.id),
      },
    });
  });

  router.put("/me", authRequired, async (req, res) => {
    const { displayName, firstName, lastName, email, phone } = req.body || {};
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        displayName: displayName || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
      },
    });
    await audit({
      actorUserId: req.user.id,
      action: "UPDATE_SELF",
      targetType: "User",
      targetId: user.id,
    });
    return res.json({ user });
  });

  router.delete("/me", authRequired, async (req, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
    await prisma.teamMember.deleteMany({ where: { userId: req.user.id } });
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isDeleted: true, isActive: false, isProvisioned: false },
    });
    await audit({
      actorUserId: req.user.id,
      action: "DELETE_SELF",
      targetType: "User",
      targetId: req.user.id,
    });
    clearAuthCookies(res);
    return res.json({ ok: true });
  });

  router.get("/gdpr/export", authRequired, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        teams: { include: { team: true } },
        clocks: true,
      },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    await audit({
      actorUserId: req.user.id,
      action: "GDPR_EXPORT",
      targetType: "User",
      targetId: req.user.id,
    });
    return res.json({ user });
  });

  router.post("/gdpr/anonymize", authRequired, async (req, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
    await prisma.teamMember.deleteMany({ where: { userId: req.user.id } });
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        displayName: "Anonymized",
        firstName: null,
        lastName: null,
        email: null,
        phone: null,
        isDeleted: true,
        isActive: false,
        isProvisioned: false,
      },
    });
    await audit({
      actorUserId: req.user.id,
      action: "GDPR_ANONYMIZE",
      targetType: "User",
      targetId: req.user.id,
    });
    clearAuthCookies(res);
    return res.json({ ok: true });
  });

  return router;
};

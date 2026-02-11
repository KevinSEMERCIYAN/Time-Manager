const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const ldap = require("ldapjs");
const fs = require("fs");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_TTL_MINUTES = parseInt(process.env.JWT_TTL_MINUTES || "15", 10);
const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || "14", 10);
const AD_SYNC_ENABLED = process.env.AD_SYNC_ENABLED === "true";
const AD_SYNC_INTERVAL_MINUTES = parseInt(process.env.AD_SYNC_INTERVAL_MINUTES || "0", 10);
const AD_SYNC_EXCLUDE_USERS = (process.env.LDAP_SYNC_EXCLUDE_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const COOKIE_NAME = "tm_access";
const REFRESH_COOKIE = "tm_refresh";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

const DEFAULT_SCHEDULE = {
  amStart: "09:00",
  amEnd: "12:00",
  pmStart: "13:30",
  pmEnd: "17:00",
  graceMin: 15,
};

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(helmet());

app.get("/health", (req, res) => res.json({ ok: true }));

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (user) => {
  const payload = {
    sub: user.id,
    username: user.username,
    roles: user.roles || [],
  };
  const ttl = `${JWT_TTL_MINUTES}m`;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ttl });
};

const splitDisplayName = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const createRefreshToken = () => crypto.randomBytes(48).toString("hex");

const setAuthCookies = (res, accessToken, refreshToken) => {
  const base = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    domain: COOKIE_DOMAIN,
    path: "/",
  };
  res.cookie(COOKIE_NAME, accessToken, {
    ...base,
    maxAge: JWT_TTL_MINUTES * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const base = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    domain: COOKIE_DOMAIN,
    path: "/",
  };
  res.clearCookie(COOKIE_NAME, base);
  res.clearCookie(REFRESH_COOKIE, base);
};

const authRequired = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies[COOKIE_NAME] || bearer;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { teams: true },
    });
    if (!user || !user.isActive || user.isDeleted) return res.status(401).json({ error: "Unauthorized" });
    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles || [],
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const hasRole = (roles, role) => Array.isArray(roles) && roles.includes(role);
const isAdmin = (u) => hasRole(u.roles, "ADMIN");
const isManager = (u) => hasRole(u.roles, "MANAGER");

const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Forbidden" });
  next();
};

const audit = async ({ actorUserId, action, targetType, targetId, meta }) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        meta: meta || undefined,
      },
    });
  } catch (err) {
    console.warn("audit log failed", err?.message || err);
  }
};

const parseTimeOnDate = (dateStr, timeStr) => {
  const [h, m] = String(timeStr || "00:00").split(":").map((v) => parseInt(v, 10));
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

const normalizeWorkingDays = (user) => {
  const raw = Array.isArray(user?.workingDays) ? user.workingDays : null;
  const parsed = raw
    ? raw.map((v) => parseInt(v, 10)).filter((v) => Number.isFinite(v) && v >= 0 && v <= 6)
    : [];
  return parsed.length ? parsed : [1, 2, 3, 4, 5];
};

const isWorkingDay = (user, dateObj) => {
  const day = dateObj.getDay();
  return normalizeWorkingDays(user).includes(day);
};

const scheduleForUser = (user) => ({
  amStart: user.scheduleAmStart || DEFAULT_SCHEDULE.amStart,
  amEnd: user.scheduleAmEnd || DEFAULT_SCHEDULE.amEnd,
  pmStart: user.schedulePmStart || DEFAULT_SCHEDULE.pmStart,
  pmEnd: user.schedulePmEnd || DEFAULT_SCHEDULE.pmEnd,
  graceMin: Number.isFinite(user.graceMinutes) ? user.graceMinutes : DEFAULT_SCHEDULE.graceMin,
});

const expectedDailyHours = (user, dateObj) => {
  if (!user?.contractType) return 0;
  if (!user?.scheduleAmStart || !user?.scheduleAmEnd || !user?.schedulePmStart || !user?.schedulePmEnd) {
    return 0;
  }
  if (dateObj && !isWorkingDay(user, dateObj)) return 0;
  const baseDate = (dateObj || new Date()).toISOString().slice(0, 10);
  const s = scheduleForUser(user);
  const amStart = parseTimeOnDate(baseDate, s.amStart);
  const amEnd = parseTimeOnDate(baseDate, s.amEnd);
  const pmStart = parseTimeOnDate(baseDate, s.pmStart);
  const pmEnd = parseTimeOnDate(baseDate, s.pmEnd);
  const am = Math.max(0, (amEnd - amStart) / 3600000);
  const pm = Math.max(0, (pmEnd - pmStart) / 3600000);
  return am + pm;
};

const getManagerTeamIds = async (userId) => {
  const teams = await prisma.team.findMany({
    where: { managerUserId: userId },
    select: { id: true },
  });
  return teams.map((t) => t.id);
};

const canAccessUser = async (actor, userId) => {
  if (isAdmin(actor)) return true;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.isDeleted) return false;
  if (actor.id === userId) return true;
  if (!isManager(actor)) return false;
  if (Array.isArray(target.roles) && target.roles.includes("EMPLOYEE") && target.isProvisioned) {
    return true;
  }
  const managerTeamIds = await getManagerTeamIds(actor.id);
  if (!managerTeamIds.length) return false;
  const membership = await prisma.teamMember.findFirst({
    where: { userId, teamId: { in: managerTeamIds } },
  });
  return !!membership;
};

const canManageClockFor = async (actor, targetId) => {
  if (isAdmin(actor)) return true;
  if (actor.id === targetId) return true;
  if (!isManager(actor)) return false;
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.isDeleted || target.isActive === false) return false;
  if (!target.isProvisioned) return false;
  const rolesList = Array.isArray(target.roles) ? target.roles : [];
  if (!rolesList.includes("EMPLOYEE")) return false;
  const managerTeamIds = await getManagerTeamIds(actor.id);
  if (!managerTeamIds.length) return false;
  const membership = await prisma.teamMember.findFirst({
    where: { userId: targetId, teamId: { in: managerTeamIds } },
  });
  return !!membership;
};

const isManagerOfTeam = async (actor, teamId) => {
  if (isAdmin(actor)) return true;
  if (!isManager(actor)) return false;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  return team && team.managerUserId === actor.id;
};

const listAccessibleUsers = async (actor) => {
  const loadEmployees = async () => {
    const all = await prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { displayName: "asc" },
    });
    return all.filter((u) => Array.isArray(u.roles) && u.roles.includes("EMPLOYEE"));
  };

  if (isAdmin(actor)) {
    return prisma.user.findMany({ orderBy: { displayName: "asc" } });
  }
  if (isManager(actor)) {
    const teamIds = await getManagerTeamIds(actor.id);
    if (!teamIds.length) {
      const employees = await loadEmployees();
      const self = await prisma.user.findUnique({ where: { id: actor.id } });
      if (self && !self.isDeleted) {
        const exists = employees.find((u) => u.id === self.id);
        if (!exists) employees.unshift(self);
      }
      return employees;
    }
    const members = await prisma.teamMember.findMany({
      where: { teamId: { in: teamIds } },
      include: { user: true },
    });
    let users = members.map((m) => m.user).filter((u) => u);
    if (!users.length) {
      users = await loadEmployees();
    }
    const self = await prisma.user.findUnique({ where: { id: actor.id } });
    if (self) users.push(self);
    const dedup = new Map();
    for (const u of users) dedup.set(u.id, u);
    return Array.from(dedup.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  const self = await prisma.user.findUnique({ where: { id: actor.id } });
  return self && !self.isDeleted ? [self] : [];
};

const autoCloseOpenClocks = async (userIds) => {
  if (!userIds.length) return;
  const openClocks = await prisma.clock.findMany({
    where: { userId: { in: userIds }, clockOutAt: null },
    include: { user: true },
  });
  for (const clock of openClocks) {
    const dateKey = clock.date.toISOString().slice(0, 10);
    const sched = scheduleForUser(clock.user);
    const pmEnd = parseTimeOnDate(dateKey, sched.pmEnd);
    if (Date.now() >= pmEnd.getTime()) {
      const workedMinutes = Math.max(0, Math.floor((pmEnd - clock.clockInAt) / 60000));
      await prisma.clock.update({
        where: { id: clock.id },
        data: {
          clockOutAt: pmEnd,
          workedMinutes,
          source: "auto",
        },
      });
    }
  }
};

const getUserRolesFromAD = (memberOf) => {
  const list = Array.isArray(memberOf) ? memberOf : memberOf ? [memberOf] : [];
  const hasGroup = (cn) =>
    list.some((g) => String(g).toLowerCase().includes(`cn=${cn.toLowerCase()},`));
  const out = [];
  if (hasGroup("GG_TM_Admins")) out.push("ADMIN");
  if (hasGroup("GG_TM_Managers")) out.push("MANAGER");
  if (hasGroup("GG_TM_Employees")) out.push("EMPLOYEE");
  return out;
};

const getTeamFromDn = (dn) => {
  if (!dn || typeof dn !== "string") return null;
  const parts = dn.split(",").map((p) => p.trim());
  const ou = parts.find((p) => p.toUpperCase().startsWith("OU="));
  return ou ? ou.slice(3) : null;
};

const buildLdapClient = () => {
  const LDAP_URL = process.env.LDAP_URL;
  const CA_PATH = process.env.LDAP_CA_CERT_PATH;
  const TLS_SERVERNAME = process.env.LDAP_TLS_SERVERNAME;
  const tlsOptions = { rejectUnauthorized: true };
  if (CA_PATH && fs.existsSync(CA_PATH)) {
    tlsOptions.ca = fs.readFileSync(CA_PATH);
  }
  if (TLS_SERVERNAME) {
    tlsOptions.servername = TLS_SERVERNAME;
  }
  const client = ldap.createClient({ url: LDAP_URL, tlsOptions });
  client.on("error", (err) => {
    console.error("LDAP client error:", err.message || err);
  });
  return client;
};

const ldapBind = (client, dn, pw) =>
  new Promise((resolve, reject) => client.bind(dn, pw, (err) => (err ? reject(err) : resolve())));

const ldapSearchList = (client, base, options) =>
  new Promise((resolve, reject) => {
    client.search(base, options, (err, r) => {
      if (err) return reject(err);
      const items = [];
      r.on("searchEntry", (e) => items.push(e.object || {}));
      r.on("error", reject);
      r.on("end", () => resolve(items));
    });
  });

let adSyncRunning = false;
const syncAdUsers = async () => {
  if (adSyncRunning) return { ok: true, skipped: true };
  adSyncRunning = true;
  const BASE_DN = process.env.LDAP_BASE_DN;
  const BIND_DN = process.env.LDAP_BIND_DN;
  const BIND_PW = process.env.LDAP_BIND_PASSWORD;
  const USERS_BASE_DN = process.env.LDAP_USERS_BASE_DN || `OU=Utilisateurs,${BASE_DN}`;
  const USERS_FILTER =
    process.env.LDAP_USERS_FILTER || "(&(objectClass=user)(!(objectClass=computer)))";
  const AD_DERIVE_TEAM = process.env.AD_DERIVE_TEAM === "true";

  if (!BIND_DN || !BIND_PW) {
    adSyncRunning = false;
    throw new Error("LDAP bind credentials missing for AD sync");
  }

  const client = buildLdapClient();
  let created = 0;
  let updated = 0;
  let scanned = 0;
  let deactivated = 0;

  try {
    await ldapBind(client, BIND_DN, BIND_PW);
    const users = await ldapSearchList(client, USERS_BASE_DN, {
      scope: "sub",
      filter: USERS_FILTER,
      attributes: [
        "dn",
        "sAMAccountName",
        "displayName",
        "mail",
        "telephoneNumber",
        "memberOf",
        "userAccountControl",
      ],
    });

    const seenUsernames = new Set();
    for (const u of users) {
      const username = u.sAMAccountName;
      if (!username) continue;
      if (username.toLowerCase().startsWith("svc_")) continue;
      if (AD_SYNC_EXCLUDE_USERS.includes(username)) continue;
      scanned += 1;
      seenUsernames.add(username);
      const displayName = u.displayName || username;
      const { firstName, lastName } = splitDisplayName(displayName);
      const roles = getUserRolesFromAD(u.memberOf);
      const adDn = typeof u.dn === "string" ? u.dn : null;
      const email = u.mail || null;
      const phone = u.telephoneNumber || null;
      const uac = parseInt(u.userAccountControl || "0", 10);
      const isActive = (uac & 2) === 0;

      const existing = await prisma.user.findUnique({ where: { username } });
      const data = {
        displayName,
        firstName,
        lastName,
        roles,
        adDn,
        email,
        phone,
        isActive,
      };

      if (existing) {
        if (existing.isDeleted) {
          continue;
        }
        await prisma.user.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.user.create({
          data: {
            username,
            ...data,
            isDeleted: false,
            isProvisioned: false,
          },
        });
        created += 1;
      }

      if (AD_DERIVE_TEAM && adDn) {
        const teamName = getTeamFromDn(adDn);
        if (teamName) {
          const team =
            (await prisma.team.findFirst({ where: { name: teamName } })) ||
            (await prisma.team.create({ data: { name: teamName } }));
          const user = await prisma.user.findUnique({ where: { username } });
          if (user) {
            await prisma.teamMember.upsert({
              where: { teamId_userId: { teamId: team.id, userId: user.id } },
              update: {},
              create: { teamId: team.id, userId: user.id },
            });
          }
        }
      }
    }

    // Deactivate users that disappeared from AD (within the synced OU scope)
    const syncedUsers = await prisma.user.findMany({
      where: {
        adDn: { endsWith: USERS_BASE_DN },
        isDeleted: false,
      },
      select: { id: true, username: true },
    });
    for (const u of syncedUsers) {
      if (!seenUsernames.has(u.username)) {
        await prisma.user.update({
          where: { id: u.id },
          data: { isActive: false },
        });
        deactivated += 1;
      }
    }

    await audit({
      actorUserId: null,
      action: "SYNC_AD_USERS",
      targetType: "System",
      meta: { scanned, created, updated, deactivated },
    });
  } finally {
    client.unbind(() => {});
    adSyncRunning = false;
  }

  return { ok: true, scanned, created, updated, deactivated };
};

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username/password required" });

  const rawUsername = String(username);
  const normalizedUsername = rawUsername.includes("\\")
    ? rawUsername.split("\\").pop()
    : rawUsername.includes("@")
      ? rawUsername.split("@")[0]
      : rawUsername;

  const LDAP_URL = process.env.LDAP_URL;
  const BASE_DN = process.env.LDAP_BASE_DN;
  const BIND_DN = process.env.LDAP_BIND_DN;
  const BIND_PW = process.env.LDAP_BIND_PASSWORD;
  const FILTER = (process.env.LDAP_USER_FILTER || "(sAMAccountName={{username}})").replace(
    "{{username}}",
    normalizedUsername
  );
  const CA_PATH = process.env.LDAP_CA_CERT_PATH;
  const TLS_SERVERNAME = process.env.LDAP_TLS_SERVERNAME;
  const DIRECT_BIND = process.env.LDAP_DIRECT_BIND === "true";
  const UPN_DOMAIN = process.env.LDAP_UPN_DOMAIN;
  const AD_DERIVE_TEAM = process.env.AD_DERIVE_TEAM === "true";

  const tlsOptions = { rejectUnauthorized: true };
  if (CA_PATH && fs.existsSync(CA_PATH)) {
    tlsOptions.ca = fs.readFileSync(CA_PATH);
  }
  if (TLS_SERVERNAME) {
    tlsOptions.servername = TLS_SERVERNAME;
  }

  const client = ldap.createClient({ url: LDAP_URL, tlsOptions });
  client.on("error", (err) => {
    console.error("LDAP client error:", err.message || err);
  });

  const bind = (dn, pw) =>
    new Promise((resolve, reject) => client.bind(dn, pw, (err) => (err ? reject(err) : resolve())));

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
      await bind(upn, password);
      u = await searchUser();
    } else {
      await bind(BIND_DN, BIND_PW);
      u = await searchUser();
      await bind(u.dn, password);
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

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        roles,
      },
    });
  } catch (err) {
    console.error("LDAP auth error:", err?.code || err?.name, err?.message || err);
    res.status(401).json({ error: "Invalid credentials" });
  } finally {
    client.unbind(() => {});
  }
});

app.post("/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (!refreshToken) return res.status(401).json({ error: "Unauthorized" });
  const refreshTokenHash = hashToken(refreshToken);
  const user = await prisma.user.findFirst({ where: { refreshTokenHash } });
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const accessToken = signAccessToken({ id: user.id, username: user.username, roles: user.roles || [] });
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ ok: true });
});

app.post("/auth/logout", authRequired, async (req, res) => {
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
  res.json({ ok: true });
});

app.get("/auth/me", authRequired, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        teams: { include: { team: true } },
        managedTeams: true,
      },
    });
  if (!user || user.isDeleted) return res.status(404).json({ error: "Not found" });
  res.json({
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

app.put("/me", authRequired, async (req, res) => {
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
  res.json({ user });
});

app.delete("/me", authRequired, async (req, res) => {
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
  res.json({ ok: true });
});

app.get("/gdpr/export", authRequired, async (req, res) => {
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
  res.json({ user });
});

app.post("/gdpr/anonymize", authRequired, async (req, res) => {
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
  res.json({ ok: true });
});

app.get("/users", authRequired, async (req, res) => {
  const users = await listAccessibleUsers(req.user);
  res.json({ users });
});

app.get("/users/:id", authRequired, async (req, res) => {
  const { id } = req.params;
  const allowed = await canAccessUser(req.user, id);
  if (!allowed) return res.status(403).json({ error: "Forbidden" });
  const user = await prisma.user.findUnique({
    where: { id },
    include: { teams: { include: { team: true } } },
  });
  if (!user || user.isDeleted) return res.status(404).json({ error: "Not found" });
  res.json({ user });
});

app.post("/users", authRequired, async (req, res) => {
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

  res.status(201).json({ user });
});

app.put("/users/:id", authRequired, async (req, res) => {
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

  res.json({ user });
});

app.post("/users/:id/provision", authRequired, async (req, res) => {
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

  res.json({ ok: true });
});

app.delete("/users/:id", authRequired, requireAdmin, async (req, res) => {
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
  res.json({ ok: true });
});

app.get("/teams", authRequired, async (req, res) => {
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
  res.json({ teams });
});

app.post("/teams", authRequired, async (req, res) => {
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

  res.status(201).json({ team });
});

app.put("/teams/:id", authRequired, async (req, res) => {
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

  res.json({ team });
});

app.delete("/teams/:id", authRequired, async (req, res) => {
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
  res.json({ ok: true });
});

app.post("/clocks", authRequired, async (req, res) => {
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
  const sched = scheduleForUser(user);
  const earliestStart = parseTimeOnDate(dateKey, "08:00");
  const amStart = parseTimeOnDate(dateKey, sched.amStart);
  const pmStart = parseTimeOnDate(dateKey, sched.pmStart);
  const pmEnd = parseTimeOnDate(dateKey, sched.pmEnd);
  const graceMs = (sched.graceMin || 15) * 60000;

  const active = await prisma.clock.findFirst({
    where: { userId: user.id, clockOutAt: null },
  });

  if ((type || "IN") === "IN") {
    if (active) return res.status(400).json({ error: "Already clocked in" });
    if (now.getTime() < earliestStart.getTime()) return res.status(400).json({ error: "Clock-in not allowed" });
    if (now.getTime() >= pmEnd.getTime()) return res.status(400).json({ error: "Clock-in not allowed" });

    const nowTs = now.getTime();
    const amStartTs = amStart.getTime();
    const pmStartTs = pmStart.getTime();
    const canClockInMorning = nowTs >= amStartTs && nowTs <= amStartTs + graceMs;
    const canClockInAfternoon = nowTs >= pmStartTs && nowTs <= pmStartTs + graceMs;

    if (!canClockInMorning && !canClockInAfternoon) {
      return res.status(400).json({ error: "Clock-in not allowed" });
    }

    const scheduledStart = canClockInAfternoon ? pmStart : amStart;
    const lateMinutes = Math.max(0, Math.floor((nowTs - (scheduledStart.getTime() + graceMs)) / 60000));

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
  if (now.getTime() >= pmEnd.getTime()) {
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

app.get("/clocks", authRequired, async (req, res) => {
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

  res.json({ clocks });
});

app.get("/users/:id/clocks", authRequired, async (req, res) => {
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

  res.json({ clocks });
});

app.get("/reports", authRequired, async (req, res) => {
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
    const shifts = dailyShiftCount.get(key) || 0;
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

  res.json({
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

app.get("/reports/team", authRequired, async (req, res) => {
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
    const weekKey = `${dayKey.slice(0, 4)}-W${Math.ceil((new Date(dayKey).getDate()) / 7)}`;
    weekly[weekKey] = (weekly[weekKey] || 0) + (c.workedMinutes || 0);
  }
  res.json({ daily, weekly });
});

app.get("/reports/user", authRequired, async (req, res) => {
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
    const weekKey = `${dayKey.slice(0, 4)}-W${Math.ceil((new Date(dayKey).getDate()) / 7)}`;
    weekly[weekKey] = (weekly[weekKey] || 0) + (c.workedMinutes || 0);
  }
  res.json({ daily, weekly });
});

app.post("/admin/reset", authRequired, requireAdmin, async (req, res) => {
  await prisma.clock.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.auditLog.deleteMany();
  await audit({
    actorUserId: req.user.id,
    action: "RESET_DATA",
  });
  res.json({ ok: true });
});

app.post("/admin/seed", authRequired, requireAdmin, async (req, res) => {
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
      if (absenceChance < 0.06) continue; // absence

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
  res.json({ ok: true });
});

app.post("/admin/sync-ad", authRequired, requireAdmin, async (req, res) => {
  try {
    const result = await syncAdUsers();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Sync failed" });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend on :${PORT}`));
}

module.exports = app;

if (AD_SYNC_ENABLED && AD_SYNC_INTERVAL_MINUTES > 0) {
  const intervalMs = AD_SYNC_INTERVAL_MINUTES * 60 * 1000;
  setTimeout(() => {
    syncAdUsers().catch((err) => console.error("AD sync failed:", err?.message || err));
  }, 5000);
  setInterval(() => {
    syncAdUsers().catch((err) => console.error("AD sync failed:", err?.message || err));
  }, intervalMs);
}

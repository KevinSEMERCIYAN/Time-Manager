const jwt = require("jsonwebtoken");
const ldap = require("ldapjs");
const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

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
  const hasGroup = (cn) => list.some((g) => String(g).toLowerCase().includes(`cn=${cn.toLowerCase()},`));
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

const startAdSyncScheduler = () => {
  if (!AD_SYNC_ENABLED || AD_SYNC_INTERVAL_MINUTES <= 0) return;
  const intervalMs = AD_SYNC_INTERVAL_MINUTES * 60 * 1000;
  setTimeout(() => {
    syncAdUsers().catch((err) => console.error("AD sync failed:", err?.message || err));
  }, 5000);
  setInterval(() => {
    syncAdUsers().catch((err) => console.error("AD sync failed:", err?.message || err));
  }, intervalMs);
};

module.exports = {
  prisma,
  PORT,
  DEFAULT_SCHEDULE,
  authRequired,
  requireAdmin,
  hasRole,
  isAdmin,
  isManager,
  audit,
  parseTimeOnDate,
  normalizeWorkingDays,
  isWorkingDay,
  scheduleForUser,
  expectedDailyHours,
  getManagerTeamIds,
  canAccessUser,
  canManageClockFor,
  isManagerOfTeam,
  listAccessibleUsers,
  autoCloseOpenClocks,
  getUserRolesFromAD,
  getTeamFromDn,
  buildLdapClient,
  ldapBind,
  ldapSearchList,
  hashToken,
  signAccessToken,
  splitDisplayName,
  createRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  syncAdUsers,
  startAdSyncScheduler,
};

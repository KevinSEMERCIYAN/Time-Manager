#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/timemanager"

# Bootstrap files for current app layout. This script overwrites generated files.

echo "[1] Arborescence"
mkdir -p "$ROOT"/{nginx/conf.d,backend/src,frontend/src}

# Note: .env is not used by current compose.yml (env vars are inline there).

echo "[2] compose.yml"
cat > "$ROOT/compose.yml" <<'YAML'
services:
  db:
    image: mariadb:11
    environment:
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: timemanager
      MARIADB_USER: timemanager
      MARIADB_PASSWORD: timemanager
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mariadb-admin", "ping", "-h", "127.0.0.1", "-uroot", "-proot"]
      interval: 5s
      timeout: 3s
      retries: 30
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      DB_HOST: db
      DB_PORT: "3306"
      DB_NAME: timemanager
      DB_USER: timemanager
      DB_PASS: timemanager

      LDAP_URL: ldaps://AD-01.primebank.local:636
      LDAP_BASE_DN: DC=primebank,DC=local
      LDAP_BIND_DN: svc_ldap_reader@primebank.local
      LDAP_BIND_PASSWORD: change-me
      LDAP_USER_FILTER: "(sAMAccountName={{username}})"
      LDAP_CA_CERT_PATH: /app/certs/primebank-root-ca.cer
      LDAP_TLS_SERVERNAME: AD-01.primebank.local
      LDAP_DIRECT_BIND: "true"
      LDAP_UPN_DOMAIN: primebank.local

      JWT_SECRET: change-me
      JWT_TTL_MINUTES: "15"

      MAIL_HOST: mailpit
      MAIL_PORT: "1025"
      MAIL_FROM: no-reply@primebank.local
    depends_on:
      db:
        condition: service_healthy
    expose:
      - "3000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    expose:
      - "5173"
    restart: unless-stopped

  reverse-proxy:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"
    restart: unless-stopped

volumes:
  db-data:
YAML

echo "[3] Nginx conf"
cat > "$ROOT/nginx/conf.d/app.conf" <<'NGINX'
server {
  listen 80;
  server_name _;

  client_max_body_size 20m;

  location /api/ {
    proxy_pass http://backend:3000/;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location / {
    proxy_pass http://frontend:5173;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX

echo "[4] Backend"
cat > "$ROOT/backend/Dockerfile" <<'DOCKER'
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "dev"]
DOCKER

cat > "$ROOT/backend/package.json" <<'JSON'
{
  "name": "timemanager-backend",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "node src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "ldapjs": "^2.3.3"
  }
}
JSON

cat > "$ROOT/backend/src/index.js" <<'JS'
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const ldap = require("ldapjs");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/health", (req, res) => res.json({ ok: true }));

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
  const FILTER = (process.env.LDAP_USER_FILTER || "(sAMAccountName={{username}})").replace("{{username}}", normalizedUsername);
  const CA_PATH = process.env.LDAP_CA_CERT_PATH;
  const TLS_SERVERNAME = process.env.LDAP_TLS_SERVERNAME;
  const DIRECT_BIND = process.env.LDAP_DIRECT_BIND === "true";
  const UPN_DOMAIN = process.env.LDAP_UPN_DOMAIN;
  const TEAMS_BASE_DN = process.env.LDAP_TEAMS_BASE_DN || `OU=Utilisateurs,${BASE_DN}`;
  const USERS_BASE_DN = process.env.LDAP_USERS_BASE_DN || `OU=Utilisateurs,${BASE_DN}`;

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

  const bind = (dn, pw) => new Promise((resolve, reject) =>
    client.bind(dn, pw, (err) => (err ? reject(err) : resolve()))
  );

  const searchUser = () => new Promise((resolve, reject) => {
    client.search(BASE_DN, { scope: "sub", filter: FILTER, attributes: ["dn", "memberOf", "displayName"] }, (err, r) => {
      if (err) return reject(err);
      let entry;
      r.on("searchEntry", (e) => entry = e.object);
      r.on("error", reject);
      r.on("end", () => entry ? resolve(entry) : reject(new Error("User not found")));
    });
  });
  const searchTeams = () => new Promise((resolve, reject) => {
    client.search(
      TEAMS_BASE_DN,
      { scope: "one", filter: "(objectClass=organizationalUnit)", attributes: ["ou"] },
      (err, r) => {
        if (err) return reject(err);
        const items = [];
        r.on("searchEntry", (e) => {
          if (e.object?.ou) items.push(e.object.ou);
        });
        r.on("error", reject);
        r.on("end", () => resolve(items));
      }
    );
  });
  const searchUsers = () => new Promise((resolve, reject) => {
    client.search(
      USERS_BASE_DN,
      {
        scope: "sub",
        filter: "(&(objectClass=user)(!(objectClass=computer)))",
        attributes: ["dn", "sAMAccountName", "displayName", "memberOf"],
      },
      (err, r) => {
        if (err) return reject(err);
        const items = [];
        r.on("searchEntry", (e) => {
          const obj = e.object || {};
          if (obj.sAMAccountName) {
            items.push({
              username: obj.sAMAccountName,
              displayName: obj.displayName || obj.sAMAccountName,
              dn: obj.dn || "",
              memberOf: obj.memberOf || [],
            });
          }
        });
        r.on("error", reject);
        r.on("end", () => resolve(items));
      }
    );
  });
  const getTeamFromDn = (dn) => {
    if (!dn || typeof dn !== "string") return null;
    const parts = dn.split(",").map((p) => p.trim());
    const ou = parts.find((p) => p.toUpperCase().startsWith("OU="));
    return ou ? ou.slice(3) : null;
  };

  try {
    console.log("LDAP config:", {
      url: LDAP_URL,
      baseDn: BASE_DN,
      bindDn: BIND_DN,
      filter: FILTER,
      tlsServername: TLS_SERVERNAME || null,
      user: normalizedUsername,
    });
    let u;
    let teams = [];
    let users = [];
    if (DIRECT_BIND) {
      if (!UPN_DOMAIN) throw new Error("LDAP_UPN_DOMAIN missing");
      const upn = `${normalizedUsername}@${UPN_DOMAIN}`;
      await bind(upn, password);
      console.log("LDAP bind (user UPN) OK");
      u = await searchUser();
      console.log("LDAP user found:", { dn: u.dn });
      try { teams = await searchTeams(); } catch (e) { console.warn("LDAP teams search failed:", e?.message || e); }
      try { users = await searchUsers(); } catch (e) { console.warn("LDAP users search failed:", e?.message || e); }
    } else {
      await bind(BIND_DN, BIND_PW);
      console.log("LDAP bind (service account) OK");
      u = await searchUser();
      console.log("LDAP user found:", { dn: u.dn });
      await bind(u.dn, password);
      console.log("LDAP bind (user) OK");
      try { teams = await searchTeams(); } catch (e) { console.warn("LDAP teams search failed:", e?.message || e); }
      try { users = await searchUsers(); } catch (e) { console.warn("LDAP users search failed:", e?.message || e); }
    }

    const memberOf = Array.isArray(u.memberOf) ? u.memberOf : (u.memberOf ? [u.memberOf] : []);
    const has = (cn) => memberOf.some(g => g.toLowerCase().includes(`cn=${cn.toLowerCase()},`));
    const rolesFromMemberOf = (memberOfList) => {
      const list = Array.isArray(memberOfList) ? memberOfList : (memberOfList ? [memberOfList] : []);
      const hasGroup = (cn) => list.some(g => String(g).toLowerCase().includes(`cn=${cn.toLowerCase()},`));
      const out = [];
      if (hasGroup("GG_TM_Admins")) out.push("ROLE_ADMIN");
      if (hasGroup("GG_TM_Managers")) out.push("ROLE_MANAGER");
      if (hasGroup("GG_TM_Employees")) out.push("ROLE_EMPLOYEE");
      return out;
    };

    const roles = [];
    if (has("GG_TM_Admins")) roles.push("ROLE_ADMIN");
    if (has("GG_TM_Managers")) roles.push("ROLE_MANAGER");
    if (has("GG_TM_Employees")) roles.push("ROLE_EMPLOYEE");
    if (!roles.length) return res.status(403).json({ error: "No allowed AD group" });

    const dn = typeof u.dn === "string" ? u.dn : "";
    const team = getTeamFromDn(dn);
    const displayName = u.displayName || normalizedUsername;

    const ttl = `${parseInt(process.env.JWT_TTL_MINUTES || "15", 10)}m`;
    const token = jwt.sign({ sub: normalizedUsername, roles }, process.env.JWT_SECRET, { expiresIn: ttl });

    const isAdmin = roles.includes("ROLE_ADMIN");
    const isManager = roles.includes("ROLE_MANAGER");
    const allowUsersList = isAdmin || isManager;

    const usersOutRaw = allowUsersList
      ? users
          .map((x) => ({
            ...x,
            team: getTeamFromDn(x.dn),
            roles: rolesFromMemberOf(x.memberOf),
          }))
          .map(({ dn: _dn, memberOf: _memberOf, ...rest }) => rest)
      : [];
    const usersOut = isManager && !isAdmin && team
      ? usersOutRaw.filter((u) => u.team === team)
      : usersOutRaw;

    const teamsOut = isAdmin ? teams : (team ? [team] : []);

    res.json({ token, roles, username: normalizedUsername, displayName, team, teams: teamsOut, users: usersOut });
  } catch (err) {
    console.error("LDAP auth error:", err?.code || err?.name, err?.message || err);
    res.status(401).json({ error: "Invalid credentials" });
  } finally {
    client.unbind(() => {});
  }
});

app.listen(3000, () => console.log("Backend on :3000"));
JS

echo "[5] Note"
echo "Frontend files are expected in $ROOT/frontend (existing repo)."

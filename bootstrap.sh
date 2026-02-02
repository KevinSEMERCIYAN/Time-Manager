#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/timemanager"
DOMAIN="primebank.local"
AD_HOST="AD-01.primebank.local"

echo "[1] Arborescence"
mkdir -p "$ROOT"/{nginx/conf.d,backend/src,frontend/src}

echo "[2] .env"
cat > "$ROOT/.env" <<EOF
DB_HOST=db
DB_PORT=3306
DB_NAME=timemanager
DB_USER=tm
DB_PASS=tmpass

JWT_SECRET=CHANGE_ME_SUPER_LONG
JWT_TTL_MINUTES=15

LDAP_URL=ldaps://${AD_HOST}:636
LDAP_BASE_DN=DC=primebank,DC=local
LDAP_BIND_DN=CN=svc_ldap_reader,OU=Utilisateurs,DC=primebank,DC=local
LDAP_BIND_PASSWORD=CHANGE_ME
LDAP_USER_FILTER=(sAMAccountName={{username}})

MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_FROM=no-reply@primebank.local
EOF

echo "[3] compose.yml"
cat > "$ROOT/compose.yml" <<'EOF'
services:
  db:
    image: mariadb:11
    environment:
      MARIADB_DATABASE: timemanager
      MARIADB_USER: tm
      MARIADB_PASSWORD: tmpass
      MARIADB_ROOT_PASSWORD: rootpass
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mariadb-admin", "ping", "-h", "localhost", "-prootpass"]
      interval: 10s
      timeout: 5s
      retries: 15

  mailpit:
    image: axllent/mailpit:latest
    environment:
      MP_SMTP_BIND_ADDR: 0.0.0.0:1025
    ports:
      - "8025:8025"

  backend:
    build: ./backend
    env_file: .env
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    environment:
      VITE_API_BASE_URL: /api
    depends_on:
      - backend

  reverse-proxy:
    image: nginx:alpine
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    ports:
      - "8080:80"
    depends_on:
      - frontend
      - backend

volumes:
  db_data:
EOF

echo "[4] Nginx conf"
cat > "$ROOT/nginx/conf.d/app.conf" <<'EOF'
server {
  listen 80;

  location /api/ {
    proxy_pass http://backend:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location / {
    proxy_pass http://frontend:5173;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
EOF

echo "[5] Backend (Node/Express + LDAP + JWT)"
cat > "$ROOT/backend/Dockerfile" <<'EOF'
# syntax=docker/dockerfile:1.7
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm","start"]
EOF

cat > "$ROOT/backend/package.json" <<'EOF'
{
  "name": "timemanager-backend",
  "version": "1.0.0",
  "main": "src/index.js",
  "type": "commonjs",
  "scripts": { "start": "node src/index.js" },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "ldapjs": "^3.0.7"
  }
}
EOF

cat > "$ROOT/backend/src/index.js" <<'EOF'
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const ldap = require("ldapjs");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username/password required" });

  const LDAP_URL = process.env.LDAP_URL;
  const BASE_DN = process.env.LDAP_BASE_DN;
  const BIND_DN = process.env.LDAP_BIND_DN;
  const BIND_PW = process.env.LDAP_BIND_PASSWORD;
  const FILTER = (process.env.LDAP_USER_FILTER || "(sAMAccountName={{username}})").replace("{{username}}", username);

  const client = ldap.createClient({ url: LDAP_URL, tlsOptions: { rejectUnauthorized: true } });

  const bind = (dn, pw) => new Promise((resolve, reject) =>
    client.bind(dn, pw, (err) => (err ? reject(err) : resolve()))
  );

  const searchUser = () => new Promise((resolve, reject) => {
    client.search(BASE_DN, { scope: "sub", filter: FILTER, attributes: ["dn", "memberOf"] }, (err, r) => {
      if (err) return reject(err);
      let entry;
      r.on("searchEntry", (e) => entry = e.object);
      r.on("error", reject);
      r.on("end", () => entry ? resolve(entry) : reject(new Error("User not found")));
    });
  });

  try {
    await bind(BIND_DN, BIND_PW);
    const u = await searchUser();
    await bind(u.dn, password);

    const memberOf = Array.isArray(u.memberOf) ? u.memberOf : (u.memberOf ? [u.memberOf] : []);
    const has = (cn) => memberOf.some(g => g.toLowerCase().includes(`cn=${cn.toLowerCase()},`));

    const roles = [];
    if (has("GG_TM_Admins")) roles.push("ROLE_ADMIN");
    if (has("GG_TM_Managers")) roles.push("ROLE_MANAGER");
    if (has("GG_TM_Employees")) roles.push("ROLE_EMPLOYEE");
    if (!roles.length) return res.status(403).json({ error: "No allowed AD group" });

    const ttl = `${parseInt(process.env.JWT_TTL_MINUTES || "15", 10)}m`;
    const token = jwt.sign({ sub: username, roles }, process.env.JWT_SECRET, { expiresIn: ttl });
    res.json({ token, roles });
  } catch {
    res.status(401).json({ error: "Invalid credentials" });
  } finally {
    client.unbind(() => {});
  }
});

app.listen(3000, () => console.log("Backend on :3000"));
EOF

echo "[6] Frontend (Vite/React minimal)"
cat > "$ROOT/frontend/Dockerfile" <<'EOF'
# syntax=docker/dockerfile:1.7
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund
COPY . .
EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0","--port","5173"]
EOF

cat > "$ROOT/frontend/package.json" <<'EOF'
{
  "name": "timemanager-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^7.2.5"
  }
}
EOF

cat > "$ROOT/frontend/index.html" <<'EOF'
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>TimeManager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat > "$ROOT/frontend/vite.config.js" <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, allowedHosts: true }
});
EOF

cat > "$ROOT/frontend/src/main.jsx" <<'EOF'
import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>TimeManager</h1>
      <p>Frontend OK.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
EOF

echo "✅ Génération OK"
echo "Ensuite: cd $ROOT && docker compose up -d --build"
echo "Pense à éditer $ROOT/.env (JWT_SECRET + LDAP_BIND_PASSWORD)"

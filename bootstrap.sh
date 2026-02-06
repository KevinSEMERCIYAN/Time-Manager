#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/timemanager"

# Bootstrap files for current app layout. This script overwrites generated files.

echo "[1] Arborescence"
mkdir -p "$ROOT"/{nginx/conf.d,backend,frontend}

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
      DATABASE_URL: mysql://timemanager:timemanager@db:3306/timemanager
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
      AD_DERIVE_TEAM: "false"

      JWT_SECRET: change-me
      JWT_TTL_MINUTES: "15"
      REFRESH_TTL_DAYS: "14"
      COOKIE_SECURE: "false"

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

echo "[4] Backend/Frontend"
echo "Les sources backend/frontend sont déjà présentes dans le repo."
echo "Après build, exécuter les migrations Prisma :"
echo "  docker compose exec backend npx prisma migrate deploy"

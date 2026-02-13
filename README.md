# ⏱️ TimeManager

Application de pointage et gestion d'equipes, avec authentification Active Directory (LDAPS), backend Node/Express, frontend React, et deploiement Docker.

---

## 1. Architecture

- Active Directory : identite + groupes (source des roles)
- Backend API : logique metier, RBAC, audit, persistance
- Frontend : interface utilisateur (pas de regles critiques en local)

### Services Docker
- `db` : MariaDB
- `backend` : API Express + Prisma
- `frontend` : React + Vite
- `reverse-proxy` : Nginx
- `mailpit` : SMTP de test (dev)

---

## 2. Prerequis

- Docker
- Docker Compose plugin (`docker compose`)
- Acces internet (pull images)

Verification :

```bash
docker --version
docker compose version
```

---

## 3. Installation

### 3.1 Cloner le projet

```bash
git clone <URL_DU_DEPOT>
cd timemanager
```

### 3.2 Installation automatique (recommandee)

Le script `bootstrap.sh` :
- verifie les prerequis
- prepare `.env` minimal si absent
- build et demarre la stack
- applique `prisma migrate deploy`
- supporte dev et prod avec des projets Docker separes

```bash
chmod +x bootstrap.sh
./bootstrap.sh --dev
```

Options utiles :

```bash
./bootstrap.sh --prod
./bootstrap.sh --dev --no-build
./bootstrap.sh --prod --no-migrate
./bootstrap.sh --help
```

### 3.3 Installation manuelle

```bash
# dev
docker compose -p timemanager-dev -f compose.yml up -d --build

docker compose -p timemanager-dev -f compose.yml exec backend npx prisma migrate deploy

# prod
docker compose -p timemanager-prod -f compose.prod.yml up -d --build

docker compose -p timemanager-prod -f compose.prod.yml exec backend npx prisma migrate deploy
```

---

## 4. Acces aux services

### Dev
- Application : `http://localhost:8080`
- Mailpit : `http://localhost:8025`

### Prod
- HTTP : `http://localhost`
- HTTPS : `https://localhost`

Si vous utilisez un nom DNS interne (ex. `timemanager.primebank.local`), mappez-le vers l'IP du serveur.

---

## 5. Configuration

### 5.1 Fichiers
- `.env`
- `compose.yml`
- `compose.prod.yml`
- `nginx/conf.d/app.conf`
- `nginx/conf.d/app.prod.conf.disabled`

### 5.2 Variables importantes (`.env`)

```env
# Secrets
JWT_SECRET=CHANGE_ME
LDAP_BIND_PASSWORD=CHANGE_ME

# LDAP
LDAP_URL=ldaps://AD-01.primebank.local:636
LDAP_BASE_DN=DC=primebank,DC=local
LDAP_BIND_DN=svc_ldap_reader@primebank.local
LDAP_USER_FILTER=(sAMAccountName={{username}})
LDAP_TLS_SERVERNAME=AD-01.primebank.local
LDAP_DIRECT_BIND=true
LDAP_UPN_DOMAIN=primebank.local
AD_SYNC_ENABLED=true
AD_SYNC_INTERVAL_MINUTES=2

# DB
MARIADB_ROOT_PASSWORD=CHANGE_ME
MARIADB_PASSWORD=CHANGE_ME
```

### 5.3 Important
- Changer `JWT_SECRET`
- Changer `LDAP_BIND_PASSWORD`
- Ne jamais commiter `.env`

---

## 6. Nginx / Reverse proxy

### Dev (`compose.yml`)
- monte `./nginx/conf.d` dans Nginx
- expose `8080:80`
- routes :
  - `/` -> frontend
  - `/api/` -> backend

### Prod (`compose.prod.yml`)
- monte `./nginx/conf.d/app.prod.conf.disabled` vers `/etc/nginx/conf.d/default.conf`
- monte `./certs`
- exige :
  - `certs/timemanager.crt`
  - `certs/timemanager.key`

---

## 7. Prisma / Base de donnees

Commande recommandee :

```bash
npx prisma migrate deploy
```

Commande de secours (dev/test) :

```bash
npx prisma db push --schema /app/prisma/schema.prisma
```

---

## 8. Fonctionnel

### 8.1 Roles
- `ADMIN` : global
- `MANAGER` : perimetre/equipe
- `EMPLOYEE` : personnel

### 8.2 Provisioning
Un compte AD doit etre provisionne (`isProvisioned=true`) avant connexion, sauf admin.

### 8.3 Sync AD
- automatique (intervalle configurable)
- manuelle :

```bash
curl -X POST http://localhost:8080/api/admin/sync-ad
```

### 8.4 RGPD
- `GET /gdpr/export`
- `POST /gdpr/anonymize`

---

## 9. Routes UI

- `/`
- `/sign-in`
- `/dashboard`
- `/profile`
- `/members`
- `/members/:id`
- `/members/create`
- `/teams`
- `/teams/createteam`

---

## 10. Gestion des conteneurs

### Dev

```bash
docker compose -p timemanager-dev -f compose.yml ps
docker compose -p timemanager-dev -f compose.yml logs -f
docker compose -p timemanager-dev -f compose.yml down
docker compose -p timemanager-dev -f compose.yml down -v
```

### Prod

```bash
docker compose -p timemanager-prod -f compose.prod.yml ps
docker compose -p timemanager-prod -f compose.prod.yml logs -f
docker compose -p timemanager-prod -f compose.prod.yml down
docker compose -p timemanager-prod -f compose.prod.yml down -v
```

---

## 11. Tests et CI

### Backend

```bash
cd backend
npm ci
npm run test
npm run test:coverage
```

### CI
- Workflow : `.github/workflows/ci.yml`
- Le pipeline execute :
  - `cd backend && npm ci`
  - `cd backend && npm run test:coverage`

---

## 12. Documentation

- `docs_functionnelle_technique.md`
- `docs/a11y.md`
- `docs/adr/0001-architecture.md`
- `docs/adr/0002-api-design.md`
- `docs/adr/0003-reverse-proxy.md`
- `docs/adr/0004-tech-stack.md`

---

## 13. Bonnes pratiques Git

A ignorer dans `.gitignore` :
- `.env`
- `node_modules/`
- `dist/`
- `*.log`
- volumes DB locaux

---

## 14. Licence

A definir.

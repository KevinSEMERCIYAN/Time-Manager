# TimeManager — Documentation Fonctionnelle & Technique

> Pointage, gestion des equipes et des collaborateurs, avec authentification Active Directory (LDAPS) et logique metier cote backend (RBAC + audit + DB).

---

## Sommaire
1. [Objectif](#1-objectif)
2. [Roles et permissions](#2-roles-et-permissions)
3. [Authentification Active Directory](#3-authentification-active-directory)
4. [Provisioning utilisateur](#4-provisioning-utilisateur)
5. [Synchronisation AD](#5-synchronisation-ad)
6. [Pointage](#6-pointage)
7. [Equipes](#7-equipes)
8. [Gestion des employes](#8-gestion-des-employes)
9. [UI et routes](#9-ui-et-routes)
10. [Stack technique](#10-stack-technique)
11. [Architecture](#11-architecture)
12. [Modele de donnees](#12-modele-de-donnees)
13. [API](#13-api)
14. [Configuration](#14-configuration)
15. [Migrations](#15-migrations)
16. [Flux principaux](#16-flux-principaux)
17. [CI et qualite](#17-ci-et-qualite)

---

## 1. Objectif
TimeManager permet :
- le pointage (clock-in / clock-out)
- la gestion des equipes
- la gestion des collaborateurs
- avec authentification AD et gestion metier cote backend (RBAC + audit + DB)

---

## 2. Roles et permissions

| Role | Perimetre | Droits cles |
|---|---|---|
| ADMIN | Global | Acces complet, creation d'equipes, provisioning utilisateurs, suppression |
| MANAGER | Perimetre / equipe | Gestion des employes de son perimetre, gestion des equipes associees |
| EMPLOYEE | Personnel | Pointage + consultation personnelles |

---

## 3. Authentification Active Directory
- Authentification via Active Directory (LDAPS)
- Les roles applicatifs sont mappes aux groupes AD
- L'application ne gere pas les mots de passe : le changement se fait cote Windows/AD
- Le backend emet une session basee cookie/JWT pour autoriser l'acces aux APIs

### Regle d'acces importante
- Un utilisateur AD ne peut pas se connecter tant qu'il n'est pas provisionne dans l'application
- Exception : les ADMIN peuvent se connecter meme si non provisionnes

---

## 4. Provisioning utilisateur
Objectif : creer un profil applicatif (contrat + horaires + equipe) a partir d'un compte AD.

- Un admin/manager cree un profil via "Creer un utilisateur"
- Selection dans la liste des comptes AD synchronises
- Saisie du contrat et des horaires
- Option : ajout a une equipe
- Apres provisioning : `isProvisioned = true` -> l'utilisateur peut se connecter

---

## 5. Synchronisation AD
### Synchronisation automatique
- Toutes les 2 minutes

### Synchronisation manuelle
- Declenchee via endpoint admin

### Regles de coherence
- Comptes supprimes de l'AD -> desactives localement
- Comptes supprimes localement -> restent visibles dans "Creer un utilisateur" (restauration)

---

## 6. Pointage
- Clock-in / Clock-out via l'UI
- Les regles horaires sont appliquees cote backend
- Auto clock-out selon la logique metier backend
- Calcul de :
  - retard (late minutes)
  - assiduite (heures realisees vs attendues)

---

## 7. Equipes
- ADMIN cree une equipe avec un manager unique
- Selection des employes via multi-selection
- MANAGER peut gerer les equipes dont il a la responsabilite

---

## 8. Gestion des employes
- Liste des employes provisionnes
- Les managers ne voient pas les comptes manager/admin
- Detail employe : modification horaires + contrat
- Suppression en soft-delete (reste en DB)

---

## 9. UI et routes

| Route | Description |
|---|---|
| `/` | Landing |
| `/sign-in` | Connexion AD |
| `/dashboard` | KPIs + actions |
| `/profile` | Profil |
| `/members` | Liste employes |
| `/members/:id` | Detail employe |
| `/members/create` | Provisioning |
| `/teams` | Liste equipes |
| `/teams/createteam` | Creation equipe |

---

## 10. Stack technique
- Frontend : React + Vite
- Backend : Node.js + Express
- DB : MariaDB
- ORM : Prisma
- Reverse proxy : Nginx
- SMTP test : Mailpit

---

## 11. Architecture

### Responsabilites
- AD : identite + groupes (roles)
- Backend : logique metier + RBAC + audit + persistance (source de verite)
- Frontend : UI (pas de logique metier critique)

### Evolutions structurelles appliquees
- Frontend modularise par pages/composants :
  - `frontend/src/pages/*`
  - `frontend/src/components/modals/*`
  - `frontend/src/components/feedback/*`
  - `frontend/src/layouts/DashboardShell.jsx`
  - `frontend/src/app/config/routes.js`
- Backend modularise :
  - `backend/src/app.js` (creation app)
  - `backend/src/middlewares/index.js` (middlewares HTTP)
  - `backend/src/routes/index.js` (register routes)
  - `backend/src/context/appContext.js` (metier + utilitaires)

### Schema logique (simplifie)
```txt
[Frontend] -- cookie/JWT --> [Backend API] --> [MariaDB]
                      |
                      +--> [Active Directory (LDAPS)]  (login + sync)
```

---

## 12. Modele de donnees

### 12.1 Entites principales
- User
- Team
- TeamMember
- Clock
- AuditLog

### 12.2 Champs cles (User)
- Identite
  - `username`
  - `displayName`
  - `roles`
- RH
  - `contractType` (ex: CDI / CDD / STAGE)
- Horaires
  - `scheduleAmStart`, `scheduleAmEnd`
  - `schedulePmStart`, `schedulePmEnd`
- Statut
  - `isActive`
  - `isDeleted`
  - `isProvisioned`

Reference : `backend/prisma/schema.prisma` (source de verite du modele).

---

## 13. API

Convention : routes protegees par auth (sauf login).
RBAC applique cote backend (ADMIN / MANAGER / EMPLOYEE).

### 13.1 Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### 13.2 Profil et RGPD
- `PUT /me`
- `DELETE /me`
- `GET /gdpr/export`
- `POST /gdpr/anonymize`

### 13.3 Users
- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id` (soft delete)
- `POST /users/:id/provision`

### 13.4 Teams
- `GET /teams`
- `POST /teams`
- `PUT /teams/:id`
- `DELETE /teams/:id`

### 13.5 Clocks
- `POST /clocks`
- `GET /clocks`
- `GET /users/:id/clocks`

### 13.6 Reports
- `GET /reports`
- `GET /reports/team`
- `GET /reports/user`

### 13.7 Admin
- `POST /admin/sync-ad`
- `POST /admin/reset`
- `POST /admin/seed`

---

## 14. Configuration

### 14.1 Fichiers
- `compose.yml`
- `compose.prod.yml`
- `.env`

### 14.2 Variables cles
- LDAP
  - `LDAP_URL`
  - `LDAP_BASE_DN`
  - `LDAP_BIND_DN` / `LDAP_BIND_PASSWORD`
  - `LDAP_USER_FILTER`
  - `LDAP_TLS_SERVERNAME`
  - `LDAP_DIRECT_BIND`
  - `LDAP_UPN_DOMAIN`
- JWT
  - `JWT_SECRET`
  - `JWT_TTL_MINUTES`
- Sync AD
  - `AD_SYNC_ENABLED`
  - `AD_SYNC_INTERVAL_MINUTES`
- DB (MariaDB)
  - `MARIADB_ROOT_PASSWORD`
  - `MARIADB_PASSWORD`
  - `DATABASE_URL`

### 14.3 Reverse proxy
- Dev : `compose.yml` monte `./nginx/conf.d` et expose `8080:80`
- Prod : `compose.prod.yml` monte `./nginx/conf.d/app.prod.conf.disabled` vers `/etc/nginx/conf.d/default.conf`
- Certificats TLS attendus en prod dans `./certs`

---

## 15. Migrations

### 15.1 Commandes recommandees
```bash
# dev
cd backend
npx prisma migrate dev

# prod
npx prisma migrate deploy
```

### 15.2 Recommandation
- En production : privilegier les migrations versionnees
- Eviter `db push` en prod (risque de derive, pas d'historique)
- Garder les migrations dans le repo (tracabilite + rollback)

---

## 16. Flux principaux

### 16.1 Login
1. L'utilisateur saisit ses identifiants AD
2. Backend : bind LDAPS + recuperation groupes AD
3. Mapping groupes -> roles
4. Controle applicatif :
   - ADMIN -> acces autorise meme si non provisionne
   - sinon -> acces seulement si `isProvisioned = true` et `isActive = true`
5. Retour session + profil user

### 16.2 Provisioning
1. Admin/Manager ouvre "Creer un utilisateur"
2. Selectionne un utilisateur synchronise
3. Renseigne contrat + horaires + equipe optionnelle
4. Backend : `POST /users/:id/provision`
5. Mise a jour : `isProvisioned = true`, `isActive = true`

### 16.3 Sync AD
1. Job periodique ou `POST /admin/sync-ad`
2. Bind LDAP service account
3. Recuperation comptes cibles
4. Upsert en DB
5. Comptes disparus AD -> desactivation locale

---

## 17. CI et qualite
- Workflow : `.github/workflows/ci.yml`
- Job principal :
  - `cd backend && npm ci`
  - `cd backend && npm run test:coverage`
- Ajustement applique pour stabilite coverage :
  - `backend/jest.config.js` utilise `coverageReporters: ["text", "lcov"]`

---

## Annexes
- ADRs :
  - `docs/adr/0001-architecture.md`
  - `docs/adr/0002-api-design.md`
  - `docs/adr/0003-reverse-proxy.md`
  - `docs/adr/0004-tech-stack.md`
- Accessibilite : `docs/a11y.md`

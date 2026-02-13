# TimeManager — Documentation Fonctionnelle & Technique

## 1. Fonctionnelle

### 1.1 Objectif
TimeManager permet le pointage, le suivi des équipes et la gestion des collaborateurs, tout en s’intégrant à l’Active Directory pour l’authentification et les rôles.

### 1.2 Rôles
- **ADMIN** : accès complet (provisioning utilisateurs, gestion équipes, suppression).
- **MANAGER** : gestion des employés de son périmètre.
- **EMPLOYEE** : pointage et consultation personnelles.

### 1.3 Authentification
- Auth via **Active Directory (LDAPS)**.
- Rôles dérivés des groupes AD.
- Un compte AD **ne peut pas se connecter** tant qu’il n’est pas **provisionné** dans l’app.
- Exception : **ADMIN** peut se connecter même si non provisionné.

### 1.4 Provisioning utilisateur
- Page “Créer un utilisateur”.
- Sélection d’un compte AD synchronisé.
- Nom/prénom pré-remplis (lecture seule).
- Saisie du **contrat** + **horaires**.
- Option d’ajout direct à une équipe.
- Après provisioning, connexion AD autorisée.

### 1.5 Synchronisation AD
- Automatique toutes les 2 minutes.
- Manuelle via endpoint admin.
- Comptes AD supprimés/désactivés → désactivés localement.
- Comptes supprimés localement restent visibles pour restauration.

### 1.6 Pointage
- **Clock-in/Clock-out** via UI.
- Règles horaires appliquées côté backend.
- Auto clock-out en fin de journée.
- Calcul de retard et d’assiduité.

### 1.7 Équipes
- Admin choisit un **manager unique** par équipe.
- Multi‑sélection d’employés via liste déroulante.
- Manager gère ses équipes.

### 1.8 Gestion employés
- Liste des employés provisionnés.
- En session manager : managers/admin cachés.
- Détail employé : contrat + horaires modifiables.
- Suppression = **soft delete** (local uniquement).

### 1.9 Pages & Routes
- `/` : landing
- `/sign-in` : login AD
- `/dashboard` : KPIs + actions
- `/profile` : profil
- `/dashboard/members` : liste employés
- `/dashboard/members/:id` : détail employé
- `/dashboard/members/create` : provisioning
- `/dashboard/teams` : liste équipes
- `/dashboard/teams/createteam` : création équipe

---

## 2. Technique

### 2.1 Stack
- **Frontend** : React + Vite
- **Backend** : Node.js + Express
- **ORM** : Prisma
- **DB** : MariaDB
- **Reverse‑proxy** : Nginx
- **SMTP test** : Mailpit

### 2.2 Architecture
- **AD** = identité + rôles
- **Backend** = vérité métier + RBAC + audit
- **Frontend** = UI, pas de logique métier critique

### 2.3 Schéma DB (Prisma)
Modèle principal : `User`, `Team`, `TeamMember`, `Clock`, `AuditLog`

Champs clés `User` :
- `username`, `displayName`, `roles`
- `contractType`
- Horaires : `scheduleAmStart`, `scheduleAmEnd`, `schedulePmStart`, `schedulePmEnd`
- `isActive`, `isDeleted`, `isProvisioned`

### 2.4 API
- **Auth**
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`

- **Users**
  - `GET /users`
  - `GET /users/:id`
  - `PUT /users/:id`
  - `DELETE /users/:id` (soft delete)
  - `POST /users/:id/provision`

- **Teams**
  - `GET /teams`
  - `POST /teams`
  - `PUT /teams/:id`
  - `DELETE /teams/:id`

- **Clocks**
  - `POST /clocks`
  - `GET /clocks`
  - `GET /users/:id/clocks`

- **Reports**
  - `GET /reports`

- **Admin**
  - `POST /admin/sync-ad`
  - `POST /admin/reset`
  - `POST /admin/seed`

### 2.5 Configuration
Fichiers :
- `compose.yml`
- `.env`

Variables clés :
- `LDAP_*` (bind, base DN, filtres)
- `JWT_SECRET`, `JWT_TTL_MINUTES`
- `AD_SYNC_ENABLED`, `AD_SYNC_INTERVAL_MINUTES`

### 2.6 Migrations
```bash
docker compose exec backend npx prisma db push --schema /app/prisma/schema.prisma
```

---

## 3. Flux (résumé)

### 3.1 Login
1. Utilisateur saisit login AD
2. Backend bind LDAPS → récupère groupes
3. Mapping rôles
4. Vérifie `isProvisioned` (sauf admin)
5. Cookie httpOnly renvoyé

### 3.2 Provisioning
1. Admin/Manager sélectionne user AD synchronisé
2. Saisit contrat + horaires
3. `POST /users/:id/provision`
4. `isProvisioned=true`

### 3.3 Sync AD
1. Service account LDAP
2. Lecture OU=Utilisateurs
3. Upsert users
4. Désactivation des absents


---

## 4. Conformité / Livraison

### 4.1 GDPR
- Export : `GET /gdpr/export`
- Anonymisation : `POST /gdpr/anonymize`

### 4.2 CI/CD
- Workflow GitHub Actions : `.github/workflows/ci.yml`
- Tests backend + coverage

### 4.3 ADRs
- `docs/adr/0001-architecture.md`
- `docs/adr/0002-api-design.md`
- `docs/adr/0003-reverse-proxy.md`
- `docs/adr/0004-tech-stack.md`

### 4.4 Prod
- `compose.prod.yml`
- TLS via `nginx/conf.d/app.prod.conf`
- Certificats dans `./certs`

### 4.5 A11y
- Voir `docs/a11y.md`

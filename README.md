# ⏱️ TimeManager

## Installation complète – Stack Docker

---

## 📌 Présentation

**TimeManager** est une application déployée via une **stack Docker complète**, prête à l’emploi.  
Elle regroupe l’ensemble des services nécessaires au fonctionnement de l’application dans un environnement **isolé** et **reproductible**.

**Principes d’architecture**  
- **Active Directory** = authentification + groupes (source d’identité et de rôles).  
- **Backend API** = vérité métier (users/teams/clocks/reports) + RBAC + audit + DB.  
- **Frontend** = UI qui consomme l’API (pas de règles critiques ni de données métier en `localStorage`).

### 🔧 Services inclus
- **MariaDB** – Base de données  
- **Backend** – API applicative + RBAC + audit + Prisma  
- **Frontend** – Interface utilisateur  
- **Nginx** – Reverse-proxy  
- **Mailpit** – Serveur SMTP de test  

👉 L’installation est **entièrement automatisée** grâce à un script de **bootstrap**.

---

## ⚙️ Prérequis

Avant de commencer, assurez-vous que les éléments suivants sont installés sur la machine :

- Docker  
- Docker Compose (`docker compose` ou `docker-compose`)  
- Accès Internet (pull des images Docker)

### 🔍 Vérification
```bash
docker --version
docker compose version
```

📥 Récupération du projet

git clone <URL_DU_DEPOT>
cd timemanager

🚀 Installation automatique (recommandée)

Le script bootstrap.sh effectue automatiquement :

    Création de l’arborescence du projet

    Génération du fichier .env

    Génération du fichier compose.yml

    Génération de la configuration Nginx

    Build et démarrage des conteneurs Docker

▶️ Lancer l’installation

chmod +x bootstrap.sh
./bootstrap.sh

🌐 Accès aux services

    Application TimeManager :
    http://timemanager.primebank.local:8080/

    Interface Mailpit (emails) :
    http://timemanager.primebank.local:8025/

📁 Arborescence du projet

.
├── backend/
│   ├── Dockerfile
│   └── src/
├── frontend/
│   ├── Dockerfile
│   └── src/
├── nginx/
│   └── conf.d/
│       └── app.conf
├── .env
├── compose.yml
├── bootstrap.sh
└── README.md

🔐 Configuration (.env)

DATABASE_URL=mysql://timemanager:timemanager@db:3306/timemanager
SHADOW_DATABASE_URL=mysql://root:root@db:3306/timemanager_shadow
DB_HOST=db
DB_PORT=3306
DB_NAME=timemanager
DB_USER=timemanager
DB_PASS=timemanager
DB_ROOT_PASSWORD=rootpass

JWT_SECRET=CHANGE_ME
JWT_TTL_MINUTES=15
REFRESH_TTL_DAYS=14
COOKIE_SECURE=false

LDAP_URL=ldaps://AD-01.primebank.local:636
LDAP_BASE_DN=DC=primebank,DC=local
LDAP_BIND_DN=CN=svc_ldap_reader,OU=Utilisateurs,DC=primebank,DC=local
LDAP_BIND_PASSWORD=CHANGE_ME
LDAP_USER_FILTER=(sAMAccountName={{username}})
AD_DERIVE_TEAM=false
LDAP_USERS_BASE_DN=OU=Utilisateurs,DC=primebank,DC=local
LDAP_USERS_FILTER=(&(objectClass=user)(!(objectClass=computer)))
LDAP_SYNC_EXCLUDE_USERS=svc_timemanager,svc_ldap_reader
AD_SYNC_ENABLED=true
AD_SYNC_INTERVAL_MINUTES=2

MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_FROM=no-reply@primebank.local

⚠️ Important

    Modifier JWT_SECRET

    Modifier LDAP_BIND_PASSWORD si LDAP activé

    Ne jamais commiter le fichier .env

▶️ Démarrage manuel

docker compose up -d --build

📦 Migrations Prisma (obligatoire au 1er lancement)

```bash
docker compose exec backend npx prisma migrate deploy
```

Si `migrate dev` échoue (permissions), utilisez `db push` ou configurez `SHADOW_DATABASE_URL` :

```bash
docker compose exec backend npx prisma db push --schema /app/prisma/schema.prisma
```

🔁 Synchronisation AD → MariaDB

- Automatique toutes les 2 minutes (configurable) via `AD_SYNC_ENABLED` et `AD_SYNC_INTERVAL_MINUTES`.
- Exécution manuelle (admin) :

```bash
curl -X POST http://localhost:8080/api/admin/sync-ad
```

🧹 Suppression côté application

- Quand un admin supprime un utilisateur, il est **désactivé uniquement dans MariaDB** (`isDeleted=true`, `isActive=false`).
- La synchronisation AD **ne réactive pas** les comptes supprimés localement.

✅ Provisioning (profil applicatif)

- Les comptes AD **ne peuvent pas se connecter** tant que leur profil applicatif n’est pas créé.
- Un admin/manager doit **provisionner** l’utilisateur via l’interface “Créer un utilisateur”.

🧰 Gestion des conteneurs

docker compose ps
docker compose logs -f
docker compose down
docker compose down -v

🔁 Reverse-proxy Nginx

    / → Frontend

    /api/ → Backend

/api/...

✉️ Emails – Mailpit

    SMTP : mailpit:1025

    Interface web : http://localhost:8025

🔐 LDAP (optionnel)

    Vérifier la résolution DNS

    Vérifier l’accès au port 636

    Vérifier les certificats LDAPS

    Vérifier le filtre LDAP

🛠️ Dépannage rapide

docker compose logs backend
docker compose down -v
docker compose up -d --build

📌 Bonnes pratiques Git

.env
db-data/
node_modules/
dist/
*.log

🏁 Environnement cible

Développement / Recette
Non exposé directement à Internet

Production :

    HTTPS

    Gestion des secrets

    Build frontend statique

📄 Licence

À définir.

---

## ✅ Compléments techniques

### Champs utilisateur
- `firstName`, `lastName`, `email`, `phone`

### Champs équipe
- `description`

### GDPR
- `GET /gdpr/export`
- `POST /gdpr/anonymize`

### Tests
```bash
cd backend
npm run test
npm run test:coverage
```

### CI/CD
- `.github/workflows/ci.yml`

### ADRs
- `docs/adr/0001-architecture.md`
- `docs/adr/0002-api-design.md`
- `docs/adr/0003-reverse-proxy.md`
- `docs/adr/0004-tech-stack.md`

### Prod
- `compose.prod.yml`
- `nginx/conf.d/app.prod.conf`
- Certificats TLS dans `./certs`

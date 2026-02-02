# ⏱️ TimeManager

## Installation complète – Stack Docker

---

## 📌 Présentation

**TimeManager** est une application déployée via une **stack Docker complète**, prête à l’emploi.  
Elle regroupe l’ensemble des services nécessaires au fonctionnement de l’application dans un environnement **isolé** et **reproductible**.

### 🔧 Services inclus
- **MariaDB** – Base de données  
- **Backend** – API applicative  
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
    http://localhost:8080](http://timemanager.primebank.local:8080/

    Interface Mailpit (emails) :
    http://localhost:8025](http://timemanager.primebank.local:8025/

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

DB_HOST=db
DB_PORT=3306
DB_NAME=timemanager
DB_USER=tm
DB_PASS=tmpass
DB_ROOT_PASSWORD=rootpass

JWT_SECRET=CHANGE_ME
JWT_TTL_MINUTES=15

LDAP_URL=ldaps://AD-01.primebank.local:636
LDAP_BASE_DN=DC=primebank,DC=local
LDAP_BIND_DN=CN=svc_ldap_reader,OU=Utilisateurs,DC=primebank,DC=local
LDAP_BIND_PASSWORD=CHANGE_ME
LDAP_USER_FILTER=(sAMAccountName={{username}})

MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_FROM=no-reply@primebank.local

⚠️ Important

    Modifier JWT_SECRET

    Modifier LDAP_BIND_PASSWORD si LDAP activé

    Ne jamais commiter le fichier .env

▶️ Démarrage manuel

docker compose up -d --build

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

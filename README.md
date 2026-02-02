TIME MANAGER – INSTALLATION COMPLÈTE (DOCKER)

PRÉSENTATION

Ce projet permet de déployer l’application TimeManager via une stack Docker complète comprenant :

MariaDB (base de données)

Backend (API)

Frontend (interface utilisateur)

Nginx (reverse-proxy)

Mailpit (serveur SMTP de test)

L’installation est automatisée grâce à un script bootstrap.

PRÉREQUIS

Avant de commencer, vérifier que les éléments suivants sont installés :

Docker

Docker Compose (docker compose ou docker-compose)

Accès Internet

Vérification :

docker --version
docker compose version

RÉCUPÉRATION DU PROJET

Cloner le dépôt et se placer dans le dossier :

git clone <URL_DU_DEPOT>
cd timemanager

INSTALLATION AUTOMATIQUE (RECOMMANDÉE)

Le script bootstrap effectue automatiquement :

Création de l’arborescence

Génération du fichier .env

Génération du fichier compose.yml

Génération de la configuration Nginx

Build et démarrage des conteneurs Docker

Lancer l’installation :

chmod +x bootstrap.sh
./bootstrap.sh

ACCÈS AUX SERVICES

Une fois l’installation terminée :

Application TimeManager
http://localhost:8080

Interface Mailpit (emails)
http://localhost:8025

ARBORESCENCE DU PROJET

Structure du projet :

.
├─ backend/
│ ├─ Dockerfile
│ └─ src/
├─ frontend/
│ ├─ Dockerfile
│ └─ src/
├─ nginx/
│ └─ conf.d/
│ └─ app.conf
├─ .env
├─ compose.yml
├─ bootstrap.sh
└─ README.txt

CONFIGURATION (.env)

Le fichier .env est généré automatiquement lors du bootstrap.

Variables principales :

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

IMPORTANT :

Modifier JWT_SECRET

Modifier LDAP_BIND_PASSWORD si LDAP utilisé

Ne jamais commiter le fichier .env

DÉMARRAGE MANUEL (SI NÉCESSAIRE)

Si la stack n’est pas démarrée :

docker compose up -d --build

GESTION DES CONTENEURS

État des services :

docker compose ps

Logs :

docker compose logs -f

Arrêt :

docker compose down

Réinitialisation complète (suppression base de données) :

docker compose down -v

REVERSE-PROXY NGINX

Routage :

/ -> Frontend
/api/ -> Backend

Le frontend doit appeler l’API avec :

/api/...

EMAILS (MAILPIT)

Mailpit permet de tester l’envoi d’emails :

SMTP : mailpit:1025
Interface web : http://localhost:8025

Tous les emails envoyés par l’application sont visibles dans l’interface Mailpit.

LDAP (OPTIONNEL)

Si LDAP est activé :

Vérifier la résolution DNS du contrôleur de domaine

Vérifier l’accès réseau au port 636

Vérifier les certificats LDAPS

Vérifier le filtre LDAP

DÉPANNAGE RAPIDE

Backend ne démarre pas :

Vérifier le fichier .env

Vérifier les logs :
docker compose logs backend

Base de données inaccessible :

Vérifier les identifiants DB

Réinitialiser si nécessaire :
docker compose down -v
docker compose up -d --build

Frontend sans API :

Vérifier la route /api

Vérifier la configuration Nginx

BONNES PRATIQUES GIT

À ajouter dans .gitignore :

.env
db-data/
node_modules/
dist/
*.log

ENVIRONNEMENT CIBLE

Environnement local ou recette

Non exposé directement sur Internet

Pour la production : HTTPS, gestion des secrets, build frontend statique

LICENCE

À définir.

# ⏱️ TimeManager  
## Installation complète – Stack Docker

---

## 📌 Présentation

**TimeManager** est une application déployée via une stack Docker complète, prête à l’emploi.  
Elle regroupe l’ensemble des services nécessaires au fonctionnement de l’application dans un environnement isolé et reproductible.

### Services inclus
- **MariaDB** – Base de données
- **Backend** – API applicative
- **Frontend** – Interface utilisateur
- **Nginx** – Reverse-proxy
- **Mailpit** – Serveur SMTP de test

👉 L’installation est **entièrement automatisée** grâce à un script de bootstrap.

---

## ⚙️ Prérequis

Avant de commencer, assurez-vous que les éléments suivants sont installés sur la machine :

- Docker
- Docker Compose  
  (`docker compose` ou `docker-compose`)
- Accès Internet (pull des images Docker)

### Vérification
```bash
docker --version
docker compose version

📥 Récupération du projet
🔐 LDAP (optionnel)

Si l’authentification LDAP est activée :

Vérifier la résolution DNS du contrôleur de domaine

Vérifier l’accès réseau au port 636

Vérifier les certificats LDAPS

Vérifier le filtre LDAP configuré

🛠️ Dépannage rapide
Backend ne démarre pas
docker compose logs backend

Problème de base de données
docker compose down -v
docker compose up -d --build

Frontend sans accès API

Vérifier la route /api

Vérifier la configuration Nginx

📌 Bonnes pratiques Git

À ajouter dans .gitignore :

.env
db-data/
node_modules/
dist/
*.log

🏁 Environnement cible

Développement / Recette

Non exposé directement à Internet

Pour la production : HTTPS, gestion des secrets, build frontend statique

📄 Licence

À définir.


---

Si tu veux, je peux maintenant :
- te faire une **version encore plus “corporate / mairie”**,
- ajouter des **icônes ASCII ou badges GitHub**,
- ou te préparer un **README PROD séparé** (sécurité, HTTPS, AD, sauvegardes).

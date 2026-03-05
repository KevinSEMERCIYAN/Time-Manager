# 🚀 Guide de Démarrage Rapide - Time Manager

## Prérequis

- Docker et Docker Compose installés
- Node.js 18+ (pour développement local)
- Accès à un serveur LDAP/Active Directory (pour l'authentification)

---

## 🐳 Démarrage avec Docker Compose (Recommandé)

### 1. Cloner et configurer

```bash
# Cloner le projet (si pas déjà fait)
git clone <repository-url>
cd Time-Manager

# Vérifier que les fichiers de configuration sont présents
ls backend/.env
ls frontend/.env
```

### 2. Configurer les variables d'environnement

#### Backend (`backend/.env`)
```env
DB_HOST=db
DB_PORT=3306
DB_NAME=timemanager
DB_USER=timemanager
DB_PASS=timemanager

LDAP_URL=ldaps://AD-01.primebank.local:636
LDAP_BASE_DN=DC=primebank,DC=local
LDAP_BIND_DN=svc_ldap_reader@primebank.local
LDAP_BIND_PASSWORD=votre_mot_de_passe_ldap
LDAP_USER_FILTER=(sAMAccountName={{username}})
LDAP_CA_CERT_PATH=/app/certs/primebank-root-ca.cer
LDAP_TLS_SERVERNAME=AD-01.primebank.local
LDAP_DIRECT_BIND=true
LDAP_UPN_DOMAIN=primebank.local

JWT_SECRET=votre_secret_jwt_securise
JWT_TTL_MINUTES=15
```

#### Frontend (`frontend/.env`)
```env
# Pour développement local
VITE_API_URL=http://localhost:3000

# Pour production via nginx (laisser vide)
# VITE_API_URL=
```

### 3. Initialiser la base de données

```bash
# Démarrer uniquement la base de données
docker-compose up -d db

# Attendre que MariaDB soit prêt (environ 10-20 secondes)
docker-compose logs db

# Exécuter le schéma SQL
# Sur Windows PowerShell:
Get-Content backend/sql/schema.sql | docker-compose exec -T db mariadb -u timemanager -ptimemanager timemanager

# Sur Linux/Mac:
docker-compose exec -T db mariadb -u timemanager -ptimemanager timemanager < backend/sql/schema.sql
```

### 4. Démarrer tous les services

```bash
# Construire et démarrer tous les services
docker-compose up --build

# Ou en arrière-plan
docker-compose up -d --build
```

### 5. Accéder à l'application

- **Via Nginx (recommandé)** : http://localhost:8081
- **Frontend direct** : http://localhost:5173
- **Backend API** : http://localhost:3000
- **Mailpit (emails)** : http://localhost:8025

---

## 💻 Développement Local (Sans Docker)

### Backend

```bash
cd backend

# Installer les dépendances
npm install

# Configurer .env (voir ci-dessus)

# Démarrer le serveur
npm start
# ou avec nodemon pour le rechargement automatique
npx nodemon src/index.js
```

Le backend sera accessible sur http://localhost:3000

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Configurer .env avec VITE_API_URL=http://localhost:3000

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur http://localhost:5173

---

## 🔐 Première Connexion

1. Ouvrir http://localhost:8081 (ou http://localhost:5173 en dev local)
2. Se connecter avec vos identifiants LDAP/Active Directory
3. Selon votre rôle, vous serez redirigé vers :
   - **Admin/Manager** → `/manager` (Dashboard Manager)
   - **Employee** → `/employee` (Dashboard Employé)

---

## ✅ Vérification du Fonctionnement

### Test Backend

```bash
# Test de santé
curl http://localhost:3000/health

# Test de la base de données
curl http://localhost:3000/test/db

# Test d'authentification (remplacer USERNAME et PASSWORD)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"USERNAME","password":"PASSWORD"}'
```

### Test Frontend

1. Ouvrir la console du navigateur (F12)
2. Vérifier qu'il n'y a pas d'erreurs
3. Tester le pointage entrée/sortie
4. Vérifier que les données se chargent correctement

---

## 🧪 Tests Recommandés

### Pour les Managers/Admins

1. ✅ Se connecter et accéder au dashboard manager
2. ✅ Voir les KPIs (heures travaillées, retards, etc.)
3. ✅ Pointer entrée/sortie
4. ✅ Créer une équipe custom
5. ✅ Ajouter/retirer des membres d'une équipe
6. ✅ Utiliser les filtres (utilisateur, équipe, période)
7. ✅ Voir les graphiques avec données réelles

### Pour les Employés

1. ✅ Se connecter et accéder au dashboard employé
2. ✅ Pointer entrée/sortie
3. ✅ Voir les heures travaillées
4. ✅ Consulter l'historique des pointages
5. ✅ Changer la période (semaine/mois)

---

## 🐛 Dépannage

### Problème : "Cannot connect to database"

**Solution** :
```bash
# Vérifier que MariaDB est démarré
docker-compose ps db

# Vérifier les logs
docker-compose logs db

# Redémarrer la base de données
docker-compose restart db
```

### Problème : "CORS error" dans le navigateur

**Solution** : Vérifier que `VITE_API_URL` dans `frontend/.env` pointe vers le bon backend

### Problème : "401 Unauthorized"

**Solution** :
- Vérifier que vous êtes bien connecté
- Vérifier que le token JWT est présent dans `localStorage`
- Se reconnecter si nécessaire

### Problème : "LDAP authentication failed"

**Solution** :
- Vérifier les credentials LDAP dans `backend/.env`
- Vérifier que le serveur LDAP est accessible depuis le conteneur
- Vérifier le certificat CA si utilisation de LDAPS

### Problème : Port déjà utilisé

**Solution** :
- Modifier les ports dans `compose.yml`
- Ou arrêter le service qui utilise le port :
  ```bash
  # Windows
  netstat -ano | findstr :8081
  # Linux/Mac
  lsof -i :8081
  ```

---

## 📊 Structure des URLs

### Backend API
- `GET /health` - Santé de l'application
- `GET /test/db` - Test de connexion DB
- `POST /auth/login` - Authentification
- `GET /api/me` - Informations utilisateur
- `GET /api/users` - Liste des utilisateurs
- `GET /api/teams` - Liste des équipes
- `GET /api/time-entries` - Liste des pointages
- `GET /api/reports/summary` - Résumé/KPIs
- ... (voir `backend/ROUTES.md` pour la liste complète)

### Frontend
- `/` - Page de connexion
- `/manager` - Dashboard Manager (nécessite ROLE_MANAGER ou ROLE_ADMIN)
- `/employee` - Dashboard Employé (nécessite ROLE_EMPLOYEE)

---

## 🔧 Commandes Utiles

### Docker Compose

```bash
# Démarrer tous les services
docker-compose up

# Démarrer en arrière-plan
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Voir les logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reconstruire les images
docker-compose build --no-cache

# Redémarrer un service spécifique
docker-compose restart backend
```

### Base de données

```bash
# Se connecter à MariaDB
docker-compose exec db mariadb -u timemanager -ptimemanager timemanager

# Exporter la base de données
docker-compose exec db mysqldump -u timemanager -ptimemanager timemanager > backup.sql

# Importer la base de données
docker-compose exec -T db mariadb -u timemanager -ptimemanager timemanager < backup.sql
```

---

## 📝 Prochaines Étapes

Une fois l'application démarrée :

1. **Créer des utilisateurs** dans la base de données (si pas déjà fait via LDAP)
2. **Créer des équipes** via l'interface manager
3. **Tester le pointage** avec différents utilisateurs
4. **Explorer les rapports** et KPIs
5. **Configurer les horaires** (schedules) pour les utilisateurs
6. **Consulter les audit logs** (admin uniquement)

---

## 📚 Documentation Complémentaire

- `backend/ROUTES.md` - Documentation complète des APIs
- `backend/RAPPORT_BACKEND.md` - Rapport détaillé du backend
- `frontend/INTEGRATION_BACKEND.md` - Documentation de l'intégration frontend
- `FEATURES_COMPLETE.md` - Liste complète des fonctionnalités
- `INTEGRATION_COMPLETE.md` - Résumé de l'intégration

---

**Besoin d'aide ?** Consultez les fichiers de documentation ou les logs Docker pour plus d'informations.

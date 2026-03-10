# Intégration Frontend-Backend - Time Manager

## Vue d'ensemble

Ce document décrit l'intégration du frontend avec le backend Time-Manager. Le frontend a été adapté pour utiliser les APIs REST du backend au lieu de `localStorage`.

## Architecture

### Structure des fichiers

```
frontend/src/
├── api.js              # Service API pour communiquer avec le backend
├── AuthContext.jsx     # Contexte React pour la gestion de l'authentification
├── main.jsx           # Point d'entrée avec routes et protection
└── ManagerDashboard.jsx # Dashboard manager avec données du backend
```

### Flux d'authentification

1. **Connexion** (`LoginPage`)
   - L'utilisateur saisit son username et password
   - Appel à `POST /auth/login` via `authAPI.login()`
   - Le token JWT est stocké dans `localStorage` (`tm_token`)
   - Redirection vers `/manager` si succès

2. **Protection des routes** (`ProtectedRoute`)
   - Vérifie la présence d'un token valide
   - Vérifie les rôles requis (`ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_EMPLOYEE`)
   - Redirige vers `/` si non authentifié

3. **Chargement des données** (`ManagerDashboard`)
   - Au montage du composant, charge :
     - Utilisateurs (`GET /api/users`)
     - Équipes (`GET /api/teams`)
     - Custom Teams (`GET /api/custom-teams`)
     - Time Entries (`GET /api/time-entries`)

## Service API (`api.js`)

Le service API centralise toutes les communications avec le backend :

- **`authAPI`** : Authentification (`login`, `getMe`, `logout`)
- **`usersAPI`** : Gestion des utilisateurs (`getAll`, `getById`, `update`)
- **`teamsAPI`** : Liste des équipes (`getAll`)
- **`timeEntriesAPI`** : Pointages (`getAll`, `create`, `update`, `delete`)
- **`schedulesAPI`** : Horaires (`getByUserId`, `update`)
- **`contractsAPI`** : Contrats (`getByUserId`, `update`)
- **`customTeamsAPI`** : Équipes personnalisées (CRUD complet)

### Configuration

L'URL de l'API est configurée via la variable d'environnement `VITE_API_URL` :

- **Développement local** : `VITE_API_URL=http://localhost:3000`
- **Production (via nginx)** : `VITE_API_URL=` (vide pour URLs relatives)

## Contexte d'authentification (`AuthContext.jsx`)

Le contexte `AuthProvider` gère :

- L'état de l'utilisateur connecté (`user`)
- Le chargement (`loading`)
- Les erreurs (`error`)
- Les fonctions `login()` et `logout()`
- Les helpers de rôles (`isAdmin`, `isManager`, `isEmployee`)

### Utilisation

```jsx
import { useAuth } from './AuthContext';

function MyComponent() {
  const { user, login, logout, isAdmin } = useAuth();
  // ...
}
```

## Protection des routes

Le composant `ProtectedRoute` protège les routes nécessitant une authentification :

```jsx
<Route 
  path="/manager" 
  element={
    <ProtectedRoute requiredRole="ROLE_MANAGER">
      <ManagerDashboard />
    </ProtectedRoute>
  } 
/>
```

## Dashboard Manager

Le `ManagerDashboard` affiche :

- **KPIs** :
  - Heures travaillées (cette semaine)
  - Heures supplémentaires
  - Nombre de retards
  - Utilisateurs actifs

- **Derniers pointages** : Liste des 5 derniers pointages de la semaine

- **Gestion d'équipes** : Liste des équipes (LDAP + custom) avec nombre de membres

## Configuration Nginx

Le reverse-proxy nginx a été configuré pour router :

- `/api/*` → `http://backend:3000/api/*`
- `/auth/*` → `http://backend:3000/auth/*`
- `/health` → `http://backend:3000/health`
- `/` → `http://frontend:5173` (application React)

## Migration depuis localStorage

### Avant

Le frontend stockait toutes les données dans `localStorage` :
- `tm_token` : Token JWT
- `tm_username` : Nom d'utilisateur
- `tm_users` : Liste des utilisateurs (JSON)
- `tm_teams` : Liste des équipes (JSON)
- `tm_time_entries` : Pointages (JSON)
- etc.

### Après

- **Authentification** : Token JWT toujours dans `localStorage` pour la persistance de session
- **Données** : Chargées depuis le backend via les APIs REST
- **Synchronisation** : Les données sont toujours à jour avec le backend

## Variables d'environnement

Créer un fichier `.env` dans `frontend/` :

```env
# URL de l'API backend
# En développement local: http://localhost:3000
# Via nginx reverse-proxy: laisser vide pour URLs relatives
VITE_API_URL=http://localhost:3000
```

## Développement

### Démarrer le frontend seul

```bash
cd frontend
npm install
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

### Démarrer avec Docker Compose

```bash
docker-compose up --build
```

Le frontend sera accessible via nginx sur `http://localhost:8081`

## Endpoints utilisés

### Authentification
- `POST /auth/login` - Connexion
- `GET /api/me` - Informations utilisateur connecté

### Données
- `GET /api/users` - Liste des utilisateurs
- `GET /api/teams` - Liste des équipes
- `GET /api/custom-teams` - Liste des équipes personnalisées
- `GET /api/time-entries` - Liste des pointages (avec filtres)

Voir `backend/ROUTES.md` pour la documentation complète des APIs.

## Prochaines étapes

1. **Implémenter la création/édition de pointages** dans le dashboard
2. **Ajouter la gestion des équipes personnalisées** (création, édition, suppression)
3. **Implémenter les filtres** (par utilisateur, équipe, période)
4. **Ajouter la gestion des horaires** (schedules) et contrats
5. **Créer un dashboard employé** pour les utilisateurs avec `ROLE_EMPLOYEE`
6. **Ajouter la gestion des erreurs** avec retry automatique
7. **Implémenter le refresh automatique** des données

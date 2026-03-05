# Guide de Test - Intégration Frontend-Backend (Ancien)

> ⚠️ **Note** : Ce guide est l'ancien guide de test. Pour un guide complet et à jour, voir `GUIDE_TEST.md` à la racine du projet.

---

# Guide de Test - Intégration Frontend-Backend

## Prérequis

1. Backend démarré et accessible sur `http://localhost:3000`
2. Base de données MariaDB initialisée avec le schéma
3. Frontend avec les dépendances installées

## Tests à effectuer

### 1. Test de l'authentification

#### Test 1.1 : Connexion réussie
1. Ouvrir `http://localhost:5173` (ou via nginx `http://localhost:8081`)
2. Saisir un username et password valides (LDAP)
3. **Résultat attendu** :
   - Redirection vers `/manager`
   - Token JWT stocké dans `localStorage` (`tm_token`)
   - Informations utilisateur affichées dans le dashboard

#### Test 1.2 : Connexion échouée
1. Saisir des identifiants invalides
2. **Résultat attendu** :
   - Message d'erreur affiché
   - Pas de redirection
   - Pas de token stocké

#### Test 1.3 : Vérification du token
1. Après connexion, ouvrir la console du navigateur
2. Vérifier `localStorage.getItem('tm_token')`
3. **Résultat attendu** : Token JWT présent

### 2. Test de la protection des routes

#### Test 2.1 : Accès non authentifié
1. Se déconnecter ou supprimer le token
2. Accéder directement à `http://localhost:5173/manager`
3. **Résultat attendu** : Redirection vers `/`

#### Test 2.2 : Accès avec rôle insuffisant
1. Se connecter avec un compte `ROLE_EMPLOYEE`
2. Essayer d'accéder à `/manager` (nécessite `ROLE_MANAGER`)
3. **Résultat attendu** : Message "Accès refusé"

### 3. Test du chargement des données

#### Test 3.1 : Chargement des utilisateurs
1. Se connecter en tant que manager/admin
2. Ouvrir le dashboard
3. Ouvrir la console du navigateur (Network tab)
4. **Résultat attendu** :
   - Requête `GET /api/users` réussie (200)
   - Liste des utilisateurs chargée

#### Test 3.2 : Chargement des équipes
1. Vérifier la section "Gestion d'Équipes"
2. **Résultat attendu** :
   - Requête `GET /api/teams` réussie
   - Liste des équipes affichée avec nombre de membres

#### Test 3.3 : Chargement des time entries
1. Vérifier la section "Derniers Pointages"
2. **Résultat attendu** :
   - Requête `GET /api/time-entries?from=...&to=...` réussie
   - Pointages de la semaine affichés

#### Test 3.4 : Chargement des custom teams
1. Vérifier la section "Gestion d'Équipes"
2. **Résultat attendu** :
   - Requête `GET /api/custom-teams` réussie
   - Custom teams affichées si elles existent

### 4. Test des KPIs

#### Test 4.1 : Calcul des heures travaillées
1. Vérifier le KPI "Heures Travaillées"
2. **Résultat attendu** :
   - Calcul basé sur les time entries de la semaine
   - Format : "Xh Ym"

#### Test 4.2 : Calcul des heures supplémentaires
1. Vérifier le KPI "Heures Supplémentaires"
2. **Résultat attendu** :
   - Calcul : heures totales - 35h (standard)
   - Affichage correct si > 0

#### Test 4.3 : Comptage des retards
1. Vérifier le KPI "Retards"
2. **Résultat attendu** :
   - Compte les entrées après 9h00
   - Affichage du nombre

#### Test 4.4 : Utilisateurs actifs
1. Vérifier le KPI "Utilisateurs Actifs"
2. **Résultat attendu** :
   - Compte les utilisateurs avec `isActive !== false`
   - Format : "X sur Y total"

### 5. Test de la déconnexion

#### Test 5.1 : Déconnexion
1. Cliquer sur le bouton de déconnexion (icône LogOut)
2. **Résultat attendu** :
   - Token supprimé de `localStorage`
   - Redirection vers `/`
   - État utilisateur réinitialisé

### 6. Test des erreurs réseau

#### Test 6.1 : Backend indisponible
1. Arrêter le backend
2. Essayer de se connecter
3. **Résultat attendu** :
   - Message d'erreur approprié
   - Pas de crash de l'application

#### Test 6.2 : Token expiré
1. Modifier manuellement le token dans `localStorage` pour le rendre invalide
2. Recharger la page
3. **Résultat attendu** :
   - Token supprimé automatiquement
   - Redirection vers `/`

## Tests avec curl (Backend)

### Test de l'API d'authentification
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Test de l'API des utilisateurs (avec token)
```bash
TOKEN="votre_token_jwt"
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### Test de l'API des time entries
```bash
curl -X GET "http://localhost:3000/api/time-entries?from=2024-01-01&to=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

## Checklist de validation

- [ ] Connexion fonctionne avec LDAP
- [ ] Token JWT stocké correctement
- [ ] Protection des routes fonctionne
- [ ] Données chargées depuis le backend
- [ ] KPIs calculés correctement
- [ ] Gestion des erreurs fonctionne
- [ ] Déconnexion fonctionne
- [ ] Interface responsive
- [ ] Pas d'erreurs dans la console
- [ ] Requêtes API réussies (200/201)

## Dépannage

### Problème : "CORS error"
**Solution** : Vérifier que le backend a `cors()` activé dans `index.js`

### Problème : "401 Unauthorized"
**Solution** : Vérifier que le token est bien envoyé dans le header `Authorization: Bearer <token>`

### Problème : "Network error"
**Solution** : 
- Vérifier que le backend est démarré
- Vérifier l'URL dans `.env` (`VITE_API_URL`)
- Vérifier la configuration nginx si utilisé

### Problème : "Données ne se chargent pas"
**Solution** :
- Vérifier les logs du backend
- Vérifier les permissions de l'utilisateur (rôles)
- Vérifier que la base de données contient des données

### Problème : "Token expiré"
**Solution** : Le token expire après 15 minutes par défaut. Se reconnecter.

## Commandes utiles

### Démarrer le backend seul
```bash
cd backend
npm install
npm start
```

### Démarrer le frontend seul
```bash
cd frontend
npm install
npm run dev
```

### Démarrer avec Docker Compose
```bash
docker-compose up --build
```

### Vérifier les logs
```bash
# Backend
docker-compose logs backend

# Frontend
docker-compose logs frontend

# Nginx
docker-compose logs reverse-proxy
```

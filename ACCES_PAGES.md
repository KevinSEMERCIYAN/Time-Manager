# 🚪 Guide d'Accès aux Pages - Time Manager

## 📍 Accès Principal

**URL de base :** `http://localhost:8081`

---

## 🔐 1. Page de Connexion

### Accès
- **URL :** `http://localhost:8081/` ou `http://localhost:8081`
- **Accès :** Public (pas besoin d'être connecté)

### Fonctionnalités
- Formulaire de connexion avec username et password
- Connexion via LDAP/Active Directory
- Redirection automatique selon le rôle après connexion

---

## 👨‍💼 2. Dashboard Manager

### Accès
- **URL :** `http://localhost:8081/manager`
- **Rôle requis :** `ROLE_MANAGER` ou `ROLE_ADMIN`
- **Redirection automatique :** Si tu es Manager et que tu te connectes, tu es automatiquement redirigé ici

### Fonctionnalités disponibles
- ✅ **Pointage Entrée/Sortie** : Boutons pour pointer l'arrivée et le départ
- ✅ **KPIs** : Heures travaillées, heures supplémentaires, retards, utilisateurs actifs
- ✅ **Graphique "Mes Activités"** : Visualisation des heures par jour de la semaine
- ✅ **Filtres** : Filtrer par utilisateur, équipe, période (semaine/mois/personnalisé)
- ✅ **Gestion des Équipes Custom** : Créer, renommer, supprimer des équipes personnalisées
- ✅ **Gestion des Membres d'Équipe** : Ajouter/retirer des membres aux équipes custom
- ✅ **Gestion des Utilisateurs** : Bouton "Gérer les Utilisateurs" dans la barre supérieure
  - Voir la liste des utilisateurs
  - Définir/modifier les horaires d'un utilisateur
  - Définir/modifier le contrat d'un utilisateur
- ✅ **Rapport d'Équipe** : Tableau avec les heures travaillées par utilisateur

### Navigation depuis Manager
- Cliquer sur **"Gérer les Utilisateurs"** → Affiche la section de gestion des utilisateurs
- Cliquer sur **"Déconnexion"** → Retour à la page de connexion

---

## 👷 3. Dashboard Employé

### Accès
- **URL :** `http://localhost:8081/employee`
- **Rôle requis :** `ROLE_EMPLOYEE`
- **Redirection automatique :** Si tu es Employé et que tu te connectes, tu es automatiquement redirigé ici

### Fonctionnalités disponibles
- ✅ **Pointage Entrée/Sortie** : Boutons pour pointer l'arrivée et le départ
- ✅ **KPI "Heures Travaillées"** : Affichage des heures de la période sélectionnée
- ✅ **Historique des Pointages** : Liste de tous tes pointages avec date, heure d'entrée, heure de sortie, durée
- ✅ **Filtre Période** : Choisir entre "Cette semaine" et "Ce mois"
- ✅ **Indicateur de Connexion** : Affiche si tu es en ligne ou hors ligne

### Navigation depuis Employé
- Cliquer sur **"Déconnexion"** → Retour à la page de connexion

---

## 👑 4. Dashboard Admin

### Accès
- **URL :** `http://localhost:8081/admin`
- **Rôle requis :** `ROLE_ADMIN` uniquement
- **Redirection automatique :** Si tu es Admin et que tu te connectes, tu es automatiquement redirigé ici

### Fonctionnalités disponibles

#### Onglet "Vue d'ensemble"
- ✅ **Statistiques Globales** : 3 cartes KPI (Utilisateurs, Pointages, Audit Logs)
- ✅ **Dernières Actions** : Liste des 10 derniers logs d'audit

#### Onglet "Utilisateurs"
- ✅ **Liste des Utilisateurs** : Tableau avec tous les utilisateurs
- ✅ **Recherche** : Barre de recherche pour filtrer les utilisateurs
- ✅ **Modification Utilisateur** : Bouton "Modifier" pour changer displayName, email, etc.
- ✅ **Gestion des Horaires** : Bouton "Horaires" (ou "Définir") pour chaque utilisateur
  - Modal pour définir/modifier les horaires (amStart, amEnd, pmStart, pmEnd)
- ✅ **Gestion des Contrats** : Bouton "Contrat" (ou "Définir") pour chaque utilisateur
  - Modal pour définir/modifier le type de contrat (CDI/CDD) et les dates
- ✅ **Affichage des Horaires/Contrats** : Colonnes dans le tableau montrant les horaires et contrats définis

#### Onglet "Pointages"
- ✅ **Liste de Tous les Pointages** : Tableau avec tous les pointages de tous les utilisateurs
- ✅ **Suppression** : Bouton "Supprimer" pour chaque pointage (avec confirmation)

#### Onglet "Audit Logs"
- ✅ **Consultation des Logs** : Liste de tous les logs d'audit (max 100)
- ✅ **Détails** : Affichage de l'action, utilisateur, type d'entité, date, métadonnées JSON, IP

### Navigation depuis Admin
- Cliquer sur les **onglets** en haut pour changer de section
- Cliquer sur **"Déconnexion"** → Retour à la page de connexion

---

## 🔄 Navigation et Redirections

### Après Connexion
Selon ton rôle, tu es automatiquement redirigé vers :
- **ROLE_ADMIN** → `/admin`
- **ROLE_MANAGER** → `/manager`
- **ROLE_EMPLOYEE** → `/employee`

### Accès Direct aux URLs
Tu peux accéder directement aux URLs si tu es connecté et que tu as le bon rôle :
- `http://localhost:8081/admin` → Dashboard Admin
- `http://localhost:8081/manager` → Dashboard Manager
- `http://localhost:8081/employee` → Dashboard Employé

### Protection des Routes
- Si tu essaies d'accéder à `/admin` sans être Admin → Message "Accès refusé"
- Si tu essaies d'accéder à `/manager` sans être Manager → Message "Accès refusé"
- Si tu n'es pas connecté → Redirection automatique vers `/` (page de connexion)

---

## 🎯 Récapitulatif des Routes

| Route | Rôle Requis | Description |
|-------|-------------|-------------|
| `/` | Aucun | Page de connexion |
| `/admin` | `ROLE_ADMIN` | Dashboard administrateur |
| `/manager` | `ROLE_MANAGER` ou `ROLE_ADMIN` | Dashboard manager |
| `/employee` | `ROLE_EMPLOYEE` | Dashboard employé |
| `*` (toute autre route) | - | Redirection vers `/` |

---

## 🔍 Comment Tester les Différentes Pages

### Test 1 : Connexion en tant qu'Admin
1. Aller sur `http://localhost:8081/`
2. Se connecter avec un compte Admin
3. **Résultat attendu :** Redirection automatique vers `/admin`
4. Tester les 4 onglets : Vue d'ensemble, Utilisateurs, Pointages, Audit Logs

### Test 2 : Connexion en tant que Manager
1. Aller sur `http://localhost:8081/`
2. Se connecter avec un compte Manager
3. **Résultat attendu :** Redirection automatique vers `/manager`
4. Tester :
   - Pointage entrée/sortie
   - Filtres
   - Gestion des équipes custom
   - Bouton "Gérer les Utilisateurs"

### Test 3 : Connexion en tant qu'Employé
1. Aller sur `http://localhost:8081/`
2. Se connecter avec un compte Employé
3. **Résultat attendu :** Redirection automatique vers `/employee`
4. Tester :
   - Pointage entrée/sortie
   - Historique des pointages
   - Filtre période

### Test 4 : Accès Direct aux URLs
1. Se connecter en tant qu'Admin
2. Essayer d'accéder directement à `http://localhost:8081/manager`
   - **Résultat attendu :** Accès autorisé (Admin peut accéder à Manager)
3. Essayer d'accéder directement à `http://localhost:8081/employee`
   - **Résultat attendu :** Accès autorisé (Admin peut accéder à Employee)

### Test 5 : Protection des Routes
1. Se connecter en tant qu'Employé
2. Essayer d'accéder à `http://localhost:8081/admin`
   - **Résultat attendu :** Message "Accès refusé"
3. Essayer d'accéder à `http://localhost:8081/manager`
   - **Résultat attendu :** Message "Accès refusé"

---

## 💡 Astuces de Navigation

### Depuis le Dashboard Manager
- **Barre supérieure** : Contient les boutons de navigation principaux
  - "Gérer les Utilisateurs" → Affiche/masque la section de gestion
  - "Déconnexion" → Retour à la connexion
- **Filtres** : Cliquer sur "Filtrer" pour afficher le panneau de filtres
- **Équipes Custom** : Section dédiée en bas de la page

### Depuis le Dashboard Admin
- **Onglets** : Cliquer sur les onglets en haut pour changer de section
- **Recherche** : Dans l'onglet "Utilisateurs", utiliser la barre de recherche
- **Actions rapides** : Boutons "Modifier", "Horaires", "Contrat" directement dans le tableau

### Depuis le Dashboard Employé
- **Pointage** : Section principale en haut
- **Historique** : Scroll vers le bas pour voir l'historique
- **Filtre période** : Boutons radio pour changer la période

---

## 🚨 En Cas de Problème

### Problème : "Accès refusé"
- **Solution :** Vérifier que tu es connecté avec le bon rôle
- **Solution :** Se déconnecter et se reconnecter

### Problème : Redirection vers la page de connexion
- **Solution :** Vérifier que le token JWT n'est pas expiré (15 minutes par défaut)
- **Solution :** Se reconnecter

### Problème : Page blanche ou erreur
- **Solution :** Ouvrir la console du navigateur (F12) pour voir les erreurs
- **Solution :** Vérifier que le backend est démarré (`http://localhost:3000/health`)

---

**Bon test ! 🚀**

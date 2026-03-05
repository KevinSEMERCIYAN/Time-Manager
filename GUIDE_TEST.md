# 🧪 Guide de Test - Time Manager

## Prérequis

1. ✅ Backend démarré sur `http://localhost:3000`
2. ✅ Base de données MariaDB initialisée avec le schéma
3. ✅ Frontend démarré sur `http://localhost:5173` (ou via nginx `http://localhost:8081`)
4. ✅ Au moins un utilisateur dans la base de données avec un rôle (Admin, Manager, ou Employee)

---

## 🚀 Démarrage Rapide

### Option 1 : Docker Compose (Recommandé)

```bash
# Démarrer tous les services
docker-compose up --build

# Vérifier que tout est démarré
docker-compose ps
```

Accéder à : http://localhost:8081

### Option 2 : Développement Local

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Accéder à : http://localhost:5173

---

## 🔐 Test 1 : Authentification

### 1.1 Connexion

1. Ouvrir http://localhost:8081 (ou http://localhost:5173)
2. **Résultat attendu** : Page de connexion avec formulaire

### 1.2 Connexion avec identifiants LDAP

1. Saisir un **username** valide (ex: `jdoe`)
2. Saisir le **password** correspondant
3. Cliquer sur "Se connecter"

**Résultat attendu** :
- ✅ Redirection automatique selon le rôle :
  - `ROLE_ADMIN` → `/admin`
  - `ROLE_MANAGER` → `/manager`
  - `ROLE_EMPLOYEE` → `/employee`
- ✅ Token JWT stocké dans `localStorage` (vérifier avec F12 → Application → Local Storage → `tm_token`)

### 1.3 Test de connexion invalide

1. Saisir des identifiants incorrects
2. **Résultat attendu** : Message d'erreur affiché, pas de redirection

---

## 👨‍💼 Test 2 : Dashboard Admin (`/admin`)

### Prérequis
- Se connecter avec un compte ayant le rôle `ROLE_ADMIN`

### 2.1 Vue d'ensemble

1. Accéder à `/admin`
2. **Résultat attendu** :
   - ✅ Onglet "Vue d'ensemble" actif par défaut
   - ✅ 3 cartes KPI : Utilisateurs, Pointages, Audit Logs
   - ✅ Section "Dernières Actions" avec les logs d'audit récents

### 2.2 Gestion des Utilisateurs

1. Cliquer sur l'onglet **"Utilisateurs"**
2. **Résultat attendu** :
   - ✅ Tableau avec colonnes : Utilisateur, Email, Équipe, **Horaires**, **Contrat**, Statut, Actions
   - ✅ Colonne "Horaires" affiche les horaires ou "Non défini"
   - ✅ Colonne "Contrat" affiche le type et dates ou "Non défini"

3. **Test de recherche** :
   - Saisir un nom dans la barre de recherche
   - **Résultat attendu** : Liste filtrée en temps réel

4. **Test modification utilisateur** :
   - Cliquer sur "Modifier" sur un utilisateur
   - **Résultat attendu** : Modal s'ouvre avec formulaire
   - Modifier le `displayName` ou `email`
   - Cliquer sur "Enregistrer"
   - **Résultat attendu** : Modal se ferme, données mises à jour dans le tableau

### 2.3 Gestion des Horaires (Schedules)

1. Dans l'onglet "Utilisateurs", cliquer sur **"Horaires"** (ou "Définir" si pas encore défini)
2. **Résultat attendu** : Modal s'ouvre avec formulaire

3. **Si horaires déjà définis** :
   - ✅ Les champs sont pré-remplis avec les valeurs actuelles
   - Modifier les heures (ex: Matin 08:00 - 12:00)
   - Cliquer sur "Enregistrer"
   - **Résultat attendu** : Modal se ferme, horaires mis à jour dans le tableau

4. **Si horaires non définis** :
   - ✅ Valeurs par défaut : 09:00, 12:00, 13:00, 17:00
   - Remplir les 4 champs (amStart, amEnd, pmStart, pmEnd)
   - Cliquer sur "Enregistrer"
   - **Résultat attendu** : Horaires sauvegardés et affichés dans le tableau

5. **Test validation** :
   - Laisser un champ vide
   - **Résultat attendu** : Le navigateur empêche la soumission (required)

### 2.4 Gestion des Contrats (Contracts)

1. Dans l'onglet "Utilisateurs", cliquer sur **"Contrat"** (ou "Définir")
2. **Résultat attendu** : Modal s'ouvre avec formulaire

3. **Si contrat déjà défini** :
   - ✅ Type, dates pré-remplies
   - Modifier le type (ex: CDD)
   - Ajouter/modifier les dates
   - Cliquer sur "Enregistrer"
   - **Résultat attendu** : Contrat mis à jour dans le tableau

4. **Si contrat non défini** :
   - Sélectionner un type (ex: CDI)
   - Remplir la date de début
   - Cliquer sur "Enregistrer"
   - **Résultat attendu** : Contrat sauvegardé et affiché dans le tableau

5. **Test CDD avec date de fin** :
   - Sélectionner "CDD"
   - Remplir date de début et date de fin
   - **Résultat attendu** : Les deux dates sont sauvegardées

### 2.5 Gestion des Pointages

1. Cliquer sur l'onglet **"Pointages"**
2. **Résultat attendu** :
   - ✅ Liste de tous les pointages avec colonnes : Utilisateur, Date, Entrée, Sortie, Actions
   - ✅ Bouton "Supprimer" sur chaque pointage

3. **Test suppression** :
   - Cliquer sur "Supprimer" sur un pointage
   - Confirmer dans la popup
   - **Résultat attendu** : Pointage supprimé de la liste

### 2.6 Audit Logs

1. Cliquer sur l'onglet **"Audit Logs"**
2. **Résultat attendu** :
   - ✅ Liste des logs d'audit (max 100)
   - ✅ Affichage : Action, Utilisateur, Type d'entité, Date, Métadonnées JSON, IP

3. **Vérifier les logs** :
   - Les actions de création/modification/suppression doivent être enregistrées
   - Les métadonnées doivent contenir les détails de l'action

---

## 👔 Test 3 : Dashboard Manager (`/manager`)

### Prérequis
- Se connecter avec un compte ayant le rôle `ROLE_MANAGER` ou `ROLE_ADMIN`

### 3.1 Pointage Entrée/Sortie

1. Accéder à `/manager`
2. Trouver la section **"Mes Pointages"**
3. **Test pointage entrée** :
   - Cliquer sur "Pointer Entrée"
   - **Résultat attendu** :
     - ✅ Message de succès (vert)
     - ✅ Texte "Pointage en cours depuis HH:MM"
     - ✅ Bouton "Pointer Entrée" désactivé
     - ✅ Bouton "Pointer Sortie" activé

4. **Test pointage sortie** :
   - Cliquer sur "Pointer Sortie"
   - **Résultat attendu** :
     - ✅ Message de succès
     - ✅ Texte "Aucun pointage en cours"
     - ✅ Les deux boutons activés

5. **Test erreur** :
   - Essayer de pointer entrée deux fois
   - **Résultat attendu** : Message d'erreur "Vous avez déjà un pointage en cours"

### 3.2 KPIs

1. Vérifier les 4 cartes KPI en haut :
   - **Heures Travaillées** : Doit afficher les heures de la semaine
   - **Heures Supplémentaires** : Calcul basé sur 35h/semaine
   - **Retards** : Compte les entrées après l'heure de début (utilise les horaires réels si définis)
   - **Utilisateurs Actifs** : Nombre d'utilisateurs actifs

2. **Vérifier que les KPIs se mettent à jour** après un pointage

### 3.3 Filtres

1. Cliquer sur le bouton **"Filtrer"**
2. **Résultat attendu** : Panneau de filtres s'affiche

3. **Test filtre utilisateur** :
   - Sélectionner un utilisateur dans la liste déroulante
   - **Résultat attendu** : Les KPIs et graphiques se mettent à jour

4. **Test filtre équipe** :
   - Sélectionner une équipe dans la barre supérieure
   - **Résultat attendu** : Données filtrées par équipe

5. **Test filtre période** :
   - Sélectionner "Ce mois"
   - **Résultat attendu** : Données du mois en cours
   - Sélectionner "Personnalisé"
   - Remplir dates "Du" et "Au"
   - **Résultat attendu** : Données de la période sélectionnée

6. **Test réinitialisation** :
   - Cliquer sur "Réinitialiser"
   - **Résultat attendu** : Tous les filtres remis à zéro

### 3.4 Graphique "Mes Activités"

1. Vérifier la section **"Mes Activités"**
2. **Résultat attendu** :
   - ✅ Graphique en barres avec 7 barres (Lun-Dim)
   - ✅ Hauteur des barres proportionnelle aux heures travaillées
   - ✅ Total de la période affiché en bas

3. **Test avec données** :
   - Créer des pointages sur différents jours
   - **Résultat attendu** : Les barres se mettent à jour

### 3.5 Gestion des Équipes Custom

1. Trouver la section **"Gestion d'Équipes"**
2. **Test création** :
   - Cliquer sur "Créer une équipe"
   - Saisir un nom (ex: "Équipe Test")
   - Cliquer OK
   - **Résultat attendu** : Équipe ajoutée à la liste

3. **Test renommage** :
   - Cliquer sur le nom d'une équipe custom
   - Modifier le nom dans le prompt
   - **Résultat attendu** : Nom mis à jour

4. **Test gestion membres** :
   - Cliquer sur "Membres" sur une équipe custom
   - **Résultat attendu** : Modal s'ouvre
   - **Section "Membres actuels"** : Liste des membres avec bouton "Retirer"
   - **Section "Ajouter un membre"** : Liste des utilisateurs non-membres avec bouton "Ajouter"
   - Ajouter un membre
   - **Résultat attendu** : Membre ajouté, compteur mis à jour
   - Retirer un membre
   - **Résultat attendu** : Membre retiré, compteur mis à jour

5. **Test suppression** :
   - Cliquer sur "Supprimer" sur une équipe custom
   - Confirmer
   - **Résultat attendu** : Équipe supprimée

### 3.6 Gestion des Utilisateurs (Nouveau)

1. Cliquer sur **"Gérer les Utilisateurs"** dans la barre supérieure
2. **Résultat attendu** : Section "Gestion des Utilisateurs" s'affiche

3. **Test recherche** :
   - Saisir un nom dans la barre de recherche globale (en haut)
   - **Résultat attendu** : Liste filtrée dans la section

4. **Test gestion horaires** :
   - Cliquer sur "Horaires" sur un utilisateur
   - **Résultat attendu** : Modal s'ouvre avec formulaire
   - Modifier les horaires
   - Enregistrer
   - **Résultat attendu** : Horaires sauvegardés

5. **Test gestion contrat** :
   - Cliquer sur "Contrat" sur un utilisateur
   - **Résultat attendu** : Modal s'ouvre
   - Définir/modifier le contrat
   - Enregistrer
   - **Résultat attendu** : Contrat sauvegardé

---

## 👷 Test 4 : Dashboard Employé (`/employee`)

### Prérequis
- Se connecter avec un compte ayant le rôle `ROLE_EMPLOYEE`

### 4.1 Pointage

1. Accéder à `/employee`
2. **Résultat attendu** : Interface simplifiée avec section "Pointage"

3. **Test pointage entrée/sortie** :
   - Même procédure que pour le manager
   - Vérifier que les messages de succès s'affichent

### 4.2 Heures Travaillées

1. Vérifier la carte **"Heures travaillées"**
2. **Résultat attendu** :
   - ✅ Affichage des heures formatées (ex: "35h 20m")
   - ✅ Nombre de pointages entre parenthèses
   - ✅ Période affichée (semaine/mois)

### 4.3 Historique

1. Vérifier la section **"Historique des pointages"**
2. **Résultat attendu** :
   - ✅ Liste des pointages triés du plus récent au plus ancien
   - ✅ Pour chaque pointage :
     - Date complète (ex: "lundi 15 janvier")
     - Heure d'entrée
     - Heure de sortie (ou "En cours")
     - Durée calculée
   - ✅ Pointage en cours mis en évidence (bordure bleue)

3. **Test filtre période** :
   - Changer de "Cette semaine" à "Ce mois"
   - **Résultat attendu** : Liste et heures mises à jour

---

## 🔍 Test 5 : Calcul des Retards avec Horaires Réels

### Prérequis
- Avoir défini des horaires pour au moins un utilisateur (ex: 08:00 au lieu de 09:00)

### 5.1 Test avec horaires personnalisés

1. **Admin** : Définir les horaires d'un utilisateur à 08:00 (au lieu de 09:00)
2. **Créer un pointage** à 08:30 pour cet utilisateur
3. **Créer un pointage** à 08:05 pour cet utilisateur
4. **Manager** : Vérifier le KPI "Retards"
5. **Résultat attendu** :
   - ✅ Le pointage à 08:30 compte comme retard (après 08:00)
   - ✅ Le pointage à 08:05 ne compte PAS comme retard (avant 08:00)

### 5.2 Test sans horaires définis

1. **Utilisateur sans horaires** : Créer un pointage à 09:30
2. **Résultat attendu** : Compte comme retard (fallback sur 09:00)

---

## 🧪 Tests avec Outils (curl, Postman)

### Test API Backend Directement

```bash
# 1. Obtenir un token JWT
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"VOTRE_USERNAME","password":"VOTRE_PASSWORD"}' \
  | jq -r '.token')

# 2. Tester GET /api/users
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"

# 3. Tester GET /api/reports/summary
curl "http://localhost:3000/api/reports/summary?from=2024-01-01&to=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"

# 4. Tester PUT /api/users/:id/schedule
curl -X PUT http://localhost:3000/api/users/1/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amStart": "08:00",
    "amEnd": "12:00",
    "pmStart": "13:00",
    "pmEnd": "17:00"
  }'

# 5. Tester PUT /api/users/:id/contract
curl -X PUT http://localhost:3000/api/users/1/contract \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CDI",
    "startDate": "2024-01-01"
  }'

# 6. Tester GET /api/audit-logs (Admin uniquement)
curl http://localhost:3000/api/audit-logs \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Checklist de Test Complète

### Authentification
- [ ] Connexion réussie avec identifiants valides
- [ ] Redirection selon le rôle (Admin → /admin, Manager → /manager, Employee → /employee)
- [ ] Token JWT stocké dans localStorage
- [ ] Connexion échouée avec identifiants invalides
- [ ] Message d'erreur affiché

### Dashboard Admin
- [ ] Vue d'ensemble avec statistiques
- [ ] Liste des utilisateurs avec colonnes Horaires et Contrat
- [ ] Modification d'un utilisateur
- [ ] Définition/modification des horaires
- [ ] Définition/modification des contrats
- [ ] Suppression d'un pointage
- [ ] Consultation des audit logs

### Dashboard Manager
- [ ] Pointage entrée/sortie fonctionnel
- [ ] KPIs affichés et mis à jour
- [ ] Graphique "Mes Activités" avec données réelles
- [ ] Filtres (utilisateur, équipe, période) fonctionnels
- [ ] Création d'équipe custom
- [ ] Renommage d'équipe custom
- [ ] Gestion des membres d'équipe
- [ ] Suppression d'équipe custom
- [ ] Section "Gestion des Utilisateurs" accessible
- [ ] Gestion horaires/contrats depuis manager dashboard

### Dashboard Employé
- [ ] Pointage entrée/sortie fonctionnel
- [ ] Heures travaillées affichées
- [ ] Historique des pointages avec durée
- [ ] Filtre période (semaine/mois)

### Fonctionnalités Spécifiques
- [ ] Calcul des retards utilise les horaires réels
- [ ] Cache des schedules et contracts fonctionne
- [ ] Messages de succès/erreur s'affichent
- [ ] Indicateur de connexion réseau (online/offline)
- [ ] Bouton de rafraîchissement fonctionne

---

## 🐛 Dépannage

### Problème : "401 Unauthorized"

**Solutions** :
1. Vérifier que le token est présent dans localStorage
2. Vérifier que le token n'est pas expiré (15 minutes par défaut)
3. Se reconnecter

### Problème : "404 Not Found" sur les schedules/contracts

**Solutions** :
1. C'est normal si l'utilisateur n'a pas encore de schedule/contract défini
2. Utiliser "Définir" pour créer le premier

### Problème : Les horaires ne s'affichent pas dans le tableau admin

**Solutions** :
1. Vérifier la console du navigateur (F12) pour les erreurs
2. Vérifier que les schedules sont bien chargés au démarrage
3. Rafraîchir la page

### Problème : Les retards ne sont pas calculés correctement

**Solutions** :
1. Vérifier que les horaires sont bien définis pour l'utilisateur
2. Vérifier que les pointages ont bien une `startTime`
3. Vérifier les logs du backend pour les erreurs SQL

---

## 📊 Tests de Performance

### Test de Charge (Optionnel)

```bash
# Installer Apache Bench (ab)
# Windows: télécharger depuis Apache
# Linux: sudo apt-get install apache2-utils

# Test de charge sur l'endpoint de résumé
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/reports/summary?from=2024-01-01&to=2024-01-31"
```

---

## 🎯 Scénarios de Test Recommandés

### Scénario 1 : Nouvel Utilisateur

1. Admin crée/modifie un utilisateur
2. Admin définit les horaires (08:00 - 17:00)
3. Admin définit le contrat (CDI)
4. Manager vérifie que les horaires/contrat sont visibles
5. Utilisateur pointe entrée à 08:05 (pas de retard)
6. Utilisateur pointe entrée à 08:15 (retard)
7. Vérifier que le KPI "Retards" compte correctement

### Scénario 2 : Gestion d'Équipe

1. Manager crée une équipe custom "Équipe Test"
2. Manager ajoute 3 membres
3. Manager renomme l'équipe
4. Manager retire un membre
5. Manager supprime l'équipe
6. Vérifier que tout est enregistré dans les audit logs

### Scénario 3 : Rapports avec Filtres

1. Manager sélectionne une période personnalisée (mois dernier)
2. Manager filtre par équipe
3. Manager filtre par utilisateur
4. Vérifier que les KPIs et graphiques se mettent à jour
5. Vérifier que les données correspondent aux filtres

---

**Bon test ! 🚀**

Si tu rencontres des problèmes, vérifie :
1. Les logs du backend : `docker-compose logs backend`
2. La console du navigateur : F12 → Console
3. Le réseau : F12 → Network (vérifier les requêtes API)

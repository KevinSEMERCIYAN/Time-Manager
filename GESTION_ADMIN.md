# 📍 Guide - Gestion des Utilisateurs et Équipes dans le Dashboard Admin

## 🎯 Accès au Dashboard Admin

1. Se connecter avec le compte **Admin** :
   - Username : `admin`
   - Password : `admin123`
2. Accéder à : `http://localhost:8081/admin`

---

## 👥 Gestion des Utilisateurs

### Localisation
**Onglet "Utilisateurs"** dans le dashboard Admin

### Fonctionnalités disponibles

#### 1. Liste des Utilisateurs
- Affichage de tous les utilisateurs dans un tableau
- Colonnes affichées :
  - **Utilisateur** : Nom d'affichage et username
  - **Email** : Adresse email
  - **Équipe** : Équipe assignée (teamName)
  - **Horaires** : Horaires de travail (matin/après-midi)
  - **Contrat** : Type de contrat (CDI/CDD) et dates
  - **Statut** : Actif/Inactif
  - **Actions** : Boutons d'action

#### 2. Recherche d'Utilisateurs
- Barre de recherche en haut de la liste
- Recherche par nom d'utilisateur ou nom d'affichage
- Filtrage en temps réel

#### 3. Modification d'Utilisateur
- Cliquer sur le bouton **"Modifier"** sur un utilisateur
- Modal s'ouvre avec formulaire pour modifier :
  - Nom d'affichage (displayName)
  - Email
  - Statut actif/inactif

#### 4. Gestion des Horaires
- Cliquer sur **"Horaires"** (ou "Définir" si pas encore défini)
- Modal pour définir/modifier :
  - Heure de début matin (amStart)
  - Heure de fin matin (amEnd)
  - Heure de début après-midi (pmStart)
  - Heure de fin après-midi (pmEnd)

#### 5. Gestion des Contrats
- Cliquer sur **"Contrat"** (ou "Définir" si pas encore défini)
- Modal pour définir/modifier :
  - Type de contrat (CDI/CDD)
  - Date de début
  - Date de fin (pour CDD)

---

## 👔 Gestion des Équipes

### ⚠️ Actuellement Non Disponible dans Admin

La gestion des équipes n'est **pas encore disponible** dans le dashboard Admin. Elle est disponible uniquement dans le dashboard Manager.

### Où trouver la gestion des équipes ?

#### Dashboard Manager (`/manager`)
1. Se connecter avec un compte Manager (`manager` / `manager123`)
2. Aller sur `http://localhost:8081/manager`
3. Section **"Gestion d'Équipes"** en bas de la page

#### Fonctionnalités disponibles dans Manager :
- ✅ Créer une équipe custom
- ✅ Renommer une équipe custom
- ✅ Supprimer une équipe custom
- ✅ Gérer les membres d'une équipe (ajouter/retirer)

---

## 📊 Autres Onglets du Dashboard Admin

### 1. Vue d'ensemble
- Statistiques globales :
  - Nombre total d'utilisateurs
  - Nombre de pointages
  - Nombre de logs d'audit
- Dernières actions (10 derniers logs d'audit)

### 2. Pointages
- Liste de tous les pointages de tous les utilisateurs
- Possibilité de supprimer un pointage
- Colonnes : Utilisateur, Date, Entrée, Sortie, Actions

### 3. Audit Logs
- Consultation de tous les logs d'audit (max 100)
- Détails : Action, Utilisateur, Type d'entité, Date, Métadonnées JSON, IP

---

## 🔧 Ajout de la Gestion des Équipes dans Admin (À venir)

Pour ajouter la gestion des équipes dans le dashboard Admin, il faudrait :

1. Ajouter un nouvel onglet **"Équipes"** dans le dashboard Admin
2. Intégrer les fonctionnalités de `customTeamsAPI` :
   - Liste des équipes custom
   - Création d'équipe
   - Modification d'équipe
   - Suppression d'équipe
   - Gestion des membres

Souhaites-tu que j'ajoute cette fonctionnalité maintenant ?

---

## 📝 Récapitulatif

| Fonctionnalité | Localisation | Disponible |
|----------------|--------------|------------|
| **Gestion Utilisateurs** | Admin → Onglet "Utilisateurs" | ✅ Oui |
| **Modification Utilisateur** | Admin → Onglet "Utilisateurs" → Bouton "Modifier" | ✅ Oui |
| **Gestion Horaires** | Admin → Onglet "Utilisateurs" → Bouton "Horaires" | ✅ Oui |
| **Gestion Contrats** | Admin → Onglet "Utilisateurs" → Bouton "Contrat" | ✅ Oui |
| **Gestion Équipes Custom** | Manager → Section "Gestion d'Équipes" | ✅ Oui (Manager uniquement) |
| **Gestion Équipes Custom** | Admin | ❌ Non (à ajouter) |

---

**Note** : Si tu veux que j'ajoute la gestion des équipes dans le dashboard Admin, dis-moi et je l'implémenterai ! 🚀

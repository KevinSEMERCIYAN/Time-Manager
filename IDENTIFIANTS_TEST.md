# 🔐 Identifiants de Test - Mode Développement

## ⚠️ Mode Développement Activé

Le mode développement est **activé** dans `compose.yml` avec `DEV_MODE: "true"`.

Cela permet de tester l'application **sans avoir besoin de LDAP/Active Directory**.

---

## 👥 Utilisateurs de Test Disponibles

### 1. Administrateur
```
Username: admin
Password: admin123
Rôle: ROLE_ADMIN
```
**Accès :** Dashboard Admin (`/admin`) avec tous les droits

---

### 2. Manager
```
Username: manager
Password: manager123
Rôle: ROLE_MANAGER
```
**Accès :** Dashboard Manager (`/manager`) avec gestion d'équipe

---

### 3. Employé
```
Username: employee
Password: employee123
Rôle: ROLE_EMPLOYEE
```
**Accès :** Dashboard Employé (`/employee`) avec pointage personnel

---

### 4. Admin + Manager (Double Rôle)
```
Username: adminmanager
Password: adminmanager123
Rôles: ROLE_ADMIN + ROLE_MANAGER
```
**Accès :** Accès à tous les dashboards (Admin, Manager, Employé)

---

## 🚀 Comment Utiliser

### 1. Démarrer l'application
```bash
docker-compose up --build
```

### 2. Accéder à l'application
Ouvrir : `http://localhost:8081`

### 3. Se connecter avec un utilisateur de test
- Saisir l'un des **username** ci-dessus
- Saisir le **password** correspondant
- Cliquer sur "Se connecter"

### 4. Redirection automatique
Selon le rôle :
- `admin` → `/admin` (Dashboard Admin)
- `manager` → `/manager` (Dashboard Manager)
- `employee` → `/employee` (Dashboard Employé)
- `adminmanager` → `/admin` (Dashboard Admin)

---

## 📋 Tableau Récapitulatif

| Username | Password | Rôles | Dashboard Accès |
|----------|----------|-------|----------------|
| `admin` | `admin123` | ROLE_ADMIN | `/admin` |
| `manager` | `manager123` | ROLE_MANAGER | `/manager` |
| `employee` | `employee123` | ROLE_EMPLOYEE | `/employee` |
| `adminmanager` | `adminmanager123` | ROLE_ADMIN + ROLE_MANAGER | `/admin`, `/manager`, `/employee` |

---

## 🔒 Désactiver le Mode Développement

Pour utiliser l'authentification LDAP réelle en production :

1. **Modifier `compose.yml`** :
   ```yaml
   DEV_MODE: "false"  # ou supprimer cette ligne
   ```

2. **Redémarrer le backend** :
   ```bash
   docker-compose restart backend
   ```

---

## ⚠️ Sécurité

**IMPORTANT :** 
- ⚠️ Le mode développement **NE DOIT JAMAIS** être activé en production
- ⚠️ Les mots de passe sont en clair dans le code
- ⚠️ Ce mode est uniquement pour le développement et les tests locaux

---

## 🧪 Tests Recommandés

### Test 1 : Connexion Admin
1. Se connecter avec `admin` / `admin123`
2. Vérifier l'accès au dashboard Admin
3. Tester les 4 onglets : Vue d'ensemble, Utilisateurs, Pointages, Audit Logs

### Test 2 : Connexion Manager
1. Se connecter avec `manager` / `manager123`
2. Vérifier l'accès au dashboard Manager
3. Tester le pointage, les KPIs, la gestion d'équipe

### Test 3 : Connexion Employé
1. Se connecter avec `employee` / `employee123`
2. Vérifier l'accès au dashboard Employé
3. Tester le pointage personnel et l'historique

### Test 4 : Double Rôle
1. Se connecter avec `adminmanager` / `adminmanager123`
2. Vérifier l'accès à tous les dashboards
3. Tester les fonctionnalités Admin et Manager

---

## 🐛 Dépannage

### Problème : "Invalid credentials"
- **Solution :** Vérifier que le username et password sont exactement comme indiqué (sensible à la casse pour le username)
- **Solution :** Vérifier que `DEV_MODE: "true"` est bien dans `compose.yml`

### Problème : Le mode LDAP est toujours actif
- **Solution :** Redémarrer le backend : `docker-compose restart backend`
- **Solution :** Vérifier les logs : `docker-compose logs backend | grep "DEV MODE"`

### Problème : Erreur "No allowed AD group"
- **Solution :** Cela signifie que le mode développement n'est pas activé. Vérifier `DEV_MODE` dans `compose.yml`

---

**Bon test ! 🚀**

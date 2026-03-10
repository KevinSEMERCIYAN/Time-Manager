# 🔧 Résolution du Problème de Redirection

## Problème
Quand tu accèdes à `http://localhost:8081`, tu es automatiquement redirigé vers `/manager` au lieu de voir la page de connexion.

## Cause
Tu as probablement un **token JWT valide** stocké dans le `localStorage` de ton navigateur d'une session précédente. Le système détecte que tu es déjà connecté et te redirige automatiquement.

## Solutions

### Solution 1 : Se déconnecter (Recommandé)
1. Aller sur `http://localhost:8081/manager` (ou la page où tu es redirigé)
2. Cliquer sur le bouton **"Déconnexion"**
3. Tu seras redirigé vers la page de connexion

### Solution 2 : Vider le localStorage
1. Ouvrir la console du navigateur (F12)
2. Aller dans l'onglet **"Application"** (Chrome) ou **"Stockage"** (Firefox)
3. Cliquer sur **"Local Storage"** → `http://localhost:8081`
4. Supprimer toutes les clés qui commencent par `tm_` :
   - `tm_token`
   - `tm_username`
   - `tm_roles`
   - `tm_display_name`
   - `tm_team`
5. Rafraîchir la page (F5)

### Solution 3 : Navigation privée
1. Ouvrir une **fenêtre de navigation privée** (Ctrl+Shift+N ou Cmd+Shift+N)
2. Aller sur `http://localhost:8081`
3. Tu verras la page de connexion

---

## Correction Appliquée

J'ai corrigé le code pour que la redirection automatique prenne en compte le **rôle de l'utilisateur** :

- Si tu es **Admin** → Redirection vers `/admin`
- Si tu es **Manager** → Redirection vers `/manager`
- Si tu es **Employé** → Redirection vers `/employee`

---

## Pour tester avec le compte Admin

1. **Vider le localStorage** (Solution 2) ou utiliser la **navigation privée** (Solution 3)
2. Aller sur `http://localhost:8081`
3. Se connecter avec :
   - Username : `admin`
   - Password : `admin123`
4. Tu seras automatiquement redirigé vers `/admin` ✅

---

## Vérification

Pour vérifier quel compte est actuellement connecté :

1. Ouvrir la console (F12)
2. Aller dans **Application** → **Local Storage** → `http://localhost:8081`
3. Regarder la valeur de `tm_roles` :
   - `["ROLE_ADMIN"]` → Compte Admin
   - `["ROLE_MANAGER"]` → Compte Manager
   - `["ROLE_EMPLOYEE"]` → Compte Employé

---

**Le frontend a été reconstruit et redémarré avec la correction !** 🚀

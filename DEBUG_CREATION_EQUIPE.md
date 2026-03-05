# 🔍 Debug - Problème de Création d'Équipe

## Problèmes Possibles Identifiés

### 1. ⚠️ Token JWT Expiré
Les logs montrent : `JWT verify error: jwt expired`
- **Cause** : Le token expire après 15 minutes par défaut
- **Solution** : Se reconnecter

### 2. 📍 Mauvais Dashboard
- La création d'équipe est disponible **uniquement dans le Dashboard Manager** (`/manager`)
- **Pas disponible dans le Dashboard Admin** (`/admin`)

### 3. 🔐 Permissions
- Il faut être connecté avec un compte ayant le rôle `ROLE_MANAGER` ou `ROLE_ADMIN`

---

## ✅ Solutions

### Solution 1 : Vérifier que tu es dans le bon dashboard

1. **Vérifier l'URL** :
   - ✅ Bon : `http://localhost:8081/manager`
   - ❌ Mauvais : `http://localhost:8081/admin`

2. **Si tu es dans Admin** :
   - Cliquer sur "Déconnexion"
   - Se reconnecter avec `manager` / `manager123`
   - Ou aller directement sur `http://localhost:8081/manager`

### Solution 2 : Vérifier le rôle

1. Ouvrir la console du navigateur (F12)
2. Aller dans **Application** → **Local Storage** → `http://localhost:8081`
3. Vérifier `tm_roles` :
   - ✅ Doit contenir `["ROLE_MANAGER"]` ou `["ROLE_ADMIN"]`
   - ❌ Si vide ou `["ROLE_EMPLOYEE"]` → Pas les permissions

### Solution 3 : Se reconnecter (Token expiré)

1. Cliquer sur **"Déconnexion"**
2. Se reconnecter avec :
   - Username : `manager`
   - Password : `manager123`
3. Aller sur `/manager`
4. Essayer de créer une équipe

### Solution 4 : Vérifier que le bouton est visible

Dans le Dashboard Manager (`/manager`), descendre jusqu'à la section **"Gestion d'Équipes"** en bas de la page.

Le bouton **"Créer une équipe"** doit être visible avec une icône `+`.

---

## 🧪 Test Rapide

1. **Vider le localStorage** :
   ```javascript
   // Dans la console du navigateur (F12)
   localStorage.clear();
   ```

2. **Se reconnecter** :
   - Username : `manager`
   - Password : `manager123`

3. **Aller sur** : `http://localhost:8081/manager`

4. **Descendre jusqu'à** : Section "Gestion d'Équipes"

5. **Cliquer sur** : "Créer une équipe"

6. **Saisir un nom** dans le prompt

7. **Vérifier** : L'équipe doit apparaître dans la liste

---

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier la console du navigateur

1. Ouvrir la console (F12)
2. Aller dans l'onglet **"Console"**
3. Essayer de créer une équipe
4. Regarder les erreurs affichées

### Erreurs possibles :

- **401 Unauthorized** → Token expiré ou invalide → Se reconnecter
- **403 Forbidden** → Pas les permissions → Vérifier le rôle
- **404 Not Found** → Route API incorrecte → Vérifier que le backend est démarré
- **Network Error** → Backend inaccessible → Vérifier `docker-compose ps`

---

## 📋 Checklist de Vérification

- [ ] Je suis dans le dashboard **Manager** (`/manager`) et non Admin
- [ ] Je suis connecté avec un compte **Manager** ou **Admin**
- [ ] Mon token n'est pas expiré (se reconnecter si nécessaire)
- [ ] Le backend est démarré (`docker-compose ps`)
- [ ] Je vois la section "Gestion d'Équipes" en bas de la page
- [ ] Le bouton "Créer une équipe" est visible et cliquable
- [ ] Aucune erreur dans la console du navigateur

---

**Dis-moi où tu te trouves exactement et je t'aiderai à résoudre le problème !** 🚀

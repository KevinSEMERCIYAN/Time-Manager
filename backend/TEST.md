# Test Backend - Time-Manager (méthode classique mysql2)

## ✅ Résumé : Tout fonctionne maintenant !

- ✅ Backend démarre correctement
- ✅ Connexion DB fonctionne
- ✅ 10 tables créées dans la base de données

## 1. Démarrer la base de données

```bash
docker-compose up db -d
```

Le port 3306 est maintenant exposé dans `compose.yml`, donc tu peux tester depuis Windows.

## 2. Créer les tables

Exécuter le schéma SQL une fois :

**Depuis PowerShell (Windows) :**

```powershell
Get-Content backend/sql/schema.sql | docker-compose exec -T db mariadb -u timemanager -ptimemanager timemanager
```

**Depuis bash/Linux :**

```bash
docker-compose exec -T db mariadb -u timemanager -ptimemanager timemanager < backend/sql/schema.sql
```

**Alternative : Depuis la machine hôte (si port 3306 exposé)**

```bash
mysql -h 127.0.0.1 -P 3306 -u timemanager -ptimemanager timemanager < backend/sql/schema.sql
```

## 3. Tester la connexion

**Depuis le conteneur Docker (recommandé) :**

```bash
docker-compose exec backend npm run test:db
```

**Depuis la machine hôte (si port 3306 exposé) :**

```bash
cd backend
npm run test:db
```

Tu devrais voir :
```
✅ Found 10 table(s):
   - audit_logs
   - contracts
   - custom_teams
   - custom_team_members
   - roles
   - schedules
   - teams
   - time_entries
   - users
   - user_roles
```

## 4. Démarrer le backend

Le backend démarre automatiquement avec Docker Compose. Pour vérifier :

```bash
docker-compose ps backend
docker-compose logs backend
```

Ou démarrer manuellement :

```bash
cd backend
npm run dev
```

Puis ouvrir : http://localhost:3000/health et http://localhost:3000/test/db

## Dépannage

- **Backend en "Restarting"** : Rebuild l'image avec `docker-compose build backend`
- **Can't connect** : vérifier que le service `db` tourne (`docker-compose ps`) et que `DB_HOST`/`DB_PORT` correspondent (en local : souvent `localhost` et `3306` si le port est exposé).
- **Access denied** : vérifier `DB_USER`, `DB_PASS`, `DB_NAME` (ex. timemanager / timemanager / timemanager).
- **Table doesn't exist** : exécuter `sql/schema.sql` comme à l'étape 2.

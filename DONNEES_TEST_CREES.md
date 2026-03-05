# ✅ Données de Test Créées avec Succès

## 📊 Résumé

- ✅ **20 employés** créés
- ✅ **4 managers** créés  
- ✅ **228 pointages** créés sur les 14 derniers jours
- ✅ **773h 18m** d'heures supplémentaires générées

---

## 👥 Employés Créés (20)

| # | Nom | Username | Équipe |
|---|-----|----------|--------|
| 1 | Jean Martin | `jean.martin` | IT |
| 2 | Marie Bernard | `marie.bernard1` | RH |
| 3 | Pierre Dubois | `pierre.dubois2` | Finance |
| 4 | Sophie Thomas | `sophie.thomas3` | Marketing |
| 5 | Thomas Robert | `thomas.robert4` | Support |
| 6 | Julie Richard | `julie.richard5` | Direction |
| 7 | Nicolas Petit | `nicolas.petit6` | IT |
| 8 | Camille Durand | `camille.durand7` | RH |
| 9 | Antoine Leroy | `antoine.leroy8` | Finance |
| 10 | Laura Moreau | `laura.moreau9` | Marketing |
| 11 | Julien Simon | `julien.simon10` | Support |
| 12 | Emma Laurent | `emma.laurent11` | Direction |
| 13 | Alexandre Lefebvre | `alexandre.lefebvre12` | IT |
| 14 | Léa Michel | `léa.michel13` | RH |
| 15 | Maxime Garcia | `maxime.garcia14` | Finance |
| 16 | Chloé David | `chloé.david15` | Marketing |
| 17 | David Bertrand | `david.bertrand16` | Support |
| 18 | Sarah Roux | `sarah.roux17` | Direction |
| 19 | Paul Vincent | `paul.vincent18` | IT |
| 20 | Manon Fournier | `manon.fournier19` | RH |

---

## 👔 Managers Créés (4)

| # | Nom | Username | Équipe |
|---|-----|----------|--------|
| 1 | Marc Dupont | `manager1` | IT |
| 2 | Céline Martin | `manager2` | RH |
| 3 | François Bernard | `manager3` | Finance |
| 4 | Isabelle Moreau | `manager4` | Marketing |

---

## ⏰ Pointages Générés

### Caractéristiques

- **Période** : 14 derniers jours (jours ouvrables uniquement)
- **Heures d'entrée** : Entre 7h30 et 9h30 (certains arrivent en retard)
- **Heures de sortie** : Entre 17h et 20h (certains font des heures sup)
- **Total** : 228 pointages
- **Par employé** : ~10-12 pointages
- **Par manager** : ~8-10 pointages

### Heures Supplémentaires

- **Base de travail** : 7h par jour (35h/semaine)
- **Heures sup calculées** : Heures travaillées au-delà de 7h par jour
- **Total heures sup** : **773h 18m**
- **Pointages avec heures sup** : 228 (tous les pointages)

---

## 🔍 Comment Voir les Données

### Dans le Dashboard Admin

1. Se connecter avec `admin` / `admin123`
2. Aller sur `http://localhost:8081/admin`
3. **Onglet "Utilisateurs"** : Voir tous les employés et managers
4. **Onglet "Pointages"** : Voir tous les pointages créés

### Dans le Dashboard Manager

1. Se connecter avec `manager` / `manager123`
2. Aller sur `http://localhost:8081/manager`
3. Voir les **KPIs** avec les heures supplémentaires
4. Voir les **graphiques** avec les données des équipes

---

## 🔄 Régénérer les Données

Pour régénérer les données (si besoin) :

```bash
docker-compose exec backend node scripts/generate-test-data.js
```

**Note** : Le script vérifie si les utilisateurs existent déjà et ne les duplique pas.

---

## 📝 Notes

- Les utilisateurs sont répartis dans différentes équipes (IT, RH, Finance, Marketing, Support, Direction)
- Les emails suivent le format : `username@primebank.local`
- Les pointages sont créés uniquement pour les jours ouvrables (pas le week-end)
- Les heures supplémentaires sont calculées automatiquement par le système

---

**Les données sont maintenant disponibles dans l'application ! 🎉**

# Scripts de Génération de Données de Test

## Génération de Données de Test

Ce script crée automatiquement :
- **20 employés** avec des noms français
- **4 managers** 
- **Des pointages** sur les 14 derniers jours avec heures supplémentaires

### Utilisation

#### Option 1 : Depuis le conteneur Docker

```bash
docker-compose exec backend node scripts/generate-test-data.js
```

#### Option 2 : Depuis le répertoire backend local

```bash
cd backend
node scripts/generate-test-data.js
```

### Ce qui est créé

1. **20 Employés** :
   - Noms français (Jean Martin, Marie Bernard, etc.)
   - Usernames : `jean.martin`, `marie.bernard`, etc.
   - Emails : `jean.martin@primebank.local`
   - Répartis dans différentes équipes (IT, RH, Finance, Marketing, Support, Direction)

2. **4 Managers** :
   - Marc Dupont (`manager1`)
   - Céline Martin (`manager2`)
   - François Bernard (`manager3`)
   - Isabelle Moreau (`manager4`)

3. **Pointages** :
   - Pointages sur les 14 derniers jours (jours ouvrables uniquement)
   - Heures d'entrée : entre 7h30 et 9h30 (certains arrivent en retard)
   - Heures de sortie : entre 17h et 20h (certains font des heures sup)
   - Environ 10-12 pointages par employé
   - Environ 8-10 pointages par manager

### Heures Supplémentaires

Les heures supplémentaires sont calculées automatiquement :
- Base de travail : 7h par jour (35h/semaine)
- Heures sup : heures travaillées au-delà de 7h par jour
- Le script affiche un résumé des heures supplémentaires générées

### Notes

- Le script vérifie si les utilisateurs existent déjà avant de les créer
- Les pointages existants ne sont pas dupliqués
- Les données sont créées avec des dates réalistes

# ADR-004 : Tech Stack

## Status
Accepted

## Context
- Le sujet impose une liste restreinte de technologies :
  - Backend : Node/Express, Go, Django, Symfony, Spring Boot, Phoenix…
  - DB : MariaDB / PostgreSQL / MongoDB.
  - Frontend : React, Vue, Angular ou mobile (Kotlin/Swift/React Native/Flutter).
- Contexte PrimeBank :
  - Grande organisation, besoin de maintenabilité et de lisibilité du code.
  - Contraintes de conformité bancaire + RGPD.
  - Délai pédagogique : ~14 jours.

Nous devons choisir une stack qui :
- respecte le sujet,
- est cohérente avec une architecture REST + Docker,
- permet d’aller vite tout en restant professionnelle.

## Decision

Nous retenons la stack suivante :

- **Backend**
  - **Node.js + Express**
  - Librairies clés :
    - `express` : serveur HTTP et routing,
    - `jsonwebtoken` : génération/validation des JWT,
    - `mysql2/promise` : accès à MariaDB,
    - `helmet` : sécurisation de certains headers HTTP,
    - `cors` : configuration CORS si nécessaire,
    - `ldapjs` : intégration possible avec LDAP (mode prod), complété par un mode `DEV_MODE` avec comptes de test.

- **Database**
  - **MariaDB 11**
  - Raison principale : base SQL ACID adaptée à la paie, aux calculs d’heures et aux contraintes de conformité.
  - Utilisation de clés étrangères, contraintes d’intégrité et scripts SQL (`schema.sql`, migrations).

- **Frontend**
  - **React + Vite**
  - SPA avec :
    - `react-router-dom` pour la navigation (login, dashboards),
    - `lucide-react` pour les icônes,
    - un contexte d’auth (`AuthContext`) qui stocke JWT + rôles.

- **Infra / DevOps**
  - **Docker / Docker Compose** pour l’orchestration locale (db, backend, frontend, reverse proxy, mailpit).
  - **Nginx** comme reverse proxy.
  - **Mailpit** pour la capture des emails de test.
  - **GitHub Actions** (phase 1) pour :
    - build frontend + backend,
    - exécuter les tests backend,
    - générer un rapport de couverture.

## Conséquences

### Avantages
- Stack **100% conforme** au sujet.
- Stack très standard dans l’industrie :
  - Node/Express + MariaDB + React + Nginx est un combo classique.
- Beaucoup d’exemples/outils disponibles (tests, CI, dockerisation).
- Facilité à expliquer et défendre devant un jury (choix rationnels).

### Inconvénients
- Pas de typage fort côté backend (TypeScript non utilisé).
- Pas de framework full-stack intégré (Next.js / Nest.js interdits par le sujet).

### Risques & Mitigation
- **Risque :** erreurs silencieuses côté JS (typage faible).
  - **Mitigation :** validations côté backend, tests automatisés, logs détaillés.
- **Risque :** complexité de la logique métier dans un seul service Express.
  - **Mitigation :** structurer les routes et la logique par domaine (users, teams, time-entries, reports, tasks) et ajouter des tests.

## Alternatives considérées

### Alternative 1 : Django + PostgreSQL
- **Pros :**
  - ORM puissant, admin intégré, support très mature.
- **Cons :**
  - Changement complet de techno par rapport à l’existant,
  - Moins aligné avec le frontend déjà en React sans y gagner clairement pour ce projet.
- **Pourquoi non retenu :**
  - Le projet est déjà avancé en Node/Express + MariaDB.
  - Coût de migration injustifié pour les objectifs pédagogiques.

### Alternative 2 : Spring Boot + PostgreSQL
- **Pros :**
  - Écosystème très rich, excellent pour gros SI bancaires.
- **Cons :**
  - Courbe d’apprentissage plus raide,
  - Configuration plus lourde à mettre en place dans le temps imparti.
- **Pourquoi non retenu :**
  - Node/Express couvre déjà les besoins, plus simple à dockeriser rapidement et à expliquer.


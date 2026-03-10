# ADR-001 : Global Architecture

## Status
Accepted

## Context
- PrimeBank est une banque digitale avec 3600 employés (bientôt 2000+ de plus), des contraintes fortes de conformité (banque + RGPD) et un besoin de disponibilité élevée.
- L’application Time Manager doit :
  - centraliser les pointages (arrivées / départs),
  - fournir des KPI aux managers et à l’admin,
  - gérer les rôles (employé, manager, admin).
- Exigences du sujet :
  - Backend et frontend séparés.
  - Base de données SQL ou NoSQL.
  - Docker + Docker Compose avec au minimum : backend, frontend, base de données, reverse proxy.
  - Possibilité d’évolution vers 2000 utilisateurs et plus.

Nous devons donc choisir une architecture simple à déployer, mais suffisamment robuste et claire pour un contexte bancaire.

## Decision

Nous retenons une **architecture monolithique back + frontend SPA**, orchestrée par **Docker Compose**, avec :
- un **backend Node.js / Express** exposant une API REST,
- une **base de données MariaDB** pour les données métier,
- un **frontend React** (SPA) qui consomme l’API,
- un **reverse proxy Nginx** qui expose un port public unique et route vers frontend + backend,
- un **service Mailpit** pour simuler l’envoi de mails (pour la gestion de comptes / mots de passe).

La responsabilité de chaque bloc :
- **Backend** : toute la logique métier, l’authentification JWT, le RBAC (roles), les calculs de rapports / KPI, les règles d’accès (admin/manager/employé).
- **Database** : persistance des utilisateurs, équipes, pointages, tâches, planning, contrats.
- **Frontend** : interfaces dashboards (employé, manager, admin), formulaires, recherche, filtres.
- **Reverse proxy** : point d’entrée unique (`http://localhost:8081` en dev), terminaison HTTP, routage propre.

## Conséquences

### Avantages
- **Simplicité de déploiement** : un seul dépôt, un `compose.yml`, un point d’entrée réseau.
- **Lisibilité** : séparation claire backend / frontend / DB / proxy.
- **Adapté au contexte** :
  - MariaDB apporte des garanties ACID pour la paie et les heures.
  - Node.js / Express est simple à tester et à dockeriser.
  - Nginx est standard pour exposer proprement les services.
- **Évolutif raisonnablement** : on peut ultérieurement séparer certains sous-domaines (reporting, audit) si nécessaire, mais la monolithique REST couvre largement les besoins actuels.

### Inconvénients
- Le monolithe backend concentre beaucoup de responsabilités (auth, reporting, gestion d’équipes, etc.).
- L’évolutivité horizontale devra se faire au niveau du container backend entier (scaling de l’instance), pas par microservice indépendant.

### Risques & Mitigation
- **Risque :** saturation du backend si le volume augmente fortement.
  - **Mitigation :** garder une couche API propre (routes / services) pour pouvoir extraire des services plus tard (ex : reporting ou audit) si nécessaire.
- **Risque :** complexité croissante dans le backend.
  - **Mitigation :** structurer le code par domaines (routes dédiées, sql/migrations dédiées, services réutilisables) et ajouter des tests automatisés.

## Alternatives considérées

### Alternative 1 : Microservices complets
- **Pros :**
  - Très bonne isolation des domaines (auth, time-tracking, reporting…).
  - Scalabilité fine par service.
- **Cons :**
  - Complexité très élevée pour un projet pédagogique : configuration réseau, observabilité, traçage distribué, gestion des transactions entre services.
  - Surcoût de déploiement / maintenance (plusieurs images, plus de pipelines, plus de risques d’erreurs).
- **Pourquoi non retenu :**
  - Disproportionné par rapport au besoin et au délai (14 jours).
  - Le sujet insiste sur Docker Compose, pas sur Kubernetes ou un orchestrateur avancé.

### Alternative 2 : Backend monolithique mais sans reverse proxy dédié
- **Pros :**
  - Un serveur Node pourrait servir à la fois l’API et les assets frontend.
  - Moins de services Docker.
- **Cons :**
  - Moins proche d’un setup “production” classique bancaire (où un reverse proxy / WAF est quasiment toujours présent).
  - Moins flexible pour changer de frontend ou rajouter un autre client.
- **Pourquoi non retenu :**
  - Le sujet demande explicitement un **reverse proxy**.
  - Nginx apporte une couche réaliste par rapport au contexte banque.


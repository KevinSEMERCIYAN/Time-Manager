# ADR-002 : API Design

## Status
Accepted

## Context
- L’application doit exposer une **API pour le frontend** (web) et potentiellement d’autres clients.
- Le sujet impose au minimum des routes de type :
  - `/users`, `/teams`, `/clocks`, `/users/{id}/clocks`, `/reports`.
- Les contraintes PrimeBank :
  - **Sécurité** : token JWT, RBAC, audit.
  - **Simplicité** pour un délai de 14 jours.
  - Intégration facile dans un frontend React.

Nous devons choisir un style d’API adapté : REST, GraphQL, gRPC, etc.

## Decision

Nous retenons une **API RESTful JSON** exposée par **Express**, avec :
- des **endpoints structurés par ressource** (`/api/users`, `/api/teams`, `/api/time-entries`, `/api/reports`, `/api/tasks`, etc.),
- un **préfixe `/api`** pour distinguer les routes API du reste,
- un **schéma d’authentification JWT** (header `Authorization: Bearer <token>`),
- un **RBAC** appliqué via middleware (`authenticateJWT`, `authorizeRoles`),
- des **alias** ou adaptations pour coller aux endpoints demandés dans le sujet (`/clocks`, `/users/:id/clocks`, `/reports`).

Les décisions importantes :
- REST + JSON : parfaitement supporté par React, simple à tester, outillage riche (Postman, curl, etc.).
- JWT stateless : s’intègre facilement avec un reverse proxy, pas de gestion de session serveur.
- Rôles encodés dans le token + contrôlés côté backend : centralisation des permissions.

## Conséquences

### Avantages
- **Interfaçage simple** avec le frontend actuel (`fetch`/`axios`) et n’importe quel client HTTP.
- **Debug facile** : routes lisibles, inspection des réponses JSON.
- **Séparation nette** entre frontend et backend (le frontend ne fait jamais de SQL).
- **Extensible** : on peut rajouter des routes (ex: `/tasks`, `/schedules`, `/contracts`) sans changer le paradigme.

### Inconvénients
- Pas de typage fort des schémas de réponse côté client (pas de contrat GraphQL/Protobuf).
- Pas de batching automatique de requêtes (comme GraphQL).

### Risques & Mitigation
- **Risque :** dérive de la convention des routes (naming incohérent).
  - **Mitigation :** respecter la convention `/api/<resource>` et la liste minimale du sujet, documenter dans `README` et dans le code (routes par fichier).
- **Risque :** explosion du nombre d’endpoints.
  - **Mitigation :** regrouper par domaines (`users`, `teams`, `timeEntries`, `reports`, `tasks`) et garder une logique simple côté contrôleurs.

## Alternatives considérées

### Alternative 1 : GraphQL
- **Pros :**
  - Très flexible côté client, une seule endpoint.
  - Récupération ciblée des champs nécessaires.
- **Cons :**
  - Setup plus lourd (schema, resolvers, sécurité fine).
  - Complexifie la stack pour un projet sur 14 jours, surtout en contexte bancaire avec beaucoup d’autres exigences.
- **Pourquoi non retenu :**
  - Le sujet ne l’exige pas, REST est suffisant et standard.
  - La priorité est la robustesse, pas l’expérimentation sur GraphQL.

### Alternative 2 : gRPC
- **Pros :**
  - Très performant, contrats forts, idéal pour communication service à service.
- **Cons :**
  - Moins adapté pour un frontend web directement.
  - Nécessite un proxy ou un client gRPC-web spécifique.
- **Pourquoi non retenu :**
  - Overkill pour une SPA React simple.
  - REST + JSON reste plus naturel pour une application web interne bancaire.


# ADR-003 : Reverse Proxy

## Status
Accepted

## Context
- Le sujet impose un **reverse proxy** qui :
  - permet l’accès au backend et au frontend,
  - expose un port public.
- Nous avons :
  - un backend Node/Express sur le port `3000` (dans le container),
  - un frontend Vite/React sur le port `5173` (dans le container),
  - un réseau Docker interne.
- PrimeBank, en production, utilisera quasi-sûrement un reverse proxy / WAF devant les services internes.

Nous devons choisir la technologie de reverse proxy et le mode de configuration.

## Decision

Nous retenons **Nginx (image officielle `nginx:alpine`)** comme reverse proxy, avec :
- une configuration montée depuis `./nginx/conf.d`,
- un container `reverse-proxy` exposant **le port `8081` sur la machine hôte**,
- un routage :
  - `/` → frontend (port 5173 du service `frontend`),
  - `/api` → backend (port 3000 du service `backend`).

Le reverse proxy fait office de point d’entrée unique, y compris en vue d’une future configuration HTTPS/SSL.

## Conséquences

### Avantages
- **Standard industriel** : Nginx est largement utilisé, bien documenté, particulièrement en contexte bancaire.
- **Séparation claire** :
  - Les containers backend et frontend restent sur le réseau interne.
  - Un seul port public (8081) est exposé.
- **Évolution vers HTTPS simple** : il suffit d’ajouter une config TLS (certificats) à Nginx.

### Inconvénients
- Ajout d’un service supplémentaire à maintenir (logs, conf).
- Une couche de configuration en plus à tester (routing, headers, CORS si mal configuré).

### Risques & Mitigation
- **Risque :** mauvaise configuration des routes (boucles, chemins cassés).
  - **Mitigation :** garder une config simple (`/` pour le frontend, `/api` pour le backend), et tester avec `curl`/navigateur.
- **Risque :** oubli de certains headers de sécurité (CORS, security headers).
  - **Mitigation :** combiner Nginx avec `helmet` côté Express et tester les headers avec des outils (browser devtools, curl -I).

## Alternatives considérées

### Alternative 1 : Traefik
- **Pros :**
  - Intégration dynamique avec Docker via labels.
  - Très pratique pour multi-environnements / multi-services.
- **Cons :**
  - Plus complexe à justifier dans un projet simple.
  - Ajoute une couche de concepts (middlewares, routers, etc.).
- **Pourquoi non retenu :**
  - Nginx est suffisant et plus standard, surtout pour un jury non spécialisé DevOps.

### Alternative 2 : Pas de reverse proxy (accès direct aux ports 3000/5173)
- **Pros :**
  - Simplicité immédiate (pas de configuration supplémentaire).
- **Cons :**
  - Ne respecte pas le sujet (reverse proxy obligatoire).
  - Moins réaliste pour un déploiement bancaire (exposition de plusieurs ports/backend directement).
- **Pourquoi non retenu :**
  - En désaccord avec les exigences du sujet et les bonnes pratiques de sécurité.


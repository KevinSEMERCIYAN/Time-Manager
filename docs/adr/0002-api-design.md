# ADR 0002 — Design API

## Contexte
Besoin de séparer auth, provisioning, teams, clocks et reporting.

## Décision
- REST endpoints structurés par domaine (/auth, /users, /teams, /clocks, /reports)
- Cookies httpOnly pour l’accès

## Conséquences
- Simplifie le frontend
- Facilite les tests et l’audit

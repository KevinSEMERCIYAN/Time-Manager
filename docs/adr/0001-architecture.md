# ADR 0001 — Architecture globale

## Contexte
Application de pointage intégrée à l’Active Directory, avec exigences de traçabilité et RBAC.

## Décision
- AD = source d’identité + rôles
- Backend = vérité métier + RBAC + audit
- Frontend = UI sans logique métier critique

## Conséquences
- Les règles de pointage et d’accès sont centralisées côté backend.
- L’AD est consulté en lecture seule.

# ADR 0003 — Reverse proxy

## Contexte
Exposer une seule entrée HTTP(S) et séparer frontend/backend.

## Décision
- Nginx reverse-proxy
- / -> frontend, /api -> backend

## Conséquences
- TLS géré en frontal en prod

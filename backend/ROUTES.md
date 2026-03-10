# Backend API – Time-Manager

## Auth & profil

- **POST** `/auth/login`  
  - Body: `{ "username": string, "password": string }`  
  - Réponse: `{ token, roles, username, displayName, team, teams, users }`

- **GET** `/api/me`  
  - Auth: `Authorization: Bearer <JWT>`  
  - Réponse: `{ username, roles }`

- **GET** `/api/admin/ping`  
  - Auth: `ROLE_ADMIN` requis  
  - Réponse: `{ ok: true, message: "Admin access granted" }`

## Health & DB

- **GET** `/health`  
  - Réponse: `{ ok: true }`

- **GET** `/test/db`  
  - Test de connexion MariaDB + liste des tables.

## Users

Préfixe: `/api`

- **GET** `/api/users`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Liste des utilisateurs + équipe.

- **GET** `/api/users/:id`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Détail d’un utilisateur.

- **PATCH** `/api/users/:id`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Body (tous optionnels):  
    - `displayName: string`  
    - `email: string`  
    - `teamId: number | null`  
    - `isActive: boolean`  
  - Réponse: utilisateur mis à jour.

## Schedules (horaires)

Préfixe: `/api`

- **GET** `/api/users/:id/schedule`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Retourne les horaires d’un utilisateur:
    - `amStart`, `amEnd`, `pmStart`, `pmEnd`

- **PUT** `/api/users/:id/schedule`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Body:
    - `amStart: string` (HH:MM ou HH:MM:SS)
    - `amEnd: string`
    - `pmStart: string`
    - `pmEnd: string`
  - Crée ou met à jour le schedule (UPSERT).

## Contracts

Préfixe: `/api`

- **GET** `/api/users/:id/contract`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Retourne:
    - `type` (`CDI`, `CDD`, `STAGE`, `OTHER`)
    - `startDate`, `endDate`

- **PUT** `/api/users/:id/contract`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Body:
    - `type: "CDI" | "CDD" | "STAGE" | "OTHER"`  
    - `startDate?: string` (ISO)  
    - `endDate?: string` (ISO)  
  - Crée ou met à jour le contrat (UPSERT).

## Teams

Préfixe: `/api`

- **GET** `/api/teams`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Liste des équipes (LDAP + internes).

## Custom Teams

Préfixe: `/api`

- **GET** `/api/custom-teams`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Liste des équipes custom (sans membres).

- **GET** `/api/custom-teams/:id`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Détail d’une équipe custom + membres.

- **POST** `/api/custom-teams`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Body:
    - `name: string` (obligatoire)
    - `memberIds?: number[]` (optionnel, liste d’IDs user)
  - Crée une équipe custom (et ses membres si fournis).

- **PATCH** `/api/custom-teams/:id`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Body:
    - `name: string` (obligatoire)
  - Renomme l’équipe custom.

- **DELETE** `/api/custom-teams/:id`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Supprime l’équipe et ses membres (`204 No Content`).

- **POST** `/api/custom-teams/:id/members`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Body:
    - `memberIds: number[]`  
  - Remplace la liste des membres (supprime tous puis réinsère).

- **DELETE** `/api/custom-teams/:id/members/:userId`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Retire un membre spécifique de l’équipe.

## Time entries (clocks)

Préfixe: `/api`

- **GET** `/api/time-entries`  
  - Auth: JWT (tout user connecté)  
  - Query params (optionnels):  
    - `userId: number`  
    - `teamId: number`  
    - `from: string` (date ISO)  
    - `to: string` (date ISO)  
  - Réponse: liste des pointages avec user + team.

- **POST** `/api/time-entries`  
  - Auth: JWT (tout user connecté)  
  - Body:  
    - `userId: number` (obligatoire)  
    - `teamId: number | null` (optionnel)  
    - `startTime: string` (ISO, obligatoire)  
    - `endTime: string | null` (ISO, optionnel)  
    - `source: "MANUAL" | "AUTO" | "SEEDED"` (optionnel, défaut MANUAL)  
    - `comment: string | null` (optionnel)  
  - Réponse: time entry créée.

- **PATCH** `/api/time-entries/:id`  
  - Auth: `ROLE_ADMIN` ou `ROLE_MANAGER`  
  - Body (au moins un champ):  
    - `endTime: string | null` (ISO)  
    - `comment: string | null`  
  - Réponse: time entry mise à jour.

- **DELETE** `/api/time-entries/:id`  
  - Auth: `ROLE_ADMIN`  
  - Réponse: `204 No Content` si suppression OK.

## Audit Logs

Préfixe: `/api`

- **GET** `/api/audit-logs`  
  - Auth: `ROLE_ADMIN`  
  - Query params (optionnels):
    - `userId: number`
    - `action: string`
    - `entityType: string`
    - `from: string` (date ISO)
    - `to: string` (date ISO)
    - `limit: number` (max 1000, défaut 200)
  - Réponse: liste des lignes d’audit, triées du plus récent au plus ancien:
    - `id, userId, username, action, entityType, entityId, metadata, ipAddress, createdAt`

## Reports / KPIs

Préfixe: `/api`

- **GET** `/api/reports/summary`  
  - Auth: `ROLE_MANAGER` ou `ROLE_ADMIN`  
  - Query params (optionnels):
    - `userId: number` – filtrer sur un utilisateur
    - `teamId: number` – filtrer sur une équipe
    - `from: string` (date ISO, ex: `2024-01-01`)
    - `to: string` (date ISO, ex: `2024-01-31`)
  - Réponse:
    ```json
    {
      "overview": {
        "totalMinutes": 1234,
        "totalHours": 20.5666,
        "formattedTotal": "20h 34m",
        "entriesCount": 42,
        "lateCount": 3,
        "activeUsers": 5
      },
      "users": [
        {
          "userId": 1,
          "username": "jdoe",
          "displayName": "John Doe",
          "teamId": 2,
          "teamName": "Equipe Dev",
          "entriesCount": 10,
          "lateCount": 1,
          "totalMinutes": 600,
          "totalHours": 10,
          "formattedTotal": "10h 00m"
        }
      ]
    }
    ```
  - Notes:
    - Les durées sont calculées avec `TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW()))`
    - `lateCount` compte les pointages dont l’heure de début est après `09:00:00`

---

Cette doc décrit uniquement les routes déjà implémentées côté backend.  
On pourra y ajouter plus tard : d’autres rapports (`/api/reports/*`), exports CSV, etc.
*** End Patch`"} ***!

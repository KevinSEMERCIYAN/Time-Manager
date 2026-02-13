# Frontend Time Manager

## Lancer en dev

```bash
cd frontend
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173). En mode stack complète (Docker), utilise [http://localhost:8080](http://localhost:8080).

## Structure

- **`src/main.jsx`** – Point d’entrée : charge `styles.css` et rend `app/App.jsx`.
- **`src/app/App.jsx`** – App principale : auth, état global, routing (Landing, Login, Dashboard, Profil, Équipes, Membres).
- **`src/app/config/routes.js`** – Constantes des routes.
- **`src/pages/`** – Pages (Login, Dashboard, Profile, Teams, CreateTeam, Members, MemberDetails, MemberCreate, Landing).
- **`src/layouts/DashboardShell.jsx`** – Barre de navigation et filtres du tableau de bord.
- **`src/components/`** – Modales (Confirm, Clock, EditTeam), feedback (ErrorToast, SuccessToast), graphiques (SparklineChart).
- **`src/services/api.js`** – Client API (`apiFetch`) avec fallback dev pour le login sans backend.
- **`src/styles.css`** – Charte graphique (variables CSS) et classes utilitaires (`.tm-app-charter`, `.tm-btn`, `.tm-input`, etc.).

## Charte graphique

Définie dans `styles.css` (variables `--tm-*`) :

- **Couleurs** : `--tm-bg-app`, `--tm-surface`, `--tm-border`, `--tm-text-main`, `--tm-text-muted`, `--tm-primary`, `--tm-success`, `--tm-danger`, `--tm-warning`.
- **Rayons** : `--tm-radius-lg` (12px), `--tm-radius-md` (10px).
- **Ombre** : `--tm-shadow-soft`.
- **Police** : Inter (Google Fonts), 400 / 500 / 600 / 700.

Les écrans utilisent le wrapper `.tm-app-charter` et les classes `.tm-btn`, `.tm-btn-primary`, `.tm-btn-danger`, `.tm-input`, `.tm-text-muted`, `.tm-card` pour rester alignés avec la charte.

## Anciens composants (non utilisés)

Les fichiers suivants ne sont plus montés dans le routeur actuel (l’app utilise `app/App.jsx` + `pages/*`) mais restent dans le dépôt :

- `ManagerDashboard.jsx`
- `CreateTeam.jsx`
- `Profile.jsx`

Ils peuvent servir de référence ou être réintégrés plus tard.

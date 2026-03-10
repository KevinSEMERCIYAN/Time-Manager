const STORAGE_KEY = "tm_teams_v1";

export const DEPARTMENTS = [
  "Juridique",
  "Finance",
  "Informatique",
  "Ressource Humaine",
  "Marketing",
  "Audit",
];

export const DEFAULT_TEAMS = [
  { id: "dev", name: "Équipe Développement", department: "Informatique", membersCount: 5 },
  { id: "mkt", name: "Équipe Marketing", department: "Marketing", membersCount: 3 },
  { id: "sup", name: "Équipe Support", department: "Informatique", membersCount: 4 },
];

export function loadTeams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEAMS));
      return DEFAULT_TEAMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_TEAMS;
  } catch {
    return DEFAULT_TEAMS;
  }
}

export function saveTeams(teams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

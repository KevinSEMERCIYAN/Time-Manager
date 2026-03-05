import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Mail,
  Search,
  User,
  ChevronDown,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Users,
  Plus,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

import { DEPARTMENTS, loadTeams } from "./store/teamsStore";


const MOCK_PEOPLE = [
  ["Marie", "Dupont"],
  ["Jean", "Martin"],
  ["Lucie", "Bernard"],
  ["Thomas", "Petit"],
  ["Inès", "Roux"],
  ["Hugo", "Moreau"],
  ["Emma", "Fournier"],
  ["Noah", "Lambert"],
  ["Léa", "Dubois"],
  ["Nina", "Garcia"],
  ["Adam", "Lefevre"],
  ["Chloé", "Fontaine"],
];

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildTeamMembers(team, count = 4) {
  const seedBase = String(team.id)
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);

  // pick count members
  const picks = [];
  for (let i = 0; i < count; i++) {
    const r = seededRandom(seedBase + i);
    const idx = Math.floor(r * MOCK_PEOPLE.length);
    const [firstname, lastname] = MOCK_PEOPLE[idx];
    picks.push({ id: `${team.id}-${i}`, firstname, lastname });
  }

  // weekly hours between 28h and 46h in 0.25 increments
  return picks.map((p, i) => {
    const r = seededRandom(seedBase + 100 + i);
    const hours = Math.round((28 + r * 18) * 4) / 4;
    return { ...p, hours };
  });
}

function toHHMM(hoursFloat) {
  const h = Math.floor(hoursFloat);
  const m = Math.round((hoursFloat - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function buildDonutGradient(members) {
  const total = members.reduce((s, m) => s + m.hours, 0) || 1;
  const colors = ["#367ecc", "#2da169", "#dd5840", "#f6a42a", "#8faeb6", "#3c628c"];

  let acc = 0;
  const stops = members.map((m, idx) => {
    const start = acc;
    const pct = (m.hours / total) * 100;
    acc += pct;
    const color = colors[idx % colors.length];
    return `${color} ${start.toFixed(2)}% ${acc.toFixed(2)}%`;
  });

  return `conic-gradient(${stops.join(",")})`;
}

/* ---------------------------
   UI Components
---------------------------- */
function KpiCard({ label, value, helper, tone = "default" }) {
  return (
    <div className={`tm-kpi-card tm-kpi-card-${tone}`}>
      <div className="tm-kpi-label">{label}</div>
      <div className="tm-kpi-value">{value}</div>
      {helper && <div className="tm-kpi-helper">{helper}</div>}
    </div>
  );
}

function SectionCard({ title, icon, children, className = "" }) {
  return (
    <section className={`tm-section-card ${className}`}>
      <header className="tm-section-card-header">
        <div className="tm-section-card-title">
          {icon && <span className="tm-section-card-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>
      </header>
      <div className="tm-section-card-body">{children}</div>
    </section>
  );
}

/* ---------------------------
   Main
---------------------------- */
export function ManagerDashboard() {
  const navigate = useNavigate();

  // menu "Tableau de bord"
  const [menuOpen, setMenuOpen] = React.useState(false);

  // filtre UI (saisie)
  const [searchInput, setSearchInput] = React.useState("");
  const [deptInput, setDeptInput] = React.useState("Tous les départements");

  // filtre appliqué (au clic sur Filtrer)
  const [searchApplied, setSearchApplied] = React.useState("");
  const [deptApplied, setDeptApplied] = React.useState("Tous les départements");

  // teams dynamiques
  const [teams, setTeams] = React.useState(() => loadTeams());
  const [selectedTeamId, setSelectedTeamId] = React.useState(null);

  // recharger teams quand on revient (CreateTeam modifie localStorage)
  React.useEffect(() => {
    const onFocus = () => setTeams(loadTeams());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filteredTeams = React.useMemo(() => {
    const s = searchApplied.trim().toLowerCase();
    return teams.filter((t) => {
      const okDept =
        deptApplied === "Tous les départements" ? true : t.department === deptApplied;
      const okSearch = s ? t.name.toLowerCase().includes(s) : true;
      return okDept && okSearch;
    });
  }, [teams, deptApplied, searchApplied]);

  // si aucun selectedTeam, on prend le premier filtré
  React.useEffect(() => {
    if (!selectedTeamId && filteredTeams.length > 0) {
      setSelectedTeamId(filteredTeams[0].id);
    }
  }, [filteredTeams, selectedTeamId]);

  const selectedTeam =
    (selectedTeamId && teams.find((t) => t.id === selectedTeamId)) ||
    filteredTeams[0] ||
    null;

  const teamMembers = React.useMemo(() => {
    if (!selectedTeam) return [];
    const count = Math.min(Math.max(selectedTeam.membersCount || 4, 3), 8);
    return buildTeamMembers(selectedTeam, count);
  }, [selectedTeam]);

  const donutBg = React.useMemo(() => buildDonutGradient(teamMembers), [teamMembers]);
  const overloadCount = teamMembers.filter((m) => m.hours > 40).length;
  const totalHours = teamMembers.reduce((s, m) => s + m.hours, 0);

  function applyFilters() {
    setSearchApplied(searchInput);
    setDeptApplied(deptInput);

    // si la team sélectionnée n'est plus dans les résultats filtrés, on reset
    setSelectedTeamId(null);
  }

  function logout() {
    navigate("/login");
  }

  return (
    <div className="tm-dashboard-shell" onClick={() => menuOpen && setMenuOpen(false)}>
      <header className="tm-dashboard-topbar">
        <div className="tm-logo">
          <div className="tm-logo-icon">
            <span className="tm-logo-clock-hand tm-logo-hand-short" />
            <span className="tm-logo-clock-hand tm-logo-hand-long" />
          </div>
          <span className="tm-logo-text">TIME MANAGER</span>
        </div>

        <div className="tm-topbar-center">
          <div className="tm-topbar-welcome">
            <div className="tm-topbar-title-row">
              <span className="tm-topbar-greeting">Bienvenue, Julie !</span>

              {/* Menu Tableau de Bord */}
              <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="tm-topbar-pill"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  Tableau de Bord <ChevronDown size={14} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      background: "var(--tm-surface)",
                      border: "1px solid var(--tm-border)",
                      borderRadius: 12,
                      boxShadow: "var(--tm-shadow-soft)",
                      minWidth: 220,
                      padding: 8,
                      zIndex: 50,
                    }}
                  >
                    <button
                      className="tm-topbar-pill"
                      style={{ width: "100%", justifyContent: "flex-start" }}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/manager");
                      }}
                      role="menuitem"
                    >
                      <LayoutDashboard size={14} /> Dashboard
                    </button>

                    <button
                      className="tm-topbar-pill"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        marginTop: 6,
                      }}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      role="menuitem"
                    >
                      <User size={14} /> Profil
                    </button>

                    <button
                      className="tm-topbar-pill"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        marginTop: 6,
                      }}
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      role="menuitem"
                    >
                      <LogOut size={14} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="tm-topbar-search-row">
            <div className="tm-topbar-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Rechercher une équipe..."
                aria-label="Rechercher une équipe"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
              />
            </div>

            <div className="tm-topbar-select-group">
              <select
                className="tm-topbar-select"
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                aria-label="Filtrer par département"
              >
                <option value="Tous les départements">Tous les départements</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button className="tm-topbar-filter" onClick={applyFilters}>
                <Filter size={16} />
                Filtrer
              </button>

              <button
                className="tm-topbar-button-primary"
                onClick={() => navigate("/manager/create-team")}
              >
                <Users size={16} />
                Gérer les équipes
              </button>
            </div>
          </div>
        </div>

        <div className="tm-topbar-right">
          <button
            className="tm-icon-button"
            aria-label="Messages"
            onClick={() => alert("À implémenter")}
          >
            <Mail size={18} />
          </button>

          <button
            className="tm-icon-button"
            aria-label="Notifications"
            onClick={() => alert("À implémenter")}
          >
            <Bell size={18} />
          </button>

          {/* Avatar -> Profil */}
          <button
            className="tm-avatar-circle"
            aria-label="Profil"
            onClick={() => navigate("/profile")}
            style={{ border: "none", cursor: "pointer" }}
          >
            <User size={18} />
          </button>
        </div>
      </header>

      <main className="tm-dashboard-main">
        <div className="tm-kpi-grid">
          <KpiCard label="Heures Travaillées" value="35h 20m" helper="Cette semaine" />
          <KpiCard label="Heures Supplémentaires" value="5h 30m" helper="Cette semaine" />
          <KpiCard label="Retards" value="2" helper="cette semaine" tone="danger" />
          <KpiCard label="Congés Restants" value="8 jours" helper="solde actuel" tone="success" />
        </div>

        <div className="tm-layout-columns">
          {/* COLONNE GAUCHE */}
          <div className="tm-layout-col">
            <SectionCard
              title="Mes Pointages"
              icon={<Clock size={16} />}
              className="tm-section-card-medium"
            >
              <p className="tm-text-row">
                Dernier pointage : <strong>Entrée à 09:00 AM</strong>
              </p>
              <div className="tm-pointing-actions">
                <button className="tm-button-outline tm-button-success">Pointer Entrée</button>
                <button className="tm-button-outline tm-button-danger">Pointer Sortie</button>
              </div>
            </SectionCard>

            <SectionCard
              title="Mes Activités"
              icon={<CheckCircle2 size={16} />}
              className="tm-section-card-tall"
            >
              <div className="tm-chart-placeholder">
                <div className="tm-chart-bars">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day, index) => (
                    <div key={day} className="tm-chart-bar-item">
                      <div className="tm-chart-bar" style={{ height: `${70 + index * 12}px` }} />
                      <span className="tm-chart-bar-label">{day}</span>
                    </div>
                  ))}
                </div>
                <div className="tm-chart-total">
                  <span>Total semaine</span>
                  <strong>32h 10m</strong>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Cross cutting Concerns">
              <ul className="tm-list">
                <li>JWT + RBAC obligatoire</li>
                <li>Audit logs par actions sensibles</li>
                <li>Transactions ACID (paie)</li>
              </ul>
            </SectionCard>
          </div>

          {/* COLONNE DROITE */}
          <div className="tm-layout-col">
            <SectionCard
              title="Gestion d'Équipes"
              icon={<Users size={16} />}
              className="tm-section-card-medium"
            >
              <div className="tm-team-management">
                <button
                  className="tm-button-create-team"
                  onClick={() => navigate("/manager/create-team")}
                >
                  <Plus size={18} />
                  Créer une équipe
                </button>

                <div className="tm-team-list">
                  {filteredTeams.map((t) => {
                    const active = selectedTeam && t.id === selectedTeam.id;
                    return (
                      <div
                        key={t.id}
                        className="tm-team-item"
                        onClick={() => setSelectedTeamId(t.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setSelectedTeamId(t.id);
                        }}
                        style={{
                          borderColor: active ? "var(--tm-primary)" : undefined,
                          backgroundColor: active ? "#ffffff" : undefined,
                        }}
                      >
                        <span className="tm-team-name">{t.name}</span>
                        <span className="tm-team-count">{t.membersCount ?? 0} membres</span>
                      </div>
                    );
                  })}

                  {filteredTeams.length === 0 && (
                    <div className="tm-kpi-helper" style={{ padding: "8px 4px" }}>
                      Aucune équipe ne correspond à tes filtres.
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Rapport dynamique */}
            <SectionCard
              title="Rapport d'Équipe"
              icon={<Clock size={16} />}
              className="tm-section-card-tall"
            >
              {!selectedTeam ? (
                <div className="tm-kpi-helper">Sélectionne une équipe pour voir le rapport.</div>
              ) : (
                <div className="tm-team-report">
                  {/* Donut fonctionnel */}
                  <div
                    className="tm-pie-placeholder"
                    style={{
                      background: donutBg,
                      border: `1px solid var(--tm-border)`,
                    }}
                    title="Répartition de la charge (heures)"
                  >
                    {/* trou au centre */}
                    <div
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: "50%",
                        background: "white",
                        border: `1px solid var(--tm-border)`,
                      }}
                    />
                  </div>

                  {/* Liste membres */}
                  <div className="tm-team-legend" style={{ gap: 10 }}>
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: "var(--tm-text-main)" }}>
                        {selectedTeam.name}
                      </div>

                      <div className="tm-kpi-helper">
                        Total équipe : <strong>{toHHMM(totalHours)}</strong>
                        {overloadCount > 0 && (
                          <>
                            {" "}
                            ·{" "}
                            <span style={{ color: "var(--tm-danger)", fontWeight: 600 }}>
                              ⚠ {overloadCount} surcharge(s) &gt; 40h
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {teamMembers
                      .slice()
                      .sort((a, b) => b.hours - a.hours)
                      .map((m, idx) => {
                        const colors = [
                          "#367ecc",
                          "#2da169",
                          "#dd5840",
                          "#f6a42a",
                          "#8faeb6",
                          "#3c628c",
                        ];
                        const color = colors[idx % colors.length];
                        const overloaded = m.hours > 40;

                        return (
                          <div className="tm-team-legend-item" key={m.id}>
                            <span className="tm-dot" style={{ backgroundColor: color }} />
                            <span>
                              {m.firstname} {m.lastname}
                              {overloaded && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    color: "var(--tm-danger)",
                                    fontWeight: 700,
                                  }}
                                >
                                  ⚠
                                </span>
                              )}
                            </span>
                            <strong>{toHHMM(m.hours)}</strong>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Tâches à Faire"
              icon={<Coffee size={16} />}
              className="tm-section-card-medium"
            >
              <ul className="tm-task-list">
                <li>
                  <input type="checkbox" /> Préparer le rapport mensuel
                </li>
                <li>
                  <input type="checkbox" /> Réunion équipe à 11h
                </li>
                <li>
                  <input type="checkbox" /> Mettre à jour le planning
                </li>
              </ul>
            </SectionCard>

            <SectionCard title="Cross cutting Concerns" icon={<AlertCircle size={16} />}>
              <ul className="tm-list">
                <li>Audit logs sur actions sensibles</li>
                <li>Contrôles de conformité paie</li>
                <li>Alertes de surcharge / burnout</li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}

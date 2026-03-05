import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { DEPARTMENTS, loadTeams, saveTeams, uid } from "./store/teamsStore";

export default function CreateTeam() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState(() => loadTeams());

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Informatique");
  const [membersCount, setMembersCount] = useState(3);

  const canSubmit = useMemo(() => name.trim().length >= 3, [name]);

  function addTeam(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const next = [
      {
        id: uid(),
        name: name.trim(),
        department,
        membersCount: Number(membersCount) || 0,
      },
      ...teams,
    ];

    setTeams(next);
    saveTeams(next);

    setName("");
    setDepartment("Informatique");
    setMembersCount(3);
  }

  function renameTeam(id) {
    const nextName = prompt("Nouveau nom d’équipe :");
    if (!nextName || nextName.trim().length < 3) return;

    const next = teams.map((t) => (t.id === id ? { ...t, name: nextName.trim() } : t));
    setTeams(next);
    saveTeams(next);
  }

  function deleteTeam(id) {
    if (!confirm("Supprimer cette équipe ?")) return;
    const next = teams.filter((t) => t.id !== id);
    setTeams(next);
    saveTeams(next);
  }

  return (
    <div className="tm-dashboard-shell">
      <header className="tm-dashboard-topbar">
        <div className="tm-logo">
          <div className="tm-logo-icon">
            <span className="tm-logo-clock-hand tm-logo-hand-short" />
            <span className="tm-logo-clock-hand tm-logo-hand-long" />
          </div>
          <span className="tm-logo-text">TIME MANAGER</span>
        </div>

        <div className="tm-topbar-right">
          <button className="tm-topbar-pill" onClick={() => navigate("/manager")}>
            <ArrowLeft size={14} /> Retour dashboard
          </button>
        </div>
      </header>

      <main className="tm-dashboard-main">
        <div className="tm-layout-columns">
          <div className="tm-layout-col">
            <section className="tm-section-card tm-section-card-medium">
              <header className="tm-section-card-header">
                <div className="tm-section-card-title">
                  <span className="tm-section-card-icon">
                    <Plus size={16} />
                  </span>
                  <h2>Créer une équipe</h2>
                </div>
              </header>

              <div className="tm-section-card-body" style={{ justifyContent: "flex-start" }}>
                <form className="tm-form" onSubmit={addTeam}>
                  <div className="tm-form-field">
                    <label className="tm-label">Nom de l’équipe</label>
                    <input
                      className="tm-input"
                      placeholder="Ex : Équipe Data"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="tm-form-field">
                    <label className="tm-label">Département</label>
                    <select
                      className="tm-input"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {DEPARTMENTS.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tm-form-field">
                    <label className="tm-label">Nombre de membres (approx.)</label>
                    <input
                      className="tm-input"
                      type="number"
                      min="0"
                      value={membersCount}
                      onChange={(e) => setMembersCount(e.target.value)}
                    />
                  </div>

                  <button className="tm-button-primary" disabled={!canSubmit}>
                    Créer l’équipe
                  </button>
                </form>
              </div>
            </section>
          </div>

          <div className="tm-layout-col">
            <section className="tm-section-card tm-section-card-tall">
              <header className="tm-section-card-header">
                <div className="tm-section-card-title">
                  <span className="tm-section-card-icon">
                    <Users size={16} />
                  </span>
                  <h2>Équipes existantes</h2>
                </div>
              </header>

              <div className="tm-section-card-body" style={{ justifyContent: "flex-start" }}>
                <div className="tm-team-list">
                  {teams.map((t) => (
                    <div className="tm-team-item" key={t.id} style={{ cursor: "default" }}>
                      <div>
                        <div className="tm-team-name">{t.name}</div>
                        <div className="tm-kpi-helper">{t.department}</div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="tm-team-count">{t.membersCount ?? 0} membres</span>

                        <button className="tm-icon-button" onClick={() => renameTeam(t.id)} aria-label="Renommer">
                          <Pencil size={16} />
                        </button>

                        <button className="tm-icon-button" onClick={() => deleteTeam(t.id)} aria-label="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

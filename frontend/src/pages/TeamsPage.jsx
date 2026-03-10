import React from "react";

export function TeamsPage({ ctx }) {
  const { isAdmin, isManager, teams, navigate, openEditTeam, setTeamToDelete } = ctx;
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("ALL");

  const teamRole = (team) => {
    const roles = Array.isArray(team?.manager?.roles) ? team.manager.roles : [];
    if (roles.includes("ADMIN")) return "ADMIN";
    if (roles.includes("MANAGER")) return "MANAGER";
    if (roles.includes("EMPLOYEE")) return "EMPLOYEE";
    return "UNASSIGNED";
  };

  const teamRoleLabel = (team) => {
    const r = teamRole(team);
    if (r === "ADMIN") return "Admin";
    if (r === "MANAGER") return "Manager";
    if (r === "EMPLOYEE") return "Employe";
    return "Non assigne";
  };

  const filtered = (teams || [])
    .filter((t) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = `${t.name || ""} ${t.department || ""} ${t.manager?.displayName || ""} ${teamRoleLabel(t)}`.toLowerCase();
      return hay.includes(q);
    })
    .filter((t) => (roleFilter === "ALL" ? true : teamRole(t) === roleFilter))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Gestion Teams</h3>
      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate("/teams/createteam")} className="tm-btn tm-btn-primary">
            Creer une equipe
          </button>
        </div>
      )}

      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (team, service, manager, role)"
            className="tm-input"
            style={{ minWidth: 280, maxWidth: 480 }}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="tm-input" style={{ width: 180 }}>
            <option value="ALL">Tous les roles</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
            <option value="EMPLOYEE">Employe</option>
            <option value="UNASSIGNED">Non assigne</option>
          </select>
        </div>
      )}

      {filtered.length ? (
        <div style={{ overflowX: "auto", border: "1px solid var(--tm-border)", borderRadius: "var(--tm-radius-md)", background: "var(--tm-surface)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--tm-surface-soft)" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Equipe</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Service</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Role team</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Nb utilisateurs</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Manager</th>
                <th style={{ textAlign: "right", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)", color: "var(--tm-text-main)" }}>{t.name}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>{t.department || "N/A"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>{teamRoleLabel(t)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>{t._count?.members ?? t.members?.length ?? 0}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>{t.manager?.displayName || "N/A"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button type="button" onClick={() => openEditTeam(t)} className="tm-btn">Modifier</button>
                      <button type="button" onClick={() => setTeamToDelete(t)} className="tm-btn tm-btn-danger">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="tm-card"
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--tm-text-muted)",
            fontSize: 13,
          }}
          role="status"
        >
          <p style={{ margin: 0 }}>Aucune équipe pour le moment.</p>
          {(isAdmin || isManager) && (
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              Cliquez sur « Creer une equipe » pour en ajouter une.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

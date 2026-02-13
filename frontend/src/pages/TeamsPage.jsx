import React from "react";

export function TeamsPage({ ctx }) {
  const { isAdmin, isManager, teams, navigate, openEditTeam, setTeamToDelete } = ctx;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Gestion Teams</h3>
      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => navigate("/teams/createteam")}
            className="tm-btn tm-btn-primary"
          >
            Creer une equipe
          </button>
        </div>
      )}
      {teams.length ? (
        <div>
          {teams.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--tm-border)",
                borderRadius: "var(--tm-radius-md)",
                marginBottom: 8,
                background: "var(--tm-surface-soft)",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ color: "var(--tm-text-main)" }}>{t.name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => openEditTeam(t)} className="tm-btn">Modifier</button>
                <button type="button" onClick={() => setTeamToDelete(t)} className="tm-btn tm-btn-danger">Supprimer</button>
              </div>
            </div>
          ))}
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
              Cliquez sur &laquo; Creer une equipe &raquo; pour en ajouter une.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import React from "react";

export function TeamsPage({ ctx }) {
  const { isAdmin, isManager, teams, navigate, openEditTeam, setTeamToDelete } = ctx;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Teams</h3>
      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => navigate("/teams/createteam")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}
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
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                marginBottom: 8,
                background: "#f9fafb",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>{t.name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => openEditTeam(t)}
                  style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#fff", fontSize: 12 }}
                >
                  Modifier
                </button>
                <button
                  onClick={() => setTeamToDelete(t)}
                  style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#fff", fontSize: 12 }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Aucune equipe.</div>
      )}
    </div>
  );
}

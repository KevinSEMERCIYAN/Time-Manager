import React from "react";

export function EditTeamModal({
  open,
  users,
  currentUserId,
  editTeamName,
  setEditTeamName,
  editTeamDescription,
  setEditTeamDescription,
  editTeamMembers,
  setEditTeamMembers,
  onCancel,
  onSave,
}) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
      >
        <h3 style={{ margin: "0 0 6px" }}>Modifier l’equipe</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Nom de l’equipe</label>
          <input
            value={editTeamName}
            onChange={(e) => setEditTeamName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Description</label>
          <input
            value={editTeamDescription}
            onChange={(e) => setEditTeamDescription(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Utilisateurs</label>
          <div style={{ display: "grid", gap: 8, maxHeight: 260, overflow: "auto" }}>
            {users
              .filter((u) => u.id !== currentUserId)
              .map((u) => {
                const checked = editTeamMembers.includes(u.id);
                return (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...editTeamMembers, u.id]
                          : editTeamMembers.filter((m) => m !== u.id);
                        setEditTeamMembers(next);
                      }}
                    />
                    <span style={{ fontSize: 13 }}>{u.displayName || u.username}</span>
                  </label>
                );
              })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: 8, background: "#fff" }}>
            Annuler
          </button>
          <button onClick={onSave} style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

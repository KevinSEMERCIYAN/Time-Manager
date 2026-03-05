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
        className="tm-card"
        style={{ width: "100%", maxWidth: 520, padding: 20 }}
      >
        <h3 style={{ margin: "0 0 6px", color: "var(--tm-text-main)" }}>Modifier l’equipe</h3>

        <div style={{ marginBottom: 12 }}>
          <label className="tm-text-muted" style={{ display: "block", marginBottom: 6 }}>Nom de l’equipe</label>
          <input
            value={editTeamName}
            onChange={(e) => setEditTeamName(e.target.value)}
            className="tm-input"
            style={{ width: "100%", padding: "10px 12px" }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="tm-text-muted" style={{ display: "block", marginBottom: 6 }}>Description</label>
          <input
            value={editTeamDescription}
            onChange={(e) => setEditTeamDescription(e.target.value)}
            className="tm-input"
            style={{ width: "100%", padding: "10px 12px" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="tm-text-muted" style={{ display: "block", marginBottom: 6 }}>Utilisateurs</label>
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
                    <span style={{ fontSize: 13, color: "var(--tm-text-main)" }}>{u.displayName || u.username}</span>
                  </label>
                );
              })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} className="tm-btn" style={{ flex: 1 }}>Annuler</button>
          <button type="button" onClick={onSave} className="tm-btn tm-btn-primary" style={{ flex: 1 }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

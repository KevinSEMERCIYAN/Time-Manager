import React from "react";

export function CreateTeamPage({ ctx }) {
  const {
    isAdmin,
    users,
    user,
    newTeamName,
    setNewTeamName,
    newTeamDescription,
    setNewTeamDescription,
    managerDropdownOpen,
    setManagerDropdownOpen,
    selectedManagerId,
    setSelectedManagerId,
    memberDropdownOpen,
    setMemberDropdownOpen,
    selectedMembers,
    setSelectedMembers,
    createTeam,
    createTeamLoading,
  } = ctx;

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    width: "100%",
    maxWidth: 520,
    marginTop: 6,
    background: "var(--tm-surface)",
    border: "1px solid var(--tm-border)",
    borderRadius: "var(--tm-radius-md)",
    boxShadow: "var(--tm-shadow-soft)",
    zIndex: 20,
    maxHeight: 260,
    overflowY: "auto",
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Creer une equipe</h3>

      <div style={{ marginBottom: 12 }}>
        <label className="tm-text-muted" style={{ display: "block", marginBottom: 6 }}>Nom de l'equipe</label>
        <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required className="tm-input" style={{ width: "100%", maxWidth: 520, padding: "10px 12px" }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="tm-text-muted" style={{ display: "block", marginBottom: 6 }}>Description</label>
        <input value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} className="tm-input" style={{ width: "100%", maxWidth: 520, padding: "10px 12px" }} />
      </div>

      {isAdmin && (
        <div style={{ marginBottom: 12, position: "relative" }}>
          <label className="tm-text-muted" style={{ display: "block", marginBottom: 6 }}>Manager</label>
          <button type="button" onClick={() => setManagerDropdownOpen((v) => !v)} className="tm-input" style={{ width: "100%", maxWidth: 520, padding: "10px 12px", textAlign: "left", cursor: "pointer" }}>
            {selectedManagerId ? users.find((u) => u.id === selectedManagerId)?.displayName || "Manager selectionne" : "Selectionner un manager"}
          </button>
          {managerDropdownOpen && (
            <div style={{ ...dropdownStyle, maxHeight: 220 }}>
              {users
                .filter((u) => u.isActive !== false)
                .filter((u) => !u.isDeleted)
                .filter((u) => Array.isArray(u.roles) && u.roles.includes("MANAGER"))
                .map((u) => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                    <input type="radio" name="team-manager" checked={selectedManagerId === u.id} onChange={() => setSelectedManagerId(u.id)} />
                    <span style={{ fontSize: 13, color: "var(--tm-text-main)" }}>{u.displayName || u.username}</span>
                  </label>
                ))}
              {!users.some((u) => Array.isArray(u.roles) && u.roles.includes("MANAGER")) && <div className="tm-text-muted" style={{ padding: "8px 10px" }}>Aucun manager disponible.</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 12, position: "relative" }}>
        <label className="tm-text-muted" style={{ display: "block", marginBottom: 6 }}>Employes</label>
        <button type="button" onClick={() => setMemberDropdownOpen((v) => !v)} className="tm-input" style={{ width: "100%", maxWidth: 520, padding: "10px 12px", textAlign: "left", cursor: "pointer" }}>
          {selectedMembers.length
            ? selectedMembers.map((id) => users.find((u) => u.id === id)?.displayName || users.find((u) => u.id === id)?.username || id).join("; ")
            : "Selectionner des employes"}
        </button>
        {memberDropdownOpen && (
          <div style={dropdownStyle}>
            {users.length ? (
              users
                .filter((u) => u.isActive !== false)
                .filter((u) => !u.isDeleted)
                .filter((u) => (isAdmin ? true : u.id !== user?.id))
                .map((u) => {
                  const checked = selectedMembers.includes(u.id);
                  return (
                    <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked ? [...selectedMembers, u.id] : selectedMembers.filter((m) => m !== u.id);
                          setSelectedMembers(next);
                        }}
                      />
                      <span style={{ fontSize: 13, color: "var(--tm-text-main)" }}>{u.displayName || u.username}</span>
                    </label>
                  );
                })
            ) : (
              <div className="tm-text-muted" style={{ padding: "8px 10px" }}>Aucun employe disponible.</div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={createTeam}
        disabled={(isAdmin && !selectedManagerId) || createTeamLoading}
        className="tm-btn tm-btn-primary"
        style={{ width: "100%", padding: "10px 12px", opacity: (isAdmin && !selectedManagerId) || createTeamLoading ? 0.6 : 1 }}
      >
        {createTeamLoading ? "Création…" : "Creer l'equipe"}
      </button>
    </div>
  );
}

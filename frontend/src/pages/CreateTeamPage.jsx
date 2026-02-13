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
  } = ctx;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Creer une equipe</h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Nom de l’equipe</label>
        <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required style={{ width: "100%", maxWidth: 520, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Description</label>
        <input value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} style={{ width: "100%", maxWidth: 520, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }} />
      </div>

      {isAdmin && (
        <div style={{ marginBottom: 12, position: "relative" }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Manager</label>
          <button type="button" onClick={() => setManagerDropdownOpen((v) => !v)} style={{ width: "100%", maxWidth: 520, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", textAlign: "left", cursor: "pointer" }}>
            {selectedManagerId ? users.find((u) => u.id === selectedManagerId)?.displayName || "Manager selectionne" : "Selectionner un manager"}
          </button>
          {managerDropdownOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", maxWidth: 520, marginTop: 6, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,0.08)", zIndex: 20, maxHeight: 220, overflowY: "auto" }}>
              {users
                .filter((u) => u.isActive !== false)
                .filter((u) => !u.isDeleted)
                .filter((u) => Array.isArray(u.roles) && u.roles.includes("MANAGER"))
                .map((u) => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                    <input type="radio" name="team-manager" checked={selectedManagerId === u.id} onChange={() => setSelectedManagerId(u.id)} />
                    <span style={{ fontSize: 13 }}>{u.displayName || u.username}</span>
                  </label>
                ))}
              {!users.some((u) => Array.isArray(u.roles) && u.roles.includes("MANAGER")) && <div style={{ padding: "8px 10px", fontSize: 12, color: "#6b7280" }}>Aucun manager disponible.</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 12, position: "relative" }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Employes</label>
        <button type="button" onClick={() => setMemberDropdownOpen((v) => !v)} style={{ width: "100%", maxWidth: 520, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", textAlign: "left", cursor: "pointer" }}>
          {selectedMembers.length
            ? selectedMembers.map((id) => users.find((u) => u.id === id)?.displayName || users.find((u) => u.id === id)?.username || id).join("; ")
            : "Selectionner des employes"}
        </button>
        {memberDropdownOpen && (
          <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", maxWidth: 520, marginTop: 6, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,0.08)", zIndex: 20, maxHeight: 260, overflowY: "auto" }}>
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
                      <span style={{ fontSize: 13 }}>{u.displayName || u.username}</span>
                    </label>
                  );
                })
            ) : (
              <div style={{ padding: "8px 10px", fontSize: 12, color: "#6b7280" }}>Aucun employe disponible.</div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={createTeam}
        disabled={isAdmin && !selectedManagerId}
        style={{
          width: "100%",
          border: "none",
          padding: "10px 12px",
          borderRadius: 8,
          background: isAdmin && !selectedManagerId ? "#9ca3af" : "#2563eb",
          color: "white",
          cursor: isAdmin && !selectedManagerId ? "not-allowed" : "pointer",
        }}
      >
        Creer l’equipe
      </button>
    </div>
  );
}

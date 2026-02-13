import React from "react";

export function MembersPage({ ctx }) {
  const { isAdmin, isManager, users, navigate, openClockModal } = ctx;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Employees</h3>
      <div style={{ marginBottom: 12 }}>
        {(isAdmin || isManager) && (
          <button
            onClick={() => navigate("/members/create")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}
          >
            Creer un utilisateur
          </button>
        )}
      </div>
      {(isAdmin || isManager) ? (
        <div style={{ display: "grid", gap: 8 }}>
          {users
            .filter((u) => u.isActive !== false)
            .filter((u) => !u.isDeleted)
            .filter((u) => u.isProvisioned)
            .filter((u) => {
              if (isAdmin) return true;
              const rolesList = Array.isArray(u?.roles) ? u.roles : [];
              return !rolesList.includes("MANAGER") && !rolesList.includes("ADMIN");
            })
            .map((u) => (
              <div
                key={u.id}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => navigate(`/members/${u.id}`)}
                  style={{ border: "none", background: "transparent", textAlign: "left", cursor: "pointer", fontSize: 13, padding: 0 }}
                >
                  {u.displayName || u.username}
                </button>
                {(isAdmin || isManager) && (
                  <button
                    onClick={() => openClockModal(u)}
                    style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#111827", color: "white", fontSize: 12 }}
                  >
                    Pointer
                  </button>
                )}
              </div>
            ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Acces reserve aux managers.</div>
      )}
    </div>
  );
}

import React from "react";

export function MembersPage({ ctx }) {
  const { isAdmin, isManager, users, navigate, openClockModal } = ctx;

  const memberList = (isAdmin || isManager)
    ? users
        .filter((u) => u.isActive !== false)
        .filter((u) => !u.isDeleted)
        .filter((u) => u.isProvisioned)
        .filter((u) => {
          if (isAdmin) return true;
          const rolesList = Array.isArray(u?.roles) ? u.roles : [];
          return !rolesList.includes("MANAGER") && !rolesList.includes("ADMIN");
        })
    : [];

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Gestion Employees</h3>
      <div style={{ marginBottom: 12 }}>
        {(isAdmin || isManager) && (
          <button type="button" onClick={() => navigate("/members/create")} className="tm-btn tm-btn-primary">
            Creer un utilisateur
          </button>
        )}
      </div>
      {(isAdmin || isManager) ? (
        memberList.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {memberList.map((u) => (
              <div
                key={u.id}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--tm-border)",
                  borderRadius: "var(--tm-radius-md)",
                  background: "var(--tm-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/members/${u.id}`)}
                  style={{ border: "none", background: "transparent", textAlign: "left", cursor: "pointer", fontSize: 13, padding: 0, color: "var(--tm-text-main)" }}
                >
                  {u.displayName || u.username}
                </button>
                {(isAdmin || isManager) && (
                  <button type="button" onClick={() => openClockModal(u)} className="tm-btn tm-btn-primary" style={{ padding: "6px 10px" }}>
                    Pointer
                  </button>
                )}
              </div>
            ))}
        </div>
        ) : (
        <div
          className="tm-card"
          style={{ padding: 24, textAlign: "center", color: "var(--tm-text-muted)", fontSize: 13 }}
          role="status"
        >
          <p style={{ margin: 0 }}>Aucun employé pour le moment.</p>
          <p style={{ marginTop: 8, marginBottom: 0 }}>
            Cliquez sur &laquo; Creer un utilisateur &raquo; pour en ajouter un.
          </p>
        </div>
        )
      ) : (
        <div
          className="tm-card"
          style={{ padding: 24, textAlign: "center", color: "var(--tm-text-muted)", fontSize: 13 }}
          role="status"
        >
          Accès réservé aux managers.
        </div>
      )}
    </div>
  );
}

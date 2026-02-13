import React from "react";

export function DashboardShell({ ctx, options = {}, footerLeft = null, footerRight = null, children }) {
  const {
    navigate,
    isAdmin,
    isManager,
    user,
    roles,
    openClockModal,
    period,
    setPeriod,
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    reportLoading,
    onLogout,
  } = ctx;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/dashboard")} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>
            Dashboard
          </button>
          <button onClick={() => navigate("/profile")} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>
            Mon profil
          </button>
          {(isAdmin || isManager) && (
            <button onClick={() => navigate("/teams")} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>
              Gestion teams
            </button>
          )}
          {(isAdmin || isManager) && (
            <button onClick={() => navigate("/members")} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>
              Gestion employés
            </button>
          )}
        </div>

        {options.showUserPanel && (
          <div style={{ display: "grid", gap: 8, justifyItems: "end", textAlign: "right", marginTop: -6, marginRight: -4 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Utilisateur</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{user?.displayName || user?.username}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Rôles: {roles.length ? roles.join(", ") : "Aucun"}</div>
            </div>
            <button onClick={() => openClockModal(user)} style={{ border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: 8, background: "#111827", color: "white" }}>
              Pointage
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {options.showFilters ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { key: "week", label: "Semaine" },
              { key: "month", label: "Mois" },
              { key: "year", label: "Année" },
            ].map((p) => {
              const active = period === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => {
                    setPeriod(p.key);
                    setRangeStart("");
                    setRangeEnd("");
                  }}
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: active ? "#111827" : "#fff",
                    color: active ? "#fff" : "#111827",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            {reportLoading && <span style={{ marginLeft: 6, fontSize: 12, color: "#6b7280" }}>Chargement…</span>}
            <div style={{ marginLeft: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>à</span>
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
              {(rangeStart || rangeEnd) && (
                <button
                  onClick={() => {
                    setRangeStart("");
                    setRangeEnd("");
                  }}
                  style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 999, background: "#fff", color: "#111827", fontSize: 12, cursor: "pointer" }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        <div />
      </div>

      {children}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{footerLeft}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {footerRight}
          {options.showLogoutFooter !== false && (
            <button onClick={onLogout} style={{ border: "none", padding: "8px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}>
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

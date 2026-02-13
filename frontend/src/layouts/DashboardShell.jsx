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
          <button type="button" onClick={() => navigate("/dashboard")} className="tm-btn">Dashboard</button>
          <button type="button" onClick={() => navigate("/my-clocks")} className="tm-btn">Mes pointages</button>
          <button type="button" onClick={() => navigate("/profile")} className="tm-btn">Mon profil</button>
          {(isAdmin || isManager) && (
            <button type="button" onClick={() => navigate("/teams")} className="tm-btn">Gestion teams</button>
          )}
          {(isAdmin || isManager) && (
            <button type="button" onClick={() => navigate("/members")} className="tm-btn">Gestion employés</button>
          )}
        </div>

        {options.showUserPanel && (
          <div style={{ display: "grid", gap: 8, justifyItems: "end", textAlign: "right", marginTop: -6, marginRight: -4 }}>
            <div>
              <div className="tm-text-muted">Utilisateur</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--tm-text-main)" }}>{user?.displayName || user?.username}</div>
              <div className="tm-text-muted" style={{ marginTop: 6 }}>Rôles: {roles.length ? roles.join(", ") : "Aucun"}</div>
            </div>
            <button type="button" onClick={() => openClockModal(user)} className="tm-btn tm-btn-primary">Pointage</button>
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
                  type="button"
                  onClick={() => {
                    setPeriod(p.key);
                    setRangeStart("");
                    setRangeEnd("");
                  }}
                  className={active ? "tm-btn tm-btn-primary" : "tm-btn"}
                  style={{ borderRadius: 999 }}
                >
                  {p.label}
                </button>
              );
            })}
            {reportLoading && <span className="tm-text-muted" style={{ marginLeft: 6 }}>Chargement…</span>}
            <div style={{ marginLeft: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="tm-input" />
              <span className="tm-text-muted">à</span>
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="tm-input" />
              {(rangeStart || rangeEnd) && (
                <button type="button" onClick={() => { setRangeStart(""); setRangeEnd(""); }} className="tm-btn" style={{ borderRadius: 999 }}>
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
            <button type="button" onClick={onLogout} className="tm-btn tm-btn-danger">Se déconnecter</button>
          )}
        </div>
      </div>
    </div>
  );
}

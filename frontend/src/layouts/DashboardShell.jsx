import React from "react";
import { Bell, Mail, User, Clock } from "lucide-react";

export function DashboardShell({ ctx, options = {}, footerLeft = null, footerRight = null, children }) {
  const {
    navigate,
    route,
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
    users,
    impersonateUser,
    devLoginAs,
  } = ctx;

  const isActive = (path) => path === route || (path === "/members" && route.startsWith("/members/"));
  const navBtn = (path, label) => (
    <button
      type="button"
      onClick={() => navigate(path)}
      className={isActive(path) ? "tm-topbar-pill tm-topbar-pill-active" : "tm-topbar-pill"}
    >
      {label}
    </button>
  );

  return (
    <div className="tm-dashboard-shell">
      <header className="tm-dashboard-topbar">
        <div className="tm-logo">
          <div className="tm-logo-icon">
            <span className="tm-logo-clock-hand tm-logo-hand-short" />
            <span className="tm-logo-clock-hand tm-logo-hand-long" />
          </div>
          <span className="tm-logo-text">TIME MANAGER</span>
        </div>

        <div className="tm-topbar-center">
          <div className="tm-topbar-welcome">
            <div className="tm-topbar-title-row">
              <span className="tm-topbar-greeting">
                {user ? `Bienvenue, ${user.displayName || user.username} !` : "Bienvenue"}
              </span>
            </div>
          </div>

          <div className="tm-topbar-search-row">
            <div className="tm-topbar-select-group" style={{ flexWrap: "wrap" }}>
              {navBtn("/dashboard", "Dashboard")}
              {navBtn("/my-clocks", "Mes pointages")}
              {navBtn("/profile", "Mon profil")}
              {(isAdmin || isManager) && navBtn("/teams", "Gestion équipes")}
              {(isAdmin || isManager) && navBtn("/members", "Gestion employés")}
            </div>
          </div>
        </div>

        <div className="tm-topbar-right">
          <div style={{ display: "flex", gap: 4, marginRight: 4 }}>
              <button
                type="button"
                className="tm-topbar-pill"
                style={{ fontSize: 11 }}
                onClick={() => {
                  if (!isAdmin) {
                    devLoginAs("employee");
                    return;
                  }
                  // En mode admin, on privilégie un compte de démo riche (employee01) pour la projection.
                  const preferred = (users || []).find((u) => u.username === "employee01");
                  if (preferred) {
                    impersonateUser(preferred.id);
                    return;
                  }
                  const target = (users || []).find((u) => {
                    const r = Array.isArray(u.roles) ? u.roles : [];
                    const isEmployee = r.includes("EMPLOYEE") || r.includes("ROLE_EMPLOYEE");
                    const isManagerRole = r.includes("MANAGER") || r.includes("ROLE_MANAGER");
                    const isAdminRole = r.includes("ADMIN") || r.includes("ROLE_ADMIN");
                    return isEmployee && !isManagerRole && !isAdminRole;
                  });
                  if (target) {
                    impersonateUser(target.id);
                  } else {
                    devLoginAs("employee");
                  }
                }}
              >
                Vue employé
              </button>
              <button
                type="button"
                className="tm-topbar-pill"
                style={{ fontSize: 11 }}
                onClick={() => {
                  if (!isAdmin) {
                    devLoginAs("manager");
                    return;
                  }
                  // En mode admin, on privilégie le compte de démo "manager" s'il existe.
                  const preferred = (users || []).find((u) => u.username === "manager");
                  if (preferred) {
                    impersonateUser(preferred.id);
                    return;
                  }
                  const target = (users || []).find((u) => {
                    const r = Array.isArray(u.roles) ? u.roles : [];
                    const isManagerRole = r.includes("MANAGER") || r.includes("ROLE_MANAGER");
                    const isAdminRole = r.includes("ADMIN") || r.includes("ROLE_ADMIN");
                    return isManagerRole && !isAdminRole;
                  });
                  if (target) {
                    impersonateUser(target.id);
                  } else {
                    devLoginAs("manager");
                  }
                }}
              >
                Vue manager
              </button>
              <button
                type="button"
                className="tm-topbar-pill"
                style={{ fontSize: 11 }}
                onClick={() => {
                  if (!isAdmin) {
                    devLoginAs("admin");
                    return;
                  }
                  // En mode admin, on revient en priorité sur le compte de démo "admin".
                  const preferred = (users || []).find((u) => u.username === "admin");
                  if (preferred) {
                    impersonateUser(preferred.id);
                    return;
                  }
                  const target = (users || []).find((u) => {
                    const r = Array.isArray(u.roles) ? u.roles : [];
                    return r.includes("ADMIN") || r.includes("ROLE_ADMIN");
                  });
                  if (target) {
                    impersonateUser(target.id);
                  } else {
                    devLoginAs("admin");
                  }
                }}
              >
                Vue admin
              </button>
            </div>

          <button
            className="tm-icon-button"
            aria-label="Messages"
            onClick={() => window.alert("À implémenter")}
          >
            <Mail size={18} />
          </button>

          <button
            className="tm-icon-button"
            aria-label="Notifications"
            onClick={() => window.alert("À implémenter")}
          >
            <Bell size={18} />
          </button>

          {options.showUserPanel && (
            <>
              <button
                className="tm-topbar-pill"
                style={{ fontSize: 12 }}
                onClick={() => openClockModal(user)}
              >
                <Clock size={14} /> Pointer
              </button>
              <button
                className="tm-avatar-circle"
                aria-label="Profil"
                onClick={() => navigate("/profile")}
                style={{ border: "none", cursor: "pointer" }}
              >
                <User size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="tm-dashboard-main">
        {options.showFilters && (
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
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
                    className={active ? "tm-topbar-pill tm-topbar-pill-active" : "tm-topbar-pill"}
                  >
                    {p.label}
                  </button>
                );
              })}
              {reportLoading && (
                <span className="tm-text-muted" style={{ marginLeft: 6 }}>
                  Chargement…
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="tm-input"
              />
              <span className="tm-text-muted">à</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="tm-input"
              />
              {(rangeStart || rangeEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setRangeStart("");
                    setRangeEnd("");
                  }}
                  className="tm-topbar-pill"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        )}

        {children}

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {footerLeft}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {footerRight}
            {options.showLogoutFooter !== false && (
              <button
                type="button"
                onClick={onLogout}
                className="tm-button-outline tm-button-danger"
              >
                <Clock size={14} style={{ marginRight: 4 }} />
                Se déconnecter
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

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
    teams,
    users,
    reportService,
    setReportService,
    reportLoading,
    onLogout,
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

  const serviceOptions = React.useMemo(() => {
    const out = new Set();
    (teams || []).forEach((t) => {
      if (t?.department) out.add(t.department);
    });
    (users || []).forEach((u) => {
      if (u?.department) out.add(u.department);
    });
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }, [teams, users]);

  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const profileMenuRef = React.useRef(null);

  React.useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const onDocMouseDown = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    const onDocKeyDown = (event) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [profileMenuOpen]);

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
            <div className="tm-topbar-select-group">
              {navBtn("/dashboard", "Dashboard")}
              {navBtn("/my-clocks", "Mes pointages")}
              {(isAdmin || isManager) && navBtn("/reporting", "Reporting")}
              {(isAdmin || isManager) && navBtn("/teams", "Gestion équipes")}
              {(isAdmin || isManager) && navBtn("/members", "Gestion employés")}
            </div>
          </div>
        </div>

        <div className="tm-topbar-right">
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
            <button
              className="tm-topbar-pill"
              style={{ fontSize: 12 }}
              onClick={() => openClockModal(user)}
            >
              <Clock size={14} /> Pointer
            </button>
          )}
          <div className="tm-profile-menu" ref={profileMenuRef}>
            <button
              className="tm-avatar-circle"
              aria-label="Profil"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((v) => !v)}
              style={{ border: "none", cursor: "pointer" }}
            >
              <User size={18} />
            </button>
            {profileMenuOpen && (
              <div className="tm-profile-dropdown" role="menu">
                <button
                  type="button"
                  className="tm-profile-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  Voir mon profil
                </button>
                <button
                  type="button"
                  className="tm-profile-dropdown-item tm-profile-dropdown-item-danger"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onLogout();
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
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

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
              {isAdmin && (
                <select
                  value={reportService}
                  onChange={(e) => setReportService(e.target.value)}
                  className="tm-input"
                  style={{ minWidth: 170 }}
                >
                  <option value="ALL">Tous services</option>
                  {serviceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="tm-input"
                style={{ minWidth: 170 }}
              />
              <span className="tm-text-muted">à</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="tm-input"
                style={{ minWidth: 170 }}
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
          </div>
        </div>
      </main>
    </div>
  );
}

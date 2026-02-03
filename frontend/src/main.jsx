<<<<<<< HEAD
import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>TimeManager</h1>
      <p>Frontend OK.</p>
=======
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

function App() {
  const [route, setRoute] = useState(window.location.pathname || "/");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState(localStorage.getItem("tm_token") || "");
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("tm_username") || "");
  const [currentTeam, setCurrentTeam] = useState(localStorage.getItem("tm_team") || "");
  const [currentDisplayName, setCurrentDisplayName] = useState(localStorage.getItem("tm_display_name") || "");
  const [teams, setTeams] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_teams") || "[]");
      } catch {
        return [];
      }
    })()
  );
  const [users, setUsers] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_users") || "[]");
      } catch {
        return [];
      }
    })()
  );
  const [roles, setRoles] = useState(
    (() => {
      try {
        return JSON.parse(localStorage.getItem("tm_roles") || "[]");
      } catch {
        return [];
      }
    })()
  );
  const [showClockModal, setShowClockModal] = useState(false);

  const isAdmin = roles.includes("ROLE_ADMIN");
  const isManager = roles.includes("ROLE_MANAGER");
  const isEmployee = roles.includes("ROLE_EMPLOYEE");

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
      setRoute(path);
    }
  };

  useEffect(() => {
    const isProtected =
      route === "/clock-in" ||
      route === "/profile" ||
      route === "/dashboard" ||
      route === "/dashboard/members" ||
      route === "/dashboard/teams";

    if (isProtected && !token) {
      navigate("/sign-in");
      return;
    }

    if (token && route === "/sign-in") {
      if (isAdmin || isManager) navigate("/dashboard");
      else navigate("/clock-in");
      return;
    }

    if ((route === "/dashboard" || route.startsWith("/dashboard/")) && !(isAdmin || isManager)) {
      navigate("/clock-in");
    }
  }, [route, token, isAdmin, isManager]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const raw = await res.text();
      let data;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Erreur serveur (${res.status})`);
      }
      if (!res.ok) throw new Error(data?.error || `Erreur serveur (${res.status})`);
      localStorage.setItem("tm_token", data.token);
      localStorage.setItem("tm_roles", JSON.stringify(data.roles || []));
      localStorage.setItem("tm_username", data.username || username);
      localStorage.setItem("tm_team", data.team || "");
      localStorage.setItem("tm_display_name", data.displayName || "");
      localStorage.setItem("tm_teams", JSON.stringify(data.teams || []));
      localStorage.setItem("tm_users", JSON.stringify(data.users || []));
      setToken(data.token);
      setRoles(data.roles || []);
      setCurrentUser(data.username || username);
      setCurrentTeam(data.team || "");
      setCurrentDisplayName(data.displayName || "");
      setTeams(data.teams || []);
      setUsers(data.users || []);
      setPassword("");
      if (data.roles?.includes("ROLE_ADMIN") || data.roles?.includes("ROLE_MANAGER")) {
        navigate("/dashboard");
      } else {
        navigate("/clock-in");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    localStorage.removeItem("tm_token");
    localStorage.removeItem("tm_roles");
    localStorage.removeItem("tm_username");
    localStorage.removeItem("tm_team");
    localStorage.removeItem("tm_display_name");
    localStorage.removeItem("tm_teams");
    localStorage.removeItem("tm_users");
    setToken("");
    setRoles([]);
    setCurrentUser("");
    setCurrentTeam("");
    setCurrentDisplayName("");
    setTeams([]);
    setUsers([]);
    navigate("/sign-in");
  };

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const entries = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tm_time_entries") || "[]");
    } catch {
      return [];
    }
  }, [token, currentUser, now]);

  const today = new Date().toISOString().slice(0, 10);
  const userEntries = entries.filter((e) => e.user === currentUser);
  const todayEntries = userEntries.filter((e) => e.date === today);
  const activeEntry = todayEntries.find((e) => !e.clockOut);

  const saveEntries = (next) => {
    localStorage.setItem("tm_time_entries", JSON.stringify(next));
  };

  const onClockIn = () => {
    if (!currentUser) return;
    const next = [
      ...entries,
      {
        id: `${currentUser}-${Date.now()}`,
        user: currentUser,
        team: currentTeam || null,
        date: today,
        clockIn: new Date().toISOString(),
        clockOut: null,
      },
    ];
    saveEntries(next);
  };

  const onClockOut = () => {
    if (!activeEntry) return;
    const next = entries.map((e) =>
      e.id === activeEntry.id ? { ...e, clockOut: new Date().toISOString() } : e
    );
    saveEntries(next);
  };

  const allUsers = useMemo(() => {
    if (isAdmin && users.length) {
      return users.map((u) => u.username).filter(Boolean).sort();
    }
    const set = new Set(entries.map((e) => e.user));
    if (currentUser) set.add(currentUser);
    return Array.from(set).filter(Boolean).sort();
  }, [entries, currentUser, isAdmin, users]);

  const visibleDashboards = (() => {
    if (isAdmin || isManager) return allUsers.filter((u) => u !== currentUser);
    if (isEmployee) return currentUser ? [currentUser] : [];
    return [];
  })();

  const teamByUser = useMemo(() => {
    const map = new Map();
    for (const u of users) {
      if (u.username && u.team && !map.has(u.username)) {
        map.set(u.username, u.team);
      }
    }
    for (const e of entries) {
      if (e.user && e.team && !map.has(e.user)) {
        map.set(e.user, e.team);
      }
    }
    if (currentUser && currentTeam && !map.has(currentUser)) {
      map.set(currentUser, currentTeam);
    }
    return map;
  }, [entries, currentUser, currentTeam, users]);

  const allTeams = useMemo(() => {
    const set = new Set(teams);
    for (const u of users) if (u.team) set.add(u.team);
    for (const e of entries) if (e.team) set.add(e.team);
    return Array.from(set).filter(Boolean).sort();
  }, [teams, entries, users]);

  const renderLogin = () => (
    <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
      <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
        Nom d’utilisateur
      </label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="ex: ksemerciyan"
        autoComplete="username"
        required
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
        }}
      />
      <label style={{ display: "block", fontSize: 12, color: "#6b7280", margin: "12px 0 6px" }}>
        Mot de passe
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
        }}
      />
      {error && (
        <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 16,
          width: "100%",
          border: "none",
          padding: "10px 12px",
          borderRadius: 8,
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );

  const renderClockIn = () => (
    <div style={{ marginTop: 20 }}>
      <div style={{ padding: 12, borderRadius: 8, background: "#ecfdf3", color: "#065f46" }}>
        Connecté.
      </div>
      <div style={{ marginTop: 12, fontSize: 14, color: "#374151" }}>
        Rôles: {roles.length ? roles.join(", ") : "Aucun"} | Utilisateur: {currentDisplayName || currentUser || "—"} | Team: {currentTeam || "—"}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
        <button
          onClick={() => navigate("/profile")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Mon profil
        </button>
        {(isAdmin || isManager) && (
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Dashboard manager
          </button>
        )}
      </div>

      <div style={{ marginTop: 18, position: "relative" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "#f4f6fb",
            paddingBottom: 10,
            zIndex: 1,
          }}
        >
          <button
            onClick={() => setShowClockModal(true)}
            style={{
              width: "100%",
              border: "none",
              padding: "12px",
              borderRadius: 10,
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Pointer (Clock in / out)
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {new Date(now).toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {new Date(now).toLocaleTimeString("fr-FR")}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Historique aujourd’hui</div>
          {todayEntries.length ? (
            todayEntries.map((e) => (
              <div
                key={e.id}
                style={{
                  padding: "8px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                Entrée: {new Date(e.clockIn).toLocaleTimeString("fr-FR")}
                {e.clockOut ? ` · Sortie: ${new Date(e.clockOut).toLocaleTimeString("fr-FR")}` : " · En cours"}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 13, color: "#6b7280" }}>Aucune entrée aujourd’hui.</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Mon dashboard</h3>
        {currentUser ? (
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#f9fafb",
            }}
          >
            Dashboard de {currentDisplayName || currentUser} {currentTeam ? `· ${currentTeam}` : ""}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#6b7280" }}>Utilisateur inconnu.</div>
        )}
      </div>

      {(isAdmin || isManager) && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Dashboards employés</h3>
          {visibleDashboards.length ? (
            <div>
              {visibleDashboards.map((u) => (
                <div
                  key={u}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    marginBottom: 8,
                    background: "#f9fafb",
                  }}
                >
                  Dashboard de {(users.find((x) => x.username === u)?.displayName || u)} {teamByUser.get(u) ? `· ${teamByUser.get(u)}` : ""}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#6b7280" }}>Aucun dashboard visible pour ce rôle.</div>
          )}
        </div>
      )}

      <button
        onClick={onLogout}
        style={{
          marginTop: 16,
          width: "100%",
          border: "none",
          padding: "10px 12px",
          borderRadius: 8,
          background: "#ef4444",
          color: "white",
          cursor: "pointer",
        }}
      >
        Se déconnecter
      </button>
    </div>
  );

  const renderDashboard = () => (
    <div style={{ marginTop: 20 }}>
      <div style={{ padding: 12, borderRadius: 8, background: "#ecfdf3", color: "#065f46" }}>
        Connecté.
      </div>
      <div style={{ marginTop: 12, fontSize: 14, color: "#374151" }}>
        Rôles: {roles.length ? roles.join(", ") : "Aucun"} | Utilisateur: {currentDisplayName || currentUser || "—"} | Team: {currentTeam || "—"}
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/clock-in")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Pointage
        </button>
        <button
          onClick={() => navigate("/profile")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Mon profil
        </button>
        <button
          onClick={() => navigate("/dashboard/members")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Gestion employees
        </button>
        <button
          onClick={() => navigate("/dashboard/teams")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Gestion teams
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>KPIs généraux</h3>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
            Taux de retard: 0%
          </div>
          <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
            Temps de travail moyen/période: 0h
          </div>
          <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb" }}>
            Assiduité & présence: 100%
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const rows = [
                ["user", "date", "clockIn", "clockOut"],
                ...entries.map((e) => [e.user, e.date, e.clockIn, e.clockOut || ""]),
              ];
              const csv = rows
                .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "timemanager-export.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              border: "1px solid #e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Exporter CSV
          </button>
        </div>
      </div>

      <button
        onClick={onLogout}
        style={{
          marginTop: 16,
          width: "100%",
          border: "none",
          padding: "10px 12px",
          borderRadius: 8,
          background: "#ef4444",
          color: "white",
          cursor: "pointer",
        }}
      >
        Se déconnecter
      </button>
    </div>
  );

  const renderMembers = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Employees</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retour dashboard
        </button>
      </div>
      {allUsers.map((u) => (
        <div
          key={u}
          style={{
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            marginBottom: 8,
            background: "#f9fafb",
          }}
        >
          {(users.find((x) => x.username === u)?.displayName || u)} {teamByUser.get(u) ? `· ${teamByUser.get(u)}` : ""}
        </div>
      ))}
    </div>
  );

  const renderTeams = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Teams</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retour dashboard
        </button>
      </div>
      {allTeams.length ? (
        <div>
          {allTeams.map((t) => (
            <div
              key={t}
              style={{
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                marginBottom: 8,
                background: "#f9fafb",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Aucune équipe configurée.</div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Mon profil</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => (isAdmin || isManager ? navigate("/dashboard") : navigate("/clock-in"))}
          style={{
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retour
        </button>
      </div>
      <div style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        Utilisateur: {currentDisplayName || currentUser || "—"} | Team: {currentTeam || "—"}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Le changement de mot de passe se fait sur le serveur Windows.
        </div>
      </div>
    </div>
  );

  const renderLanding = () => (
    <div style={{ marginTop: 18 }}>
      <p style={{ color: "#374151" }}>
        Bienvenue sur TimeManager. Gérez le pointage et suivez les équipes en un seul endroit.
      </p>
      <button
        onClick={() => navigate("/sign-in")}
        style={{
          marginTop: 10,
          border: "none",
          padding: "10px 14px",
          borderRadius: 8,
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        Se connecter
      </button>
    </div>
  );

  let content = null;
  if (route === "/") content = renderLanding();
  else if (route === "/sign-in") content = renderLogin();
  else if (route === "/clock-in") content = renderClockIn();
  else if (route === "/profile") content = renderProfile();
  else if (route === "/dashboard") content = renderDashboard();
  else if (route === "/dashboard/members") content = renderMembers();
  else if (route === "/dashboard/teams") content = renderTeams();
  else content = renderLanding();

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          maxWidth: 620,
          margin: "80px auto",
          background: "white",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>TimeManager</h1>
        <p style={{ marginTop: 6, color: "#6b7280" }}>Connexion via Windows Server (LDAPS)</p>
        {content}
      </div>

      {showClockModal && (
        <div
          onClick={() => setShowClockModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Pointage</h3>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {new Date(now).toLocaleDateString("fr-FR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {new Date(now).toLocaleTimeString("fr-FR")}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                onClick={onClockIn}
                disabled={!!activeEntry}
                style={{
                  flex: 1,
                  border: "none",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: activeEntry ? "#9ca3af" : "#10b981",
                  color: "white",
                  cursor: activeEntry ? "not-allowed" : "pointer",
                }}
              >
                Clock in
              </button>
              <button
                onClick={onClockOut}
                disabled={!activeEntry}
                style={{
                  flex: 1,
                  border: "none",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: !activeEntry ? "#9ca3af" : "#f59e0b",
                  color: "white",
                  cursor: !activeEntry ? "not-allowed" : "pointer",
                }}
              >
                Clock out
              </button>
            </div>
            <button
              onClick={() => setShowClockModal(false)}
              style={{
                marginTop: 12,
                width: "100%",
                border: "none",
                padding: "10px 12px",
                borderRadius: 8,
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
>>>>>>> 9ac17cd (Initial commit - timemanager)
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

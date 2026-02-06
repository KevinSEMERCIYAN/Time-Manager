import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data?.error || `Erreur serveur (${res.status})`);
  return data;
};

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

function App() {
  const [route, setRoute] = useState(window.location.pathname || "/");
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockError, setClockError] = useState("");
  const [period, setPeriod] = useState("week");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [report, setReport] = useState(null);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamMembers, setEditTeamMembers] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const [expandedUser, setExpandedUser] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [createSearch, setCreateSearch] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [createContract, setCreateContract] = useState("");
  const [createSchedule, setCreateSchedule] = useState({
    amStart: "",
    amEnd: "",
    pmStart: "",
    pmEnd: "",
  });
  const [assignNow, setAssignNow] = useState(false);
  const [createTeamId, setCreateTeamId] = useState("");
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [showProvisioned, setShowProvisioned] = useState(true);

  const splitDisplayName = (name) => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  };

  const roles = user?.roles || [];
  const isAdmin = roles.includes("ADMIN");
  const isManager = roles.includes("MANAGER");
  const isEmployee = roles.includes("EMPLOYEE");

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

  const loadSession = async () => {
    try {
      const data = await apiFetch("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (route === "/clock-in") {
      if (user) navigate("/dashboard");
      else navigate("/sign-in");
      return;
    }
    const isProtected =
      route === "/profile" ||
      route === "/dashboard" ||
      route.startsWith("/dashboard/members") ||
      route === "/dashboard/teams" ||
      route === "/dashboard/teams/createteam";

    if (isProtected && !user && !authLoading) {
      navigate("/sign-in");
      return;
    }

    if (user && route === "/sign-in") {
      navigate("/dashboard");
    }
  }, [route, user, authLoading]);

  const loadTeams = async () => {
    try {
      const data = await apiFetch("/teams");
      setTeams(data.teams || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiFetch("/users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadDashboard = async () => {
    if (!user) return;
    const now = new Date();
    let start = startOfWeek(now);
    let end = new Date(start);
    end.setDate(end.getDate() + 6);

    if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === "year") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    const custom = rangeStart && rangeEnd;
    const from = custom ? rangeStart : start.toISOString().slice(0, 10);
    const to = custom ? rangeEnd : end.toISOString().slice(0, 10);

    try {
      const data = await apiFetch(`/reports?from=${from}&to=${to}`);
      setReport({ ...data.summary, from, to });
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user, period, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!user) return;
    if (isAdmin || isManager) {
      loadTeams();
      loadUsers();
    } else {
      loadTeams();
    }
  }, [user]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      setPassword("");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    navigate("/sign-in");
  };

  const onClockIn = async () => {
    setClockError("");
    try {
      await apiFetch("/clocks", { method: "POST", body: JSON.stringify({ type: "IN" }) });
      setShowClockModal(false);
      await loadDashboard();
    } catch (err) {
      setClockError(err.message);
    }
  };

  const onClockOut = async () => {
    setClockError("");
    try {
      await apiFetch("/clocks", { method: "POST", body: JSON.stringify({ type: "OUT" }) });
      setShowClockModal(false);
      await loadDashboard();
    } catch (err) {
      setClockError(err.message);
    }
  };

  const exportCsv = async () => {
    try {
      const from = report?.from;
      const to = report?.to;
      const query = from && to ? `?from=${from}&to=${to}` : "";
      const data = await apiFetch(`/clocks${query}`);
      const rows = [
        ["user", "date", "clockIn", "clockOut", "lateMinutes", "workedMinutes"],
        ...(data.clocks || []).map((c) => [
          c.user?.username || "",
          c.date,
          c.clockInAt,
          c.clockOutAt || "",
          c.lateMinutes || 0,
          c.workedMinutes || 0,
        ]),
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
    } catch (err) {
      setError(err.message);
    }
  };

  const resetData = async () => {
    try {
      await apiFetch("/admin/reset", { method: "POST" });
      await loadDashboard();
      await loadTeams();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const seedData = async () => {
    try {
      await apiFetch("/admin/seed", { method: "POST" });
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const syncAdUsers = async () => {
    try {
      await apiFetch("/admin/sync-ad", { method: "POST" });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveUsers = async () => {
    try {
      for (const u of users) {
        await apiFetch(`/users/${u.id}`, {
          method: "PUT",
          body: JSON.stringify({
            contractType: u.contractType || null,
            schedule: {
              amStart: u.scheduleAmStart || null,
              amEnd: u.scheduleAmEnd || null,
              pmStart: u.schedulePmStart || null,
              pmEnd: u.schedulePmEnd || null,
            },
          }),
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const provisionUser = async () => {
    if (!createUserId) return;
    try {
      await apiFetch(`/users/${createUserId}/provision`, {
        method: "POST",
        body: JSON.stringify({
          contractType: createContract || null,
          schedule: {
            amStart: createSchedule.amStart || null,
            amEnd: createSchedule.amEnd || null,
            pmStart: createSchedule.pmStart || null,
            pmEnd: createSchedule.pmEnd || null,
          },
          teamId: assignNow ? createTeamId || null : null,
        }),
      });
      setCreateUserId("");
      setCreateContract("");
      setCreateSchedule({ amStart: "", amEnd: "", pmStart: "", pmEnd: "" });
      setAssignNow(false);
      setCreateTeamId("");
      await loadUsers();
      navigate("/dashboard/members");
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteUser = async (target) => {
    if (!target) return;
    try {
      await apiFetch(`/users/${target.id}`, { method: "DELETE" });
      setUserToDelete(null);
      await loadUsers();
      if (route.startsWith("/dashboard/members/")) {
        navigate("/dashboard/members");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditTeam = (team) => {
    setTeamToEdit(team);
    setEditTeamName(team.name || "");
    setEditTeamMembers((team.members || []).map((m) => m.userId));
  };

  const saveEditTeam = async () => {
    if (!teamToEdit) return;
    try {
      await apiFetch(`/teams/${teamToEdit.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editTeamName,
          memberIds: editTeamMembers,
        }),
      });
      setTeamToEdit(null);
      await loadTeams();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTeam = async (team) => {
    try {
      await apiFetch(`/teams/${team.id}`, { method: "DELETE" });
      setTeamToDelete(null);
      await loadTeams();
    } catch (err) {
      setError(err.message);
    }
  };

  const createTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    try {
      await apiFetch("/teams", {
        method: "POST",
        body: JSON.stringify({
          name,
          memberIds: selectedMembers,
          managerUserId: isAdmin ? (selectedManagerId || null) : null,
        }),
      });
      setNewTeamName("");
      setSelectedMembers([]);
      setSelectedManagerId("");
      navigate("/dashboard/teams");
      await loadTeams();
    } catch (err) {
      setError(err.message);
    }
  };

  const renderLogin = () => (
    <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Nom d’utilisateur</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>
        {error && (
          <div style={{ marginTop: 6, color: "#b91c1c", fontSize: 13 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 10,
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
      </div>
    </form>
  );

  const renderDashboard = () => (
    <div style={{ marginTop: 12 }}>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Utilisateur</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{user?.displayName || user?.username}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Rôles: {roles.length ? roles.join(", ") : "Aucun"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/profile")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Mon profil
          </button>
          <button
            onClick={() => setShowClockModal(true)}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#111827", color: "white" }}
          >
            Pointage
          </button>
          {(isAdmin || isManager) && (
            <button
              onClick={() => navigate("/dashboard/teams")}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
            >
              Gestion teams
            </button>
          )}
          {(isAdmin || isManager) && (
            <button
              onClick={() => navigate("/dashboard/members")}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
            >
              Gestion employés
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {[
          { key: "week", label: "Semaine" },
          { key: "month", label: "Mois" },
          { key: "year", label: "Année" },
        ].map((p) => {
          const active = period === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
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
        <div style={{ marginLeft: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>à</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          {(rangeStart || rangeEnd) && (
            <button
              onClick={() => {
                setRangeStart("");
                setRangeEnd("");
              }}
              style={{
                border: "1px solid #e5e7eb",
                padding: "6px 10px",
                borderRadius: 999,
                background: "#fff",
                color: "#111827",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Taux de retard {isAdmin || isManager ? "moyen" : "personnel"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {report ? `${report.latenessRate.toFixed(2)}%` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Sur {report?.shiftCount || 0} pointages
          </div>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Temps travaillé {isAdmin || isManager ? "moyen" : "personnel"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {report ? `${report.averageHours.toFixed(2)}h` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Sur période</div>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Taux d’assiduité</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {report ? `${report.attendanceRate.toFixed(2)}%` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {report ? `${report.workedHours.toFixed(2)}h / ${report.expectedHours.toFixed(2)}h` : "—"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={exportCsv}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Exporter CSV
        </button>
        {isAdmin && (
          <button
            onClick={syncAdUsers}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Sync AD
          </button>
        )}
        {isAdmin && (
          <button
            onClick={resetData}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Reset données
          </button>
        )}
        {isAdmin && (
          <button
            onClick={seedData}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Générer pointages
          </button>
        )}
        <button
          onClick={onLogout}
          style={{ border: "none", padding: "8px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );

  const renderMembers = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Employees</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Retour dashboard
        </button>
        {(isAdmin || isManager) && (
          <button
            onClick={() => navigate("/dashboard/members/create")}
            style={{ marginLeft: 8, border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}
          >
            Créer un utilisateur
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
              <button
                key={u.id}
                onClick={() => navigate(`/dashboard/members/${u.id}`)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {u.displayName || u.username}
              </button>
            ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Accès réservé aux managers.</div>
      )}
    </div>
  );

  const renderMemberCreate = () => {
    const candidates = users
      .filter((u) => u.isActive !== false || u.isDeleted)
      .filter((u) => (showProvisioned ? true : !u.isProvisioned));
    const filtered = candidates.filter((u) => {
      const label = `${u.displayName || ""} ${u.username || ""}`.toLowerCase();
      return label.includes(createSearch.toLowerCase());
    });
    const selected = users.find((u) => u.id === createUserId);

    useEffect(() => {
      setCreateSearch("");
      setCreateUserId("");
    }, []);

    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Créer un utilisateur</h3>
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/dashboard/members")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Retour employés
          </button>
          <button
            onClick={provisionUser}
            disabled={!createUserId}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#111827", color: "white", opacity: createUserId ? 1 : 0.6 }}
          >
            Enregistrer
          </button>
        </div>

        <div style={{ padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
          <div style={{ marginBottom: 12, position: "relative" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Utilisateur</div>
            <input
              value={createSearch}
              onChange={(e) => {
                setCreateSearch(e.target.value);
                setCreateUserId("");
                setCreateDropdownOpen(true);
              }}
              onFocus={() => setCreateDropdownOpen(true)}
              onBlur={() => setTimeout(() => setCreateDropdownOpen(false), 150)}
              placeholder="Rechercher..."
              style={{ width: "100%", maxWidth: 520, padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            {createDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  maxWidth: 520,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                  zIndex: 20,
                  marginTop: 6,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {filtered.length ? (
                  filtered.map((u) => (
                    <button
                      key={u.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCreateUserId(u.id);
                        setCreateSearch(`${u.displayName || u.username} (${u.username})`);
                        setCreateDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: "8px 10px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {u.displayName || u.username} ({u.username})
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "#6b7280" }}>
                    Aucun résultat
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={showProvisioned}
                onChange={(e) => setShowProvisioned(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>Afficher déjà provisionnés</span>
            </label>
          </div>

          <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, maxWidth: 520 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Prénom</div>
              <input
                value={splitDisplayName(selected?.displayName).firstName}
                readOnly
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f9fafb" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Nom</div>
              <input
                value={splitDisplayName(selected?.displayName).lastName}
                readOnly
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f9fafb" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Contrat</div>
            <select
              value={createContract}
              onChange={(e) => setCreateContract(e.target.value)}
              style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", maxWidth: 200 }}
            >
              <option value="">Choisir...</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Matin début</div>
              <input
                type="time"
                value={createSchedule.amStart}
                onChange={(e) => setCreateSchedule({ ...createSchedule, amStart: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Matin fin</div>
              <input
                type="time"
                value={createSchedule.amEnd}
                onChange={(e) => setCreateSchedule({ ...createSchedule, amEnd: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Après-midi début</div>
              <input
                type="time"
                value={createSchedule.pmStart}
                onChange={(e) => setCreateSchedule({ ...createSchedule, pmStart: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Après-midi fin</div>
              <input
                type="time"
                value={createSchedule.pmEnd}
                onChange={(e) => setCreateSchedule({ ...createSchedule, pmEnd: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={assignNow} onChange={(e) => setAssignNow(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Ajouter dans un groupe maintenant</span>
            </label>
          </div>

          {assignNow && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Groupe (team)</div>
              <select
                value={createTeamId}
                onChange={(e) => setCreateTeamId(e.target.value)}
                style={{ width: "100%", maxWidth: 520, padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                <option value="">Sélectionner...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMemberDetails = () => {
    const memberId = route.split("/").pop();
    const target = users.find((u) => u.id === memberId);

    if (!target) {
      return (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Détail employé</h3>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => navigate("/dashboard/members")}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
            >
              Retour employés
            </button>
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Utilisateur introuvable.</div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Détail employé</h3>
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/dashboard/members")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Retour employés
          </button>
          <button
            onClick={saveUsers}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#111827", color: "white" }}
          >
            Enregistrer
          </button>
          {isAdmin && (
            <button
              onClick={() => setUserToDelete(target)}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}
            >
              Supprimer
            </button>
          )}
        </div>

        <div style={{ padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Utilisateur</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{target.displayName || target.username}</div>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Contrat</div>
              <select
                value={target.contractType || ""}
                onChange={(e) => {
                  const next = users.map((x) =>
                    x.id === target.id ? { ...x, contractType: e.target.value } : x
                  );
                  setUsers(next);
                }}
                style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", maxWidth: 180 }}
              >
                <option value="" disabled>Choisir...</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="STAGE">Stage</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Matin début</div>
                <input
                  type="time"
                  value={target.scheduleAmStart || ""}
                  onChange={(e) => {
                    const next = users.map((x) => (x.id === target.id ? { ...x, scheduleAmStart: e.target.value } : x));
                    setUsers(next);
                  }}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Matin fin</div>
                <input
                  type="time"
                  value={target.scheduleAmEnd || ""}
                  onChange={(e) => {
                    const next = users.map((x) => (x.id === target.id ? { ...x, scheduleAmEnd: e.target.value } : x));
                    setUsers(next);
                  }}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Après-midi début</div>
                <input
                  type="time"
                  value={target.schedulePmStart || ""}
                  onChange={(e) => {
                    const next = users.map((x) => (x.id === target.id ? { ...x, schedulePmStart: e.target.value } : x));
                    setUsers(next);
                  }}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Après-midi fin</div>
                <input
                  type="time"
                  value={target.schedulePmEnd || ""}
                  onChange={(e) => {
                    const next = users.map((x) => (x.id === target.id ? { ...x, schedulePmEnd: e.target.value } : x));
                    setUsers(next);
                  }}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeams = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Teams</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Retour dashboard
        </button>
      </div>
      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => navigate("/dashboard/teams/createteam")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}
          >
            Créer une équipe
          </button>
        </div>
      )}
      {teams.length ? (
        <div>
          {teams.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                marginBottom: 8,
                background: "#f9fafb",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>{t.name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => openEditTeam(t)}
                  style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#fff", fontSize: 12 }}
                >
                  Modifier
                </button>
                <button
                  onClick={() => setTeamToDelete(t)}
                  style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#fff", fontSize: 12 }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Aucune équipe.</div>
      )}
    </div>
  );

  const renderCreateTeam = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Créer une équipe</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard/teams")}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Retour équipes
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Nom de l’équipe</label>
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          required
          style={{ width: "100%", maxWidth: 520, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
        />
      </div>

      {isAdmin ? (
        <div style={{ marginBottom: 12, position: "relative" }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Manager</label>
          <button
            type="button"
            onClick={() => setManagerDropdownOpen((v) => !v)}
            style={{
              width: "100%",
              maxWidth: 520,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#fff",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {selectedManagerId
              ? (users.find((u) => u.id === selectedManagerId)?.displayName || "Manager sélectionné")
              : "Sélectionner un manager"}
          </button>
          {managerDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                width: "100%",
                maxWidth: 520,
                marginTop: 6,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
                zIndex: 20,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {users
                .filter((u) => u.isActive !== false)
                .filter((u) => !u.isDeleted)
                .filter((u) => Array.isArray(u.roles) && u.roles.includes("MANAGER"))
                .map((u) => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                    <input
                      type="radio"
                      name="team-manager"
                      checked={selectedManagerId === u.id}
                      onChange={() => setSelectedManagerId(u.id)}
                    />
                    <span style={{ fontSize: 13 }}>{u.displayName || u.username}</span>
                  </label>
                ))}
              {!users.some((u) => Array.isArray(u.roles) && u.roles.includes("MANAGER")) && (
                <div style={{ padding: "8px 10px", fontSize: 12, color: "#6b7280" }}>
                  Aucun manager disponible.
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      <div style={{ marginBottom: 12, position: "relative" }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Employés</label>
        <button
          type="button"
          onClick={() => setMemberDropdownOpen((v) => !v)}
          style={{
            width: "100%",
            maxWidth: 520,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          {selectedMembers.length
            ? selectedMembers
                .map((id) => users.find((u) => u.id === id)?.displayName || users.find((u) => u.id === id)?.username || id)
                .join("; ")
            : "Sélectionner des employés"}
        </button>
        {memberDropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              width: "100%",
              maxWidth: 520,
              marginTop: 6,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
              zIndex: 20,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
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
                          const next = e.target.checked
                            ? [...selectedMembers, u.id]
                            : selectedMembers.filter((m) => m !== u.id);
                          setSelectedMembers(next);
                        }}
                      />
                      <span style={{ fontSize: 13 }}>{u.displayName || u.username}</span>
                    </label>
                  );
                })
            ) : (
              <div style={{ padding: "8px 10px", fontSize: 12, color: "#6b7280" }}>
                Aucun employé disponible.
              </div>
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
        Créer l’équipe
      </button>
    </div>
  );

  const renderProfile = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Mon profil</h3>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Retour
        </button>
      </div>
      <div style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        Utilisateur: {user?.displayName || user?.username || "—"}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Le changement de mot de passe se fait sur le serveur Windows (Active Directory).
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
        style={{ marginTop: 10, border: "none", padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}
      >
        Se connecter
      </button>
    </div>
  );

  let content = null;
  if (route === "/") content = renderLanding();
  else if (route === "/sign-in") content = renderLogin();
  else if (route === "/profile") content = renderProfile();
  else if (route === "/dashboard") content = renderDashboard();
  else if (route === "/dashboard/members") content = renderMembers();
  else if (route === "/dashboard/members/create") content = renderMemberCreate();
  else if (route.startsWith("/dashboard/members/")) content = renderMemberDetails();
  else if (route === "/dashboard/teams") content = renderTeams();
  else if (route === "/dashboard/teams/createteam") content = renderCreateTeam();
  else content = renderLanding();

  const isWideLayout = route.startsWith("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          maxWidth: isWideLayout ? 1100 : 620,
          margin: isWideLayout ? "40px auto" : "80px auto",
          background: "white",
          borderRadius: 12,
          padding: isWideLayout ? 28 : "28px 36px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>TimeManager</h1>
        <p style={{ marginTop: 6, color: "#6b7280" }}>
          {route === "/sign-in" || route === "/" ? "Connexion via Windows Server (LDAPS)" : "Tableau de bord"}
        </p>
        {authLoading ? <div style={{ fontSize: 13, color: "#6b7280" }}>Chargement...</div> : content}
      </div>

      {showClockModal && (
        <div
          onClick={() => setShowClockModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Pointage</h3>
            {clockError && <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{clockError}</div>}
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                onClick={onClockIn}
                style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#4b5563", color: "white" }}
              >
                Clock in
              </button>
              <button
                onClick={onClockOut}
                style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#f59e0b", color: "white" }}
              >
                Clock out
              </button>
            </div>
            <button
              onClick={() => setShowClockModal(false)}
              style={{ marginTop: 12, width: "100%", border: "none", padding: "10px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {teamToDelete && (
        <div
          onClick={() => setTeamToDelete(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Confirmer la suppression</h3>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Voulez-vous supprimer l’équipe <strong>{teamToDelete.name}</strong> ?
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                onClick={() => setTeamToDelete(null)}
                style={{ flex: 1, border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: 8, background: "#fff" }}
              >
                Annuler
              </button>
              <button
                onClick={() => deleteTeam(teamToDelete)}
                style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {teamToEdit && (
        <div
          onClick={() => setTeamToEdit(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Modifier l’équipe</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Nom de l’équipe</label>
              <input
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Utilisateurs</label>
              <div style={{ display: "grid", gap: 8, maxHeight: 260, overflow: "auto" }}>
                {users
                  .filter((u) => u.id !== user?.id)
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
                        <span style={{ fontSize: 13 }}>{u.displayName || u.username}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setTeamToEdit(null)}
                style={{ flex: 1, border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: 8, background: "#fff" }}
              >
                Annuler
              </button>
              <button
                onClick={saveEditTeam}
                style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div
          onClick={() => setUserToDelete(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Confirmer la suppression</h3>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Voulez-vous supprimer l’utilisateur <strong>{userToDelete.displayName || userToDelete.username}</strong> ?
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                onClick={() => setUserToDelete(null)}
                style={{ flex: 1, border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: 8, background: "#fff" }}
              >
                Annuler
              </button>
              <button
                onClick={() => deleteUser(userToDelete)}
                style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#fee2e2", color: "#991b1b", padding: "10px 12px", borderRadius: 8, fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

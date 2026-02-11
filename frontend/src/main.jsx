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
  const [clockTargetId, setClockTargetId] = useState(null);
  const [clockTargetLabel, setClockTargetLabel] = useState("");
  const [period, setPeriod] = useState("week");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [report, setReport] = useState(null);
  const [teamReport, setTeamReport] = useState(null);
  const [userReport, setUserReport] = useState(null);
  const [reportTeamId, setReportTeamId] = useState("");
  const [reportUserId, setReportUserId] = useState("");
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamMembers, setEditTeamMembers] = useState([]);
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const [expandedUser, setExpandedUser] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [createSearch, setCreateSearch] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [createContract, setCreateContract] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createSchedule, setCreateSchedule] = useState({
    amStart: "",
    amEnd: "",
    pmStart: "",
    pmEnd: "",
  });
  const [assignNow, setAssignNow] = useState(false);
  const [createTeamId, setCreateTeamId] = useState("");
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);

  const splitDisplayName = (name) => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  };

  const WORKING_DAYS = [
    { id: 1, label: "Lun" },
    { id: 2, label: "Mar" },
    { id: 3, label: "Mer" },
    { id: 4, label: "Jeu" },
    { id: 5, label: "Ven" },
    { id: 6, label: "Sam" },
    { id: 0, label: "Dim" },
  ];

  const renderSparkline = (series, id, color = "#f59e0b", options = {}) => {
    if (!Array.isArray(series) || series.length < 2) return null;
    const width = 220;
    const height = 60;
    const pad = 4;
    const normalized = series.map((v) => (typeof v === "number" ? { value: v, date: "" } : { value: v.value || 0, date: v.date || "" }));
    const values = normalized.map((v) => v.value);
    const max = Math.max(1, options.maxValue || 0, ...values);
    const step = (width - pad * 2) / (values.length - 1);
    const smoothValues = values.map((_, i) => {
      const prev = values[i - 1] ?? values[i];
      const curr = values[i];
      const next = values[i + 1] ?? values[i];
      return (prev + curr + next) / 3;
    });
    const points = smoothValues.map((v, i) => {
      const x = pad + i * step;
      const y = height - pad - (v / max) * (height - pad * 2);
      return { x, y };
    });
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area = `M ${points[0].x} ${height - pad} ${points
      .map((p) => `L ${p.x} ${p.y}`)
      .join(" ")} L ${points[points.length - 1].x} ${height - pad} Z`;
    const fillId = `spark-${id}`;
    const lineWidth = options.lineWidth || 2;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: 60, marginTop: 8 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${fillId})`} stroke="none" />
        <path d={line} fill="none" stroke={color} strokeWidth={lineWidth} />
      </svg>
    );
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
    if (route === "/members/create") {
      setCreateSearch("");
      setCreateUserId("");
      setCreateContract("");
      setCreateEmail("");
      setCreatePhone("");
      setCreateSchedule({ amStart: "", amEnd: "", pmStart: "", pmEnd: "" });
      setAssignNow(false);
      setCreateTeamId("");
    }
  }, [route]);

  useEffect(() => {
    if (route === "/clock-in") {
      if (user) navigate("/dashboard");
      else navigate("/sign-in");
      return;
    }
    const isProtected =
      route === "/profile" ||
      route === "/dashboard" ||
      route.startsWith("/members") ||
      route === "/teams" ||
      route === "/teams/createteam";

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
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      end = new Date(now);
    }

    const custom = rangeStart && rangeEnd;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rawFrom = custom ? rangeStart : start.toISOString().slice(0, 10);
    const rawTo = custom ? rangeEnd : end.toISOString().slice(0, 10);
    const toDate = new Date(`${rawTo}T00:00:00`);
    const safeTo = toDate > today ? today.toISOString().slice(0, 10) : rawTo;
    const from = rawFrom;
    const to = safeTo;

    try {
      const data = await apiFetch(`/reports?from=${from}&to=${to}`);
      setReport({ ...data.summary, from, to });
    } catch (err) {
      setError(err.message);
    }
  };

  const loadTeamReport = async () => {
    if (!reportTeamId || !report?.from || !report?.to) return;
    try {
      const data = await apiFetch(`/reports/team?from=${report.from}&to=${report.to}&teamId=${reportTeamId}`);
      setTeamReport(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadUserReport = async () => {
    if (!reportUserId || !report?.from || !report?.to) return;
    try {
      const data = await apiFetch(`/reports/user?from=${report.from}&to=${report.to}&userId=${reportUserId}`);
      setUserReport(data);
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

  const openClockModal = (target) => {
    if (target?.id) {
      setClockTargetId(target.id);
      setClockTargetLabel(target.displayName || target.username || "");
    } else if (user?.id) {
      setClockTargetId(user.id);
      setClockTargetLabel(user.displayName || user.username || "");
    } else {
      setClockTargetId(null);
      setClockTargetLabel("");
    }
    setClockError("");
    setShowClockModal(true);
  };

  const onClockIn = async () => {
    setClockError("");
    try {
      await apiFetch("/clocks", {
        method: "POST",
        body: JSON.stringify({ type: "IN", userId: clockTargetId || undefined }),
      });
      setShowClockModal(false);
      setClockTargetId(null);
      setClockTargetLabel("");
      await loadDashboard();
    } catch (err) {
      setClockError(err.message);
    }
  };

  const onClockOut = async () => {
    setClockError("");
    try {
      await apiFetch("/clocks", {
        method: "POST",
        body: JSON.stringify({ type: "OUT", userId: clockTargetId || undefined }),
      });
      setShowClockModal(false);
      setClockTargetId(null);
      setClockTargetLabel("");
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

  const saveUser = async (u) => {
    if (!u?.id) return;
    try {
      const workingDays = Array.isArray(u.workingDays) ? u.workingDays : WORKING_DAYS.filter((d) => d.id !== 0 && d.id !== 6).map((d) => d.id);
      await apiFetch(`/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({
          contractType: u.contractType || null,
          workingDays,
          schedule: {
            amStart: u.scheduleAmStart || null,
            amEnd: u.scheduleAmEnd || null,
            pmStart: u.schedulePmStart || null,
            pmEnd: u.schedulePmEnd || null,
          },
        }),
      });
      await loadUsers();
      navigate("/members");
    } catch (err) {
      setError(err.message);
      window.alert(err.message || "Erreur lors de l’enregistrement.");
    }
  };

  const provisionUser = async () => {
    if (!createUserId) return;
    try {
      const selected = users.find((u) => u.id === createUserId);
      await apiFetch(`/users/${createUserId}/provision`, {
        method: "POST",
        body: JSON.stringify({
          contractType: createContract || null,
          workingDays: [1, 2, 3, 4, 5],
          firstName: selected?.firstName || splitDisplayName(selected?.displayName).firstName || null,
          lastName: selected?.lastName || splitDisplayName(selected?.displayName).lastName || null,
          email: createEmail || null,
          phone: createPhone || null,
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
      setCreateEmail("");
      setCreatePhone("");
      setCreateSchedule({ amStart: "", amEnd: "", pmStart: "", pmEnd: "" });
      setAssignNow(false);
      setCreateTeamId("");
      await loadUsers();
      navigate("/members");
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
      if (route.startsWith("/members/")) {
        navigate("/members");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditTeam = (team) => {
    setTeamToEdit(team);
    setEditTeamName(team.name || "");
    setEditTeamMembers((team.members || []).map((m) => m.userId));
    setEditTeamDescription(team.description || "");
  };

  const saveEditTeam = async () => {
    if (!teamToEdit) return;
    try {
      await apiFetch(`/teams/${teamToEdit.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editTeamName,
          description: editTeamDescription,
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
          description: newTeamDescription || null,
          memberIds: selectedMembers,
          managerUserId: isAdmin ? (selectedManagerId || null) : null,
        }),
      });
      setNewTeamName("");
      setNewTeamDescription("");
      setSelectedMembers([]);
      setSelectedManagerId("");
      navigate("/teams");
      await loadTeams();
    } catch (err) {
      setError(err.message);
    }
  };

  const renderLogin = () => (
    <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gap: 12, maxWidth: 520, margin: "0 auto", width: "100%" }}>
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

  const renderDashboardShell = (body, footerLeft = null, footerRight = null, options = {}) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/profile")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
          >
            Mon profil
          </button>
          {(isAdmin || isManager) && (
            <button
            onClick={() => navigate("/teams")}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
            >
              Gestion teams
            </button>
          )}
          {(isAdmin || isManager) && (
            <button
            onClick={() => navigate("/members")}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
            >
              Gestion employés
            </button>
          )}
        </div>

        {options.showUserPanel && (
          <div style={{ display: "grid", gap: 8, justifyItems: "end", textAlign: "right", marginTop: -6, marginRight: -4 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Utilisateur</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{user?.displayName || user?.username}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                Rôles: {roles.length ? roles.join(", ") : "Aucun"}
              </div>
            </div>
            <button
              onClick={() => openClockModal(user)}
              style={{ border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: 8, background: "#111827", color: "white" }}
            >
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
        ) : (
          <div />
        )}

        <div />
      </div>

      {body}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {footerLeft}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {footerRight}
          {options.showLogoutFooter !== false && (
            <button
              onClick={onLogout}
              style={{ border: "none", padding: "8px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}
            >
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const workSeries = report?.dailyWorked?.map((d) => d.hours ?? (d.minutes || 0) / 60) || [];
    const lateSeries = report?.dailyLatenessRate?.map((d) => d.value) || [];
    const attSeries = report?.dailyAttendanceRate?.map((d) => d.value) || [];
    const absSeries = report?.dailyAbsenceRate?.map((d) => d.value) || [];
    return renderDashboardShell(
    <>
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {(isAdmin || isManager) && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: 12,
              borderRadius: 8,
              background: "#fff",
              border: "1px solid #e5e7eb",
              minHeight: 140,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>Total travaillé</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              {report ? `${report.workedHours.toFixed(2)}h` : "—"}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Sur période</div>
            {renderSparkline(workSeries, "total", "#38bdf8", {
              unit: "h",
              formatValue: (v) => `${v.toFixed(2)}h`,
              lineWidth: period === "year" ? 1 : 2,
            })}
          </div>
        )}

        <div style={{ gridColumn: "1 / 2", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Taux de retard {isAdmin || isManager ? "moyen" : "personnel"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {report ? `${report.latenessRate.toFixed(2)}%` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Sur {(report?.lateCount ?? "—")} / {(report?.expectedShiftCount || 0)} jours
          </div>
          {renderSparkline(lateSeries, "late", "#f59e0b", {
            unit: "%",
            formatValue: (v) => `${v.toFixed(1)}%`,
            maxValue: 100,
            lineWidth: period === "year" ? 1 : 2,
          })}
        </div>
        <div style={{ gridColumn: "2 / 3", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Temps travaillé {isAdmin || isManager ? "moyen" : "personnel"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {report ? `${report.averageHours.toFixed(2)}h` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Sur période</div>
          {renderSparkline(workSeries, "work", "#60a5fa", {
            unit: "h",
            formatValue: (v) => `${v.toFixed(2)}h`,
            lineWidth: period === "year" ? 1 : 2,
          })}
        </div>
        <div style={{ gridColumn: "1 / 2", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Taux d’assiduité</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {report ? `${report.attendanceRate.toFixed(2)}%` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {report ? `${report.workedHours.toFixed(2)}h / ${report.expectedHours.toFixed(2)}h` : "—"}
          </div>
          {renderSparkline(attSeries, "att", "#34d399", {
            unit: "%",
            formatValue: (v) => `${v.toFixed(1)}%`,
            maxValue: 100,
            lineWidth: period === "year" ? 1 : 2,
          })}
        </div>
        <div style={{ gridColumn: "2 / 3", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Absences</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>
            {report ? `${report.absenceRate.toFixed(2)}%` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {report ? `${report.absenceCount} / ${report.expectedShiftCount} jours` : "—"}
          </div>
          {renderSparkline(absSeries, "abs", "#ef4444", {
            unit: "%",
            formatValue: (v) => `${v.toFixed(1)}%`,
            maxValue: 100,
            lineWidth: period === "year" ? 1 : 2,
          })}
        </div>
      </div>

      {(isAdmin || isManager) && (
        <div style={{ marginTop: 18, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Reporting équipe (daily/weekly)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={reportTeamId}
                onChange={(e) => setReportTeamId(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", minWidth: 200 }}
              >
                <option value="">Sélectionner équipe...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={loadTeamReport}
                style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#111827", color: "white" }}
              >
                Charger
              </button>
            </div>
            {teamReport && (
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "#374151" }}>
                <div><strong>Daily</strong></div>
                {Object.entries(teamReport.daily || {}).map(([k, v]) => (
                  <div key={k}>{k}: {(v / 60).toFixed(2)}h</div>
                ))}
                <div style={{ marginTop: 6 }}><strong>Weekly</strong></div>
                {Object.entries(teamReport.weekly || {}).map(([k, v]) => (
                  <div key={k}>{k}: {(v / 60).toFixed(2)}h</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Reporting employé (daily/weekly)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={reportUserId}
                onChange={(e) => setReportUserId(e.target.value)}
                style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", minWidth: 200 }}
              >
                <option value="">Sélectionner utilisateur...</option>
                {users
                  .filter((u) => u.isProvisioned)
                  .filter((u) => {
                    if (isAdmin) {
                      const rolesList = Array.isArray(u?.roles) ? u.roles : [];
                      return rolesList.includes("EMPLOYEE") || rolesList.includes("MANAGER");
                    }
                    return !Array.isArray(u?.roles) || u.roles.includes("EMPLOYEE");
                  })
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName || u.username}</option>
                  ))}
              </select>
              <button
                onClick={loadUserReport}
                style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#111827", color: "white" }}
              >
                Charger
              </button>
            </div>
            {userReport && (
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "#374151" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e5e7eb" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", width: 90 }}>Type</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Période</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", width: 90 }}>Heures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(userReport.daily || {}).map(([k, v]) => (
                      <tr key={`d-${k}`}>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Daily</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{k}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{(v / 60).toFixed(2)}h</td>
                      </tr>
                    ))}
                    {Object.entries(userReport.weekly || {}).map(([k, v]) => (
                      <tr key={`w-${k}`}>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Weekly</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{k}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>{(v / 60).toFixed(2)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    isAdmin ? (
      <>
        <button
          onClick={syncAdUsers}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Sync AD
        </button>
        <button
          onClick={resetData}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Reset données
        </button>
        <button
          onClick={seedData}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Générer pointages
        </button>
      </>
    ) : null,
    <button
      onClick={exportCsv}
      style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
    >
      Exporter CSV
    </button>,
    { showFilters: true, showUserPanel: true }
    );
  };

  const renderMembers = () => (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Gestion Employees</h3>
      <div style={{ marginBottom: 12 }}>
        {(isAdmin || isManager) && (
          <button
            onClick={() => navigate("/members/create")}
            style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}
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
        <div style={{ fontSize: 13, color: "#6b7280" }}>Accès réservé aux managers.</div>
      )}
    </div>
  );

  const renderMemberCreate = () => {
    const candidates = users
      .filter((u) => u.isActive !== false || u.isDeleted)
      .filter((u) => !u.isProvisioned || u.isDeleted);
    const filtered = candidates.filter((u) => {
      const label = `${u.displayName || ""} ${u.username || ""}`.toLowerCase();
      return label.includes(createSearch.toLowerCase());
    });
    const selected = users.find((u) => u.id === createUserId);
    const selectedName = splitDisplayName(selected?.displayName);
    const selectedFirstName = selected?.firstName || selectedName.firstName;
    const selectedLastName = selected?.lastName || selectedName.lastName;

    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Créer un utilisateur</h3>
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                setCreateEmail("");
                setCreatePhone("");
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
                        setCreateEmail(u.email || "");
                        setCreatePhone(u.phone || "");
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

          <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, maxWidth: 520 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Prénom</div>
              <input
                value={selectedFirstName}
                readOnly
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f9fafb" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Nom</div>
              <input
                value={selectedLastName}
                readOnly
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#f9fafb" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, maxWidth: 520 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Email</div>
              <input
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Téléphone</div>
              <input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
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
        <div style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13, color: "#6b7280" }}>Utilisateur introuvable.</div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Détail employé</h3>
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => saveUser(target)}
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
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Jours travaillés</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {WORKING_DAYS.map((d) => {
                  const current = Array.isArray(target.workingDays)
                    ? target.workingDays
                    : WORKING_DAYS.filter((x) => x.id !== 0 && x.id !== 6).map((x) => x.id);
                  const checked = current.includes(d.id);
                  return (
                    <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const nextDays = e.target.checked
                            ? [...current, d.id]
                            : current.filter((v) => v !== d.id);
                          const next = users.map((x) => (x.id === target.id ? { ...x, workingDays: nextDays } : x));
                          setUsers(next);
                        }}
                      />
                      <span>{d.label}</span>
                    </label>
                  );
                })}
              </div>
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
      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => navigate("/teams/createteam")}
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
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Nom de l’équipe</label>
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          required
          style={{ width: "100%", maxWidth: 520, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Description</label>
        <input
          value={newTeamDescription}
          onChange={(e) => setNewTeamDescription(e.target.value)}
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
      <div style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Nom</div>
        <input
          value={user?.lastName || splitDisplayName(user?.displayName).lastName || ""}
          readOnly
          disabled
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 8, background: "#f9fafb", color: "#6b7280" }}
        />
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Prénom</div>
        <input
          value={user?.firstName || splitDisplayName(user?.displayName).firstName || ""}
          readOnly
          disabled
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 8, background: "#f9fafb", color: "#6b7280" }}
        />
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Email</div>
        <input
          value={user?.email || ""}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 8 }}
        />
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Téléphone</div>
        <input
          value={user?.phone || ""}
          onChange={(e) => setUser({ ...user, phone: e.target.value })}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
        />
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={async () => {
            try {
              const data = await apiFetch("/me", { method: "PUT", body: JSON.stringify(user) });
              setUser(data.user);
            } catch (err) {
              setError(err.message);
            }
          }}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#111827", color: "white" }}
        >
          Enregistrer
        </button>
        <button
          onClick={async () => {
            try {
              const data = await apiFetch("/gdpr/export");
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "timemanager-export.json";
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              setError(err.message);
            }
          }}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Exporter mes données
        </button>
        {isAdmin && (
          <>
            <button
              onClick={async () => {
                try {
                  await apiFetch("/me", { method: "DELETE" });
                  setUser(null);
                  navigate("/sign-in");
                } catch (err) {
                  setError(err.message);
                }
              }}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}
            >
              Supprimer mon compte
            </button>
            <button
              onClick={async () => {
                if (!window.confirm("Confirmer l’anonymisation de votre compte ?")) return;
                try {
                  await apiFetch("/gdpr/anonymize", { method: "POST" });
                  setUser(null);
                  navigate("/sign-in");
                } catch (err) {
                  setError(err.message);
                }
              }}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff5f5", color: "#b91c1c" }}
            >
              Anonymiser mon compte
            </button>
          </>
        )}
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
  else if (route === "/dashboard") content = renderDashboard();
  else if (route === "/profile") content = renderDashboardShell(renderProfile(), null, null, { showFilters: false, showUserPanel: false, showLogoutFooter: false });
  else if (route === "/members") content = renderDashboardShell(renderMembers(), null, null, { showFilters: false, showUserPanel: false, showLogoutFooter: false });
  else if (route === "/members/create") content = renderDashboardShell(renderMemberCreate(), null, null, { showFilters: false, showUserPanel: false, showLogoutFooter: false });
  else if (route.startsWith("/members/")) content = renderDashboardShell(renderMemberDetails(), null, null, { showFilters: false, showUserPanel: false, showLogoutFooter: false });
  else if (route === "/teams") content = renderDashboardShell(renderTeams(), null, null, { showFilters: false, showUserPanel: false, showLogoutFooter: false });
  else if (route === "/teams/createteam") content = renderDashboardShell(renderCreateTeam(), null, null, { showFilters: false, showUserPanel: false, showLogoutFooter: false });
  else content = renderLanding();

  const isWideLayout = route === "/sign-in" || route === "/";

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          maxWidth: isWideLayout ? 620 : 1100,
          margin: isWideLayout ? "80px auto" : "40px auto",
          background: "white",
          borderRadius: 12,
          padding: isWideLayout ? "28px 36px" : 28,
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
          onClick={() => {
            setShowClockModal(false);
            setClockTargetId(null);
            setClockTargetLabel("");
          }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
          >
            <h3 style={{ margin: "0 0 6px" }}>Pointage</h3>
            {clockTargetLabel && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>Utilisateur : {clockTargetLabel}</div>
            )}
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
              onClick={() => {
                setShowClockModal(false);
                setClockTargetId(null);
                setClockTargetLabel("");
              }}
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
              <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Description</label>
              <input
                value={editTeamDescription}
                onChange={(e) => setEditTeamDescription(e.target.value)}
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

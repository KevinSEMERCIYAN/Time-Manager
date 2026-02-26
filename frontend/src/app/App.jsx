import React, { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { startOfWeek } from "../utils/date";
import { splitDisplayName } from "../utils/name";
import { WORKING_DAYS } from "../constants/workDays";
import { SparklineChart } from "../components/charts/SparklineChart";
import { DashboardShell } from "../layouts/DashboardShell";
import { ClockModal } from "../components/modals/ClockModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { EditTeamModal } from "../components/modals/EditTeamModal";
import { ErrorToast } from "../components/feedback/ErrorToast";
import { SuccessToast } from "../components/feedback/SuccessToast";
import { ROUTES, isMemberDetailsRoute, isProtectedRoute } from "./config/routes";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { MembersPage } from "../pages/MembersPage";
import { MemberCreatePage } from "../pages/MemberCreatePage";
import { MemberDetailsPage } from "../pages/MemberDetailsPage";
import { TeamsPage } from "../pages/TeamsPage";
import { CreateTeamPage } from "../pages/CreateTeamPage";
import { ProfilePage } from "../pages/ProfilePage";
import { MyClocksPage } from "../pages/MyClocksPage";

export default function App() {
  const [route, setRoute] = useState(window.location.pathname || ROUTES.LANDING);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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
  const [reportLoading, setReportLoading] = useState(false);
  const [teamReport, setTeamReport] = useState(null);
  const [userReport, setUserReport] = useState(null);
  const [teamReportLoading, setTeamReportLoading] = useState(false);
  const [userReportLoading, setUserReportLoading] = useState(false);
  const [reportTeamId, setReportTeamId] = useState("");
  const [reportUserId, setReportUserId] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [syncAdLoading, setSyncAdLoading] = useState(false);
  const [exportCsvLoading, setExportCsvLoading] = useState(false);

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

  const [userToDelete, setUserToDelete] = useState(null);
  const [createSearch, setCreateSearch] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [createContract, setCreateContract] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createSchedule, setCreateSchedule] = useState({ amStart: "", amEnd: "", pmStart: "", pmEnd: "" });
  const [assignNow, setAssignNow] = useState(false);
  const [createTeamId, setCreateTeamId] = useState("");
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [provisionLoading, setProvisionLoading] = useState(false);

  const roles = user?.roles || [];
  const isAdmin = roles.includes("ADMIN");
  const isManager = roles.includes("MANAGER");

  const navigate = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
      setRoute(path);
    }
  };

  const renderSparkline = (series, id, color = "#3b82f6", options = {}) => {
    if (!Array.isArray(series) || series.length < 2) return null;
    const normalized = series.map((v) => (typeof v === "number" ? v : v?.value ?? 0));
    const labels = options.labels && options.labels.length === normalized.length ? options.labels : normalized.map((_, i) => `${i + 1}`);
    const min = Math.min(...normalized);
    const max = Math.max(...normalized);
    const range = Math.max(1e-6, max - min);
    const pad = range * 0.15;
    const yMin = options.baseZero ? 0 : min - pad;
    return <SparklineChart series={normalized} labels={labels} id={id} color={color} options={{ ...options, yMin, yMax: max + pad }} />;
  };

  const compressSeries = (series, bucketSize) => {
    if (!Array.isArray(series) || series.length <= bucketSize) return series;
    const out = [];
    for (let i = 0; i < series.length; i += bucketSize) {
      const chunk = series.slice(i, i + bucketSize);
      const values = chunk.map((v) => (typeof v === "number" ? v : v.value || 0));
      const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const date = typeof chunk[0] === "number" ? "" : chunk[chunk.length - 1]?.date || "";
      out.push({ value: avg, date });
    }
    return out;
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
    setReportLoading(true);

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
    const toYMD = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const rawFrom = custom ? rangeStart : toYMD(start);
    const rawTo = custom ? rangeEnd : toYMD(end);
    const toDate = new Date(`${rawTo}T00:00:00`);
    const safeTo = toDate > today ? today.toISOString().slice(0, 10) : rawTo;

    try {
      const q = new URLSearchParams({ from: rawFrom, to: safeTo });
      if (user?.id) q.set("userId", user.id);
      const data = await apiFetch(`/reports?${q.toString()}`);
      setReport({ ...data.summary, from: rawFrom, to: safeTo });
    } catch (err) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const loadTeamReport = async () => {
    if (!reportTeamId || !report?.from || !report?.to) return;
    try {
      setTeamReportLoading(true);
      setError("");
      const data = await apiFetch(`/reports/team?from=${report.from}&to=${report.to}&teamId=${reportTeamId}`);
      setTeamReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setTeamReportLoading(false);
    }
  };

  const loadUserReport = async () => {
    if (!reportUserId || !report?.from || !report?.to) return;
    try {
      setUserReportLoading(true);
      setError("");
      const data = await apiFetch(`/reports/user?from=${report.from}&to=${report.to}&userId=${reportUserId}`);
      setUserReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUserReportLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setUser(data.user);
      setPassword("");
      navigate(ROUTES.DASHBOARD);
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
    navigate(ROUTES.SIGN_IN);
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

  const closeClockModal = () => {
    setShowClockModal(false);
    setClockTargetId(null);
    setClockTargetLabel("");
  };

  const onClockIn = async () => {
    setClockError("");
    try {
      await apiFetch("/clocks", { method: "POST", body: JSON.stringify({ type: "IN", userId: clockTargetId || undefined }) });
      closeClockModal();
      await loadDashboard();
    } catch (err) {
      setClockError(err.message);
    }
  };

  const onClockOut = async () => {
    setClockError("");
    try {
      await apiFetch("/clocks", { method: "POST", body: JSON.stringify({ type: "OUT", userId: clockTargetId || undefined }) });
      closeClockModal();
      await loadDashboard();
    } catch (err) {
      setClockError(err.message);
    }
  };

  const exportCsv = async () => {
    if (exportCsvLoading) return;
    try {
      setExportCsvLoading(true);
      setError("");
      const from = report?.from;
      const to = report?.to;
      const query = from && to ? `?from=${from}&to=${to}` : "";
      const data = await apiFetch(`/clocks${query}`);
      const rows = [["user", "date", "clockIn", "clockOut", "lateMinutes", "workedMinutes"], ...(data.clocks || []).map((c) => [c.user?.username || "", c.date, c.clockInAt, c.clockOutAt || "", c.lateMinutes || 0, c.workedMinutes || 0])];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "timemanager-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage("Export CSV téléchargé.");
    } catch (err) {
      setError(err.message);
    } finally {
      setExportCsvLoading(false);
    }
  };

  const resetData = async () => {
    if (resetLoading) return;
    try {
      setResetLoading(true);
      setError("");
      await apiFetch("/admin/reset", { method: "POST" });
      await Promise.all([loadDashboard(), loadTeams(), loadUsers()]);
      setSuccessMessage("Données réinitialisées.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const seedData = async () => {
    if (seedLoading) return;
    try {
      setSeedLoading(true);
      setError("");
      await apiFetch("/admin/seed", { method: "POST" });
      await loadDashboard();
      setSuccessMessage("Pointages générés.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  const syncAdUsers = async () => {
    if (syncAdLoading) return;
    try {
      setSyncAdLoading(true);
      setError("");
      await apiFetch("/admin/sync-ad", { method: "POST" });
      await loadUsers();
      setSuccessMessage("Synchronisation AD terminée.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncAdLoading(false);
    }
  };

  const saveUser = async (targetUser) => {
    if (!targetUser?.id) return;
    try {
      const workingDays = Array.isArray(targetUser.workingDays)
        ? targetUser.workingDays
        : WORKING_DAYS.filter((d) => d.id !== 0 && d.id !== 6).map((d) => d.id);

      await apiFetch(`/users/${targetUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          contractType: targetUser.contractType || null,
          workingDays,
          schedule: {
            amStart: targetUser.scheduleAmStart || null,
            amEnd: targetUser.scheduleAmEnd || null,
            pmStart: targetUser.schedulePmStart || null,
            pmEnd: targetUser.schedulePmEnd || null,
          },
        }),
      });
      await loadUsers();
      setError("");
      setSuccessMessage("Utilisateur enregistré.");
      navigate(ROUTES.MEMBERS);
    } catch (err) {
      setError(err.message);
      window.alert(err.message || "Erreur lors de l’enregistrement.");
    }
  };

  const provisionUser = async () => {
    if (!createUserId || provisionLoading) return;
    try {
      setProvisionLoading(true);
      setError("");
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
      setError("");
      setSuccessMessage("Utilisateur créé.");
      await loadUsers();
      navigate(ROUTES.MEMBERS);
    } catch (err) {
      setError(err.message);
    } finally {
      setProvisionLoading(false);
    }
  };

  const impersonateUser = async (targetUserId) => {
    if (!targetUserId) return;
    try {
      setError("");
      const data = await apiFetch(`/admin/impersonate/${targetUserId}`, { method: "POST" });
      setUser(data.user);
      setSuccessMessage("Session changée.");
      navigate(ROUTES.DASHBOARD);
      window.location.reload();
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
      if (isMemberDetailsRoute(route)) navigate(ROUTES.MEMBERS);
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
      setError("");
      setSuccessMessage("Équipe mise à jour.");
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
    setCreateTeamLoading(true);
    setError("");
    try {
      await apiFetch("/teams", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: newTeamDescription || null,
          memberIds: selectedMembers,
          managerUserId: isAdmin ? selectedManagerId || null : null,
        }),
      });
      setNewTeamName("");
      setNewTeamDescription("");
      setSelectedMembers([]);
      setSelectedManagerId("");
      setError("");
      setSuccessMessage("Équipe créée.");
      navigate(ROUTES.TEAMS);
      await loadTeams();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreateTeamLoading(false);
    }
  };

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname || ROUTES.LANDING);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (route === ROUTES.MEMBERS_CREATE) {
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
    if (route === ROUTES.CLOCK_IN) {
      if (user) navigate(ROUTES.DASHBOARD);
      else navigate(ROUTES.SIGN_IN);
      return;
    }

    if (isProtectedRoute(route) && !user && !authLoading) {
      navigate(ROUTES.SIGN_IN);
      return;
    }

    if (user && route === ROUTES.SIGN_IN) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [route, user, authLoading]);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user, period, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!user) return;
    loadTeams();
    if (isAdmin || isManager) loadUsers();
  }, [user]);

  const appCtx = {
    route,
    navigate,
    user,
    setUser,
    roles,
    isAdmin,
    isManager,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    loading,
    username,
    setUsername,
    password,
    setPassword,
    onSubmit,
    onLogout,
    openClockModal,
    closeClockModal,
    period,
    setPeriod,
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    report,
    reportLoading,
    teams,
    users,
    setUsers,
    reportTeamId,
    setReportTeamId,
    reportUserId,
    setReportUserId,
    loadTeamReport,
    loadUserReport,
    teamReportLoading,
    userReportLoading,
    teamReport,
    userReport,
    renderSparkline,
    compressSeries,
    exportCsv,
    resetData,
    seedData,
    seedLoading,
    resetLoading,
    syncAdLoading,
    syncAdUsers,
    exportCsvLoading,
    createSearch,
    setCreateSearch,
    createUserId,
    setCreateUserId,
    createContract,
    setCreateContract,
    createEmail,
    setCreateEmail,
    createPhone,
    setCreatePhone,
    createSchedule,
    setCreateSchedule,
    assignNow,
    setAssignNow,
    createTeamId,
    setCreateTeamId,
    createDropdownOpen,
    setCreateDropdownOpen,
    provisionUser,
    provisionLoading,
    impersonateUser,
    saveUser,
    setUserToDelete,
    newTeamName,
    setNewTeamName,
    newTeamDescription,
    setNewTeamDescription,
    selectedMembers,
    setSelectedMembers,
    selectedManagerId,
    setSelectedManagerId,
    memberDropdownOpen,
    setMemberDropdownOpen,
    managerDropdownOpen,
    setManagerDropdownOpen,
    createTeam,
    createTeamLoading,
    openEditTeam,
    setTeamToDelete,
    apiFetch,
  };

  const withShell = (body, options = { showFilters: false, showUserPanel: false, showLogoutFooter: false }) => (
    <DashboardShell ctx={appCtx} options={options}>
      {body}
    </DashboardShell>
  );

  let content = <LandingPage ctx={appCtx} />;

  if (route === ROUTES.SIGN_IN) {
    content = <LoginPage ctx={appCtx} />;
  } else if (route === ROUTES.DASHBOARD) {
    content = withShell(<DashboardPage ctx={appCtx} />, { showFilters: true, showUserPanel: true });
  } else if (route === ROUTES.MY_CLOCKS) {
    content = withShell(<MyClocksPage ctx={appCtx} />, { showFilters: false, showUserPanel: true });
  } else if (route === ROUTES.PROFILE) {
    content = withShell(<ProfilePage ctx={appCtx} />);
  } else if (route === ROUTES.MEMBERS) {
    content = withShell(<MembersPage ctx={appCtx} />);
  } else if (route === ROUTES.MEMBERS_CREATE) {
    content = withShell(<MemberCreatePage ctx={appCtx} />);
  } else if (isMemberDetailsRoute(route)) {
    content = withShell(<MemberDetailsPage ctx={appCtx} />);
  } else if (route === ROUTES.TEAMS) {
    content = withShell(<TeamsPage ctx={appCtx} />);
  } else if (route === ROUTES.TEAMS_CREATE) {
    content = withShell(<CreateTeamPage ctx={appCtx} />);
  }

  const isWideLayout = route === ROUTES.SIGN_IN || route === ROUTES.LANDING;

  return (
    <div className="tm-app-charter">
      <div
        className="tm-card"
        style={{
          maxWidth: isWideLayout ? 620 : 1100,
          margin: isWideLayout ? "80px auto" : "40px auto",
          padding: isWideLayout ? "28px 36px" : 28,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--tm-text-main)" }}>TimeManager</h1>
        <p className="tm-text-muted" style={{ marginTop: 6 }}>
          {route === ROUTES.SIGN_IN || route === ROUTES.LANDING ? "Connexion via Windows Server (LDAPS)" : "Tableau de bord"}
        </p>
        {authLoading ? <div className="tm-text-muted" style={{ fontSize: 13 }}>Chargement...</div> : content}
      </div>

      <ClockModal
        open={showClockModal}
        onClose={closeClockModal}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        clockTargetLabel={clockTargetLabel}
        clockError={clockError}
      />

      <ConfirmModal
        open={!!teamToDelete}
        title="Confirmer la suppression"
        message={teamToDelete ? <>Voulez-vous supprimer l’equipe <strong>{teamToDelete.name}</strong> ?</> : ""}
        confirmLabel="Supprimer"
        onCancel={() => setTeamToDelete(null)}
        onConfirm={() => deleteTeam(teamToDelete)}
      />

      <EditTeamModal
        open={!!teamToEdit}
        users={users}
        currentUserId={user?.id}
        editTeamName={editTeamName}
        setEditTeamName={setEditTeamName}
        editTeamDescription={editTeamDescription}
        setEditTeamDescription={setEditTeamDescription}
        editTeamMembers={editTeamMembers}
        setEditTeamMembers={setEditTeamMembers}
        onCancel={() => setTeamToEdit(null)}
        onSave={saveEditTeam}
      />

      <ConfirmModal
        open={!!userToDelete}
        title="Confirmer la suppression"
        message={userToDelete ? <>Voulez-vous supprimer l’utilisateur <strong>{userToDelete.displayName || userToDelete.username}</strong> ?</> : ""}
        confirmLabel="Supprimer"
        onCancel={() => setUserToDelete(null)}
        onConfirm={() => deleteUser(userToDelete)}
      />

      <ErrorToast error={error} />
      <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage("")} />
    </div>
  );
}

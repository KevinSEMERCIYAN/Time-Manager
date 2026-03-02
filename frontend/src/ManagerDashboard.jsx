import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Search,
  User,
  ChevronDown,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Users,
  Plus,
  LogOut,
  X,
  UserPlus,
  UserMinus,
  ListTodo,
  Trash2,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { usersAPI, teamsAPI, timeEntriesAPI, customTeamsAPI, reportsAPI, schedulesAPI, contractsAPI, tasksAPI } from "./api";

function KpiCard({ label, value, helper, tone = "default" }) {
  return (
    <div className={`tm-kpi-card tm-kpi-card-${tone}`}>
      <div className="tm-kpi-label">{label}</div>
      <div className="tm-kpi-value">{value}</div>
      {helper && <div className="tm-kpi-helper">{helper}</div>}
    </div>
  );
}

function SectionCard({ title, icon, children, className = "" }) {
  return (
    <section className={`tm-section-card ${className}`}>
      <header className="tm-section-card-header">
        <div className="tm-section-card-title">
          {icon && <span className="tm-section-card-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>
      </header>
      <div className="tm-section-card-body">{children}</div>
    </section>
  );
}

// Fonction utilitaire pour calculer les heures travaillées
function calculateHours(timeEntries) {
  let totalMinutes = 0;
  timeEntries.forEach((entry) => {
    if (entry.startTime && entry.endTime) {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      const diff = (end - start) / (1000 * 60); // en minutes
      totalMinutes += diff;
    }
  });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes, total: totalMinutes };
}

// Fonction pour formater les heures
function formatHours(hours, minutes) {
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

// Fonction pour obtenir la semaine en cours
function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lundi
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    from: monday.toISOString().split("T")[0],
    to: sunday.toISOString().split("T")[0],
  };
}

export function ManagerDashboard() {
  const { user, logout, isOnline } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [customTeams, setCustomTeams] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clockLoading, setClockLoading] = useState(false);
  const [clockError, setClockError] = useState(null);
  const [customTeamLoading, setCustomTeamLoading] = useState(false);
  const [customTeamError, setCustomTeamError] = useState(null);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [userSchedule, setUserSchedule] = useState(null);
  const [userContract, setUserContract] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [userSchedulesCache, setUserSchedulesCache] = useState({});
  const [userContractsCache, setUserContractsCache] = useState({});
  const [filterUserId, setFilterUserId] = useState(null);
  const [filterTeamId, setFilterTeamId] = useState(null);
  const [filterCustomTeamId, setFilterCustomTeamId] = useState(null); // Pour filtrer par équipe custom
  const [userSearchInput, setUserSearchInput] = useState(""); // Nouveau state pour la recherche d'utilisateur
  const [showUserDropdown, setShowUserDropdown] = useState(false); // Pour afficher/masquer le dropdown
  const [filterPeriod, setFilterPeriod] = useState("week");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [reportSummary, setReportSummary] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [teamTasks, setTeamTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [taskSuccess, setTaskSuccess] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    assignedToUserId: "",
  });

  // Fonction pour charger les données
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateRange = getWeekRange();
      const [usersData, teamsData, customTeamsData, timeEntriesData, summaryData] = await Promise.all([
        usersAPI.getAll().catch(() => []),
        teamsAPI.getAll().catch(() => []),
        customTeamsAPI.getAll().catch(() => []),
        timeEntriesAPI.getAll(dateRange).catch(() => []),
        reportsAPI.getSummary(dateRange).catch(() => null), // Ne pas bloquer si le résumé échoue
      ]);

      setUsers(usersData);
      setTeams(teamsData);
      
      // Charger les membres pour chaque équipe custom pour avoir le bon compteur
      const customTeamsWithMembers = await Promise.all(
        customTeamsData.map(async (team) => {
          try {
            const details = await customTeamsAPI.getById(team.id);
            const memberCount = details.members?.length || 0;
            console.log(`Équipe ${team.name}: ${memberCount} membres chargés`);
            return { ...team, memberCount, members: details.members || [] };
          } catch (err) {
            console.error(`Erreur chargement équipe ${team.id}:`, err);
            return { ...team, memberCount: 0, members: [] };
          }
        })
      );
      console.log("Équipes custom chargées:", customTeamsWithMembers);
      setCustomTeams(customTeamsWithMembers);
      
      setTimeEntries(timeEntriesData);
      if (summaryData) setReportSummary(summaryData);
      const tasksData = await tasksAPI.getAll().catch(() => []);
      setTeamTasks(tasksData);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des données");
      console.error("Erreur chargement données:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamTasks = async () => {
    try {
      setTaskLoading(true);
      const data = await tasksAPI.getAll();
      setTeamTasks(data);
    } catch (err) {
      setTaskError(err.message || "Erreur chargement des tâches");
    } finally {
      setTaskLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assignedToUserId) {
      setTaskError("Titre et membre assigné requis.");
      return;
    }
    try {
      setTaskError(null);
      setTaskSuccess(null);
      await tasksAPI.create({
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        assignedToUserId: Number(taskForm.assignedToUserId),
        teamId: filterTeamId || filterCustomTeamId ? (filterTeamId || null) : undefined,
        dueDate: taskForm.dueDate || undefined,
      });
      setTaskForm({ title: "", description: "", dueDate: "", assignedToUserId: "" });
      setTaskSuccess("Tâche créée.");
      setTimeout(() => setTaskSuccess(null), 3000);
      await loadTeamTasks();
    } catch (err) {
      setTaskError(err.message || "Erreur création tâche");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    try {
      setTaskError(null);
      await tasksAPI.delete(taskId);
      await loadTeamTasks();
    } catch (err) {
      setTaskError(err.message || "Erreur suppression tâche");
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, []);

  // Recharger les time entries et le résumé quand les filtres changent
  useEffect(() => {
    if (!loading) {
      loadTimeEntries();
      loadReportSummary();
    }
  }, [filterUserId, filterTeamId, filterCustomTeamId, filterPeriod, customDateFrom, customDateTo]);

  // Réinitialiser le champ "Assigner à" quand l'équipe change
  useEffect(() => {
    if (filterTeamId || filterCustomTeamId) {
      // Réinitialiser seulement si l'utilisateur actuellement sélectionné n'est pas dans la nouvelle équipe
      if (taskForm.assignedToUserId) {
        let availableUsers = users.filter((u) => u.isActive !== false);
        if (filterTeamId) {
          availableUsers = availableUsers.filter((u) => u.teamId === filterTeamId);
        } else if (filterCustomTeamId) {
          const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
          if (customTeam && customTeam.members) {
            const memberIds = customTeam.members.map(m => m.userId || m.id);
            availableUsers = availableUsers.filter((u) => memberIds.includes(u.id));
          } else {
            availableUsers = [];
          }
        }
        const isStillAvailable = availableUsers.some(u => u.id === Number(taskForm.assignedToUserId));
        if (!isStillAvailable) {
          setTaskForm((f) => ({ ...f, assignedToUserId: "" }));
        }
      }
    }
  }, [filterTeamId, filterCustomTeamId, users, customTeams]);

  // Fonction pour obtenir la plage de dates selon le filtre
  const getDateRange = () => {
    if (filterPeriod === "week") {
      return getWeekRange();
    } else if (filterPeriod === "month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: firstDay.toISOString().split("T")[0],
        to: lastDay.toISOString().split("T")[0],
      };
    } else if (filterPeriod === "custom" && customDateFrom && customDateTo) {
      return { from: customDateFrom, to: customDateTo };
    }
    return getWeekRange();
  };

  // Charger les time entries avec filtres
  const loadTimeEntries = async () => {
    try {
      const dateRange = getDateRange();
      const filters = {
        from: dateRange.from,
        to: dateRange.to,
      };
      if (filterUserId) filters.userId = filterUserId;
      if (filterTeamId) filters.teamId = filterTeamId;

      const entries = await timeEntriesAPI.getAll(filters);
      setTimeEntries(entries);
      console.log("Time entries chargés:", entries.length, "pour userId:", filterUserId);
    } catch (err) {
      console.error("Erreur chargement time entries:", err);
      setError(err.message || "Erreur lors du chargement des pointages.");
    }
  };

  // Charger le résumé des rapports depuis le serveur
  const loadReportSummary = async () => {
    try {
      setReportLoading(true);
      const dateRange = getDateRange();
      const filters = {
        from: dateRange.from,
        to: dateRange.to,
      };
      if (filterUserId) filters.userId = filterUserId;
      if (filterTeamId) filters.teamId = filterTeamId;
      // Note: filterCustomTeamId ne peut pas être passé directement au backend
      // On filtrera côté client après avoir chargé les données

      console.log("Chargement résumé avec filtres:", filters);
      const summary = await reportsAPI.getSummary(filters);
      setReportSummary(summary);
      console.log("Résumé chargé:", summary, "users:", summary?.users?.length);
    } catch (err) {
      console.error("Erreur chargement résumé:", err);
      // Ne pas bloquer l'UI si le résumé échoue, on garde les calculs côté client
    } finally {
      setReportLoading(false);
    }
  };

  // Calculer les KPIs (utiliser le résumé serveur si disponible, sinon calculer côté client)
  const dateRange = getDateRange();
  const filteredEntries = timeEntries.filter((entry) => {
    if (filterUserId && entry.userId !== filterUserId) return false;
    if (filterTeamId && entry.teamId !== filterTeamId) return false;
    // Filtrer par équipe custom si nécessaire
    if (filterCustomTeamId) {
      const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
      if (customTeam && customTeam.members) {
        const memberIds = customTeam.members.map(m => m.userId || m.id);
        if (!memberIds.includes(entry.userId)) return false;
      } else {
        return false;
      }
    }
    if (entry.startTime) {
      const entryDate = entry.startTime.split("T")[0];
      if (entryDate < dateRange.from || entryDate > dateRange.to) return false;
    }
    return true;
  });

  const weekEntries = filteredEntries;

  // Si une équipe ou un utilisateur est filtré, calculer les KPIs depuis les utilisateurs filtrés
  // Sinon, utiliser overview (tous les utilisateurs)
  let teamFilteredUsers = null;
  if (filterTeamId || filterCustomTeamId || filterUserId) {
    if (reportSummary?.users && reportSummary.users.length > 0) {
      let usersToUse = reportSummary.users;
      
      // Filtrer par équipe normale
      if (filterTeamId) {
        usersToUse = usersToUse.filter(u => u.teamId === filterTeamId);
      }
      
      // Filtrer par équipe custom
      if (filterCustomTeamId) {
        const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
        if (customTeam && customTeam.members) {
          const memberIds = customTeam.members.map(m => m.userId || m.id);
          usersToUse = usersToUse.filter(u => memberIds.includes(u.userId));
        } else {
          usersToUse = [];
        }
      }
      
      // Filtrer par utilisateur spécifique
      if (filterUserId) {
        usersToUse = usersToUse.filter(u => u.userId === filterUserId);
      }
      
      teamFilteredUsers = usersToUse;
    }
  }

  // Calculer les KPIs depuis les utilisateurs filtrés si disponible
  let totalHours, totalMinutes, lateEntries;
  if (teamFilteredUsers && teamFilteredUsers.length > 0) {
    // Utiliser les données des utilisateurs filtrés
    const totalMinutesSum = teamFilteredUsers.reduce((sum, u) => sum + (u.totalMinutes || 0), 0);
    totalHours = Math.floor(totalMinutesSum / 60);
    totalMinutes = totalMinutesSum % 60;
    lateEntries = teamFilteredUsers.reduce((sum, u) => sum + (u.lateCount || 0), 0);
  } else {
    // Utiliser overview (tous les utilisateurs) ou calculer côté client
    totalHours = reportSummary?.overview?.totalHours
      ? Math.floor(reportSummary.overview.totalHours)
      : calculateHours(weekEntries).hours;
    totalMinutes = reportSummary?.overview?.totalHours
      ? Math.round((reportSummary.overview.totalHours % 1) * 60)
      : calculateHours(weekEntries).minutes;
    lateEntries = reportSummary?.overview?.lateCount ?? weekEntries.filter((entry) => {
      if (!entry.startTime) return false;
      const start = new Date(entry.startTime);
      // Fallback: utiliser 9h00 si pas d'horaires définis
      return start.getHours() > 9 || (start.getHours() === 9 && start.getMinutes() > 0);
    }).length;
  }
  
  // Calculer les heures supplémentaires (supposons 35h/semaine)
  const standardHours = 35;
  const overtimeHours = Math.max(0, totalHours - standardHours);
  const overtimeMinutes = totalHours > standardHours ? totalMinutes : 0;

  // Utilisateur courant (entrée dans la table users)
  const currentUserRecord = users.find(
    (u) =>
      (u.username && u.username === user?.username) ||
      (u.email && u.email === user?.username)
  );
  const currentUserId = currentUserRecord?.id;

  // Dernier pointage en cours (sans heure de sortie)
  const openEntry =
    currentUserId != null
      ? timeEntries
        .filter((e) => e.userId === currentUserId && !e.endTime)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] || null
      : null;

  const handleClockIn = async () => {
    if (!currentUserId) {
      setClockError(
        "Impossible d'identifier votre utilisateur (aucune entrée correspondante dans la base)."
      );
      return;
    }
    if (openEntry) {
      setClockError("Vous avez déjà un pointage en cours.");
      return;
    }

    try {
      setClockLoading(true);
      setClockError(null);
      const nowIso = new Date().toISOString();
      const newEntry = await timeEntriesAPI.create({
        userId: currentUserId,
        teamId: currentUserRecord?.teamId ?? null,
        startTime: nowIso,
        endTime: null,
        source: "MANUAL",
        comment: null,
      });
      setTimeEntries((prev) => [newEntry, ...prev]);
      // Recharger le résumé pour mettre à jour les KPIs
      await loadReportSummary();
      // Effacer l'erreur après succès
      setTimeout(() => setClockError(null), 3000);
    } catch (err) {
      console.error("Erreur pointage entrée:", err);
      setClockError(err.message || "Erreur lors du pointage d'entrée.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentUserId || !openEntry) {
      setClockError("Aucun pointage en cours à clôturer.");
      return;
    }

    try {
      setClockLoading(true);
      setClockError(null);
      const nowIso = new Date().toISOString();
      const updated = await timeEntriesAPI.update(openEntry.id, {
        endTime: nowIso,
      });
      setTimeEntries((prev) =>
        prev.map((e) => (e.id === openEntry.id ? updated : e))
      );
      // Recharger le résumé pour mettre à jour les KPIs
      await loadReportSummary();
      // Effacer l'erreur après succès
      setTimeout(() => setClockError(null), 3000);
    } catch (err) {
      console.error("Erreur pointage sortie:", err);
      setClockError(err.message || "Erreur lors du pointage de sortie.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleCreateCustomTeam = async () => {
    const name = window.prompt("Nom de la nouvelle équipe personnalisée :");
    if (!name || !name.trim()) return;

    try {
      setCustomTeamLoading(true);
      setCustomTeamError(null);
      const created = await customTeamsAPI.create({ name: name.trim() });
      setCustomTeams((prev) => [...prev, created]);
      // Effacer l'erreur après succès
      setTimeout(() => setCustomTeamError(null), 3000);
    } catch (err) {
      console.error("Erreur création équipe custom:", err);
      setCustomTeamError(err.message || "Erreur lors de la création de l'équipe.");
    } finally {
      setCustomTeamLoading(false);
    }
  };

  const handleRenameCustomTeam = async (team) => {
    const newName = window.prompt(
      "Nouveau nom pour l'équipe personnalisée :",
      team.name
    );
    if (!newName || !newName.trim() || newName.trim() === team.name) return;

    try {
      setCustomTeamLoading(true);
      setCustomTeamError(null);
      const updated = await customTeamsAPI.update(team.id, {
        name: newName.trim(),
      });
      setCustomTeams((prev) =>
        prev.map((t) => (t.id === team.id ? updated : t))
      );
    } catch (err) {
      console.error("Erreur renommage équipe custom:", err);
      setCustomTeamError(err.message || "Erreur lors du renommage de l'équipe.");
    } finally {
      setCustomTeamLoading(false);
    }
  };

  const handleDeleteCustomTeam = async (team) => {
    if (
      !window.confirm(
        `Supprimer l'équipe personnalisée "${team.name}" et tous ses membres ?`
      )
    ) {
      return;
    }

    try {
      setCustomTeamLoading(true);
      setCustomTeamError(null);
      await customTeamsAPI.delete(team.id);
      setCustomTeams((prev) => prev.filter((t) => t.id !== team.id));
      if (selectedTeamForMembers?.id === team.id) {
        setSelectedTeamForMembers(null);
        setTeamMembers([]);
      }
    } catch (err) {
      console.error("Erreur suppression équipe custom:", err);
      setCustomTeamError(
        err.message || "Erreur lors de la suppression de l'équipe."
      );
    } finally {
      setCustomTeamLoading(false);
    }
  };

  const handleOpenTeamMembers = async (team) => {
    setSelectedTeamForMembers(team);
    setMembersLoading(true);
    try {
      const details = await customTeamsAPI.getById(team.id);
      setTeamMembers(details.members || []);
    } catch (err) {
      console.error("Erreur chargement membres:", err);
      setCustomTeamError(err.message || "Erreur lors du chargement des membres.");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddMemberToTeam = async (teamId, userId) => {
    try {
      setMembersLoading(true);
      const currentMemberIds = teamMembers.map((m) => m.userId || m.id);
      const newMemberIds = [...currentMemberIds, userId];
      await customTeamsAPI.updateMembers(teamId, newMemberIds);
      // Recharger les membres
      const details = await customTeamsAPI.getById(teamId);
      setTeamMembers(details.members || []);
      // Mettre à jour le compteur dans la liste
      setCustomTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, memberCount: details.members?.length || 0 }
            : t
        )
      );
    } catch (err) {
      console.error("Erreur ajout membre:", err);
      setCustomTeamError(err.message || "Erreur lors de l'ajout du membre.");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMemberFromTeam = async (teamId, userId) => {
    try {
      setMembersLoading(true);
      await customTeamsAPI.removeMember(teamId, userId);
      // Recharger les membres
      const details = await customTeamsAPI.getById(teamId);
      setTeamMembers(details.members || []);
      // Mettre à jour le compteur dans la liste
      setCustomTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, memberCount: details.members?.length || 0 }
            : t
        )
      );
    } catch (err) {
      console.error("Erreur retrait membre:", err);
      setCustomTeamError(err.message || "Erreur lors du retrait du membre.");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh"
      }}>
        <div>Chargement des données...</div>
      </div>
    );
  }

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
                Bienvenue, {user?.displayName || user?.username || "Utilisateur"} !
              </span>
              <button className="tm-topbar-pill">
                Tableau de Bord
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          <div className="tm-topbar-search-row">
            <div className="tm-topbar-search" style={{ position: "relative" }}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Tapez l'initiale du nom (ex: J pour Jean)..."
                aria-label="Rechercher un employé"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  // Ne pas sélectionner automatiquement, attendre le clic de l'utilisateur
                  if (!value) {
                    setFilterUserId(null);
                  }
                }}
                onFocus={() => {
                  // Afficher le dropdown si on a du texte
                  if (searchQuery) {
                    setShowUserDropdown(true);
                  }
                }}
              />
              {searchQuery && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    marginTop: "4px"
                  }}
                >
                  {users
                    .filter((u) => {
                      // Filtrer par équipe si filterTeamId est défini
                      if (filterTeamId && u.teamId !== filterTeamId) return false;

                      if (!searchQuery) return false;

                      const searchLower = searchQuery.toLowerCase().trim();
                      const displayName = (u.displayName || "").toLowerCase();
                      const username = (u.username || "").toLowerCase();

                      // Extraire le prénom et le nom
                      const nameParts = displayName.split(" ");
                      const firstName = nameParts[0] || "";
                      const lastName = nameParts[nameParts.length - 1] || "";

                      // Rechercher par initiale du prénom OU du nom
                      return firstName.startsWith(searchLower) ||
                        lastName.startsWith(searchLower) ||
                        username.startsWith(searchLower);
                    })
                    .sort((a, b) => {
                      // Trier par ordre alphabétique du nom d'affichage
                      const nameA = (a.displayName || a.username || "").toLowerCase();
                      const nameB = (b.displayName || b.username || "").toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .slice(0, 10)
                    .map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setFilterUserId(u.id);
                          setSearchQuery(u.displayName || u.username);
                          setShowUserDropdown(false);
                          // Forcer le rechargement des données
                          setTimeout(() => {
                            loadTimeEntries();
                            loadReportSummary();
                          }, 100);
                        }}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f0f0f0",
                          backgroundColor: filterUserId === u.id ? "#e3f2fd" : "white"
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                        onMouseLeave={(e) => e.target.style.backgroundColor = filterUserId === u.id ? "#e3f2fd" : "white"}
                      >
                        <div style={{ fontWeight: "500" }}>{u.displayName || u.username}</div>
                        {u.teamName && (
                          <div style={{ fontSize: "12px", color: "#666" }}>{u.teamName}</div>
                        )}
                      </div>
                    ))}
                  {users.filter((u) => {
                    if (filterTeamId && u.teamId !== filterTeamId) return false;
                    if (!searchQuery) return false;
                    const searchLower = searchQuery.toLowerCase().trim();
                    const displayName = (u.displayName || "").toLowerCase();
                    const username = (u.username || "").toLowerCase();
                    const nameParts = displayName.split(" ");
                    const firstName = nameParts[0] || "";
                    const lastName = nameParts[nameParts.length - 1] || "";
                    return firstName.startsWith(searchLower) ||
                      lastName.startsWith(searchLower) ||
                      username.startsWith(searchLower);
                  }).length === 0 && (
                      <div style={{ padding: "12px", color: "#666", textAlign: "center" }}>
                        Aucun employé trouvé
                      </div>
                    )}
                </div>
              )}
              {filterUserId && (
                <button
                  onClick={() => {
                    setFilterUserId(null);
                    setSearchQuery("");
                  }}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    fontSize: "16px",
                    color: "#666"
                  }}
                  title="Effacer"
                >
                  ×
                </button>
              )}
            </div>
            <div className="tm-topbar-select-group">
              <select
                className="tm-topbar-select"
                value={filterTeamId ? `team-${filterTeamId}` : (filterCustomTeamId ? `custom-${filterCustomTeamId}` : "")}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setFilterTeamId(null);
                    setFilterCustomTeamId(null);
                  } else if (value.startsWith("team-")) {
                    setFilterTeamId(Number(value.replace("team-", "")));
                    setFilterCustomTeamId(null);
                  } else if (value.startsWith("custom-")) {
                    setFilterCustomTeamId(Number(value.replace("custom-", "")));
                    setFilterTeamId(null);
                  }
                }}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ddd" }}
              >
                <option value="">Toutes les équipes</option>
                {teams.length > 0 && (
                  <optgroup label="Équipes">
                    {teams.map((team) => {
                      const memberCount = users.filter(u => u.teamId === team.id).length;
                      return (
                        <option key={team.id} value={`team-${team.id}`}>
                          {team.name} ({memberCount} membre{memberCount > 1 ? 's' : ''})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
                {customTeams.length > 0 && (
                  <optgroup label="Équipes Custom">
                    {customTeams.map((team) => (
                      <option key={team.id} value={`custom-${team.id}`}>
                        {team.name} ({team.memberCount || 0} membre{(team.memberCount || 0) > 1 ? 's' : ''})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                className="tm-topbar-filter"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                Filtrer
              </button>
              <button
                className="tm-topbar-button-primary"
                onClick={() => setShowUserManagement(!showUserManagement)}
                title="Gérer les utilisateurs"
              >
                <Users size={16} />
                {showUserManagement ? "Masquer Utilisateurs" : "Gérer les Utilisateurs"}
              </button>
              <button
                className="tm-topbar-filter"
                onClick={loadData}
                title="Rafraîchir les données"
                style={{ marginLeft: "8px" }}
              >
                🔄 Rafraîchir
              </button>
            </div>
          </div>
        </div>

        <div className="tm-topbar-right">
          <button className="tm-icon-button" aria-label="Messages">
            <Mail size={18} />
          </button>
          <button className="tm-icon-button" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <div className="tm-topbar-avatar">
            <div className="tm-avatar-circle">
              <User size={18} />
            </div>
          </div>
          <button
            className="tm-icon-button"
            aria-label="Déconnexion"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="tm-dashboard-main">
        {!isOnline && (
          <div style={{
            padding: "12px",
            marginBottom: "16px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: "4px",
            border: "1px solid #ffeaa7",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>⚠️</span>
            <span>Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.</span>
          </div>
        )}
        {error && (
          <div style={{
            padding: "12px",
            marginBottom: "16px",
            backgroundColor: "#fee",
            color: "#c33",
            borderRadius: "4px"
          }}>
            Erreur: {error}
          </div>
        )}

        {/* Panneau de filtres */}
        {showFilters && (
          <div style={{
            padding: "16px",
            marginBottom: "16px",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #ddd"
          }}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "500" }}>
                  Utilisateur
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Tapez l'initiale du nom (ex: J pour Jean)..."
                    value={userSearchInput}
                    onChange={(e) => {
                      setUserSearchInput(e.target.value);
                      setShowUserDropdown(true);
                      if (!e.target.value) {
                        setFilterUserId(null);
                      }
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)} // Délai pour permettre le clic
                    style={{
                      width: "100%",
                      padding: "6px 30px 6px 6px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "14px"
                    }}
                  />
                  {filterUserId && (
                    <button
                      onClick={() => {
                        setFilterUserId(null);
                        setUserSearchInput("");
                      }}
                      style={{
                        position: "absolute",
                        right: "4px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        fontSize: "16px",
                        color: "#666"
                      }}
                      title="Effacer"
                    >
                      ×
                    </button>
                  )}
                  {showUserDropdown && userSearchInput && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        marginTop: "4px"
                      }}
                    >
                      {users
                        .filter((u) => {
                          // Filtrer par équipe si filterTeamId est défini
                          if (filterTeamId && u.teamId !== filterTeamId) return false;

                          if (!userSearchInput) return false;

                          // Filtrer par initiale du prénom ou du nom
                          const searchLower = userSearchInput.toLowerCase().trim();
                          const displayName = (u.displayName || "").toLowerCase();
                          const username = (u.username || "").toLowerCase();

                          // Extraire le prénom et le nom
                          const nameParts = displayName.split(" ");
                          const firstName = nameParts[0] || "";
                          const lastName = nameParts[nameParts.length - 1] || "";

                          // Rechercher par initiale du prénom OU du nom
                          return firstName.startsWith(searchLower) ||
                            lastName.startsWith(searchLower) ||
                            username.startsWith(searchLower);
                        })
                        .sort((a, b) => {
                          // Trier par ordre alphabétique
                          const nameA = (a.displayName || a.username || "").toLowerCase();
                          const nameB = (b.displayName || b.username || "").toLowerCase();
                          return nameA.localeCompare(nameB);
                        })
                        .slice(0, 10) // Limiter à 10 résultats
                        .map((u) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setFilterUserId(u.id);
                              setUserSearchInput(u.displayName || u.username);
                              setShowUserDropdown(false);
                              // Forcer le rechargement des données
                              setTimeout(() => {
                                loadTimeEntries();
                                loadReportSummary();
                              }, 100);
                            }}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f0f0f0",
                              backgroundColor: filterUserId === u.id ? "#e3f2fd" : "white"
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#f5f5f5"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = filterUserId === u.id ? "#e3f2fd" : "white"}
                          >
                            <div style={{ fontWeight: "500" }}>{u.displayName || u.username}</div>
                            {u.teamName && (
                              <div style={{ fontSize: "12px", color: "#666" }}>{u.teamName}</div>
                            )}
                          </div>
                        ))}
                      {users.filter((u) => {
                        if (filterTeamId && u.teamId !== filterTeamId) return false;
                        const searchLower = userSearchInput.toLowerCase();
                        const displayName = (u.displayName || "").toLowerCase();
                        const username = (u.username || "").toLowerCase();
                        return displayName.startsWith(searchLower) ||
                          username.startsWith(searchLower) ||
                          displayName.includes(searchLower) ||
                          username.includes(searchLower);
                      }).length === 0 && (
                          <div style={{ padding: "12px", color: "#666", textAlign: "center" }}>
                            Aucun employé trouvé
                          </div>
                        )}
                    </div>
                  )}
                </div>
                {filterUserId && (
                  <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                    Sélectionné: {users.find(u => u.id === filterUserId)?.displayName || users.find(u => u.id === filterUserId)?.username}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "500" }}>
                  Période
                </label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>

              {filterPeriod === "custom" && (
                <>
                  <div style={{ minWidth: "150px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "500" }}>
                      Du
                    </label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd" }}
                    />
                  </div>
                  <div style={{ minWidth: "150px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "500" }}>
                      Au
                    </label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd" }}
                    />
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  setFilterUserId(null);
                  setFilterTeamId(null);
                  setFilterCustomTeamId(null);
                  setFilterPeriod("week");
                  setCustomDateFrom("");
                  setCustomDateTo("");
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  backgroundColor: "white",
                  cursor: "pointer"
                }}
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        <div className="tm-kpi-grid">
          <KpiCard
            label="Heures Travaillées"
            value={formatHours(totalHours, totalMinutes)}
            helper="Cette semaine"
          />
          <KpiCard
            label="Heures Supplémentaires"
            value={formatHours(overtimeHours, overtimeMinutes)}
            helper="Cette semaine"
          />
          <KpiCard
            label="Retards"
            value={lateEntries.toString()}
            helper="cette semaine"
            tone="danger"
          />
          <KpiCard
            label="Utilisateurs Actifs"
            value={(() => {
              if (filterUserId) return "1";
              if (filterTeamId || filterCustomTeamId) {
                if (teamFilteredUsers) return teamFilteredUsers.length.toString();
                // Compter les utilisateurs de l'équipe
                if (filterTeamId) {
                  return users.filter(u => u.teamId === filterTeamId).length.toString();
                }
                if (filterCustomTeamId) {
                  const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
                  return (customTeam?.memberCount || 0).toString();
                }
              }
              return (reportSummary?.overview?.activeUsers ?? users.filter(u => u.isActive !== false).length).toString();
            })()}
            helper={(() => {
              if (filterUserId) return "utilisateur sélectionné";
              if (filterTeamId || filterCustomTeamId) {
                const teamName = filterTeamId 
                  ? teams.find(t => t.id === filterTeamId)?.name
                  : customTeams.find(t => t.id === filterCustomTeamId)?.name;
                return teamName ? `équipe ${teamName}` : "équipe sélectionnée";
              }
              return `sur ${users.length} total`;
            })()}
            tone="success"
          />
        </div>

        <div className="tm-layout-columns">
          <div className="tm-layout-col">
            <SectionCard
              title="Mes Pointages"
              icon={<Clock size={16} />}
              className="tm-section-card-medium"
            >
              {clockError && (
                <div
                  style={{
                    padding: "8px 12px",
                    marginBottom: "12px",
                    backgroundColor: clockError.includes("Erreur") ? "#fee" : "#efe",
                    color: clockError.includes("Erreur") ? "#c33" : "#3c3",
                    borderRadius: "4px",
                    fontSize: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{clockError}</span>
                  <button
                    onClick={() => setClockError(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "18px",
                      color: "inherit",
                      padding: "0 4px",
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <p className="tm-text-row">
                {openEntry ? (
                  <>
                    Pointage en cours depuis{" "}
                    {new Date(openEntry.startTime).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                ) : (
                  <>Aucun pointage en cours</>
                )}
              </p>
              <div className="tm-pointing-actions">
                <button
                  className="tm-button-outline tm-button-success"
                  onClick={handleClockIn}
                  disabled={clockLoading || !!openEntry || !currentUserId}
                >
                  {clockLoading && !openEntry ? "En cours..." : "Pointer Entrée"}
                </button>
                <button
                  className="tm-button-outline tm-button-danger"
                  onClick={handleClockOut}
                  disabled={clockLoading || !openEntry || !currentUserId}
                >
                  {clockLoading && openEntry ? "En cours..." : "Pointer Sortie"}
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title={filterUserId 
                ? `Pointages - ${users.find(u => u.id === filterUserId)?.displayName || users.find(u => u.id === filterUserId)?.username || "Utilisateur"}`
                : (filterTeamId || filterCustomTeamId)
                  ? `Pointages - ${filterTeamId ? teams.find(t => t.id === filterTeamId)?.name : customTeams.find(t => t.id === filterCustomTeamId)?.name}`
                  : "Derniers Pointages"}
              icon={<Clock size={16} />}
              className="tm-section-card-medium"
            >
              {filteredEntries.length === 0 ? (
                <p className="tm-text-row" style={{ color: "#666" }}>
                  {filterUserId 
                    ? "Aucun pointage pour cet utilisateur"
                    : (filterTeamId || filterCustomTeamId)
                      ? "Aucun pointage pour cette équipe"
                      : "Aucun pointage cette semaine"}
                </p>
              ) : (
                <>
                  {filteredEntries
                    .sort((a, b) => {
                      // Trier du plus récent au plus ancien
                      const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
                      const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 10)
                    .map((entry) => {
                    const start = entry.startTime ? new Date(entry.startTime) : null;
                    const end = entry.endTime ? new Date(entry.endTime) : null;
                    const user = users.find(u => u.id === entry.userId);
                    return (
                      <div key={entry.id} style={{
                        padding: "8px 0",
                        borderBottom: "1px solid #eee"
                      }}>
                        <p className="tm-text-row">
                          {!filterUserId && (
                            <>
                              <strong>{user?.displayName || user?.username || "Utilisateur"}</strong>
                              {" - "}
                            </>
                          )}
                          {start && (
                            <>
                              <span style={{ fontWeight: "500" }}>
                                {start.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                              </span>
                              {" - "}
                              Entrée: {start.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </>
                          )}
                          {end && (
                            <>
                              {" | "}
                              Sortie: {end.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                              {" "}
                              <span style={{ color: "#666", fontSize: "12px" }}>
                                ({formatHours(
                                  Math.floor((end.getTime() - start.getTime()) / (1000 * 60) / 60),
                                  Math.floor((end.getTime() - start.getTime()) / (1000 * 60) % 60)
                                )})
                              </span>
                            </>
                          )}
                          {!end && start && (
                            <span style={{ color: "#2563eb", fontSize: "12px", marginLeft: "8px" }}>
                              (En cours)
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </SectionCard>

            <SectionCard
              title="Mes Activités"
              icon={<CheckCircle2 size={16} />}
              className="tm-section-card-tall"
            >
              {(() => {
                // Calculer les heures par jour de la semaine
                const daysOfWeek = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
                const hoursByDay = daysOfWeek.map((_, dayIndex) => {
                  const dayEntries = weekEntries.filter((entry) => {
                    if (!entry.startTime || !entry.endTime) return false;
                    const entryDate = new Date(entry.startTime);
                    const dayOfWeek = entryDate.getDay();
                    // Convertir dimanche (0) en 6, lundi (1) en 0, etc.
                    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    return adjustedDay === dayIndex;
                  });
                  return calculateHours(dayEntries);
                });

                const maxHours = Math.max(...hoursByDay.map((h) => h.total), 1);
                const totalWeekHours = hoursByDay.reduce((sum, h) => sum + h.hours, 0);
                const totalWeekMinutes = hoursByDay.reduce((sum, h) => sum + h.minutes, 0);
                const totalHoursFinal = totalWeekHours + Math.floor(totalWeekMinutes / 60);
                const totalMinutesFinal = totalWeekMinutes % 60;

                return (
                  <div className="tm-chart-placeholder">
                    <div className="tm-chart-bars">
                      {daysOfWeek.map((day, index) => {
                        const height = maxHours > 0 ? (hoursByDay[index].total / maxHours) * 150 : 0;
                        return (
                          <div key={day} className="tm-chart-bar-item">
                            <div
                              className="tm-chart-bar"
                              style={{ height: `${Math.max(height, 10)}px` }}
                              title={`${formatHours(hoursByDay[index].hours, hoursByDay[index].minutes)}`}
                            />
                            <span className="tm-chart-bar-label">{day}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="tm-chart-total">
                      <span>Total {filterPeriod === "week" ? "semaine" : filterPeriod === "month" ? "mois" : "période"}</span>
                      <strong>{formatHours(totalHoursFinal, totalMinutesFinal)}</strong>
                    </div>
                  </div>
                );
              })()}
            </SectionCard>

            <SectionCard title="Cross cutting Concerns">
              <ul className="tm-list">
                <li>JWT + RBAC obligatoire</li>
                <li>Audit logs par actions sensibles</li>
                <li>Transactions ACID (paie)</li>
              </ul>
            </SectionCard>
          </div>

          <div className="tm-layout-col">
            <SectionCard
              title="Gestion d'Équipes"
              icon={<Users size={16} />}
              className="tm-section-card-medium"
            >
              <div className="tm-team-management">
                {customTeamError && (
                  <div
                    style={{
                      padding: "8px 12px",
                      marginBottom: "12px",
                      backgroundColor: "#fee",
                      color: "#c33",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    {customTeamError}
                  </div>
                )}
                <button
                  className="tm-button-create-team"
                  onClick={handleCreateCustomTeam}
                  disabled={customTeamLoading}
                >
                  <Plus size={18} />
                  {customTeamLoading ? "En cours..." : "Créer une équipe"}
                </button>
                <div className="tm-team-list">
                  {teams.length === 0 && customTeams.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
                      Aucune équipe disponible
                    </div>
                  ) : (
                    <>
                      {teams.map((team) => {
                        const teamMembers = users.filter(u => u.teamId === team.id);
                        return (
                          <div key={team.id} className="tm-team-item">
                            <span className="tm-team-name">{team.name}</span>
                            <span className="tm-team-count">
                              {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        );
                      })}
                      {customTeams.map((team) => (
                        <div key={team.id} className="tm-team-item" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            className="tm-team-name"
                            style={{ cursor: "pointer", flex: 1 }}
                            title="Cliquer pour renommer l'équipe"
                            onClick={() => handleRenameCustomTeam(team)}
                          >
                            {team.name}
                          </span>
                          <span className="tm-team-count">
                            {team.memberCount !== undefined ? team.memberCount : (team.members?.length || 0)} membre{(team.memberCount !== undefined ? team.memberCount : (team.members?.length || 0)) > 1 ? 's' : ''}
                          </span>
                          <button
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleOpenTeamMembers(team)}
                            disabled={customTeamLoading}
                            title="Gérer les membres"
                          >
                            Membres
                          </button>
                          <button
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleDeleteCustomTeam(team)}
                            disabled={customTeamLoading}
                            title="Supprimer l'équipe"
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Tâches avec délais"
              icon={<ListTodo size={16} />}
              className="tm-section-card-medium"
            >
              <div style={{ marginBottom: "12px" }}>
                {taskError && (
                  <div style={{ padding: "8px 12px", marginBottom: "8px", backgroundColor: "#fee", color: "#c33", borderRadius: "4px", fontSize: "14px" }}>
                    {taskError}
                  </div>
                )}
                {taskSuccess && (
                  <div style={{ padding: "8px 12px", marginBottom: "8px", backgroundColor: "#efe", color: "#3c3", borderRadius: "4px", fontSize: "14px" }}>
                    {taskSuccess}
                  </div>
                )}
                <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(filterTeamId || filterCustomTeamId) && (
                    <div style={{ padding: "8px", backgroundColor: "#eff6ff", borderRadius: "4px", fontSize: "13px", color: "#2563eb", marginBottom: "4px" }}>
                      {filterTeamId 
                        ? `Équipe sélectionnée: ${teams.find(t => t.id === filterTeamId)?.name || "?"} - Seuls les membres de cette équipe sont affichés`
                        : `Équipe custom sélectionnée: ${customTeams.find(t => t.id === filterCustomTeamId)?.name || "?"} - Seuls les membres de cette équipe sont affichés`
                      }
                    </div>
                  )}
                  <select
                    value={taskForm.assignedToUserId}
                    onChange={(e) => setTaskForm((f) => ({ ...f, assignedToUserId: e.target.value }))}
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    required
                  >
                    <option value="">Assigner à...</option>
                    {(() => {
                      let availableUsers = users.filter((u) => u.isActive !== false);
                      
                      // Filtrer par équipe si une équipe est sélectionnée
                      if (filterTeamId) {
                        availableUsers = availableUsers.filter((u) => u.teamId === filterTeamId);
                      } else if (filterCustomTeamId) {
                        const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
                        if (customTeam && customTeam.members) {
                          const memberIds = customTeam.members.map(m => m.userId || m.id);
                          availableUsers = availableUsers.filter((u) => memberIds.includes(u.id));
                        } else {
                          availableUsers = [];
                        }
                      }
                      
                      return availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.displayName || u.username}</option>
                      ));
                    })()}
                  </select>
                  <input
                    type="text"
                    placeholder="Titre de la tâche"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description (optionnel)"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  />
                  <input
                    type="datetime-local"
                    placeholder="Date limite"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  />
                  <button type="submit" className="tm-button-outline tm-button-success" disabled={taskLoading}>
                    {taskLoading ? "En cours..." : "Ajouter la tâche"}
                  </button>
                </form>
              </div>
              <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                {taskLoading && teamTasks.length === 0 ? (
                  <p style={{ color: "#666", fontSize: "14px" }}>Chargement des tâches...</p>
                ) : (() => {
                  // Filtrer les tâches selon l'équipe sélectionnée
                  let filteredTasks = teamTasks;
                  if (filterTeamId) {
                    // Filtrer par équipe régulière : tâches assignées aux membres de cette équipe
                    const teamMemberIds = users.filter(u => u.teamId === filterTeamId).map(u => u.id);
                    filteredTasks = teamTasks.filter(t => teamMemberIds.includes(t.assignedToUserId));
                  } else if (filterCustomTeamId) {
                    // Filtrer par équipe custom : tâches assignées aux membres de cette équipe custom
                    const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
                    if (customTeam && customTeam.members) {
                      const memberIds = customTeam.members.map(m => m.userId || m.id);
                      filteredTasks = teamTasks.filter(t => memberIds.includes(t.assignedToUserId));
                    } else {
                      filteredTasks = [];
                    }
                  }
                  
                  return filteredTasks.length === 0 ? (
                    <p style={{ color: "#666", fontSize: "14px" }}>
                      {filterTeamId || filterCustomTeamId ? "Aucune tâche pour cette équipe." : "Aucune tâche."}
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {filteredTasks.map((t) => (
                      <li
                        key={t.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          padding: "10px 0",
                          borderBottom: "1px solid #eee",
                          gap: "8px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "600", marginBottom: "4px" }}>{t.title}</div>
                          {t.description && <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>{t.description}</div>}
                          <div style={{ fontSize: "12px", color: "#888" }}>
                            → {t.assignedToDisplayName || t.assignedToUsername || "?"}
                            {t.dueDate && ` · Limite: ${new Date(t.dueDate).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`}
                            {" · "}
                            <span style={{ color: t.status === "COMPLETED" ? "#16a34a" : t.status === "IN_PROGRESS" ? "#2563eb" : "#666" }}>
                              {t.status === "PENDING" ? "À faire" : t.status === "IN_PROGRESS" ? "En cours" : t.status === "COMPLETED" ? "Terminée" : t.status}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id)}
                          disabled={taskLoading}
                          title="Supprimer la tâche"
                          style={{ flexShrink: 0, padding: "6px", border: "none", background: "none", cursor: "pointer", color: "#c33" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </SectionCard>

            {/* Section Gestion des Utilisateurs */}
            {showUserManagement && (
              <SectionCard
                title="Gestion des Utilisateurs"
                icon={<Users size={16} />}
                className="tm-section-card-medium"
              >
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {users.length === 0 ? (
                    <p style={{ color: "#666", textAlign: "center", padding: "20px" }}>
                      Aucun utilisateur
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {users
                        .filter((u) =>
                          searchQuery === "" ||
                          (u.displayName || u.username || "").toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((u) => (
                          <div
                            key={u.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px",
                              backgroundColor: "#f9fafb",
                              borderRadius: "4px",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "500" }}>
                                {u.displayName || u.username}
                              </div>
                              <div style={{ fontSize: "12px", color: "#666" }}>
                                {u.email || "@" + u.username} {u.teamName ? `• ${u.teamName}` : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={() => {
                                  setSelectedUserForDetails(u);
                                  // Utiliser le cache si disponible
                                  if (userSchedulesCache[u.id]) {
                                    setUserSchedule(userSchedulesCache[u.id]);
                                    setShowScheduleModal(true);
                                  } else {
                                    schedulesAPI
                                      .getByUserId(u.id)
                                      .then((s) => {
                                        setUserSchedule(s);
                                        if (s) {
                                          setUserSchedulesCache((prev) => ({ ...prev, [u.id]: s }));
                                        }
                                      })
                                      .catch(() => setUserSchedule(null));
                                    setShowScheduleModal(true);
                                  }
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "4px",
                                  border: "1px solid #2563eb",
                                  backgroundColor: "#eff6ff",
                                  color: "#2563eb",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="Gérer les horaires"
                              >
                                <Clock size={14} /> Horaires
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUserForDetails(u);
                                  // Utiliser le cache si disponible
                                  if (userContractsCache[u.id]) {
                                    setUserContract(userContractsCache[u.id]);
                                    setShowContractModal(true);
                                  } else {
                                    contractsAPI
                                      .getByUserId(u.id)
                                      .then((c) => {
                                        setUserContract(c);
                                        if (c) {
                                          setUserContractsCache((prev) => ({ ...prev, [u.id]: c }));
                                        }
                                      })
                                      .catch(() => setUserContract(null));
                                    setShowContractModal(true);
                                  }
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "4px",
                                  border: "1px solid #10b981",
                                  backgroundColor: "#ecfdf5",
                                  color: "#10b981",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="Gérer le contrat"
                              >
                                <FileText size={14} /> Contrat
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Modal de gestion des membres */}
            {selectedTeamForMembers && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                }}
                onClick={() => setSelectedTeamForMembers(null)}
              >
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    padding: "24px",
                    maxWidth: "600px",
                    width: "90%",
                    maxHeight: "80vh",
                    overflow: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h2 style={{ margin: 0 }}>
                      Membres de "{selectedTeamForMembers.name}"
                    </h2>
                    <button
                      onClick={() => setSelectedTeamForMembers(null)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "24px",
                      }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {membersLoading ? (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      Chargement...
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
                          Membres actuels ({teamMembers.length})
                        </h3>
                        {teamMembers.length === 0 ? (
                          <p style={{ color: "#666", fontSize: "14px" }}>
                            Aucun membre dans cette équipe
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {teamMembers.map((member) => {
                              const user = users.find(
                                (u) => u.id === (member.userId || member.id)
                              );
                              return (
                                <div
                                  key={member.userId || member.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px",
                                    backgroundColor: "#f5f5f5",
                                    borderRadius: "4px",
                                  }}
                                >
                                  <span>
                                    {user?.displayName || user?.username || "Utilisateur inconnu"}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleRemoveMemberFromTeam(
                                        selectedTeamForMembers.id,
                                        member.userId || member.id
                                      )
                                    }
                                    disabled={membersLoading}
                                    style={{
                                      fontSize: "12px",
                                      padding: "4px 8px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <UserMinus size={14} /> Retirer
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
                          Ajouter un membre
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {users
                            .filter(
                              (u) =>
                                !teamMembers.some(
                                  (m) => (m.userId || m.id) === u.id
                                )
                            )
                            .map((user) => (
                              <div
                                key={user.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px",
                                  backgroundColor: "#f9f9f9",
                                  borderRadius: "4px",
                                }}
                              >
                                <span>
                                  {user.displayName || user.username}
                                </span>
                                <button
                                  onClick={() =>
                                    handleAddMemberToTeam(
                                      selectedTeamForMembers.id,
                                      user.id
                                    )
                                  }
                                  disabled={membersLoading}
                                  style={{
                                    fontSize: "12px",
                                    padding: "4px 8px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <UserPlus size={14} /> Ajouter
                                </button>
                              </div>
                            ))}
                          {users.filter(
                            (u) =>
                              !teamMembers.some(
                                (m) => (m.userId || m.id) === u.id
                              )
                          ).length === 0 && (
                              <p style={{ color: "#666", fontSize: "14px" }}>
                                Tous les utilisateurs sont déjà membres
                              </p>
                            )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <SectionCard
              title="Rapport d'Équipe"
              icon={<Clock size={16} />}
              className="tm-section-card-tall"
            >
              {(() => {
                // Utiliser les données du serveur si disponibles
                let userStats = [];

                if (reportSummary?.users && reportSummary.users.length > 0) {
                  // Filtrer par équipe normale si filterTeamId est défini
                  let filteredUsers = reportSummary.users;
                  if (filterTeamId) {
                    filteredUsers = reportSummary.users.filter(u => u.teamId === filterTeamId);
                  }
                  
                  // Filtrer par équipe custom si filterCustomTeamId est défini
                  if (filterCustomTeamId) {
                    const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
                    if (customTeam && customTeam.members) {
                      const memberIds = customTeam.members.map(m => m.userId || m.id);
                      filteredUsers = reportSummary.users.filter(u => memberIds.includes(u.userId));
                    } else {
                      filteredUsers = [];
                    }
                  }
                  
                  userStats = filteredUsers
                    .slice(0, 10) // Top 10
                    .map((u) => {
                      const totalHours = u.totalMinutes ? u.totalMinutes / 60 : (u.totalHours || 0);
                      return {
                        userId: u.userId,
                        user: { displayName: u.displayName, username: u.username },
                        hours: Math.floor(totalHours),
                        minutes: Math.round((totalHours % 1) * 60),
                        total: u.totalMinutes || 0,
                        formattedTotal: u.formattedTotal || formatHours(Math.floor(totalHours), Math.round((totalHours % 1) * 60)),
                      };
                    });
                } else {
                  // Fallback: calculer côté client
                  const hoursByUser = {};
                  weekEntries.forEach((entry) => {
                    if (!entry.startTime || !entry.endTime) return;
                    // Filtrer par équipe normale si nécessaire
                    if (filterTeamId && entry.teamId !== filterTeamId) return;
                    // Filtrer par équipe custom si nécessaire
                    if (filterCustomTeamId) {
                      const customTeam = customTeams.find(t => t.id === filterCustomTeamId);
                      if (customTeam && customTeam.members) {
                        const memberIds = customTeam.members.map(m => m.userId || m.id);
                        if (!memberIds.includes(entry.userId)) return;
                      } else {
                        return;
                      }
                    }
                    const userId = entry.userId;
                    if (!hoursByUser[userId]) {
                      hoursByUser[userId] = { entries: [], user: users.find((u) => u.id === userId) };
                    }
                    hoursByUser[userId].entries.push(entry);
                  });

                  userStats = Object.keys(hoursByUser)
                    .map((userId) => {
                      const stats = calculateHours(hoursByUser[userId].entries);
                      return {
                        userId: Number(userId),
                        user: hoursByUser[userId].user,
                        hours: stats.hours,
                        minutes: stats.minutes,
                        total: stats.total,
                        formattedTotal: formatHours(stats.hours, stats.minutes),
                      };
                    })
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);
                }

                if (userStats.length === 0) {
                  return (
                    <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                      {reportLoading ? "Chargement..." : "Aucune donnée pour cette période"}
                    </div>
                  );
                }

                const colors = ["blue", "green", "red", "orange", "purple"];
                return (
                  <div className="tm-team-report">
                    <div className="tm-pie-placeholder">
                      {/* Placeholder visuel - pourrait être remplacé par un vrai graphique */}
                    </div>
                    <div className="tm-team-legend">
                      {userStats.map((stat, index) => (
                        <div key={stat.userId} className="tm-team-legend-item">
                          <span className={`tm-dot tm-dot-${colors[index % colors.length]}`} />
                          <span>{stat.user?.displayName || stat.user?.username || "Utilisateur inconnu"}</span>
                          <strong>{stat.formattedTotal || formatHours(stat.hours, stat.minutes)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </SectionCard>

            <SectionCard
              title="Tâches à Faire"
              icon={<Coffee size={16} />}
              className="tm-section-card-medium"
            >
              <ul className="tm-task-list">
                <li>
                  <input type="checkbox" /> Préparer le rapport mensuel
                </li>
                <li>
                  <input type="checkbox" /> Réunion équipe à 11h
                </li>
                <li>
                  <input type="checkbox" /> Mettre à jour le planning
                </li>
              </ul>
            </SectionCard>

            <SectionCard
              title="Cross cutting Concerns"
              icon={<AlertCircle size={16} />}
            >
              <ul className="tm-list">
                <li>Audit logs sur actions sensibles</li>
                <li>Contrôles de conformité paie</li>
                <li>Alertes de surcharge / burnout</li>
              </ul>
            </SectionCard>
          </div>
        </div>

        {/* Modal de gestion des horaires */}
        {showScheduleModal && selectedUserForDetails && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => {
              setShowScheduleModal(false);
              setSelectedUserForDetails(null);
              setUserSchedule(null);
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "500px",
                width: "90%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0 }}>
                Horaires - {selectedUserForDetails.displayName || selectedUserForDetails.username}
              </h2>
              <ScheduleForm
                schedule={userSchedule}
                userId={selectedUserForDetails.id}
                onSave={async (schedule) => {
                  try {
                    const updated = await schedulesAPI.update(selectedUserForDetails.id, schedule);
                    setUserSchedulesCache((prev) => ({ ...prev, [selectedUserForDetails.id]: updated }));
                    setShowScheduleModal(false);
                    setSelectedUserForDetails(null);
                    setUserSchedule(null);
                  } catch (err) {
                    setError(err.message || "Erreur lors de la sauvegarde des horaires.");
                  }
                }}
                onCancel={() => {
                  setShowScheduleModal(false);
                  setSelectedUserForDetails(null);
                  setUserSchedule(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Modal de gestion du contrat */}
        {showContractModal && selectedUserForDetails && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => {
              setShowContractModal(false);
              setSelectedUserForDetails(null);
              setUserContract(null);
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "500px",
                width: "90%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0 }}>
                Contrat - {selectedUserForDetails.displayName || selectedUserForDetails.username}
              </h2>
              <ContractForm
                contract={userContract}
                userId={selectedUserForDetails.id}
                onSave={async (contract) => {
                  try {
                    const updated = await contractsAPI.update(selectedUserForDetails.id, contract);
                    setUserContractsCache((prev) => ({ ...prev, [selectedUserForDetails.id]: updated }));
                    setShowContractModal(false);
                    setSelectedUserForDetails(null);
                    setUserContract(null);
                  } catch (err) {
                    setError(err.message || "Erreur lors de la sauvegarde du contrat.");
                  }
                }}
                onCancel={() => {
                  setShowContractModal(false);
                  setSelectedUserForDetails(null);
                  setUserContract(null);
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Composants réutilisables pour les formulaires
function ScheduleForm({ schedule, userId, onSave, onCancel }) {
  const [amStart, setAmStart] = useState(schedule?.amStart || "09:00");
  const [amEnd, setAmEnd] = useState(schedule?.amEnd || "12:00");
  const [pmStart, setPmStart] = useState(schedule?.pmStart || "13:00");
  const [pmEnd, setPmEnd] = useState(schedule?.pmEnd || "17:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({ amStart, amEnd, pmStart, pmEnd });
    } catch (err) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "16px",
            backgroundColor: "#fee",
            color: "#c33",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Matin - Début
        </label>
        <input
          type="time"
          value={amStart}
          onChange={(e) => setAmStart(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
          required
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Matin - Fin
        </label>
        <input
          type="time"
          value={amEnd}
          onChange={(e) => setAmEnd(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
          required
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Après-midi - Début
        </label>
        <input
          type="time"
          value={pmStart}
          onChange={(e) => setPmStart(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
          required
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Après-midi - Fin
        </label>
        <input
          type="time"
          value={pmEnd}
          onChange={(e) => setPmEnd(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
          required
        />
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            backgroundColor: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function ContractForm({ contract, userId, onSave, onCancel }) {
  const [type, setType] = useState(contract?.type || "CDI");
  const [startDate, setStartDate] = useState(
    contract?.startDate ? contract.startDate.split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    contract?.endDate ? contract.endDate.split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        type,
        startDate: startDate || null,
        endDate: endDate || null,
      });
    } catch (err) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "16px",
            backgroundColor: "#fee",
            color: "#c33",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Type de contrat
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
          required
        >
          <option value="CDI">CDI (Contrat à Durée Indéterminée)</option>
          <option value="CDD">CDD (Contrat à Durée Déterminée)</option>
          <option value="STAGE">Stage</option>
          <option value="OTHER">Autre</option>
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Date de début
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Date de fin (optionnel, pour CDD/Stage)
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            backgroundColor: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}


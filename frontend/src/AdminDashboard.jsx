import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Clock,
  FileText,
  LogOut,
  User,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Bell,
  ChevronDown,
  Filter,
  CheckCircle2,
  Coffee,
  Plus,
  X,
  UserPlus,
  UserMinus,
  ListTodo,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { usersAPI, timeEntriesAPI, auditLogsAPI, schedulesAPI, contractsAPI, teamsAPI, customTeamsAPI, reportsAPI, tasksAPI } from "./api";
import { ManagerDashboard } from "./ManagerDashboard";

export function AdminDashboard() {
  const { user, logout, isOnline } = useAuth();
  const [users, setUsers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [userSchedule, setUserSchedule] = useState(null);
  const [userContract, setUserContract] = useState(null);
  const [userSchedules, setUserSchedules] = useState({}); // Cache des schedules
  const [userContracts, setUserContracts] = useState({}); // Cache des contracts
  const [userRoles, setUserRoles] = useState({}); // Cache des rôles

  // Charger les données
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersData, entriesData, logsData] = await Promise.all([
        usersAPI.getAll().catch(() => []),
        timeEntriesAPI.getAll({}).catch(() => []),
        auditLogsAPI.getAll({ limit: 100 }).catch(() => []),
      ]);

      setUsers(usersData);
      setTimeEntries(entriesData);
      setAuditLogs(logsData);

      // Charger les rôles pour tous les utilisateurs
      const rolesMap = {};
      await Promise.all(
        usersData.map(async (u) => {
          try {
            const rolesData = await usersAPI.getRoles(u.id).catch(() => ({ roles: [] }));
            rolesMap[u.id] = rolesData.roles || [];
          } catch {}
        })
      );
      setUserRoles(rolesMap);

      // Charger les schedules et contracts pour tous les utilisateurs
      const schedulesMap = {};
      const contractsMap = {};
      await Promise.all(
        usersData.map(async (u) => {
          try {
            const schedule = await schedulesAPI.getByUserId(u.id).catch(() => null);
            if (schedule) schedulesMap[u.id] = schedule;
          } catch {}
          try {
            const contract = await contractsAPI.getByUserId(u.id).catch(() => null);
            if (contract) contractsMap[u.id] = contract;
          } catch {}
        })
      );
      setUserSchedules(schedulesMap);
      setUserContracts(contractsMap);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des données");
      console.error("Erreur chargement données:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleEditSchedule = async (user) => {
    setSelectedUser(user);
    // Utiliser le cache si disponible, sinon charger
    const cached = userSchedules[user.id];
    if (cached) {
      setUserSchedule(cached);
      setShowScheduleModal(true);
    } else {
      try {
        const schedule = await schedulesAPI.getByUserId(user.id).catch(() => null);
        setUserSchedule(schedule);
        if (schedule) {
          setUserSchedules((prev) => ({ ...prev, [user.id]: schedule }));
        }
        setShowScheduleModal(true);
      } catch (err) {
        console.error("Erreur chargement schedule:", err);
        setUserSchedule(null);
        setShowScheduleModal(true);
      }
    }
  };

  const handleEditContract = async (user) => {
    setSelectedUser(user);
    // Utiliser le cache si disponible, sinon charger
    const cached = userContracts[user.id];
    if (cached) {
      setUserContract(cached);
      setShowContractModal(true);
    } else {
      try {
        const contract = await contractsAPI.getByUserId(user.id).catch(() => null);
        setUserContract(contract);
        if (contract) {
          setUserContracts((prev) => ({ ...prev, [user.id]: contract }));
        }
        setShowContractModal(true);
      } catch (err) {
        console.error("Erreur chargement contract:", err);
        setUserContract(null);
        setShowContractModal(true);
      }
    }
  };

  const handleSaveSchedule = async (schedule) => {
    if (!selectedUser) return;
    try {
      const updated = await schedulesAPI.update(selectedUser.id, schedule);
      setUserSchedules((prev) => ({ ...prev, [selectedUser.id]: updated }));
      setShowScheduleModal(false);
      setSelectedUser(null);
      setUserSchedule(null);
    } catch (err) {
      console.error("Erreur sauvegarde schedule:", err);
      setError(err.message || "Erreur lors de la sauvegarde des horaires.");
    }
  };

  const handleSaveContract = async (contract) => {
    if (!selectedUser) return;
    try {
      const updated = await contractsAPI.update(selectedUser.id, contract);
      setUserContracts((prev) => ({ ...prev, [selectedUser.id]: updated }));
      setShowContractModal(false);
      setSelectedUser(null);
      setUserContract(null);
    } catch (err) {
      console.error("Erreur sauvegarde contract:", err);
      setError(err.message || "Erreur lors de la sauvegarde du contrat.");
    }
  };

  const handleUpdateUser = async (updates) => {
    if (!selectedUser) return;

    try {
      const updated = await usersAPI.update(selectedUser.id, updates);
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updated : u)));
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Erreur mise à jour utilisateur:", err);
      setError(err.message || "Erreur lors de la mise à jour de l'utilisateur.");
    }
  };

  const handleDeleteTimeEntry = async (entryId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce pointage ?")) {
      return;
    }

    try {
      await timeEntriesAPI.delete(entryId);
      setTimeEntries((prev) => prev.filter((e) => e.id !== entryId));
      // Recharger les logs d'audit
      const logs = await auditLogsAPI.getAll({ limit: 100 });
      setAuditLogs(logs);
    } catch (err) {
      console.error("Erreur suppression pointage:", err);
      setError(err.message || "Erreur lors de la suppression du pointage.");
    }
  };

  // Statistiques globales
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.isActive !== false).length,
    totalEntries: timeEntries.length,
    openEntries: timeEntries.filter((e) => !e.endTime).length,
    totalAuditLogs: auditLogs.length,
    recentAuditLogs: auditLogs.slice(0, 10),
  };

  // Filtrer les utilisateurs
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      (u.username || "").toLowerCase().includes(query) ||
      (u.displayName || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
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
          <span className="tm-logo-text">TIME MANAGER - ADMIN</span>
        </div>

        <div className="tm-topbar-center">
          <div className="tm-topbar-welcome">
            <div className="tm-topbar-title-row">
              <span className="tm-topbar-greeting">
                Administration - {user?.displayName || user?.username || "Admin"}
              </span>
            </div>
          </div>
        </div>

        <div className="tm-topbar-right">
          <div className="tm-topbar-avatar">
            <div className="tm-avatar-circle">
              <Shield size={18} />
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
          <div
            style={{
              padding: "12px",
              marginBottom: "16px",
              backgroundColor: "#fff3cd",
              color: "#856404",
              borderRadius: "4px",
              border: "1px solid #ffeaa7",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️</span>
            <span>Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px",
              marginBottom: "16px",
              backgroundColor: "#fee",
              color: "#c33",
              borderRadius: "4px",
            }}
          >
            Erreur: {error}
          </div>
        )}

        {/* Onglets */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            borderBottom: "2px solid #e5e7eb",
          }}
        >
          {[
            { id: "overview", label: "Vue d'ensemble", icon: TrendingUp },
            { id: "manager", label: "Fonctions Manager", icon: Users },
            { id: "managers", label: "Gestion Managers", icon: Shield },
            { id: "users", label: "Utilisateurs", icon: Users },
            { id: "entries", label: "Pointages", icon: Clock },
            { id: "audit", label: "Audit Logs", icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                border: "none",
                background: "none",
                borderBottom:
                  activeTab === tab.id ? "3px solid #2563eb" : "3px solid transparent",
                color: activeTab === tab.id ? "#2563eb" : "#666",
                fontWeight: activeTab === tab.id ? "600" : "400",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vue d'ensemble */}
        {activeTab === "overview" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  padding: "24px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <Users size={24} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Utilisateurs</h3>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2563eb" }}>
                  {stats.totalUsers}
                </div>
                <div style={{ color: "#666", fontSize: "14px" }}>
                  {stats.activeUsers} actifs
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  padding: "24px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <Clock size={24} color="#10b981" />
                  <h3 style={{ margin: 0 }}>Pointages</h3>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981" }}>
                  {stats.totalEntries}
                </div>
                <div style={{ color: "#666", fontSize: "14px" }}>
                  {stats.openEntries} en cours
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  padding: "24px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <FileText size={24} color="#f59e0b" />
                  <h3 style={{ margin: 0 }}>Audit Logs</h3>
                </div>
                <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
                  {stats.totalAuditLogs}
                </div>
                <div style={{ color: "#666", fontSize: "14px" }}>
                  Dernières 100 actions
                </div>
              </div>
            </div>

            {/* Derniers logs d'audit */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Dernières Actions</h2>
              {stats.recentAuditLogs.length === 0 ? (
                <p style={{ color: "#666" }}>Aucun log d'audit récent</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {stats.recentAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "12px",
                        backgroundColor: "#f9fafb",
                        borderRadius: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "500" }}>{log.action}</div>
                        <div style={{ fontSize: "14px", color: "#666" }}>
                          {log.username} - {log.entityType} #{log.entityId}
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {new Date(log.createdAt).toLocaleString("fr-FR")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gestion des utilisateurs */}
        {activeTab === "users" && (
          <div>
            <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#666" }} />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 40px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
                Liste des Utilisateurs ({filteredUsers.length})
              </h2>
              {filteredUsers.length === 0 ? (
                <p style={{ color: "#666" }}>Aucun utilisateur trouvé</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left" }}>Utilisateur</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Email</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Équipe</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Horaires</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Contrat</th>
                        <th style={{ padding: "12px", textAlign: "center" }}>Statut</th>
                        <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const schedule = userSchedules[u.id];
                        const contract = userContracts[u.id];
                        return (
                          <tr key={u.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "12px" }}>
                            <div style={{ fontWeight: "500" }}>{u.displayName || u.username}</div>
                            <div style={{ fontSize: "12px", color: "#666" }}>@{u.username}</div>
                          </td>
                          <td style={{ padding: "12px" }}>{u.email || "-"}</td>
                          <td style={{ padding: "12px" }}>{u.teamName || "-"}</td>
                          <td style={{ padding: "12px", fontSize: "12px", minWidth: "150px" }}>
                            {schedule ? (
                              <div>
                                <div style={{ marginBottom: "4px" }}>
                                  <strong>Matin:</strong> {schedule.amStart} - {schedule.amEnd}
                                </div>
                                <div>
                                  <strong>Après-midi:</strong> {schedule.pmStart} - {schedule.pmEnd}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#999", fontStyle: "italic" }}>Non défini</span>
                            )}
                          </td>
                          <td style={{ padding: "12px", fontSize: "12px", minWidth: "120px" }}>
                            {contract ? (
                              <div>
                                <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                                  {contract.type}
                                </div>
                                {contract.startDate && (
                                  <div style={{ color: "#666", fontSize: "11px" }}>
                                    Du {new Date(contract.startDate).toLocaleDateString("fr-FR")}
                                  </div>
                                )}
                                {contract.endDate && (
                                  <div style={{ color: "#666", fontSize: "11px" }}>
                                    Au {new Date(contract.endDate).toLocaleDateString("fr-FR")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#999", fontStyle: "italic" }}>Non défini</span>
                            )}
                          </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              {u.isActive !== false ? (
                                <span style={{ color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                  <CheckCircle size={16} /> Actif
                                </span>
                              ) : (
                                <span style={{ color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                  <XCircle size={16} /> Inactif
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }}>
                                <button
                                  onClick={() => handleEditUser(u)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                    border: "1px solid #ddd",
                                    backgroundColor: "white",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "12px",
                                  }}
                                  title="Modifier l'utilisateur"
                                >
                                  <Edit size={14} /> Modifier
                                </button>
                                <button
                                  onClick={() => handleEditSchedule(u)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                    border: "1px solid #2563eb",
                                    backgroundColor: schedule ? "#eff6ff" : "#fff7ed",
                                    color: "#2563eb",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "12px",
                                  }}
                                  title={schedule ? "Modifier les horaires" : "Définir les horaires"}
                                >
                                  <Clock size={14} /> {schedule ? "Horaires" : "Définir"}
                                </button>
                                <button
                                  onClick={() => handleEditContract(u)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                    border: "1px solid #10b981",
                                    backgroundColor: contract ? "#ecfdf5" : "#fff7ed",
                                    color: "#10b981",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "12px",
                                  }}
                                  title={contract ? "Modifier le contrat" : "Définir le contrat"}
                                >
                                  <FileText size={14} /> {contract ? "Contrat" : "Définir"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gestion des pointages */}
        {activeTab === "entries" && (
          <div>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
                Tous les Pointages ({timeEntries.length})
              </h2>
              {timeEntries.length === 0 ? (
                <p style={{ color: "#666" }}>Aucun pointage</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left" }}>Utilisateur</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Date</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Entrée</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Sortie</th>
                        <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.slice(0, 100).map((entry) => {
                        const start = entry.startTime ? new Date(entry.startTime) : null;
                        const end = entry.endTime ? new Date(entry.endTime) : null;
                        return (
                          <tr key={entry.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "12px" }}>{entry.displayName || entry.username}</td>
                            <td style={{ padding: "12px" }}>
                              {start?.toLocaleDateString("fr-FR")}
                            </td>
                            <td style={{ padding: "12px" }}>
                              {start?.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td style={{ padding: "12px" }}>
                              {end
                                ? end.toLocaleTimeString("fr-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "En cours"}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <button
                                onClick={() => handleDeleteTimeEntry(entry.id)}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "4px",
                                  border: "none",
                                  backgroundColor: "#ef4444",
                                  color: "white",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs */}
        {activeTab === "audit" && (
          <div>
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
                Logs d'Audit ({auditLogs.length})
              </h2>
              {auditLogs.length === 0 ? (
                <p style={{ color: "#666" }}>Aucun log d'audit</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "16px",
                        backgroundColor: "#f9fafb",
                        borderRadius: "4px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "16px", marginBottom: "4px" }}>
                            {log.action}
                          </div>
                          <div style={{ fontSize: "14px", color: "#666" }}>
                            {log.username} - {log.entityType} #{log.entityId}
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {new Date(log.createdAt).toLocaleString("fr-FR")}
                        </div>
                      </div>
                      {log.metadata && (
                        <div style={{ fontSize: "12px", color: "#666", fontFamily: "monospace", marginTop: "8px", padding: "8px", backgroundColor: "white", borderRadius: "4px" }}>
                          {JSON.stringify(log.metadata, null, 2)}
                        </div>
                      )}
                      {log.ipAddress && (
                        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                          IP: {log.ipAddress}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fonctions Manager - Toutes les fonctionnalités du ManagerDashboard */}
        {activeTab === "manager" && (
          <div>
            <div style={{ padding: "16px", backgroundColor: "#eff6ff", borderRadius: "8px", marginBottom: "16px" }}>
              <p style={{ margin: 0, color: "#2563eb" }}>
                <strong>Mode Admin :</strong> Vous avez accès à toutes les fonctionnalités du Manager Dashboard.
                Vous pouvez gérer les équipes, les tâches, voir les rapports et KPIs pour toutes les équipes.
              </p>
            </div>
            <div style={{ marginTop: "0", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "70px", backgroundColor: "white", zIndex: 1000 }} />
              <div style={{ marginTop: "-70px", paddingTop: "70px" }}>
                <ManagerDashboard />
              </div>
            </div>
          </div>
        )}

        {/* Gestion des Managers */}
        {activeTab === "managers" && (
          <div>
            <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#666" }} />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 40px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
                Gestion des Managers
              </h2>
              <p style={{ color: "#666", marginBottom: "16px" }}>
                Promouvez des utilisateurs en managers ou rétrogradez des managers en employés.
              </p>
              {filteredUsers.length === 0 ? (
                <p style={{ color: "#666" }}>Aucun utilisateur trouvé</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "12px", textAlign: "left" }}>Utilisateur</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Rôles actuels</th>
                        <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <ManagerRoleRow key={u.id} user={u} onUpdate={async () => {
                          // Recharger les données après mise à jour
                          try {
                            const [usersData] = await Promise.all([
                              usersAPI.getAll().catch(() => []),
                            ]);
                            setUsers(usersData);
                            // Recharger les rôles
                            const rolesMap = {};
                            await Promise.all(
                              usersData.map(async (u) => {
                                try {
                                  const rolesData = await usersAPI.getRoles(u.id).catch(() => ({ roles: [] }));
                                  rolesMap[u.id] = rolesData.roles || [];
                                } catch {}
                              })
                            );
                            setUserRoles(rolesMap);
                          } catch (err) {
                            console.error("Erreur rechargement:", err);
                          }
                        }} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de modification utilisateur */}
        {showUserModal && selectedUser && (
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
              setShowUserModal(false);
              setSelectedUser(null);
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "500px",
                width: "90%",
                maxHeight: "90vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0 }}>Modifier l'utilisateur</h2>
              <UserEditForm
                user={selectedUser}
                onSave={handleUpdateUser}
                onCancel={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Modal de gestion des horaires */}
        {showScheduleModal && selectedUser && (
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
              setSelectedUser(null);
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
                Horaires - {selectedUser.displayName || selectedUser.username}
              </h2>
              <ScheduleForm
                schedule={userSchedule}
                userId={selectedUser.id}
                onSave={handleSaveSchedule}
                onCancel={() => {
                  setShowScheduleModal(false);
                  setSelectedUser(null);
                  setUserSchedule(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Modal de gestion du contrat */}
        {showContractModal && selectedUser && (
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
              setSelectedUser(null);
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
                Contrat - {selectedUser.displayName || selectedUser.username}
              </h2>
              <ContractForm
                contract={userContract}
                userId={selectedUser.id}
                onSave={handleSaveContract}
                onCancel={() => {
                  setShowContractModal(false);
                  setSelectedUser(null);
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

function UserEditForm({ user, onSave, onCancel }) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [email, setEmail] = useState(user.email || "");
  const [isActive, setIsActive] = useState(user.isActive !== false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      displayName: displayName.trim() || null,
      email: email.trim() || null,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
          Nom d'affichage
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
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
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span>Utilisateur actif</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            backgroundColor: "white",
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}

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

    // Validation
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(amStart) || !timeRegex.test(amEnd) || !timeRegex.test(pmStart) || !timeRegex.test(pmEnd)) {
      setError("Format d'heure invalide (attendu HH:MM)");
      setLoading(false);
      return;
    }

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

// Composant pour gérer les rôles d'un manager
function ManagerRoleRow({ user, onUpdate }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRoles();
  }, [user.id]);

  const loadRoles = async () => {
    try {
      const data = await usersAPI.getRoles(user.id);
      setRoles(data.roles || []);
    } catch (err) {
      console.error("Erreur chargement rôles:", err);
      setRoles([]);
    }
  };

  const handlePromoteToManager = async () => {
    if (!window.confirm(`Promouvoir ${user.displayName || user.username} en manager ?`)) return;
    try {
      setLoading(true);
      setError(null);
      const newRoles = roles.includes("ROLE_MANAGER") 
        ? roles 
        : [...roles.filter(r => r !== "ROLE_ADMIN"), "ROLE_MANAGER", "ROLE_EMPLOYEE"];
      await usersAPI.updateRoles(user.id, newRoles);
      setRoles(newRoles);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message || "Erreur lors de la promotion");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteFromManager = async () => {
    if (!window.confirm(`Rétrograder ${user.displayName || user.username} en employé ?`)) return;
    try {
      setLoading(true);
      setError(null);
      const newRoles = roles.filter(r => r !== "ROLE_MANAGER");
      if (newRoles.length === 0) newRoles.push("ROLE_EMPLOYEE");
      await usersAPI.updateRoles(user.id, newRoles);
      setRoles(newRoles);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message || "Erreur lors de la rétrogradation");
    } finally {
      setLoading(false);
    }
  };

  const isManager = roles.includes("ROLE_MANAGER");
  const isAdmin = roles.includes("ROLE_ADMIN");

  return (
    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
      <td style={{ padding: "12px" }}>
        <div style={{ fontWeight: "500" }}>{user.displayName || user.username}</div>
        <div style={{ fontSize: "12px", color: "#666" }}>@{user.username}</div>
        {user.email && <div style={{ fontSize: "12px", color: "#666" }}>{user.email}</div>}
      </td>
      <td style={{ padding: "12px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {roles.map((role) => (
            <span
              key={role}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                backgroundColor: role === "ROLE_ADMIN" ? "#fef3c7" : role === "ROLE_MANAGER" ? "#dbeafe" : "#e5e7eb",
                color: role === "ROLE_ADMIN" ? "#92400e" : role === "ROLE_MANAGER" ? "#1e40af" : "#374151",
                fontWeight: "500",
              }}
            >
              {role === "ROLE_ADMIN" ? "Admin" : role === "ROLE_MANAGER" ? "Manager" : "Employé"}
            </span>
          ))}
        </div>
      </td>
      <td style={{ padding: "12px", textAlign: "center" }}>
        {error && (
          <div style={{ fontSize: "12px", color: "#ef4444", marginBottom: "8px" }}>{error}</div>
        )}
        {isAdmin ? (
          <span style={{ color: "#666", fontSize: "14px" }}>Admin (ne peut pas être modifié)</span>
        ) : isManager ? (
          <button
            onClick={handleDemoteFromManager}
            disabled={loading}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #ef4444",
              backgroundColor: "white",
              color: "#ef4444",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "12px",
            }}
          >
            {loading ? "..." : "Rétrograder en employé"}
          </button>
        ) : (
          <button
            onClick={handlePromoteToManager}
            disabled={loading}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #10b981",
              backgroundColor: "white",
              color: "#10b981",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "12px",
            }}
          >
            {loading ? "..." : "Promouvoir en manager"}
          </button>
        )}
      </td>
    </tr>
  );
}

import React, { useState, useEffect } from "react";
import {
  Clock,
  LogOut,
  User,
  Calendar,
  TrendingUp,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { usersAPI, timeEntriesAPI, tasksAPI } from "./api";

// Fonction pour formater les heures
function formatHours(hours, minutes) {
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

// Fonction pour calculer les heures travaillées
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

export function EmployeeDashboard() {
  const { user, logout, isOnline } = useAuth();
  const [users, setUsers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [clockError, setClockError] = useState(null);
  const [period, setPeriod] = useState("week");
  const [myTasks, setMyTasks] = useState([]);
  const [taskCheckLoading, setTaskCheckLoading] = useState(null);

  // Charger les données
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const dateRange = period === "week" ? getWeekRange() : getMonthRange();
        const [usersData, entriesData, tasksData] = await Promise.all([
          usersAPI.getAll().catch(() => []),
          timeEntriesAPI.getAll({ from: dateRange.from, to: dateRange.to }).catch(() => []),
          tasksAPI.getAll().catch(() => []),
        ]);

        setUsers(usersData);
        setTimeEntries(entriesData);
        setMyTasks(tasksData);
      } catch (err) {
        setError(err.message || "Erreur lors du chargement des données");
        console.error("Erreur chargement données:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [period]);

  function getMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: firstDay.toISOString().split("T")[0],
      to: lastDay.toISOString().split("T")[0],
    };
  }

  // Trouver l'utilisateur courant
  const currentUserRecord = users.find(
    (u) =>
      (u.username && u.username === user?.username) ||
      (u.email && u.email === user?.username)
  );
  const currentUserId = currentUserRecord?.id;

  // Filtrer les pointages de l'utilisateur courant
  const myEntries = timeEntries.filter((e) => e.userId === currentUserId);

  // Dernier pointage en cours
  const openEntry = myEntries
    .filter((e) => !e.endTime)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] || null;

  // Calculer les heures travaillées
  const completedEntries = myEntries.filter((e) => e.startTime && e.endTime);
  const { hours: totalHours, minutes: totalMinutes } = calculateHours(completedEntries);

  const handleClockIn = async () => {
    if (!currentUserId) {
      setClockError("Impossible d'identifier votre utilisateur.");
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
      // Message de succès
      setClockError("Pointage d'entrée enregistré avec succès !");
      setTimeout(() => setClockError(null), 3000);
    } catch (err) {
      console.error("Erreur pointage entrée:", err);
      setClockError("Erreur : " + (err.message || "Erreur lors du pointage d'entrée."));
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
      // Message de succès
      setClockError("Pointage de sortie enregistré avec succès !");
      setTimeout(() => setClockError(null), 3000);
    } catch (err) {
      console.error("Erreur pointage sortie:", err);
      setClockError("Erreur : " + (err.message || "Erreur lors du pointage de sortie."));
    } finally {
      setClockLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleCheckTask = async (taskId) => {
    try {
      setTaskCheckLoading(taskId);
      const updated = await tasksAPI.update(taskId, { status: "COMPLETED" });
      setMyTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error("Erreur cocher tâche:", err);
    } finally {
      setTaskCheckLoading(null);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      setTaskCheckLoading(taskId);
      const updated = await tasksAPI.update(taskId, { status: "IN_PROGRESS" });
      setMyTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      console.error("Erreur démarrer tâche:", err);
    } finally {
      setTaskCheckLoading(null);
    }
  };

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
          <span className="tm-logo-text">TIME MANAGER</span>
        </div>

        <div className="tm-topbar-center">
          <div className="tm-topbar-welcome">
            <div className="tm-topbar-title-row">
              <span className="tm-topbar-greeting">
                Bienvenue, {user?.displayName || user?.username || "Utilisateur"} !
              </span>
            </div>
          </div>
        </div>

        <div className="tm-topbar-right">
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

        {/* Section Pointage */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
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
            <h2 style={{ marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={20} />
              Pointage
            </h2>

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

            <div style={{ marginBottom: "16px" }}>
              {openEntry ? (
                <p style={{ color: "#666", fontSize: "14px" }}>
                  Pointage en cours depuis{" "}
                  <strong>
                    {new Date(openEntry.startTime).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </p>
              ) : (
                <p style={{ color: "#666", fontSize: "14px" }}>
                  Aucun pointage en cours
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="tm-button-outline tm-button-success"
                onClick={handleClockIn}
                disabled={clockLoading || !!openEntry || !currentUserId}
                style={{ flex: 1 }}
              >
                {clockLoading && !openEntry ? "En cours..." : "Pointer Entrée"}
              </button>
              <button
                className="tm-button-outline tm-button-danger"
                onClick={handleClockOut}
                disabled={clockLoading || !openEntry || !currentUserId}
                style={{ flex: 1 }}
              >
                {clockLoading && openEntry ? "En cours..." : "Pointer Sortie"}
              </button>
            </div>
          </div>

          {/* KPI Heures travaillées */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={20} />
              Heures travaillées
            </h2>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2563eb" }}>
              {formatHours(totalHours, totalMinutes)}
            </div>
            <div style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>
              {period === "week" ? "Cette semaine" : "Ce mois"} ({completedEntries.length} pointages)
            </div>
          </div>
        </div>

        {/* Mes tâches */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ListTodo size={20} />
            Mes tâches
          </h2>
          {myTasks.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center", padding: "20px" }}>
              Aucune tâche assignée
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    backgroundColor: task.status === "COMPLETED" ? "#f0fdf4" : "#f9fafb",
                    borderRadius: "4px",
                    border: "1px solid #e5e7eb",
                    textDecoration: task.status === "COMPLETED" ? "line-through" : "none",
                  }}
                >
                  {task.status === "COMPLETED" ? (
                    <CheckCircle2 size={22} style={{ flexShrink: 0, color: "#16a34a" }} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckTask(task.id)}
                      disabled={taskCheckLoading === task.id}
                      title="Cocher comme terminée"
                      style={{
                        flexShrink: 0,
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        border: "2px solid #2563eb",
                        background: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {taskCheckLoading === task.id ? (
                        <span style={{ fontSize: "12px" }}>...</span>
                      ) : null}
                    </button>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>{task.description}</div>
                    )}
                    {task.dueDate && (
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        À rendre avant : {new Date(task.dueDate).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    )}
                  </div>
                  {task.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleStartTask(task.id)}
                      disabled={taskCheckLoading === task.id}
                      style={{
                        fontSize: "12px",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        border: "1px solid #2563eb",
                        background: "#eff6ff",
                        color: "#2563eb",
                        cursor: "pointer",
                      }}
                    >
                      Démarrer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filtre période */}
        <div style={{ marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "14px", fontWeight: "500" }}>Période :</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "14px",
            }}
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
        </div>

        {/* Historique des pointages */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={20} />
            Historique des pointages
          </h2>

          {myEntries.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center", padding: "20px" }}>
              Aucun pointage pour cette période
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {myEntries
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                .map((entry) => {
                  const start = entry.startTime ? new Date(entry.startTime) : null;
                  const end = entry.endTime ? new Date(entry.endTime) : null;
                  const duration =
                    start && end
                      ? formatHours(
                          Math.floor((end - start) / (1000 * 60 * 60)),
                          Math.floor(((end - start) / (1000 * 60)) % 60)
                        )
                      : "En cours";

                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        backgroundColor: "#f9fafb",
                        borderRadius: "4px",
                        border: openEntry?.id === entry.id ? "2px solid #2563eb" : "1px solid #e5e7eb",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                          {start?.toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </div>
                        <div style={{ fontSize: "14px", color: "#666" }}>
                          {start && (
                            <>
                              Entrée: {start.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                          {end && (
                            <>
                              {" | "}
                              Sortie: {end.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "bold", color: "#2563eb" }}>
                        {duration}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

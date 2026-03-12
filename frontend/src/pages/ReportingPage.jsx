import React from "react";

export function ReportingPage({ ctx }) {
  const {
    user,
    isAdmin,
    isManager,
    teams,
    users,
    period,
    report,
    renderSparkline,
    reportTeamId,
    setReportTeamId,
    reportTeamText,
    setReportTeamText,
    reportUserId,
    setReportUserId,
    reportUserText,
    setReportUserText,
    reportService,
    loadTeamReport,
    loadUserReport,
    teamReportLoading,
    userReportLoading,
    teamReport,
    userReport,
  } = ctx;

  const [teamDropdownOpen, setTeamDropdownOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const hasRole = (u, role) => {
    const roles = Array.isArray(u?.roles) ? u.roles : [];
    return roles.includes(role) || roles.includes(`ROLE_${role}`);
  };

  const roleLabel = (u) => {
    if (hasRole(u, "ADMIN")) return "Admin";
    if (hasRole(u, "MANAGER")) return "Manager";
    return "Employe";
  };

  const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const formatClockTime = (isoDateTime) => {
    if (!isoDateTime) return "-";
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const slugify = (value) =>
    String(value || "report")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const downloadCsv = (filename, headers, rows) => {
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const teamLabel = (u) => {
    const memberships = Array.isArray(u?.teams) ? u.teams : [];
    if (!memberships.length) return "Sans equipe";
    return memberships.map((t) => t.name).join(", ");
  };

  const userDisplayLabel = (u) =>
    `${u.displayName || u.username} (${u.username || "-"}) - ${roleLabel(u)} - ${u.department || "Sans service"} - ${teamLabel(u)}`;

  const visibleTeams = React.useMemo(() => {
    return (teams || []).filter((t) => reportService === "ALL" || (t.department || "") === reportService);
  }, [teams, reportService]);

  const managerTeamIds = React.useMemo(() => {
    if (!isManager || isAdmin) return new Set();
    const fromSession = Array.isArray(user?.managedTeamIds) ? user.managedTeamIds : [];
    const fallbackFromTeams = (teams || []).map((t) => t.id);
    const source = fromSession.length ? fromSession : fallbackFromTeams;
    return new Set(source.map((id) => String(id)));
  }, [user, teams, isManager, isAdmin]);

  const selectedTeam = React.useMemo(
    () => visibleTeams.find((t) => String(t.id) === String(reportTeamId)),
    [visibleTeams, reportTeamId]
  );

  const filteredTeams = React.useMemo(() => {
    const q = (reportTeamText || "").trim().toLowerCase();
    if (!q) return visibleTeams;
    return visibleTeams.filter((t) => `${t.name || ""} ${t.department || ""}`.toLowerCase().includes(q));
  }, [visibleTeams, reportTeamText]);

  const visibleUsers = React.useMemo(() => {
    return (users || [])
      .filter((u) => u.isProvisioned)
      .filter((u) => reportService === "ALL" || (u.department || "") === reportService)
      .filter((u) => {
        if (isAdmin) {
          return hasRole(u, "EMPLOYEE") || hasRole(u, "MANAGER");
        }
        if (!hasRole(u, "EMPLOYEE")) return false;
        if (isManager) {
          const memberships = Array.isArray(u?.teams) ? u.teams : [];
          const inManagerTeam = memberships.some((t) => managerTeamIds.has(String(t?.id)));
          if (!inManagerTeam) return false;
          if (reportTeamId) {
            return memberships.some((t) => String(t?.id) === String(reportTeamId));
          }
        }
        return true;
      });
  }, [users, isAdmin, isManager, reportService, managerTeamIds, reportTeamId]);

  const selectedUser = React.useMemo(
    () => visibleUsers.find((u) => String(u.id) === String(reportUserId)),
    [visibleUsers, reportUserId]
  );

  const filteredUsers = React.useMemo(() => {
    const q = (reportUserText || "").trim().toLowerCase();
    if (!q) return visibleUsers;
    return visibleUsers.filter((u) => userDisplayLabel(u).toLowerCase().includes(q));
  }, [visibleUsers, reportUserText]);

  React.useEffect(() => {
    if (reportTeamId && !visibleTeams.some((t) => t.id === reportTeamId)) {
      setReportTeamId("");
      setReportTeamText("");
    }
    if (reportUserId && !visibleUsers.some((u) => u.id === reportUserId)) {
      setReportUserId("");
      setReportUserText("");
    }
  }, [
    reportTeamId,
    reportUserId,
    visibleTeams,
    visibleUsers,
    setReportTeamId,
    setReportTeamText,
    setReportUserId,
    setReportUserText,
  ]);

  const lastTeamLoadKeyRef = React.useRef("");
  const lastUserLoadKeyRef = React.useRef("");

  React.useEffect(() => {
    if (!selectedTeam?.id || !report?.from || !report?.to) return;
    const key = `${selectedTeam.id}|${report.from}|${report.to}`;
    if (lastTeamLoadKeyRef.current === key) return;
    lastTeamLoadKeyRef.current = key;
    loadTeamReport(selectedTeam.id);
  }, [selectedTeam?.id, report?.from, report?.to]);

  React.useEffect(() => {
    if (!selectedUser?.id || !report?.from || !report?.to) return;
    const key = `${selectedUser.id}|${report.from}|${report.to}`;
    if (lastUserLoadKeyRef.current === key) return;
    lastUserLoadKeyRef.current = key;
    loadUserReport(selectedUser.id);
  }, [selectedUser?.id, report?.from, report?.to]);

  const teamDailyEntries = React.useMemo(
    () =>
      Object.entries(teamReport?.daily || {})
        .map(([date, minutes]) => ({ date, minutes: Number(minutes || 0) }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [teamReport]
  );

  const teamWeeklyEntries = React.useMemo(
    () =>
      Object.entries(teamReport?.weekly || {})
        .map(([date, minutes]) => ({ date, minutes: Number(minutes || 0) }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [teamReport]
  );

  const userDailyEntries = React.useMemo(() => {
    if (Array.isArray(userReport?.dailyDetails) && userReport.dailyDetails.length > 0) {
      return userReport.dailyDetails
        .map((d) => ({
          date: d.date,
          minutes: Number(d.workedMinutes || 0),
          arrivalAt: d.arrivalAt || null,
          departureAt: d.departureAt || null,
        }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }
    return Object.entries(userReport?.daily || {})
      .map(([date, minutes]) => ({
        date,
        minutes: Number(minutes || 0),
        arrivalAt: null,
        departureAt: null,
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [userReport]);

  const userWeeklyEntries = React.useMemo(
    () =>
      Object.entries(userReport?.weekly || {})
        .map(([date, minutes]) => ({ date, minutes: Number(minutes || 0) }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [userReport]
  );

  const aggregateByPeriod = React.useCallback(
    (entries) => {
      if (!Array.isArray(entries) || !entries.length) return { labels: [], values: [] };
      const buckets = new Map();
      for (const row of entries) {
        const baseDate = new Date(`${row.date}T00:00:00.000Z`);
        if (Number.isNaN(baseDate.getTime())) continue;
        let key = row.date;
        let label = baseDate.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", timeZone: "UTC" });
        if (period === "month") {
          label = baseDate.toLocaleDateString("fr-FR", { day: "2-digit", timeZone: "UTC" });
        } else if (period === "year") {
          key = `${baseDate.getUTCFullYear()}-${String(baseDate.getUTCMonth() + 1).padStart(2, "0")}`;
          label = baseDate.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
        }
        if (!buckets.has(key)) buckets.set(key, { label, value: 0 });
        buckets.get(key).value += Number(row.minutes || 0) / 60;
      }
      return {
        labels: Array.from(buckets.values()).map((v) => v.label),
        values: Array.from(buckets.values()).map((v) => Number(v.value.toFixed(2))),
      };
    },
    [period]
  );

  const parseHmToMinutes = (value) => {
    if (!value || typeof value !== "string" || !value.includes(":")) return null;
    const [hRaw, mRaw] = value.split(":");
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const formatMeanTime = (minutes) => {
    if (!Number.isFinite(minutes) || minutes < 0) return "-";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const teamSeries = React.useMemo(() => aggregateByPeriod(teamDailyEntries), [teamDailyEntries, aggregateByPeriod]);
  const userSeries = React.useMemo(() => aggregateByPeriod(userDailyEntries), [userDailyEntries, aggregateByPeriod]);

  const teamTotalHours = React.useMemo(
    () => Number((teamDailyEntries.reduce((sum, row) => sum + row.minutes, 0) / 60).toFixed(2)),
    [teamDailyEntries]
  );
  const teamAverageDailyHours = React.useMemo(
    () => Number((teamDailyEntries.length ? teamTotalHours / teamDailyEntries.length : 0).toFixed(2)),
    [teamTotalHours, teamDailyEntries.length]
  );
  const teamAverageWeeklyHours = React.useMemo(() => {
    if (!teamWeeklyEntries.length) return 0;
    const total = teamWeeklyEntries.reduce((sum, row) => sum + row.minutes, 0) / 60;
    return Number((total / teamWeeklyEntries.length).toFixed(2));
  }, [teamWeeklyEntries]);
  const teamPeakDay = React.useMemo(() => {
    if (!teamDailyEntries.length) return null;
    return teamDailyEntries.reduce((best, current) => (current.minutes > best.minutes ? current : best), teamDailyEntries[0]);
  }, [teamDailyEntries]);

  const userTotalHours = React.useMemo(
    () => Number((userDailyEntries.reduce((sum, row) => sum + row.minutes, 0) / 60).toFixed(2)),
    [userDailyEntries]
  );
  const userAverageDailyHours = React.useMemo(
    () => Number((userDailyEntries.length ? userTotalHours / userDailyEntries.length : 0).toFixed(2)),
    [userTotalHours, userDailyEntries.length]
  );
  const userAverageWeeklyHours = React.useMemo(() => {
    if (!userWeeklyEntries.length) return 0;
    const total = userWeeklyEntries.reduce((sum, row) => sum + row.minutes, 0) / 60;
    return Number((total / userWeeklyEntries.length).toFixed(2));
  }, [userWeeklyEntries]);

  const userArrivalAverage = React.useMemo(() => {
    const values = userDailyEntries
      .map((row) => {
        if (!row.arrivalAt) return null;
        const date = new Date(row.arrivalAt);
        if (Number.isNaN(date.getTime())) return null;
        return date.getHours() * 60 + date.getMinutes();
      })
      .filter((v) => Number.isFinite(v));
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [userDailyEntries]);

  const punctualityRate = React.useMemo(() => {
    const scheduleStart = parseHmToMinutes(selectedUser?.scheduleAmStart);
    if (scheduleStart === null) return null;
    const grace = Number.isFinite(Number(selectedUser?.graceMinutes)) ? Number(selectedUser.graceMinutes) : 15;
    const arrivals = userDailyEntries
      .map((row) => {
        if (!row.arrivalAt) return null;
        const date = new Date(row.arrivalAt);
        if (Number.isNaN(date.getTime())) return null;
        return date.getHours() * 60 + date.getMinutes();
      })
      .filter((v) => Number.isFinite(v));
    if (!arrivals.length) return null;
    const onTimeCount = arrivals.filter((v) => v <= scheduleStart + grace).length;
    return (onTimeCount / arrivals.length) * 100;
  }, [selectedUser?.scheduleAmStart, selectedUser?.graceMinutes, userDailyEntries]);

  const teamYMax = Math.max(0, ...(teamSeries.values.length ? teamSeries.values : [0]));
  const userYMax = Math.max(0, ...(userSeries.values.length ? userSeries.values : [0]));
  const maxTicks = period === "week" ? 7 : period === "month" ? 8 : 12;

  const teamRows = React.useMemo(() => {
    const rows = [];
    teamDailyEntries.forEach((row) => rows.push({ type: "Daily", date: row.date, minutes: row.minutes }));
    teamWeeklyEntries.forEach((row) => rows.push({ type: "Weekly", date: row.date, minutes: row.minutes }));
    return rows;
  }, [teamDailyEntries, teamWeeklyEntries]);

  const userRows = React.useMemo(() => {
    const rows = [];
    userDailyEntries.forEach((row) =>
      rows.push({
        type: "Daily",
        date: row.date,
        minutes: row.minutes,
        arrivalAt: row.arrivalAt,
        departureAt: row.departureAt,
      })
    );
    userWeeklyEntries.forEach((row) =>
      rows.push({
        type: "Weekly",
        date: row.date,
        minutes: row.minutes,
        arrivalAt: null,
        departureAt: null,
      })
    );
    return rows;
  }, [userDailyEntries, userWeeklyEntries]);

  const exportTeamCsv = () => {
    if (!teamReport) return;
    const rows = [];
    for (const [periodKey, minutes] of Object.entries(teamReport.daily || {})) {
      rows.push([
        "Daily",
        periodKey,
        Number(minutes || 0),
        (Number(minutes || 0) / 60).toFixed(2),
        selectedTeam?.name || reportTeamText || "",
        selectedTeam?.department || "",
        report?.from || "",
        report?.to || "",
      ]);
    }
    for (const [periodKey, minutes] of Object.entries(teamReport.weekly || {})) {
      rows.push([
        "Weekly",
        periodKey,
        Number(minutes || 0),
        (Number(minutes || 0) / 60).toFixed(2),
        selectedTeam?.name || reportTeamText || "",
        selectedTeam?.department || "",
        report?.from || "",
        report?.to || "",
      ]);
    }
    const filename = `reporting-team-${slugify(selectedTeam?.name || reportTeamText || "selection")}-${report?.from || "from"}-${report?.to || "to"}.csv`;
    downloadCsv(filename, ["Type", "Periode", "Minutes", "Heures", "Team", "Service", "From", "To"], rows);
  };

  const exportUserCsv = () => {
    if (!userReport) return;
    const rows = [];
    const dailyDetails = Array.isArray(userReport.dailyDetails) ? userReport.dailyDetails : [];
    const hasDailyDetails = dailyDetails.length > 0;
    const dailySource = hasDailyDetails
      ? dailyDetails.map((d) => [d?.date, Number(d?.workedMinutes || 0), d?.arrivalAt || "", d?.departureAt || ""])
      : Object.entries(userReport.daily || {}).map(([periodKey, minutes]) => [periodKey, Number(minutes || 0), "", ""]);
    for (const [periodKey, minutes, arrivalAt, departureAt] of dailySource) {
      rows.push([
        "Daily",
        periodKey,
        Number(minutes || 0),
        (Number(minutes || 0) / 60).toFixed(2),
        formatClockTime(arrivalAt),
        formatClockTime(departureAt),
        selectedUser?.displayName || selectedUser?.username || reportUserText || "",
        selectedUser?.username || "",
        roleLabel(selectedUser || {}),
        selectedUser?.department || "",
        teamLabel(selectedUser || {}),
        report?.from || "",
        report?.to || "",
      ]);
    }
    for (const [periodKey, minutes] of Object.entries(userReport.weekly || {})) {
      rows.push([
        "Weekly",
        periodKey,
        Number(minutes || 0),
        (Number(minutes || 0) / 60).toFixed(2),
        "-",
        "-",
        selectedUser?.displayName || selectedUser?.username || reportUserText || "",
        selectedUser?.username || "",
        roleLabel(selectedUser || {}),
        selectedUser?.department || "",
        teamLabel(selectedUser || {}),
        report?.from || "",
        report?.to || "",
      ]);
    }
    const filename = `reporting-user-${slugify(selectedUser?.username || reportUserText || "selection")}-${report?.from || "from"}-${report?.to || "to"}.csv`;
    downloadCsv(
      filename,
      ["Type", "Periode", "Minutes", "Heures", "Arrivee", "Depart", "Utilisateur", "Username", "Role", "Service", "Equipe", "From", "To"],
      rows
    );
  };

  const kpiCardStyle = {
    padding: 12,
    borderRadius: 8,
    background: "var(--tm-bg-muted)",
    border: "1px solid var(--tm-border)",
    minHeight: 148,
  };

  if (!isAdmin && !isManager) {
    return <p className="tm-text-muted">Acces reporting reserve aux managers et administrateurs.</p>;
  }

  return (
    <div style={{ marginTop: 18, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))" }}>
      <div style={{ padding: 12, borderRadius: 8, background: "var(--tm-surface)", border: "1px solid var(--tm-border)" }}>
        <div className="tm-text-muted" style={{ marginBottom: 6 }}>
          Reporting equipe (KPI)
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <input
              value={reportTeamText}
              onChange={(e) => {
                const val = e.target.value;
                setReportTeamText(val);
                const exact = visibleTeams.find((t) => (t.name || "").toLowerCase() === val.trim().toLowerCase());
                setReportTeamId(exact ? exact.id : "");
                setTeamDropdownOpen(true);
              }}
              onFocus={() => setTeamDropdownOpen(true)}
              onBlur={() => setTimeout(() => setTeamDropdownOpen(false), 150)}
              placeholder="Rechercher / selectionner equipe..."
              className="tm-input"
            />
            {teamDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "var(--tm-surface)",
                  border: "1px solid var(--tm-border)",
                  borderRadius: "var(--tm-radius-md)",
                  boxShadow: "var(--tm-shadow-soft)",
                  zIndex: 20,
                  marginTop: 6,
                  maxHeight: 230,
                  overflowY: "auto",
                }}
              >
                {filteredTeams.length ? (
                  filteredTeams.map((t) => (
                    <button
                      key={t.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setReportTeamId(t.id);
                        setReportTeamText(t.name || "");
                        setTeamDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: "8px 10px",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--tm-text-main)",
                      }}
                    >
                      {t.name} - {t.department || "Sans service"}
                    </button>
                  ))
                ) : (
                  <div className="tm-text-muted" style={{ padding: "8px 10px" }}>
                    Aucun resultat
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                if (!reportTeamId && reportTeamText.trim()) {
                  const match = visibleTeams.find((t) => `${t.name || ""} ${t.department || ""}`.toLowerCase().includes(reportTeamText.trim().toLowerCase()));
                  if (match) {
                    setReportTeamId(match.id);
                    setReportTeamText(match.name || "");
                    loadTeamReport(match.id);
                    return;
                  }
                }
                loadTeamReport();
              }}
              className="tm-btn tm-btn-primary"
              style={{ padding: "6px 10px" }}
              disabled={teamReportLoading || !report?.from || !report?.to}
            >
              {teamReportLoading ? "Chargement..." : "Charger"}
            </button>
            <button type="button" onClick={exportTeamCsv} className="tm-btn" style={{ padding: "6px 10px" }} disabled={!teamReport}>
              Exporter CSV
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={kpiCardStyle}>
            <div className="tm-text-muted">Total travaille equipe</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{teamTotalHours.toFixed(2)}h</div>
            <div className="tm-text-muted" style={{ fontSize: 12 }}>{teamDailyEntries.length} jour(s) pointes</div>
            {renderSparkline(teamSeries.values, "team-total", "#38bdf8", {
              unit: "h",
              labels: teamSeries.labels,
              maxTicks,
              baseZero: true,
              yMin: 0,
              yMax: teamYMax,
            })}
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div style={kpiCardStyle}>
              <div className="tm-text-muted">Moyenne / jour</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{teamAverageDailyHours.toFixed(2)}h</div>
              <div className="tm-text-muted" style={{ fontSize: 12 }}>Moyenne / semaine: {teamAverageWeeklyHours.toFixed(2)}h</div>
            </div>
            <div style={kpiCardStyle}>
              <div className="tm-text-muted">Pic journalier</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{teamPeakDay ? `${(teamPeakDay.minutes / 60).toFixed(2)}h` : "-"}</div>
              <div className="tm-text-muted" style={{ fontSize: 12 }}>{teamPeakDay?.date || "Aucune donnee"}</div>
            </div>
            <div style={kpiCardStyle}>
              <div className="tm-text-muted">Membres equipe</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{selectedTeam ? Number(selectedTeam?._count?.members || selectedTeam?.members?.length || 0) : 0}</div>
              <div className="tm-text-muted" style={{ fontSize: 12 }}>Scope: {isAdmin ? "Admin" : "Manager"}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, border: "1px solid var(--tm-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ maxHeight: 290, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 100 }}>Type</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Periode</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 110 }}>Heures</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row, idx) => (
                  <tr key={`${row.type}-${row.date}-${idx}`}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{row.type}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{row.date}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{(row.minutes / 60).toFixed(2)}h</td>
                  </tr>
                ))}
                {!teamRows.length && (
                  <tr>
                    <td colSpan={3} style={{ padding: "8px", color: "var(--tm-text-muted)" }}>
                      Aucun rapport pour ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, borderRadius: 8, background: "var(--tm-surface)", border: "1px solid var(--tm-border)" }}>
        <div className="tm-text-muted" style={{ marginBottom: 6 }}>
          Reporting employe (KPI)
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <input
              value={reportUserText}
              onChange={(e) => {
                const val = e.target.value;
                setReportUserText(val);
                const exact = visibleUsers.find((u) => userDisplayLabel(u).toLowerCase() === val.trim().toLowerCase());
                setReportUserId(exact ? exact.id : "");
                setUserDropdownOpen(true);
              }}
              onFocus={() => setUserDropdownOpen(true)}
              onBlur={() => setTimeout(() => setUserDropdownOpen(false), 150)}
              placeholder="Rechercher / selectionner utilisateur..."
              className="tm-input"
            />
            {userDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "var(--tm-surface)",
                  border: "1px solid var(--tm-border)",
                  borderRadius: "var(--tm-radius-md)",
                  boxShadow: "var(--tm-shadow-soft)",
                  zIndex: 20,
                  marginTop: 6,
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {filteredUsers.length ? (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setReportUserId(u.id);
                        setReportUserText(userDisplayLabel(u));
                        setUserDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: "8px 10px",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--tm-text-main)",
                      }}
                    >
                      {userDisplayLabel(u)}
                    </button>
                  ))
                ) : (
                  <div className="tm-text-muted" style={{ padding: "8px 10px" }}>
                    Aucun resultat
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                if (!reportUserId && reportUserText.trim()) {
                  const match = visibleUsers.find((u) => userDisplayLabel(u).toLowerCase().includes(reportUserText.trim().toLowerCase()));
                  if (match) {
                    setReportUserId(match.id);
                    setReportUserText(userDisplayLabel(match));
                    loadUserReport(match.id);
                    return;
                  }
                }
                loadUserReport();
              }}
              className="tm-btn tm-btn-primary"
              style={{ padding: "6px 10px" }}
              disabled={userReportLoading || !report?.from || !report?.to}
            >
              {userReportLoading ? "Chargement..." : "Charger"}
            </button>
            <button type="button" onClick={exportUserCsv} className="tm-btn" style={{ padding: "6px 10px" }} disabled={!userReport}>
              Exporter CSV
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={kpiCardStyle}>
            <div className="tm-text-muted">Total travaille employe</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{userTotalHours.toFixed(2)}h</div>
            <div className="tm-text-muted" style={{ fontSize: 12 }}>{userDailyEntries.length} jour(s) pointes</div>
            {renderSparkline(userSeries.values, "user-total", "#60a5fa", {
              unit: "h",
              labels: userSeries.labels,
              maxTicks,
              baseZero: true,
              yMin: 0,
              yMax: userYMax,
            })}
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div style={kpiCardStyle}>
              <div className="tm-text-muted">Moyenne / jour</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{userAverageDailyHours.toFixed(2)}h</div>
              <div className="tm-text-muted" style={{ fontSize: 12 }}>Moyenne / semaine: {userAverageWeeklyHours.toFixed(2)}h</div>
            </div>
            <div style={kpiCardStyle}>
              <div className="tm-text-muted">Arrivee moyenne</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatMeanTime(userArrivalAverage)}</div>
              <div className="tm-text-muted" style={{ fontSize: 12 }}>Base clock-in/clock-out complets</div>
            </div>
            <div style={kpiCardStyle}>
              <div className="tm-text-muted">Ponctualite</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{Number.isFinite(punctualityRate) ? `${punctualityRate.toFixed(2)}%` : "-"}</div>
              <div className="tm-text-muted" style={{ fontSize: 12 }}>
                {selectedUser?.scheduleAmStart
                  ? `Heure cible ${selectedUser.scheduleAmStart} (+${Number.isFinite(Number(selectedUser?.graceMinutes)) ? Number(selectedUser.graceMinutes) : 15}min)`
                  : "Planning non defini"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, border: "1px solid var(--tm-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ maxHeight: 290, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 90 }}>Type</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Periode</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 90 }}>Arrivee</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 90 }}>Depart</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 90 }}>Heures</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((row, idx) => (
                  <tr key={`${row.type}-${row.date}-${idx}`}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{row.type}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{row.date}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{formatClockTime(row.arrivalAt)}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{formatClockTime(row.departureAt)}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{(row.minutes / 60).toFixed(2)}h</td>
                  </tr>
                ))}
                {!userRows.length && (
                  <tr>
                    <td colSpan={5} style={{ padding: "8px", color: "var(--tm-text-muted)" }}>
                      Aucun rapport pour ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

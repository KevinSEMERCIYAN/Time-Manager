import React from "react";

export function DashboardPage({ ctx }) {
  const {
    period,
    report,
    reportLoading,
    isAdmin,
    isManager,
    teams,
    users,
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
    renderSparkline,
    compressSeries,
    syncAdUsers,
    resetData,
    seedData,
    seedLoading,
    resetLoading,
    syncAdLoading,
    exportCsvLoading,
    exportCsv,
  } = ctx;
  const roleLabel = (u) => {
    const roles = Array.isArray(u?.roles) ? u.roles : [];
    if (roles.includes("ADMIN")) return "Admin";
    if (roles.includes("MANAGER")) return "Manager";
    return "Employe";
  };

  const teamLabel = (u) => {
    const memberships = Array.isArray(u?.teams) ? u.teams : [];
    if (!memberships.length) return "Sans equipe";
    return memberships.map((t) => t.name).join(", ");
  };

  const visibleTeams = React.useMemo(() => {
    return (teams || []).filter((t) => reportService === "ALL" || (t.department || "") === reportService);
  }, [teams, reportService]);

  const visibleUsers = React.useMemo(() => {
    return (users || [])
      .filter((u) => u.isProvisioned)
      .filter((u) => reportService === "ALL" || (u.department || "") === reportService)
      .filter((u) => {
        if (isAdmin) {
          const rolesList = Array.isArray(u?.roles) ? u.roles : [];
          return rolesList.includes("EMPLOYEE") || rolesList.includes("MANAGER");
        }
        return !Array.isArray(u?.roles) || u.roles.includes("EMPLOYEE");
      });
  }, [users, isAdmin, reportService]);

  const toEntries = (arr, getter) =>
    Array.isArray(arr)
      ? arr
          .map((row) => ({
            date: String(row?.date || ""),
            value: Number(getter(row)),
          }))
          .filter((row) => row.date && Number.isFinite(row.value))
      : [];

  const workEntries = toEntries(report?.dailyWorked, (d) => d.hours ?? (d.minutes || 0) / 60);
  const lateEntries = toEntries(report?.dailyLatenessRate, (d) => d.value);
  const attEntries = toEntries(report?.dailyAttendanceRate, (d) => d.value);
  const absEntries = toEntries(report?.dailyAbsenceRate, (d) => d.value);

  const aggregateSeries = React.useCallback((entries, mode, metricType) => {
    if (!entries.length) return { labels: [], values: [] };
    const map = new Map();
    for (const entry of entries) {
      const d = new Date(`${entry.date}T00:00:00.000Z`);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      let key = entry.date;
      let label = entry.date.slice(5);
      if (mode === "year") {
        key = `${y}-${String(m).padStart(2, "0")}`;
        label = d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
      } else if (mode === "month") {
        const first = new Date(Date.UTC(y, d.getUTCMonth(), 1));
        const week = Math.floor((d.getUTCDate() + first.getUTCDay() - 1) / 7) + 1;
        key = `${y}-${String(m).padStart(2, "0")}-S${week}`;
        label = `S${week}`;
      } else {
        label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", timeZone: "UTC" });
      }
      if (!map.has(key)) map.set(key, { label, sum: 0, count: 0 });
      const bucket = map.get(key);
      bucket.sum += entry.value;
      bucket.count += 1;
    }
    const values = Array.from(map.values()).map((bucket) => {
      if (metricType === "sum") return bucket.sum;
      return bucket.count ? bucket.sum / bucket.count : 0;
    });
    const labels = Array.from(map.values()).map((bucket) => bucket.label);
    return { labels, values };
  }, []);

  const workAgg = aggregateSeries(workEntries, period, "sum");
  const lateAgg = aggregateSeries(lateEntries, period, "avg");
  const attAgg = aggregateSeries(attEntries, period, "avg");
  const absAgg = aggregateSeries(absEntries, period, "avg");
  const axisLabels = workAgg.labels.length ? workAgg.labels : lateAgg.labels.length ? lateAgg.labels : attAgg.labels.length ? attAgg.labels : absAgg.labels;
  const workSeries = workAgg.values;
  const lateSeries = lateAgg.values;
  const attSeries = attAgg.values;
  const absSeries = absAgg.values;
  const maxTicks = period === "week" ? 7 : period === "month" ? 6 : 12;

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

  return (
    <>
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          opacity: reportLoading ? 0.55 : 1,
          transition: "opacity 220ms ease",
        }}
      >
        {(isAdmin || isManager) && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: 12,
              borderRadius: 8,
              background: "var(--tm-surface)",
              border: "1px solid var(--tm-border)",
              minHeight: 140,
            }}
          >
            <div className="tm-text-muted">Total travaille</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.workedHours.toFixed(2)}h` : "-"}</div>
            <div style={{ fontSize: 12, color: "var(--tm-text-muted)" }}>Sur periode</div>
            {renderSparkline(workSeries, "total", "#38bdf8", {
              unit: "h",
              formatValue: (v) => `${v.toFixed(2)}h`,
              lineWidth: period === "year" ? 1 : 1.2,
              labels: axisLabels,
              maxTicks,
              baseZero: true,
            })}
          </div>
        )}

        <div
          style={{
            gridColumn: "1 / 2",
            padding: 12,
            borderRadius: 8,
            background: "var(--tm-surface)",
            border: "1px solid var(--tm-border)",
            minHeight: 140,
          }}
        >
          <div className="tm-text-muted">Taux de retard {isAdmin || isManager ? "moyen" : "personnel"}</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.latenessRate.toFixed(2)}%` : "-"}</div>
          <div style={{ fontSize: 12, color: "var(--tm-text-muted)" }}>Sur {(report?.lateCount ?? "-")} / {(report?.expectedShiftCount || 0)} jours</div>
          {renderSparkline(lateSeries, "late", "#f59e0b", {
            unit: "%",
            formatValue: (v) => `${v.toFixed(1)}%`,
            lineWidth: period === "year" ? 1 : 1.2,
            labels: axisLabels,
            maxTicks,
            baseZero: true,
          })}
        </div>

        <div
          style={{
            gridColumn: "2 / 3",
            padding: 12,
            borderRadius: 8,
            background: "var(--tm-surface)",
            border: "1px solid var(--tm-border)",
            minHeight: 140,
          }}
        >
          <div className="tm-text-muted">Temps travaille {isAdmin || isManager ? "moyen" : "personnel"}</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.averageHours.toFixed(2)}h` : "-"}</div>
          <div style={{ fontSize: 12, color: "var(--tm-text-muted)" }}>Sur periode</div>
          {renderSparkline(workSeries, "work", "#60a5fa", {
            unit: "h",
            formatValue: (v) => `${v.toFixed(2)}h`,
            lineWidth: period === "year" ? 1 : 1.2,
            labels: axisLabels,
            maxTicks,
            baseZero: true,
          })}
        </div>

        <div
          style={{
            gridColumn: "1 / 2",
            padding: 12,
            borderRadius: 8,
            background: "var(--tm-surface)",
            border: "1px solid var(--tm-border)",
            minHeight: 140,
          }}
        >
          <div className="tm-text-muted">Taux d’assiduite</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.attendanceRate.toFixed(2)}%` : "-"}</div>
          <div style={{ fontSize: 12, color: "var(--tm-text-muted)" }}>{report ? `${report.workedHours.toFixed(2)}h / ${report.expectedHours.toFixed(2)}h` : "-"}</div>
          {renderSparkline(attSeries, "att", "#34d399", {
            unit: "%",
            formatValue: (v) => `${v.toFixed(1)}%`,
            lineWidth: period === "year" ? 1 : 1.2,
            labels: axisLabels,
            maxTicks,
            baseZero: true,
          })}
        </div>

        <div
          style={{
            gridColumn: "2 / 3",
            padding: 12,
            borderRadius: 8,
            background: "var(--tm-surface)",
            border: "1px solid var(--tm-border)",
            minHeight: 140,
          }}
        >
          <div className="tm-text-muted">Absences</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.absenceRate.toFixed(2)}%` : "-"}</div>
          <div style={{ fontSize: 12, color: "var(--tm-text-muted)" }}>{report ? `${report.absenceCount} / ${report.expectedShiftCount} jours` : "-"}</div>
          {renderSparkline(absSeries, "abs", "#ef4444", {
            unit: "%",
            formatValue: (v) => `${v.toFixed(1)}%`,
            lineWidth: period === "year" ? 1 : 1.2,
            labels: axisLabels,
            maxTicks,
            baseZero: true,
          })}
        </div>
      </div>

      {(isAdmin || isManager) && (
        <div style={{ marginTop: 18, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--tm-surface)", border: "1px solid var(--tm-border)" }}>
            <div className="tm-text-muted" style={{ marginBottom: 6 }}>
              Reporting equipe (daily/weekly)
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                list="tm-team-report-list"
                value={reportTeamText}
                onChange={(e) => {
                  const val = e.target.value;
                  setReportTeamText(val);
                  const exact = visibleTeams.find((t) => (t.name || "").toLowerCase() === val.trim().toLowerCase());
                  if (exact) setReportTeamId(exact.id);
                }}
                placeholder="Rechercher equipe (texte)"
                className="tm-input"
              />
              <datalist id="tm-team-report-list">
                {visibleTeams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {(t.department || "Sans service")}
                  </option>
                ))}
              </datalist>
              <select
                value={reportTeamId}
                onChange={(e) => {
                  const next = e.target.value;
                  setReportTeamId(next);
                  const selected = visibleTeams.find((t) => t.id === next);
                  setReportTeamText(selected?.name || "");
                }}
                className="tm-input"
              >
                <option value="">Selectionner equipe...</option>
                {visibleTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} - {t.department || "Sans service"}</option>
                ))}
              </select>
              <div>
              <button
                type="button"
                onClick={() => {
                  if (!reportTeamId && reportTeamText.trim()) {
                    const match = visibleTeams.find((t) => (t.name || "").toLowerCase().includes(reportTeamText.trim().toLowerCase()));
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
                title={!report?.from || !report?.to ? "Sélectionnez une période (filtres ci-dessus) puis rechargez le rapport principal." : undefined}
              >
                {teamReportLoading ? "Chargement…" : "Charger"}
              </button>
              </div>
            </div>
            {(!report?.from || !report?.to) && <div className="tm-text-muted" style={{ fontSize: 11, marginTop: 4 }}>Période requise : utilisez les filtres ci-dessus.</div>}
            {teamReport && (
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "var(--tm-text-main)" }}>
                <div><strong>Daily</strong></div>
                {Object.entries(teamReport.daily || {}).map(([k, v]) => (<div key={k}>{k}: {(v / 60).toFixed(2)}h</div>))}
                <div style={{ marginTop: 6 }}><strong>Weekly</strong></div>
                {Object.entries(teamReport.weekly || {}).map(([k, v]) => (<div key={k}>{k}: {(v / 60).toFixed(2)}h</div>))}
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderRadius: 8, background: "var(--tm-surface)", border: "1px solid var(--tm-border)" }}>
            <div className="tm-text-muted" style={{ marginBottom: 6 }}>
              Reporting employe (daily/weekly)
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                list="tm-user-report-list"
                value={reportUserText}
                onChange={(e) => {
                  const val = e.target.value;
                  setReportUserText(val);
                  const exact = visibleUsers.find((u) => {
                    const label = `${u.displayName || u.username} (${u.username || "-"}) - ${roleLabel(u)} - ${u.department || "Sans service"} - ${teamLabel(u)}`;
                    return label.toLowerCase() === val.trim().toLowerCase();
                  });
                  if (exact) setReportUserId(exact.id);
                }}
                placeholder="Rechercher utilisateur (texte)"
                className="tm-input"
              />
              <datalist id="tm-user-report-list">
                {visibleUsers.map((u) => (
                  <option
                    key={u.id}
                    value={`${u.displayName || u.username} (${u.username || "-"}) - ${roleLabel(u)} - ${u.department || "Sans service"} - ${teamLabel(u)}`}
                  />
                ))}
              </datalist>
              <select
                value={reportUserId}
                onChange={(e) => {
                  const next = e.target.value;
                  setReportUserId(next);
                  const selected = visibleUsers.find((u) => u.id === next);
                  if (selected) {
                    setReportUserText(`${selected.displayName || selected.username} (${selected.username || "-"}) - ${roleLabel(selected)} - ${selected.department || "Sans service"} - ${teamLabel(selected)}`);
                  } else {
                    setReportUserText("");
                  }
                }}
                className="tm-input"
              >
                <option value="">Selectionner utilisateur...</option>
                {visibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.displayName || u.username} (${u.username || "-"}) - ${roleLabel(u)} - ${u.department || "Sans service"} - ${teamLabel(u)}`}
                  </option>
                ))}
              </select>
              <div>
              <button
                type="button"
                onClick={() => {
                  if (!reportUserId && reportUserText.trim()) {
                    const match = visibleUsers.find((u) => {
                      const label = `${u.displayName || u.username} (${u.username || "-"}) - ${roleLabel(u)} - ${u.department || "Sans service"} - ${teamLabel(u)}`;
                      return label.toLowerCase().includes(reportUserText.trim().toLowerCase());
                    });
                    if (match) {
                      setReportUserId(match.id);
                      setReportUserText(`${match.displayName || match.username} (${match.username || "-"}) - ${roleLabel(match)} - ${match.department || "Sans service"} - ${teamLabel(match)}`);
                      loadUserReport(match.id);
                      return;
                    }
                  }
                  loadUserReport();
                }}
                className="tm-btn tm-btn-primary"
                style={{ padding: "6px 10px" }}
                disabled={userReportLoading || !report?.from || !report?.to}
                title={!report?.from || !report?.to ? "Sélectionnez une période (filtres ci-dessus) puis rechargez le rapport principal." : undefined}
              >
                {userReportLoading ? "Chargement…" : "Charger"}
              </button>
              </div>
            </div>
            {(!report?.from || !report?.to) && <div className="tm-text-muted" style={{ fontSize: 11, marginTop: 4 }}>Période requise : utilisez les filtres ci-dessus.</div>}
            {userReport && (
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "var(--tm-text-main)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid var(--tm-border)" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 90 }}>Type</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Periode</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)", width: 90 }}>Heures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(userReport.daily || {}).map(([k, v]) => (
                      <tr key={`d-${k}`}>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Daily</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{k}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{(v / 60).toFixed(2)}h</td>
                      </tr>
                    ))}
                    {Object.entries(userReport.weekly || {}).map(([k, v]) => (
                      <tr key={`w-${k}`}>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Weekly</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{k}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>{(v / 60).toFixed(2)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && !reportLoading && (!report || report.workedHours === 0) && (
        <p className="tm-text-muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Aucune donnée de pointage sur la période. Utilisez « Générer pointages » pour créer des données de démo.
        </p>
      )}
      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isAdmin && (
          <>
            <button type="button" onClick={syncAdUsers} className="tm-btn" disabled={syncAdLoading}>
              {syncAdLoading ? "Synchronisation…" : "Sync AD"}
            </button>
            <button type="button" onClick={resetData} className="tm-btn" disabled={resetLoading}>
              {resetLoading ? "Réinitialisation…" : "Réinitialiser les données"}
            </button>
            <button type="button" onClick={seedData} className="tm-btn" disabled={seedLoading}>
              {seedLoading ? "Génération…" : "Générer pointages"}
            </button>
          </>
        )}
        <button type="button" onClick={exportCsv} className="tm-btn" disabled={exportCsvLoading}>
        {exportCsvLoading ? "Export…" : "Exporter CSV"}
      </button>
      </div>
    </>
  );
}

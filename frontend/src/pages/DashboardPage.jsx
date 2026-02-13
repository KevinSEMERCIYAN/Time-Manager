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
    syncAdUsers,
    resetData,
    seedData,
    seedLoading,
    resetLoading,
    syncAdLoading,
    exportCsvLoading,
    exportCsv,
  } = ctx;

  const workSeriesRaw = report?.dailyWorked?.map((d) => d.hours ?? (d.minutes || 0) / 60) || [];
  const lateSeriesRaw = report?.dailyLatenessRate?.map((d) => d.value) || [];
  const attSeriesRaw = report?.dailyAttendanceRate?.map((d) => d.value) || [];
  const absSeriesRaw = report?.dailyAbsenceRate?.map((d) => d.value) || [];
  const baseLen = Math.max(workSeriesRaw.length, lateSeriesRaw.length, attSeriesRaw.length, absSeriesRaw.length);
  const bucket = period === "year" ? Math.max(1, Math.ceil(baseLen / 12)) : 1;
  const slices = period === "year" ? { count: 12 } : period === "month" ? { count: 4 } : { count: 7 };

  const buildAxisLabels = (len) => {
    if (!len || len < 2) return [];
    if (period === "week") {
      const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      return Array.from({ length: len }, (_, i) => {
        const idx = Math.round((i / (len - 1)) * (days.length - 1));
        return days[idx];
      });
    }
    if (period === "month") {
      return Array.from({ length: len }, (_, i) => String(i + 1));
    }
    if (len <= 12) {
      const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];
      return Array.from({ length: len }, (_, i) => months[i] || "");
    }
    const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];
    return Array.from({ length: len }, (_, i) => months[Math.floor((i / len) * 12)]);
  };

  const workSeries = (bucket > 1 ? compressSeries(workSeriesRaw, bucket) : workSeriesRaw).slice(0, period === "year" ? 12 : undefined);
  const lateSeries = (bucket > 1 ? compressSeries(lateSeriesRaw, bucket) : lateSeriesRaw).slice(0, period === "year" ? 12 : undefined);
  const attSeries = (bucket > 1 ? compressSeries(attSeriesRaw, bucket) : attSeriesRaw).slice(0, period === "year" ? 12 : undefined);
  const absSeries = (bucket > 1 ? compressSeries(absSeriesRaw, bucket) : absSeriesRaw).slice(0, period === "year" ? 12 : undefined);
  const axisLabels = buildAxisLabels(workSeries.length || lateSeries.length || attSeries.length || absSeries.length);
  const maxTicks = period === "week" ? 7 : period === "month" ? 8 : 12;

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
              smoothing: period === "year" ? 1 : 2,
              exaggerate: period === "year" ? 3.0 : 2.2,
              slices,
              labels: axisLabels,
              maxTicks,
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
            smoothing: period === "year" ? 1 : 2,
            exaggerate: period === "year" ? 3.2 : 2.4,
            slices,
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
            smoothing: period === "year" ? 1 : 2,
            exaggerate: period === "year" ? 3.0 : 2.2,
            slices,
            labels: axisLabels,
            maxTicks,
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
            smoothing: period === "year" ? 1 : 2,
            exaggerate: period === "year" ? 3.0 : 2.2,
            slices,
            labels: axisLabels,
            maxTicks,
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
            smoothing: period === "year" ? 1 : 2,
            exaggerate: period === "year" ? 3.2 : 2.6,
            slices,
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={reportTeamId}
                onChange={(e) => setReportTeamId(e.target.value)}
                className="tm-input"
                style={{ minWidth: 200 }}
              >
                <option value="">Selectionner equipe...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button type="button" onClick={loadTeamReport} className="tm-btn tm-btn-primary" style={{ padding: "6px 10px" }} disabled={teamReportLoading}>
                {teamReportLoading ? "Chargement…" : "Charger"}
              </button>
            </div>
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={reportUserId}
                onChange={(e) => setReportUserId(e.target.value)}
                className="tm-input"
                style={{ minWidth: 200 }}
              >
                <option value="">Selectionner utilisateur...</option>
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
              <button type="button" onClick={loadUserReport} className="tm-btn tm-btn-primary" style={{ padding: "6px 10px" }} disabled={userReportLoading}>
                {userReportLoading ? "Chargement…" : "Charger"}
              </button>
            </div>
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

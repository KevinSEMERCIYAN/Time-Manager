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
    teamReport,
    userReport,
    loadUserReport,
    renderSparkline,
    compressSeries,
    syncAdUsers,
    resetData,
    seedData,
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
          <div style={{ gridColumn: "1 / -1", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Total travaille</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.workedHours.toFixed(2)}h` : "-"}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Sur periode</div>
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

        <div style={{ gridColumn: "1 / 2", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Taux de retard {isAdmin || isManager ? "moyen" : "personnel"}</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.latenessRate.toFixed(2)}%` : "-"}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Sur {(report?.lateCount ?? "-")} / {(report?.expectedShiftCount || 0)} jours</div>
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

        <div style={{ gridColumn: "2 / 3", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Temps travaille {isAdmin || isManager ? "moyen" : "personnel"}</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.averageHours.toFixed(2)}h` : "-"}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Sur periode</div>
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

        <div style={{ gridColumn: "1 / 2", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Taux d’assiduite</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.attendanceRate.toFixed(2)}%` : "-"}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{report ? `${report.workedHours.toFixed(2)}h / ${report.expectedHours.toFixed(2)}h` : "-"}</div>
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

        <div style={{ gridColumn: "2 / 3", padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", minHeight: 140 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Absences</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.absenceRate.toFixed(2)}%` : "-"}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>{report ? `${report.absenceCount} / ${report.expectedShiftCount} jours` : "-"}</div>
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
          <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Reporting equipe (daily/weekly)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={reportTeamId} onChange={(e) => setReportTeamId(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", minWidth: 200 }}>
                <option value="">Selectionner equipe...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button onClick={loadTeamReport} style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#111827", color: "white" }}>
                Charger
              </button>
            </div>
            {teamReport && (
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "#374151" }}>
                <div><strong>Daily</strong></div>
                {Object.entries(teamReport.daily || {}).map(([k, v]) => (<div key={k}>{k}: {(v / 60).toFixed(2)}h</div>))}
                <div style={{ marginTop: 6 }}><strong>Weekly</strong></div>
                {Object.entries(teamReport.weekly || {}).map(([k, v]) => (<div key={k}>{k}: {(v / 60).toFixed(2)}h</div>))}
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Reporting employe (daily/weekly)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={reportUserId} onChange={(e) => setReportUserId(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", minWidth: 200 }}>
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
              <button onClick={loadUserReport} style={{ border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: 8, background: "#111827", color: "white" }}>
                Charger
              </button>
            </div>
            {userReport && (
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12, color: "#374151" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid #e5e7eb" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", width: 90 }}>Type</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Periode</th>
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

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {isAdmin && (
          <>
            <button onClick={syncAdUsers} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>Sync AD</button>
            <button onClick={resetData} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>Reset donnees</button>
            <button onClick={seedData} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>Generer pointages</button>
          </>
        )}
        <button onClick={exportCsv} style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}>Exporter CSV</button>
      </div>
    </>
  );
}

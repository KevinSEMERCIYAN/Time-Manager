import React from "react";

export function DashboardPage({ ctx }) {
  const {
    period,
    report,
    reportLoading,
    isAdmin,
    isManager,
    renderSparkline,
    syncAdUsers,
    resetData,
    seedData,
    seedLoading,
    seedJobRunning,
    seedStatus,
    resetLoading,
    syncAdLoading,
    exportCsvLoading,
    exportCsv,
  } = ctx;

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
  const averageWorkEntries = toEntries(report?.dailyAverageWorked, (d) => d.hours ?? 0);
  const lateEntries = toEntries(report?.dailyLatenessRate, (d) => d.value);
  const attEntries = toEntries(report?.dailyAttendanceRate, (d) => d.value);
  const absEntries = toEntries(report?.dailyAbsenceRate, (d) => d.value);
  const expectedShiftEntries = toEntries(report?.dailyExpectedShiftSeries, (d) => d.value);

  const expectedByDate = React.useMemo(() => {
    const m = new Map();
    for (const entry of expectedShiftEntries) m.set(entry.date, entry.value);
    return m;
  }, [expectedShiftEntries]);

  const keepWorkingDays = React.useCallback(
    (entries) => entries.filter((entry) => (expectedByDate.get(entry.date) || 0) > 0),
    [expectedByDate]
  );
  const filterEntriesForCharts = React.useCallback(
    (entries) => (period === "year" ? entries : keepWorkingDays(entries)),
    [period, keepWorkingDays]
  );

  const resolveBucketMode = React.useCallback((entries, selectedPeriod) => {
    if (selectedPeriod === "year") return "year";
    return selectedPeriod;
  }, []);

  const aggregateSeries = React.useCallback((entries, mode, metricType, weightsByDate) => {
    if (!entries.length) return { labels: [], values: [] };
    const map = new Map();
    for (const entry of entries) {
      const d = new Date(`${entry.date}T00:00:00.000Z`);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      let key = entry.date;
      let label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
      if (mode === "year") {
        key = `${y}-${String(m).padStart(2, "0")}`;
        label = d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
      } else if (mode === "month") {
        label = String(d.getUTCDate()).padStart(2, "0");
      } else {
        label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", timeZone: "UTC" });
      }
      if (!map.has(key)) map.set(key, { label, sum: 0, count: 0, weightedSum: 0, weight: 0 });
      const bucket = map.get(key);
      bucket.sum += entry.value;
      bucket.count += 1;
      const w = Number(weightsByDate?.get?.(entry.date) || 0);
      if (Number.isFinite(w) && w > 0) {
        bucket.weightedSum += entry.value * w;
        bucket.weight += w;
      }
    }
    const values = Array.from(map.values()).map((bucket) => {
      if (metricType === "sum") return bucket.sum;
      if (metricType === "weightedAvg") return bucket.weight > 0 ? bucket.weightedSum / bucket.weight : (bucket.count ? bucket.sum / bucket.count : 0);
      return bucket.count ? bucket.sum / bucket.count : 0;
    });
    const labels = Array.from(map.values()).map((bucket) => bucket.label);
    return { labels, values };
  }, []);

  const chartWorkEntries = filterEntriesForCharts(workEntries);
  const chartAverageWorkEntries = filterEntriesForCharts(averageWorkEntries);
  const chartLateEntries = filterEntriesForCharts(lateEntries);
  const chartAttEntries = filterEntriesForCharts(attEntries);
  const chartAbsEntries = filterEntriesForCharts(absEntries);

  const resolvedPeriod = resolveBucketMode(chartWorkEntries.length ? chartWorkEntries : workEntries, period);
  const workAgg = aggregateSeries(chartWorkEntries.length ? chartWorkEntries : workEntries, resolvedPeriod, "sum");
  const averageWorkAgg = aggregateSeries(
    chartAverageWorkEntries.length ? chartAverageWorkEntries : (averageWorkEntries.length ? averageWorkEntries : workEntries),
    resolvedPeriod,
    "weightedAvg",
    expectedByDate
  );
  const lateAgg = aggregateSeries(chartLateEntries.length ? chartLateEntries : lateEntries, resolvedPeriod, "weightedAvg", expectedByDate);
  const attAgg = aggregateSeries(chartAttEntries.length ? chartAttEntries : attEntries, resolvedPeriod, "weightedAvg", expectedByDate);
  const absAgg = aggregateSeries(chartAbsEntries.length ? chartAbsEntries : absEntries, resolvedPeriod, "weightedAvg", expectedByDate);
  const axisLabels = workAgg.labels.length ? workAgg.labels : lateAgg.labels.length ? lateAgg.labels : attAgg.labels.length ? attAgg.labels : absAgg.labels;
  const workSeries = workAgg.values;
  const averageWorkSeries = averageWorkAgg.values;
  const lateSeries = lateAgg.values;
  const attSeries = attAgg.values;
  const absSeries = absAgg.values;
  const yMaxWorkedHours = Math.max(0, ...(workSeries.length ? workSeries : [0]));
  const yMaxAverageHours = Math.max(0, ...(averageWorkSeries.length ? averageWorkSeries : [0]));
  const maxTicks = resolvedPeriod === "week" ? 7 : resolvedPeriod === "month" ? 8 : 12;
  const forceAllYearTicks = resolvedPeriod === "year";
  const seedProgressPercent =
    seedJobRunning && Number(seedStatus?.totalUsers) > 0
      ? Math.max(0, Math.min(100, Math.round((Number(seedStatus?.processedUsers || 0) / Number(seedStatus.totalUsers)) * 100)))
      : null;

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
            yMin: 0,
            yMax: yMaxWorkedHours,
            forceAllTicks: forceAllYearTicks,
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
            yMin: 0,
            yMax: 100,
            forceAllTicks: forceAllYearTicks,
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
          <div className="tm-text-muted">Temps travaille moyen</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{report ? `${report.averageHours.toFixed(2)}h` : "-"}</div>
          <div style={{ fontSize: 12, color: "var(--tm-text-muted)" }}>Sur periode</div>
          {renderSparkline(averageWorkSeries, "work", "#60a5fa", {
            unit: "h",
            formatValue: (v) => `${v.toFixed(2)}h`,
            lineWidth: period === "year" ? 1 : 1.2,
            labels: axisLabels,
            maxTicks,
            baseZero: true,
            yMin: 0,
            yMax: yMaxAverageHours,
            forceAllTicks: forceAllYearTicks,
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
            yMin: 0,
            yMax: 100,
            forceAllTicks: forceAllYearTicks,
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
            yMin: 0,
            yMax: 100,
            forceAllTicks: forceAllYearTicks,
          })}
        </div>
      </div>

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
            <button type="button" onClick={resetData} className="tm-btn" disabled={resetLoading || seedJobRunning}>
              {resetLoading ? "Réinitialisation…" : "Réinitialiser les données"}
            </button>
            <button type="button" onClick={seedData} className="tm-btn" disabled={seedLoading || seedJobRunning}>
              {seedLoading
                ? "Démarrage…"
                : seedJobRunning
                  ? `Génération ${seedProgressPercent !== null ? `${seedProgressPercent}%` : "…"}`
                  : "Générer pointages"}
            </button>
          </>
        )}
        <button type="button" onClick={exportCsv} className="tm-btn" disabled={exportCsvLoading}>
        {exportCsvLoading ? "Export…" : "Exporter CSV"}
      </button>
      </div>
      {isAdmin && seedJobRunning && (
        <p className="tm-text-muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Génération en cours: {seedStatus?.processedUsers || 0}/{seedStatus?.totalUsers || 0} utilisateurs, {seedStatus?.generated || 0} lignes.
        </p>
      )}
    </>
  );
}

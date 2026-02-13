import React, { useEffect, useMemo, useState } from "react";

export function MyClocksPage({ ctx }) {
  const { user, apiFetch, setError } = ctx;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clocks, setClocks] = useState([]);
  const [loading, setLoading] = useState(false);

  const ensureDefaultRange = () => {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const fromStr = start.toISOString().slice(0, 10);
    setFrom((prev) => prev || fromStr);
    setTo((prev) => prev || toStr);
    return { from: from || fromStr, to: to || toStr };
  };

  const loadClocks = async () => {
    if (!user?.id) return;
    const range = ensureDefaultRange();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      const data = await apiFetch(`/users/${user.id}/clocks?${params.toString()}`);
      setClocks(Array.isArray(data.clocks) ? data.clocks : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const summary = useMemo(() => {
    if (!clocks.length) return { totalMinutes: 0, days: 0, last: null };
    const totalMinutes = clocks.reduce((acc, c) => acc + (c.workedMinutes || 0), 0);
    const daysSet = new Set(
      clocks.map((c) => (c.date ? c.date.slice(0, 10) : c.clockInAt?.slice(0, 10))).filter(Boolean),
    );
    const last = clocks[0] || null;
    return { totalMinutes, days: daysSet.size, last };
  }, [clocks]);

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR");
  };

  const formatTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (minutes) => {
    const m = minutes || 0;
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (!h && !r) return "-";
    return `${h}h ${String(r).padStart(2, "0")}m`;
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Mes pointages</h3>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="tm-text-muted">Période</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="tm-input"
        />
        <span className="tm-text-muted">à</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="tm-input"
        />
        <button
          type="button"
          onClick={loadClocks}
          className="tm-btn tm-btn-primary"
          disabled={loading}
        >
          {loading ? "Chargement…" : "Recharger"}
        </button>
      </div>

      <div
        className="tm-card"
        style={{ marginTop: 8, padding: 14, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <div>
          <div className="tm-text-muted">Total travaillé</div>
          <div style={{ fontWeight: 600, color: "var(--tm-text-main)" }}>{formatDuration(summary.totalMinutes)}</div>
        </div>
        <div>
          <div className="tm-text-muted">Jours pointés</div>
          <div style={{ fontWeight: 600, color: "var(--tm-text-main)" }}>{summary.days || "-"}</div>
        </div>
        <div>
          <div className="tm-text-muted">Dernier pointage</div>
          {summary.last ? (
            <div style={{ fontSize: 13 }}>
              {formatDate(summary.last.clockInAt || summary.last.date)} ·{" "}
              {formatTime(summary.last.clockInAt)} → {formatTime(summary.last.clockOutAt)}
            </div>
          ) : (
            <div style={{ fontSize: 13 }}>Aucun pointage sur la période.</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {clocks.length === 0 ? (
          <div
            className="tm-card"
            style={{ padding: 20, textAlign: "center", color: "var(--tm-text-muted)", fontSize: 13 }}
          >
            Aucun pointage trouvé pour cette période.
          </div>
        ) : (
          <div className="tm-card" style={{ padding: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Entrée</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Sortie</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Durée</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>Retard (min)</th>
                </tr>
              </thead>
              <tbody>
                {clocks.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>
                      {formatDate(c.clockInAt || c.date)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>
                      {formatTime(c.clockInAt)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>
                      {formatTime(c.clockOutAt)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>
                      {formatDuration(c.workedMinutes)}
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--tm-border)" }}>
                      {c.lateMinutes ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


import React from "react";

export function ClockModal({
  open,
  onClose,
  onClockIn,
  onClockOut,
  clockTargetLabel,
  clockError,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clock-modal-title"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tm-card"
        style={{ width: "100%", maxWidth: 420, padding: 20 }}
      >
        <h3 id="clock-modal-title" style={{ margin: "0 0 6px", color: "var(--tm-text-main)" }}>Pointage</h3>
        {clockTargetLabel && <div className="tm-text-muted">Utilisateur : {clockTargetLabel}</div>}
        {clockError && <div style={{ marginTop: 8, fontSize: 12, color: "var(--tm-danger)" }}>{clockError}</div>}
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button type="button" onClick={onClockIn} className="tm-btn tm-btn-primary" style={{ flex: 1 }}>Clock in</button>
          <button type="button" onClick={onClockOut} className="tm-btn" style={{ flex: 1, background: "var(--tm-warning)", color: "white", border: "none" }}>Clock out</button>
        </div>
        <button type="button" onClick={onClose} className="tm-btn tm-btn-danger" style={{ marginTop: 12, width: "100%" }}>Fermer</button>
      </div>
    </div>
  );
}

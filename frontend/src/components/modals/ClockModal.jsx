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
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
      >
        <h3 style={{ margin: "0 0 6px" }}>Pointage</h3>
        {clockTargetLabel && <div style={{ fontSize: 12, color: "#6b7280" }}>Utilisateur : {clockTargetLabel}</div>}
        {clockError && <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{clockError}</div>}
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button onClick={onClockIn} style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#4b5563", color: "white" }}>
            Clock in
          </button>
          <button onClick={onClockOut} style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#f59e0b", color: "white" }}>
            Clock out
          </button>
        </div>
        <button onClick={onClose} style={{ marginTop: 12, width: "100%", border: "none", padding: "10px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

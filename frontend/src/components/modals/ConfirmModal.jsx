import React from "react";

export function ConfirmModal({ open, title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
      >
        <h3 style={{ margin: "0 0 6px" }}>{title}</h3>
        <div style={{ fontSize: 13, color: "#6b7280" }}>{message}</div>
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: 8, background: "#fff" }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, border: "none", padding: "10px 12px", borderRadius: 8, background: "#ef4444", color: "white" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

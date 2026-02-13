import React from "react";

export function ConfirmModal({ open, title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tm-card"
        style={{ width: "100%", maxWidth: 420, padding: 20 }}
      >
        <h3 id="confirm-modal-title" style={{ margin: "0 0 6px", color: "var(--tm-text-main)" }}>{title}</h3>
        <div className="tm-text-muted">{message}</div>
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} className="tm-btn" style={{ flex: 1 }}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="tm-btn tm-btn-danger" style={{ flex: 1 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

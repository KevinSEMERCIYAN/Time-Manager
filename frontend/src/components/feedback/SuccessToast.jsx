import React, { useEffect } from "react";

export function SuccessToast({ message, onDismiss, autoHideMs = 4000 }) {
  useEffect(() => {
    if (!message || !onDismiss) return;
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, autoHideMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 72,
        right: 24,
        background: "var(--tm-surface)",
        color: "var(--tm-success)",
        border: "1px solid var(--tm-success)",
        padding: "10px 12px",
        borderRadius: "var(--tm-radius-md)",
        fontSize: 12,
        boxShadow: "var(--tm-shadow-soft)",
        zIndex: 9999,
      }}
    >
      {message}
    </div>
  );
}

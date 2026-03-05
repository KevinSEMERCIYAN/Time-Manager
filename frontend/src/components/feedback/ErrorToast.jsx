import React from "react";

export function ErrorToast({ error }) {
  if (!error) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--tm-surface)", color: "var(--tm-danger)", border: "1px solid var(--tm-danger)", padding: "10px 12px", borderRadius: "var(--tm-radius-md)", fontSize: 12, boxShadow: "var(--tm-shadow-soft)" }}>
      {error}
    </div>
  );
}

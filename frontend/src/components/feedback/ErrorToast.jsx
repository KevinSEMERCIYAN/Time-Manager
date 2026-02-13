import React from "react";

export function ErrorToast({ error }) {
  if (!error) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#fee2e2", color: "#991b1b", padding: "10px 12px", borderRadius: 8, fontSize: 12 }}>
      {error}
    </div>
  );
}

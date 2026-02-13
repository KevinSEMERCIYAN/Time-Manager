import React from "react";

export function LandingPage({ ctx }) {
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ color: "#374151" }}>
        Bienvenue sur TimeManager. Gerez le pointage et suivez les equipes en un seul endroit.
      </p>
      <button
        onClick={() => ctx.navigate("/sign-in")}
        style={{ marginTop: 10, border: "none", padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}
      >
        Se connecter
      </button>
    </div>
  );
}

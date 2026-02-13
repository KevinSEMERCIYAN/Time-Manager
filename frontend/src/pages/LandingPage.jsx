import React from "react";

export function LandingPage({ ctx }) {
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ color: "var(--tm-text-main)" }}>
        Bienvenue sur TimeManager. Gerez le pointage et suivez les equipes en un seul endroit.
      </p>
      <button type="button" onClick={() => ctx.navigate("/sign-in")} className="tm-btn tm-btn-primary" style={{ marginTop: 10, padding: "10px 14px" }}>
        Se connecter
      </button>
    </div>
  );
}

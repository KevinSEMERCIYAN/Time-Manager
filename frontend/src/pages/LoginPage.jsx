import React from "react";

export function LoginPage({ ctx }) {
  const { onSubmit, username, setUsername, password, setPassword, error, loading } = ctx;

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gap: 12, maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="tm-text-muted">Nom d’utilisateur</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="tm-input"
            style={{ padding: "10px 12px" }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="tm-text-muted">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="tm-input"
            style={{ padding: "10px 12px" }}
          />
        </label>
        {error && <div style={{ marginTop: 6, color: "var(--tm-danger)", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={loading} className="tm-btn tm-btn-primary" style={{ marginTop: 10, padding: "10px 12px", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </form>
  );
}

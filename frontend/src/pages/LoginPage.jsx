import React from "react";

export function LoginPage({ ctx }) {
  const { onSubmit, username, setUsername, password, setPassword, error, loading } = ctx;

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gap: 12, maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Nom d’utilisateur</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>
        {error && <div style={{ marginTop: 6, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 10,
            border: "none",
            padding: "10px 12px",
            borderRadius: 8,
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </form>
  );
}

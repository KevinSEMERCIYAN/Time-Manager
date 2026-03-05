import React from "react";

const ILLUSTRATION_SRC =
  "/assets/ChatGPT Image 3 févr. 2026, 15_05_08.png";

export function LoginPage({ ctx }) {
  const {
    onSubmit,
    username,
    setUsername,
    password,
    setPassword,
    error,
    loading,
  } = ctx;

  return (
    <div className="tm-app">
      <div className="tm-login-card">
        <header className="tm-login-header">
          <div className="tm-logo">
            <div className="tm-logo-icon">
              <span className="tm-logo-clock-hand tm-logo-hand-short" />
              <span className="tm-logo-clock-hand tm-logo-hand-long" />
            </div>
            <span className="tm-logo-text">TIME MANAGER</span>
          </div>
        </header>

        <main className="tm-login-body">
          <section className="tm-login-form">
            <h1 className="tm-login-title">Bienvenue</h1>
            <p className="tm-login-subtitle">
              Connectez-vous à votre compte
            </p>

            {error && (
              <div
                style={{
                  padding: "12px",
                  marginBottom: "16px",
                  backgroundColor: "#fee",
                  color: "#c33",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            <form className="tm-form" onSubmit={onSubmit}>
              <div className="tm-form-field">
                <label htmlFor="username" className="tm-label">
                  Nom d&apos;utilisateur
                </label>
                <div className="tm-input-wrapper">
                  <span className="tm-input-icon">@</span>
                  <input
                    id="username"
                    type="text"
                    placeholder="nom.utilisateur"
                    className="tm-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="tm-form-field">
                <label htmlFor="password" className="tm-label">
                  Mot de passe
                </label>
                <div className="tm-input-wrapper">
                  <span className="tm-input-icon">•</span>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="tm-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="tm-button-primary"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>

              <button type="button" className="tm-link-button">
                Mot de passe oublié ?
              </button>
            </form>

            <p className="tm-login-footer-text">
              Besoin d&apos;aide ?{" "}
              <button type="button" className="tm-link-inline">
                Contactez l&apos;assistance
              </button>
            </p>
          </section>

          <aside className="tm-login-illustration">
            <div className="tm-illustration-circle" />
            <img
              src={ILLUSTRATION_SRC}
              alt="Illustration de connexion Time Manager"
              className="tm-illustration-image"
            />
          </aside>
        </main>
      </div>
    </div>
  );
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import "./styles.css";
import { ManagerDashboard } from "./ManagerDashboard";

// Illustration de droite sur l'écran de connexion.
// Place le fichier tel quel dans frontend/public/assets/
// avec son nom d'origine : "ChatGPT Image 3 févr. 2026, 15_05_08.png"
const ILLUSTRATION_SRC =
  "/assets/ChatGPT Image 3 févr. 2026, 15_05_08.png";

function LoginPage() {
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

            <form className="tm-form">
              <div className="tm-form-field">
                <label htmlFor="email" className="tm-label">
                  Email
                </label>
                <div className="tm-input-wrapper">
                  <span className="tm-input-icon">
                    <Mail size={16} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="exemple@email.com"
                    className="tm-input"
                  />
                </div>
              </div>

              <div className="tm-form-field">
                <label htmlFor="password" className="tm-label">
                  Mot de passe
                </label>
                <div className="tm-input-wrapper">
                  <span className="tm-input-icon">
                    <Lock size={16} />
                  </span>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="tm-input"
                  />
                </div>
              </div>

              <button type="submit" className="tm-button-primary">
                Se connecter
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
              alt="Employé travaillant sur un ordinateur avec une horloge"
              className="tm-illustration-image"
            />
          </aside>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/manager" element={<ManagerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

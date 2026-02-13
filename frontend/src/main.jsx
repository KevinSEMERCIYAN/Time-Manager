import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { ManagerDashboard } from "./ManagerDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { AdminHome } from "./AdminHome";
import "./styles.css";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (email === "admin@bank.com" && password === "admin123") {
      navigate("/admin"); // redirige vers AdminHome
    } else if (email === "manager@bank.com" && password === "manager123") {
      navigate("/manager"); // redirige vers ManagerDashboard
    } else {
      alert("Email ou mot de passe incorrect");
    }
  };

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

            <form className="tm-form" onSubmit={handleSubmit}>
              <div className="tm-form-field">
                <label htmlFor="email" className="tm-label">Email</label>
                <div className="tm-input-wrapper">
                  <Mail size={16} />
                  <input
                    id="email"
                    type="email"
                    placeholder="exemple@email.com"
                    className="tm-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="tm-form-field">
                <label htmlFor="password" className="tm-label">Mot de passe</label>
                <div className="tm-input-wrapper">
                  <Lock size={16} />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="tm-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="tm-button-primary">
                Se connecter
              </button>
            </form>
          </section>
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
        <Route path="/admin/users" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminHome />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);


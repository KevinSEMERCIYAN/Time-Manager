import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import "./styles.css";
import { ManagerDashboard } from "./ManagerDashboard";
import { EmployeeDashboard } from "./EmployeeDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { AuthProvider, useAuth } from "./AuthContext";

// Illustration de droite sur l'écran de connexion.
// Place le fichier tel quel dans frontend/public/assets/
// avec son nom d'origine : "ChatGPT Image 3 févr. 2026, 15_05_08.png"
const ILLUSTRATION_SRC =
  "/assets/ChatGPT Image 3 févr. 2026, 15_05_08.png";

function LoginPage() {
  const { login, loading, error, user, isAdmin, isManager, isEmployee } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  // Si déjà connecté, rediriger vers le dashboard selon le rôle
  if (user) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    } else if (isManager) {
      return <Navigate to="/manager" replace />;
    } else if (isEmployee) {
      return <Navigate to="/employee" replace />;
    }
    // Par défaut, rediriger vers manager si aucun rôle spécifique
    return <Navigate to="/manager" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    
    if (!username.trim() || !password.trim()) {
      setLocalError("Veuillez remplir tous les champs");
      return;
    }

    try {
      const data = await login(username.trim(), password);
      // Rediriger selon le rôle (Admin prioritaire)
      if (data.roles?.includes("ROLE_ADMIN")) {
        window.location.href = "/admin";
      } else if (data.roles?.includes("ROLE_MANAGER")) {
        window.location.href = "/manager";
      } else if (data.roles?.includes("ROLE_EMPLOYEE")) {
        window.location.href = "/employee";
      } else {
        window.location.href = "/employee"; // Par défaut
      }
    } catch (err) {
      setLocalError(err.message || "Erreur de connexion");
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

            {(error || localError) && (
              <div style={{
                padding: "12px",
                marginBottom: "16px",
                backgroundColor: "#fee",
                color: "#c33",
                borderRadius: "4px",
                fontSize: "14px"
              }}>
                {error || localError}
              </div>
            )}

            <form className="tm-form" onSubmit={handleSubmit}>
              <div className="tm-form-field">
                <label htmlFor="username" className="tm-label">
                  Nom d&apos;utilisateur
                </label>
                <div className="tm-input-wrapper">
                  <span className="tm-input-icon">
                    <Mail size={16} />
                  </span>
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
                  <span className="tm-input-icon">
                    <Lock size={16} />
                  </span>
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
              alt="Employé travaillant sur un ordinateur avec une horloge"
              className="tm-illustration-image"
            />
          </aside>
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAdmin, isManager, isEmployee } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh" 
      }}>
        <div>Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const hasRole = 
      (requiredRole === "ROLE_ADMIN" && isAdmin) ||
      (requiredRole === "ROLE_MANAGER" && isManager) ||
      (requiredRole === "ROLE_EMPLOYEE" && isEmployee);
    
    if (!hasRole) {
      return (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100vh",
          flexDirection: "column",
          gap: "16px"
        }}>
          <h2>Accès refusé</h2>
          <p>Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.</p>
          <button onClick={() => window.location.href = "/"}>
            Retour à la connexion
          </button>
        </div>
      );
    }
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/manager" 
            element={
              <ProtectedRoute requiredRole="ROLE_MANAGER">
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee" 
            element={
              <ProtectedRoute requiredRole="ROLE_EMPLOYEE">
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="ROLE_ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

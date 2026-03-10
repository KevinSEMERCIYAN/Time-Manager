import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Shield } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();

  // Mock — plus tard /users/me
  const [userInfo, setUserInfo] = useState({
    firstname: "Julie",
    lastname: "Martin",
    email: "julie.martin@primebank.com",
    phone: "+33 6 00 00 00 00",
    role: "MANAGER",
    department: "Informatique",
  });

  function onChange(key, value) {
    setUserInfo((p) => ({ ...p, [key]: value }));
  }

  function onSave(e) {
    e.preventDefault();
    alert("Profil enregistré (mock).");
  }

  return (
    <div className="tm-dashboard-shell">
      <header className="tm-dashboard-topbar">
        <div className="tm-logo">
          <div className="tm-logo-icon">
            <span className="tm-logo-clock-hand tm-logo-hand-short" />
            <span className="tm-logo-clock-hand tm-logo-hand-long" />
          </div>
          <span className="tm-logo-text">TIME MANAGER</span>
        </div>

        <div className="tm-topbar-right">
          <button className="tm-topbar-pill" onClick={() => navigate("/manager")}>
            <ArrowLeft size={14} /> Retour dashboard
          </button>
        </div>
      </header>

      <main className="tm-dashboard-main">
        <div className="tm-layout-columns">
          <div className="tm-layout-col">
            <section className="tm-section-card tm-section-card-medium">
              <header className="tm-section-card-header">
                <div className="tm-section-card-title">
                  <span className="tm-section-card-icon">
                    <User size={16} />
                  </span>
                  <h2>Profil</h2>
                </div>
              </header>

              <div className="tm-section-card-body" style={{ justifyContent: "flex-start" }}>
                <form className="tm-form" onSubmit={onSave}>
                  <div className="tm-form-field">
                    <label className="tm-label">Prénom</label>
                    <input className="tm-input" value={userInfo.firstname} onChange={(e) => onChange("firstname", e.target.value)} />
                  </div>

                  <div className="tm-form-field">
                    <label className="tm-label">Nom</label>
                    <input className="tm-input" value={userInfo.lastname} onChange={(e) => onChange("lastname", e.target.value)} />
                  </div>

                  <div className="tm-form-field">
                    <label className="tm-label">Email</label>
                    <div className="tm-input-wrapper">
                      <span className="tm-input-icon"><Mail size={16} /></span>
                      <input className="tm-input" value={userInfo.email} onChange={(e) => onChange("email", e.target.value)} />
                    </div>
                  </div>

                  <div className="tm-form-field">
                    <label className="tm-label">Téléphone</label>
                    <div className="tm-input-wrapper">
                      <span className="tm-input-icon"><Phone size={16} /></span>
                      <input className="tm-input" value={userInfo.phone} onChange={(e) => onChange("phone", e.target.value)} />
                    </div>
                  </div>

                  <button className="tm-button-primary">Enregistrer</button>
                </form>
              </div>
            </section>
          </div>

          <div className="tm-layout-col">
            <section className="tm-section-card tm-section-card-medium">
              <header className="tm-section-card-header">
                <div className="tm-section-card-title">
                  <span className="tm-section-card-icon">
                    <Shield size={16} />
                  </span>
                  <h2>Informations internes</h2>
                </div>
              </header>

              <div className="tm-section-card-body" style={{ justifyContent: "flex-start" }}>
                <p className="tm-text-row"><strong>Rôle :</strong> {userInfo.role}</p>
                <p className="tm-text-row"><strong>Département :</strong> {userInfo.department}</p>
                <p className="tm-kpi-helper">
                  (Plus tard : gestion mot de passe, export RGPD, etc.)
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

import React from "react";
import { Users, Plus, Shield, Mail, Bell, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

function KpiCard({ label, value, helper, tone = "default" }) {
  return (
    <div className={`tm-kpi-card tm-kpi-card-${tone}`}>
      <div className="tm-kpi-label">{label}</div>
      <div className="tm-kpi-value">{value}</div>
      {helper && <div className="tm-kpi-helper">{helper}</div>}
    </div>
  );
}

function SectionCard({ title, icon, children, className = "" }) {
  return (
    <section className={`tm-section-card ${className}`}>
      <header className="tm-section-card-header">
        <div className="tm-section-card-title">
          {icon && <span className="tm-section-card-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>
      </header>
      <div className="tm-section-card-body">{children}</div>
    </section>
  );
}

export function AdminHome() {
  const navigate = useNavigate();

  // Exemple de stats
  const totalUsers = 12;
  const managers = 3;
  const employees = 9;

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
          <button className="tm-icon-button" aria-label="Messages">
            <Mail size={18} />
          </button>
          <button className="tm-icon-button" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </div>
      </header>

      <main className="tm-dashboard-main">
        {/* KPI Cards */}
        <div className="tm-kpi-grid">
          <KpiCard label="Total Utilisateurs" value={totalUsers} />
          <KpiCard label="Managers" value={managers} />
          <KpiCard label="Employés" value={employees} />
        </div>

        <div className="tm-layout-columns">
          {/* Colonne gauche */}
          <div className="tm-layout-col">
            <SectionCard title="Actions Rapides" icon={<Users size={16} />}>
              <button
                className="tm-button-primary"
                onClick={() => navigate("/admin/users")}
              >
                <Plus size={16} /> Créer un utilisateur
              </button>
             
            </SectionCard>

            <SectionCard title="Derniers Utilisateurs" icon={<Shield size={16} />}>
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Dupont</td>
                    <td>Marie</td>
                    <td>marie.dupont@bank.com</td>
                  </tr>
                  <tr>
                    <td>Benali</td>
                    <td>Omar</td>
                    <td>omar.benali@bank.com</td>
                  </tr>
                  <tr>
                    <td>k1</td>
                    <td>abd</td>
                    <td>k1.abd@bank.com</td>
                  </tr>
                </tbody>
              </table>
            </SectionCard>
          </div>

          {/* Colonne droite */}
          <div className="tm-layout-col">
            <SectionCard title="Tâches Admin" icon={<Users size={16} />}>
              <ul className="tm-task-list">
                <li>
                  <input type="checkbox" /> Valider les nouvelles inscriptions
                </li>
                <li>
                  <input type="checkbox" /> Vérifier les rôles et permissions
                </li>
                <li>
                  <input type="checkbox" /> Auditer les logs récents
                </li>
              </ul>
            </SectionCard>

            <SectionCard title="Rappels Importants" icon={<Bell size={16} />}>
              <ul className="tm-list">
                <li>Backup base de données ce soir</li>
                <li>Envoyer rapport mensuel à la direction</li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}



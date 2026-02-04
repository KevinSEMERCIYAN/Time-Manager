import React from "react";
import {
  Bell,
  Mail,
  Search,
  User,
  ChevronDown,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Users,
  Plus,
} from "lucide-react";

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

export function ManagerDashboard() {
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

        <div className="tm-topbar-center">
          <div className="tm-topbar-welcome">
            <div className="tm-topbar-title-row">
              <span className="tm-topbar-greeting">Bienvenue, Julie !</span>
              <button className="tm-topbar-pill">
                Tableau de Bord
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          <div className="tm-topbar-search-row">
            <div className="tm-topbar-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                aria-label="Rechercher un employé"
              />
            </div>
            <div className="tm-topbar-select-group">
              <button className="tm-topbar-select">
                Tous les départements
                <ChevronDown size={14} />
              </button>
              <button className="tm-topbar-filter">
                <Filter size={16} />
                Filtrer
              </button>
              <button className="tm-topbar-button-primary">
                <Users size={16} />
                Gérer les équipes
              </button>
            </div>
          </div>
        </div>

        <div className="tm-topbar-right">
          <button className="tm-icon-button" aria-label="Messages">
            <Mail size={18} />
          </button>
          <button className="tm-icon-button" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <div className="tm-topbar-avatar">
            <div className="tm-avatar-circle">
              <User size={18} />
            </div>
          </div>
        </div>
      </header>

      <main className="tm-dashboard-main">
        <div className="tm-kpi-grid">
          <KpiCard
            label="Heures Travaillées"
            value="35h 20m"
            helper="Cette semaine"
          />
          <KpiCard
            label="Heures Supplémentaires"
            value="5h 30m"
            helper="Cette semaine"
          />
          <KpiCard
            label="Retards"
            value="2"
            helper="cette semaine"
            tone="danger"
          />
          <KpiCard
            label="Congés Restants"
            value="8 jours"
            helper="solde actuel"
            tone="success"
          />
        </div>

        <div className="tm-layout-columns">
          <div className="tm-layout-col">
            <SectionCard
              title="Mes Pointages"
              icon={<Clock size={16} />}
              className="tm-section-card-medium"
            >
              <p className="tm-text-row">
                Dernier pointage : <strong>Entrée à 09:00 AM</strong>
              </p>
              <div className="tm-pointing-actions">
                <button className="tm-button-outline tm-button-success">
                  Pointer Entrée
                </button>
                <button className="tm-button-outline tm-button-danger">
                  Pointer Sortie
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Mes Activités"
              icon={<CheckCircle2 size={16} />}
              className="tm-section-card-tall"
            >
              <div className="tm-chart-placeholder">
                <div className="tm-chart-bars">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                    (day, index) => (
                      <div key={day} className="tm-chart-bar-item">
                        <div
                          className="tm-chart-bar"
                          style={{ height: `${70 + index * 12}px` }}
                        />
                        <span className="tm-chart-bar-label">{day}</span>
                      </div>
                    )
                  )}
                </div>
                <div className="tm-chart-total">
                  <span>Total semaine</span>
                  <strong>32h 10m</strong>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Cross cutting Concerns">
              <ul className="tm-list">
                <li>JWT + RBAC obligatoire</li>
                <li>Audit logs par actions sensibles</li>
                <li>Transactions ACID (paie)</li>
              </ul>
            </SectionCard>
          </div>

          <div className="tm-layout-col">
            <SectionCard
              title="Gestion d'Équipes"
              icon={<Users size={16} />}
              className="tm-section-card-medium"
            >
              <div className="tm-team-management">
                <button className="tm-button-create-team">
                  <Plus size={18} />
                  Créer une équipe
                </button>
                <div className="tm-team-list">
                  <div className="tm-team-item">
                    <span className="tm-team-name">Équipe Développement</span>
                    <span className="tm-team-count">5 membres</span>
                  </div>
                  <div className="tm-team-item">
                    <span className="tm-team-name">Équipe Marketing</span>
                    <span className="tm-team-count">3 membres</span>
                  </div>
                  <div className="tm-team-item">
                    <span className="tm-team-name">Équipe Support</span>
                    <span className="tm-team-count">4 membres</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Rapport d'Équipe"
              icon={<Clock size={16} />}
              className="tm-section-card-tall"
            >
              <div className="tm-team-report">
                <div className="tm-pie-placeholder">
                  <div className="tm-pie-ring tm-pie-ring-blue" />
                  <div className="tm-pie-ring tm-pie-ring-green" />
                  <div className="tm-pie-ring tm-pie-ring-red" />
                </div>
                <div className="tm-team-legend">
                  <div className="tm-team-legend-item">
                    <span className="tm-dot tm-dot-blue" />
                    <span>Marie Dupont</span>
                    <strong>36h 45m</strong>
                  </div>
                  <div className="tm-team-legend-item">
                    <span className="tm-dot tm-dot-green" />
                    <span>Jean Martin</span>
                    <strong>32h 10m</strong>
                  </div>
                  <div className="tm-team-legend-item">
                    <span className="tm-dot tm-dot-red" />
                    <span>Autres</span>
                    <strong>29h 05m</strong>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Tâches à Faire"
              icon={<Coffee size={16} />}
              className="tm-section-card-medium"
            >
              <ul className="tm-task-list">
                <li>
                  <input type="checkbox" /> Préparer le rapport mensuel
                </li>
                <li>
                  <input type="checkbox" /> Réunion équipe à 11h
                </li>
                <li>
                  <input type="checkbox" /> Mettre à jour le planning
                </li>
              </ul>
            </SectionCard>

            <SectionCard
              title="Cross cutting Concerns"
              icon={<AlertCircle size={16} />}
            >
              <ul className="tm-list">
                <li>Audit logs sur actions sensibles</li>
                <li>Contrôles de conformité paie</li>
                <li>Alertes de surcharge / burnout</li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}


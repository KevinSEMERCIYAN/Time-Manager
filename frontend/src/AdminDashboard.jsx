import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
} from "lucide-react";

const DEPARTMENTS = [
  "Juridique",
  "Finance",
  "Informatique",
  "Ressources Humaines",
  "Marketing",
  "Audit",
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([
    {
      id: 1,
      nom: "Dupont",
      prenom: "Marie",
      email: "marie.dupont@bank.com",
      role: "Manager",
      departement: "Finance",
    },
    {
      id: 2,
      nom: "Benali",
      prenom: "Omar",
      email: "omar.benali@bank.com",
      role: "Employé",
      departement: "Juridique",
    },
  ]);

  const [form, setForm] = useState({
    id: null,
    nom: "",
    prenom: "",
    email: "",
    role: "Employé",
    departement: "Juridique",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({
      id: null,
      nom: "",
      prenom: "",
      email: "",
      role: "Employé",
      departement: "Juridique",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.id) {
      // modifier
      setUsers(users.map((u) => (u.id === form.id ? form : u)));
    } else {
      // ajouter
      setUsers([...users, { ...form, id: Date.now() }]);
    }

    resetForm();
  };

  const handleEdit = (user) => {
    setForm(user);
  };

  const handleDelete = (id) => {
    if (window.confirm("Supprimer cet utilisateur ?")) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  return (
    <div className="tm-dashboard-shell">
      {/* TOP BAR */}
      <header className="tm-dashboard-topbar">
        <div className="tm-logo">
          <div className="tm-logo-icon">
            <span className="tm-logo-clock-hand tm-logo-hand-short" />
            <span className="tm-logo-clock-hand tm-logo-hand-long" />
          </div>
          <span className="tm-logo-text">TIME MANAGER</span>
        </div>

        <span className="tm-topbar-greeting">
          Administration des Utilisateurs
        </span>
          <button 
    className="tm-button-primary tm-button-small"
    onClick={() => navigate("/admin")}
  >
    Retour Accueil
  </button>
      </header>

      <main className="tm-dashboard-main">
        <div className="tm-layout-columns">
          {/* FORMULAIRE */}
          <div className="tm-layout-col">
            <section className="tm-section-card">
              <header className="tm-section-card-header">
                <div className="tm-section-card-title">
                  <span className="tm-section-card-icon">
                    <UserPlus size={16} />
                  </span>
                  <h2>
                    {form.id
                      ? "Modifier un utilisateur"
                      : "Créer un utilisateur"}
                  </h2>
                </div>
              </header>

              <form className="tm-form" onSubmit={handleSubmit}>
                <input
                  className="tm-input"
                  name="nom"
                  placeholder="Nom"
                  value={form.nom}
                  onChange={handleChange}
                  required
                />
                <input
                  className="tm-input"
                  name="prenom"
                  placeholder="Prénom"
                  value={form.prenom}
                  onChange={handleChange}
                  required
                />
                <input
                  className="tm-input"
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />

                <select
                  className="tm-input"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option>Employé</option>
                  <option>Manager</option>
                </select>

                <select
                  className="tm-input"
                  name="departement"
                  value={form.departement}
                  onChange={handleChange}
                >
                  {DEPARTMENTS.map((dep) => (
                    <option key={dep}>{dep}</option>
                  ))}
                </select>

                <button className="tm-button-primary">
                  {form.id ? "Modifier" : "Créer"}
                </button>
              </form>
            </section>
          </div>

          {/* LISTE UTILISATEURS */}
          <div className="tm-layout-col">
            <section className="tm-section-card">
              <header className="tm-section-card-header">
                <div className="tm-section-card-title">
                  <span className="tm-section-card-icon">
                    <Users size={16} />
                  </span>
                  <h2>Utilisateurs</h2>
                </div>
              </header>

              <table className="tm-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Département</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nom}</td>
                      <td>{u.prenom}</td>
                      <td>{u.email}</td>
                      <td>
                        <Shield size={14} /> {u.role}
                      </td>
                      <td>{u.departement}</td>
                      <td>
                        <button onClick={() => handleEdit(u)}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(u.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}


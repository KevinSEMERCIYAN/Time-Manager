import React from "react";
import { apiFetch } from "../services/api";

const PAGE_SIZES = [15, 30, 50, 100];

export function MembersPage({ ctx }) {
  const {
    isAdmin,
    isManager,
    teams,
    navigate,
    openClockModal,
    impersonateUser,
    setUserToDelete,
    setError,
    successMessage,
  } = ctx;

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("ALL");
  const [serviceFilter, setServiceFilter] = React.useState("ALL");
  const [teamFilter, setTeamFilter] = React.useState("ALL");
  const [pageSize, setPageSize] = React.useState(30);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  const roleOf = (u) => {
    const roles = Array.isArray(u?.roles) ? u.roles : [];
    if (roles.includes("ADMIN")) return "ADMIN";
    if (roles.includes("MANAGER")) return "MANAGER";
    return "EMPLOYEE";
  };

  const roleLabel = (u) => {
    const role = roleOf(u);
    if (role === "ADMIN") return "Admin";
    if (role === "MANAGER") return "Manager";
    return "Employe";
  };

  const teamLabel = (u) => {
    const userTeams = Array.isArray(u?.teams) ? u.teams : [];
    if (!userTeams.length) return "Aucune";
    return userTeams.map((t) => t.name).join(", ");
  };

  const serviceOptions = React.useMemo(() => {
    const out = new Set();
    for (const t of teams || []) {
      if (t?.department) out.add(t.department);
    }
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }, [teams]);

  const teamOptions = React.useMemo(() => {
    const out = new Set();
    for (const t of teams || []) {
      if (!t?.name) continue;
      if (serviceFilter !== "ALL" && (t.department || "") !== serviceFilter) continue;
      out.add(t.name);
    }
    return Array.from(out).sort((a, b) => a.localeCompare(b));
  }, [teams, serviceFilter]);

  const fetchRows = React.useCallback(async () => {
    if (!isAdmin && !isManager) {
      setRows([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }

    try {
      setLoading(true);
      const q = new URLSearchParams({
        view: "members",
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) q.set("search", search.trim());
      if (isAdmin && roleFilter !== "ALL") q.set("role", roleFilter);
      if (serviceFilter !== "ALL") q.set("service", serviceFilter);
      if (teamFilter !== "ALL") q.set("team", teamFilter);

      const data = await apiFetch(`/users?${q.toString()}`);
      setRows(Array.isArray(data.users) ? data.users : []);
      setTotal(Number(data.pagination?.total || 0));
      setTotalPages(Number(data.pagination?.totalPages || 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isManager, page, pageSize, search, roleFilter, serviceFilter, teamFilter, setError]);

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [search, roleFilter, serviceFilter, teamFilter, pageSize]);

  React.useEffect(() => {
    fetchRows();
  }, [fetchRows, successMessage]);

  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Gestion Employees</h3>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(isAdmin || isManager) && (
          <button type="button" onClick={() => navigate("/members/create")} className="tm-btn tm-btn-primary">
            Creer un utilisateur
          </button>
        )}
      </div>

      {(isAdmin || isManager) && (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher (nom, service, role, equipe)"
            className="tm-input"
            style={{ minWidth: 260, maxWidth: 460 }}
          />
          {isAdmin && (
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="tm-input" style={{ width: 180 }}>
              <option value="ALL">Tous les roles</option>
              <option value="EMPLOYEE">Employes</option>
              <option value="MANAGER">Managers</option>
              <option value="ADMIN">Admins</option>
            </select>
          )}
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="tm-input" style={{ width: 180 }}>
            <option value="ALL">Tous les services</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="tm-input" style={{ width: 220 }}>
            <option value="ALL">Toutes les equipes</option>
            <option value="__NONE__">Sans equipe</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} className="tm-input" style={{ width: 120 }}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      )}

      {(isAdmin || isManager) ? (
        loading ? (
          <div className="tm-card" style={{ padding: 24, textAlign: "center", color: "var(--tm-text-muted)", fontSize: 13 }}>
            Chargement...
          </div>
        ) : rows.length > 0 ? (
          <>
            <div style={{ overflowX: "auto", border: "1px solid var(--tm-border)", borderRadius: "var(--tm-radius-md)", background: "var(--tm-surface)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--tm-surface-soft)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Nom</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Service</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Equipe</th>
                    {isAdmin && (
                      <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Role</th>
                    )}
                    <th style={{ textAlign: "right", padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/members/${u.id}`)}
                          style={{ border: "none", background: "transparent", textAlign: "left", cursor: "pointer", padding: 0, color: "var(--tm-text-main)" }}
                        >
                          {u.displayName || "Sans nom"}
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>{u.department || "N/A"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>{teamLabel(u)}</td>
                      {isAdmin && (
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)" }}>{roleLabel(u)}</td>
                      )}
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--tm-border)", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          {(isAdmin || isManager) && (
                            <button type="button" onClick={() => openClockModal(u)} className="tm-btn tm-btn-primary" style={{ padding: "6px 10px" }}>
                              Pointer
                            </button>
                          )}
                          {isAdmin && (
                            <button type="button" onClick={() => impersonateUser(u.id)} className="tm-btn" style={{ padding: "6px 10px" }}>
                              Voir comme
                            </button>
                          )}
                          {isAdmin && (
                            <button type="button" onClick={() => setUserToDelete(u)} className="tm-btn tm-btn-danger" style={{ padding: "6px 10px" }}>
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="tm-text-muted" style={{ fontSize: 12 }}>
                {total} utilisateur(s) - page {page}/{Math.max(1, totalPages)}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="tm-btn" onClick={() => setPage(1)} disabled={page <= 1}>
                  {"<<"}
                </button>
                <button type="button" className="tm-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  {"<"}
                </button>
                <button type="button" className="tm-btn" onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))} disabled={page >= totalPages}>
                  {">"}
                </button>
                <button type="button" className="tm-btn" onClick={() => setPage(Math.max(1, totalPages))} disabled={page >= totalPages}>
                  {">>"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="tm-card" style={{ padding: 24, textAlign: "center", color: "var(--tm-text-muted)", fontSize: 13 }} role="status">
            <p style={{ margin: 0 }}>Aucun employe pour le moment.</p>
            <p style={{ marginTop: 8, marginBottom: 0 }}>Cliquez sur « Creer un utilisateur » pour en ajouter un.</p>
          </div>
        )
      ) : (
        <div className="tm-card" style={{ padding: 24, textAlign: "center", color: "var(--tm-text-muted)", fontSize: 13 }} role="status">
          Acces reserve aux managers.
        </div>
      )}
    </div>
  );
}

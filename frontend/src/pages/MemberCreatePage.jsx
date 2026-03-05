import React from "react";
import { splitDisplayName } from "../utils/name";

const DEPARTMENTS = ["Finance", "Dev", "Juridique", "RH", "Marketing", "Audit"];

export function MemberCreatePage({ ctx }) {
  const {
    isAdmin,
    users,
    teams,
    createSearch,
    setCreateSearch,
    createUserId,
    setCreateUserId,
    createEmail,
    setCreateEmail,
    createPhone,
    setCreatePhone,
    createContract,
    setCreateContract,
    createSchedule,
    setCreateSchedule,
    createDropdownOpen,
    setCreateDropdownOpen,
    assignNow,
    setAssignNow,
    createTeamId,
    setCreateTeamId,
    provisionUser,
    provisionLoading,
    createUserManual,
    navigate,
  } = ctx;

  const candidates = users.filter((u) => u.isActive !== false || u.isDeleted).filter((u) => !u.isProvisioned || u.isDeleted);
  const filtered = candidates.filter((u) => `${u.displayName || ""} ${u.username || ""}`.toLowerCase().includes(createSearch.toLowerCase()));
  const selected = users.find((u) => u.id === createUserId);
  const selectedName = splitDisplayName(selected?.displayName);
  const selectedFirstName = selected?.firstName || selectedName.firstName || "";
  const selectedLastName = selected?.lastName || selectedName.lastName || "";

  const [manual, setManual] = React.useState({
    username: "",
    displayName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "Finance",
    grade: "EMPLOYEE",
  });
  const [manualLoading, setManualLoading] = React.useState(false);

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Creer un utilisateur</h3>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={provisionUser} disabled={!createUserId || provisionLoading} className="tm-btn tm-btn-primary" style={{ opacity: createUserId && !provisionLoading ? 1 : 0.6 }}>
          {provisionLoading ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      <div style={{ padding: "12px 14px", border: "1px solid var(--tm-border)", borderRadius: "var(--tm-radius-md)", background: "var(--tm-surface)" }}>
        {isAdmin && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "var(--tm-text-main)", marginBottom: 8 }}>
              Création manuelle (Admin)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, maxWidth: 760 }}>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Username</div>
                <input value={manual.username} onChange={(e) => setManual({ ...manual, username: e.target.value })} className="tm-input" />
              </div>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Display name</div>
                <input value={manual.displayName} onChange={(e) => setManual({ ...manual, displayName: e.target.value })} className="tm-input" />
              </div>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Prénom</div>
                <input value={manual.firstName} onChange={(e) => setManual({ ...manual, firstName: e.target.value })} className="tm-input" />
              </div>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Nom</div>
                <input value={manual.lastName} onChange={(e) => setManual({ ...manual, lastName: e.target.value })} className="tm-input" />
              </div>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Email</div>
                <input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} className="tm-input" />
              </div>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Téléphone</div>
                <input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} className="tm-input" />
              </div>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Pôle</div>
                <select value={manual.department} onChange={(e) => setManual({ ...manual, department: e.target.value })} className="tm-input">
                  {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
              <div>
                <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Grade</div>
                <select value={manual.grade} onChange={(e) => setManual({ ...manual, grade: e.target.value })} className="tm-input">
                  <option value="EMPLOYEE">Employé</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                disabled={manualLoading || !manual.username || !manual.displayName}
                onClick={async () => {
                  setManualLoading(true);
                  try {
                    const roles =
                      manual.grade === "ADMIN"
                        ? ["ADMIN", "MANAGER"]
                        : manual.grade === "MANAGER"
                          ? ["MANAGER"]
                          : ["EMPLOYEE"];
                    await createUserManual({
                      username: manual.username.trim(),
                      displayName: manual.displayName.trim(),
                      firstName: manual.firstName.trim() || null,
                      lastName: manual.lastName.trim() || null,
                      email: manual.email.trim() || null,
                      phone: manual.phone.trim() || null,
                      department: manual.department || null,
                      roles,
                      isProvisioned: true,
                    });
                    navigate("/members");
                  } finally {
                    setManualLoading(false);
                  }
                }}
              >
                {manualLoading ? "Création…" : "Créer"}
              </button>
            </div>

            <div style={{ height: 1, background: "var(--tm-border)", marginTop: 16 }} />
          </div>
        )}

        <div style={{ marginBottom: 12, position: "relative" }}>
          <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Utilisateur</div>
          <input
            value={createSearch}
            onChange={(e) => {
              setCreateSearch(e.target.value);
              setCreateUserId("");
              setCreateEmail("");
              setCreatePhone("");
              setCreateDropdownOpen(true);
            }}
            onFocus={() => setCreateDropdownOpen(true)}
            onBlur={() => setTimeout(() => setCreateDropdownOpen(false), 150)}
            placeholder="Rechercher..."
            className="tm-input"
            style={{ width: "100%", maxWidth: 520, padding: "8px 10px" }}
          />
          {createDropdownOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", maxWidth: 520, background: "var(--tm-surface)", border: "1px solid var(--tm-border)", borderRadius: "var(--tm-radius-md)", boxShadow: "var(--tm-shadow-soft)", zIndex: 20, marginTop: 6, maxHeight: 220, overflowY: "auto" }}>
              {filtered.length ? (
                filtered.map((u) => (
                  <button
                    key={u.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCreateUserId(u.id);
                      setCreateSearch(`${u.displayName || u.username} (${u.username})`);
                      setCreateEmail(u.email || "");
                      setCreatePhone(u.phone || "");
                      setCreateDropdownOpen(false);
                    }}
                    style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "8px 10px", cursor: "pointer", fontSize: 13, color: "var(--tm-text-main)" }}
                  >
                    {u.displayName || u.username} ({u.username})
                  </button>
                ))
              ) : (
                <div className="tm-text-muted" style={{ padding: "8px 10px" }}>Aucun resultat</div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, maxWidth: 520 }}>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Prenom</div>
            <input value={selectedFirstName} readOnly className="tm-input" style={{ width: "100%", padding: "8px 10px", background: "var(--tm-surface-soft)" }} />
          </div>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Nom</div>
            <input value={selectedLastName} readOnly className="tm-input" style={{ width: "100%", padding: "8px 10px", background: "var(--tm-surface-soft)" }} />
          </div>
        </div>

        <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, maxWidth: 520 }}>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Email</div>
            <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="tm-input" style={{ width: "100%", padding: "8px 10px" }} />
          </div>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Telephone</div>
            <input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} className="tm-input" style={{ width: "100%", padding: "8px 10px" }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Contrat</div>
          <select value={createContract} onChange={(e) => setCreateContract(e.target.value)} className="tm-input" style={{ maxWidth: 200 }}>
            <option value="">Choisir...</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="STAGE">Stage</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 12 }}>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11 }}>Matin debut</div>
            <input type="time" value={createSchedule.amStart} onChange={(e) => setCreateSchedule({ ...createSchedule, amStart: e.target.value })} className="tm-input"
            style={{ width: "100%", padding: "6px 8px" }} />
          </div>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11 }}>Matin fin</div>
            <input type="time" value={createSchedule.amEnd} onChange={(e) => setCreateSchedule({ ...createSchedule, amEnd: e.target.value })} className="tm-input"
            style={{ width: "100%", padding: "6px 8px" }} />
          </div>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11 }}>Apres-midi debut</div>
            <input type="time" value={createSchedule.pmStart} onChange={(e) => setCreateSchedule({ ...createSchedule, pmStart: e.target.value })} className="tm-input"
            style={{ width: "100%", padding: "6px 8px" }} />
          </div>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11 }}>Apres-midi fin</div>
            <input type="time" value={createSchedule.pmEnd} onChange={(e) => setCreateSchedule({ ...createSchedule, pmEnd: e.target.value })} className="tm-input"
            style={{ width: "100%", padding: "6px 8px" }} />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={assignNow} onChange={(e) => setAssignNow(e.target.checked)} />
            <span style={{ fontSize: 13, color: "var(--tm-text-main)" }}>Ajouter dans un groupe maintenant</span>
          </label>
        </div>

        {assignNow && (
          <div style={{ marginBottom: 12 }}>
            <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Groupe (team)</div>
            <select value={createTeamId} onChange={(e) => setCreateTeamId(e.target.value)} className="tm-input" style={{ width: "100%", maxWidth: 520, padding: "8px 10px" }}>
              <option value="">Selectionner...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

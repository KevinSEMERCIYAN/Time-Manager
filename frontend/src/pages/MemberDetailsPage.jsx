import React from "react";
import { WORKING_DAYS } from "../constants/workDays";

export function MemberDetailsPage({ ctx }) {
  const { route, users, setUsers, isAdmin, saveUser, setUserToDelete } = ctx;
  const memberId = route.split("/").pop();
  const target = users.find((u) => u.id === memberId);

  if (!target) {
    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Detail employe</h3>
        <div className="tm-text-muted" style={{ fontSize: 13 }}>Utilisateur introuvable.</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Detail employe</h3>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => saveUser(target)} className="tm-btn tm-btn-primary">Enregistrer</button>
        {isAdmin && (
          <button type="button" onClick={() => setUserToDelete(target)} className="tm-btn tm-btn-danger">Supprimer</button>
        )}
      </div>

      <div style={{ padding: "12px 14px", border: "1px solid var(--tm-border)", borderRadius: "var(--tm-radius-md)", background: "var(--tm-surface)" }}>
        <div className="tm-text-muted">Utilisateur</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--tm-text-main)" }}>{target.displayName || target.username}</div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div>
            <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Contrat</div>
            <select
              value={target.contractType || ""}
              onChange={(e) => {
                const next = users.map((x) => (x.id === target.id ? { ...x, contractType: e.target.value } : x));
                setUsers(next);
              }}
              className="tm-input"
              style={{ maxWidth: 180 }}
            >
              <option value="" disabled>Choisir...</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
            </select>
          </div>

          <div>
            <div className="tm-text-muted" style={{ fontSize: 11, marginBottom: 6 }}>Jours travailles</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {WORKING_DAYS.map((d) => {
                const current = Array.isArray(target.workingDays)
                  ? target.workingDays
                  : WORKING_DAYS.filter((x) => x.id !== 0 && x.id !== 6).map((x) => x.id);
                const checked = current.includes(d.id);
                return (
                  <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextDays = e.target.checked ? [...current, d.id] : current.filter((v) => v !== d.id);
                        const next = users.map((x) => (x.id === target.id ? { ...x, workingDays: nextDays } : x));
                        setUsers(next);
                      }}
                    />
                    <span>{d.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <div>
              <div className="tm-text-muted" style={{ fontSize: 11 }}>Matin debut</div>
              <input type="time" value={target.scheduleAmStart || ""} onChange={(e) => setUsers(users.map((x) => (x.id === target.id ? { ...x, scheduleAmStart: e.target.value } : x)))} className="tm-input"
              style={{ width: "100%", padding: "6px 8px" }} />
            </div>
            <div>
              <div className="tm-text-muted" style={{ fontSize: 11 }}>Matin fin</div>
              <input type="time" value={target.scheduleAmEnd || ""} onChange={(e) => setUsers(users.map((x) => (x.id === target.id ? { ...x, scheduleAmEnd: e.target.value } : x)))} className="tm-input"
              style={{ width: "100%", padding: "6px 8px" }} />
            </div>
            <div>
              <div className="tm-text-muted" style={{ fontSize: 11 }}>Apres-midi debut</div>
              <input type="time" value={target.schedulePmStart || ""} onChange={(e) => setUsers(users.map((x) => (x.id === target.id ? { ...x, schedulePmStart: e.target.value } : x)))} className="tm-input"
              style={{ width: "100%", padding: "6px 8px" }} />
            </div>
            <div>
              <div className="tm-text-muted" style={{ fontSize: 11 }}>Apres-midi fin</div>
              <input type="time" value={target.schedulePmEnd || ""} onChange={(e) => setUsers(users.map((x) => (x.id === target.id ? { ...x, schedulePmEnd: e.target.value } : x)))} className="tm-input"
              style={{ width: "100%", padding: "6px 8px" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

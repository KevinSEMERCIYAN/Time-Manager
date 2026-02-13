import React, { useState } from "react";
import { splitDisplayName } from "../utils/name";

export function ProfilePage({ ctx }) {
  const { user, setUser, isAdmin, apiFetch, setError, setSuccessMessage, navigate } = ctx;
  const [saving, setSaving] = useState(false);

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--tm-text-main)" }}>Mon profil</h3>
      <div style={{ padding: "10px 12px", border: "1px solid var(--tm-border)", borderRadius: "var(--tm-radius-md)", background: "var(--tm-surface)" }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div className="tm-text-muted" style={{ marginBottom: 6 }}>Nom</div>
          <input value={user?.lastName || splitDisplayName(user?.displayName).lastName || ""} readOnly disabled className="tm-input" style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "var(--tm-surface-soft)", color: "var(--tm-text-muted)" }} />
          <div className="tm-text-muted" style={{ marginBottom: 6 }}>Prenom</div>
          <input value={user?.firstName || splitDisplayName(user?.displayName).firstName || ""} readOnly disabled className="tm-input" style={{ width: "100%", padding: "8px 10px", marginBottom: 8, background: "var(--tm-surface-soft)", color: "var(--tm-text-muted)" }} />
          <div className="tm-text-muted" style={{ marginBottom: 6 }}>Email</div>
          <input value={user?.email || ""} onChange={(e) => setUser({ ...user, email: e.target.value })} className="tm-input" style={{ width: "100%", padding: "8px 10px", marginBottom: 8 }} />
          <div className="tm-text-muted" style={{ marginBottom: 6 }}>Telephone</div>
          <input value={user?.phone || ""} onChange={(e) => setUser({ ...user, phone: e.target.value })} className="tm-input" style={{ width: "100%", padding: "8px 10px" }} />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={async () => {
            setSaving(true);
            setError("");
            try {
              const data = await apiFetch("/me", { method: "PUT", body: JSON.stringify(user) });
              setUser(data.user);
              setSuccessMessage?.("Profil enregistré.");
            } catch (err) {
              setError(err.message);
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className="tm-btn tm-btn-primary"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>

        <button
          type="button"
          onClick={async () => {
            try {
              const data = await apiFetch("/gdpr/export");
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "timemanager-export.json";
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              setError(err.message);
            }
          }}
          className="tm-btn"
        >
          Exporter mes donnees
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={async () => {
                try {
                  await apiFetch("/me", { method: "DELETE" });
                  setUser(null);
                  navigate("/sign-in");
                } catch (err) {
                  setError(err.message);
                }
              }}
              className="tm-btn tm-btn-danger"
            >
              Supprimer mon compte
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Confirmer l'anonymisation de votre compte ?")) return;
                try {
                  await apiFetch("/gdpr/anonymize", { method: "POST" });
                  setUser(null);
                  navigate("/sign-in");
                } catch (err) {
                  setError(err.message);
                }
              }}
              className="tm-btn"
              style={{ background: "var(--tm-surface-soft)", color: "var(--tm-danger)" }}
            >
              Anonymiser mon compte
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="tm-text-muted" style={{ fontSize: 13 }}>Le changement de mot de passe se fait sur le serveur Windows (Active Directory).</div>
      </div>
    </div>
  );
}

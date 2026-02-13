import React from "react";
import { splitDisplayName } from "../utils/name";

export function ProfilePage({ ctx }) {
  const { user, setUser, isAdmin, apiFetch, setError, navigate } = ctx;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Mon profil</h3>
      <div style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Nom</div>
          <input value={user?.lastName || splitDisplayName(user?.displayName).lastName || ""} readOnly disabled style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 8, background: "#f9fafb", color: "#6b7280" }} />
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Prenom</div>
          <input value={user?.firstName || splitDisplayName(user?.displayName).firstName || ""} readOnly disabled style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 8, background: "#f9fafb", color: "#6b7280" }} />
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Email</div>
          <input value={user?.email || ""} onChange={(e) => setUser({ ...user, email: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Telephone</div>
          <input value={user?.phone || ""} onChange={(e) => setUser({ ...user, phone: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }} />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={async () => {
            try {
              const data = await apiFetch("/me", { method: "PUT", body: JSON.stringify(user) });
              setUser(data.user);
            } catch (err) {
              setError(err.message);
            }
          }}
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#111827", color: "white" }}
        >
          Enregistrer
        </button>

        <button
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
          style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff" }}
        >
          Exporter mes donnees
        </button>

        {isAdmin && (
          <>
            <button
              onClick={async () => {
                try {
                  await apiFetch("/me", { method: "DELETE" });
                  setUser(null);
                  navigate("/sign-in");
                } catch (err) {
                  setError(err.message);
                }
              }}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}
            >
              Supprimer mon compte
            </button>
            <button
              onClick={async () => {
                if (!window.confirm("Confirmer l’anonymisation de votre compte ?")) return;
                try {
                  await apiFetch("/gdpr/anonymize", { method: "POST" });
                  setUser(null);
                  navigate("/sign-in");
                } catch (err) {
                  setError(err.message);
                }
              }}
              style={{ border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, background: "#fff5f5", color: "#b91c1c" }}
            >
              Anonymiser mon compte
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: "#6b7280" }}>Le changement de mot de passe se fait sur le serveur Windows (Active Directory).</div>
      </div>
    </div>
  );
}

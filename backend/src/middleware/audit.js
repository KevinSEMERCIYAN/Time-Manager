const db = require("../db");

// Récupère l'ID utilisateur depuis la table users à partir du username JWT
async function resolveUserId(username) {
  if (!username) return null;
  try {
    const row = await db.queryOne("SELECT id FROM users WHERE username = ?", [username]);
    return row ? row.id : null;
  } catch (err) {
    console.error("resolveUserId error:", err);
    return null;
  }
}

// Log d'audit basique
async function logAudit(req, { action, entityType = null, entityId = null, metadata = null }) {
  try {
    const userId = await resolveUserId(req.user && req.user.username);
    const ip =
      (req.headers["x-forwarded-for"] && String(req.headers["x-forwarded-for"]).split(",")[0].trim()) ||
      req.ip ||
      null;

    const metaJson = metadata ? JSON.stringify(metadata) : null;

    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId || null, metaJson, ip]
    );
  } catch (err) {
    // Ne jamais casser la requête pour un problème d'audit
    console.error("logAudit error:", err);
  }
}

module.exports = {
  logAudit,
};


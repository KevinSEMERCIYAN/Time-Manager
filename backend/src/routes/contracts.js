const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Récupérer le contrat d'un utilisateur
router.get("/users/:id/contract", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const rows = await db.query(
      `SELECT 
         c.id,
         c.user_id AS userId,
         u.username,
         u.display_name AS displayName,
         c.type,
         c.start_date AS startDate,
         c.end_date AS endDate,
         c.created_at AS createdAt,
         c.updated_at AS updatedAt
       FROM contracts c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Contract not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/users/:id/contract error:", err);
    res.status(500).json({ error: "Failed to get contract" });
  }
});

// Créer / mettre à jour le contrat d'un utilisateur
router.put("/users/:id/contract", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const { type, startDate, endDate } = req.body || {};

  const allowedTypes = new Set(["CDI", "CDD", "STAGE", "OTHER"]);
  if (!type || typeof type !== "string" || !allowedTypes.has(type.toUpperCase())) {
    return res.status(400).json({ error: "Invalid contract type (CDI, CDD, STAGE, OTHER)" });
  }
  const contractType = type.toUpperCase();

  const parseDateOrNull = (value, fieldName) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid date for ${fieldName} (expected ISO string)`);
    }
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  let startDateSql = null;
  let endDateSql = null;

  try {
    startDateSql = parseDateOrNull(startDate, "startDate");
    endDateSql = parseDateOrNull(endDate, "endDate");
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    // Vérifier que l'utilisateur existe
    const user = await db.queryOne("SELECT id FROM users WHERE id = ?", [userId]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // UPSERT via ON DUPLICATE KEY (user_id unique)
    await db.query(
      `INSERT INTO contracts (user_id, type, start_date, end_date)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         type       = VALUES(type),
         start_date = VALUES(start_date),
         end_date   = VALUES(end_date)`,
      [userId, contractType, startDateSql, endDateSql]
    );

    const rows = await db.query(
      `SELECT 
         c.id,
         c.user_id AS userId,
         u.username,
         u.display_name AS displayName,
         c.type,
         c.start_date AS startDate,
         c.end_date AS endDate,
         c.created_at AS createdAt,
         c.updated_at AS updatedAt
       FROM contracts c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = ?`,
      [userId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/users/:id/contract error:", err);
    res.status(500).json({ error: "Failed to upsert contract" });
  }
});

module.exports = router;


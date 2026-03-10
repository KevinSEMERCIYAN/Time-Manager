const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Récupérer le schedule d'un utilisateur
router.get("/users/:id/schedule", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const rows = await db.query(
      `SELECT 
         s.id,
         s.user_id AS userId,
         u.username,
         u.display_name AS displayName,
         s.am_start AS amStart,
         s.am_end AS amEnd,
         s.pm_start AS pmStart,
         s.pm_end AS pmEnd,
         s.created_at AS createdAt,
         s.updated_at AS updatedAt
       FROM schedules s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/users/:id/schedule error:", err);
    res.status(500).json({ error: "Failed to get schedule" });
  }
});

// Créer / mettre à jour le schedule d'un utilisateur
router.put("/users/:id/schedule", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const { amStart, amEnd, pmStart, pmEnd } = req.body || {};

  // Validation simple : format HH:MM ou HH:MM:SS (on laisse le front faire le gros du travail)
  const timeRegex = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
  const fields = { amStart, amEnd, pmStart, pmEnd };
  for (const [key, value] of Object.entries(fields)) {
    if (!value || typeof value !== "string" || !timeRegex.test(value)) {
      return res.status(400).json({ error: `Invalid time format for ${key} (expected HH:MM or HH:MM:SS)` });
    }
  }

  try {
    // Vérifier que l'utilisateur existe (optionnel mais plus propre)
    const user = await db.queryOne("SELECT id FROM users WHERE id = ?", [userId]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // UPSERT via ON DUPLICATE KEY (user_id unique)
    await db.query(
      `INSERT INTO schedules (user_id, am_start, am_end, pm_start, pm_end)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         am_start = VALUES(am_start),
         am_end   = VALUES(am_end),
         pm_start = VALUES(pm_start),
         pm_end   = VALUES(pm_end)`,
      [userId, amStart, amEnd, pmStart, pmEnd]
    );

    const rows = await db.query(
      `SELECT 
         s.id,
         s.user_id AS userId,
         u.username,
         u.display_name AS displayName,
         s.am_start AS amStart,
         s.am_end AS amEnd,
         s.pm_start AS pmStart,
         s.pm_end AS pmEnd,
         s.created_at AS createdAt,
         s.updated_at AS updatedAt
       FROM schedules s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/users/:id/schedule error:", err);
    res.status(500).json({ error: "Failed to upsert schedule" });
  }
});

module.exports = router;


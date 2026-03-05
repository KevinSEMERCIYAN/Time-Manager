const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Liste des équipes (Admin + Manager)
router.get("/teams", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT id, name, type, ldap_dn AS ldapDn, created_at AS createdAt, updated_at AS updatedAt
       FROM teams
       ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/teams error:", err);
    res.status(500).json({ error: "Failed to list teams" });
  }
});

module.exports = router;


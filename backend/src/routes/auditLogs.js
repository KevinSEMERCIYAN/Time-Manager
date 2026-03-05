const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Lecture des audit logs (Admin uniquement)
router.get("/audit-logs", authenticateJWT, authorizeRoles("ROLE_ADMIN"), async (req, res) => {
  try {
    const { userId, action, entityType, from, to, limit } = req.query || {};

    const where = [];
    const params = [];

    if (userId) {
      const v = Number(userId);
      if (!Number.isFinite(v)) return res.status(400).json({ error: "Invalid userId" });
      where.push("al.user_id = ?");
      params.push(v);
    }

    if (action) {
      where.push("al.action = ?");
      params.push(String(action));
    }

    if (entityType) {
      where.push("al.entity_type = ?");
      params.push(String(entityType));
    }

    if (from) {
      const d = new Date(from);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid from date" });
      where.push("al.created_at >= ?");
      params.push(d.toISOString().slice(0, 19).replace("T", " "));
    }

    if (to) {
      const d = new Date(to);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid to date" });
      where.push("al.created_at <= ?");
      params.push(d.toISOString().slice(0, 19).replace("T", " "));
    }

    const limitNum = limit ? Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000) : 200;

    const sql = `
      SELECT
        al.id,
        al.user_id AS userId,
        u.username,
        al.action,
        al.entity_type AS entityType,
        al.entity_id AS entityId,
        al.metadata,
        al.ip_address AS ipAddress,
        al.created_at AS createdAt
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ${limitNum}
    `;

    const rows = await db.query(sql, params);

    // Essayer de parser metadata JSON
    const withParsedMetadata = rows.map((row) => {
      let metadata = row.metadata;
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata);
        } catch {
          // laisser tel quel si ce n'est pas du JSON valide
        }
      }
      return { ...row, metadata };
    });

    res.json(withParsedMetadata);
  } catch (err) {
    console.error("GET /api/audit-logs error:", err);
    res.status(500).json({ error: "Failed to list audit logs" });
  }
});

module.exports = router;


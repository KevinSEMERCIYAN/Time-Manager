const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");
const { logAudit } = require("../middleware/audit");

const router = express.Router();

// Liste avec filtres (user, team, période)
router.get("/time-entries", authenticateJWT, async (req, res) => {
  try {
    const { userId, teamId, from, to } = req.query || {};
    const where = [];
    const params = [];

    if (userId) {
      const v = Number(userId);
      if (!Number.isFinite(v)) return res.status(400).json({ error: "Invalid userId" });
      where.push("te.user_id = ?");
      params.push(v);
    }
    if (teamId) {
      const v = Number(teamId);
      if (!Number.isFinite(v)) return res.status(400).json({ error: "Invalid teamId" });
      where.push("te.team_id = ?");
      params.push(v);
    }
    if (from) {
      const d = new Date(from);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid from date" });
      where.push("te.start_time >= ?");
      params.push(d.toISOString().slice(0, 19).replace("T", " "));
    }
    if (to) {
      const d = new Date(to);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid to date" });
      where.push("te.start_time <= ?");
      params.push(d.toISOString().slice(0, 19).replace("T", " "));
    }

    const sql = `
      SELECT
        te.id,
        te.user_id AS userId,
        u.username,
        u.display_name AS displayName,
        te.team_id AS teamId,
        t.name AS teamName,
        te.start_time AS startTime,
        te.end_time AS endTime,
        te.source,
        te.comment,
        te.created_at AS createdAt,
        te.updated_at AS updatedAt
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      LEFT JOIN teams t ON te.team_id = t.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY te.start_time DESC, te.id DESC
    `;

    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/time-entries error:", err);
    res.status(500).json({ error: "Failed to list time entries" });
  }
});

// Création d'un pointage
router.post("/time-entries", authenticateJWT, async (req, res) => {
  try {
    const { userId, teamId, startTime, endTime, source, comment } = req.body || {};

    const userIdNum = Number(userId || 0);
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      return res.status(400).json({ error: "userId is required and must be a number" });
    }
    if (!startTime) {
      return res.status(400).json({ error: "startTime is required (ISO string)" });
    }
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "Invalid startTime" });
    }

    let end = null;
    if (endTime) {
      const d = new Date(endTime);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid endTime" });
      end = d;
    }

    const teamIdNum = teamId == null ? null : Number(teamId);
    if (teamIdNum !== null && !Number.isFinite(teamIdNum)) {
      return res.status(400).json({ error: "Invalid teamId" });
    }

    const src = source && typeof source === "string" ? source.toUpperCase() : "MANUAL";
    const allowedSources = new Set(["MANUAL", "AUTO", "SEEDED"]);
    const finalSource = allowedSources.has(src) ? src : "MANUAL";

    const sql = `
      INSERT INTO time_entries (user_id, team_id, start_time, end_time, source, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userIdNum,
      teamIdNum,
      start.toISOString().slice(0, 19).replace("T", " "),
      end ? end.toISOString().slice(0, 19).replace("T", " ") : null,
      finalSource,
      comment || null,
    ];

    const result = await db.query(sql, params);
    const insertedId = result.insertId;

    const rows = await db.query(
      `SELECT
         te.id,
         te.user_id AS userId,
         u.username,
         u.display_name AS displayName,
         te.team_id AS teamId,
         t.name AS teamName,
         te.start_time AS startTime,
         te.end_time AS endTime,
         te.source,
         te.comment,
         te.created_at AS createdAt,
         te.updated_at AS updatedAt
       FROM time_entries te
       JOIN users u ON te.user_id = u.id
       LEFT JOIN teams t ON te.team_id = t.id
       WHERE te.id = ?`,
      [insertedId]
    );

    const created = rows[0];

    // Audit
    await logAudit(req, {
      action: "TIME_ENTRY_CREATE",
      entityType: "TIME_ENTRY",
      entityId: created.id,
      metadata: { userId: created.userId, teamId: created.teamId, startTime: created.startTime, endTime: created.endTime },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/time-entries error:", err);
    res.status(500).json({ error: "Failed to create time entry" });
  }
});

// Mise à jour d'un pointage (fin / commentaire) - réservé Admin + Manager
router.patch("/time-entries/:id", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const { endTime, comment } = req.body || {};
  const fields = [];
  const params = [];

  if (endTime !== undefined) {
    if (endTime === null) {
      fields.push("end_time = NULL");
    } else {
      const d = new Date(endTime);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "Invalid endTime" });
      fields.push("end_time = ?");
      params.push(d.toISOString().slice(0, 19).replace("T", " "));
    }
  }

  if (comment !== undefined) {
    fields.push("comment = ?");
    params.push(comment || null);
  }

  if (!fields.length) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const result = await db.query(
      `UPDATE time_entries SET ${fields.join(", ")} WHERE id = ?`,
      [...params, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Time entry not found" });

    const rows = await db.query(
      `SELECT
         te.id,
         te.user_id AS userId,
         u.username,
         u.display_name AS displayName,
         te.team_id AS teamId,
         t.name AS teamName,
         te.start_time AS startTime,
         te.end_time AS endTime,
         te.source,
         te.comment,
         te.created_at AS createdAt,
         te.updated_at AS updatedAt
       FROM time_entries te
       JOIN users u ON te.user_id = u.id
       LEFT JOIN teams t ON te.team_id = t.id
       WHERE te.id = ?`,
      [id]
    );

    const updated = rows[0];

    // Audit
    await logAudit(req, {
      action: "TIME_ENTRY_UPDATE",
      entityType: "TIME_ENTRY",
      entityId: updated.id,
      metadata: { endTime: updated.endTime, comment: updated.comment },
    });

    res.json(updated);
  } catch (err) {
    console.error("PATCH /api/time-entries/:id error:", err);
    res.status(500).json({ error: "Failed to update time entry" });
  }
});

// Suppression d'un pointage - Admin uniquement
router.delete("/time-entries/:id", authenticateJWT, authorizeRoles("ROLE_ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    // Récupérer avant suppression pour audit
    const before = await db.queryOne(
      `SELECT id, user_id AS userId, team_id AS teamId, start_time AS startTime, end_time AS endTime
       FROM time_entries WHERE id = ?`,
      [id]
    );

    const result = await db.query("DELETE FROM time_entries WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Time entry not found" });

    await logAudit(req, {
      action: "TIME_ENTRY_DELETE",
      entityType: "TIME_ENTRY",
      entityId: id,
      metadata: before || { id },
    });
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/time-entries/:id error:", err);
    res.status(500).json({ error: "Failed to delete time entry" });
  }
});

module.exports = router;


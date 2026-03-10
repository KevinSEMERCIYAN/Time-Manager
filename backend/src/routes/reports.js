const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Résumé agrégé des pointages sur une période
// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=&teamId=
router.get(
  "/reports/summary",
  authenticateJWT,
  authorizeRoles("ROLE_MANAGER", "ROLE_ADMIN"),
  async (req, res) => {
    try {
      const { from, to, userId, teamId } = req.query || {};

      const where = [];
      const params = [];

      if (userId) {
        const v = Number(userId);
        if (!Number.isFinite(v)) {
          return res.status(400).json({ error: "Invalid userId" });
        }
        where.push("te.user_id = ?");
        params.push(v);
      }

      if (teamId) {
        const v = Number(teamId);
        if (!Number.isFinite(v)) {
          return res.status(400).json({ error: "Invalid teamId" });
        }
        where.push("te.team_id = ?");
        params.push(v);
      }

      if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: "Invalid from date" });
        }
        where.push("te.start_time >= ?");
        params.push(d.toISOString().slice(0, 19).replace("T", " "));
      }

      if (to) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: "Invalid to date" });
        }
        where.push("te.start_time <= ?");
        params.push(d.toISOString().slice(0, 19).replace("T", " "));
      }

      const sql = `
        SELECT
          te.user_id AS userId,
          u.username,
          u.display_name AS displayName,
          te.team_id AS teamId,
          t.name AS teamName,
          COUNT(*) AS entriesCount,
          SUM(
            TIMESTAMPDIFF(
              MINUTE,
              te.start_time,
              COALESCE(te.end_time, NOW())
            )
          ) AS totalMinutes,
          SUM(
            CASE
              WHEN s.am_start IS NOT NULL AND TIME(te.start_time) > s.am_start THEN 1
              WHEN s.am_start IS NULL AND TIME(te.start_time) > '09:00:00' THEN 1
              ELSE 0
            END
          ) AS lateCount
        FROM time_entries te
        JOIN users u ON u.id = te.user_id
        LEFT JOIN teams t ON t.id = te.team_id
        LEFT JOIN schedules s ON s.user_id = te.user_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        GROUP BY te.user_id, u.username, u.display_name, te.team_id, t.name
        ORDER BY totalMinutes DESC
      `;

      const rows = await db.query(sql, params);

      const overview = rows.reduce(
        (acc, row) => {
          const totalMinutes = Number(row.totalMinutes || 0);
          const late = Number(row.lateCount || 0);
          const entries = Number(row.entriesCount || 0);

          acc.totalMinutes += totalMinutes;
          acc.lateCount += late;
          acc.entriesCount += entries;
          acc.activeUsers += 1;
          return acc;
        },
        {
          totalMinutes: 0,
          entriesCount: 0,
          lateCount: 0,
          activeUsers: 0,
        }
      );

      const hours = Math.floor(overview.totalMinutes / 60);
      const minutes = overview.totalMinutes % 60;

      const response = {
        overview: {
          totalMinutes: overview.totalMinutes,
          totalHours: hours + minutes / 60,
          formattedTotal: `${hours}h ${minutes.toString().padStart(2, "0")}m`,
          entriesCount: overview.entriesCount,
          lateCount: overview.lateCount,
          activeUsers: overview.activeUsers,
        },
        users: rows.map((row) => {
          const totalMinutes = Number(row.totalMinutes || 0);
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          return {
            userId: row.userId,
            username: row.username,
            displayName: row.displayName,
            teamId: row.teamId,
            teamName: row.teamName,
            entriesCount: Number(row.entriesCount || 0),
            lateCount: Number(row.lateCount || 0),
            totalMinutes,
            totalHours: h + m / 60,
            formattedTotal: `${h}h ${m.toString().padStart(2, "0")}m`,
          };
        }),
      };

      res.json(response);
    } catch (err) {
      console.error("GET /api/reports/summary error:", err);
      res.status(500).json({ error: "Failed to compute summary report" });
    }
  }
);

module.exports = router;


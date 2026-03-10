const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");
const { logAudit } = require("../middleware/audit");

const router = express.Router();

// Helpers
async function getCustomTeamWithMembers(id) {
  const teamRows = await db.query(
    `SELECT id, name, created_by_user_id AS createdByUserId, created_at AS createdAt, updated_at AS updatedAt
     FROM custom_teams
     WHERE id = ?`,
    [id]
  );
  if (!teamRows.length) return null;

  const members = await db.query(
    `SELECT 
       ctm.user_id AS userId,
       u.username,
       u.display_name AS displayName,
       u.team_id AS teamId
     FROM custom_team_members ctm
     JOIN users u ON ctm.user_id = u.id
     WHERE ctm.custom_team_id = ?
     ORDER BY u.username`,
    [id]
  );

  return { ...teamRows[0], members };
}

// Liste des équipes custom
router.get(
  "/custom-teams",
  authenticateJWT,
  authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"),
  async (req, res) => {
    try {
      const teams = await db.query(
        `SELECT id, name, created_by_user_id AS createdByUserId, created_at AS createdAt, updated_at AS updatedAt
         FROM custom_teams
         ORDER BY name`
      );
      res.json(teams);
    } catch (err) {
      console.error("GET /api/custom-teams error:", err);
      res.status(500).json({ error: "Failed to list custom teams" });
    }
  }
);

// Détail d'une équipe custom + membres
router.get(
  "/custom-teams/:id",
  authenticateJWT,
  authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    try {
      const team = await getCustomTeamWithMembers(id);
      if (!team) return res.status(404).json({ error: "Custom team not found" });
      res.json(team);
    } catch (err) {
      console.error("GET /api/custom-teams/:id error:", err);
      res.status(500).json({ error: "Failed to get custom team" });
    }
  }
);

// Créer une équipe custom
router.post(
  "/custom-teams",
  authenticateJWT,
  authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"),
  async (req, res) => {
    const { name, memberIds } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const memberIdList = Array.isArray(memberIds)
      ? memberIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
      : [];

    try {
      // Créer l'équipe
      const result = await db.query(
        `INSERT INTO custom_teams (name, created_by_user_id)
         VALUES (?, ?)`,
        [name.trim(), null]
      );
      const teamId = result.insertId;

      // Ajouter les membres si fournis
      if (memberIdList.length) {
        const values = memberIdList.map((userId) => [teamId, userId]);
        await db.query(
          `INSERT IGNORE INTO custom_team_members (custom_team_id, user_id)
           VALUES ${values.map(() => "(?, ?)").join(", ")}`,
          values.flat()
        );
      }

      const team = await getCustomTeamWithMembers(teamId);

      await logAudit(req, {
        action: "CUSTOM_TEAM_CREATE",
        entityType: "CUSTOM_TEAM",
        entityId: teamId,
        metadata: { name: team.name, memberIds: memberIdList },
      });
      res.status(201).json(team);
    } catch (err) {
      console.error("POST /api/custom-teams error:", err);
      res.status(500).json({ error: "Failed to create custom team" });
    }
  }
);

// Renommer une équipe custom
router.patch(
  "/custom-teams/:id",
  authenticateJWT,
  authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const { name } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    try {
      const result = await db.query(`UPDATE custom_teams SET name = ? WHERE id = ?`, [name.trim(), id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "Custom team not found" });

      const team = await getCustomTeamWithMembers(id);

      await logAudit(req, {
        action: "CUSTOM_TEAM_UPDATE",
        entityType: "CUSTOM_TEAM",
        entityId: id,
        metadata: { name: team.name },
      });

      res.json(team);
    } catch (err) {
      console.error("PATCH /api/custom-teams/:id error:", err);
      res.status(500).json({ error: "Failed to update custom team" });
    }
  }
);

// Supprimer une équipe custom
router.delete(
  "/custom-teams/:id",
  authenticateJWT,
  authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    try {
      // Les membres seront supprimés via ON DELETE CASCADE sur custom_team_members
      const before = await getCustomTeamWithMembers(id);

      const result = await db.query(`DELETE FROM custom_teams WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "Custom team not found" });

      await logAudit(req, {
        action: "CUSTOM_TEAM_DELETE",
        entityType: "CUSTOM_TEAM",
        entityId: id,
        metadata: before || { id },
      });
      res.status(204).send();
    } catch (err) {
      console.error("DELETE /api/custom-teams/:id error:", err);
      res.status(500).json({ error: "Failed to delete custom team" });
    }
  }
);

// Remplacer la liste des membres d'une équipe custom
router.post(
  "/custom-teams/:id/members",
  authenticateJWT,
  authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const { memberIds } = req.body || {};
    const memberIdList = Array.isArray(memberIds)
      ? memberIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
      : [];

    try {
      const team = await db.queryOne(`SELECT id FROM custom_teams WHERE id = ?`, [id]);
      if (!team) return res.status(404).json({ error: "Custom team not found" });

      // On remplace la liste : supprimer tous les membres puis réinsérer
      await db.query(`DELETE FROM custom_team_members WHERE custom_team_id = ?`, [id]);

      if (memberIdList.length) {
        const values = memberIdList.map((userId) => [id, userId]);
        await db.query(
          `INSERT IGNORE INTO custom_team_members (custom_team_id, user_id)
           VALUES ${values.map(() => "(?, ?)").join(", ")}`,
          values.flat()
        );
      }

      const updated = await getCustomTeamWithMembers(id);

      await logAudit(req, {
        action: "CUSTOM_TEAM_SET_MEMBERS",
        entityType: "CUSTOM_TEAM",
        entityId: id,
        metadata: { memberIds: memberIdList },
      });

      res.json(updated);
    } catch (err) {
      console.error("POST /api/custom-teams/:id/members error:", err);
      res.status(500).json({ error: "Failed to update custom team members" });
    }
  }
);

// Retirer un membre précis d'une équipe custom
router.delete(
  "/custom-teams/:id/members/:userId",
  authenticateJWT,
  authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"),
  async (req, res) => {
    const id = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (!Number.isFinite(id) || !Number.isFinite(userId)) {
      return res.status(400).json({ error: "Invalid id or userId" });
    }

    try {
      const result = await db.query(
        `DELETE FROM custom_team_members WHERE custom_team_id = ? AND user_id = ?`,
        [id, userId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Membership not found" });
      }
      const updated = await getCustomTeamWithMembers(id);

      await logAudit(req, {
        action: "CUSTOM_TEAM_REMOVE_MEMBER",
        entityType: "CUSTOM_TEAM",
        entityId: id,
        metadata: { userId },
      });

      res.json(updated);
    } catch (err) {
      console.error("DELETE /api/custom-teams/:id/members/:userId error:", err);
      res.status(500).json({ error: "Failed to remove member from custom team" });
    }
  }
);

module.exports = router;


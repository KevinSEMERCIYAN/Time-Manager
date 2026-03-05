const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Liste des utilisateurs (Admin + Manager)
router.get("/users", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT u.id, u.username, u.display_name AS displayName, u.email,
              u.team_id AS teamId, t.name AS teamName, u.is_active AS isActive,
              u.created_at AS createdAt, u.updated_at AS updatedAt
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       ORDER BY u.username`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// Détail d'un utilisateur
router.get("/users/:id", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const rows = await db.query(
      `SELECT u.id, u.username, u.display_name AS displayName, u.email,
              u.team_id AS teamId, t.name AS teamName, u.is_active AS isActive,
              u.created_at AS createdAt, u.updated_at AS updatedAt
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/users/:id error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Mise à jour partielle d'un utilisateur (Admin + Manager)
router.patch("/users/:id", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const { displayName, email, teamId, isActive } = req.body || {};
  const fields = [];
  const params = [];

  if (typeof displayName === "string") {
    fields.push("display_name = ?");
    params.push(displayName.trim());
  }
  if (typeof email === "string") {
    fields.push("email = ?");
    params.push(email.trim());
  }
  if (teamId !== undefined) {
    const teamIdNum = teamId === null ? null : Number(teamId);
    if (teamIdNum !== null && !Number.isFinite(teamIdNum)) {
      return res.status(400).json({ error: "Invalid teamId" });
    }
    fields.push("team_id = ?");
    params.push(teamIdNum);
  }
  if (isActive !== undefined) {
    fields.push("is_active = ?");
    params.push(isActive ? 1 : 0);
  }

  if (!fields.length) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const result = await db.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      [...params, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });

    const rows = await db.query(
      `SELECT u.id, u.username, u.display_name AS displayName, u.email,
              u.team_id AS teamId, t.name AS teamName, u.is_active AS isActive,
              u.created_at AS createdAt, u.updated_at AS updatedAt
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /api/users/:id error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Gérer les rôles d'un utilisateur (Admin uniquement)
router.patch("/users/:id/roles", authenticateJWT, authorizeRoles("ROLE_ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const { roles } = req.body || {};
  if (!Array.isArray(roles)) {
    return res.status(400).json({ error: "roles must be an array" });
  }

  // Rôles demandés
  let effectiveRoles = [...roles];

  // Valider les rôles demandés
  const validRoles = ["ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_ADMIN"];
  const invalidRoles = effectiveRoles.filter((r) => !validRoles.includes(r));
  if (invalidRoles.length > 0) {
    return res
      .status(400)
      .json({ error: `Invalid roles: ${invalidRoles.join(", ")}` });
  }

  try {
    // Identifier l'admin actuel (s'il existe)
    const adminRows = await db.query(
      `SELECT DISTINCT u.id
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.name = 'ROLE_ADMIN'`
    );
    const adminIds = adminRows.map((r) => r.id);
    const isCurrentAdmin = adminIds.includes(id);

    // Règle métier : un seul admin, qui garde uniquement ROLE_ADMIN
    if (isCurrentAdmin) {
      // Quel que soit le payload, l'admin conserve seulement ROLE_ADMIN
      effectiveRoles = ["ROLE_ADMIN"];
    } else {
      // Si on essaie de donner ROLE_ADMIN à quelqu'un d'autre alors qu'un admin existe déjà, refuser
      if (effectiveRoles.includes("ROLE_ADMIN") && adminIds.length > 0) {
        return res
          .status(400)
          .json({ error: "Il ne peut y avoir qu'un seul administrateur." });
      }

      // De toute façon, on ne laisse pas cette route attribuer ROLE_ADMIN à un autre utilisateur
      effectiveRoles = effectiveRoles.filter((r) => r !== "ROLE_ADMIN");

      // Si après filtrage il ne reste rien, forcer au moins ROLE_EMPLOYEE
      if (effectiveRoles.length === 0) {
        effectiveRoles = ["ROLE_EMPLOYEE"];
      }
    }

    // Récupérer les IDs des rôles depuis la table roles
    const roleMap = {};
    if (effectiveRoles.length > 0) {
      const placeholders = effectiveRoles.map(() => "?").join(",");
      const roleRows = await db.query(
        `SELECT id, name FROM roles WHERE name IN (${placeholders})`,
        effectiveRoles
      );
      roleRows.forEach((r) => {
        roleMap[r.name] = r.id;
      });
    }

    // Vérifier que tous les rôles existent
    const missingRoles = effectiveRoles.filter((r) => !roleMap[r]);
    if (missingRoles.length > 0) {
      return res.status(400).json({
        error: `Roles not found in database: ${missingRoles.join(", ")}`,
      });
    }

    // Supprimer tous les rôles existants pour cet utilisateur
    await db.query("DELETE FROM user_roles WHERE user_id = ?", [id]);

    // Ajouter les nouveaux rôles
    if (effectiveRoles.length > 0) {
      const values = effectiveRoles.map((roleName) => [id, roleMap[roleName]]);
      const placeholders = values.map(() => "(?, ?)").join(", ");
      const flatValues = values.flat();
      await db.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ${placeholders}`,
        flatValues
      );
    }

    // Retourner l'utilisateur avec ses nouveaux rôles
    const userRows = await db.query(
      `SELECT u.id, u.username, u.display_name AS displayName, u.email,
              u.team_id AS teamId, t.name AS teamName, u.is_active AS isActive,
              u.created_at AS createdAt, u.updated_at AS UpdatedAt,
              GROUP_CONCAT(r.name) AS roles
       FROM users u
       LEFT JOIN teams t ON u.team_id = t.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [id]
    );
    if (!userRows.length)
      return res.status(404).json({ error: "User not found" });

    const user = userRows[0];
    user.roles = user.roles ? user.roles.split(",") : [];
    res.json(user);
  } catch (err) {
    console.error("PATCH /api/users/:id/roles error:", err);
    res.status(500).json({ error: "Failed to update user roles" });
  }
});

// Récupérer les rôles d'un utilisateur
router.get("/users/:id/roles", authenticateJWT, authorizeRoles("ROLE_ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const rows = await db.query(
      `SELECT r.name AS role
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [id]
    );
    const roles = rows.map(r => r.role);
    res.json({ userId: id, roles });
  } catch (err) {
    console.error("GET /api/users/:id/roles error:", err);
    res.status(500).json({ error: "Failed to get user roles" });
  }
});

module.exports = router;


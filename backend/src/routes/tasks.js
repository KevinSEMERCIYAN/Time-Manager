const express = require("express");
const db = require("../db");
const { authenticateJWT, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/tasks", authenticateJWT, async (req, res) => {
  try {
    const currentUser = await db.queryOne("SELECT id FROM users WHERE username = ?", [req.user.username]);
    const userId = currentUser ? currentUser.id : null;
    const roles = req.user.roles || [];
    const isAdmin = roles.includes("ROLE_ADMIN");
    const isManager = roles.includes("ROLE_MANAGER");

    let sql = `
      SELECT t.id, t.title, t.description,
             t.assigned_to_user_id AS assignedToUserId,
             t.assigned_by_user_id AS assignedByUserId,
             t.team_id AS teamId,
             t.due_date AS dueDate,
             t.status,
             t.completed_at AS completedAt,
             t.created_at AS createdAt, t.updated_at AS updatedAt,
             u_to.username AS assignedToUsername,
             u_to.display_name AS assignedToDisplayName,
             u_by.username AS assignedByUsername,
             u_by.display_name AS assignedByDisplayName,
             tm.name AS teamName
      FROM tasks t
      LEFT JOIN users u_to ON t.assigned_to_user_id = u_to.id
      LEFT JOIN users u_by ON t.assigned_by_user_id = u_by.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin && !isManager && userId) {
      sql += " AND t.assigned_to_user_id = ?";
      params.push(userId);
    }
    sql += " ORDER BY t.due_date ASC, t.created_at DESC";

    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

router.get("/tasks/for-user/:userId", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);
    if (!Number.isFinite(targetUserId)) return res.status(400).json({ error: "Invalid userId" });
    const rows = await db.query(
      `SELECT t.id, t.title, t.description,
              t.assigned_to_user_id AS assignedToUserId,
              t.assigned_by_user_id AS assignedByUserId,
              t.team_id AS teamId,
              t.due_date AS dueDate,
              t.status,
              t.completed_at AS completedAt,
              t.created_at AS createdAt, t.updated_at AS updatedAt,
              u_by.display_name AS assignedByDisplayName,
              tm.name AS teamName
       FROM tasks t
       LEFT JOIN users u_by ON t.assigned_by_user_id = u_by.id
       LEFT JOIN teams tm ON t.team_id = tm.id
       WHERE t.assigned_to_user_id = ?
       ORDER BY t.due_date ASC, t.created_at DESC`,
      [targetUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/tasks/for-user/:userId error:", err);
    res.status(500).json({ error: "Failed to list tasks for user" });
  }
});

router.post("/tasks", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  try {
    const { title, description, assignedToUserId, teamId, dueDate } = req.body;
    if (!title || !assignedToUserId) {
      return res.status(400).json({ error: "title and assignedToUserId are required" });
    }
    const currentUser = await db.queryOne("SELECT id FROM users WHERE username = ?", [req.user.username]);
    if (!currentUser) return res.status(403).json({ error: "User not found" });
    const assignedByUserId = currentUser.id;
    const due = dueDate ? new Date(dueDate).toISOString().slice(0, 19).replace("T", " ") : null;
    const team = teamId ? Number(teamId) : null;

    const pool = db.getPool();
    const [insertResult] = await pool.execute(
      `INSERT INTO tasks (title, description, assigned_to_user_id, assigned_by_user_id, team_id, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [title, description || null, Number(assignedToUserId), assignedByUserId, team, due]
    );
    const id = insertResult.insertId;
    const rows = await db.query(
      `SELECT id, title, description,
              assigned_to_user_id AS assignedToUserId,
              assigned_by_user_id AS assignedByUserId,
              team_id AS teamId,
              due_date AS dueDate,
              status,
              completed_at AS completedAt,
              created_at AS createdAt, updated_at AS updatedAt
       FROM tasks WHERE id = ?`,
      [id]
    );
    res.status(201).json(rows[0] || { id, title, description, assignedToUserId: Number(assignedToUserId), assignedByUserId, teamId: team, dueDate: due, status: "PENDING", completedAt: null, createdAt: null, updatedAt: null });
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.patch("/tasks/:id", authenticateJWT, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const currentUser = await db.queryOne("SELECT id FROM users WHERE username = ?", [req.user.username]);
    const userId = currentUser ? currentUser.id : null;
    const roles = req.user.roles || [];
    const isManagerOrAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ROLE_MANAGER");

    const existing = await db.query(
      "SELECT id, assigned_to_user_id AS assignedToUserId, status FROM tasks WHERE id = ?",
      [id]
    );
    const existingRow = Array.isArray(existing) ? existing[0] : existing;
    if (!existingRow) return res.status(404).json({ error: "Task not found" });

    const { status } = req.body;
    if (status) {
      const allowed = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
      if (!isManagerOrAdmin && existingRow.assignedToUserId !== userId) {
        return res.status(403).json({ error: "You can only update your own tasks" });
      }
      if (!isManagerOrAdmin && status !== "COMPLETED" && status !== "IN_PROGRESS") {
        return res.status(403).json({ error: "You can only complete or start your own tasks" });
      }
    }

    const updates = [];
    const params = [];
    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
      if (status === "COMPLETED") {
        updates.push("completed_at = NOW()");
      } else {
        updates.push("completed_at = NULL");
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: "No updates provided" });
    params.push(id);
    await db.query(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, params);

    const updated = await db.query(
      `SELECT id, title, description,
              assigned_to_user_id AS assignedToUserId,
              assigned_by_user_id AS assignedByUserId,
              team_id AS teamId,
              due_date AS dueDate,
              status,
              completed_at AS completedAt,
              created_at AS createdAt, updated_at AS updatedAt
       FROM tasks WHERE id = ?`,
      [id]
    );
    res.json(updated[0] || null);
  } catch (err) {
    console.error("PATCH /api/tasks/:id error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/tasks/:id", authenticateJWT, authorizeRoles("ROLE_ADMIN", "ROLE_MANAGER"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const pool = db.getPool();
    const [result] = await pool.execute("DELETE FROM tasks WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Task not found" });
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/tasks/:id error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;

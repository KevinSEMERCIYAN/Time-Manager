const express = require("express");
const db = require("../db");

const router = express.Router();

// Healthcheck simple
router.get("/health", (req, res) => res.json({ ok: true }));

// Test endpoint pour vérifier la connexion DB
router.get("/test/db", async (req, res) => {
  try {
    await db.query("SELECT 1 AS test");
    const tables = await db.query(
      "SELECT TABLE_NAME AS TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
    );
    res.json({
      ok: true,
      message: "Database connection successful",
      tables: tables.map((t) => t.TABLE_NAME),
      tableCount: tables.length,
    });
  } catch (error) {
    console.error("DB test error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
      details: "Check database connection and run sql/schema.sql if needed",
    });
  }
});

module.exports = router;


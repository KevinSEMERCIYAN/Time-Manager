// Script de test pour vérifier la connexion DB (mysql2)
// Note: Si testé depuis la machine hôte, la DB doit être accessible sur localhost:3306
//       Sinon, tester depuis le conteneur Docker backend
const db = require("./src/db");

async function testDatabase() {
  console.log("🔍 Testing database connection...\n");

  try {
    console.log("1️⃣ Testing basic connection...");
    await db.query("SELECT 1 AS test");
    console.log("   ✅ Connection OK\n");

    console.log("2️⃣ Checking tables...");
    const tables = await db.query(
      "SELECT TABLE_NAME AS TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
    );

    if (tables.length === 0) {
      console.log("   ⚠️  No tables found. Run schema first:");
      console.log("      mysql -u timemanager -p timemanager < sql/schema.sql\n");
    } else {
      console.log(`   ✅ Found ${tables.length} table(s):`);
      tables.forEach((t) => console.log(`      - ${t.TABLE_NAME}`));
      console.log("");
    }

    console.log("✅ All tests passed! Database is ready.\n");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Error code:", error.code);
    console.error("Full error:", error);
    console.error("\nConfiguration actuelle:");
    console.error(`  DB_HOST: ${process.env.DB_HOST || "localhost"}`);
    console.error(`  DB_PORT: ${process.env.DB_PORT || "3306"}`);
    console.error(`  DB_USER: ${process.env.DB_USER || "timemanager"}`);
    console.error(`  DB_NAME: ${process.env.DB_NAME || "timemanager"}`);
    console.error("\nPossible issues:");
    console.error("  - Database not running (docker-compose up db)");
    console.error("  - Wrong credentials (DB_USER, DB_PASS, DB_HOST, DB_NAME)");
    console.error("  - Run schema: mysql -u timemanager -p timemanager < sql/schema.sql");
    process.exit(1);
  } finally {
    await db.close();
  }
}

testDatabase();

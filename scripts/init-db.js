#!/usr/bin/env node

/**
 * Database Initialization Script
 *
 * Usage: npm run db:init
 *
 * Connects to PostgreSQL database and runs schema migrations from scripts/init-db.sql
 *
 * Required environment variables:
 * - DATABASE_URL: PostgreSQL connection string (e.g., postgresql://user:pass@localhost:5432/db)
 *
 * This script is useful for:
 * - First-time database setup during development
 * - Running migrations against remote databases
 * - Resetting development database (backup first!)
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL environment variable is not set");
    console.error("");
    console.error("Please set DATABASE_URL in your .env.local or environment:");
    console.error(
      '  export DATABASE_URL="postgresql://user:pass@localhost:5432/eve_logs"',
    );
    console.error("");
    console.error("Then run: npm run db:init");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    console.log("🔗 Connecting to PostgreSQL database...");
    await client.connect();
    console.log("✅ Connected successfully");

    // Read migration SQL file
    const migrationPath = path.join(__dirname, "init-db.sql");
    console.log(`📂 Loading migration script: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, "utf-8");

    // Execute migration script
    console.log("🚀 Running database migrations...");
    await client.query(migrationSql);
    console.log("✅ Database migrations completed successfully");

    console.log("");
    console.log("📊 Database Initialization Summary:");
    console.log("  ✓ users table (with indexes)");
    console.log("  ✓ logs table (with composite indexes)");
    console.log("  ✓ Foreign key relationships and CASCADE rules");
    console.log("  ✓ Table and column comments (documentation)");
    console.log("");
    console.log("🎉 Database is ready for use!");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Start your application: npm run dev");
    console.log("  2. Configure EVE SSO credentials in .env.local");
    console.log("  3. Test authentication at http://localhost:3000");
  } catch (error) {
    console.error("❌ Database initialization failed:");
    console.error(error.message);
    console.error("");
    console.error("Troubleshooting:");
    console.error("  - Verify DATABASE_URL is correct");
    console.error("  - Ensure PostgreSQL server is running");
    console.error("  - Check database credentials");
    console.error("  - Run: psql <DATABASE_URL> to test connection");
    process.exit(1);
  } finally {
    await client.end();
  }
}

initializeDatabase();

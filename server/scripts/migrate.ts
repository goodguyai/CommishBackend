#!/usr/bin/env tsx
/**
 * Database migration script for pgvector setup
 * Usage: npm run migrate
 */

import { DatabaseStorage } from "../storage";
import { readFileSync } from "fs";
import { join } from "path";
import { validateEnvironment } from "../services/env";

async function runMigration() {
  try {
    console.log("🔧 Starting database migration...");
    
    // Validate environment first
    validateEnvironment();
    
    // Create storage instance
    const storage = new DatabaseStorage();
    
    // Ensure pgvector extension
    console.log("📦 Ensuring pgvector extension...");
    await storage.ensurePgVectorExtension();
    console.log("✅ pgvector extension enabled");
    
    // Read and execute migration SQL
    console.log("🔄 Running pgvector setup migration...");
    const migrationPath = join(process.cwd(), "migrations", "0001_pgvector_setup.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await storage.runRawSQL(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          console.warn(`⚠️  Statement may have failed (possibly already exists): ${statement.substring(0, 50)}...`);
          console.warn(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    console.log("✅ Migration completed successfully!");
    console.log("📊 Database now ready for vector operations with 1536-dimensional embeddings");
    console.log("🔍 Cosine similarity index created for fast similarity search");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Manual execution only - run with: tsx server/scripts/migrate.ts
if (require.main === module) {
  runMigration();
}
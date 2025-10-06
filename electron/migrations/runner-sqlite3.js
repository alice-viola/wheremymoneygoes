import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'sql');
  }
  
  async runMigrations(db) {
    console.log('Running database migrations...');
    
    // Create migrations table if it doesn't exist
    await this.createMigrationsTable(db);
    
    // Get list of migration files
    const migrationFiles = this.getMigrationFiles();
    
    // Get list of already run migrations
    const completedMigrations = await this.getCompletedMigrations(db);
    
    // Run pending migrations
    let migrationsRun = 0;
    
    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.sql');
      
      if (!completedMigrations.includes(migrationName)) {
        console.log(`Running migration: ${migrationName}`);
        
        try {
          await this.runMigration(db, file, migrationName);
          migrationsRun++;
        } catch (error) {
          console.error(`Failed to run migration ${migrationName}:`, error);
          throw error;
        }
      }
    }
    
    if (migrationsRun === 0) {
      console.log('Database is up to date');
    } else {
      console.log(`Successfully ran ${migrationsRun} migration(s)`);
    }
    
    return migrationsRun;
  }
  
  async createMigrationsTable(db) {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await db.runAsync(sql);
  }
  
  getMigrationFiles() {
    // Ensure migrations directory exists
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }
    
    // Get all .sql files in the migrations directory
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    return files.map(file => path.join(this.migrationsDir, file));
  }
  
  async getCompletedMigrations(db) {
    const rows = await db.allAsync('SELECT name FROM migrations ORDER BY executed_at');
    return rows ? rows.map(row => row.name) : [];
  }
  
  async runMigration(db, filePath, migrationName) {
    // Read the migration file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Run the migration in a transaction
    await db.runAsync('BEGIN TRANSACTION');
    
    try {
      // Split by semicolon to handle multiple statements
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await db.runAsync(statement);
        }
      }
      
      // Record the migration
      await db.runAsync('INSERT INTO migrations (name) VALUES (?)', migrationName);
      
      await db.runAsync('COMMIT');
    } catch (error) {
      await db.runAsync('ROLLBACK');
      throw error;
    }
  }
  
  // Rollback a specific migration (if down migration exists)
  async rollbackMigration(db, migrationName) {
    const downFile = path.join(this.migrationsDir, 'down', `${migrationName}.sql`);
    
    if (!fs.existsSync(downFile)) {
      throw new Error(`No down migration found for ${migrationName}`);
    }
    
    const sql = fs.readFileSync(downFile, 'utf8');
    
    await db.runAsync('BEGIN TRANSACTION');
    
    try {
      // Run the down migration
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await db.runAsync(statement);
        }
      }
      
      // Remove the migration record
      await db.runAsync('DELETE FROM migrations WHERE name = ?', migrationName);
      
      await db.runAsync('COMMIT');
      console.log(`Rolled back migration: ${migrationName}`);
    } catch (error) {
      await db.runAsync('ROLLBACK');
      throw error;
    }
  }
  
  // Reset all migrations (dangerous!)
  async resetDatabase(db) {
    console.warn('WARNING: Resetting database will delete all data!');
    
    // Get all tables except sqlite internal tables
    const tables = await db.allAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `);
    
    if (tables && tables.length > 0) {
      await db.runAsync('BEGIN TRANSACTION');
      
      try {
        // Drop all tables
        for (const table of tables) {
          await db.runAsync(`DROP TABLE IF EXISTS ${table.name}`);
        }
        
        await db.runAsync('COMMIT');
      } catch (error) {
        await db.runAsync('ROLLBACK');
        throw error;
      }
    }
    
    console.log('Database reset complete');
    
    // Run all migrations fresh
    return this.runMigrations(db);
  }
}

export default new MigrationRunner();

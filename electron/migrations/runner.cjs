const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'sql');
  }
  
  async runMigrations(db) {
    console.log('Running database migrations...');
    
    // Create migrations table if it doesn't exist
    this.createMigrationsTable(db);
    
    // Get list of migration files
    const migrationFiles = this.getMigrationFiles();
    
    // Get list of already run migrations
    const completedMigrations = this.getCompletedMigrations(db);
    
    // Run pending migrations
    let migrationsRun = 0;
    
    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.sql');
      
      if (!completedMigrations.includes(migrationName)) {
        console.log(`Running migration: ${migrationName}`);
        
        try {
          this.runMigration(db, file, migrationName);
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
  
  createMigrationsTable(db) {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.prepare(sql).run();
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
  
  getCompletedMigrations(db) {
    const stmt = db.prepare('SELECT name FROM migrations ORDER BY executed_at');
    const rows = stmt.all();
    return rows.map(row => row.name);
  }
  
  runMigration(db, filePath, migrationName) {
    // Read the migration file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Run the migration in a transaction
    const migrate = db.transaction(() => {
      // Split by semicolon to handle multiple statements
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          db.prepare(statement).run();
        }
      }
      
      // Record the migration
      const recordStmt = db.prepare('INSERT INTO migrations (name) VALUES (?)');
      recordStmt.run(migrationName);
    });
    
    migrate();
  }
  
  // Rollback a specific migration (if down migration exists)
  async rollbackMigration(db, migrationName) {
    const downFile = path.join(this.migrationsDir, 'down', `${migrationName}.sql`);
    
    if (!fs.existsSync(downFile)) {
      throw new Error(`No down migration found for ${migrationName}`);
    }
    
    const sql = fs.readFileSync(downFile, 'utf8');
    
    const rollback = db.transaction(() => {
      // Run the down migration
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          db.prepare(statement).run();
        }
      }
      
      // Remove the migration record
      const deleteStmt = db.prepare('DELETE FROM migrations WHERE name = ?');
      deleteStmt.run(migrationName);
    });
    
    rollback();
    console.log(`Rolled back migration: ${migrationName}`);
  }
  
  // Reset all migrations (dangerous!)
  async resetDatabase(db) {
    console.warn('WARNING: Resetting database will delete all data!');
    
    // Get all tables except sqlite internal tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `).all();
    
    const reset = db.transaction(() => {
      // Drop all tables
      for (const table of tables) {
        db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
      }
    });
    
    reset();
    console.log('Database reset complete');
    
    // Run all migrations fresh
    return this.runMigrations(db);
  }
}

module.exports = new MigrationRunner();

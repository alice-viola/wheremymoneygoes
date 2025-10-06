import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

async function runMigrations() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 5432,
    });

    try {
        await client.connect();
        console.log('Connected to postgres database');

        // Create schema if not exists
        await client.query(`CREATE SCHEMA IF NOT EXISTS wheremymoneygoes`);
        console.log('✓ Schema wheremymoneygoes ready');

        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS wheremymoneygoes.migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ Migrations table ready');

        // Get all migration files
        const migrationsDir = path.join(__dirname, 'src', 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration files`);

        // Run each migration
        for (const file of files) {
            // Check if migration was already executed
            const result = await client.query(
                'SELECT * FROM wheremymoneygoes.migrations WHERE filename = $1',
                [file]
            );

            if (result.rows.length > 0) {
                console.log(`⏭ Skipping ${file} (already executed)`);
                continue;
            }

            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO wheremymoneygoes.migrations (filename) VALUES ($1)',
                    [file]
                );
                console.log(`✓ Migration ${file} completed`);
            } catch (error) {
                console.error(`❌ Migration ${file} failed:`, error.message);
                throw error;
            }
        }

        console.log('\n✅ All migrations completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

console.log('🔄 Running migrations on postgres database with wheremymoneygoes schema...\n');
runMigrations();

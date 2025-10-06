import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function runMigrations() {
    // Use individual connection parameters
    const poolConfig = {
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        port: parseInt(process.env.PG_PORT || '5432'),
    };

    // Add SSL configuration if needed
    if (process.env.PG_USE_SSL === 'true') {
        poolConfig.ssl = {
            rejectUnauthorized: false
        };
    }

    const pool = new Pool(poolConfig);

    try {
        // Create schema if not exists
        await pool.query(`CREATE SCHEMA IF NOT EXISTS wheremymoneygoes`);
        console.log('✓ Schema wheremymoneygoes ready');

        // Create migrations tracking table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wheremymoneygoes.migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Get list of migration files
        const migrationFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`Found ${migrationFiles.length} migration files`);

        for (const file of migrationFiles) {
            // Check if migration has been run
            const result = await pool.query(
                'SELECT id FROM wheremymoneygoes.migrations WHERE filename = $1',
                [file]
            );

            if (result.rows.length > 0) {
                console.log(`✓ Migration ${file} already executed`);
                continue;
            }

            // Run migration
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
            
            await pool.query('BEGIN');
            try {
                await pool.query(sql);
                await pool.query(
                    'INSERT INTO wheremymoneygoes.migrations (filename) VALUES ($1)',
                    [file]
                );
                await pool.query('COMMIT');
                console.log(`✓ Migration ${file} completed`);
            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }
        }

        console.log('\n✅ All migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migrations
runMigrations();

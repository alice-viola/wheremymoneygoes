import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function resetMigrations() {
    const client = new Client({
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        port: parseInt(process.env.PG_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Drop all tables in reverse order (to handle foreign keys)
        const tables = [
            'wheremymoneygoes.processing_queue',
            'wheremymoneygoes.merchant_cache',
            'wheremymoneygoes.transactions',
            'wheremymoneygoes.raw_csv_lines',
            'wheremymoneygoes.uploads',
            'wheremymoneygoes.users',
            'wheremymoneygoes.migrations'
        ];

        for (const table of tables) {
            try {
                await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`✓ Dropped table: ${table}`);
            } catch (error) {
                console.log(`⚠ Could not drop table ${table}: ${error.message}`);
            }
        }

        // Optionally drop the schema itself
        // await client.query('DROP SCHEMA IF EXISTS wheremymoneygoes CASCADE');
        // console.log('✓ Dropped schema: wheremymoneygoes');

        console.log('\n✅ All tables dropped successfully');
        console.log('\nYou can now run migrations fresh with: npm run migrate');
        
    } catch (error) {
        console.error('❌ Error resetting migrations:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Run reset
console.log('🔄 Resetting database migrations...\n');
resetMigrations();

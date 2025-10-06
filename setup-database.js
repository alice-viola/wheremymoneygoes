import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function setupDatabase() {
    // Connect to postgres database to create our database
    const client = new Client({
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: 'postgres', // Connect to default postgres database first
        password: process.env.PG_PASSWORD || 'postgres',
        port: parseInt(process.env.PG_PORT || '5432'),
    });

    const dbName = process.env.PG_DATABASE || 'postgres';
    const schemaName = 'wheremymoneygoes';

    try {
        await client.connect();
        console.log('Connected to PostgreSQL server');

        // Check if database exists
        const checkDb = await client.query(
            `SELECT datname FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (checkDb.rows.length === 0) {
            // Create database
            console.log(`Creating database: ${dbName}`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Database '${dbName}' created successfully`);
        } else {
            console.log(`✅ Database '${dbName}' already exists`);
        }

        await client.end();

        // Connect to the target database and create schema
        const dbClient = new Client({
            user: process.env.PG_USER || 'postgres',
            host: process.env.PG_HOST || 'localhost',
            database: dbName,
            password: process.env.PG_PASSWORD || 'postgres',
            port: parseInt(process.env.PG_PORT || '5432'),
        });

        await dbClient.connect();
        console.log(`Connected to database: ${dbName}`);

        // Create schema if it doesn't exist
        console.log(`Creating schema: ${schemaName}`);
        await dbClient.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
        console.log(`✅ Schema '${schemaName}' ready`);

        await dbClient.end();

        // Now run migrations
        console.log('\nRunning migrations...');
        const { default: runMigrations } = await import('./src/migrations/run.js');
        
        console.log('\n🎉 Database setup complete!');
        console.log('\nYou can now start the server with: npm run dev');
        
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    }
}

// Run setup
console.log('🚀 Setting up WhereMyMoneyGoes database...\n');
setupDatabase();

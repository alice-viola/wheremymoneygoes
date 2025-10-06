import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function clearEncryptedData() {
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

        // Clear tables with encrypted data
        console.log('Clearing encrypted data...');
        
        // Delete all transactions (they have encrypted data)
        await client.query('DELETE FROM wheremymoneygoes.transactions');
        console.log('✓ Cleared transactions table');
        
        // Delete all merchant cache entries
        await client.query('DELETE FROM wheremymoneygoes.merchant_cache');
        console.log('✓ Cleared merchant_cache table');
        
        // Delete all raw CSV lines
        await client.query('DELETE FROM wheremymoneygoes.raw_csv_lines');
        console.log('✓ Cleared raw_csv_lines table');
        
        // Delete all uploads
        await client.query('DELETE FROM wheremymoneygoes.uploads');
        console.log('✓ Cleared uploads table');

        console.log('\n✅ All encrypted data cleared successfully!');
        console.log('\nYou can now upload new files and they will be encrypted with the current key.');
        
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

console.log('🔄 Clearing encrypted data from database...\n');
console.log('⚠️  This will delete all transactions, uploads, and cached data!');
console.log('⚠️  Make sure you have the correct ENCRYPTION_KEY set in your .env file\n');

// Give user a chance to cancel
setTimeout(() => {
    clearEncryptedData();
}, 3000);

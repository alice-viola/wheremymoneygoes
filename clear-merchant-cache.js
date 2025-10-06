#!/usr/bin/env node

/**
 * Script to clear the corrupted merchant cache from the database
 * Run this after fixing the merchant extraction logic
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function clearMerchantCache() {
    const client = await pool.connect();
    
    try {
        console.log('🗑️  Clearing merchant cache...');
        
        // Begin transaction
        await client.query('BEGIN');
        
        // Get count before deletion
        const countResult = await client.query(
            'SELECT COUNT(*) as count FROM wheremymoneygoes.merchant_cache'
        );
        const beforeCount = parseInt(countResult.rows[0].count);
        
        console.log(`Found ${beforeCount} merchant cache entries`);
        
        if (beforeCount > 0) {
            // Clear all merchant cache entries
            const deleteResult = await client.query(
                'DELETE FROM wheremymoneygoes.merchant_cache'
            );
            
            console.log(`✅ Deleted ${deleteResult.rowCount} merchant cache entries`);
            
            // Commit transaction
            await client.query('COMMIT');
            
            console.log('🎉 Merchant cache cleared successfully!');
            console.log('The cache will be rebuilt with correct merchant extraction on next transaction processing.');
        } else {
            await client.query('ROLLBACK');
            console.log('ℹ️  Merchant cache is already empty');
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error clearing merchant cache:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    clearMerchantCache()
        .then(() => {
            console.log('\n✨ Done! You can now reprocess transactions with fixed merchant extraction.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Failed to clear merchant cache:', error.message);
            process.exit(1);
        });
}

export default clearMerchantCache;

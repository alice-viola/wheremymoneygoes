#!/usr/bin/env node

import pool from './src/server/config/database.js';

async function cleanupTestData() {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    
    try {
        console.log('Cleaning up test data for user:', userId);
        
        // Start a transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete in reverse order of foreign key dependencies
            // First delete transactions
            const transResult = await client.query(
                'DELETE FROM wheremymoneygoes.transactions WHERE user_id = $1',
                [userId]
            );
            console.log(`Deleted ${transResult.rowCount} transactions`);
            
            // Delete merchant cache
            const merchantResult = await client.query(
                'DELETE FROM wheremymoneygoes.merchant_cache WHERE user_id = $1',
                [userId]
            );
            console.log(`Deleted ${merchantResult.rowCount} merchant cache entries`);
            
            // Delete raw CSV lines
            const rawResult = await client.query(
                'DELETE FROM wheremymoneygoes.raw_csv_lines WHERE user_id = $1',
                [userId]
            );
            console.log(`Deleted ${rawResult.rowCount} raw CSV lines`);
            
            // Delete processing queue entries
            const queueResult = await client.query(
                'DELETE FROM wheremymoneygoes.processing_queue WHERE user_id = $1',
                [userId]
            );
            console.log(`Deleted ${queueResult.rowCount} processing queue entries`);
            
            // Delete uploads
            const uploadResult = await client.query(
                'DELETE FROM wheremymoneygoes.uploads WHERE user_id = $1',
                [userId]
            );
            console.log(`Deleted ${uploadResult.rowCount} uploads`);
            
            await client.query('COMMIT');
            console.log('✅ Test data cleaned up successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Error cleaning up test data:', error);
        process.exit(1);
    }
    
    await pool.end();
    process.exit(0);
}

cleanupTestData();

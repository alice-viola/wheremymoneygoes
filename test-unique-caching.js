#!/usr/bin/env node

/**
 * Test that the new caching system prevents merchant name collisions
 */

import { extractMerchantKey } from './src/server/agents.js';

console.log('🧪 Testing Unique Cache Key Generation\n');
console.log('=' . repeat(80));

// Test transactions that previously had collisions
const testTransactions = [
    {
        name: "Aurora Eccher (wedding rings)",
        description: "Vostra disposizione a favore A Fav AURORA ECCHER IBAN IT74W0830434480000081057729 SALDO FEDI ID Pag 30648784"
    },
    {
        name: "Scottini Rita (rent)",
        description: "Vostra disposizione a favore A Fav SCOTTINI RITA IBAN IT82I0801620801000045144544 ID Pag AFFITTO MESE IN CORSO"
    },
    {
        name: "Directa SIM (investment)",
        description: "Vostra disposizione a favore A Fav DIRECTA SIM IBAN IT15D0326822300052315040240 ID Pag rkiLthUU170720250835361 L4054"
    },
    {
        name: "Stefania Capuzzelli (rent)",
        description: "Vostra disposizione a favore A Fav STEFANIA CAPUZZELLI IBAN IT12Q0103079021000001337928 ID Pag 0xI7z2D2300820250931041 Affitto"
    }
];

const keys = new Map();

console.log('📍 Generated Cache Keys:\n');

testTransactions.forEach((tx, index) => {
    const key = extractMerchantKey(tx.description);
    console.log(`${index + 1}. ${tx.name}`);
    console.log(`   Key: "${key}"`);
    
    if (keys.has(key)) {
        console.log(`   ❌ COLLISION with: ${keys.get(key)}`);
    } else {
        console.log(`   ✅ Unique key`);
        keys.set(key, tx.name);
    }
    console.log();
});

console.log('=' . repeat(80));
console.log('\n📊 Summary:');
console.log(`Total transactions: ${testTransactions.length}`);
console.log(`Unique keys: ${keys.size}`);

if (keys.size === testTransactions.length) {
    console.log('✅ SUCCESS: All transactions have unique cache keys!');
    console.log('\nThis means:');
    console.log('- Aurora Eccher will be correctly identified as "Aurora Eccher"');
    console.log('- Scottini Rita will be correctly identified as "Scottini Rita"');
    console.log('- No more merchant name mix-ups due to cache collisions');
} else {
    console.log('❌ FAILURE: Some transactions share the same cache key');
    console.log('This will cause incorrect merchant assignments');
}

console.log('\n💡 How it works:');
console.log('1. Each transaction description gets a unique hash-based key');
console.log('2. The LLM extracts the correct merchant name for each transaction');
console.log('3. The merchant name is cached with the unique key');
console.log('4. Future identical transactions will use the cached merchant name');
console.log('5. Different transactions (even similar ones) get different cache entries');

import fs from 'fs';
import { 
    loadAndProcessFinancialData,
    loadMerchantCache,
    saveMerchantCache 
} from '../loader.js';
import { 
    processFinancialCSV,
    detectCSVSeparator,
    parseCSVFile,
    detectFieldMappings,
    transformCSVRows,
    categorizeTransactions
} from '../parser.js';

/**
 * Example 1: Simple processing with all defaults
 */
async function example1_simple() {
    console.log('\n📊 Example 1: Simple Processing');
    console.log('-'.repeat(40));
    
    const results = await loadAndProcessFinancialData(
        '/Users/alice/Downloads/ListaMovimentiCsv08_09_2025_08_59_35.csv'
    );
    
    console.log('✅ Done!');
    return results;
}

/**
 * Example 2: Process without categorization (faster)
 */
async function example2_noCategorization() {
    console.log('\n⚡ Example 2: Fast Processing (No AI Categorization)');
    console.log('-'.repeat(40));
    
    const results = await loadAndProcessFinancialData(
        '/Users/alice/Downloads/ListaMovimentiCsv08_09_2025_08_59_35.csv',
        {
            skipCategorization: true,
            displayResults: false,
            saveToFile: true
        }
    );
    
    console.log(`Processed ${results.transactions.length} transactions`);
    return results;
}

/**
 * Example 3: Process with merchant cache for faster re-runs
 */
async function example3_withCache() {
    console.log('\n💾 Example 3: Using Merchant Cache');
    console.log('-'.repeat(40));
    
    const cachePath = '/Users/alice/Downloads/merchant_cache.json';
    const merchantCache = loadMerchantCache(cachePath);
    
    console.log(`Loaded ${merchantCache.size} cached merchants`);
    
    const results = await loadAndProcessFinancialData(
        '/Users/alice/Downloads/ListaMovimentiCsv08_09_2025_08_59_35.csv',
        {
            limit: 50,
            categorizationOptions: {
                merchantCache: merchantCache
            }
        }
    );
    
    // Save updated cache
    if (results.merchantCache) {
        saveMerchantCache(results.merchantCache, cachePath);
    }
    
    return results;
}

/**
 * Example 4: Step-by-step processing for custom workflows
 */
async function example4_stepByStep() {
    console.log('\n🔧 Example 4: Step-by-Step Custom Processing');
    console.log('-'.repeat(40));
    
    const filePath = '/Users/alice/Downloads/ListaMovimentiCsv08_09_2025_08_59_35.csv';
    
    // Step 1: Detect separator only
    const separator = await detectCSVSeparator(filePath);
    console.log(`Detected separator: "${separator.separator}"`);
    
    // Step 2: Parse CSV
    const parsedRows = await parseCSVFile(filePath, separator.separator);
    console.log(`Parsed ${parsedRows.length} rows`);
    
    // Step 3: Detect field mappings
    const mappings = await detectFieldMappings(parsedRows);
    console.log('Field mappings detected');
    
    // Step 4: Transform rows
    const transformedRows = transformCSVRows(parsedRows, mappings);
    console.log(`Transformed ${transformedRows.length} rows`);
    
    // Step 5: Custom filtering before categorization
    const filteredRows = transformedRows.filter(tx => {
        // Example: Only process expenses over €10
        return tx.Kind === '-' && tx.Amount > 10;
    });
    console.log(`Filtered to ${filteredRows.length} rows`);
    
    // Step 6: Categorize filtered transactions
    if (filteredRows.length > 0) {
        const categorized = await categorizeTransactions(filteredRows, {
            batchSize: 20,
            parallelBatches: 5
        });
        
        console.log('Categorization complete');
        return categorized;
    }
    
    return { transactions: filteredRows };
}

/**
 * Example 5: Batch processing multiple files
 */
async function example5_batchFiles() {
    console.log('\n📁 Example 5: Processing Multiple Files');
    console.log('-'.repeat(40));
    
    const files = [
        '/Users/alice/Downloads/transactions_jan.csv',
        '/Users/alice/Downloads/transactions_feb.csv',
        '/Users/alice/Downloads/transactions_mar.csv'
    ];
    
    const allTransactions = [];
    
    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.log(`⚠️  Skipping ${file} (not found)`);
            continue;
        }
        
        console.log(`Processing ${file}...`);
        const results = await loadAndProcessFinancialData(file, {
            displayResults: false,
            saveToFile: false,
            skipCategorization: true  // We'll categorize all at once
        });
        
        allTransactions.push(...results.transactions);
    }
    
    console.log(`\nTotal transactions from all files: ${allTransactions.length}`);
    
    // Categorize all transactions together for better context
    if (allTransactions.length > 0) {
        const categorized = await categorizeTransactions(allTransactions);
        console.log('All transactions categorized');
        return categorized;
    }
    
    return { transactions: allTransactions };
}

/**
 * Example 6: Generate monthly report
 */
async function example6_monthlyReport() {
    console.log('\n📈 Example 6: Monthly Report Generation');
    console.log('-'.repeat(40));
    
    const results = await loadAndProcessFinancialData(
        '/Users/alice/Downloads/ListaMovimentiCsv08_09_2025_08_59_35.csv',
        {
            displayResults: false,
            saveToFile: false
        }
    );
    
    // Group by month
    const monthlyData = {};
    results.transactions.forEach(tx => {
        const month = tx.Date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = {
                transactions: [],
                total: 0,
                count: 0
            };
        }
        monthlyData[month].transactions.push(tx);
        if (tx.Kind === '-') {
            monthlyData[month].total += tx.Amount;
            monthlyData[month].count++;
        }
    });
    
    // Display monthly summary
    console.log('\nMonthly Spending Summary:');
    Object.entries(monthlyData).sort().forEach(([month, data]) => {
        console.log(`\n${month}:`);
        console.log(`  Transactions: ${data.count}`);
        console.log(`  Total Spent: €${data.total.toFixed(2)}`);
        console.log(`  Average: €${(data.total / data.count).toFixed(2)}`);
        
        // Top category for the month
        const categoryTotals = {};
        data.transactions.forEach(tx => {
            if (tx.category && tx.Kind === '-') {
                categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.Amount;
            }
        });
        
        const topCategory = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topCategory) {
            console.log(`  Top Category: ${topCategory[0]} (€${topCategory[1].toFixed(2)})`);
        }
    });
    
    return monthlyData;
}

// Menu to run examples
async function runExamples() {
    console.log('\n🚀 WhereMyMoneyGoes - Examples');
    console.log('='.repeat(50));
    console.log('\nAvailable examples:');
    console.log('1. Simple processing with defaults');
    console.log('2. Fast processing without AI categorization');
    console.log('3. Processing with merchant cache');
    console.log('4. Step-by-step custom processing');
    console.log('5. Batch processing multiple files');
    console.log('6. Generate monthly report');
    console.log('0. Run all examples');
    
    const args = process.argv.slice(2);
    const choice = args[0] || '1';
    
    try {
        switch(choice) {
            case '1':
                await example1_simple();
                break;
            case '2':
                await example2_noCategorization();
                break;
            case '3':
                await example3_withCache();
                break;
            case '4':
                await example4_stepByStep();
                break;
            case '5':
                await example5_batchFiles();
                break;
            case '6':
                await example6_monthlyReport();
                break;
            case '0':
                console.log('\nRunning all examples...\n');
                await example1_simple();
                await example2_noCategorization();
                await example3_withCache();
                await example4_stepByStep();
                await example6_monthlyReport();
                break;
            default:
                console.log(`\nUnknown choice: ${choice}`);
                console.log('Usage: node examples.js [1-6|0]');
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runExamples()
        .then(() => {
            console.log('\n✅ Examples completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Fatal error:', error);
            process.exit(1);
        });
}

export {
    example1_simple,
    example2_noCategorization,
    example3_withCache,
    example4_stepByStep,
    example5_batchFiles,
    example6_monthlyReport
};

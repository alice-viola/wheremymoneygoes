import { loadAndProcessFinancialData } from '../loader.js';

/**
 * Main test function to process financial CSV data
 */
async function main() {
    // Configuration
    const config = {
        filePath: '/Users/alice/Downloads/ListaMovimentiCsv08_09_2025_08_59_35.csv',
        options: {
            // Processing options
            limit: 100,  // Process first 100 transactions (remove or set to null for all)
            skipCategorization: false,  // Set to true to skip AI categorization
            
            // Display options
            displayResults: true,  // Show results in console
            
            // Save options
            saveToFile: true,  // Save results to files
            outputDir: '/Users/alice/Downloads',  // Output directory
            
            // Categorization options (if not skipping)
            categorizationOptions: {
                batchSize: 50,  // Transactions per batch
                parallelBatches: 10,  // Parallel batch processing
                // You can add a merchantCache here if you want to reuse previous categorizations
                // merchantCache: loadMerchantCache('/path/to/cache.json')
            }
        }
    };
    
    try {
        console.log('WhereMyMoneyGoes - Financial Transaction Analyzer');
        console.log('='.repeat(60));
        console.log('\nStarting analysis...\n');
        
        // Process the financial data
        const results = await loadAndProcessFinancialData(
            config.filePath, 
            config.options
        );
        
        // Additional custom processing can be added here
        // For example, you could:
        // - Generate charts
        // - Send email reports
        // - Update a database
        // - Create a web dashboard
        
        console.log('\nAnalysis complete! 🎉');
        
        // Return results for further processing if needed
        return results;
        
    } catch (error) {
        console.error('\n❌ Error during processing:', error.message);
        process.exit(1);
    }
}

// Run the main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main()
        .then(results => {
            console.log('\n✅ Processing completed successfully');
            if (results) {
                console.log(`   - Processed ${results.transactions.length} transactions`);
                if (results.statistics) {
                    console.log(`   - Identified ${Object.keys(results.statistics.byCategory).length} categories`);
                    console.log(`   - Average confidence: ${(results.statistics.avgConfidence * 100).toFixed(1)}%`);
                }
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Fatal error:', error);
            process.exit(1);
        });
}

export default main;
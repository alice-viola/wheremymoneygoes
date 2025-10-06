import fs from 'fs';
import path from 'path';
import { processFinancialCSV } from './parser.js';

/**
 * Display category breakdown from statistics
 * @param {Object} statistics - Category statistics
 */
export function displayCategoryBreakdown(statistics) {
    if (!statistics) return;
    
    console.log('\nExpense Breakdown by Category:');
    Object.entries(statistics.byCategory).forEach(([category, data]) => {
        console.log(`\n${category}:`);
        console.log(`  Transactions: ${data.count}`);
        console.log(`  Total: €${data.total.toFixed(2)}`);
        
        // Show subcategories if any
        if (Object.keys(data.subcategories).length > 0) {
            console.log('  Subcategories:');
            Object.entries(data.subcategories).forEach(([subcat, subdata]) => {
                console.log(`    - ${subcat}: ${subdata.count} transactions (€${subdata.total.toFixed(2)})`);
            });
        }
    });
}

/**
 * Display top merchants from statistics
 * @param {Object} statistics - Category statistics
 * @param {number} limit - Number of top merchants to show
 */
export function displayTopMerchants(statistics, limit = 5) {
    if (!statistics || !statistics.topMerchants) return;
    
    console.log('\nTop Merchants:');
    Object.entries(statistics.topMerchants)
        .slice(0, limit)
        .forEach(([merchant, data]) => {
            console.log(`  ${merchant}: ${data.count} visits (${data.category})`);
        });
}

/**
 * Display financial summary
 * @param {Object} statistics - Category statistics
 */
export function displayFinancialSummary(statistics) {
    if (!statistics) return;
    
    console.log('\nFinancial Summary:');
    console.log(`Total spent: €${statistics.totalSpent.toFixed(2)}`);
    console.log(`Total income: €${statistics.totalIncome.toFixed(2)}`);
    console.log(`Net balance: €${(statistics.totalIncome - statistics.totalSpent).toFixed(2)}`);
}

/**
 * Display sample categorizations
 * @param {Array} transactions - Categorized transactions
 * @param {number} limit - Number of samples to show
 */
export function displaySampleCategorizations(transactions, limit = 3) {
    if (!transactions || transactions.length === 0) return;
    
    console.log('\nSample Categorizations:');
    transactions.slice(0, limit).forEach(tx => {
        console.log(`\n  ${tx.Description}`);
        console.log(`    → ${tx.category} / ${tx.subcategory}`);
        console.log(`    Merchant: ${tx.merchantName} (${tx.merchantType})`);
        console.log(`    Amount: €${tx.Amount.toFixed(2)}`);
        console.log(`    Confidence: ${(tx.confidence * 100).toFixed(0)}%`);
    });
}

/**
 * Generate analytics summary for saving
 * @param {Array} transactions - Categorized transactions
 * @returns {Object} Analytics summary
 */
export function generateAnalyticsSummary(transactions) {
    if (!transactions || transactions.length === 0) {
        return null;
    }
    
    const analytics = {
        summary: {
            totalTransactions: transactions.length,
            dateRange: {
                from: transactions[0]?.Date,
                to: transactions[transactions.length - 1]?.Date
            }
        },
        categoryBreakdown: Object.entries(transactions.reduce((acc, tx) => {
            if (!acc[tx.category]) {
                acc[tx.category] = {
                    count: 0,
                    total: 0,
                    subcategories: {},
                    merchants: new Set()
                };
            }
            acc[tx.category].count++;
            acc[tx.category].total += tx.Amount;
            if (tx.merchantName) {
                acc[tx.category].merchants.add(tx.merchantName);
            }
            
            if (tx.subcategory) {
                if (!acc[tx.category].subcategories[tx.subcategory]) {
                    acc[tx.category].subcategories[tx.subcategory] = {
                        count: 0,
                        total: 0
                    };
                }
                acc[tx.category].subcategories[tx.subcategory].count++;
                acc[tx.category].subcategories[tx.subcategory].total += tx.Amount;
            }
            
            return acc;
        }, {})).map(([category, data]) => ({
            category,
            count: data.count,
            total: data.total,
            percentage: (data.total / transactions.reduce((sum, tx) => sum + (tx.Kind === '-' ? tx.Amount : 0), 0) * 100).toFixed(2),
            avgTransaction: (data.total / data.count).toFixed(2),
            uniqueMerchants: data.merchants.size,
            subcategories: data.subcategories
        })).sort((a, b) => b.total - a.total)
    };
    
    return analytics;
}

/**
 * Save processing results to files
 * @param {Object} results - Processing results
 * @param {Object} options - Save options
 */
export function saveResults(results, options = {}) {
    const {
        outputDir = '/Users/alice/Downloads',
        saveTransactions = true,
        saveAnalytics = true,
        transactionsFilename = 'categorized_transactions.json',
        analyticsFilename = 'expense_analytics.json'
    } = options;
    
    if (!results.transactions || results.transactions.length === 0) {
        console.log('No transactions to save');
        return;
    }
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save categorized transactions
    if (saveTransactions) {
        const transactionsPath = path.join(outputDir, transactionsFilename);
        fs.writeFileSync(transactionsPath, JSON.stringify(results.transactions, null, 2));
        console.log(`\nCategorized data saved to: ${transactionsPath}`);
    }
    
    // Save analytics summary
    if (saveAnalytics) {
        const analytics = generateAnalyticsSummary(results.transactions);
        if (analytics) {
            const analyticsPath = path.join(outputDir, analyticsFilename);
            fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
            console.log(`Analytics summary saved to: ${analyticsPath}`);
        }
    }
}

/**
 * Load and process a financial CSV file
 * @param {string} filePath - Path to the CSV file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
export async function loadAndProcessFinancialData(filePath, options = {}) {
    const {
        displayResults = true,
        saveToFile = true,
        limit = null,
        skipCategorization = false,
        outputDir = '/Users/alice/Downloads',
        categorizationOptions = {}
    } = options;
    
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        console.log(`Processing financial data from: ${filePath}`);
        console.log('='.repeat(60));
        
        // Process the CSV file
        const results = await processFinancialCSV(filePath, {
            limit,
            skipCategorization,
            categorizationOptions
        });
        
        // Display results if requested
        if (displayResults && results.statistics) {
            displayCategoryBreakdown(results.statistics);
            displayTopMerchants(results.statistics, 5);
            displayFinancialSummary(results.statistics);
            displaySampleCategorizations(results.transactions, 3);
        }
        
        // Save results if requested
        if (saveToFile) {
            saveResults(results, { outputDir });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log(`Successfully processed ${results.transactions.length} transactions`);
        
        return results;
        
    } catch (error) {
        console.error('Error loading and processing financial data:', error);
        throw error;
    }
}

/**
 * Load merchant cache from file
 * @param {string} cachePath - Path to cache file
 * @returns {Map} Merchant cache map
 */
export function loadMerchantCache(cachePath) {
    try {
        if (fs.existsSync(cachePath)) {
            const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            return new Map(Object.entries(cacheData));
        }
    } catch (error) {
        console.error('Error loading merchant cache:', error);
    }
    return new Map();
}

/**
 * Save merchant cache to file
 * @param {Map} merchantCache - Merchant cache map
 * @param {string} cachePath - Path to cache file
 */
export function saveMerchantCache(merchantCache, cachePath) {
    try {
        const cacheData = Object.fromEntries(merchantCache);
        fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
        console.log(`Merchant cache saved to: ${cachePath}`);
    } catch (error) {
        console.error('Error saving merchant cache:', error);
    }
}

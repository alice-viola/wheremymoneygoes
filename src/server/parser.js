import fs from 'fs';
import csv from 'csv-parser';
import { 
    executeAgent, 
    createCSVParser, 
    createFinancialFieldMapper,
    transformAllRows,
    categorizeExpenses 
} from './agents.js';

/**
 * Parse CSV file with detected separator using async/await
 * @param {string} filePath - Path to the CSV file
 * @param {string} separator - CSV separator character
 * @returns {Promise<Array>} Parsed CSV rows
 */
export async function parseCSVFile(filePath, separator) {
    return new Promise((resolve, reject) => {
        const results = [];
        
        fs.createReadStream(filePath)
            .pipe(csv({ separator: separator }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

/**
 * Detect CSV separator from file content
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Object>} Separator detection result
 */
export async function detectCSVSeparator(filePath) {
    // Read first few lines to detect separator
    const data = fs.readFileSync(filePath, 'utf8');
    const someLines = data.split('\n').slice(0, 5).join('\n');
    
    console.log('Detecting CSV separator...');
    const separatorResult = await executeAgent(createCSVParser, {}, someLines);
    console.log('Separator detected:', separatorResult);
    
    return separatorResult;
}

/**
 * Map CSV fields to standardized financial format
 * @param {Array} parsedRows - Parsed CSV rows
 * @returns {Promise<Object>} Field mapping result
 */
export async function detectFieldMappings(parsedRows) {
    if (!parsedRows || parsedRows.length === 0) {
        throw new Error('No rows to map');
    }
    
    console.log('\nMapping fields for first row...');
    const firstRow = {
        headers: Object.keys(parsedRows[0]),
        row: parsedRows[0]
    };
    
    const mappingResult = await executeAgent(
        createFinancialFieldMapper, 
        {}, 
        JSON.stringify(firstRow, null, 2)
    );
    
    console.log('Field mappings:', mappingResult);
    return mappingResult;
}

/**
 * Transform parsed CSV rows to standardized format
 * @param {Array} parsedRows - Parsed CSV rows
 * @param {Object} fieldMappings - Field mapping configuration
 * @returns {Array} Transformed rows
 */
export function transformCSVRows(parsedRows, fieldMappings) {
    console.log('\nTransforming rows to standardized format...');
    const transformedRows = transformAllRows(parsedRows, fieldMappings);
    console.log(`Transformed ${transformedRows.length} rows`);
    
    return transformedRows;
}

/**
 * Categorize financial transactions using AI
 * @param {Array} transactions - Standardized transactions
 * @param {Object} options - Categorization options
 * @returns {Promise<Object>} Categorization result with statistics
 */
export async function categorizeTransactions(transactions, options = {}) {
    console.log('\nCategorizing expenses with AI...');
    
    const defaultOptions = {
        batchSize: 50,
        parallelBatches: 10,
        ...options
    };
    
    const categorizationResult = await categorizeExpenses(transactions, defaultOptions);
    
    console.log('\nCategorization Complete!');
    console.log(`Processed ${categorizationResult.transactions.length} transactions`);
    console.log(`Average confidence: ${(categorizationResult.statistics.avgConfidence * 100).toFixed(1)}%`);
    
    return categorizationResult;
}

/**
 * Complete CSV processing pipeline
 * @param {string} filePath - Path to the CSV file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Complete processing result
 */
export async function processFinancialCSV(filePath, options = {}) {
    const {
        limit = null,  // Limit number of rows to process
        skipCategorization = false,  // Skip AI categorization
        categorizationOptions = {}
    } = options;
    
    try {
        // Step 1: Detect separator
        const separatorResult = await detectCSVSeparator(filePath);
        
        // Step 2: Parse CSV
        console.log('\nParsing CSV file...');
        const parsedRows = await parseCSVFile(filePath, separatorResult.separator);
        console.log(`Parsed ${parsedRows.length} rows`);
        
        if (parsedRows.length === 0) {
            throw new Error('No data found in CSV file');
        }
        
        // Step 3: Detect field mappings
        const fieldMappings = await detectFieldMappings(parsedRows);
        
        // Step 4: Transform rows
        let transformedRows = transformCSVRows(parsedRows, fieldMappings);
        
        // Apply limit if specified
        if (limit && limit > 0) {
            console.log(`\nLimiting to first ${limit} rows for processing`);
            transformedRows = transformedRows.slice(0, limit);
        }
        
        // Step 5: Categorize (optional)
        let categorizationResult = null;
        if (!skipCategorization) {
            categorizationResult = await categorizeTransactions(
                transformedRows, 
                categorizationOptions
            );
        }
        
        return {
            separator: separatorResult.separator,
            fieldMappings: fieldMappings,
            transactions: categorizationResult ? categorizationResult.transactions : transformedRows,
            statistics: categorizationResult ? categorizationResult.statistics : null,
            merchantCache: categorizationResult ? categorizationResult.merchantCache : null
        };
        
    } catch (error) {
        console.error('Error processing financial CSV:', error);
        throw error;
    }
}

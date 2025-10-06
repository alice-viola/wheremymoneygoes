import { 
    detectCurrencyFormat, 
    parseCurrency, 
    formatCurrency 
} from '../agents.js';

/**
 * Test currency parsing with various international formats
 */
function testCurrencyParsing() {
    console.log('=== Currency Format Detection and Parsing Tests ===\n');
    
    const testCases = [
        // Italian/European formats
        { value: '1.234,56', expected: 1234.56, description: 'Italian format with thousand separator' },
        { value: '€ 1.234,56', expected: 1234.56, description: 'Italian format with Euro symbol' },
        { value: '234,50', expected: 234.50, description: 'Italian format without thousand separator' },
        { value: '-1.234,56', expected: -1234.56, description: 'Negative Italian format' },
        { value: '1.234.567,89', expected: 1234567.89, description: 'Large Italian number' },
        
        // US/UK formats
        { value: '1,234.56', expected: 1234.56, description: 'US format with thousand separator' },
        { value: '$1,234.56', expected: 1234.56, description: 'US format with dollar sign' },
        { value: '234.50', expected: 234.50, description: 'US format without thousand separator' },
        { value: '-1,234.56', expected: -1234.56, description: 'Negative US format' },
        { value: '(1,234.56)', expected: -1234.56, description: 'Negative US format with parentheses' },
        { value: '1,234,567.89', expected: 1234567.89, description: 'Large US number' },
        
        // Swiss format
        { value: "1'234.56", expected: 1234.56, description: 'Swiss format with apostrophe' },
        { value: "1'234'567.89", expected: 1234567.89, description: 'Large Swiss number' },
        
        // Space as thousand separator (French style)
        { value: '1 234,56', expected: 1234.56, description: 'French format with space separator' },
        { value: '1 234 567,89', expected: 1234567.89, description: 'Large French number' },
        
        // Indian format (lakhs and crores)
        { value: '1,23,456.78', expected: 123456.78, description: 'Indian format (lakhs)' },
        { value: '₹1,23,456.78', expected: 123456.78, description: 'Indian format with Rupee symbol' },
        
        // Edge cases
        { value: '0,00', expected: 0, description: 'Zero in European format' },
        { value: '0.00', expected: 0, description: 'Zero in US format' },
        { value: '.50', expected: 0.50, description: 'US format starting with decimal' },
        { value: ',50', expected: 0.50, description: 'European format starting with decimal' },
        { value: '1000', expected: 1000, description: 'No separators' },
        { value: '', expected: null, description: 'Empty string' },
        { value: 'abc', expected: null, description: 'Invalid string' }
    ];
    
    console.log('Testing currency parsing:\n');
    testCases.forEach(test => {
        const result = parseCurrency(test.value);
        const passed = result.value === test.expected;
        const symbol = passed ? '✓' : '✗';
        
        console.log(`${symbol} ${test.description}`);
        console.log(`  Input: "${test.value}"`);
        console.log(`  Expected: ${test.expected}`);
        console.log(`  Got: ${result.value}`);
        console.log(`  Format detected: ${result.format.type} (confidence: ${result.format.confidence})`);
        console.log(`  Currency: ${result.currency || 'none'}`);
        console.log(`  Negative: ${result.isNegative}`);
        console.log('');
    });
}

/**
 * Test format detection specifically
 */
function testFormatDetection() {
    console.log('\n=== Format Detection Tests ===\n');
    
    const formatTests = [
        { value: '1.234,56', expectedType: 'european' },
        { value: '1,234.56', expectedType: 'us' },
        { value: "1'234.56", expectedType: 'swiss' },
        { value: '1 234,56', expectedType: 'european' },
        { value: '1,23,456.78', expectedType: 'indian' },
        { value: '1234', expectedType: 'unknown' },
        { value: '12.34', expectedType: 'us' },
        { value: '12,34', expectedType: 'european' }
    ];
    
    formatTests.forEach(test => {
        const format = detectCurrencyFormat(test.value);
        const passed = format.type === test.expectedType;
        const symbol = passed ? '✓' : '✗';
        
        console.log(`${symbol} "${test.value}"`);
        console.log(`  Expected format: ${test.expectedType}`);
        console.log(`  Detected: ${format.type}`);
        console.log(`  Decimal separator: "${format.decimalSeparator}"`);
        console.log(`  Thousand separator: "${format.thousandSeparator}"`);
        console.log(`  Confidence: ${format.confidence}`);
        console.log('');
    });
}

/**
 * Test currency formatting
 */
function testCurrencyFormatting() {
    console.log('\n=== Currency Formatting Tests ===\n');
    
    const value = 1234567.89;
    const formats = [
        { 
            name: 'European (Italian)', 
            format: { type: 'european', decimalSeparator: ',', thousandSeparator: '.' },
            currency: '€'
        },
        { 
            name: 'US', 
            format: { type: 'us', decimalSeparator: '.', thousandSeparator: ',' },
            currency: '$'
        },
        { 
            name: 'Swiss', 
            format: { type: 'swiss', decimalSeparator: '.', thousandSeparator: "'" },
            currency: 'CHF '
        },
        { 
            name: 'French', 
            format: { type: 'european', decimalSeparator: ',', thousandSeparator: ' ' },
            currency: '€'
        },
        { 
            name: 'Indian', 
            format: { type: 'indian', decimalSeparator: '.', thousandSeparator: ',' },
            currency: '₹'
        }
    ];
    
    console.log(`Formatting ${value} in different locales:\n`);
    formats.forEach(({ name, format, currency }) => {
        const formatted = formatCurrency(value, format, currency);
        console.log(`${name}: ${formatted}`);
    });
    
    console.log('\nFormatting negative value -1234.56:\n');
    const negValue = -1234.56;
    formats.forEach(({ name, format, currency }) => {
        const formatted = formatCurrency(negValue, format, currency);
        console.log(`${name}: ${formatted}`);
    });
}

/**
 * Test with forced formats (when you know the format in advance)
 */
function testForcedFormats() {
    console.log('\n=== Forced Format Tests ===\n');
    
    // Sometimes the format is ambiguous, so you can force it
    const ambiguousValue = '1.234';
    
    console.log(`Ambiguous value: "${ambiguousValue}"\n`);
    
    // Parse as European (1.234 = one thousand two hundred thirty-four)
    const europeanResult = parseCurrency(ambiguousValue, { forceFormat: 'european' });
    console.log('Forced European interpretation:');
    console.log(`  Value: ${europeanResult.value} (thousands)`);
    
    // Parse as US (1.234 = one point two three four)
    const usResult = parseCurrency(ambiguousValue, { forceFormat: 'us' });
    console.log('\nForced US interpretation:');
    console.log(`  Value: ${usResult.value} (decimal)`);
}

// Run all tests
console.log('Currency Parser Test Suite\n');
console.log('=' .repeat(50) + '\n');

testCurrencyParsing();
testFormatDetection();
testCurrencyFormatting();
testForcedFormats();

console.log('\n' + '='.repeat(50));
console.log('Tests completed!');

export { testCurrencyParsing, testFormatDetection, testCurrencyFormatting, testForcedFormats };

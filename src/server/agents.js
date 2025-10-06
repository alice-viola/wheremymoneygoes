import { 
    Agent,
    LLMRuntime,
    MemoryStore,
    Message
} from 'agentnet'

const brain_agent_max_conversation_length = 200

/**
 * Helper function to remove unsupported fields from Gemini schemas
 * @param {Object} schema - The JSON schema object
 * @returns {Object} Cleaned schema for Gemini
 */
function cleanSchemaForGemini(schema) {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }
    
    // Create a deep copy to avoid modifying the original
    const cleaned = {};
    
    for (const key in schema) {
        // Skip additionalProperties as Gemini doesn't support it
        if (key === 'additionalProperties') {
            continue;
        }
        
        const value = schema[key];
        
        // Recursively clean nested objects
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                // For arrays, clean each element
                cleaned[key] = value.map(item => 
                    typeof item === 'object' ? cleanSchemaForGemini(item) : item
                );
            } else {
                // For objects, recursively clean
                cleaned[key] = cleanSchemaForGemini(value);
            }
        } else {
            cleaned[key] = value;
        }
    }
    
    return cleaned;
}

/**
 * Helper function to convert GPT tool definitions to Gemini format
 * @param {Object} toolDef - The GPT-style tool definition
 * @returns {Object} Gemini-compatible tool definition
 */
export function convertToolDefForGemini(toolDef) {
    if (!toolDef || typeof toolDef !== 'object') {
        return toolDef;
    }
    
    // Create the Gemini-compatible function declaration
    const geminiToolDef = {
        name: toolDef.name,
        description: toolDef.description
    };
    
    // Preserve the mode field if it exists (e.g., "stopAfterOneExecution")
    if (toolDef.mode) {
        geminiToolDef.mode = toolDef.mode;
    }
    
    // Convert parameters, removing the outer "type": "object" wrapper
    if (toolDef.parameters && toolDef.parameters.properties) {
        geminiToolDef.parameters = {
            properties: cleanSchemaForGemini(toolDef.parameters.properties),
            required: toolDef.parameters.required || []
        };
        
        // Gemini expects the type at the parameters level, not nested
        geminiToolDef.parameters.type = "object";
    }
    
    // Note: We remove the "type": "function" field as Gemini doesn't expect it at root level
    // But we preserve other fields like "mode" that control agent behavior
    
    return geminiToolDef;
}

/**
 * Main helper function that automatically selects the correct configuration based on model name
 * @param {Object} runtime - The runtime object (actual runtime instance, not enum)
 * @param {string} model - The model name
 * @param {Object} config - Configuration object containing instructions, temperature, etc.
 * @returns {Array} Array with [runtime, config] for withLLM
 */
export function createLLMConfig(runtime, model, config) {
    // Check if runtime is an object (actual runtime instance) or enum value
    const isGeminiRuntime = runtime && (
        runtime.type === 'gemini' || // Check runtime.type property
        runtime === LLMRuntime.Gemini || // Check enum value (note: might be Gemini not GEMINI)
        model.includes('gemini') // Fallback to model name
    );
    
    if (isGeminiRuntime) {
        // For Gemini, we need to pass the runtime object and Gemini-specific config
        const geminiConfig = {
            model: model,
            // Gemini uses systemInstruction instead of instructions
            systemInstruction: config.instructions || "You are a helpful assistant"
        };
        
        // Gemini temperature configuration is nested under config
        const configWrapper = {
            temperature: config.temperature !== undefined ? config.temperature : 0.0
        };
        
        // Handle JSON schema format for Gemini
        if (config.text && config.text.format && config.text.format.type === "json_schema") {
            configWrapper.responseMimeType = "application/json";
            // Clean the schema to remove unsupported fields like additionalProperties
            configWrapper.responseSchema = cleanSchemaForGemini(config.text.format.schema);
        }
        
        // Handle tool configuration for Gemini
        if (config.tool_choice) {
            // Gemini uses toolConfig with functionCallingConfig
            configWrapper.toolConfig = {
                functionCallingConfig: {
                    // Map tool_choice values to Gemini's mode
                    // "required" -> "ANY" (force function call)
                    // "auto" -> "AUTO" (let model decide)
                    // "none" -> "NONE" (no function calls)
                    mode: config.tool_choice === "required" ? "ANY" : 
                          config.tool_choice === "none" ? "NONE" : "AUTO"
                }
            };
        }
        
        // Wrap the temperature and response schema in config object for Gemini
        geminiConfig.config = configWrapper;
        
        return [runtime, geminiConfig];
    } else {
        // For GPT, use the standard configuration
        const gptConfig = {
            model: model,
            instructions: config.instructions || "You are a helpful assistant",
            temperature: config.temperature !== undefined ? config.temperature : 0
        };
        
        // Add optional configurations
        if (config.tool_choice) {
            gptConfig.tool_choice = config.tool_choice;
        }
        
        if (config.text) {
            gptConfig.text = config.text;
        }
        
        return [runtime, gptConfig];
    }
}

/**
 * Creates an agent that detects the CSV separator from sample lines
 * @param {number} maxRuns - Maximum number of runs
 * @param {Object} store - Memory store
 * @param {Object} runtime - LLM runtime
 * @param {string} model - Model name
 * @returns {Object} Compiled agent
 */
export async function createCSVParser(maxRuns, store, runtime, model) {
    const llmConfig = createLLMConfig(runtime, model, {
        instructions: "A helpful assistant that can detect CSV separators from financial data",
        temperature: 0,
        text: {
            format: {
                type: "json_schema",
                name: "csv_separator_detection",
                schema: {
                    type: "object",
                    properties: {
                        separator: {
                            type: "string",
                            description: "The detected CSV separator character",
                            enum: [",", ";", "\t", "|", ":", " "]
                        },
                        confidence: {
                            type: "number",
                            description: "Confidence level in the detection (0-1)",
                            minimum: 0,
                            maximum: 1
                        }
                    },
                    required: ["separator", "confidence"],
                    additionalProperties: false
                }
            }
        }
    });
    
    return await Agent()
    .setMetadata({
        name: "csv_separator_detector",
        description: "An agent that detects the correct CSV separator for financial data files"
    })
    .withStore(store, {})
    .withLLM(...llmConfig)
    .withRunner({
        maxRuns: maxRuns,
        maxConversationLength: brain_agent_max_conversation_length
    })
    .prompt(async (state, input) => {
        const p = `
        # CSV Separator Detection Task
        
        You are analyzing sample lines from a CSV file containing financial data.
        Your task is to identify the correct separator used in the file.
        
        ## Sample CSV Lines:
        ${input}
        
        ## Common Separators to Consider:
        - Comma (,) - Most common in English-speaking countries
        - Semicolon (;) - Common in European countries where comma is decimal separator
        - Tab (\\t) - Used for TSV files
        - Pipe (|) - Sometimes used to avoid conflicts
        - Colon (:) - Less common but possible
        - Space ( ) - Rarely used for structured data
        
        ## Analysis Guidelines:
        
        1. **Pattern Recognition**: Look for consistent patterns across all lines
        2. **Field Count**: The separator should divide each line into the same number of fields
        3. **Data Integrity**: The separator should not appear within field values (unless quoted)
        4. **Financial Data Context**: Consider typical financial CSV formats:
           - Dates (various formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
           - Amounts (may use comma or period as decimal separator)
           - Currency symbols (€, $, £, etc.)
           - Transaction descriptions (may contain spaces, commas in quoted text)
           - Transaction codes/references
        
        ## Detection Strategy:
        
        1. Count occurrences of each potential separator in each line
        2. Check for consistency across lines (same count = likely separator)
        3. Verify that the separator creates meaningful fields
        4. Consider regional conventions (e.g., semicolon common in Europe)
        5. Look for quoted fields that might contain the separator
        
        ## Important Considerations:
        
        - If amounts use comma as decimal separator (e.g., "1.234,56"), the file separator is likely semicolon
        - If amounts use period as decimal separator (e.g., "1,234.56"), the file separator could be comma
        - Headers (if present) should have the same separator as data rows
        - Some fields might be empty, but separator positions should be consistent
        
        ## Your Response:
        
        Analyze the provided lines and determine:
        1. The most likely separator character
        2. Your confidence level (0-1) based on consistency and pattern clarity
        
        Focus on accuracy - financial data processing depends on correct parsing.
        `
        return p
    })
    .compile()
}

/**
 * Creates an agent that maps parsed CSV row fields to standardized financial fields
 * @param {number} maxRuns - Maximum number of runs
 * @param {Object} store - Memory store
 * @param {Object} runtime - LLM runtime
 * @param {string} model - Model name
 * @returns {Object} Compiled agent
 */
export async function createFinancialFieldMapper(maxRuns, store, runtime, model) {
    const llmConfig = createLLMConfig(runtime, model, {
        instructions: "A helpful assistant that maps CSV fields to standardized financial transaction fields",
        temperature: 0,
        text: {
            format: {
                type: "json_schema",
                name: "field_mapping",
                schema: {
                    type: "object",
                    properties: {
                        mappings: {
                            type: "object",
                            properties: {
                                Date: {
                                    type: "object",
                                    properties: {
                                        sourceField: {
                                            type: "string",
                                            description: "The field name/index from the CSV that contains the date"
                                        },
                                        format: {
                                            type: "string",
                                            description: "The date format used (e.g., DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)"
                                        }
                                    },
                                    additionalProperties: false,
                                    required: ["sourceField", "format"]
                                },
                                FieldForOutgoing: {
                                    type: "object",
                                    properties: {
                                        sourceField: {
                                            type: "string",
                                            description: "The field name/index containing outgoing amounts (debits/expenses)"
                                        },
                                        format: {
                                            type: "string",
                                            description: "Number format details (decimal separator, thousand separator)"
                                        }
                                    },
                                    additionalProperties: false,
                                    required: ["sourceField", "format"]
                                },
                                FieldForIncoming: {
                                    type: "object",
                                    properties: {
                                        sourceField: {
                                            type: "string",
                                            description: "The field name/index containing incoming amounts (credits/income)"
                                        },
                                        format: {
                                            type: "string",
                                            description: "Number format details (decimal separator, thousand separator)"
                                        }
                                    },
                                    additionalProperties: false,
                                    required: ["sourceField", "format"]
                                },
                                Currency: {
                                    type: "object",
                                    properties: {
                                        sourceField: {
                                            type: "string",
                                            description: "The field containing currency, or 'fixed' if same for all rows"
                                        }
                                    },
                                    additionalProperties: false,
                                    required: ["sourceField"]
                                },
                                Description: {
                                    type: "object",
                                    properties: {
                                        sourceField: {
                                            type: "string",
                                            description: "The field(s) containing transaction description"
                                        }
                                    },
                                    additionalProperties: false,
                                    required: ["sourceField"]
                                },
                                Code: {
                                    type: "object",
                                    properties: {
                                        sourceField: {
                                            type: "string",
                                            description: "The field containing transaction code/reference, or 'none' if not available"
                                        }
                                    },
                                    required: ["sourceField"],
                                    additionalProperties: false
                                }
                            },
                            required: ["Date", "FieldForOutgoing", "FieldForIncoming", "Currency", "Description", "Code"],
                            additionalProperties: false
                        },
                        confidence: {
                            type: "number",
                            description: "Overall confidence in the mapping (0-1)",
                            minimum: 0,
                            maximum: 1
                        },
                        notes: {
                            type: "string",
                            description: "Any additional notes or warnings about the mapping"
                        }
                    },
                    required: ["mappings", "confidence", "notes"],
                    additionalProperties: false
                }
            }
        }
    });
    
    return await Agent()
    .setMetadata({
        name: "financial_field_mapper",
        description: "An agent that maps CSV fields to standardized financial transaction fields"
    })
    .withStore(store, {})
    .withLLM(...llmConfig)
    .withRunner({
        maxRuns: maxRuns,
        maxConversationLength: brain_agent_max_conversation_length
    })
    .prompt(async (state, input) => {
        const p = `
        # Financial Field Mapping Task
        
        You are analyzing a parsed CSV row from a financial data file.
        Your task is to map the fields to standardized financial transaction fields.
        
        ## Parsed CSV Row (with field names/indices):
        ${input}

        ## Target Fields to Map:
        
        1. **Date**: Transaction date
           - Identify the field containing the date
           - Determine the date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
           
        2. **FieldForOutgoing**: Field containing outgoing amounts (debits/expenses/payments)
           - May be a dedicated "Debit" or "DARE" column
           - May be the same field as incoming with negative sign
           - If same field as incoming (e.g., "Amount" with +/-), use the SAME field name for both
           - Note the number format (decimal separator, thousand separator)
           
        3. **FieldForIncoming**: Field containing incoming amounts (credits/income/receipts)
           - May be a dedicated "Credit" or "AVERE" column
           - May be the same field as outgoing with positive sign
           - If same field as outgoing (e.g., "Amount" with +/-), use the SAME field name for both
           - Note the number format (decimal separator, thousand separator)
           
        4. **Currency**: Transaction currency
           - May be in a dedicated field (EUR, USD, GBP, etc.)
           - May be a symbol (€, $, £)
           - May be fixed for entire file (not present in data)
           
        5. **Description**: Transaction description/details
           - Usually contains merchant name, transaction details
           - May span multiple fields that should be combined
           - Could include payment method, location, etc.
           
        6. **Code**: Transaction reference/code
           - May be transaction ID, reference number, check number
           - Could be empty/not available in some formats
        
        ## Mapping Strategy:
        
        1. **Analyze field names** (if headers present):
           - Look for obvious matches (Date, Amount, Description, etc.)
           - Consider variations (Trans Date, Amt, Desc, Reference, etc.)
           
        2. **Analyze field content**:
           - Date patterns (look for date-like formats)
           - Numeric patterns (amounts with decimals)
           - Text patterns (descriptions are usually longer text)
           
        3. **Consider common banking CSV formats**:
           - Some banks use separate Debit/Credit columns (map to FieldForOutgoing/FieldForIncoming)
           - Some use a single Amount column with +/- signs (use SAME field name for both)
           - Some include running balance (not needed for our mapping)
           - Currency might be implicit based on account
        
        4. **Handle edge cases**:
           - Missing fields (e.g., no transaction code)
           - Combined fields (e.g., amount with embedded currency symbol)
           - Single amount field with signs (specify same field for both incoming/outgoing)
        
        ## Important Notes:
        
        - Be precise about field identification (use exact field names or indices)
        - Specify transformation logic clearly (e.g., "negative amount = debit")
        - Note any ambiguities or potential issues
        - Consider regional variations (date formats, decimal separators)
        
        ## Your Response:
        
        Provide a complete mapping specification that can be used to transform
        any row from this CSV format into the standardized format.
        Include confidence level and any important notes for accurate processing.
        `
        return p
    })
    .compile()
}

/**
 * Creates an agent that categorizes financial transactions
 * @param {number} maxRuns - Maximum number of runs
 * @param {Object} store - Memory store
 * @param {Object} runtime - LLM runtime
 * @param {string} model - Model name
 * @returns {Object} Compiled agent
 */
export async function createExpenseCategorizer(maxRuns, store, runtime, model) {
    const llmConfig = createLLMConfig(runtime, model, {
        instructions: "An expert financial analyst that categorizes transactions accurately",
        temperature: 0.0,
        text: {
            format: {
                type: "json_schema",
                name: "expense_categorization",
                schema: {
                    type: "object",
                    properties: {
                        categorizedTransactions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    transactionId: {
                                        type: "string",
                                        description: "Unique identifier for the transaction"
                                    },
                    category: {
                        type: "string",
                        description: "Main category from the predefined list or custom",
                        enum: [
                            "Food & Dining",
                            "Shopping", 
                            "Transportation",
                            "Utilities",
                            "Entertainment",
                            "Health & Wellness",
                            "Travel",
                            "Housing",
                            "Financial",
                            "Education",
                            "Personal Care",
                            "Insurance",
                            "Pets",
                            "Subscriptions & Memberships",
                            "Gifts & Donations",
                            "Government & Taxes",
                            "Children & Family",
                            "Business & Professional",
                            "Cash & ATM",
                            "Income",
                            "Balance",
                            "Other"
                        ]
                    },
                                    subcategory: {
                                        type: "string",
                                        description: "Auto-detected subcategory based on transaction details"
                                    },
                                    merchantName: {
                                        type: "string",
                                        description: "Extracted/cleaned merchant name"
                                    },
                                    merchantType: {
                                        type: "string",
                                        description: "Type of merchant/business"
                                    },
                                    confidence: {
                                        type: "number",
                                        description: "Confidence score for this categorization (0-1)",
                                        minimum: 0,
                                        maximum: 1
                                    }
                                },
                                required: ["transactionId", "category", "subcategory", "merchantName", "merchantType", "confidence"],
                                additionalProperties: false
                            }
                        },
                        batchSummary: {
                            type: "object",
                            properties: {
                                totalTransactions: {
                                    type: "number",
                                    description: "Total number of transactions in batch"
                                },
                                avgConfidence: {
                                    type: "number",
                                    description: "Average confidence score for the batch",
                                    minimum: 0,
                                    maximum: 1
                                },
                                detectedPatterns: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    },
                                    description: "Recurring patterns or merchants detected"
                                }
                            },
                            required: ["totalTransactions", "avgConfidence", "detectedPatterns"],
                            additionalProperties: false
                        }
                    },
                    required: ["categorizedTransactions", "batchSummary"],
                    additionalProperties: false
                }
            }
        }
    });
    
    return await Agent()
    .setMetadata({
        name: "expense_categorizer",
        description: "Categorizes financial transactions with main and sub-categories"
    })
    .withStore(store, {})
    .withLLM(...llmConfig)
    .withRunner({
        maxRuns: maxRuns,
        maxConversationLength: brain_agent_max_conversation_length
    })
    .prompt(async (state, input) => {
        const p = `
        # Financial Transaction Categorization Task
        
        You are an expert financial analyst specializing in expense categorization.
        Analyze the following batch of transactions and categorize each one accurately.
        
        ## Transactions to Categorize:
        ${input}
        
        ## Main Categories (use these primarily):
        
        1. **Food & Dining**: Restaurants, cafes, bars, groceries, food delivery
           - Subcategories: Restaurant, Cafe/Coffee, Bar, Groceries, Fast Food, Food Delivery, Catering, Bakery
           
        2. **Shopping**: Retail stores, online shopping, clothing, electronics
           - Subcategories: Clothing, Electronics, Home Goods, Books/Media, General Retail, Online Shopping, Home Improvement, Furniture
           
        3. **Transportation**: Fuel, public transport, taxi/rideshare, parking, vehicle maintenance
           - Subcategories: Fuel/Gas, Public Transport, Taxi/Uber, Parking, Tolls, Vehicle Maintenance, Car Rental, EV Charging, Bike/Scooter Share
           
        4. **Utilities**: Electricity, gas, water, internet, phone, waste management
           - Subcategories: Electricity, Gas, Water, Internet, Mobile Phone, Waste, Cable/TV, Heating, Sewage
           
        5. **Entertainment**: Movies, concerts, sports, games, streaming services
           - Subcategories: Movies/Cinema, Music/Concerts, Sports, Gaming, Streaming Services, Hobbies, Events, Nightlife
           
        6. **Health & Wellness**: Medical, pharmacy, gym, wellness
           - Subcategories: Doctor/Medical, Pharmacy, Dental, Vision, Gym/Fitness, Therapy, Mental Health, Alternative Medicine, Medical Equipment
           
        7. **Travel**: Hotels, flights, vacation rentals, tourism
           - Subcategories: Hotel/Lodging, Flights, Vacation Rental, Tourism/Activities, Travel Insurance, Car Rental, Travel Food, Travel Shopping
           
        8. **Housing**: Rent, mortgage, home maintenance, repairs
           - Subcategories: Rent, Mortgage, Home Maintenance, Repairs, HOA Fees, Moving Expenses, Home Security, Cleaning Services
           
        9. **Financial**: Bank fees, investments, loans, transfers
           - Subcategories: Bank Fees, Investment, Loan Payment, Money Transfer, Interest, Financial Services, Cryptocurrency, P2P Payments, Currency Exchange
           
        10. **Education**: Tuition, books, courses, training
            - Subcategories: Tuition, Books/Supplies, Online Courses, Training/Certification, School Fees, Tutoring, Educational Software
            
        11. **Personal Care**: Hair, beauty, spa, personal services
            - Subcategories: Hair/Barber, Beauty/Cosmetics, Spa/Massage, Laundry/Dry Cleaning, Nails, Skincare, Personal Hygiene
            
        12. **Insurance**: All insurance premiums and payments
            - Subcategories: Health Insurance, Auto Insurance, Home/Renters Insurance, Life Insurance, Pet Insurance, Travel Insurance, Business Insurance, Disability Insurance
            
        13. **Pets**: Pet-related expenses
            - Subcategories: Pet Food, Veterinary, Pet Supplies, Pet Services, Pet Grooming, Pet Boarding, Pet Toys, Pet Medicine
            
        14. **Subscriptions & Memberships**: Recurring subscriptions and memberships
            - Subcategories: Streaming Services, Software Subscriptions, News/Media, Professional Memberships, Cloud Storage, Music Services, App Subscriptions, Club Memberships
            
        15. **Gifts & Donations**: Gifts and charitable giving
            - Subcategories: Gifts, Charitable Donations, Religious Contributions, Political Donations, Tips/Gratuities, Wedding Gifts, Birthday Gifts
            
        16. **Government & Taxes**: Government payments and taxes
            - Subcategories: Income Tax, Property Tax, Vehicle Registration, Licenses/Permits, Fines/Penalties, Government Fees, Passport/Visa, Court Fees
            
        17. **Children & Family**: Child and family-related expenses
            - Subcategories: Childcare/Daycare, Baby Supplies, School Supplies, Kids Activities, Child Support, Family Support, Toys, Kids Clothing
            
        18. **Business & Professional**: Business and professional expenses
            - Subcategories: Office Supplies, Professional Services, Business Tools, Coworking Space, Professional Development, Business Travel, Marketing, Legal Services
            
        19. **Cash & ATM**: Cash withdrawals, deposits
            - Subcategories: ATM Withdrawal, Cash Deposit, Cash Advance
            
        20. **Income**: Salary, refunds, reimbursements (for incoming transactions)
            - Subcategories: Salary, Refund, Reimbursement, Investment Income, Gift Received, Freelance Income, Rental Income, Dividend
            
        21. **Balance**: Bank account balances, NOT actual transactions
            - Subcategories: Opening Balance, Closing Balance, Account Balance, Available Balance
            - Examples: "Saldo contabile", "Bank Account", "Opening Balance", "Closing Balance"
            - IMPORTANT: These are account state snapshots, not money movements
            - NOTE: Balance entries are automatically filtered out during save - they won't be stored in the database
            
        22. **Other**: Anything that doesn't fit above categories
            - Subcategories: Miscellaneous, Unknown, Fees, Fines, Uncategorized
        
        ## Categorization Guidelines:
        
        1. **CRITICAL - Identify Balance Entries First**:
           - Check if description indicates a balance: "Saldo contabile", "Bank Account", etc.
           - These are NOT transactions - they show account state at a point in time
           - Always categorize as "Balance" category (they will be filtered out automatically)
           - Common patterns: "Saldo" (Italian), "Balance", "Solde" (French), "Kontostand" (German)
           - Examples to filter: "Opening Balance", "Closing Balance", "Available Balance", "Saldo disponibile"
           
        2. **Merchant Extraction**:
           - Extract clean merchant name from POS/transaction descriptions
           - Remove transaction metadata (dates, card numbers, "PRESSO", "TRAMITE", etc.)
           - Identify the actual business name
           - For bank transfers: Extract recipient name after "A Fav" and before "IBAN"
           - Example: "A Fav AURORA ECCHER IBAN..." → merchantName: "Aurora Eccher"
           - For rent payments to individuals, use the recipient's name as merchant
           - CRITICAL: Each unique recipient should have their own merchant name, not a generic one
        
        3. **Pattern Recognition**:
           - Look for recurring merchants across transactions
           - Identify transaction patterns (e.g., daily coffee, weekly groceries)
           - Note time patterns that might indicate transaction type
        
        4. **Context Clues**:
           - POS transactions often include merchant type hints
           - Italian descriptions: "RISTORANTE"=restaurant, "FARMACIA"=pharmacy, "BENZINA"=fuel
           - Amount can hint at category (small amounts at certain times = coffee)
        
        5. **Subcategory Detection**:
           - Be specific but practical
           - Auto-detect based on merchant type and description
           - Consider local context (Italian merchants, European patterns)
        
        6. **Confidence Scoring**:
           - High (0.9-1.0): Clear merchant name and type
           - Medium (0.7-0.89): Partial information, pattern-based
           - Low (0.5-0.69): Ambiguous, needs more context
        
        ## Special Instructions:
        
        - Each transaction MUST have a unique transactionId (use array index if not provided)
        - Extract merchant names intelligently (e.g., "RISTO 3 RISTORAZIONE" → "Risto 3")
        - Detect business types from context (e.g., "RIVENDITA GIORNALI E TABACC" → Newsstand/Tobacco shop)
        - For Italian text, understand common terms:
          * ALIMENTARI = Grocery store
          * TABACCHI = Tobacco shop
          * EDICOLA/GIORNALI = Newsstand
          * BENZINA/CARBURANTE = Gas station
          * SUPERMERCATO = Supermarket
          * ASSICURAZIONE = Insurance
          * BOLLETTE/UTENZE = Utilities
          * VETERINARIO = Veterinary (Pets category)
          * ASILO/SCUOLA = Daycare/School (Children & Family)
        
        - Identify recurring payments patterns:
          * Monthly/annual subscriptions → Subscriptions & Memberships
          * Insurance premiums → Insurance category (not Financial or Health)
          * Childcare/school fees → Children & Family
          * Professional tools/services → Business & Professional
        
        - Special merchant patterns:
          * Netflix, Spotify, Disney+ → Subscriptions & Memberships
          * Pet stores, vet clinics → Pets
          * Toy stores, baby supplies → Children & Family
          * Government offices, DMV → Government & Taxes
          * Charity names, churches → Gifts & Donations
        
        - Bank Transfer Instructions:
          * For "Vostra disposizione a favore A Fav NAME IBAN...", extract NAME as merchantName
          * "SALDO FEDI" = wedding rings payment → Shopping/Jewelry or Gifts (based on context)
          * "AFFITTO" = rent payment → Housing/Rent, merchantName is the recipient
          * Each recipient should be their own unique merchant, not grouped together
        
        ## Response Requirements:
        
        For each transaction provide:
        1. Appropriate main category
        2. Specific subcategory (auto-detected)
        3. Clean merchant name
        4. Merchant type description
        5. Confidence score
        
        Also provide batch summary with:
        - Total transaction count
        - Average confidence
        - Any detected patterns or frequently appearing merchants
        
        Be consistent across similar transactions in the batch.
        `
        return p
    })
    .compile()
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }
    
    return dp[m][n];
}

/**
 * Calculate similarity score between two merchant keys
 * @param {string} key1 - First merchant key
 * @param {string} key2 - Second merchant key
 * @returns {number} Similarity score between 0 and 1
 */
export function calculateMerchantSimilarity(key1, key2) {
    if (!key1 || !key2) return 0;
    
    // Normalize for comparison
    const norm1 = key1.toLowerCase().trim();
    const norm2 = key2.toLowerCase().trim();
    
    // Exact match
    if (norm1 === norm2) return 1.0;
    
    // Check if one contains the other (for partial merchant names)
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        const minLen = Math.min(norm1.length, norm2.length);
        const maxLen = Math.max(norm1.length, norm2.length);
        return 0.8 + (0.2 * (minLen / maxLen));
    }
    
    // Calculate Levenshtein similarity
    const distance = levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const similarity = 1 - (distance / maxLen);
    
    // Check for common tokens (useful for multi-word merchants)
    const tokens1 = new Set(norm1.split(/\s+/));
    const tokens2 = new Set(norm2.split(/\s+/));
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    const jaccardSimilarity = intersection.size / union.size;
    
    // Weighted average of different similarity measures
    return (similarity * 0.6) + (jaccardSimilarity * 0.4);
}

/**
 * Find best matching merchant from cache using similarity scoring
 * @param {string} merchantKey - The merchant key to match
 * @param {Map} merchantCache - The merchant cache
 * @param {number} threshold - Minimum similarity threshold (default 0.75)
 * @returns {Object|null} Best matching cached merchant or null
 */
function findSimilarMerchant(merchantKey, merchantCache, threshold = 0.75) {
    if (!merchantKey || merchantCache.size === 0) return null;
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [cacheKey, cacheData] of merchantCache) {
        const similarity = calculateMerchantSimilarity(merchantKey, cacheKey);
        
        if (similarity > bestScore && similarity >= threshold) {
            bestScore = similarity;
            bestMatch = {
                ...cacheData,
                matchScore: similarity,
                originalKey: cacheKey
            };
        }
    }
    
    return bestMatch;
}

/**
 * Process transactions in batches for categorization
 * @param {Array} transactions - Array of transactions to categorize
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} Categorized transactions
 */
export async function categorizeExpenses(transactions, options = {}) {
    const {
        batchSize = 50,
        parallelBatches = 10,
        runtime = LLMRuntime.GPT,
        model = 'gpt-4.1-mini-2025-04-14',
        customCategories = [],
        merchantCache = new Map(),
        similarityThreshold = 0.75  // Minimum similarity for cache match
    } = options;
    
    // Step 1: Check merchant cache for known categorizations
    const uncategorized = [];
    const categorized = [];
    
    transactions.forEach((tx, index) => {
        const descriptionKey = extractMerchantKey(tx.Description);
        
        // First try exact match with description-based key
        if (merchantCache.has(descriptionKey)) {
            const cached = merchantCache.get(descriptionKey);
            categorized.push({
                ...tx,
                transactionId: tx.id || String(index),
                category: cached.category,
                subcategory: cached.subcategory,
                merchantName: cached.merchantName,
                merchantType: cached.merchantType,
                confidence: cached.confidence,
                fromCache: true,
                cacheMatchType: 'exact'
            });
        } else {
            // Don't use similarity matching on description keys as they're hashes
            // Instead, let the LLM process this transaction
            uncategorized.push({
                ...tx,
                transactionId: tx.id || String(index),
                originalIndex: index,
                merchantKey: descriptionKey  // Store for debugging
            });
        }
    });
    
    if (uncategorized.length === 0) {
        return {
            transactions: categorized,
            merchantCache: merchantCache,
            statistics: generateCategoryStatistics(categorized)
        };
    }
    
    // Step 2: Create batches for uncategorized transactions
    const batches = [];
    for (let i = 0; i < uncategorized.length; i += batchSize) {
        batches.push(uncategorized.slice(i, i + batchSize));
    }
    
    // Step 3: Process batches in parallel
    const results = [];
    for (let i = 0; i < batches.length; i += parallelBatches) {
        const batchGroup = batches.slice(i, i + parallelBatches);
        
        const promises = batchGroup.map(async (batch) => {
            try {
                // Prepare batch for LLM
                const batchInput = batch.map(tx => ({
                    transactionId: tx.transactionId,
                    date: tx.Date,
                    amount: tx.Amount,
                    currency: tx.Currency,
                    description: tx.Description,
                    kind: tx.Kind
                }));
                
                // Execute categorization agent
                const result = await executeAgent(
                    createExpenseCategorizer,
                    { customCategories },
                    JSON.stringify(batchInput, null, 2)
                );
                
                // Update merchant cache with unique description-based key
                if (result && result.categorizedTransactions) {
                    result.categorizedTransactions.forEach(cat => {
                        const originalTx = batch.find(tx => tx.transactionId === cat.transactionId);
                        if (originalTx) {
                            const cacheData = {
                                category: cat.category,
                                subcategory: cat.subcategory,
                                merchantName: cat.merchantName,
                                merchantType: cat.merchantType,
                                confidence: cat.confidence
                            };
                            
                            // Store with unique description-based key
                            // This ensures each unique transaction description gets its own cache entry
                            const descriptionKey = extractMerchantKey(originalTx.Description);
                            merchantCache.set(descriptionKey, cacheData);
                        }
                    });
                }
                
                return result;
            } catch (error) {
                console.error('Error processing batch:', error);
                // Return uncategorized on error
                return {
                    categorizedTransactions: batch.map(tx => ({
                        transactionId: tx.transactionId,
                        category: 'Other',
                        subcategory: 'Unknown',
                        merchantName: 'Unknown',
                        merchantType: 'Unknown',
                        confidence: 0
                    }))
                };
            }
        });
        
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }
    
    // Step 4: Combine results
    const allCategorized = [];
    results.forEach(result => {
        if (result && result.categorizedTransactions) {
            result.categorizedTransactions.forEach(cat => {
                const originalTx = uncategorized.find(tx => tx.transactionId === cat.transactionId);
                if (originalTx) {
                    allCategorized.push({
                        ...originalTx,
                        category: cat.category,
                        subcategory: cat.subcategory,
                        merchantName: cat.merchantName,
                        merchantType: cat.merchantType,
                        confidence: cat.confidence,
                        fromCache: false
                    });
                }
            });
        }
    });
    
    // Step 5: Merge cached and newly categorized, maintaining original order
    const finalResults = transactions.map((tx, index) => {
        const cached = categorized.find(c => c.originalIndex === index || c.transactionId === (tx.id || String(index)));
        if (cached) {
            return cached;
        }
        const newCat = allCategorized.find(c => c.originalIndex === index || c.transactionId === (tx.id || String(index)));
        return newCat || {
            ...tx,
            transactionId: tx.id || String(index),
            category: 'Other',
            subcategory: 'Unknown',
            merchantName: 'Unknown',
            merchantType: 'Unknown',
            confidence: 0,
            error: true
        };
    });
    
    return {
        transactions: finalResults,
        merchantCache: merchantCache,
        statistics: generateCategoryStatistics(finalResults)
    };
}

/**
 * Extract a merchant key from transaction description for caching
 * This function creates a unique key for caching based on the full description
 * @param {string} description - Transaction description
 * @returns {string} Merchant key for caching
 */
export function extractMerchantKey(description) {
    if (!description) return 'unknown';
    
    // Create a hash of the full description to ensure uniqueness
    // This prevents cache collisions between different transactions
    const hash = description.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    
    // Also include some key words from the description for debugging
    const words = description.toUpperCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !/^\d+$/.test(w))
        .slice(0, 3)
        .join('_');
    
    return `${words}_${Math.abs(hash).toString(16)}`.toLowerCase().substring(0, 60);
}

/**
 * Generate statistics from categorized transactions
 * @param {Array} transactions - Categorized transactions
 * @returns {Object} Statistics object
 */
function generateCategoryStatistics(transactions) {
    const stats = {
        byCategory: {},
        bySubcategory: {},
        topMerchants: {},
        totalSpent: 0,
        totalIncome: 0,
        avgConfidence: 0,
        balanceEntriesCount: 0
    };
    
    let confidenceSum = 0;
    const merchantCounts = new Map();
    
    // Count balance entries separately
    const balanceEntries = transactions.filter(tx => tx.category === 'Balance');
    const actualTransactions = transactions.filter(tx => tx.category !== 'Balance');
    stats.balanceEntriesCount = balanceEntries.length;
    
    actualTransactions.forEach(tx => {
        // Category stats
        if (!stats.byCategory[tx.category]) {
            stats.byCategory[tx.category] = {
                count: 0,
                total: 0,
                subcategories: {}
            };
        }
        stats.byCategory[tx.category].count++;
        
        // Handle amounts based on transaction kind
        const amount = tx.Amount || 0;
        if (tx.Kind === '-') {
            stats.byCategory[tx.category].total += amount;
            stats.totalSpent += amount;
        } else if (tx.Kind === '+') {
            stats.totalIncome += amount;
        }
        
        // Subcategory stats
        if (!stats.byCategory[tx.category].subcategories[tx.subcategory]) {
            stats.byCategory[tx.category].subcategories[tx.subcategory] = {
                count: 0,
                total: 0
            };
        }
        stats.byCategory[tx.category].subcategories[tx.subcategory].count++;
        stats.byCategory[tx.category].subcategories[tx.subcategory].total += amount;
        
        // Merchant frequency
        if (tx.merchantName && tx.merchantName !== 'Unknown') {
            const key = `${tx.merchantName}|${tx.category}`;
            merchantCounts.set(key, (merchantCounts.get(key) || 0) + 1);
        }
        
        // Confidence
        confidenceSum += tx.confidence || 0;
    });
    
    // Calculate averages
    stats.avgConfidence = actualTransactions.length > 0 
        ? confidenceSum / actualTransactions.length 
        : 0;
    
    // Top merchants
    const sortedMerchants = Array.from(merchantCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    sortedMerchants.forEach(([key, count]) => {
        const [merchant, category] = key.split('|');
        stats.topMerchants[merchant] = { count, category };
    });
    
    return stats;
}

export async function executeAgent (agentFunction, state, input) {
    const modelsToTry = [
        { run: LLMRuntime.GPT, model: 'gpt-4.1-2025-04-14' },
        { run: LLMRuntime.GPT, model: 'gpt-4.1-mini-2025-04-14' },
    ]
    const store = new MemoryStore()
    for (const model of modelsToTry) {
        try {
            const agent = await agentFunction(1, store, model.run, model.model);
            const message = new Message({
                content: input,
                session: state
            })
            const result = JSON.parse((await agent.query(message)).getContent());
            console.log('result', result);
            return result;
        } catch (error) {
            console.error(`Error executing agent with model ${model.model}:`, error);
        }
    }
    return null;
}

/**
 * Detect the number format used in a currency string
 * @param {string} value - The currency string to analyze
 * @returns {Object} Format information including decimal separator, thousand separator, and format type
 */
export function detectCurrencyFormat(value) {
    if (!value || typeof value !== 'string') {
        return { type: 'unknown', decimalSeparator: '.', thousandSeparator: ',', confidence: 0 };
    }
    
    const trimmed = value.trim();
    
    // Count occurrences of potential separators
    const commaCount = (trimmed.match(/,/g) || []).length;
    const periodCount = (trimmed.match(/\./g) || []).length;
    const spaceCount = (trimmed.match(/\s/g) || []).length;
    const apostropheCount = (trimmed.match(/'/g) || []).length;
    
    // Check position of last comma and period
    const lastCommaIndex = trimmed.lastIndexOf(',');
    const lastPeriodIndex = trimmed.lastIndexOf('.');
    
    // Extract the part after the last separator
    let decimalPart = '';
    if (lastCommaIndex > lastPeriodIndex) {
        decimalPart = trimmed.substring(lastCommaIndex + 1);
    } else if (lastPeriodIndex > -1) {
        decimalPart = trimmed.substring(lastPeriodIndex + 1);
    }
    
    // Analyze patterns to determine format
    let format = {
        type: 'unknown',
        decimalSeparator: '.',
        thousandSeparator: ',',
        confidence: 0
    };
    
    // European format: 1.234.567,89 or 1 234 567,89 or 1'234'567,89
    if (lastCommaIndex > lastPeriodIndex && decimalPart.length <= 3) {
        format = {
            type: 'european',
            decimalSeparator: ',',
            thousandSeparator: periodCount > 0 ? '.' : (spaceCount > 0 ? ' ' : (apostropheCount > 0 ? "'" : '')),
            confidence: 0.9
        };
        
        // Higher confidence if we see the pattern clearly
        if (periodCount > 0 && commaCount === 1 && decimalPart.length === 2) {
            format.confidence = 0.95;
        }
    }
    // US/UK format: 1,234,567.89
    else if (lastPeriodIndex > lastCommaIndex && decimalPart.length <= 3) {
        format = {
            type: 'us',
            decimalSeparator: '.',
            thousandSeparator: commaCount > 0 ? ',' : '',
            confidence: 0.9
        };
        
        // Higher confidence if we see the pattern clearly
        if (commaCount > 0 && periodCount === 1 && decimalPart.length === 2) {
            format.confidence = 0.95;
        }
    }
    // Swiss format: 1'234'567.89
    else if (apostropheCount > 0 && periodCount > 0) {
        format = {
            type: 'swiss',
            decimalSeparator: '.',
            thousandSeparator: "'",
            confidence: 0.85
        };
    }
    // Indian format: 1,23,456.78 (uses lakhs and crores)
    else if (commaCount > 1 && periodCount === 1) {
        // Check for Indian numbering pattern
        const parts = trimmed.split('.');
        if (parts[0].match(/^\d{1,2}(,\d{2})*,\d{3}$/)) {
            format = {
                type: 'indian',
                decimalSeparator: '.',
                thousandSeparator: ',',
                confidence: 0.85
            };
        }
    }
    // No decimals, just thousands
    else if (commaCount > 0 && periodCount === 0) {
        // Could be US format without decimals or European thousands
        // Look at the pattern - if commas appear every 3 digits, likely US thousands
        if (trimmed.match(/^\d{1,3}(,\d{3})*$/)) {
            format = {
                type: 'us',
                decimalSeparator: '.',
                thousandSeparator: ',',
                confidence: 0.7
            };
        }
    }
    else if (periodCount > 0 && commaCount === 0) {
        // Could be European thousands or US decimal
        // If period appears every 3 digits, likely European thousands
        if (trimmed.match(/^\d{1,3}(\.\d{3})*$/)) {
            format = {
                type: 'european',
                decimalSeparator: ',',
                thousandSeparator: '.',
                confidence: 0.7
            };
        } else {
            // Likely US format with decimal
            format = {
                type: 'us',
                decimalSeparator: '.',
                thousandSeparator: '',
                confidence: 0.8
            };
        }
    }
    
    return format;
}

/**
 * Parse a currency/number string intelligently by detecting its format
 * @param {string} value - The currency string to parse
 * @param {Object} options - Optional parsing options
 * @param {string} options.forceFormat - Force a specific format ('european', 'us', 'swiss', 'indian')
 * @param {string} options.decimalSeparator - Override decimal separator detection
 * @param {string} options.thousandSeparator - Override thousand separator detection
 * @returns {Object} Parsed result with value, format info, and original string
 */
export function parseCurrency(value, options = {}) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return {
            value: null,
            formatted: '',
            original: value,
            format: { type: 'unknown', decimalSeparator: '.', thousandSeparator: ',', confidence: 0 },
            isNegative: false,
            currency: null
        };
    }
    
    // Convert to string if number
    let stringValue = typeof value === 'number' ? value.toString() : value;
    const original = stringValue;
    
    // Detect currency symbol
    const currencyMatch = stringValue.match(/^([€$£¥₹₽¢₩₪₦₨₱₡₵₴₸₹₺₼₽₾₿]+)|([€$£¥₹₽¢₩₪₦₨₱₡₵₴₸₹₺₼₽₾₿]+)$/);
    let currency = null;
    if (currencyMatch) {
        currency = currencyMatch[0];
        stringValue = stringValue.replace(currencyMatch[0], '').trim();
    }
    
    // Check for negative values
    let isNegative = false;
    if (stringValue.match(/^[(-]|[-)]$/)) {
        isNegative = true;
        stringValue = stringValue.replace(/[()]/g, '').replace(/^-|−/, '').replace(/-|−$/, '').trim();
    }
    
    // Detect or use forced format
    let format;
    if (options.forceFormat) {
        format = {
            type: options.forceFormat,
            decimalSeparator: options.decimalSeparator || (options.forceFormat === 'european' ? ',' : '.'),
            thousandSeparator: options.thousandSeparator || (options.forceFormat === 'european' ? '.' : ','),
            confidence: 1
        };
    } else {
        format = detectCurrencyFormat(stringValue);
        
        // Override with provided options
        if (options.decimalSeparator) {
            format.decimalSeparator = options.decimalSeparator;
        }
        if (options.thousandSeparator) {
            format.thousandSeparator = options.thousandSeparator;
        }
    }
    
    // Parse based on detected format
    let cleanValue = stringValue;
    
    // Remove thousand separators
    if (format.thousandSeparator) {
        // Escape special regex characters
        const escapedSeparator = format.thousandSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanValue = cleanValue.replace(new RegExp(escapedSeparator, 'g'), '');
    }
    
    // Replace decimal separator with period for parsing
    if (format.decimalSeparator !== '.') {
        cleanValue = cleanValue.replace(format.decimalSeparator, '.');
    }
    
    // Remove any remaining non-numeric characters except period and minus
    cleanValue = cleanValue.replace(/[^\d.-]/g, '');
    
    // Parse the number
    const parsed = parseFloat(cleanValue);
    const finalValue = isNaN(parsed) ? null : (isNegative ? -Math.abs(parsed) : parsed);
    
    return {
        value: finalValue,
        formatted: finalValue !== null ? formatCurrency(finalValue, format, currency) : '',
        original: original,
        format: format,
        isNegative: isNegative,
        currency: currency
    };
}

/**
 * Format a number as currency string using specified format
 * @param {number} value - The numeric value to format
 * @param {Object} format - Format specification
 * @param {string} currency - Optional currency symbol
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, format = null, currency = null) {
    if (value === null || value === undefined || isNaN(value)) {
        return '';
    }
    
    // Default format if not provided
    if (!format) {
        format = {
            type: 'us',
            decimalSeparator: '.',
            thousandSeparator: ',',
            confidence: 1
        };
    }
    
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    
    // Convert to string with 2 decimal places
    let formatted = absValue.toFixed(2);
    
    // Split into integer and decimal parts
    const parts = formatted.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousand separators
    if (format.thousandSeparator) {
        // For Indian format, use different grouping
        if (format.type === 'indian' && integerPart.length > 3) {
            // Indian format: 1,23,456
            let result = integerPart.slice(-3);
            let remaining = integerPart.slice(0, -3);
            while (remaining.length > 2) {
                result = remaining.slice(-2) + format.thousandSeparator + result;
                remaining = remaining.slice(0, -2);
            }
            if (remaining) {
                result = remaining + format.thousandSeparator + result;
            }
            integerPart = result;
        } else {
            // Standard format: 1,234,567
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousandSeparator);
        }
    }
    
    // Combine with appropriate decimal separator
    formatted = integerPart + format.decimalSeparator + decimalPart;
    
    // Add negative sign or parentheses
    if (isNegative) {
        formatted = '-' + formatted;
    }
    
    // Add currency symbol
    if (currency) {
        // Some currencies go at the end (e.g., € in some locales)
        if (currency === '€' && format.type === 'european') {
            formatted = formatted + ' ' + currency;
        } else {
            formatted = currency + formatted;
        }
    }
    
    return formatted;
}

/**
 * Parse a number string based on the specified format
 * @param {string} value - The number string to parse
 * @param {string} format - The format description (e.g., 'decimal comma', 'period decimal with sign')
 * @returns {number|null} The parsed number or null if empty/invalid
 */
function parseAmount(value, format) {
    if (!value || value.trim() === '') {
        return null;
    }
    
    // Use the new parseCurrency function for more robust parsing
    const parseOptions = {};
    
    // Interpret the format string
    if (format) {
        if (format.includes('comma')) {
            parseOptions.forceFormat = 'european';
        } else if (format.includes('period')) {
            parseOptions.forceFormat = 'us';
        }
    }
    
    const result = parseCurrency(value, parseOptions);
    return result.value;
}

/**
 * Parse a date string based on the specified format
 * @param {string} value - The date string to parse
 * @param {string} format - The date format (e.g., 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')
 * @returns {string} The date in ISO format (YYYY-MM-DD) or original if parsing fails
 */
function parseDate(value, format) {
    if (!value || value.trim() === '') {
        return '';
    }
    
    const dateStr = value.trim();
    let day, month, year;
    
    // Parse based on format
    if (format === 'DD/MM/YYYY') {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        }
    } else if (format === 'MM/DD/YYYY') {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            month = parts[0].padStart(2, '0');
            day = parts[1].padStart(2, '0');
            year = parts[2];
        }
    } else if (format === 'YYYY-MM-DD') {
        // Already in ISO format
        return dateStr;
    } else if (format === 'DD-MM-YYYY') {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        }
    } else if (format === 'MM-DD-YYYY') {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            month = parts[0].padStart(2, '0');
            day = parts[1].padStart(2, '0');
            year = parts[2];
        }
    }
    
    // Return ISO format if parsing successful
    if (day && month && year) {
        return `${year}-${month}-${day}`;
    }
    
    // Return original if parsing failed
    return dateStr;
}

/**
 * Transform a parsed CSV row using the field mappings
 * @param {Object} row - The parsed CSV row
 * @param {Object} mappings - The field mappings from createFinancialFieldMapper
 * @returns {Object} The transformed row in standardized format
 */
export function transformRow(row, mappings) {
    const transformed = {};
    
    // Date
    if (mappings.Date && mappings.Date.sourceField && row[mappings.Date.sourceField]) {
        transformed.Date = parseDate(row[mappings.Date.sourceField], mappings.Date.format);
    } else {
        transformed.Date = '';
    }
    
    // Determine Kind and Amount based on incoming/outgoing fields
    const outgoingField = mappings.FieldForOutgoing?.sourceField;
    const incomingField = mappings.FieldForIncoming?.sourceField;
    const outgoingFormat = mappings.FieldForOutgoing?.format || '';
    const incomingFormat = mappings.FieldForIncoming?.format || '';
    
    let amount = null;
    let kind = null;
    
    if (outgoingField === incomingField) {
        // Same field with +/- signs
        const value = row[outgoingField];
        if (value) {
            amount = parseAmount(value, outgoingFormat);
            if (amount !== null) {
                kind = amount < 0 ? '-' : '+';
                amount = Math.abs(amount);
            }
        }
    } else {
        // Separate fields for incoming/outgoing
        const outgoingValue = row[outgoingField];
        const incomingValue = row[incomingField];
        
        const outgoingAmount = parseAmount(outgoingValue, outgoingFormat);
        const incomingAmount = parseAmount(incomingValue, incomingFormat);
        
        if (outgoingAmount !== null && outgoingAmount > 0) {
            amount = outgoingAmount;
            kind = '-';
        } else if (incomingAmount !== null && incomingAmount > 0) {
            amount = incomingAmount;
            kind = '+';
        }
    }
    
    transformed.Kind = kind || '';
    transformed.Amount = amount || 0;
    
    // Currency
    if (mappings.Currency && mappings.Currency.sourceField) {
        if (mappings.Currency.sourceField === 'fixed') {
            // Fixed currency value should be in notes or handled separately
            transformed.Currency = 'EUR'; // Default, should be parameterized
        } else {
            transformed.Currency = row[mappings.Currency.sourceField] || '';
        }
    } else {
        transformed.Currency = '';
    }
    
    // Description
    if (mappings.Description && mappings.Description.sourceField) {
        transformed.Description = row[mappings.Description.sourceField] || '';
    } else {
        transformed.Description = '';
    }
    
    // Code
    if (mappings.Code && mappings.Code.sourceField) {
        if (mappings.Code.sourceField === 'none') {
            transformed.Code = '';
        } else {
            transformed.Code = row[mappings.Code.sourceField] || '';
        }
    } else {
        transformed.Code = '';
    }
    
    return transformed;
}

/**
 * Transform all parsed CSV rows using the field mappings
 * @param {Array} rows - Array of parsed CSV rows
 * @param {Object} fieldMappings - The complete response from createFinancialFieldMapper
 * @returns {Array} Array of transformed rows in standardized format
 */
export function transformAllRows(rows, fieldMappings) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return [];
    }
    
    if (!fieldMappings || !fieldMappings.mappings) {
        throw new Error('Invalid field mappings provided');
    }
    
    return rows.map(row => transformRow(row, fieldMappings.mappings));
}
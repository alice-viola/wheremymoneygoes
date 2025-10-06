import { 
    Agent,
    LLMRuntime,
    MemoryStore,
    Message
} from 'agentnet';
import { config } from './config/env.js';
import {
    searchTransactionsTool,
    getMonthlyComparisonTool,
    getUnusualTransactionsTool,
    getRecurringExpensesTool,
    getCategoryTrendsTool
} from './assistant-tools.js';

// Import the rewritten tools
import { getTransactionsTool, getSpendingAnalyticsTool } from './assistant-tools-core.js';

// Ensure OpenAI API key is available for agentnet
if (config.openaiApiKey && !process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = config.openaiApiKey;
}

/**
 * Helper function to convert tool definitions for Gemini format
 */
function convertToolDefForGemini(toolDef) {
    if (!toolDef || typeof toolDef !== 'object') {
        return toolDef;
    }
    
    const geminiToolDef = {
        name: toolDef.name,
        description: toolDef.description
    };
    
    if (toolDef.mode) {
        geminiToolDef.mode = toolDef.mode;
    }
    
    if (toolDef.parameters && toolDef.parameters.properties) {
        geminiToolDef.parameters = {
            properties: toolDef.parameters.properties,
            required: toolDef.parameters.required || [],
            type: "object"
        };
    }
    
    return geminiToolDef;
}

/**
 * Create LLM configuration helper
 */
function createLLMConfig(runtime, model, config) {
    const isGeminiRuntime = runtime === LLMRuntime.Gemini || model.includes('gemini');
    
    if (isGeminiRuntime) {
        const geminiConfig = {
            model: model,
            systemInstruction: config.instructions || "You are a helpful financial assistant"
        };
        
        const configWrapper = {
            temperature: config.temperature !== undefined ? config.temperature : 0.0
        };
        
        if (config.text && config.text.format && config.text.format.type === "json_schema") {
            configWrapper.responseMimeType = "application/json";
            configWrapper.responseSchema = config.text.format.schema;
        }
        
        if (config.tool_choice) {
            configWrapper.toolConfig = {
                functionCallingConfig: {
                    mode: config.tool_choice === "required" ? "ANY" : 
                          config.tool_choice === "none" ? "NONE" : "AUTO"
                }
            };
        }
        
        geminiConfig.config = configWrapper;
        
        return [runtime, geminiConfig];
    } else {
        const gptConfig = {
            model: model,
            instructions: config.instructions || "You are a helpful financial assistant",
            temperature: config.temperature !== undefined ? config.temperature : 0
        };
        
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
 * All available tools for the assistant
 */
const tools = [
    getTransactionsTool,
    getSpendingAnalyticsTool,
    searchTransactionsTool,
    getMonthlyComparisonTool,
    getUnusualTransactionsTool,
    getRecurringExpensesTool,
    getCategoryTrendsTool
];

/**
 * Create the main financial assistant agent
 */
export async function createFinancialAssistant(runtime = LLMRuntime.GPT, model = "gpt-4.1-2025-04-14", userId = null) {
    const store = MemoryStore();
    
    // Initialize state with user context
    const initialState = {
        userId: userId,
        accountId: null // Can be set if needed
    };
    
    const llmConfig = createLLMConfig(runtime, model, {
        instructions: `You are a helpful financial assistant that helps users understand their spending patterns and manage their money better. 
        You have access to their transaction data and can provide insights, analytics, and recommendations.
        
        Key capabilities:
        - Analyze spending patterns and trends
        - Identify unusual transactions
        - Provide budgeting advice
        - Find potential savings opportunities
        - Answer questions about specific transactions
        
        Always be helpful, clear, and provide actionable insights when possible.
        Format monetary values clearly with currency symbols.
        When showing multiple transactions, present them in a clear, organized way.`,
        temperature: 0.7,
        tool_choice: "auto"
    });
    
    const agent = Agent()
        .setMetadata({
            name: "financial_assistant",
            description: "A helpful assistant for analyzing spending and providing financial insights"
        })
        .withStore(store, initialState)
        .withLLM(...llmConfig)
        .withRunner({
            maxRuns: 5,
            maxConversationLength: 50
        })
        .prompt(async (state, input) => {
            const today = new Date().toISOString().split('T')[0];
            
            return `
            # Financial Assistant Task
            
            You are helping a user understand their spending and manage their finances better.
            Today's date is: ${today}
            
            User question: ${input}
            
            ## Available Tools:
            
            1. **get_transactions** - Retrieve transactions with filters
               - Filter by category, date range, merchant
               - Useful for detailed transaction analysis
            
            2. **get_spending_analytics** - Get comprehensive spending analytics
               - Provides breakdowns by category, merchant
               - Shows trends and patterns for a date range
            
            3. **search_transactions** - Search transactions by text
               - Find specific transactions by description or merchant
            
            4. **get_monthly_comparison** - Compare current vs previous month
               - Quick overview of spending changes
            
            5. **get_unusual_transactions** - Find unusually high transactions
               - Identifies outliers in spending patterns
            
            6. **get_recurring_expenses** - Identify subscriptions and recurring costs
               - Helps find regular expenses and potential savings
            
            7. **get_category_trends** - Analyze category spending over time
               - Shows how spending in different categories changes
            
            ## Guidelines:
            
            - Use appropriate tools to gather data before providing insights
            - Be specific with date ranges when analyzing periods
            - Provide clear, actionable advice
            - Format currency values properly (e.g., $123.45)
            - When showing lists, limit to most relevant items
            - Explain patterns and anomalies clearly
            - Suggest concrete steps for improvement
            
            ## Response Format:
            
            - Start with a direct answer to the user's question
            - Provide supporting data and analysis
            - End with actionable recommendations or next steps
            - Keep responses concise but informative
            
            Remember: You're here to help the user better understand and manage their money.
            `;
        });
    
    // Add tools to the agent
    const isGeminiRuntime = runtime === LLMRuntime.Gemini || model.includes('gemini');
    
    for (const tool of tools) {
        const toolDef = isGeminiRuntime ? convertToolDefForGemini(tool.def) : tool.def;
        agent.addTool(toolDef, async (state, input) => {
            // Pass state to handler so it can access userId
            return await tool.handler(input, state);
        });
    }
    
    return await agent.compile();
}

/**
 * Process a message through the financial assistant
 */
export async function processAssistantMessage(message, conversationId = null, runtimeType = 'gpt', model = "gpt-4.1-2025-04-14", userId = null) {
    try {
        // Initialize the appropriate runtime
        let runtime;
        if (runtimeType === 'gemini' || runtimeType === LLMRuntime.Gemini) {
            runtime = LLMRuntime.Gemini;
        } else {
            runtime = LLMRuntime.GPT;
        }
        
        const assistant = await createFinancialAssistant(runtime, model, userId);
        
        // Create a Message object for the query
        const inputMessage = new Message({
            content: message
        });
        
        const response = await assistant.query(inputMessage);
        
        // Get content from response
        let responseContent;
        try {
            responseContent = response.getContent();
        } catch (e) {
            // Fallback if getContent() doesn't work
            if (typeof response === 'string') {
                responseContent = response;
            } else if (response && response.content) {
                responseContent = response.content;
            } else if (response && response.message) {
                responseContent = response.message;
            } else {
                responseContent = JSON.stringify(response);
            }
        }
        
        return {
            success: true,
            message: responseContent,
            conversationId: conversationId || Date.now().toString()
        };
    } catch (error) {
        console.error('Assistant error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

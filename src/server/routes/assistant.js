import { processAssistantMessage } from '../assistant.js';
import { authenticate } from '../middleware/auth.js';

// Store conversation history (in production, use a database)
const conversations = new Map();

/**
 * Assistant routes
 */
export default async function assistantRoutes(fastify, opts) {
    // Add authentication to all routes
    fastify.addHook('preHandler', authenticate);
    
    /**
     * POST /api/assistant/chat
     * Send a message to the AI assistant
     */
    fastify.post('/chat', async (request, reply) => {
        try {
            const userId = request.user.id; // Get from authenticated user - exactly like other routes
            const { message, conversationId, runtime = 'gpt', model } = request.body;
            
            if (!message) {
                return reply.code(400).send({ 
                    success: false, 
                    error: 'Message is required' 
                });
            }
            
            // Default models
            const selectedModel = model || (runtime === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4.1-2025-04-14');
            
            // Process the message through the assistant
            const result = await processAssistantMessage(
                message, 
                conversationId,
                runtime,  // Pass runtime string directly
                selectedModel,
                userId
            );
            
            if (result.success) {
                // Store conversation history
                if (!conversations.has(result.conversationId)) {
                    conversations.set(result.conversationId, []);
                }
                
                const history = conversations.get(result.conversationId);
                history.push({
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                });
                history.push({
                    role: 'assistant',
                    content: result.message,
                    timestamp: new Date().toISOString()
                });
                
                // Limit history size
                if (history.length > 100) {
                    history.splice(0, history.length - 100);
                }
                
                return {
                    success: true,
                    message: result.message,
                    conversationId: result.conversationId
                };
            } else {
                return reply.code(500).send({
                    success: false,
                    error: result.error || 'Failed to process message'
                });
            }
        } catch (error) {
            console.error('Chat endpoint error:', error);
            return reply.code(500).send({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });

    /**
     * GET /api/assistant/conversation/:id
     * Get conversation history
     */
    fastify.get('/conversation/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const history = conversations.get(id) || [];
            
            return {
                success: true,
                conversationId: id,
                messages: history
            };
        } catch (error) {
            console.error('Get conversation error:', error);
            return reply.code(500).send({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });

    /**
     * DELETE /api/assistant/conversation/:id
     * Clear conversation history
     */
    fastify.delete('/conversation/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            conversations.delete(id);
            
            return {
                success: true,
                message: 'Conversation cleared'
            };
        } catch (error) {
            console.error('Clear conversation error:', error);
            return reply.code(500).send({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });

    /**
     * GET /api/assistant/suggestions
     * Get suggested questions/prompts
     */
    fastify.get('/suggestions', async (request, reply) => {
        try {
            const suggestions = [
                "What did I spend the most on this month?",
                "Show me my spending by category for the last 30 days",
                "Find all my food expenses this week",
                "What are my unusual transactions?",
                "How much did I spend at Starbucks this year?",
                "Compare my spending this month vs last month",
                "What are my biggest recurring expenses?",
                "Show me potential areas where I can save money",
                "Analyze my weekend spending patterns",
                "What's my average daily spending?"
            ];
            
            return {
                success: true,
                suggestions: suggestions.sort(() => Math.random() - 0.5).slice(0, 5)
            };
        } catch (error) {
            console.error('Get suggestions error:', error);
            return reply.code(500).send({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    });
}

import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const SALT_ROUNDS = 10;

export default async function authRoutes(fastify, options) {
    // Sign up route
    fastify.post('/api/auth/signup', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    username: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                username: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { email, password, username } = request.body;
        
        try {
            // Check if user already exists
            const existingUser = await pool.query(
                'SELECT id FROM wheremymoneygoes.users WHERE email = $1',
                [email]
            );
            
            if (existingUser.rows.length > 0) {
                return reply.code(409).send({ 
                    error: 'User with this email already exists' 
                });
            }
            
            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            
            // Create user
            const result = await pool.query(
                `INSERT INTO wheremymoneygoes.users (email, password_hash, username) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, email, username, created_at`,
                [email, passwordHash, username || null]
            );
            
            const user = result.rows[0];
            
            // Generate JWT token
            const token = generateToken({
                user_id: user.id,
                email: user.email
            });
            
            // Return token and user info
            return reply.send({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username
                }
            });
            
        } catch (error) {
            request.log.error('Signup error:', error);
            return reply.code(500).send({ 
                error: 'Failed to create user account' 
            });
        }
    });
    
    // Login route
    fastify.post('/api/auth/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                username: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { email, password } = request.body;
        
        try {
            // Find user by email
            const result = await pool.query(
                'SELECT id, email, username, password_hash FROM wheremymoneygoes.users WHERE email = $1',
                [email]
            );
            
            if (result.rows.length === 0) {
                return reply.code(401).send({ 
                    error: 'Invalid email or password' 
                });
            }
            
            const user = result.rows[0];
            
            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!validPassword) {
                return reply.code(401).send({ 
                    error: 'Invalid email or password' 
                });
            }
            
            // Generate JWT token
            const token = generateToken({
                user_id: user.id,
                email: user.email
            });
            
            // Return token and user info (without password hash)
            return reply.send({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username
                }
            });
            
        } catch (error) {
            request.log.error('Login error:', error);
            return reply.code(500).send({ 
                error: 'Failed to authenticate' 
            });
        }
    });
    
    // Verify token route
    fastify.get('/api/auth/verify', {
        schema: {
            headers: {
                type: 'object',
                properties: {
                    authorization: { type: 'string' }
                },
                required: ['authorization']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        valid: { type: 'boolean' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                username: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            
            if (!authHeader) {
                return reply.code(401).send({ 
                    valid: false,
                    error: 'No authorization header' 
                });
            }
            
            const token = authHeader.startsWith('Bearer ') 
                ? authHeader.slice(7) 
                : authHeader;
            
            // Verify token
            const decoded = verifyToken(token);
            
            // Get user details
            const result = await pool.query(
                'SELECT id, email, username FROM wheremymoneygoes.users WHERE id = $1',
                [decoded.user_id]
            );
            
            if (result.rows.length === 0) {
                return reply.code(401).send({ 
                    valid: false,
                    error: 'User not found' 
                });
            }
            
            const user = result.rows[0];
            
            return reply.send({
                valid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username
                }
            });
            
        } catch (error) {
            request.log.error('Token verification error:', error);
            return reply.code(401).send({ 
                valid: false,
                error: 'Invalid or expired token' 
            });
        }
    });
    
    // Logout route (optional - mainly for client-side token removal)
    fastify.post('/api/auth/logout', async (request, reply) => {
        // Token invalidation would typically be handled client-side
        // or with a token blacklist/refresh token system
        return reply.send({ 
            success: true,
            message: 'Logged out successfully' 
        });
    });
}

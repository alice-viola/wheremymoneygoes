import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// JWT secret key (should be in environment variables)
const JWT_SECRET = config.jwtSecret || 'your-secret-key-change-this-in-production';

/**
 * Generate JWT token
 * @param {Object} payload - Token payload (should contain user_id)
 * @returns {String} JWT token
 */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d' // Token expires in 7 days
    });
}

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Fastify authentication hook
 * Extracts and verifies JWT token from request headers
 */
export async function authenticate(request, reply) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.authorization;
        
        if (!authHeader) {
            return reply.code(401).send({ 
                error: 'No authorization header provided' 
            });
        }

        // Extract token (format: "Bearer <token>")
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            return reply.code(401).send({ 
                error: 'No token provided' 
            });
        }

        // Verify token and extract payload
        const decoded = verifyToken(token);
        
        // Add user_id to request for use in route handlers
        request.user = {
            id: decoded.user_id,
            email: decoded.email
        };

    } catch (error) {
        request.log.error('Authentication error:', error);
        return reply.code(401).send({ 
            error: 'Invalid or expired token' 
        });
    }
}

/**
 * Optional authentication hook
 * Tries to authenticate but doesn't fail if no token is provided
 */
export async function optionalAuthenticate(request, reply) {
    try {
        const authHeader = request.headers.authorization;
        
        if (!authHeader) {
            request.user = null;
            return;
        }

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (token) {
            const decoded = verifyToken(token);
            request.user = {
                id: decoded.user_id,
                email: decoded.email
            };
        } else {
            request.user = null;
        }
    } catch (error) {
        // Invalid token, but continue without authentication
        request.user = null;
    }
}

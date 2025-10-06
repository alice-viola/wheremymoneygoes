import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        
        // Get key from environment or use default development key
        const keyHex = process.env.ENCRYPTION_KEY || 'a'.repeat(64); // Default dev key
        if (!process.env.ENCRYPTION_KEY) {
            console.warn('⚠️  No ENCRYPTION_KEY found in environment. Using default development key.');
            console.warn('⚠️  Set ENCRYPTION_KEY environment variable for production!');
        }
        
        try {
            this.key = Buffer.from(keyHex, 'hex');
        } catch (error) {
            console.error('Invalid ENCRYPTION_KEY format. Using default key.');
            this.key = Buffer.from('a'.repeat(64), 'hex');
        }
    }

    /**
     * Encrypt text data
     * @param {string} text - Plain text to encrypt
     * @returns {object} Encrypted data with iv and auth tag
     */
    encrypt(text) {
        if (!text) return null;
        
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt encrypted data
     * @param {object} encryptedData - Object with encrypted, iv, and authTag
     * @returns {string} Decrypted plain text
     */
    decrypt(encryptedData) {
        if (!encryptedData || !encryptedData.encrypted) return null;
        
        try {
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                this.key,
                Buffer.from(encryptedData.iv, 'hex')
            );
            
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Encrypt JSON object
     * @param {object} obj - Object to encrypt
     * @returns {object} Encrypted data
     */
    encryptJSON(obj) {
        if (!obj) return null;
        return this.encrypt(JSON.stringify(obj));
    }

    /**
     * Decrypt to JSON object
     * @param {object} encryptedData - Encrypted data
     * @returns {object} Decrypted object
     */
    decryptJSON(encryptedData) {
        const decrypted = this.decrypt(encryptedData);
        if (!decrypted) return null;
        
        try {
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Failed to parse decrypted JSON:', error);
            return null;
        }
    }

    /**
     * Hash a value for indexing (one-way)
     * @param {string} value - Value to hash
     * @returns {string} Hashed value
     */
    hash(value) {
        if (!value) return null;
        return crypto
            .createHash('sha256')
            .update(value + (process.env.ENCRYPTION_SALT || ''))
            .digest('hex');
    }
}

// Export singleton instance
export default new EncryptionService();

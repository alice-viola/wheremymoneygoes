const crypto = require('crypto');
const keytar = require('keytar');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyService = 'WhereMyMoneyGoes';
    this.keyAccount = 'EncryptionKey';
    this.key = null;
  }
  
  async initialize() {
    // Get or create encryption key from system keychain
    this.key = await this.getOrCreateKey();
  }
  
  async getOrCreateKey() {
    try {
      // Try to get existing key from keychain
      let keyHex = await keytar.getPassword(this.keyService, this.keyAccount);
      
      if (!keyHex) {
        // Generate a new key
        const key = crypto.randomBytes(32);
        keyHex = key.toString('hex');
        
        // Store in keychain
        await keytar.setPassword(this.keyService, this.keyAccount, keyHex);
        
        console.log('Created new encryption key');
      } else {
        console.log('Using existing encryption key');
      }
      
      return Buffer.from(keyHex, 'hex');
    } catch (error) {
      console.error('Keytar error, falling back to environment variable:', error);
      
      // Fallback to environment variable if keytar fails
      const envKey = process.env.ENCRYPTION_KEY;
      if (envKey) {
        return Buffer.from(envKey, 'hex');
      }
      
      // Last resort: generate a key and store it in memory only
      // This is not ideal as it will be lost on restart
      console.warn('Using temporary in-memory encryption key');
      return crypto.randomBytes(32);
    }
  }
  
  async encrypt(text) {
    if (!text) return null;
    if (!this.key) await this.initialize();
    
    try {
      // Generate a random IV
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  async decrypt(encryptedData) {
    if (!encryptedData) return null;
    if (!this.key) await this.initialize();
    
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract IV, auth tag, and encrypted data
      const iv = combined.slice(0, 16);
      const authTag = combined.slice(16, 32);
      const encrypted = combined.slice(32);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  // Hash function for non-reversible data (like transaction hashes)
  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
  
  // Generate a random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Verify a token
  verifyToken(token, hash) {
    const tokenHash = this.hash(token);
    return tokenHash === hash;
  }
  
  // Encrypt for file storage (larger data)
  async encryptFile(buffer) {
    if (!this.key) await this.initialize();
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted.toString('base64')
    };
  }
  
  // Decrypt file data
  async decryptFile(encryptedFile) {
    if (!this.key) await this.initialize();
    
    const iv = Buffer.from(encryptedFile.iv, 'base64');
    const authTag = Buffer.from(encryptedFile.authTag, 'base64');
    const encrypted = Buffer.from(encryptedFile.data, 'base64');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted;
  }
  
  // Clear the encryption key from keychain (for logout/reset)
  async clearKey() {
    try {
      await keytar.deletePassword(this.keyService, this.keyAccount);
      this.key = null;
      console.log('Encryption key cleared');
    } catch (error) {
      console.error('Failed to clear encryption key:', error);
    }
  }
  
  // Rotate the encryption key (re-encrypt all data with new key)
  async rotateKey(db, progressCallback) {
    // This is a complex operation that should be done carefully
    // It involves:
    // 1. Generate new key
    // 2. Re-encrypt all data with new key
    // 3. Update database
    // 4. Delete old key
    
    throw new Error('Key rotation not yet implemented');
  }
}

module.exports = EncryptionService;

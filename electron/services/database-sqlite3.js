import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// Helper to promisify sqlite3 methods
function promisifyDb(db) {
  db.runAsync = promisify(db.run.bind(db));
  db.getAsync = promisify(db.get.bind(db));
  db.allAsync = promisify(db.all.bind(db));
  return db;
}

class DatabaseService {
  constructor(dbPath, encryptionService) {
    this.dbPath = dbPath;
    this.encryptionService = encryptionService;
    this.db = null;
  }
  
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          promisifyDb(this.db);
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    });
  }
  
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
  
  // User operations
  async getUser(userId) {
    return await this.db.getAsync('SELECT * FROM users WHERE id = ?', userId);
  }
  
  async getUserByEmail(email) {
    return await this.db.getAsync('SELECT * FROM users WHERE email = ?', email);
  }
  
  async createUser(userData) {
    const id = crypto.randomUUID();
    await this.db.runAsync(`
      INSERT INTO users (id, email, username, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `, id, userData.email, userData.username || null);
    
    return this.getUser(id);
  }
  
  async updateUser(userId, updates) {
    const allowedFields = ['username', 'local_settings', 'cached_auth_token', 'last_sync'];
    const setClause = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (setClause.length === 0) return null;
    
    values.push(userId);
    const result = await this.db.runAsync(`
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = datetime('now')
      WHERE id = ?
    `, ...values);
    
    return result.changes > 0 ? this.getUser(userId) : null;
  }
  
  // Account operations
  async getAccounts(userId) {
    return await this.db.allAsync(`
      SELECT * FROM accounts 
      WHERE user_id = ? 
      ORDER BY is_default DESC, created_at DESC
    `, userId);
  }
  
  async getAccount(accountId, userId) {
    return await this.db.getAsync('SELECT * FROM accounts WHERE id = ? AND user_id = ?', accountId, userId);
  }
  
  async createAccount(userId, accountData) {
    const id = crypto.randomUUID();
    
    // Encrypt sensitive data
    let encryptedNumber = null;
    if (accountData.account_number_last4) {
      encryptedNumber = await this.encryptionService.encrypt(accountData.account_number_last4);
    }
    
    await this.db.runAsync(`
      INSERT INTO accounts (
        id, user_id, account_name, account_type, bank_name, 
        account_number_last4, currency, color, icon, 
        is_active, is_default, balance, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, datetime('now'), datetime('now')
      )
    `,
      id,
      userId,
      accountData.account_name,
      accountData.account_type || 'checking',
      accountData.bank_name || null,
      encryptedNumber,
      accountData.currency || 'EUR',
      accountData.color || '#3b82f6',
      accountData.icon || 'BuildingLibraryIcon',
      accountData.is_active !== false ? 1 : 0,
      accountData.is_default ? 1 : 0,
      accountData.balance || 0
    );
    
    // If this is set as default, unset other defaults
    if (accountData.is_default) {
      await this.unsetOtherDefaults(userId, id);
    }
    
    return this.getAccount(id, userId);
  }
  
  async updateAccount(accountId, userId, updates) {
    const account = await this.getAccount(accountId, userId);
    if (!account) return null;
    
    const allowedFields = [
      'account_name', 'account_type', 'bank_name', 
      'currency', 'color', 'icon', 'is_active', 'balance'
    ];
    
    const setClause = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'is_active') {
          setClause.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          setClause.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
    
    // Handle encrypted fields
    if (updates.account_number_last4) {
      const encrypted = await this.encryptionService.encrypt(updates.account_number_last4);
      setClause.push('account_number_last4 = ?');
      values.push(encrypted);
    }
    
    if (setClause.length === 0) return account;
    
    values.push(accountId, userId);
    await this.db.runAsync(`
      UPDATE accounts 
      SET ${setClause.join(', ')}, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `, ...values);
    
    return this.getAccount(accountId, userId);
  }
  
  async deleteAccount(accountId, userId) {
    const result = await this.db.runAsync('DELETE FROM accounts WHERE id = ? AND user_id = ?', accountId, userId);
    return result.changes > 0;
  }
  
  async setDefaultAccount(accountId, userId) {
    // Start transaction
    await this.db.runAsync('BEGIN TRANSACTION');
    
    try {
      // Unset all defaults for this user
      await this.db.runAsync('UPDATE accounts SET is_default = 0 WHERE user_id = ?', userId);
      
      // Set the new default
      const result = await this.db.runAsync('UPDATE accounts SET is_default = 1 WHERE id = ? AND user_id = ?', accountId, userId);
      
      await this.db.runAsync('COMMIT');
      return result.changes > 0;
    } catch (error) {
      await this.db.runAsync('ROLLBACK');
      throw error;
    }
  }
  
  async unsetOtherDefaults(userId, exceptAccountId) {
    await this.db.runAsync('UPDATE accounts SET is_default = 0 WHERE user_id = ? AND id != ?', userId, exceptAccountId);
  }
  
  // Transaction operations
  async getTransactions(userId, filters = {}) {
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];
    
    if (filters.account_id) {
      query += ' AND account_id = ?';
      params.push(filters.account_id);
    }
    
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    
    if (filters.start_date) {
      query += ' AND transaction_date >= ?';
      params.push(filters.start_date);
    }
    
    if (filters.end_date) {
      query += ' AND transaction_date <= ?';
      params.push(filters.end_date);
    }
    
    if (filters.kind) {
      query += ' AND kind = ?';
      params.push(filters.kind);
    }
    
    if (filters.search) {
      query += ' AND encrypted_data LIKE ?';
      params.push(`%${filters.search}%`);
    }
    
    // Add ordering
    query += ' ORDER BY transaction_date DESC, created_at DESC';
    
    // Add limit and offset for pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }
    
    const transactions = await this.db.allAsync(query, ...params);
    
    // Decrypt transaction data
    const decryptedTransactions = [];
    for (const transaction of transactions) {
      const decrypted = await this.decryptTransaction(transaction);
      decryptedTransactions.push(decrypted);
    }
    
    return decryptedTransactions;
  }
  
  async getTransaction(transactionId, userId) {
    const transaction = await this.db.getAsync('SELECT * FROM transactions WHERE id = ? AND user_id = ?', transactionId, userId);
    
    if (transaction) {
      return await this.decryptTransaction(transaction);
    }
    
    return null;
  }
  
  async createTransaction(userId, transactionData) {
    const id = crypto.randomUUID();
    
    // Prepare encrypted data
    const sensitiveData = {
      description: transactionData.description,
      merchant: transactionData.merchant,
      notes: transactionData.notes
    };
    
    const encryptedData = await this.encryptionService.encrypt(JSON.stringify(sensitiveData));
    
    // Calculate transaction hash for deduplication
    const hashData = `${transactionData.transaction_date}-${transactionData.amount}-${transactionData.description}`;
    const transactionHash = crypto.createHash('sha256').update(hashData).digest('hex');
    
    // Extract month and year
    const date = new Date(transactionData.transaction_date);
    const transactionMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const transactionYear = date.getFullYear();
    
    try {
      await this.db.runAsync(`
        INSERT INTO transactions (
          id, user_id, account_id, upload_id, raw_line_id,
          transaction_date, transaction_month, transaction_year,
          kind, amount, currency, category, encrypted_data,
          confidence, transaction_hash, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, datetime('now')
        )
      `,
        id,
        userId,
        transactionData.account_id,
        transactionData.upload_id || 'manual',
        transactionData.raw_line_id || null,
        transactionData.transaction_date,
        transactionMonth,
        transactionYear,
        transactionData.kind,
        transactionData.amount,
        transactionData.currency,
        transactionData.category || null,
        encryptedData,
        transactionData.confidence || null,
        transactionHash
      );
      
      return await this.getTransaction(id, userId);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Duplicate transaction detected');
      }
      throw error;
    }
  }
  
  async updateTransaction(transactionId, userId, updates) {
    const transaction = await this.getTransaction(transactionId, userId);
    if (!transaction) return null;
    
    const allowedFields = ['category', 'kind', 'amount', 'currency', 'transaction_date'];
    const setClause = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    // Handle encrypted fields
    if (updates.description || updates.merchant || updates.notes) {
      const currentData = JSON.parse(await this.encryptionService.decrypt(transaction.encrypted_data));
      const newData = {
        description: updates.description || currentData.description,
        merchant: updates.merchant || currentData.merchant,
        notes: updates.notes || currentData.notes
      };
      
      const encryptedData = await this.encryptionService.encrypt(JSON.stringify(newData));
      setClause.push('encrypted_data = ?');
      values.push(encryptedData);
    }
    
    if (setClause.length === 0) return transaction;
    
    values.push(transactionId, userId);
    await this.db.runAsync(`
      UPDATE transactions 
      SET ${setClause.join(', ')}
      WHERE id = ? AND user_id = ?
    `, ...values);
    
    return await this.getTransaction(transactionId, userId);
  }
  
  async deleteTransaction(transactionId, userId) {
    const result = await this.db.runAsync('DELETE FROM transactions WHERE id = ? AND user_id = ?', transactionId, userId);
    return result.changes > 0;
  }
  
  // Analytics operations
  async getAnalyticsSummary(userId, filters = {}) {
    const params = [userId];
    let dateFilter = '';
    
    if (filters.start_date && filters.end_date) {
      dateFilter = ' AND transaction_date BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }
    
    // Get total income
    const income = await this.db.getAsync(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions 
      WHERE user_id = ? AND kind = '+' ${dateFilter}
    `, ...params);
    
    // Get total expenses
    const expenses = await this.db.getAsync(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions 
      WHERE user_id = ? AND kind = '-' ${dateFilter}
    `, ...params);
    
    // Get transaction count
    const transactionCount = await this.db.getAsync(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE user_id = ? ${dateFilter}
    `, ...params);
    
    // Get unique categories count
    const categoriesCount = await this.db.getAsync(`
      SELECT COUNT(DISTINCT category) as count
      FROM transactions 
      WHERE user_id = ? AND category IS NOT NULL ${dateFilter}
    `, ...params);
    
    return {
      total_income: income.total,
      total_expenses: expenses.total,
      net_balance: income.total - expenses.total,
      transaction_count: transactionCount.count,
      categories_count: categoriesCount.count,
      period: filters.start_date && filters.end_date ? {
        start: filters.start_date,
        end: filters.end_date
      } : null
    };
  }
  
  async getCategoryBreakdown(userId, filters = {}) {
    const params = [userId];
    let dateFilter = '';
    
    if (filters.start_date && filters.end_date) {
      dateFilter = ' AND transaction_date BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }
    
    return await this.db.allAsync(`
      SELECT 
        category,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN kind = '-' THEN amount ELSE 0 END) as total_spent,
        SUM(CASE WHEN kind = '+' THEN amount ELSE 0 END) as total_earned
      FROM transactions
      WHERE user_id = ? ${dateFilter}
      GROUP BY category
      ORDER BY total_spent DESC
    `, ...params);
  }
  
  async getTopMerchants(userId, filters = {}) {
    const limit = filters.limit || 10;
    
    // Note: This requires decrypting merchant data, which is expensive
    // In production, consider caching merchant data separately
    const transactions = await this.getTransactions(userId, filters);
    
    const merchantMap = new Map();
    
    for (const transaction of transactions) {
      const merchant = transaction.merchant || 'Unknown';
      const current = merchantMap.get(merchant) || { 
        merchant, 
        transaction_count: 0, 
        total_amount: 0 
      };
      
      current.transaction_count++;
      current.total_amount += Math.abs(transaction.amount);
      
      merchantMap.set(merchant, current);
    }
    
    const merchants = Array.from(merchantMap.values());
    merchants.sort((a, b) => b.total_amount - a.total_amount);
    
    return merchants.slice(0, limit);
  }
  
  async getSpendingTrends(userId, filters = {}) {
    const params = [userId];
    let dateFilter = '';
    
    if (filters.start_date && filters.end_date) {
      dateFilter = ' AND transaction_date BETWEEN ? AND ?';
      params.push(filters.start_date, filters.end_date);
    }
    
    const trends = await this.db.allAsync(`
      SELECT 
        transaction_month,
        SUM(CASE WHEN kind = '-' THEN amount ELSE 0 END) as total_spent,
        SUM(CASE WHEN kind = '+' THEN amount ELSE 0 END) as total_earned,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = ? ${dateFilter}
      GROUP BY transaction_month
      ORDER BY transaction_month DESC
      LIMIT 12
    `, ...params);
    
    trends.reverse(); // Show oldest to newest
    
    return trends;
  }
  
  // Upload operations
  async createUpload(userId, uploadData) {
    const id = crypto.randomUUID();
    
    await this.db.runAsync(`
      INSERT INTO uploads (
        id, user_id, account_id, filename, file_size,
        total_lines, processed_lines, successful_lines,
        failed_lines, status, error_message, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, datetime('now'), datetime('now')
      )
    `,
      id,
      userId,
      uploadData.account_id,
      uploadData.filename,
      uploadData.file_size || 0,
      uploadData.total_lines || 0,
      uploadData.processed_lines || 0,
      uploadData.successful_lines || 0,
      uploadData.failed_lines || 0,
      uploadData.status || 'pending',
      uploadData.error_message || null
    );
    
    return this.getUpload(id, userId);
  }
  
  async getUpload(uploadId, userId) {
    return await this.db.getAsync('SELECT * FROM uploads WHERE id = ? AND user_id = ?', uploadId, userId);
  }
  
  async getUploads(userId) {
    return await this.db.allAsync(`
      SELECT * FROM uploads 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, userId);
  }
  
  async updateUpload(uploadId, userId, updates) {
    const allowedFields = [
      'processed_lines', 'successful_lines', 'failed_lines',
      'status', 'error_message'
    ];
    
    const setClause = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (setClause.length === 0) return null;
    
    values.push(uploadId, userId);
    const result = await this.db.runAsync(`
      UPDATE uploads 
      SET ${setClause.join(', ')}, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `, ...values);
    
    return result.changes > 0 ? this.getUpload(uploadId, userId) : null;
  }
  
  async deleteUpload(uploadId, userId) {
    // Delete associated transactions first
    await this.db.runAsync('DELETE FROM transactions WHERE upload_id = ? AND user_id = ?', uploadId, userId);
    
    // Delete the upload record
    const result = await this.db.runAsync('DELETE FROM uploads WHERE id = ? AND user_id = ?', uploadId, userId);
    return result.changes > 0;
  }
  
  // Helper methods
  async decryptTransaction(transaction) {
    if (!transaction.encrypted_data) return transaction;
    
    try {
      const decryptedData = await this.encryptionService.decrypt(transaction.encrypted_data);
      const parsedData = JSON.parse(decryptedData);
      
      return {
        ...transaction,
        description: parsedData.description,
        merchant: parsedData.merchant,
        notes: parsedData.notes
      };
    } catch (error) {
      console.error('Failed to decrypt transaction:', error);
      return {
        ...transaction,
        description: '[Decryption Error]',
        merchant: '[Decryption Error]',
        notes: null
      };
    }
  }
  
  // Merchant cache operations
  async getMerchantCategory(merchant) {
    const result = await this.db.getAsync('SELECT category FROM merchant_cache WHERE merchant = ?', merchant);
    return result ? result.category : null;
  }
  
  async setMerchantCategory(merchant, category) {
    await this.db.runAsync(`
      INSERT OR REPLACE INTO merchant_cache (merchant, category, updated_at)
      VALUES (?, ?, datetime('now'))
    `, merchant, category);
  }
  
  // Migration runner
  async runMigrations(migrationRunner) {
    // Pass the promisified db to the migration runner
    return migrationRunner.runMigrations(this.db);
  }
}

export default DatabaseService;

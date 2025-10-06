import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { BrowserWindow } from 'electron';
import { getCurrentUserId } from './auth.js';

export function setupUploadHandlers(ipcMain, databaseService) {
  // Process a CSV file
  ipcMain.handle('uploads:process', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { filePath, accountId } = data;
      
      if (!filePath) {
        throw new Error('File path is required');
      }
      
      if (!accountId) {
        throw new Error('Account ID is required');
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }
      
      // Get file stats
      const stats = fs.statSync(filePath);
      const filename = path.basename(filePath);
      
      // Create upload record
      const upload = await databaseService.createUpload(userId, {
        account_id: accountId,
        filename: filename,
        file_size: stats.size,
        status: 'processing'
      });
      
      // Process CSV in background
      processCSVFile(filePath, upload.id, userId, accountId, databaseService);
      
      return { success: true, data: upload };
    } catch (error) {
      console.error('Error processing upload:', error);
      return { success: false, error: error.message };
    }
  });
  
  // List all uploads
  ipcMain.handle('uploads:list', async (event) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const uploads = await databaseService.getUploads(userId);
      return { success: true, data: uploads };
    } catch (error) {
      console.error('Error listing uploads:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get a specific upload
  ipcMain.handle('uploads:get', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Upload ID is required');
      }
      
      const upload = await databaseService.getUpload(data.id, userId);
      if (!upload) {
        throw new Error('Upload not found');
      }
      
      return { success: true, data: upload };
    } catch (error) {
      console.error('Error getting upload:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Delete an upload and its transactions
  ipcMain.handle('uploads:delete', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Upload ID is required');
      }
      
      const deleted = await databaseService.deleteUpload(data.id, userId);
      
      if (!deleted) {
        throw new Error('Upload not found or deletion failed');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting upload:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get upload progress
  ipcMain.handle('uploads:getProgress', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Upload ID is required');
      }
      
      const upload = await databaseService.getUpload(data.id, userId);
      if (!upload) {
        throw new Error('Upload not found');
      }
      
      const progress = upload.total_lines > 0 
        ? (upload.processed_lines / upload.total_lines) * 100 
        : 0;
      
      return {
        success: true,
        data: {
          uploadId: upload.id,
          status: upload.status,
          progress: Math.round(progress),
          processed: upload.processed_lines,
          total: upload.total_lines,
          successful: upload.successful_lines,
          failed: upload.failed_lines,
          error: upload.error_message
        }
      };
    } catch (error) {
      console.error('Error getting upload progress:', error);
      return { success: false, error: error.message };
    }
  });
}

// Process CSV file in background
async function processCSVFile(filePath, uploadId, userId, accountId, databaseService) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  let totalLines = 0;
  let processedLines = 0;
  let successfulLines = 0;
  let failedLines = 0;
  const transactions = [];
  
  try {
    // First pass: count total lines
    const lineCounter = fs.createReadStream(filePath)
      .on('data', (chunk) => {
        for (let i = 0; i < chunk.length; i++) {
          if (chunk[i] === 10) totalLines++; // Count newlines
        }
      });
    
    await new Promise((resolve, reject) => {
      lineCounter.on('end', resolve);
      lineCounter.on('error', reject);
    });
    
    // Subtract header line
    totalLines = Math.max(0, totalLines - 1);
    
    // Update total lines
    await databaseService.updateUpload(uploadId, userId, { total_lines: totalLines });
    
    // Second pass: parse CSV
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', async (row) => {
        processedLines++;
        
        try {
          // Parse transaction from CSV row
          const transaction = parseCSVRow(row, accountId, uploadId);
          
          if (transaction) {
            // Create transaction in database
            await databaseService.createTransaction(userId, transaction);
            successfulLines++;
          } else {
            failedLines++;
          }
        } catch (error) {
          console.error('Error processing row:', error);
          failedLines++;
        }
        
        // Send progress update
        if (processedLines % 10 === 0 || processedLines === totalLines) {
          const progress = Math.round((processedLines / totalLines) * 100);
          
          mainWindow?.webContents.send('processing:progress', {
            uploadId,
            progress,
            processed: processedLines,
            total: totalLines,
            successful: successfulLines,
            failed: failedLines
          });
          
          // Update database
          await databaseService.updateUpload(uploadId, userId, {
            processed_lines: processedLines,
            successful_lines: successfulLines,
            failed_lines: failedLines
          });
        }
      });
    
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    
    // Mark upload as completed
    await databaseService.updateUpload(uploadId, userId, {
      status: 'completed',
      processed_lines: processedLines,
      successful_lines: successfulLines,
      failed_lines: failedLines
    });
    
    // Send completion event
    mainWindow?.webContents.send('processing:complete', {
      uploadId,
      processed: processedLines,
      successful: successfulLines,
      failed: failedLines
    });
    
  } catch (error) {
    console.error('CSV processing error:', error);
    
    // Mark upload as failed
    await databaseService.updateUpload(uploadId, userId, {
      status: 'failed',
      error_message: error.message
    });
    
    // Send error event
    mainWindow?.webContents.send('processing:error', {
      uploadId,
      error: error.message
    });
  }
}

// Parse a CSV row into a transaction object
function parseCSVRow(row, accountId, uploadId) {
  // This is a simplified parser - adjust based on your CSV format
  // Common bank CSV formats have various column names
  
  // Try to detect date
  const dateValue = row.Date || row['Transaction Date'] || row['Posted Date'] || row['Value Date'];
  if (!dateValue) return null;
  
  // Parse date (handle various formats)
  const transactionDate = parseDate(dateValue);
  if (!transactionDate) return null;
  
  // Try to detect amount
  let amount = parseAmount(
    row.Amount || row.Debit || row.Credit || row['Transaction Amount'] || row.Value
  );
  if (!amount) return null;
  
  // Determine transaction type (income vs expense)
  let kind = '-'; // Default to expense
  if (row.Credit && !row.Debit) {
    kind = '+';
  } else if (row.Type) {
    kind = row.Type.toLowerCase().includes('credit') ? '+' : '-';
  } else if (amount > 0 && (row.Debit || row.Amount)) {
    // Some banks use positive for both, with separate columns
    kind = row.Credit ? '+' : '-';
  }
  
  // Get description
  const description = row.Description || row.Memo || row.Details || row.Narrative || '';
  
  // Try to extract merchant from description
  const merchant = extractMerchant(description);
  
  // Get currency
  const currency = row.Currency || 'EUR';
  
  return {
    account_id: accountId,
    upload_id: uploadId,
    transaction_date: transactionDate,
    kind: kind,
    amount: Math.abs(amount),
    currency: currency,
    description: description,
    merchant: merchant,
    category: null, // Will be categorized later
    notes: row.Notes || row.Reference || null
  };
}

// Parse various date formats
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try ISO format first (YYYY-MM-DD)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  // Try common formats
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
    /(\d{1,2})\/(\d{1,2})\/(\d{2})/, // M/D/YY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      // Adjust based on format
      if (format.source.startsWith('(\\d{4})')) {
        // YYYY/MM/DD format
        date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
      } else if (match[3].length === 2) {
        // YY format - assume 20YY
        date = new Date(`20${match[3]}-${match[2]}-${match[1]}`);
      } else {
        // DD/MM/YYYY format
        date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  return null;
}

// Parse amount from various formats
function parseAmount(amountStr) {
  if (!amountStr) return null;
  
  // Convert to string if number
  const str = String(amountStr);
  
  // Remove currency symbols and spaces
  let cleaned = str.replace(/[€$£¥₹\s]/g, '');
  
  // Handle different decimal separators
  // If both . and , exist, assume , is thousands separator
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    // Check if comma is decimal separator (European format)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal separator
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  // Remove any remaining non-numeric characters except . and -
  cleaned = cleaned.replace(/[^0-9.-]/g, '');
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

// Extract merchant name from description
function extractMerchant(description) {
  if (!description) return null;
  
  // Common patterns for merchant extraction
  // This is simplified - in production, use more sophisticated NLP
  
  // Remove common bank prefixes
  let merchant = description
    .replace(/^(POS|ATM|DEBIT|CREDIT|TRANSFER|PAYMENT|PURCHASE)\s+/i, '')
    .replace(/\s+\d{4}$/, '') // Remove trailing 4 digits (often last 4 of card)
    .replace(/\s+\d{2}\/\d{2}\/\d{2,4}/, '') // Remove dates
    .trim();
  
  // Take first part before common separators
  const separators = [' - ', ' / ', ' * ', '  '];
  for (const sep of separators) {
    if (merchant.includes(sep)) {
      merchant = merchant.split(sep)[0];
    }
  }
  
  // Clean up
  merchant = merchant
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/[*#]/g, '') // Remove special chars
    .trim();
  
  // Title case
  merchant = merchant.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return merchant || 'Unknown';
}


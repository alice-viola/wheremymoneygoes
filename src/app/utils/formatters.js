import { format, parseISO } from 'date-fns'
import currency from 'currency.js'

// Date formatting
export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  if (!date) return ''
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr)
  } catch (error) {
    console.error('Date formatting error:', error)
    return date
  }
}

export const formatMonth = (date) => {
  return formatDate(date, 'MMMM yyyy')
}

export const formatShortDate = (date) => {
  return formatDate(date, 'MMM d')
}

export const formatTime = (date) => {
  return formatDate(date, 'HH:mm')
}

// Currency formatting
export const formatCurrency = (amount, currencyCode = 'EUR') => {
  if (amount === null || amount === undefined) return '€0.00'
  
  const symbols = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    CHF: 'CHF'
  }
  
  const symbol = symbols[currencyCode] || currencyCode
  const formatted = currency(amount, {
    symbol,
    decimal: '.',
    separator: ',',
    precision: 2
  }).format()
  
  return formatted
}

export const formatAmount = (amount, showSign = false) => {
  if (amount === null || amount === undefined) return '0.00'
  
  const absAmount = Math.abs(amount)
  const formatted = currency(absAmount, {
    symbol: '',
    decimal: '.',
    separator: ',',
    precision: 2
  }).format()
  
  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`
  }
  
  return formatted
}

// Percentage formatting
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%'
  return `${Number(value).toFixed(decimals)}%`
}

// Number formatting
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '0'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

// File size formatting
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Status formatting
export const formatUploadStatus = (status) => {
  const statusMap = {
    pending: 'Pending',
    uploading: 'Uploading',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    partial: 'Partially Completed'
  }
  return statusMap[status] || status
}

// Transaction type formatting
export const formatTransactionType = (kind) => {
  return kind === '+' ? 'Income' : 'Expense'
}

// Confidence formatting
export const formatConfidence = (confidence) => {
  if (!confidence) return 'Low'
  if (confidence >= 0.9) return 'High'
  if (confidence >= 0.7) return 'Medium'
  return 'Low'
}

// Category color
export const getCategoryColor = (category) => {
  const colors = {
    'Food & Dining': 'orange',
    'Shopping': 'purple',
    'Transportation': 'blue',
    'Utilities': 'gray',
    'Entertainment': 'pink',
    'Health & Wellness': 'green',
    'Travel': 'indigo',
    'Housing': 'yellow',
    'Financial': 'amber',
    'Education': 'teal',
    'Personal Care': 'rose',
    'Cash & ATM': 'slate',
    'Income': 'emerald',
    'Other': 'neutral'
  }
  return colors[category] || 'gray'
}

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

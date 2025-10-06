// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

// Test Users (real UUIDs)
export const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001'
export const TEST_USER_ID_2 = '550e8400-e29b-41d4-a716-446655440002'

// Categories
export const CATEGORIES = [
  { value: 'Food & Dining', label: 'Food & Dining', color: 'orange', icon: '🍽️' },
  { value: 'Shopping', label: 'Shopping', color: 'purple', icon: '🛍️' },
  { value: 'Transportation', label: 'Transportation', color: 'blue', icon: '🚗' },
  { value: 'Utilities', label: 'Utilities', color: 'gray', icon: '⚡' },
  { value: 'Entertainment', label: 'Entertainment', color: 'pink', icon: '🎬' },
  { value: 'Health & Wellness', label: 'Health & Wellness', color: 'green', icon: '🏥' },
  { value: 'Travel', label: 'Travel', color: 'indigo', icon: '✈️' },
  { value: 'Housing', label: 'Housing', color: 'amber', icon: '🏠' },
  { value: 'Financial', label: 'Financial', color: 'yellow', icon: '💰' },
  { value: 'Education', label: 'Education', color: 'teal', icon: '📚' },
  { value: 'Personal Care', label: 'Personal Care', color: 'rose', icon: '💅' },
  { value: 'Insurance', label: 'Insurance', color: 'cyan', icon: '🛡️' },
  { value: 'Pets', label: 'Pets', color: 'lime', icon: '🐾' },
  { value: 'Subscriptions & Memberships', label: 'Subscriptions', color: 'violet', icon: '📱' },
  { value: 'Gifts & Donations', label: 'Gifts & Donations', color: 'fuchsia', icon: '🎁' },
  { value: 'Government & Taxes', label: 'Gov & Taxes', color: 'red', icon: '🏛️' },
  { value: 'Children & Family', label: 'Children & Family', color: 'sky', icon: '👨‍👩‍👧‍👦' },
  { value: 'Business & Professional', label: 'Business', color: 'stone', icon: '💼' },
  { value: 'Cash & ATM', label: 'Cash & ATM', color: 'slate', icon: '💵' },
  { value: 'Income', label: 'Income', color: 'emerald', icon: '💸' },
  { value: 'Balance', label: 'Balance', color: 'zinc', icon: '⚖️' },
  { value: 'Other', label: 'Other', color: 'neutral', icon: '📦' }
]

// Chart Colors
export const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
  indigo: '#6366f1'
}

// Date Formats
export const DATE_FORMAT = 'yyyy-MM-dd'
export const DATE_DISPLAY_FORMAT = 'MMM d, yyyy'
export const MONTH_FORMAT = 'yyyy-MM'
export const MONTH_DISPLAY_FORMAT = 'MMMM yyyy'

// Pagination
export const DEFAULT_PAGE_SIZE = 50
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

// File Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = ['text/csv', 'application/csv', '.csv']

// Transaction Types
export const TRANSACTION_TYPES = {
  INCOME: '+',
  EXPENSE: '-'
}

// Upload Status
export const UPLOAD_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial'
}

// WebSocket Events
export const WS_EVENTS = {
  CONNECTED: 'connected',
  UPLOAD_STARTED: 'upload:started',
  LINES_STORED: 'lines:stored',
  SEPARATOR_DETECTED: 'separator:detected',
  MAPPING_DETECTED: 'mapping:detected',
  UPLOAD_PROGRESS: 'upload:progress',
  CATEGORIZE_PROGRESS: 'categorize:progress',
  UPLOAD_COMPLETED: 'upload:completed',
  UPLOAD_FAILED: 'upload:failed'
}

// Helper function to get category color
export const getCategoryColor = (categoryName) => {
  const category = CATEGORIES.find(c => c.value === categoryName)
  const colorMap = {
    'orange': '#fb923c',
    'purple': '#a855f7',
    'blue': '#3b82f6',
    'gray': '#6b7280',
    'pink': '#ec4899',
    'green': '#22c55e',
    'indigo': '#6366f1',
    'amber': '#f59e0b',
    'yellow': '#eab308',
    'teal': '#14b8a6',
    'rose': '#f43f5e',
    'cyan': '#06b6d4',
    'lime': '#84cc16',
    'violet': '#8b5cf6',
    'fuchsia': '#d946ef',
    'red': '#ef4444',
    'sky': '#0ea5e9',
    'stone': '#78716c',
    'slate': '#64748b',
    'emerald': '#10b981',
    'zinc': '#71717a',
    'neutral': '#737373'
  }
  return colorMap[category?.color] || '#6b7280'
}

// Helper function to get category icon component
export const getCategoryIcon = (categoryName) => {
  // Import icons dynamically
  const iconMap = {
    'Food & Dining': 'CakeIcon',
    'Shopping': 'ShoppingBagIcon',
    'Transportation': 'TruckIcon',
    'Utilities': 'BoltIcon',
    'Entertainment': 'FilmIcon',
    'Health & Wellness': 'HeartIcon',
    'Travel': 'GlobeAltIcon',
    'Housing': 'HomeIcon',
    'Financial': 'BanknotesIcon',
    'Education': 'AcademicCapIcon',
    'Personal Care': 'SparklesIcon',
    'Insurance': 'ShieldCheckIcon',
    'Pets': 'HeartIcon',
    'Subscriptions & Memberships': 'CreditCardIcon',
    'Gifts & Donations': 'GiftIcon',
    'Government & Taxes': 'BuildingLibraryIcon',
    'Children & Family': 'UsersIcon',
    'Business & Professional': 'BriefcaseIcon',
    'Cash & ATM': 'BanknotesIcon',
    'Income': 'ArrowDownIcon',
    'Balance': 'ScaleIcon',
    'Other': 'SquaresPlusIcon'
  }
  
  // Return the icon name, the component will handle the import
  return iconMap[categoryName] || 'SquaresPlusIcon'
}

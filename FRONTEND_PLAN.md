# WhereMyMoneyGoes Frontend Plan

## 🎨 Technology Stack

### Core Technologies
- **Framework**: Vue 3 (Composition API)
- **UI Library**: [Nuxt UI v3](https://ui.nuxt.com/) - Beautiful, accessible components
- **Charts**: Chart.js with vue-chartjs - Interactive, responsive charts
- **State Management**: Pinia - Modern Vue store
- **Router**: Vue Router 4
- **HTTP Client**: Axios with interceptors
- **WebSocket**: Native WebSocket API
- **Date Handling**: date-fns - Lightweight date utilities
- **Styling**: Tailwind CSS (included with Nuxt UI)
- **Icons**: @nuxt/icon (200,000+ icons)
- **Build Tool**: Vite

### Additional Libraries
- **File Upload**: vue-filepond - Beautiful file upload
- **Notifications**: Vue Toastification - Toast notifications
- **Tables**: @tanstack/vue-table - Advanced data tables
- **Form Validation**: VeeValidate with Yup
- **Currency Formatting**: currency.js
- **CSV Export**: papaparse

---

## 🏗️ Application Architecture

```
src/app/
├── assets/
│   ├── css/
│   │   └── main.css          # Global styles, Tailwind imports
│   └── images/
├── components/
│   ├── common/
│   │   ├── AppHeader.vue
│   │   ├── AppFooter.vue
│   │   ├── AppSidebar.vue
│   │   ├── UserMenu.vue
│   │   └── NotificationBell.vue
│   ├── upload/
│   │   ├── FileUploader.vue
│   │   ├── UploadProgress.vue
│   │   ├── UploadHistory.vue
│   │   └── ProcessingStatus.vue
│   ├── transactions/
│   │   ├── TransactionTable.vue
│   │   ├── TransactionRow.vue
│   │   ├── TransactionDetail.vue
│   │   ├── TransactionFilters.vue
│   │   ├── TransactionEdit.vue
│   │   └── QuickCategorize.vue
│   ├── analytics/
│   │   ├── SummaryCards.vue
│   │   ├── SpendingChart.vue
│   │   ├── CategoryPieChart.vue
│   │   ├── TrendLineChart.vue
│   │   ├── MerchantList.vue
│   │   ├── MonthlyBreakdown.vue
│   │   └── BudgetProgress.vue
│   └── shared/
│       ├── LoadingSpinner.vue
│       ├── EmptyState.vue
│       ├── ErrorBoundary.vue
│       ├── DateRangePicker.vue
│       ├── CurrencyInput.vue
│       └── ConfirmDialog.vue
├── composables/
│   ├── useApi.js              # API client wrapper
│   ├── useWebSocket.js        # WebSocket connection
│   ├── useAuth.js             # Authentication (future)
│   ├── useNotifications.js    # Toast notifications
│   ├── useCurrency.js         # Currency formatting
│   ├── useChartTheme.js       # Chart.js theming
│   └── useFilters.js          # Transaction filters
├── layouts/
│   ├── default.vue            # Main app layout
│   ├── auth.vue               # Auth pages layout
│   └── minimal.vue            # Minimal layout
├── pages/
│   ├── index.vue              # Dashboard/Home
│   ├── upload.vue             # Upload CSV
│   ├── transactions/
│   │   ├── index.vue          # Transaction list
│   │   └── [id].vue           # Transaction detail
│   ├── analytics/
│   │   ├── index.vue          # Analytics overview
│   │   ├── categories.vue    # Category breakdown
│   │   ├── merchants.vue     # Merchant analysis
│   │   └── trends.vue        # Spending trends
│   ├── settings/
│   │   ├── index.vue          # Settings page
│   │   ├── profile.vue       # User profile
│   │   └── preferences.vue   # App preferences
│   └── auth/
│       ├── login.vue          # Login (future)
│       └── register.vue      # Register (future)
├── plugins/
│   ├── api.client.js          # Axios setup
│   ├── websocket.client.js    # WebSocket setup
│   └── charts.client.js       # Chart.js setup
├── services/
│   ├── api/
│   │   ├── uploads.js         # Upload API calls
│   │   ├── transactions.js    # Transaction API
│   │   ├── analytics.js       # Analytics API
│   │   └── users.js           # User API (future)
│   └── websocket.js           # WebSocket service
├── stores/
│   ├── app.js                 # Global app state
│   ├── user.js                # User state
│   ├── uploads.js             # Upload state
│   ├── transactions.js        # Transaction state
│   └── analytics.js           # Analytics cache
├── utils/
│   ├── constants.js           # App constants
│   ├── formatters.js          # Data formatters
│   ├── validators.js          # Validation helpers
│   └── chartConfig.js         # Chart configurations
├── App.vue                     # Root component
├── main.js                     # App entry point
├── router.js                   # Route definitions
└── app.config.js              # Nuxt UI config

```

---

## 📱 User Interface Flow

### 1. Landing/Dashboard Page
**Route**: `/`

**Components**:
- Summary cards (Total spent, Income, Balance, This month)
- Recent transactions table (last 10)
- Spending by category donut chart
- Monthly trend line chart
- Quick upload button
- Recent uploads status

**Features**:
- Real-time updates via WebSocket
- Click on charts to drill down
- Export dashboard as PDF

### 2. Upload Flow
**Route**: `/upload`

**Steps**:
1. **File Selection**
   - Drag & drop zone
   - Browse button
   - File preview with metadata
   - Multiple file queue

2. **Processing Progress**
   - WebSocket connection established
   - Real-time progress bars:
     - File upload
     - Separator detection
     - Field mapping
     - Row processing
     - AI categorization
   - Live log of processing steps
   - Error handling with retry

3. **Completion**
   - Summary statistics
   - Preview of categorized transactions
   - Option to review/edit
   - Navigate to transactions

**Components**:
- `FileUploader.vue` - Filepond integration
- `UploadProgress.vue` - Multi-step progress
- `ProcessingStatus.vue` - Live WebSocket updates

### 3. Transactions Page
**Route**: `/transactions`

**Features**:
- Advanced data table with:
  - Sorting by all columns
  - Multi-column filtering
  - Pagination (25/50/100 per page)
  - Column visibility toggle
  - Sticky header
- Bulk actions:
  - Select all/none
  - Bulk categorize
  - Bulk delete
  - Export selected
- Quick actions per row:
  - Edit category
  - View details
  - Delete
- Search across descriptions
- Date range picker
- Category filter chips

**Components**:
- `TransactionTable.vue` - TanStack table
- `TransactionFilters.vue` - Filter controls
- `QuickCategorize.vue` - Inline editing

### 4. Transaction Detail
**Route**: `/transactions/:id`

**Sections**:
- Transaction information card
- Original CSV data
- AI categorization details with confidence
- Edit form for corrections
- Related transactions (same merchant)
- Delete with confirmation

### 5. Analytics Pages

#### 5.1 Overview
**Route**: `/analytics`

**Charts**:
- Monthly spending bar chart
- Category distribution pie chart
- Income vs Expenses line chart
- Top 5 merchants bar chart

#### 5.2 Categories
**Route**: `/analytics/categories`

**Features**:
- Hierarchical category tree
- Spending by category over time
- Subcategory breakdown
- Category trends
- Budget vs Actual (future)

#### 5.3 Merchants
**Route**: `/analytics/merchants`

**Features**:
- Top merchants table
- Merchant spending timeline
- Visit frequency
- Average transaction amount
- Merchant type distribution

#### 5.4 Trends
**Route**: `/analytics/trends`

**Features**:
- Custom date range selection
- Multiple metric overlay
- Predictive trends (future)
- Seasonal analysis
- Year-over-year comparison

---

## 🎯 Key Features Implementation

### 1. Real-time Updates
```javascript
// composables/useWebSocket.js
export function useWebSocket() {
  const ws = ref(null)
  const messages = ref([])
  const uploadProgress = ref({})
  
  const connect = (userId) => {
    ws.value = new WebSocket(`ws://localhost:3000/ws?userId=${userId}`)
    
    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleMessage(data)
    }
  }
  
  const handleMessage = (data) => {
    switch(data.type) {
      case 'upload:progress':
        uploadProgress.value = data.data
        break
      // ... other cases
    }
  }
  
  return { connect, messages, uploadProgress }
}
```

### 2. Responsive Charts
```javascript
// components/analytics/SpendingChart.vue
<template>
  <UCard>
    <template #header>
      <h3>Monthly Spending</h3>
    </template>
    <Line :data="chartData" :options="chartOptions" />
  </UCard>
</template>

<script setup>
import { Line } from 'vue-chartjs'
import { useChartTheme } from '@/composables/useChartTheme'

const { chartOptions } = useChartTheme()
// ... chart configuration
</script>
```

### 3. Smart Filtering
```javascript
// composables/useFilters.js
export function useFilters() {
  const filters = reactive({
    dateRange: { start: null, end: null },
    categories: [],
    search: '',
    amountRange: { min: null, max: null }
  })
  
  const filteredTransactions = computed(() => {
    return transactions.value.filter(tx => {
      // Apply all filters
    })
  })
  
  return { filters, filteredTransactions }
}
```

---

## 🎨 UI/UX Design Principles

### Visual Design
- **Color Scheme**: 
  - Primary: Blue (trust, stability)
  - Success: Green (income, positive)
  - Error: Red (expenses, negative)
  - Neutral: Gray (UI elements)
- **Typography**: 
  - Headers: Inter/Public Sans
  - Body: System fonts
  - Monospace: For amounts
- **Spacing**: 
  - Consistent 8px grid
  - Card padding: 24px
  - Component gaps: 16px

### Interaction Patterns
- **Loading States**: Skeleton screens for better perceived performance
- **Empty States**: Helpful illustrations with action buttons
- **Error Handling**: Inline validation, toast notifications
- **Confirmations**: Modal dialogs for destructive actions
- **Shortcuts**: Keyboard navigation (Cmd+K for search)

### Responsive Design
- **Mobile First**: All components mobile-optimized
- **Breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Touch Gestures**: Swipe to delete, pull to refresh

### Accessibility
- **ARIA Labels**: All interactive elements
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML
- **Color Contrast**: WCAG AA compliant
- **Focus Indicators**: Visible focus states

---

## 📊 Chart Configurations

### 1. Spending Trend (Line Chart)
- X-axis: Time (days/months)
- Y-axis: Amount
- Multiple lines: Income vs Expenses
- Interactive tooltips
- Zoom and pan

### 2. Category Distribution (Doughnut Chart)
- Segments: Categories
- Values: Percentages
- Click to drill down
- Legend with amounts

### 3. Monthly Comparison (Bar Chart)
- Grouped bars: Categories
- Stacked option
- Year-over-year overlay
- Export as image

### 4. Merchant Frequency (Horizontal Bar)
- Top 10 merchants
- Visit count and total spent
- Click for merchant details

---

## 🔄 State Management

### Pinia Stores

#### App Store
```javascript
// stores/app.js
export const useAppStore = defineStore('app', {
  state: () => ({
    isLoading: false,
    notifications: [],
    theme: 'light',
    sidebarOpen: true
  }),
  actions: {
    showNotification(notification) {
      this.notifications.push(notification)
    }
  }
})
```

#### Transaction Store
```javascript
// stores/transactions.js
export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [],
    filters: {},
    pagination: { page: 1, limit: 50 }
  }),
  getters: {
    filteredTransactions: (state) => {
      // Apply filters
    },
    totalSpent: (state) => {
      // Calculate total
    }
  },
  actions: {
    async fetchTransactions() {
      // API call
    },
    updateTransaction(id, data) {
      // Update transaction
    }
  }
})
```

---

## 🚀 Performance Optimizations

### Code Splitting
- Lazy load routes
- Dynamic imports for heavy components
- Separate vendor chunks

### Caching Strategy
- API response caching with Axios interceptors
- LocalStorage for user preferences
- IndexedDB for large datasets

### Optimization Techniques
- Virtual scrolling for large tables
- Debounced search inputs
- Memoized computed properties
- Image lazy loading
- WebP format for images

---

## 📱 Progressive Web App

### Features
- Offline support with service workers
- Install prompt
- Push notifications (future)
- Background sync

### Manifest
```json
{
  "name": "WhereMyMoneyGoes",
  "short_name": "WMMG",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "display": "standalone",
  "icons": [...]
}
```

---

## 🔐 Security Considerations

### Frontend Security
- Content Security Policy headers
- XSS protection
- CSRF tokens (when auth implemented)
- Sanitize user inputs
- Secure WebSocket connections (WSS in production)

### Data Privacy
- No sensitive data in localStorage
- Clear session on logout
- Mask sensitive information
- Audit logs for actions

---

## 📦 Build & Deployment

### Development
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Environment Variables
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_NAME=WhereMyMoneyGoes
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "preview"]
```

---

## 🎯 Implementation Priority

### Phase 1: Core Features (Week 1)
1. ✅ Project setup with Vue 3 + Nuxt UI
2. ✅ Basic routing and layouts
3. ✅ File upload with progress
4. ✅ Transaction list with filters
5. ✅ Basic analytics charts

### Phase 2: Enhanced Features (Week 2)
1. ⏳ WebSocket integration
2. ⏳ Advanced filtering
3. ⏳ Transaction editing
4. ⏳ Export functionality
5. ⏳ Mobile responsiveness

### Phase 3: Polish (Week 3)
1. ⏳ Performance optimizations
2. ⏳ Error handling
3. ⏳ Loading states
4. ⏳ Accessibility
5. ⏳ PWA features

### Phase 4: Future Features
1. 🔮 Authentication
2. 🔮 Budget tracking
3. 🔮 Bill reminders
4. 🔮 Financial goals
5. 🔮 Multi-currency support

---

## 🧪 Testing Strategy

### Unit Tests
- Components with Vitest
- Store actions and getters
- Utility functions

### E2E Tests
- Critical user flows with Cypress
- Upload and categorization
- Transaction management

### Visual Regression
- Storybook for component library
- Percy for visual testing

---

## 📚 Documentation

### Component Documentation
- Props, events, slots
- Usage examples
- Storybook stories

### User Guide
- Video tutorials
- Interactive onboarding
- Help tooltips

---

## 🎉 Success Metrics

### Performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Lighthouse score > 90

### User Experience
- Task completion rate > 95%
- Error rate < 1%
- User satisfaction > 4.5/5

### Business
- Daily active users
- Files processed
- Categorization accuracy

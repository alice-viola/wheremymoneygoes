# WhereMyMoneyGoes Frontend

A modern Vue 3 financial tracking application with real-time CSV processing and AI-powered categorization.

## 🚀 Quick Start

```bash
# Navigate to frontend directory
cd src/app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:3001`

## 🏗️ Architecture

### Technology Stack
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Fast build tool
- **Pinia** - State management
- **Vue Router 4** - Client-side routing
- **Tailwind CSS** - Utility-first CSS
- **Chart.js** - Interactive charts
- **Axios** - HTTP client
- **WebSockets** - Real-time updates

### Project Structure
```
src/app/
├── assets/          # Static assets
├── components/      # Reusable components
│   ├── analytics/   # Chart components
│   ├── common/      # Layout components
│   ├── transactions/# Transaction components
│   └── upload/      # Upload flow components
├── pages/           # Route pages
├── services/        # API services
├── stores/          # Pinia stores
├── utils/           # Helper functions
└── main.js          # App entry point
```

## 🎨 Features

### 1. Dashboard
- Financial overview with key metrics
- Recent transactions list
- Spending by category chart
- Monthly trend visualization
- Top merchants list

### 2. CSV Upload
- Drag & drop file upload
- Real-time processing progress
- WebSocket status updates
- Processing history
- Error recovery

### 3. Transaction Management
- Advanced filtering and search
- Pagination
- Category editing
- Export to CSV
- Transaction details view

### 4. Analytics
- Category breakdown
- Spending trends
- Merchant analysis
- Monthly comparisons
- Interactive charts

### 5. Real-time Updates
- WebSocket connection for live progress
- Push notifications
- Auto-refresh on data changes

## 🔧 Configuration

### Environment Variables
Create `.env` file in `src/app/`:
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### API Integration
The frontend expects the backend to be running on `http://localhost:3000`

## 📦 Components

### Key Components
- `FileUploader.vue` - CSV file upload with validation
- `UploadProgress.vue` - Real-time processing status
- `CategoryPieChart.vue` - Spending distribution chart
- `TrendLineChart.vue` - Monthly trends visualization
- `RecentTransactions.vue` - Transaction list component
- `SummaryCard.vue` - Metric display cards

### State Management
Pinia stores manage:
- User preferences
- Upload status
- Transaction data
- Analytics cache
- WebSocket connection

## 🎯 Usage

### Upload CSV
1. Navigate to Upload page
2. Drag & drop or select CSV file
3. Monitor real-time processing
4. View categorized results

### View Transactions
1. Go to Transactions page
2. Use filters to find specific transactions
3. Click on transaction for details
4. Export filtered results

### Analytics
1. Dashboard shows overview
2. Navigate to specific analytics pages
3. Interactive charts for insights
4. Export data as needed

## 🧪 Development

### Code Style
- Vue 3 Composition API
- ES6+ JavaScript
- Tailwind CSS utilities
- Responsive design

### Best Practices
- Component-based architecture
- Centralized state management
- Error handling
- Loading states
- Accessibility

## 🚀 Deployment

### Build for Production
```bash
npm run build
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

## 📱 Progressive Web App

The app includes PWA features:
- Offline support
- Install prompt
- App manifest
- Service worker

## 🔐 Security

- Content Security Policy
- XSS protection
- Input sanitization
- Secure WebSocket connections

## 📊 Performance

- Code splitting
- Lazy loading
- Virtual scrolling
- Optimized bundle size
- Cached API responses

## 🎨 UI/UX Features

- Dark mode support
- Responsive design
- Loading skeletons
- Error boundaries
- Toast notifications
- Keyboard shortcuts

## 🛠️ Troubleshooting

### Common Issues

1. **WebSocket connection fails**
   - Ensure backend is running
   - Check WebSocket URL in .env

2. **Charts not displaying**
   - Verify data format
   - Check browser console

3. **Upload fails**
   - Validate CSV format
   - Check file size limits

## 📚 Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

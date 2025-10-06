import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('./pages/login.vue'),
    meta: { title: 'Login', requiresAuth: false, layout: 'auth' }
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('./pages/signup.vue'),
    meta: { title: 'Sign Up', requiresAuth: false, layout: 'auth' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./pages/index.vue'),
    meta: { title: 'Dashboard', requiresAuth: true }
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('./pages/upload.vue'),
    meta: { title: 'Upload CSV', requiresAuth: true }
  },
  {
    path: '/transactions',
    name: 'transactions',
    component: () => import('./pages/transactions/index.vue'),
    meta: { title: 'Transactions', requiresAuth: true }
  },
  {
    path: '/transactions/:id',
    name: 'transaction-detail',
    component: () => import('./pages/transactions/[id].vue'),
    meta: { title: 'Transaction Detail', requiresAuth: true }
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import('./pages/analytics/index.vue'),
    meta: { title: 'Analytics Overview', requiresAuth: true }
  },
  {
    path: '/analytics/categories',
    name: 'analytics-categories',
    component: () => import('./pages/analytics/categories.vue'),
    meta: { title: 'Category Analysis', requiresAuth: true }
  },
  {
    path: '/analytics/merchants',
    name: 'analytics-merchants',
    component: () => import('./pages/analytics/merchants.vue'),
    meta: { title: 'Merchant Analysis', requiresAuth: true }
  },
  {
    path: '/analytics/trends',
    name: 'analytics-trends',
    component: () => import('./pages/analytics/trends.vue'),
    meta: { title: 'Spending Trends', requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./pages/settings/index.vue'),
    meta: { title: 'Settings', requiresAuth: true }
  },
  {
    path: '/settings/accounts',
    name: 'settings-accounts',
    component: () => import('./pages/settings/accounts.vue'),
    meta: { title: 'Account Management', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('./pages/404.vue'),
    meta: { title: '404 - Not Found' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Update page title
  document.title = `${to.meta.title || 'WhereMyMoneyGoes'} - WhereMyMoneyGoes`
  
  // Check if route requires authentication
  const requiresAuth = to.meta.requiresAuth !== false
  
  // Public routes that don't require auth
  const publicRoutes = ['login', 'signup']
  const isPublicRoute = publicRoutes.includes(to.name)
  
  // If route requires auth and user is not authenticated
  if (requiresAuth && !isPublicRoute) {
    // Try to verify existing token
    const isValid = await authStore.verifyToken()
    
    if (!isValid) {
      // Redirect to login with return URL
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }
  
  // If user is authenticated and trying to access login/signup, redirect to dashboard
  if (authStore.isAuthenticated && isPublicRoute) {
    next({ name: 'dashboard' })
    return
  }
  
  // Allow navigation
  next()
})

export default router

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 py-12">
    <!-- Gradient mesh background decoration -->
    <div class="fixed inset-0 gradient-mesh pointer-events-none opacity-30 dark:opacity-20"></div>
    
    <div class="relative z-10 max-w-md w-full space-y-8 px-4 sm:px-6 lg:px-8">
      <!-- Logo and Title -->
      <div class="text-center">
        <!-- Animated gradient logo -->
        <div class="flex justify-center mb-6">
          <div class="relative">
            <div class="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
            <div class="relative bg-gradient-to-r from-primary-600 to-accent-600 p-4 rounded-2xl">
              <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.81.45 1.61 1.67 1.61 1.16 0 1.6-.64 1.6-1.46 0-.84-.68-1.22-1.88-1.54-1.76-.43-3.08-1.11-3.08-3.08 0-1.86 1.43-2.98 3.16-3.29V5h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.63-1.63-1.63-1.01 0-1.46.54-1.46 1.34 0 .79.61 1.09 1.88 1.45 1.79.46 3.08 1.05 3.08 3.24 0 1.87-1.4 3.09-3.16 3.35z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <h2 class="text-3xl font-display font-bold gradient-text">
          WhereMyMoneyGoes
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          AI-Powered Finance Tracker
        </p>
      </div>

      <!-- Signup Card -->
      <div class="card p-8">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white text-center mb-6">
          Create your account
        </h3>
        
        <p class="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          Or
          <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
            sign in to existing account
          </router-link>
        </p>
        
        <form class="space-y-6" @submit.prevent="handleSignup">
          <!-- Error Message -->
          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div v-if="error" class="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 text-error-800 dark:text-error-200 rounded-xl p-4">
              <p class="text-sm">{{ error }}</p>
            </div>
          </transition>
          
          <!-- Success Message -->
          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div v-if="success" class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-800 dark:text-success-200 rounded-xl p-4">
              <p class="text-sm">Account created successfully! Redirecting...</p>
            </div>
          </transition>
          
          <div class="space-y-4">
            <!-- Email Input -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                v-model="formData.email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>
            
            <!-- Username Input -->
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username (optional)
              </label>
              <input
                id="username"
                v-model="formData.username"
                name="username"
                type="text"
                autocomplete="username"
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-all duration-200"
                placeholder="johndoe"
              />
            </div>
            
            <!-- Password Input -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                v-model="formData.password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-all duration-200"
                placeholder="••••••••"
                @input="validatePassword"
              />
              <p v-if="passwordError" class="mt-1 text-sm text-error-600 dark:text-error-400">
                {{ passwordError }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 8 characters
              </p>
            </div>
            
            <!-- Confirm Password Input -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                v-model="formData.confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-all duration-200"
                placeholder="••••••••"
                @input="validatePasswordMatch"
              />
              <p v-if="confirmPasswordError" class="mt-1 text-sm text-error-600 dark:text-error-400">
                {{ confirmPasswordError }}
              </p>
            </div>
          </div>

          <div class="flex items-center">
            <input
              id="agree-terms"
              v-model="agreeToTerms"
              name="agree-terms"
              type="checkbox"
              required
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            />
            <label for="agree-terms" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              I agree to the
              <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Terms and Conditions</a>
              and
              <a href="#" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Privacy Policy</a>
            </label>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading || !isFormValid"
              class="relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg
                  v-if="!loading"
                  class="h-5 w-5 text-primary-200"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                    clip-rule="evenodd"
                  />
                </svg>
                <svg
                  v-else
                  class="animate-spin h-5 w-5 text-primary-200"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              {{ loading ? 'Creating account...' : 'Create account' }}
            </button>
          </div>
        </form>
      </div>
      
      <!-- Footer -->
      <p class="text-center text-xs text-gray-500 dark:text-gray-400">
        © 2024 WhereMyMoneyGoes. All rights reserved.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const agreeToTerms = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref(false)
const passwordError = ref('')
const confirmPasswordError = ref('')

const validatePassword = () => {
  if (formData.value.password.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
  } else {
    passwordError.value = ''
  }
  validatePasswordMatch()
}

const validatePasswordMatch = () => {
  if (formData.value.confirmPassword && formData.value.password !== formData.value.confirmPassword) {
    confirmPasswordError.value = 'Passwords do not match'
  } else {
    confirmPasswordError.value = ''
  }
}

const isFormValid = computed(() => {
  return (
    formData.value.email &&
    formData.value.password.length >= 8 &&
    formData.value.password === formData.value.confirmPassword &&
    agreeToTerms.value &&
    !passwordError.value &&
    !confirmPasswordError.value
  )
})

const handleSignup = async () => {
  if (!isFormValid.value) return
  
  error.value = ''
  loading.value = true
  
  try {
    await authStore.signup(
      formData.value.email,
      formData.value.password,
      formData.value.username
    )
    
    success.value = true
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to create account. Please try again.'
    success.value = false
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Gradient mesh background */
.gradient-mesh {
  background-image: 
    radial-gradient(at 40% 20%, hsla(280, 100%, 70%, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 0.3) 0px, transparent 50%),
    radial-gradient(at 0% 50%, hsla(355, 100%, 93%, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 50%, hsla(340, 100%, 76%, 0.3) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(240, 100%, 70%, 0.3) 0px, transparent 50%),
    radial-gradient(at 80% 100%, hsla(22, 100%, 77%, 0.3) 0px, transparent 50%),
    radial-gradient(at 0% 0%, hsla(343, 100%, 76%, 0.3) 0px, transparent 50%);
}

/* Gradient text */
.gradient-text {
  @apply bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-400 dark:to-accent-400 bg-clip-text text-transparent;
}

/* Card glass effect */
.card {
  @apply bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl;
}
</style>
<template>
  <div class="card p-6 card-hover group overflow-hidden">
    <!-- Gradient background decoration -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full blur-3xl transition-all duration-500 group-hover:opacity-10"
      :class="gradientClass"></div>
    
    <div class="relative flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <!-- Title -->
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          {{ title }}
        </p>
        
        <!-- Value with animation -->
        <div class="flex items-baseline space-x-2">
          <p class="text-2xl lg:text-3xl font-display font-semibold tracking-tight transition-all duration-300 group-hover:scale-105 origin-left truncate" 
             :class="valueColorClass">
            {{ value }}
          </p>
          <!-- Trend indicator inline with value -->
          <span v-if="trend && trend.showInline" 
                class="text-sm font-medium animate-slide-up"
                :class="trend.isPositive ? 'text-success-500' : 'text-error-500'">
            {{ trend.isPositive ? '+' : '' }}{{ trend.value }}%
          </span>
        </div>
        
        <!-- Trend or subtitle -->
        <div v-if="trend && !trend.showInline" class="mt-3 flex items-center space-x-2">
          <div class="flex items-center px-2 py-1 rounded-lg transition-all duration-200"
               :class="trend.isPositive 
                 ? 'bg-success-100/50 dark:bg-success-900/20 text-success-600 dark:text-success-400' 
                 : 'bg-error-100/50 dark:bg-error-900/20 text-error-600 dark:text-error-400'">
            <svg
              v-if="trend.isPositive"
              class="w-3.5 h-3.5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <svg
              v-else
              class="w-3.5 h-3.5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            <span class="text-xs font-semibold">{{ trend.value }}%</span>
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ trend.label }}
          </span>
        </div>
        <p v-else-if="subtitle" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {{ subtitle }}
        </p>
        
        <!-- Optional progress bar -->
        <div v-if="progress !== undefined" class="mt-3">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-500 dark:text-gray-400">Progress</span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ progress }}%</span>
          </div>
          <div class="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
            <div class="h-1.5 rounded-full transition-all duration-1000 ease-out animate-gradient"
                 :class="progressBarClass"
                 :style="`width: ${progress}%`"></div>
          </div>
        </div>
      </div>
      
      <!-- Icon -->
      <div class="flex-shrink-0 ml-4">
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
          :class="iconBackgroundClass"
        >
          <component :is="iconComponent" class="w-6 h-6 transition-all duration-300" :class="iconClass" />
        </div>
      </div>
    </div>
    
    <!-- Action button (optional) -->
    <div v-if="action" class="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
      <button @click="$emit('action')" 
              class="text-xs font-medium flex items-center space-x-1 transition-all duration-200 hover:space-x-2"
              :class="actionColorClass">
        <span>{{ action }}</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  WalletIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCardIcon,
  ChartBarIcon,
  BanknotesIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon,
  BoltIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  title: String,
  value: [String, Number],
  trend: Object,
  subtitle: String,
  icon: String,
  color: {
    type: String,
    default: 'primary'
  },
  progress: Number,
  action: String
})

defineEmits(['action'])

const iconMap = {
  'wallet': WalletIcon,
  'arrow-down': ArrowDownIcon,
  'arrow-up': ArrowUpIcon,
  'credit-card': CreditCardIcon,
  'chart': ChartBarIcon,
  'cash': BanknotesIcon,
  'sparkles': SparklesIcon,
  'trophy': TrophyIcon,
  'fire': FireIcon,
  'bolt': BoltIcon
}

const iconComponent = iconMap[props.icon] || WalletIcon

const colorClasses = {
  primary: {
    value: 'text-gray-900 dark:text-white',
    icon: 'text-primary-600 dark:text-primary-400',
    background: 'bg-gradient-to-br from-primary-100 to-primary-200/50 dark:from-primary-900/30 dark:to-primary-800/20',
    gradient: 'from-primary-500 to-primary-600',
    progressBar: 'bg-gradient-to-r from-primary-500 to-primary-600',
    action: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
  },
  success: {
    value: 'text-success-700 dark:text-success-300',
    icon: 'text-success-600 dark:text-success-400',
    background: 'bg-gradient-to-br from-success-100 to-success-200/50 dark:from-success-900/30 dark:to-success-800/20',
    gradient: 'from-success-500 to-success-600',
    progressBar: 'bg-gradient-to-r from-success-500 to-success-600',
    action: 'text-success-600 dark:text-success-400 hover:text-success-700 dark:hover:text-success-300'
  },
  error: {
    value: 'text-error-700 dark:text-error-300',
    icon: 'text-error-600 dark:text-error-400',
    background: 'bg-gradient-to-br from-error-100 to-error-200/50 dark:from-error-900/30 dark:to-error-800/20',
    gradient: 'from-error-500 to-error-600',
    progressBar: 'bg-gradient-to-r from-error-500 to-error-600',
    action: 'text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300'
  },
  warning: {
    value: 'text-warning-700 dark:text-warning-300',
    icon: 'text-warning-600 dark:text-warning-400',
    background: 'bg-gradient-to-br from-warning-100 to-warning-200/50 dark:from-warning-900/30 dark:to-warning-800/20',
    gradient: 'from-warning-500 to-warning-600',
    progressBar: 'bg-gradient-to-r from-warning-500 to-warning-600',
    action: 'text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300'
  },
  accent: {
    value: 'text-gray-900 dark:text-white',
    icon: 'text-accent-600 dark:text-accent-400',
    background: 'bg-gradient-to-br from-accent-100 to-accent-200/50 dark:from-accent-900/30 dark:to-accent-800/20',
    gradient: 'from-accent-500 to-accent-600',
    progressBar: 'bg-gradient-to-r from-accent-500 to-accent-600',
    action: 'text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300'
  },
  purple: {
    value: 'text-gray-900 dark:text-white',
    icon: 'text-purple-600 dark:text-purple-400',
    background: 'bg-gradient-to-br from-purple-100 to-purple-200/50 dark:from-purple-900/30 dark:to-purple-800/20',
    gradient: 'from-purple-500 to-purple-600',
    progressBar: 'bg-gradient-to-r from-purple-500 to-purple-600',
    action: 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300'
  }
}

const classes = colorClasses[props.color] || colorClasses.primary

const valueColorClass = classes.value
const iconClass = classes.icon
const iconBackgroundClass = classes.background
const gradientClass = classes.gradient
const progressBarClass = classes.progressBar
const actionColorClass = classes.action
</script>
<template>
  <div class="relative">
    <label v-if="label" :for="`date-${uid}`" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {{ label }}
    </label>
    
    <!-- Date Input with Calendar Icon -->
    <div class="relative">
      <button
        :id="`date-${uid}`"
        ref="buttonRef"
        @click="toggleCalendar"
        type="button"
        class="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-left"
        :disabled="disabled"
      >
        <span v-if="displayValue" class="block truncate">
          {{ displayValue }}
        </span>
        <span v-else class="block truncate text-gray-400">
          {{ placeholder }}
        </span>
      </button>
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <CalendarIcon class="w-5 h-5 text-gray-400" />
      </div>
    </div>

    <!-- Calendar Dropdown -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="showCalendar"
          ref="calendarRef"
          class="fixed p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5"
          :class="[
            mode === 'range' ? 'w-[540px] max-w-[90vw]' : 'w-80'
          ]"
          :style="dropdownStyle"
      >
        <!-- Quick Selection Buttons -->
        <div v-if="showQuickSelections" class="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in quickOptions"
              :key="option.label"
              @click="selectQuickOption(option)"
              class="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
              :class="[
                isQuickOptionActive(option)
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              ]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Calendar(s) -->
        <div :class="mode === 'range' ? 'flex space-x-4' : ''">
          <!-- First Calendar (or only calendar for single mode) -->
          <div class="flex-1">
            <CalendarMonth
              :year="currentYear"
              :month="currentMonth"
              :selectedDate="mode === 'single' ? localValue : localStartDate"
              :startDate="mode === 'range' ? localStartDate : null"
              :endDate="mode === 'range' ? localEndDate : null"
              :minDate="minDate"
              :maxDate="maxDate"
              :highlightToday="highlightToday"
              @select="handleDateSelect"
              @navigate="handleNavigate"
            />
          </div>

          <!-- Second Calendar for range mode -->
          <div v-if="mode === 'range'" class="flex-1">
            <CalendarMonth
              :year="nextMonthYear"
              :month="nextMonthMonth"
              :startDate="localStartDate"
              :endDate="localEndDate"
              :minDate="minDate"
              :maxDate="maxDate"
              :highlightToday="highlightToday"
              @select="handleDateSelect"
              @navigate="handleNavigateNext"
            />
          </div>
        </div>

        <!-- Range Display -->
        <div v-if="mode === 'range' && (localStartDate || localEndDate)" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center space-x-4">
              <div>
                <span class="text-gray-500 dark:text-gray-400">From:</span>
                <span class="ml-2 font-medium text-gray-900 dark:text-white">
                  {{ localStartDate ? formatDate(localStartDate) : '-' }}
                </span>
              </div>
              <ArrowRightIcon class="w-4 h-4 text-gray-400" />
              <div>
                <span class="text-gray-500 dark:text-gray-400">To:</span>
                <span class="ml-2 font-medium text-gray-900 dark:text-white">
                  {{ localEndDate ? formatDate(localEndDate) : '-' }}
                </span>
              </div>
            </div>
            <button
              @click="clearSelection"
              class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
          <button
            @click="handleCancel"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleApply"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            :disabled="mode === 'range' && (!localStartDate || !localEndDate)"
          >
            Apply
          </button>
        </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subDays, isAfter, isBefore, isSameDay, addMonths } from 'date-fns'
import CalendarMonth from './CalendarMonth.vue'
import { CalendarIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
  modelValue: {
    type: [Date, String, Array, Object],
    default: null
  },
  mode: {
    type: String,
    default: 'single',
    validator: (value) => ['single', 'range'].includes(value)
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Select date'
  },
  dateFormat: {
    type: String,
    default: 'MMM dd, yyyy'
  },
  minDate: {
    type: [Date, String],
    default: null
  },
  maxDate: {
    type: [Date, String],
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  alignRight: {
    type: Boolean,
    default: false
  },
  showQuickSelections: {
    type: Boolean,
    default: true
  },
  highlightToday: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'change'])

// Refs
const calendarRef = ref(null)
const buttonRef = ref(null)
const uid = ref(Math.random().toString(36).substr(2, 9))

// State
const showCalendar = ref(false)
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())
const localValue = ref(null)
const localStartDate = ref(null)
const localEndDate = ref(null)
const selectingEndDate = ref(false)
const dropdownStyle = ref({})

// Computed
const nextMonthMonth = computed(() => {
  const nextMonth = addMonths(new Date(currentYear.value, currentMonth.value), 1)
  return nextMonth.getMonth()
})

const nextMonthYear = computed(() => {
  const nextMonth = addMonths(new Date(currentYear.value, currentMonth.value), 1)
  return nextMonth.getFullYear()
})

const displayValue = computed(() => {
  if (props.mode === 'single') {
    return localValue.value ? formatDate(localValue.value) : ''
  } else {
    if (localStartDate.value && localEndDate.value) {
      return `${formatDate(localStartDate.value)} - ${formatDate(localEndDate.value)}`
    } else if (localStartDate.value) {
      return `${formatDate(localStartDate.value)} - ...`
    }
    return ''
  }
})

const quickOptions = computed(() => {
  const today = new Date()
  return [
    { label: 'Today', value: { start: today, end: today } },
    { label: 'Yesterday', value: { start: subDays(today, 1), end: subDays(today, 1) } },
    { label: 'This Week', value: { start: startOfWeek(today), end: endOfWeek(today) } },
    { label: 'Last Week', value: { start: startOfWeek(subDays(today, 7)), end: endOfWeek(subDays(today, 7)) } },
    { label: 'This Month', value: { start: startOfMonth(today), end: endOfMonth(today) } },
    { label: 'Last Month', value: { 
      start: startOfMonth(subDays(startOfMonth(today), 1)), 
      end: endOfMonth(subDays(startOfMonth(today), 1)) 
    }},
    { label: 'Last 7 Days', value: { start: subDays(today, 6), end: today } },
    { label: 'Last 30 Days', value: { start: subDays(today, 29), end: today } },
    { label: 'This Year', value: { start: startOfYear(today), end: endOfYear(today) } }
  ]
})

// Methods
const toggleCalendar = () => {
  if (!props.disabled) {
    showCalendar.value = !showCalendar.value
    if (showCalendar.value) {
      updateDropdownPosition()
    }
  }
}

const updateDropdownPosition = () => {
  if (!buttonRef.value) return
  
  const buttonRect = buttonRef.value.getBoundingClientRect()
  const dropdownWidth = props.mode === 'range' ? Math.min(540, window.innerWidth * 0.9) : 320
  const dropdownHeight = 500 // Approximate height
  
  let top = buttonRect.bottom + 8
  let left = buttonRect.left
  
  // Check if dropdown would go off the right edge
  if (left + dropdownWidth > window.innerWidth - 20) {
    left = Math.max(20, window.innerWidth - dropdownWidth - 20)
  }
  
  // Check if dropdown would go off the bottom
  if (top + dropdownHeight > window.innerHeight - 20) {
    // Position above the button if there's more space
    const spaceAbove = buttonRect.top
    const spaceBelow = window.innerHeight - buttonRect.bottom
    
    if (spaceAbove > spaceBelow && spaceAbove > dropdownHeight + 20) {
      top = buttonRect.top - dropdownHeight - 8
    } else {
      // Keep below but adjust height
      top = Math.min(top, window.innerHeight - dropdownHeight - 20)
    }
  }
  
  // Ensure minimum distance from edges
  left = Math.max(10, left)
  top = Math.max(10, top)
  
  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    maxHeight: `${Math.min(dropdownHeight, window.innerHeight - top - 20)}px`,
    overflowY: 'auto'
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, props.dateFormat)
}

const handleDateSelect = (date) => {
  if (props.mode === 'single') {
    localValue.value = date
  } else {
    if (!localStartDate.value || (localStartDate.value && localEndDate.value)) {
      // Starting a new selection
      localStartDate.value = date
      localEndDate.value = null
      selectingEndDate.value = true
    } else {
      // Selecting end date
      if (isAfter(date, localStartDate.value)) {
        localEndDate.value = date
      } else {
        // If end date is before start date, swap them
        localEndDate.value = localStartDate.value
        localStartDate.value = date
      }
      selectingEndDate.value = false
    }
  }
}

const handleNavigate = (direction) => {
  if (direction === 'prev') {
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value--
    } else {
      currentMonth.value--
    }
  } else {
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value++
    } else {
      currentMonth.value++
    }
  }
}

const handleNavigateNext = (direction) => {
  // Navigate both calendars together in range mode
  handleNavigate(direction)
}

const selectQuickOption = (option) => {
  if (props.mode === 'single') {
    localValue.value = option.value.start
  } else {
    localStartDate.value = option.value.start
    localEndDate.value = option.value.end
  }
}

const isQuickOptionActive = (option) => {
  if (props.mode === 'single') {
    return localValue.value && isSameDay(localValue.value, option.value.start)
  } else {
    return localStartDate.value && localEndDate.value &&
           isSameDay(localStartDate.value, option.value.start) &&
           isSameDay(localEndDate.value, option.value.end)
  }
}

const clearSelection = () => {
  localValue.value = null
  localStartDate.value = null
  localEndDate.value = null
  selectingEndDate.value = false
}

const handleCancel = () => {
  // Reset to original values
  initializeValues()
  showCalendar.value = false
}

const handleApply = () => {
  if (props.mode === 'single') {
    emit('update:modelValue', localValue.value)
    emit('change', localValue.value)
  } else {
    const rangeValue = {
      start: localStartDate.value,
      end: localEndDate.value
    }
    emit('update:modelValue', rangeValue)
    emit('change', rangeValue)
  }
  showCalendar.value = false
}

const initializeValues = () => {
  if (props.mode === 'single') {
    localValue.value = props.modelValue ? new Date(props.modelValue) : null
  } else if (props.modelValue) {
    if (Array.isArray(props.modelValue)) {
      localStartDate.value = props.modelValue[0] ? new Date(props.modelValue[0]) : null
      localEndDate.value = props.modelValue[1] ? new Date(props.modelValue[1]) : null
    } else if (typeof props.modelValue === 'object') {
      localStartDate.value = props.modelValue.start ? new Date(props.modelValue.start) : null
      localEndDate.value = props.modelValue.end ? new Date(props.modelValue.end) : null
    }
  }
}

// Click outside handler
const handleClickOutside = (event) => {
  if (showCalendar.value && 
      calendarRef.value && 
      !calendarRef.value.contains(event.target) && 
      !buttonRef.value?.contains(event.target)) {
    showCalendar.value = false
  }
}

// Handle window resize
const handleResize = () => {
  if (showCalendar.value) {
    updateDropdownPosition()
  }
}

// Watch for prop changes
watch(() => props.modelValue, () => {
  initializeValues()
})

// Lifecycle
onMounted(() => {
  initializeValues()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleResize, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleResize, true)
})
</script>

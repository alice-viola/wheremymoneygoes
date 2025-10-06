<template>
  <div class="calendar-month">
    <!-- Month Header -->
    <div class="flex items-center justify-between mb-4">
      <button
        @click="$emit('navigate', 'prev')"
        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        type="button"
      >
        <ChevronLeftIcon class="w-5 h-5" />
      </button>
      
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
        {{ monthName }} {{ year }}
      </h3>
      
      <button
        @click="$emit('navigate', 'next')"
        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        type="button"
      >
        <ChevronRightIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Weekday Headers -->
    <div class="grid grid-cols-7 mb-2">
      <div
        v-for="day in weekDays"
        :key="day"
        class="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Days -->
    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="day in calendarDays"
        :key="`${day.date}-${day.isCurrentMonth}`"
        @click="handleDayClick(day)"
        :disabled="day.isDisabled"
        type="button"
        class="relative h-9 rounded-lg transition-all duration-200 text-sm font-medium"
        :class="getDayClasses(day)"
      >
        <span class="relative z-10">{{ day.day }}</span>
        
        <!-- Today indicator -->
        <div
          v-if="day.isToday && highlightToday"
          class="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full"
        ></div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  isAfter,
  isWithinInterval,
  format
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  selectedDate: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  minDate: {
    type: [Date, String],
    default: null
  },
  maxDate: {
    type: [Date, String],
    default: null
  },
  highlightToday: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['select', 'navigate'])

// Computed
const currentMonthDate = computed(() => new Date(props.year, props.month))

const monthName = computed(() => format(currentMonthDate.value, 'MMMM'))

const weekDays = computed(() => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])

const calendarDays = computed(() => {
  const start = startOfWeek(startOfMonth(currentMonthDate.value))
  const end = endOfWeek(endOfMonth(currentMonthDate.value))
  
  const days = eachDayOfInterval({ start, end })
  
  return days.map(date => {
    const minDate = props.minDate ? new Date(props.minDate) : null
    const maxDate = props.maxDate ? new Date(props.maxDate) : null
    
    let isDisabled = false
    if (minDate && isBefore(date, minDate)) isDisabled = true
    if (maxDate && isAfter(date, maxDate)) isDisabled = true
    
    const isCurrentMonth = isSameMonth(date, currentMonthDate.value)
    const isSelected = props.selectedDate && isSameDay(date, props.selectedDate)
    const isRangeStart = props.startDate && isSameDay(date, props.startDate)
    const isRangeEnd = props.endDate && isSameDay(date, props.endDate)
    const isInRange = props.startDate && props.endDate && 
                      isWithinInterval(date, { start: props.startDate, end: props.endDate })
    
    return {
      date,
      day: date.getDate(),
      isCurrentMonth,
      isToday: isToday(date),
      isDisabled,
      isSelected,
      isRangeStart,
      isRangeEnd,
      isInRange
    }
  })
})

// Methods
const handleDayClick = (day) => {
  if (!day.isDisabled) {
    emit('select', day.date)
  }
}

const getDayClasses = (day) => {
  const classes = []
  
  // Base styles
  if (!day.isCurrentMonth) {
    classes.push('text-gray-300 dark:text-gray-600')
  } else {
    classes.push('text-gray-900 dark:text-white')
  }
  
  // Disabled state
  if (day.isDisabled) {
    classes.push('opacity-50 cursor-not-allowed')
  } else {
    classes.push('hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer')
  }
  
  // Selection states
  if (day.isSelected && !props.startDate && !props.endDate) {
    // Single date selection
    classes.push('bg-primary-500 text-white hover:bg-primary-600')
  } else if (day.isRangeStart || day.isRangeEnd) {
    // Range endpoints
    classes.push('bg-primary-500 text-white hover:bg-primary-600')
    if (day.isRangeStart) {
      classes.push('rounded-l-lg')
    }
    if (day.isRangeEnd) {
      classes.push('rounded-r-lg')
    }
  } else if (day.isInRange) {
    // Days within range
    classes.push('bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100')
    classes.push('rounded-none')
  }
  
  // Today highlight
  if (day.isToday && props.highlightToday && !day.isSelected && !day.isRangeStart && !day.isRangeEnd) {
    classes.push('ring-1 ring-primary-500 ring-opacity-50')
  }
  
  return classes.join(' ')
}
</script>

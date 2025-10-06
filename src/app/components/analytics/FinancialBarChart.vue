<template>
  <div class="chart-container" :style="{ height: `${height}px` }">
    <Bar
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  height: {
    type: Number,
    default: 300
  },
  stacked: {
    type: Boolean,
    default: false
  },
  horizontal: {
    type: Boolean,
    default: false
  }
})

const chartData = computed(() => props.data)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: props.horizontal ? 'y' : 'x',
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        padding: 15,
        usePointStyle: true,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.dataset.label || ''
          const value = context.parsed[props.horizontal ? 'x' : 'y'] || 0
          return `${label}: €${value.toFixed(2)}`
        }
      }
    }
  },
  scales: {
    x: {
      stacked: props.stacked,
      grid: {
        display: !props.horizontal,
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false
      },
      ticks: props.horizontal ? {
        callback: (value) => `€${value}`
      } : {}
    },
    y: {
      stacked: props.stacked,
      beginAtZero: true,
      grid: {
        display: props.horizontal,
        color: 'rgba(0, 0, 0, 0.05)',
        drawBorder: false
      },
      ticks: !props.horizontal ? {
        callback: (value) => `€${value}`
      } : {}
    }
  }
}))
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
}
</style>

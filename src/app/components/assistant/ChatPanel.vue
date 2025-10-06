<template>
  <transition name="slide-in">
    <div v-if="isOpen" class="chat-panel">
      <div class="chat-header">
        <div class="chat-title">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
          </svg>
          <span>AI Assistant</span>
        </div>
        <button @click="close" class="close-button">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="chat-messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="welcome-message">
        <h3>Welcome to Your Financial Assistant</h3>
        <p>I can help you understand your spending patterns and provide insights about your transactions.</p>
          
          <div class="suggestions">
            <p class="suggestions-title">Try asking:</p>
            <button 
              v-for="suggestion in suggestions" 
              :key="suggestion"
              @click="sendMessage(suggestion)"
              class="suggestion-button"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
        
        <div v-for="(message, index) in messages" :key="index" class="message" :class="message.role">
          <div class="message-avatar">
            <svg v-if="message.role === 'user'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
        
        <div v-if="isLoading" class="message assistant loading">
          <div class="message-avatar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="chat-input">
        <input 
          v-model="inputMessage"
          @keyup.enter="sendMessage()"
          placeholder="Ask about your spending..."
          :disabled="isLoading"
          class="input-field"
        />
        <button 
          @click="sendMessage()"
          :disabled="!inputMessage.trim() || isLoading"
          class="send-button"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue';
import { useAssistantStore } from '../../stores/assistant';
import { assistantApi } from '../../services/api/assistant';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const assistantStore = useAssistantStore();
const messagesContainer = ref(null);
const inputMessage = ref('');
const isLoading = ref(false);
const messages = ref([]);
const suggestions = ref([
  "What did I spend the most on this month?",
  "Show me my spending by category",
  "Find all my food expenses",
  "What are my unusual transactions?",
  "Compare my spending this month vs last month"
]);

// Load suggestions on mount (only if authenticated)
onMounted(async () => {
  // Only load suggestions if we have a token (user is authenticated)
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    await loadSuggestions();
  }
});

// Load conversation when panel opens
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    // Only load if authenticated
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      await loadConversation();
      await loadSuggestions();
    }
  }
});

async function loadSuggestions() {
  try {
    const response = await assistantApi.getSuggestions();
    if (response.success) {
      suggestions.value = response.suggestions;
    }
  } catch (error) {
    console.error('Failed to load suggestions:', error);
  }
}

async function loadConversation() {
  if (assistantStore.conversationId) {
    try {
      const response = await assistantApi.getConversation(assistantStore.conversationId);
      if (response.success) {
        messages.value = response.messages;
        await scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }
}

async function sendMessage(text = null) {
  const messageText = text || inputMessage.value.trim();
  if (!messageText || isLoading.value) return;
  
  // Add user message
  messages.value.push({
    role: 'user',
    content: messageText,
    timestamp: new Date().toISOString()
  });
  
  inputMessage.value = '';
  isLoading.value = true;
  await scrollToBottom();
  
  try {
    const response = await assistantApi.sendMessage(
      messageText,
      assistantStore.conversationId
    );
    
    if (response.success) {
      messages.value.push({
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      });
      
      // Store conversation ID
      if (!assistantStore.conversationId) {
        assistantStore.setConversationId(response.conversationId);
      }
    } else {
      messages.value.push({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I couldn\'t connect to the server. Please try again later.',
      timestamp: new Date().toISOString()
    });
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
}

function formatMessage(content) {
  // Basic markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/\$([0-9,]+\.?\d*)/g, '<span class="currency">$$$1</span>');
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString();
}

async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function close() {
  emit('close');
}
</script>

<style scoped>
.chat-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 400px;
  @apply bg-white dark:bg-gray-800;
  @apply shadow-2xl dark:shadow-black/50;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  @apply border-l border-gray-200 dark:border-gray-700/50;
}

@media (max-width: 640px) {
  .chat-panel {
    width: 100%;
  }
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  @apply border-b border-gray-200 dark:border-gray-700;
  @apply bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800;
  color: white;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.close-button {
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
}

.close-button:hover {
  @apply bg-white/20;
  transform: scale(1.1);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  @apply bg-gray-50 dark:bg-gray-900/50;
  scrollbar-width: thin;
  scrollbar-color: theme('colors.gray.300') transparent;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-700;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-600;
}

.welcome-message {
  text-align: center;
  padding: 2rem 1rem;
}

.welcome-message h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  @apply text-gray-900 dark:text-white;
}

.welcome-message p {
  @apply text-gray-600 dark:text-gray-400;
  margin-bottom: 1.5rem;
}

.suggestions {
  margin-top: 1.5rem;
}

.suggestions-title {
  font-size: 0.875rem;
  @apply text-gray-600 dark:text-gray-400;
  margin-bottom: 0.75rem;
}

.suggestion-button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  @apply bg-white dark:bg-gray-700/50;
  @apply border border-gray-200 dark:border-gray-600;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  @apply text-gray-700 dark:text-gray-300;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-button:hover {
  @apply bg-gray-50 dark:bg-gray-600/50;
  @apply border-gray-300 dark:border-gray-500;
  transform: translateX(2px);
}

.message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  @apply bg-gray-200 dark:bg-gray-700/50;
  border-radius: 50%;
  font-size: 1.25rem;
  @apply text-gray-600 dark:text-gray-400;
}

.message.user .message-avatar {
  @apply bg-primary-100 dark:bg-primary-800/50;
  @apply text-primary-700 dark:text-primary-300;
}

.message-content {
  flex: 1;
  max-width: 80%;
}

.message-text {
  @apply bg-white dark:bg-gray-700/50;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  @apply text-gray-900 dark:text-gray-100;
  @apply shadow-sm dark:shadow-black/10;
  @apply border border-gray-100 dark:border-gray-600/50;
}

.message.user .message-text {
  @apply bg-primary-600 dark:bg-primary-700;
  color: white;
  @apply border-primary-700 dark:border-primary-600;
}

.message-time {
  font-size: 0.75rem;
  @apply text-gray-500 dark:text-gray-500;
  margin-top: 0.25rem;
  text-align: right;
}

.message.user .message-time {
  text-align: left;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  @apply bg-gray-400 dark:bg-gray-600;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  @apply border-t border-gray-200 dark:border-gray-700/50;
  @apply bg-white dark:bg-gray-800;
}

.input-field {
  flex: 1;
  padding: 0.5rem 0.75rem;
  @apply border border-gray-200 dark:border-gray-600;
  @apply bg-white dark:bg-gray-700/50;
  @apply text-gray-900 dark:text-gray-100;
  @apply placeholder-gray-400 dark:placeholder-gray-400;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s;
}

.input-field:focus {
  @apply border-primary-500 dark:border-primary-400;
  @apply ring-2 ring-primary-500/20 dark:ring-primary-400/20;
}

.input-field:disabled {
  @apply bg-gray-100 dark:bg-gray-900;
  @apply text-gray-500 dark:text-gray-500;
  cursor: not-allowed;
}

.send-button {
  padding: 0.5rem 0.75rem;
  @apply bg-primary-600 dark:bg-primary-700;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.send-button:hover:not(:disabled) {
  @apply bg-primary-700 dark:bg-primary-600;
  transform: scale(1.05);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.currency {
  font-weight: 600;
  @apply text-success-600 dark:text-success-400;
}

/* Slide-in transition */
.slide-in-enter-active,
.slide-in-leave-active {
  transition: transform 0.3s ease;
}

.slide-in-enter-from,
.slide-in-leave-to {
  transform: translateX(100%);
}
</style>

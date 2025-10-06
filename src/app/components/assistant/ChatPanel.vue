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
          <h3>Hi! I'm your financial assistant 👋</h3>
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
            <span v-if="message.role === 'user'">👤</span>
            <span v-else>🤖</span>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
        
        <div v-if="isLoading" class="message assistant loading">
          <div class="message-avatar">🤖</div>
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
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;
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
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  transition: background-color 0.2s;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f9fafb;
}

.welcome-message {
  text-align: center;
  padding: 2rem 1rem;
}

.welcome-message h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.welcome-message p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.suggestions {
  margin-top: 1.5rem;
}

.suggestions-title {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.suggestion-button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
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
  background: #e5e7eb;
  border-radius: 50%;
  font-size: 1.25rem;
}

.message.user .message-avatar {
  background: #ddd6fe;
}

.message-content {
  flex: 1;
  max-width: 80%;
}

.message-text {
  background: white;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message.user .message-text {
  background: #6366f1;
  color: white;
}

.message-time {
  font-size: 0.75rem;
  color: #9ca3af;
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
  background: #9ca3af;
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
  border-top: 1px solid #e5e7eb;
  background: white;
}

.input-field {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.input-field:focus {
  border-color: #6366f1;
}

.input-field:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.send-button {
  padding: 0.5rem 0.75rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #4f46e5;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.currency {
  font-weight: 600;
  color: #059669;
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

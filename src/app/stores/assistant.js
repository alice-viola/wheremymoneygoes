import { defineStore } from 'pinia';

export const useAssistantStore = defineStore('assistant', {
  state: () => ({
    isOpen: false,
    conversationId: null,
    messages: [],
    isLoading: false
  }),

  actions: {
    openChat() {
      this.isOpen = true;
    },

    closeChat() {
      this.isOpen = false;
    },

    toggleChat() {
      this.isOpen = !this.isOpen;
    },

    setConversationId(id) {
      this.conversationId = id;
    },

    clearConversation() {
      this.conversationId = null;
      this.messages = [];
    },

    async clearHistory() {
      if (this.conversationId) {
        try {
          const response = await fetch(`/api/assistant/conversation/${this.conversationId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            this.clearConversation();
            return true;
          }
        } catch (error) {
          console.error('Failed to clear conversation history:', error);
        }
      }
      return false;
    }
  }
});

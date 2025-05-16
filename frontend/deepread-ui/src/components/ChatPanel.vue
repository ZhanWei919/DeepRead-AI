<template>
  <div class="ai-chat">
    <div class="chat-header">Research Assistant</div>

    <div ref="chatHistoryRef" class="chat-messages">
      <div
        v-if="!props.isPdfProcessed && props.messages.length === 0"
        class="message message-ai"
      >
        <div>Please upload and process a PDF document first.</div>
      </div>
      <div
        v-if="
          props.isPdfProcessed &&
          props.messages.length === 0 &&
          !props.isLoadingChat
        "
        class="message message-ai"
      >
        <div>
          Hello! I'm your research assistant. Ask me anything about the
          document.
        </div>
      </div>

      <div
        v-for="message in props.messages"
        :key="message.id"
        :class="[
          'message',
          message.sender === 'user' ? 'message-user' : 'message-ai',
          message.sender === 'system' ? 'message-system' : '',
        ]"
      >
        <div
          v-if="message.sender === 'ai'"
          v-html="renderMarkdown(message.text)"
        ></div>
        <div v-else-if="message.sender === 'user'" v-text="message.text"></div>
        <div
          v-else-if="message.sender === 'system'"
          :class="{
            error:
              props.chatError && message.text.toLowerCase().includes('error'),
          }"
          v-text="message.text"
        ></div>
      </div>

      <div v-if="props.isLoadingChat" class="message message-ai">
        <div class="thinking-bubble">
          <span class="typing-dots"
            ><span>.</span><span>.</span><span>.</span></span
          >
        </div>
      </div>
    </div>

    <div class="chat-input">
      <textarea
        v-model="userInput"
        placeholder="Ask me anything about the document..."
        :disabled="!props.isPdfProcessed || props.isLoadingChat"
        @keydown.enter.exact.prevent="onSendMessage"
        @keydown.enter.shift.exact.prevent="userInput += '\n'"
      ></textarea>
      <div class="chat-actions">
        <button
          v-if="props.selectedPdfFragment && userInput.trim()"
          class="chat-send query-selected"
          :disabled="!props.isPdfProcessed || props.isLoadingChat"
          title="Send message referencing selected text"
          @click="onSendMessageWithSelection"
        >
          Send w/ Selection
        </button>
        <button
          class="chat-send"
          :disabled="
            !props.isPdfProcessed || !userInput.trim() || props.isLoadingChat
          "
          @click="onSendMessage"
        >
          <span v-if="!props.isLoadingChat">Send</span>
          <span v-else>Sending...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from "vue";
import { renderMarkdown } from "@/utils/markdownUtils";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai" | "system";
}

interface Props {
  messages: ChatMessage[];
  isLoadingChat: boolean;
  chatError: string;
  isPdfProcessed: boolean;
  selectedPdfFragment: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "send-message", text: string): void;
  (e: "send-message-with-selection", userQuestion: string): void;
}>();

const userInput = ref<string>("");
const chatHistoryRef = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (chatHistoryRef.value) {
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
  }
};

const onSendMessage = () => {
  const text = userInput.value.trim();
  if (text && props.isPdfProcessed && !props.isLoadingChat) {
    emit("send-message", text);
    userInput.value = "";
  }
};

const onSendMessageWithSelection = () => {
  const text = userInput.value.trim();
  if (
    text &&
    props.isPdfProcessed &&
    props.selectedPdfFragment &&
    !props.isLoadingChat
  ) {
    emit("send-message-with-selection", text);
    userInput.value = "";
  }
};

// // Helper to check if the current AI message is the last one and empty (for thinking bubble)
// const isLastAiMessage = (messageId: string): boolean => {
//   if (props.messages.length === 0) return false;
//   const lastMessage = props.messages[props.messages.length - 1];
//   return lastMessage.id === messageId && lastMessage.sender === "ai";
// };

// Watchers for scrolling
watch(() => props.messages, scrollToBottom, { deep: true });
watch(
  () => props.isLoadingChat,
  (newValue, oldValue) => {
    // Scroll to bottom when loading starts, if we just added a user message and AI placeholder
    if (newValue && !oldValue) {
      scrollToBottom();
    }
    // Also scroll if loading finishes (AI message might have grown)
    if (!newValue && oldValue) {
      scrollToBottom();
    }
  }
);
watch(
  () => props.chatError,
  () => {
    if (props.chatError) scrollToBottom();
  }
);

onMounted(() => {
  if (props.messages.length > 0) scrollToBottom();
});
</script>

<style scoped>
/* Styles are identical to your provided version */
.ai-chat {
  /* width: 400px; */ /* REMOVED: Let App.vue's flex control this */
  flex: 1; /* ADDED: Ensure it fills the flex item space in App.vue */
  min-width: 300px; /* Keep min-width if desired, or control in App.vue */
  display: flex;
  flex-direction: column;
  background-color: white;
  height: 100%;
  overflow: hidden;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid var(--apple-gray-2);
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
  color: var(--apple-gray-5);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background-color: white;
}

.message {
  margin-bottom: 10px;
  display: flex;
  width: 100%;
}

.message-user {
  justify-content: flex-end;
}
.message-ai {
  justify-content: flex-start;
}
.message-system {
  justify-content: flex-start;
}

.message-user > div {
  background-color: var(--apple-blue);
  color: white;
  padding: 10px 15px;
  border-radius: 18px 4px 18px 18px;
  word-break: break-word;
  white-space: pre-wrap;
  max-width: 90%;
  box-sizing: border-box;
}

.message-ai > div:not(.thinking-bubble) {
  background-color: var(--apple-gray-1);
  color: var(--apple-gray-5);
  padding: 10px 15px;
  border-radius: 4px 18px 18px 18px;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.3;
  max-width: 90%;
  box-sizing: border-box;
}
.message-ai > div.thinking-bubble {
  background-color: var(--apple-gray-1);
  border-radius: 4px 18px 18px 18px;
  display: inline-flex;
  padding: 10px 15px;
  align-items: center;
  justify-content: center;
  max-width: 90%;
  box-sizing: border-box;
}

.message-system > div {
  background-color: var(--apple-gray-1);
  color: var(--apple-gray-4);
  padding: 8px 15px;
  border-radius: 4px;
  font-size: 13px;
  font-style: italic;
  max-width: 95%;
  box-sizing: border-box;
}
.message-system > div.error {
  background-color: rgba(215, 56, 71, 0.1);
  color: #d73847;
  font-style: normal;
  font-weight: 500;
}

/* Markdown styles remain the same */
.message-ai > div :deep(p:first-child) {
  margin-top: 0;
}
.message-ai > div :deep(p:last-child) {
  margin-bottom: 0;
}
.message-ai > div :deep(p) {
  margin-bottom: 0.5em;
}
.message-ai > div :deep(ul),
.message-ai > div :deep(ol) {
  padding-left: 1.5em;
  margin-top: 0.3em;
  margin-bottom: 0.5em;
}
.message-ai > div :deep(li) {
  margin-bottom: 0.2em;
}
.message-ai > div :deep(code) {
  background-color: rgba(0, 0, 0, 0.06);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: "SF Mono", SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}
.message-ai > div :deep(pre) {
  background-color: rgba(0, 0, 0, 0.06);
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5em 0 0.8em 0;
}
.message-ai > div :deep(pre code) {
  background-color: transparent;
  padding: 0;
  font-size: inherit;
}
.message-ai > div :deep(blockquote) {
  margin: 0.5em 0 0.8em 0;
  padding-left: 1em;
  border-left: 3px solid var(--apple-gray-2);
  color: var(--apple-gray-3);
}
.message-ai > div :deep(a) {
  color: var(--apple-blue);
  text-decoration: none;
}
.message-ai > div :deep(a:hover) {
  text-decoration: underline;
}
.message-ai > div :deep(h1),
.message-ai > div :deep(h2),
.message-ai > div :deep(h3),
.message-ai > div :deep(h4) {
  margin-top: 0.7em;
  margin-bottom: 0.3em;
  font-weight: 600;
}

/* Loading indicator styles */
.typing-dots {
  display: flex;
  gap: 3px;
  line-height: 1;
}
.typing-dots span {
  width: 6px;
  height: 6px;
  background-color: var(--apple-gray-3);
  border-radius: 50%;
  opacity: 0.4;
  animation: typingDot 1.4s infinite;
}
.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}
.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingDot {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

.chat-input {
  padding: 15px;
  border-top: 1px solid var(--apple-gray-2);
  background-color: white;
  flex-shrink: 0;
}
.chat-input textarea {
  width: 100%;
  border: 1px solid var(--apple-gray-2);
  border-radius: 8px;
  padding: 10px 15px;
  resize: none;
  font-size: 14px;
  min-height: 60px;
  max-height: 150px;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.chat-input textarea:focus {
  border-color: var(--apple-blue);
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.2);
}
.chat-input textarea:disabled {
  background-color: var(--apple-gray-1);
  cursor: not-allowed;
}
.chat-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  gap: 8px;
}
.chat-send {
  background-color: var(--apple-blue);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 15px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  line-height: 1.5;
}
.chat-send:hover:not(:disabled) {
  background-color: var(--apple-blue-hover);
}
.chat-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chat-send.query-selected {
  background-color: #34c759;
}
.chat-send.query-selected:hover:not(:disabled) {
  background-color: #30b152;
}
</style>

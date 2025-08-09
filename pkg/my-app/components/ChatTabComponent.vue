<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-content">
        <div class="ai-avatar">
          <svg viewBox="0 0 24 24" class="brain-icon">
            <path fill="currentColor" d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.11 3.89 21 5 21H11V19H5V3H13V9H21Z"/>
          </svg>
        </div>
        <div class="header-text">
          <h2>🧠 AI Agent Assistant</h2>
          <p class="status">Online • Ready to help with workload health</p>
        </div>
      </div>
    </div>

    <!-- Hints Section -->
    <div class="hints-section" v-if="showDefaultHint || dynamicHints?.length > 0">
      <div class="hints-container">
        <div class="hints-label">Quick Actions:</div>
        <div class="hints-list">
          <button
            v-if="showDefaultHint"
            class="hint-btn"
            @click="applyHint(defaultHint)"
          >
            {{ defaultHint }}
          </button>
          <button
            v-for="(hint, index) in dynamicHints"
            :key="index"
            class="hint-btn"
            @click="applyHint(hint.prompt)"
          >
            {{ hint.prompt }}
          </button>
        </div>
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div class="messages-list">
        <div v-if="messages?.length === 0" class="welcome-message">
          <div class="welcome-content">
            <div class="welcome-icon">🔍</div>
            <h3>Workload Health Assistant</h3>
            <p>I'm here to help you analyze and troubleshoot your Kubernetes workloads. Click on a quick action above or ask me anything!</p>
          </div>
        </div>

        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="message-wrapper"
          :class="{ 'user-message': msg.role === 'user', 'ai-message': msg.role === 'ai' }"
        >
          <div class="message-bubble">
            <div class="message-content">
              <div v-if="msg.role === 'ai' && msg.text.includes('💭')" class="thinking-indicator">
                <div class="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span class="thinking-text">Agent is analyzing...</span>
              </div>
              <div v-else-if="msg.role === 'ai'" class="message-text markdown-content" v-html="renderMarkdown(msg.text)"></div>
              <div v-else class="message-text">{{ msg.text }}</div>
            </div>
            <div class="message-time">
              {{ formatTime(new Date()) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          v-model="input"
          placeholder="Ask about workload health, troubleshooting, or any Kubernetes questions..."
          @keyup.enter.prevent="handleEnter"
          @input="adjustTextareaHeight"
          ref="textareaRef"
          class="message-input"
          rows="1"
        />
        <button
          @click="sendMessage"
          :disabled="!input.trim() || isLoading"
          class="send-button"
          :class="{ 'loading': isLoading }"
        >
          <svg v-if="!isLoading" viewBox="0 0 24 24" class="send-icon">
            <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
          </svg>
          <div v-else class="loading-spinner"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
let routeParams = route?.params || {};
// Fallback to path parsing if missing
if (!routeParams.resource || !routeParams.id || !routeParams.cluster) {
  const match = route.path.match(/\/dashboard\/c\/(.*?)\/explorer\/(.*?)\/(.*?)\//);
  if (match) {
    routeParams.cluster = match[1];
    routeParams.resource = match[2];
    routeParams.id = match[3];
  }
}

// Route parameters with fallback values
const clusterId = routeParams.cluster || 'local';
const resourceType = routeParams.resource || 'pod';
const resourceId = routeParams.id || 'my-deployment';
const namespace = routeParams.namespace || 'default';
const cluster = routeParams.cluster || 'local';
const product = routeParams.product || '';

const input = ref('');
const messages = ref([]);
const history = ref([]);
const res_conversation_history = ref([]);
const workload_health_result = ref(null);
const isLoading = ref(false);
const messagesContainer = ref(null);
const textareaRef = ref(null);

const API_URL = 'https://holmes.192.223.13.246.sslip.io/api/workload_health_chat';

const defaultHint = ref('Check workload health');
const dynamicHints = ref([]); // Ensure this is always an array
const showDefaultHint = ref(true);

// Markdown renderer with fallback
function renderMarkdown(text) {
  try {
    // Try to use MarkdownIt if available
    if (typeof MarkdownIt !== 'undefined') {
      const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true,
        breaks: true
      });
      return md.render(text);
    }
  } catch (error) {
    console.log('MarkdownIt not available, using simple markdown');
  }

  // Simple fallback markdown rendering
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function adjustTextareaHeight() {
  const textarea = textareaRef.value;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }
}

function handleEnter(event) {
  if (!event.shiftKey) {
    sendMessage();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function applyHint(hint) {
  input.value = hint;
  sendMessage();
}

async function sendMessage() {
  const messageText = input.value.trim();
  if (!messageText || isLoading.value) return;

  isLoading.value = true;

  // Add user message
  messages.value.push({ role: 'user', text: messageText });
  history.value.push({ role: 'user', content: messageText });
  input.value = '';

  // Hide default hint after first message
  showDefaultHint.value = false;

  // Reset textarea height
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }

  scrollToBottom();

  // Add temporary AI "thinking" message
  const thinkingMsg = { role: 'ai', text: '💭 Agent is analyzing...' };
  messages.value.push(thinkingMsg);
  scrollToBottom();

  try {
    const body = {
      ask: messageText,
      resource: {
        name: resourceId,
        kind: resourceType.charAt(0).toUpperCase() + resourceType.slice(1),
        namespace: namespace,
        cluster: cluster
      },
      workload_health_result: workload_health_result.value || {
        analysis: '',
        tools: []
      }
    };

    // Add conversation_history if available
    if (res_conversation_history.value.length > 0) {
      body.conversation_history = res_conversation_history.value;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("Response data:", data);

    const reply = data.analysis || '[No reply]';
    res_conversation_history.value = data.conversation_history || [];

    // Store workload health result for future requests
    workload_health_result.value = {
      analysis: reply,
      tools: []
    };

    // Update dynamic hints
    dynamicHints.value = data.follow_up_actions || [];

    // Update the thinking message with the actual reply
    const thinkingIndex = messages.value.indexOf(thinkingMsg);
    if (thinkingIndex !== -1) {
      messages.value[thinkingIndex] = { role: 'ai', text: reply };
    }
    history.value.push({ role: 'assistant', content: reply });

  } catch (error) {
    console.error('Chat error:', error);
    const thinkingIndex = messages.value.indexOf(thinkingMsg);
    if (thinkingIndex !== -1) {
      messages.value[thinkingIndex] = {
        role: 'ai',
        text: '❌ Error: Could not reach N-TNT backend. Please try again.'
      };
    }
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
}

onMounted(() => {
  adjustTextareaHeight();
});
</script>

<style scoped>
.chat-container {
  max-width: 900px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 80vh;
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  border-radius: 16px 16px 0 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ai-avatar {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.brain-icon {
  width: 24px;
  height: 24px;
}

.header-text h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.status {
  margin: 0.25rem 0 0 0;
  opacity: 0.9;
  font-size: 0.875rem;
}

.hints-section {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 1rem 2rem;
}

.hints-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hints-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
}

.hints-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.hint-btn {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: all 0.2s ease;
  color: #374151;
  font-weight: 500;
}

.hint-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: #f8fafc;
}

.messages-list {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100%;
}

.welcome-message {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  text-align: center;
}

.welcome-content {
  max-width: 400px;
  padding: 2rem;
}

.welcome-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.welcome-content h3 {
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.welcome-content p {
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.message-wrapper {
  display: flex;
  animation: messageSlide 0.3s ease-out;
}

.message-wrapper.user-message {
  justify-content: flex-end;
}

.message-wrapper.ai-message {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  min-width: 100px;
}

.user-message .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 18px 18px 4px 18px;
  padding: 1rem 1.25rem;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.3);
}

.ai-message .message-bubble {
  background: white;
  color: #1e293b;
  border-radius: 18px 18px 18px 4px;
  padding: 1rem 1.25rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.message-content {
  margin-bottom: 0.5rem;
}

.message-text {
  line-height: 1.5;
  font-size: 0.95rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Markdown content styling */
.markdown-content {
  line-height: 1.6;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin: 1rem 0 0.5rem 0;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-content h1 { font-size: 1.5rem; }
.markdown-content h2 { font-size: 1.3rem; }
.markdown-content h3 { font-size: 1.1rem; }
.markdown-content h4 { font-size: 1rem; }

.markdown-content p {
  margin: 0.5rem 0;
}

.markdown-content ul,
.markdown-content ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.markdown-content li {
  margin: 0.25rem 0;
}

.markdown-content code {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
}

.ai-message .markdown-content code {
  background: #f1f5f9;
  color: #475569;
}

.markdown-content pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
}

.markdown-content pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

.markdown-content blockquote {
  border-left: 4px solid #667eea;
  margin: 0.5rem 0;
  padding: 0.5rem 0 0.5rem 1rem;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 0 4px 4px 0;
  font-style: italic;
}

.markdown-content a {
  color: #667eea;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.markdown-content a:hover {
  border-bottom-color: #667eea;
}

.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  text-align: left;
}

.markdown-content th {
  background: #f8fafc;
  font-weight: 600;
}

.markdown-content hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 1rem 0;
}

.markdown-content strong {
  font-weight: 600;
}

.markdown-content em {
  font-style: italic;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.6;
  text-align: right;
}

.user-message .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.ai-message .message-time {
  color: #64748b;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.thinking-text {
  font-style: italic;
  color: #64748b;
  font-size: 0.9rem;
}

.input-container {
  padding: 1.5rem 2rem 2rem 2rem;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  max-width: 100%;
}

.message-input {
  flex: 1;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  font-size: 1rem;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all 0.2s ease;
  line-height: 1.5;
  max-height: 120px;
  background: #f8fafc;
}

.message-input:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.message-input::placeholder {
  color: #94a3b8;
}

.send-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-button:active {
  transform: translateY(0);
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.send-icon {
  width: 20px;
  height: 20px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Custom scrollbar */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive design */
@media (max-width: 768px) {
  .chat-container {
    height: 100vh;
    border-radius: 0;
    max-width: 100%;
  }

  .chat-header {
    border-radius: 0;
    padding: 1rem;
  }

  .hints-section {
    padding: 0.75rem 1rem;
  }

  .header-content {
    gap: 0.75rem;
  }

  .header-text h2 {
    font-size: 1.25rem;
  }

  .ai-avatar {
    width: 40px;
    height: 40px;
  }

  .brain-icon {
    width: 20px;
    height: 20px;
  }

  .messages-list {
    padding: 1rem;
  }

  .message-bubble {
    max-width: 85%;
  }

  .input-container {
    padding: 1rem;
  }

  .input-wrapper {
    gap: 0.75rem;
  }

  .send-button {
    width: 44px;
    height: 44px;
  }

  .send-icon {
    width: 18px;
    height: 18px;
  }

  .hints-list {
    gap: 0.375rem;
  }

  .hint-btn {
    font-size: 0.8rem;
    padding: 0.375rem 0.75rem;
  }
}

@media (max-width: 480px) {
  .welcome-content {
    padding: 1rem;
  }

  .welcome-content h3 {
    font-size: 1.25rem;
  }

  .message-bubble {
    max-width: 90%;
  }
}
</style>
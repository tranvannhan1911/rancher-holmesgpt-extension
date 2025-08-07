<template>
  <div class="holmesgpt-page">
    <h2>🧠 AI Agent Assistant</h2>

    <div class="input-row">
      <input
        v-model="input"
        placeholder="Ask Agent something..."
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">Submit</button>
    </div>

    <div class="hint-row" v-if="showDefaultHint || dynamicHints.length > 0">
      <div class="hint-container">
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

    <div class="chat-box">
      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, i) in messages" :key="i" class="message">
          <span :class="msg.role">{{ msg.role }}:</span>
          <span>{{ msg.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const clusterId = route.params.cluster;

const resourceType = route.params.resource || 'pod';
const resourceId = route.params.id;
const namespace = route.params.namespace || 'default';
const cluster = route.params.cluster || 'local';
const product = route.params.product || '';

const input = ref('');
const messages = ref([]);
const history = ref([]);
const res_conversation_history = ref([]);
const workload_health_result = ref(null);

const API_URL = 'https://holmes.192.223.13.246.sslip.io/api/workload_health_chat';

const defaultHint = ref('Check workload health');
const dynamicHints = ref([]);
const showDefaultHint = ref(true);

function applyHint(hint) {
  input.value = hint;
  sendMessage();
}

async function sendMessage() {
  const messageText = input.value.trim();
  if (!messageText) return;

  messages.value.push({ role: 'user', text: messageText });
  history.value.push({ role: 'user', content: messageText });
  input.value = '';

  // Tắt default hint sau lần gửi đầu tiên
  showDefaultHint.value = false;

  const thinkingMsg = { role: 'ai', text: '💭 Agent is thinking...' };
  messages.value.push(thinkingMsg);

  try {
    const body = {
      ask: messageText,
      resource: {
        name: resourceId || 'my-deployment', // Use dynamic resourceId or fallback
        kind: resourceType.charAt(0).toUpperCase() + resourceType.slice(1), // Capitalize first letter
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

    dynamicHints.value = data.follow_up_actions || [];

    const thinkingIndex = messages.value.indexOf(thinkingMsg);
    if (thinkingIndex !== -1) {
      messages.value[thinkingIndex] = { ...thinkingMsg, text: reply };
    }

    history.value.push({ role: 'assistant', content: reply });
  } catch (error) {
    console.error(error);
    const thinkingIndex = messages.value.indexOf(thinkingMsg);
    if (thinkingIndex !== -1) {
      messages.value[thinkingIndex] = {
        ...thinkingMsg,
        text: '❌ Error: Could not reach N-TNT backend.'
      };
    }
  }
}
</script>

<style scoped>
.holmesgpt-page {
  padding: 1.5rem;
  font-family: sans-serif;
  max-width: 800px;
  margin: 0 auto;
}

.input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.input-row input {
  flex: 1;
  padding: 0.5rem;
  font-size: 1rem;
}

.input-row button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: #0275d8;
  color: white;
  border: none;
  border-radius: 5px;
}

.hint-row {
  margin-bottom: 10px;
  overflow-x: auto;
}

.hint-container {
  display: flex;
  gap: 8px;
  width: max-content;
}

.hint-btn {
  padding: 4px 8px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
  line-height: 11px;
  min-height: 11px;
}

.chat-box {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  height: 500px;
  overflow-y: auto;
  background: #f9f9f9;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message .user {
  color: blue;
  font-weight: bold;
}

.message .ai {
  color: green;
  font-weight: bold;
}
</style>
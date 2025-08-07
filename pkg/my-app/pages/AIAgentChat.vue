<template>
  <div class="holmesgpt-page">
    <h2>🧠 AI Agent Assistant</h2>

    <div class="chat-box">
      <div class="messages" ref="messagesContainer">
        <div v-for="(msg, i) in messages" :key="i" class="message">
          <span :class="msg.role">{{ msg.role }}:</span>
          <span>{{ msg.text }}</span>
        </div>
      </div>

      <textarea
        v-model="input"
        placeholder="Ask Agent something..."
        @keyup.enter="sendMessage"
      />

      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const clusterId = route.params.cluster;

const input = ref('');
const messages = ref([]);
const history = ref([]);
const res_conversation_history = ref([]);

const API_URL = 'https://holmes.192.223.13.246.sslip.io/api/chat';

async function sendMessage() {
  const messageText = input.value.trim();
  if (!messageText) return;

  // Add user message
  messages.value.push({ role: 'user', text: messageText });
  history.value.push({ role: 'user', content: messageText });
  input.value = '';

  // Add temporary AI "thinking" message
  const thinkingMsg = { role: 'ai', text: '💭 Agent is thinking...' };
  messages.value.push(thinkingMsg);

  try {
    const body = {
      ask: messageText
    };
    if (res_conversation_history.value.length > 0) {
      body.conversation_history = res_conversation_history.value;
    }
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const reply = data.analysis || '[No reply]';
    res_conversation_history.value = data.conversation_history || [];

    // Trigger reactive update
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
        text: '❌ Error: Could not reach HolmesGPT backend.'
      };
    }
  }
}
</script>

<style scoped>
.holmesgpt-page {
  padding: 1.5rem;
  font-family: sans-serif;
}

.chat-box {
  max-width: 700px;
  margin-top: 1rem;
}

.messages {
  background: #f9f9f9;
  padding: 1rem;
  margin-bottom: 1rem;
  height: 600px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.message {
  margin-bottom: 0.5rem;
}

.message .user {
  color: blue;
  font-weight: bold;
}

.message .ai {
  color: green;
  font-weight: bold;
}

textarea {
  width: 100%;
  height: 60px;
  resize: none;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  background: #0275d8;
  color: white;
  border: none;
  border-radius: 5px;
}
</style>
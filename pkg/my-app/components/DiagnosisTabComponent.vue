<template>
  <div class="holmesgpt-page">
    <h2>{{ resourceLabel }} Diagnosis</h2>

    <div class="diagnosis-box" v-if="response">
      <div v-html="response" />
    </div>

    <div v-if="loading">🔄 Analyzing {{ resourceLabel.toLowerCase() }} issues...</div>
    <div v-if="error" class="error">⚠️ {{ error }}</div>

    <button @click="fetchDiagnosis" :disabled="loading">
      Refresh Diagnosis
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import MarkdownIt from 'markdown-it';

const route = useRoute();

// Helper to extract resource info from path if not in params/query
function extractResourceFromPath(path) {
  // Example path: /dashboard/c/local/explorer/apps.deployment/test-1/notification#diagnosis-tab
  // Extract resourceType: apps.deployment, resourceId: test-1
  const match = path.match(/explorer\/(.*?)\/(.*?)\//);
  if (match) {
    return {
      resourceType: match[1],
      resourceId: match[2]
    };
  }
  return {};
}

// Try to get resource info from params, query, or path
let resourceType = route?.params?.resource || route?.query?.resource;
let resourceId = route?.params?.id || route?.query?.id;
let namespace = route?.params?.namespace || route?.query?.namespace || 'default';
let cluster = route?.params?.cluster || route?.query?.cluster || 'local';
let product = route?.params?.product || route?.query?.product || '';

// Defensive check for route.path
let routePath = '';
if (route && route.path) {
  routePath = route.path;
} else if (typeof window !== 'undefined') {
  routePath = window.location.pathname;
}

if (!resourceType || !resourceId) {
  const extracted = extractResourceFromPath(routePath);
  resourceType = resourceType || extracted.resourceType || 'pod';
  resourceId = resourceId || extracted.resourceId;
}

const API_URL = 'https://holmes.192.223.13.246.sslip.io/api/investigate';

const response = ref('');
const loading = ref(false);
const error = ref(null);
const md = new MarkdownIt();

const resourceLabel = computed(() => {
  // Capitalize first letter
  return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
});

async function fetchDiagnosis() {
  loading.value = true;
  error.value = null;
  response.value = '';

  try {
    // Construct subject with dynamic resource key
    const subject = {
      cluster,
      namespace,
      product,
      resource: resourceType,
      [resourceType]: resourceId, // e.g. pod: "error-pod", deployment: "my-deploy"
    };
    console.log('Diagnosis subject:', subject); // Debug log

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'Kubernetes',
        title: `${resourceLabel.value} Troubleshooting Request`,
        description: `Check if there are any issues in the ${resourceType} logs, events, or status within the last 24 hours. If no issues are found, just respond with "${resourceLabel.value} is healthy".`,
        subject,
        context: {},
        include_tool_calls: true
      })
    });

    const data = await res.json();
    const diagnosis = data?.analysis;

    if (diagnosis) {
      response.value = md.render(diagnosis);
    } else {
      response.value = md.render(`✅ ${resourceLabel.value} is healthy. No recent issues detected.`);
    }
  } catch (err) {
    console.error(err);
    error.value = '❌ Failed to connect to HolmesGPT API.';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchDiagnosis);
</script>

<style scoped>
.holmesgpt-page {
  padding: 1.5rem;
  font-family: sans-serif;
}

.diagnosis-box {
  background: #f6f8fa;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.diagnosis-box h3 {
  margin-bottom: 0.5rem;
}

.diagnosis-box :deep(h1) {
  font-size: 1.3rem;
  margin: 1rem 0 0.5rem;
}

.diagnosis-box :deep(h2) {
  font-size: 1.2rem;
  margin: 0.9rem 0 0.4rem;
}

.diagnosis-box :deep(h3) {
  font-size: 1.1rem;
  margin: 0.8rem 0 0.3rem;
}

.diagnosis-box :deep(h4) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.6rem 0 0.3rem;
}

.error {
  color: red;
  margin-top: 1rem;
}

button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #0275d8;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
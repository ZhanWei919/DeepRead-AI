<template>
  <div class="settings-panel" :class="{ open: isOpen }">
    <div class="settings-header">
      Settings
      <button class="settings-close" @click="$emit('close')">×</button>
    </div>
    <div class="settings-tabs">
      <div
        class="settings-tab"
        :class="{ active: activeTab === 'api' }"
        @click="activeTab = 'api'"
      >
        API Key
      </div>
    </div>
    <div class="settings-content">
      <div v-show="activeTab === 'api'" class="settings-section">
        <h3>API Configuration</h3>
        <div class="settings-item">
          <label for="api-key">LLM API Key (DeepSeek)</label>
          <input
            id="api-key"
            v-model="userApiKey"
            type="password"
            placeholder="Enter your DeepSeek API key"
          />
          <small
            >Your API key is stored locally in your browser and sent with each
            request to the LLM.</small
          >
        </div>
        <div class="settings-item">
          <button class="settings-button" @click="handleSaveApiKey">
            Save API Key
          </button>
          <button class="settings-button-clear" @click="handleClearApiKey">
            Clear API Key
          </button>
          <p v-if="apiKeyStatus" class="api-key-status">{{ apiKeyStatus }}</p>
        </div>
        <div class="settings-item">
          <label for="api-endpoint"
            >API Endpoint (Informational - currently fixed in backend)</label
          >
          <input
            id="api-endpoint"
            type="text"
            placeholder="https://api.deepseek.com"
            value="https://api.deepseek.com"
            disabled
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

defineProps<{
  isOpen: boolean;
}>();

defineEmits(["close"]);

const activeTab = ref("history"); // Default active tab
const selectedModel = ref("deepseek-chat"); // Default or loaded from settings
const temperatureValue = ref(0.7); // Default or loaded

// API Key specific state
const userApiKey = ref<string>("");
const apiKeyStatus = ref<string>("");

const LS_API_KEY_NAME = "deepseekUserApiKey"; // localStorage key name

// Load API Key on component mount
onMounted(() => {
  const storedApiKey = localStorage.getItem(LS_API_KEY_NAME);
  if (storedApiKey) {
    userApiKey.value = storedApiKey;
  }
});

const handleSaveApiKey = () => {
  if (userApiKey.value.trim()) {
    localStorage.setItem(LS_API_KEY_NAME, userApiKey.value.trim());
    apiKeyStatus.value = "API Key saved successfully!";
  } else {
    localStorage.removeItem(LS_API_KEY_NAME); // Clear if input is empty and saved
    apiKeyStatus.value = "API Key cleared (input was empty).";
  }
  setTimeout(() => {
    apiKeyStatus.value = "";
  }, 3000);
};

const handleClearApiKey = () => {
  localStorage.removeItem(LS_API_KEY_NAME);
  userApiKey.value = "";
  apiKeyStatus.value = "API Key cleared!";
  setTimeout(() => {
    apiKeyStatus.value = "";
  }, 3000);
};
</script>

<style scoped>
/* Styles copied directly from frontend_design.txt for .settings-panel section */

.settings-panel {
  position: fixed; /* Use fixed to overlay correctly */
  right: -400px; /* Start off-screen */
  top: 0;
  bottom: 0;
  width: 400px;
  background-color: white;
  border-left: 1px solid var(--apple-gray-2);
  transition: right 0.3s ease;
  z-index: 20; /* Ensure it's above PdfViewerPanel etc. but below AppNavbar if AppNavbar is higher */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent content overflow during transition */
}

.settings-panel.open {
  right: 0; /* Slide in */
}

.settings-header {
  padding: 15px;
  border-bottom: 1px solid var(--apple-gray-2);
  font-size: 16px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0; /* Prevent shrinking */
}

.settings-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--apple-gray-3);
  line-height: 1; /* Ensure button alignment */
  padding: 5px; /* Easier click target */
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--apple-gray-2);
  flex-shrink: 0; /* Prevent shrinking */
}

.settings-tab {
  flex: 1;
  text-align: center;
  padding: 12px;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--apple-gray-4); /* Default tab color */
  transition: all 0.2s;
}

.settings-tab:hover {
  background-color: var(--apple-gray-1);
}

.settings-tab.active {
  border-bottom-color: var(--apple-blue);
  color: var(--apple-blue);
  font-weight: 500; /* Make active tab slightly bolder */
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.settings-section {
  margin-bottom: 25px;
}

.settings-section h3 {
  font-size: 15px;
  margin-bottom: 10px;
  color: var(--apple-gray-4);
  font-weight: 600; /* Slightly bolder section titles */
}

.settings-item {
  margin-bottom: 15px;
}

.settings-item label {
  display: block;
  font-size: 13px;
  margin-bottom: 5px;
  color: var(--apple-gray-4);
}
.settings-item small {
  display: block;
  font-size: 11px;
  color: var(--apple-gray-3);
  margin-top: 4px;
}

.settings-item input[type="text"],
.settings-item input[type="password"],
.settings-item input[type="number"],
.settings-item select,
.settings-item textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--apple-gray-2);
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  color: var(--apple-gray-5);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.settings-item input:focus,
.settings-item select:focus,
.settings-item textarea:focus {
  border-color: var(--apple-blue);
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.2); /* Subtle focus ring */
}
.settings-item input:disabled {
  background-color: var(--apple-gray-1);
  cursor: not-allowed;
}

.settings-item textarea {
  min-height: 100px;
  resize: vertical;
  font-family: inherit; /* Ensure textarea uses the same font */
}

.settings-item input[type="range"] {
  width: calc(100% - 40px); /* Adjust width to make space for value display */
  vertical-align: middle;
  margin-right: 10px;
  cursor: pointer;
}
.temp-value-display {
  display: inline-block;
  width: 30px; /* Fixed width for the value */
  text-align: right;
  font-size: 13px;
  color: var(--apple-gray-4);
  vertical-align: middle;
}

.history-item {
  padding: 10px;
  border-bottom: 1px solid var(--apple-gray-2);
  cursor: pointer;
  transition: background-color 0.2s;
}
.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background-color: var(--apple-gray-1);
}

.history-item-title {
  font-weight: 500;
  margin-bottom: 3px;
  font-size: 14px; /* Match input font size */
  color: var(--apple-gray-5);
}

.history-item-date {
  font-size: 12px;
  color: var(--apple-gray-3);
}

.settings-button,
.settings-button-clear {
  padding: 8px 15px;
  border: 1px solid var(--apple-blue);
  background-color: var(--apple-blue);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  margin-right: 10px;
}
.settings-button:hover {
  background-color: var(--apple-blue-hover);
}
.settings-button-clear {
  background-color: transparent;
  color: var(--apple-blue);
  border: 1px solid var(--apple-blue);
}
.settings-button-clear:hover {
  background-color: rgba(0, 113, 227, 0.1);
}

.api-key-status {
  font-size: 13px;
  margin-top: 8px;
  color: var(--apple-gray-4);
}
</style>

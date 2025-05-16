<template>
  <div class="app-root">
    <div
      class="top-hover-area"
      @mouseenter="showNavbar"
      @mouseleave="scheduleNavbarHide"
    ></div>

    <AppNavbar
      :is-visible="isNavbarVisible"
      @open-settings="openSettingsPanel"
      @mouseenter="showNavbar"
      @mouseleave="scheduleNavbarHide"
    />

    <div class="main-container" :style="{ marginTop: mainContainerMarginTop }">
      <div class="pdf-viewer-flex-item">
        <PdfViewerPanel
          :pdf-source="pdfSource"
          :is-loading-pdf-processing="isLoadingPdfProcessing"
          :pdf-processing-error="pdfProcessingError"
          :selected-pdf-fragment="selectedPdfFragment"
          :is-pdf-processed="!!processedPdfText"
          :is-loading-mindmap="isLoadingMindmap"
          @file-selected="handleFileSelected"
          @process-pdf="handleProcessPdf"
          @text-selected="updateSelectedPdfFragment"
          @clear-selection="clearSelectedPdfFragment"
          @pdf-render-error="handlePdfRenderError"
          @pdf-loaded="
            (count) => {
              console.log('App.vue: PDF loaded with', count, 'pages');
            }
          "
          @generate-mindmap="handleGenerateMindmap"
        />
      </div>

      <div class="ai-chat-flex-item">
        <ChatPanel
          :messages="chatMessages"
          :is-loading-chat="isLoadingChat"
          :chat-error="chatError"
          :is-pdf-processed="!!processedPdfText"
          :selected-pdf-fragment="selectedPdfFragment"
          @send-message="handleSendMessage"
          @send-message-with-selection="handleSendMessageWithSelection"
        />
      </div>
    </div>

    <SettingsPanel :is-open="isSettingsPanelOpen" @close="closeSettingsPanel" />

    <div
      v-if="isMindmapModalVisible"
      class="modal-overlay"
      @click.self="closeMindmapModal"
    >
      <div class="modal-content">
        <button class="modal-close-button" @click="closeMindmapModal">
          &times;
        </button>
        <h3 class="modal-title">Generated Mind Map</h3>
        <div v-if="isLoadingMindmap" class="loading-spinner">
          Generating mind map, please wait...
        </div>
        <div v-if="mindmapError" class="mindmap-error-display">
          <p>Error generating mind map:</p>
          <pre>{{ mindmapError }}</pre>
        </div>
        <MermaidDiagram
          v-if="mermaidString && !isLoadingMindmap && !mindmapError"
          :graph-definition="mermaidString"
          class="mindmap-diagram-view"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onBeforeUnmount,
  // nextTick, // 保持，可能用到
  computed,
  onMounted,
} from "vue";
import { v4 as uuidv4 } from "uuid";
import {
  uploadPdfAndExtractText,
  chatWithContext,
  generateMindmap,
} from "./services/api"; // 引入 generateMindmap
import AppNavbar from "./components/AppNavbar.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import PdfViewerPanel from "./components/PdfViewerPanel.vue";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel.vue";
import MermaidDiagram from "./components/MermaidDiagram.vue"; // 引入 MermaidDiagram

// --- UI State ---
const isNavbarVisible = ref(false);
const isSettingsPanelOpen = ref(false);
let navbarHideTimeout: ReturnType<typeof setTimeout> | null = null;

// --- PDF Related State ---
const selectedFileForUpload = ref<File | null>(null);
const pdfSource = ref<string | ArrayBuffer | null>(null);
const processedPdfText = ref<string>("");
const selectedPdfFragment = ref<string>("");

// --- Chat Related State ---
const chatMessages = ref<ChatMessage[]>([]);
const isLoadingChat = ref<boolean>(false);
const chatError = ref<string>("");

// --- Global Loading/Error State ---
const isLoadingPdfProcessing = ref<boolean>(false);
const pdfProcessingError = ref<string>("");

// --- 思维导图相关状态 (Mind Map Related State) ---
const isLoadingMindmap = ref<boolean>(false);
const mermaidString = ref<string | null>(null);
const mindmapError = ref<string>("");
const isMindmapModalVisible = ref<boolean>(false);
// --- END: 思维导图相关状态 ---

// --- Computed Styles ---
const mainContainerMarginTop = computed(() =>
  isNavbarVisible.value ? "48px" : "0"
);

// --- Navbar Logic ---
const showNavbar = () => {
  if (navbarHideTimeout) {
    clearTimeout(navbarHideTimeout);
    navbarHideTimeout = null;
  }
  isNavbarVisible.value = true;
};

const scheduleNavbarHide = () => {
  if (navbarHideTimeout) clearTimeout(navbarHideTimeout);
  const HIDE_DELAY_MS = 400;
  navbarHideTimeout = setTimeout(() => {
    isNavbarVisible.value = false;
  }, HIDE_DELAY_MS);
};

// --- Settings Panel Logic ---
const openSettingsPanel = () => {
  isSettingsPanelOpen.value = true;
};
const closeSettingsPanel = () => {
  isSettingsPanelOpen.value = false;
};

// --- PDF Panel Event Handlers ---
const handleFileSelected = (file: File) => {
  selectedFileForUpload.value = file;
  if (
    pdfSource.value &&
    typeof pdfSource.value === "string" &&
    pdfSource.value.startsWith("blob:")
  ) {
    URL.revokeObjectURL(pdfSource.value);
  }
  pdfSource.value = URL.createObjectURL(file);
  processedPdfText.value = "";
  pdfProcessingError.value = "";
  chatMessages.value = [];
  chatError.value = "";
  selectedPdfFragment.value = "";
  isLoadingPdfProcessing.value = false;
  isLoadingChat.value = false;
  // 重置思维导图状态
  mermaidString.value = null;
  mindmapError.value = "";
  isLoadingMindmap.value = false;
  isMindmapModalVisible.value = false;
};

const handleProcessPdf = async () => {
  if (!selectedFileForUpload.value) return;
  isLoadingPdfProcessing.value = true;
  pdfProcessingError.value = "";
  processedPdfText.value = "";
  selectedPdfFragment.value = "";
  // 重置思维导图状态
  mermaidString.value = null;
  mindmapError.value = "";

  try {
    addMessageToChat(
      `Processing PDF "${selectedFileForUpload.value.name}"...`,
      "system"
    );
    const result = await uploadPdfAndExtractText(selectedFileForUpload.value);
    processedPdfText.value = result.extracted_text;
    if (
      chatMessages.value.length > 0 &&
      chatMessages.value[chatMessages.value.length - 1].text.includes(
        "Processing PDF"
      )
    ) {
      chatMessages.value.pop();
    }
    addMessageToChat(
      `PDF processed successfully. You can now ask questions about "${selectedFileForUpload.value.name}".`,
      "system"
    );
  } catch (error: any) {
    console.error("App.vue: Error processing PDF:", error);
    const errorMsg =
      error.message || "An unknown error occurred during PDF processing.";
    pdfProcessingError.value = errorMsg;
    if (
      chatMessages.value.length > 0 &&
      chatMessages.value[chatMessages.value.length - 1].text.includes(
        "Processing PDF"
      )
    ) {
      chatMessages.value.pop();
    }
    addMessageToChat(`Error processing PDF: ${errorMsg}`, "system");
    processedPdfText.value = "";
  } finally {
    isLoadingPdfProcessing.value = false;
  }
};

const updateSelectedPdfFragment = (text: string) => {
  selectedPdfFragment.value = text;
};

const clearSelectedPdfFragment = () => {
  selectedPdfFragment.value = "";
};

const handlePdfRenderError = (error: any) => {
  console.error("App.vue: PDF Rendering failed in viewer:", error);
  const errorMsg = error.message || "Unknown PDF render error";
  addMessageToChat(`Error rendering PDF in viewer: ${errorMsg}`, "system");
  pdfSource.value = null;
  selectedFileForUpload.value = null;
  processedPdfText.value = "";
  pdfProcessingError.value = `PDF Render Error: ${errorMsg}`;
  // 重置思维导图状态
  mermaidString.value = null;
  mindmapError.value = "";
};

// --- Chat Panel Event Handlers ---
const addMessageToChat = (
  text: string,
  sender: "user" | "ai" | "system",
  id?: string
) => {
  const messageId = id || uuidv4();
  chatMessages.value.push({ id: messageId, text, sender });
};

const handleSendMessage = async (userMessageText: string) => {
  const messageToSend = userMessageText.trim();
  if (!messageToSend || !processedPdfText.value || isLoadingChat.value) {
    if (!processedPdfText.value && messageToSend)
      addMessageToChat("Please process a PDF document first.", "system");
    return;
  }
  clearSelectedPdfFragment();
  addMessageToChat(messageToSend, "user");
  isLoadingChat.value = true;
  chatError.value = "";
  try {
    const response = await chatWithContext(
      messageToSend,
      processedPdfText.value
    );
    addMessageToChat(response.ai_response, "ai");
  } catch (error: any) {
    const errorMsg = error.message || "Failed to get AI response.";
    chatError.value = errorMsg;
    addMessageToChat(`Error: ${errorMsg}`, "system");
  } finally {
    isLoadingChat.value = false;
  }
};

const handleSendMessageWithSelection = async (userQuestion: string) => {
  const questionToSend = userQuestion.trim();
  if (
    !questionToSend ||
    !processedPdfText.value ||
    !selectedPdfFragment.value ||
    isLoadingChat.value
  ) {
    if (!processedPdfText.value && questionToSend)
      addMessageToChat("Please process a PDF document first.", "system");
    if (!selectedPdfFragment.value && questionToSend)
      addMessageToChat("No text selected in PDF for this query.", "system");
    return;
  }
  const userMessageWithContext = `Regarding the selected text ("${selectedPdfFragment.value.substring(
    0,
    100
  )}${
    selectedPdfFragment.value.length > 100 ? "..." : ""
  }"): \n${questionToSend}`;
  addMessageToChat(userMessageWithContext, "user");
  isLoadingChat.value = true;
  chatError.value = "";
  try {
    const specificUserQuery = `Based on the following selected text from the document: "${selectedPdfFragment.value}". Answer the question: "${questionToSend}"`;
    const response = await chatWithContext(
      specificUserQuery,
      processedPdfText.value
    );
    addMessageToChat(response.ai_response, "ai");
  } catch (error: any) {
    const errorMsg =
      error.message || "Failed to get AI response for selected text.";
    chatError.value = errorMsg;
    addMessageToChat(`Error: ${errorMsg}`, "system");
  } finally {
    isLoadingChat.value = false;
    clearSelectedPdfFragment();
  }
};

// --- 思维导图逻辑 (Mind Map Logic) ---
const handleGenerateMindmap = async () => {
  if (!processedPdfText.value) {
    mindmapError.value = "Cannot generate mind map: PDF text is not available.";
    addMessageToChat(
      "Error: PDF text not processed. Cannot generate mind map.",
      "system"
    );
    return;
  }

  isLoadingMindmap.value = true;
  mermaidString.value = null; // 先清空，避免显示旧图或错误图
  mindmapError.value = "";
  isMindmapModalVisible.value = true; // 打开模态框显示加载状态

  try {
    addMessageToChat("Generating mind map...", "system");
    const response = await generateMindmap(processedPdfText.value, "mermaid");

    // 检查响应和数据是否存在
    if (response && response.mindmap_data) {
      // 在这里添加 console.log 语句
      console.log("----------- LLM Raw Response Object -----------");
      console.log(JSON.parse(JSON.stringify(response))); // 打印整个响应对象（深拷贝以防后续修改影响日志）
      console.log("----------- Raw Mermaid Code from LLM -----------");
      console.log(response.mindmap_data);
      console.log("----------- End of Raw Mermaid Code -----------");

      // 尝试验证 Mermaid 代码是否以 'mindmap' 开头 (一个简单的检查)
      if (
        typeof response.mindmap_data === "string" &&
        response.mindmap_data.trim().startsWith("mindmap")
      ) {
        console.log("Mermaid code seems to start correctly with 'mindmap'.");
      } else {
        console.warn(
          "Warning: Mermaid code does NOT start with 'mindmap'. Received:",
          `"${response.mindmap_data.substring(0, 50)}..."`
        );
      }

      mermaidString.value = response.mindmap_data; // 将获取到的代码赋给 ref
      addMessageToChat(
        "Mind map generated successfully. Attempting to render...",
        "system"
      );
    } else {
      // 如果 response.mindmap_data 不存在或为空
      console.error(
        "App.vue: Received no mindmap_data or empty data from server.",
        response
      );
      throw new Error("Received empty or no mind map data from server.");
    }
  } catch (error: any) {
    console.error(
      "App.vue: Error during mind map generation or processing:",
      error
    );
    const errorMsg = error.message || "Failed to generate or process mind map.";
    mindmapError.value = errorMsg; // 在模态框中显示错误
    addMessageToChat(`Error generating mind map: ${errorMsg}`, "system");
    mermaidString.value = null; // 确保出错时不显示旧图
  } finally {
    isLoadingMindmap.value = false;
    // 如果最终没有有效的 mermaidString 并且有错误，确保模态框仍然可见以显示错误
    // 如果既没有 mermaidString 也没有错误（例如，API调用成功但返回空数据且已处理），则可以考虑是否关闭模态框
    if (
      !mermaidString.value &&
      !mindmapError.value &&
      isMindmapModalVisible.value
    ) {
      // addMessageToChat("No mind map data to display.", "system");
      // isMindmapModalVisible.value = false; // 或者保持打开让用户知道什么都没发生
    }
  }
};

const closeMindmapModal = () => {
  isMindmapModalVisible.value = false;
  // 可选: 关闭模态框时是否清除数据
  // mermaidString.value = null;
  // mindmapError.value = "";
};
// --- END: 思维导图逻辑 ---

// --- Lifecycle Hooks ---
onMounted(() => {
  console.log("App.vue: App mounted.");
});

onBeforeUnmount(() => {
  if (
    pdfSource.value &&
    typeof pdfSource.value === "string" &&
    pdfSource.value.startsWith("blob:")
  ) {
    URL.revokeObjectURL(pdfSource.value);
  }
});
</script>

<style>
:root {
  --apple-gray-1: #f5f5f7;
  --apple-gray-2: #d2d2d7;
  --apple-gray-3: #86868b;
  --apple-gray-4: #424245;
  --apple-gray-5: #1d1d1f;
  --apple-blue: #0071e3;
  --apple-blue-hover: #0077ed;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    Roboto, Helvetica, Arial, sans-serif;
}

html,
body,
.app-root {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-root {
  color: var(--apple-gray-5);
  background-color: white;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  position: relative;
}

.top-hover-area {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  z-index: 35;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  transition: margin-top 0.3s ease;
}

.pdf-viewer-flex-item {
  flex-grow: 7;
  flex-shrink: 1;
  flex-basis: 0%;
  min-width: 300px;
  position: relative;
  overflow: hidden;
  display: flex;
}

.ai-chat-flex-item {
  flex-grow: 3;
  flex-shrink: 1;
  flex-basis: 0%;
  min-width: 300px;
  position: relative;
  overflow: hidden;
  border-left: 1px solid var(--apple-gray-2);
  display: flex;
}

.katex {
  font-size: 1em;
}

/* --- 简易模态框样式 --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* 确保在最上层 */
}

.modal-content {
  background-color: white;
  padding: 25px 30px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  /* 增大模态框尺寸 */
  width: 90vw; /* 尝试占据视口宽度的 85% */
  height: 90vh;
  max-width: 1400px; /* 最大宽度不超过 1400px */
  max-height: 95vh; /* 最大高度为视口的90% */
  overflow-y: hidden; /* 我们希望内容（包括标题和图表）在模态框内部滚动，而不是模态框本身出现滚动条 */
  position: relative;
  display: flex;
  flex-direction: column; /* 使标题和思维导图视图垂直排列 */
}

.modal-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--apple-gray-5);
  font-size: 1.5em;
  flex-shrink: 0; /* 防止标题被压缩 */
}

.modal-close-button {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 28px;
  font-weight: bold;
  color: var(--apple-gray-3);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.modal-close-button:hover {
  color: var(--apple-gray-5);
}

.loading-spinner {
  text-align: center;
  padding: 20px;
  color: var(--apple-gray-4);
  font-size: 1.1em;
  flex-grow: 1; /* 如果是加载状态，让它占据剩余空间并居中 */
  display: flex;
  justify-content: center;
  align-items: center;
}

.mindmap-error-display {
  color: red;
  background-color: #ffeeee;
  padding: 15px;
  border: 1px solid red;
  border-radius: 4px;
  margin-bottom: 15px;
  flex-shrink: 0; /* 防止错误信息被压缩 */
  max-height: 30%; /* 限制错误信息最大高度 */
  overflow-y: auto;
}
.mindmap-error-display pre {
  white-space: pre-wrap;
  word-break: break-all;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 3px;
  margin-top: 5px;
}

.mindmap-diagram-view {
  width: 100%; /* 占据模态框内容的全部宽度 */
  flex-grow: 1; /* 占据模态框内剩余的全部垂直空间 */
  min-height: 400px; /* 确保即使内容少，也有一个合理的最小高度 */
  overflow: hidden; /* MermaidDiagram 组件内部的 .mermaid-diagram-container 会处理滚动 */
  display: flex; /* 使用 flex 确保子元素（MermaidDiagram的根）能正确填充 */
  justify-content: center; /* 如果子元素比此容器小，则水平居中 */
  align-items: center; /* 如果子元素比此容器小，则垂直居中 */
}
/* --- END: 简易模态框样式 --- */
</style>

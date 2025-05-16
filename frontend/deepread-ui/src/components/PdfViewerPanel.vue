<template>
  <div class="pdf-viewer">
    <div class="pdf-toolbar">
      <input
        ref="fileInputRef"
        type="file"
        accept=".pdf"
        :disabled="props.isLoadingPdfProcessing"
        style="display: none"
        @change="onFileSelected"
      />
      <button
        :disabled="props.isLoadingPdfProcessing"
        title="Upload new PDF"
        @click="triggerFileInput"
      >
        Upload PDF
      </button>
      <button
        :disabled="!localSelectedFile || props.isLoadingPdfProcessing"
        title="Extract text from current PDF"
        @click="emitProcessPdf"
      >
        <span v-if="!props.isLoadingPdfProcessing">Process PDF</span>
        <span v-else>Processing...</span>
      </button>

      <button
        :disabled="!props.isPdfProcessed || props.isLoadingMindmap"
        title="Generate Mind Map from processed PDF text"
        class="pdf-controls"
        @click="emitGenerateMindmap"
      >
        <span v-if="!props.isLoadingMindmap">Generate Mind Map</span>
        <span v-else>Generating Map...</span>
      </button>
      <span v-if="pageCount > 0" style="font-size: 12px; margin-left: 10px">
        {{ pageCount }} pages total
      </span>
      <span
        v-if="props.isLoadingPdfProcessing"
        class="status-indicator loading"
      >
        Processing...
      </span>
      <span
        v-if="props.pdfProcessingError"
        class="status-indicator error"
        :title="props.pdfProcessingError"
      >
        Error
      </span>
      <span v-if="fileName" class="file-name-display" :title="fileName">
        {{ fileName }}
      </span>
    </div>

    <div ref="pdfContainerRef" class="pdf-container">
      <div
        v-if="!props.pdfSource && !props.isLoadingPdfProcessing"
        class="pdf-placeholder"
      >
        Upload or drag a PDF file here
      </div>
      <vue-pdf-embed
        v-if="props.pdfSource"
        ref="pdfEmbedRef"
        :key="pdfRenderKey"
        :source="props.pdfSource"
        :scale="pdfRenderScale"
        class="pdf-content"
        :text-layer="true"
        annotation-layer
        @rendered="onPdfRendered"
        @rendering-failed="onPdfError"
        @loaded="onPdfLoaded"
        @password-requested="handlePasswordRequest"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  computed,
  nextTick,
} from "vue";
import VuePdfEmbed from "vue-pdf-embed";
import "vue-pdf-embed/dist/styles/textLayer.css";
import "vue-pdf-embed/dist/styles/annotationLayer.css";

// --- Debounce Function ---
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// --- Props and Emits ---
interface Props {
  pdfSource: string | ArrayBuffer | null;
  isLoadingPdfProcessing: boolean;
  pdfProcessingError: string;
  selectedPdfFragment: string;
  isPdfProcessed: boolean;
  isLoadingMindmap: boolean;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "file-selected", file: File): void;
  (e: "process-pdf"): void;
  (e: "text-selected", text: string): void;
  (e: "clear-selection"): void;
  (e: "pdf-render-error", error: any): void;
  (e: "pdf-loaded", pageCount: number): void;
  (e: "generate-mindmap"): void;
}>();

// --- Refs ---
const localSelectedFile = ref<File | null>(null);
const pdfContainerRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const pdfEmbedRef = ref<any>(null); // vue-pdf-embed instance
let resizeObserver: ResizeObserver | null = null;

// --- State ---
const pdfRenderScale = ref<number>(1.0);
const pageCount = ref<number>(0);
const pdfOriginalPageSize = ref<{ width: number; height: number } | null>(null);
const isInitialFitAttempted = ref(false);
const pdfRenderKey = ref(0);

const fileName = computed(() => localSelectedFile.value?.name || "");

// --- File Handling ---
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    localSelectedFile.value = file;
    pageCount.value = 0;
    pdfRenderScale.value = 1.0;
    pdfOriginalPageSize.value = null;
    isInitialFitAttempted.value = false;
    pdfRenderKey.value++;
    emit("file-selected", file);
    emit("clear-selection");
  }
  if (input) input.value = "";
};

const emitProcessPdf = () => {
  if (localSelectedFile.value) {
    emit("process-pdf");
  }
};

const emitGenerateMindmap = () => {
  emit("generate-mindmap");
};

// --- PDF Lifecycle Callbacks ---
const onPdfLoaded = async (pdfProxy: any) => {
  pageCount.value = pdfProxy.numPages;
  emit("pdf-loaded", pageCount.value);
  try {
    const page = await pdfProxy.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    pdfOriginalPageSize.value = {
      width: viewport.width,
      height: viewport.height,
    };
    await nextTick();
    applyFitWidth(true);
  } catch (error) {
    emit("pdf-render-error", error);
    pdfRenderScale.value = 1.0;
    isInitialFitAttempted.value = true;
  }
};

const onPdfRendered = () => {
  if (
    !isInitialFitAttempted.value &&
    pdfOriginalPageSize.value &&
    pdfRenderScale.value > 0.01
  ) {
    isInitialFitAttempted.value = true;
  }
};

const onPdfError = (error: any) => {
  if (error?.name === "PasswordException") return;
  pageCount.value = 0;
  pdfOriginalPageSize.value = null;
  isInitialFitAttempted.value = false;
  emit("pdf-render-error", error);
};

const handlePasswordRequest = (value: any) => {
  if (typeof value?.callback !== "function") {
    emit(
      "pdf-render-error",
      new Error("Internal error handling password request.")
    );
    return;
  }
  const callback = value.callback as (password: string) => void;
  const reason = typeof value?.reason === "string" ? value.reason : undefined;
  let promptMessage = "PDF is password protected. Please enter password:";
  if (reason === "incorrect_password") {
    promptMessage = "PDF password incorrect. Please try again:";
  }
  const password = prompt(promptMessage);
  if (password !== null && password !== "") {
    callback(password);
  } else {
    emit("pdf-render-error", new Error("Password entry cancelled or empty."));
    pageCount.value = 0;
    pdfOriginalPageSize.value = null;
  }
};

// --- PDF Fit Logic ---
const calculateFitWidthScale = (): number | null => {
  if (
    !pdfContainerRef.value ||
    !pdfOriginalPageSize.value?.width ||
    pdfOriginalPageSize.value.width <= 0
  ) {
    return null;
  }
  const containerStyle = window.getComputedStyle(pdfContainerRef.value);
  const hPadding =
    parseFloat(containerStyle.paddingLeft) +
    parseFloat(containerStyle.paddingRight);
  const availableWidth = Math.max(
    1,
    pdfContainerRef.value.clientWidth - hPadding
  );
  const marginFactor = 1.0;
  if (availableWidth <= 0) return null;
  return (availableWidth / pdfOriginalPageSize.value.width) * marginFactor;
};

const applyFitWidth = (isInitialCall = false) => {
  if (!pdfOriginalPageSize.value) {
    if (isInitialCall) {
      pdfRenderScale.value = 1.0;
      isInitialFitAttempted.value = true;
    }
    return;
  }
  const newScale = calculateFitWidthScale();
  if (newScale !== null && isFinite(newScale) && newScale > 0.01) {
    const scaleDifference = Math.abs(pdfRenderScale.value - newScale);
    if (isInitialCall || scaleDifference > 0.01) {
      pdfRenderScale.value = newScale;
    }
  } else if (isInitialCall) {
    pdfRenderScale.value = 1.0;
  }
  if (isInitialCall) {
    isInitialFitAttempted.value = true;
  }
};

const DEBOUNCE_DELAY = 350;
const debouncedHandleResize = debounce(() => {
  if (
    props.pdfSource &&
    pdfOriginalPageSize.value &&
    isInitialFitAttempted.value
  ) {
    applyFitWidth(false);
  }
}, DEBOUNCE_DELAY);

// --- Text Selection Logic ---
const isSelectionWithinElement = (
  selection: Selection | null,
  container: HTMLElement | null
): boolean => {
  if (!selection || !container || !selection.rangeCount) return false;
  const range = selection.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;
  while (node) {
    if (node === container) return true;
    if (node === document.body || node === document) break;
    node = node.parentNode;
  }
  return false;
};

const handleTextSelection = () => {
  if (!pdfContainerRef.value || !props.pdfSource) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const selectedText = selection.toString().trim();
  if (selectedText !== "") {
    if (isSelectionWithinElement(selection, pdfContainerRef.value)) {
      emit("text-selected", selectedText);
    }
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  document.addEventListener("mouseup", handleTextSelection);
  if (pdfContainerRef.value) {
    resizeObserver = new ResizeObserver(debouncedHandleResize);
    resizeObserver.observe(pdfContainerRef.value);
  } else {
    watch(pdfContainerRef, (newVal) => {
      if (newVal && !resizeObserver) {
        resizeObserver = new ResizeObserver(debouncedHandleResize);
        resizeObserver.observe(newVal);
      }
    });
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("mouseup", handleTextSelection);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// --- Watchers ---
watch(
  () => props.pdfSource,
  (newSource, oldSource) => {
    if (!newSource && oldSource) {
      localSelectedFile.value = null;
      pageCount.value = 0;
      pdfOriginalPageSize.value = null;
      pdfRenderScale.value = 1.0;
      isInitialFitAttempted.value = false;
      pdfRenderKey.value++;
      emit("clear-selection");
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (pdfContainerRef.value && !resizeObserver) {
        resizeObserver = new ResizeObserver(debouncedHandleResize);
        resizeObserver.observe(pdfContainerRef.value);
      }
    }
  }
);

watch(
  () => props.selectedPdfFragment,
  (newFragment, oldFragment) => {
    if (newFragment === "" && oldFragment !== "") {
      // const selection = window.getSelection();
      // if (selection && selection.toString().trim() === oldFragment) {
      //   // window.getSelection()?.removeAllRanges(); // Consider if this is needed
      // }
    }
  }
);
</script>

<style scoped>
/* ... (现有样式保持不变) ... */
.pdf-viewer {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--apple-gray-1);
}

.pdf-toolbar {
  padding: 10px 15px;
  border-bottom: 1px solid var(--apple-gray-2);
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  gap: 8px 10px; /* 按钮之间的间距 */
  align-items: center;
  background-color: white;
  flex-shrink: 0; /* 防止工具栏在 flex 布局中被压缩 */
}

.pdf-toolbar button {
  background: none;
  border: 1px solid var(--apple-gray-2);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.pdf-toolbar button:hover:not(:disabled) {
  background-color: var(--apple-gray-1);
  border-color: var(--apple-gray-3);
}
.pdf-toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 使 .pdf-controls class (用于思维导图按钮) 具有和其他按钮一样的样式 */
.pdf-controls {
  /* 样式已通过 button 标签继承，这里可以为空或添加特定样式 */
}

.pdf-toolbar span {
  font-size: 12px;
  color: var(--apple-gray-4);
  white-space: nowrap;
  vertical-align: middle;
}

.status-indicator {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  vertical-align: middle;
}
.status-indicator.loading {
  background-color: rgba(0, 113, 227, 0.1);
  color: var(--apple-blue);
}
.status-indicator.error {
  background-color: rgba(215, 56, 71, 0.1);
  color: #d73847;
  cursor: help;
}
.file-name-display {
  font-size: 12px;
  color: var(--apple-gray-3);
  margin-left: 10px; /* 如果希望它在行尾，需要更复杂的 flex 布局或绝对定位 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px; /* 根据需要调整 */
  vertical-align: middle;
}

.pdf-container {
  flex: 1;
  overflow: auto; /* 允许PDF内容滚动 */
  padding: 20px; /* 内边距，让PDF不要贴边 */
  display: flex; /* 用于居中PDF内容 */
  justify-content: center; /* 水平居中 */
  align-items: flex-start; /* 垂直方向从顶部开始（如果PDF比容器矮） */
  background-color: var(--apple-gray-1); /* 背景色 */
}

.pdf-placeholder {
  width: 80%;
  max-width: 800px;
  margin: auto; /* 确保在 flex 容器内也居中 */
  padding: 50px 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--apple-gray-3);
  font-size: 18px;
  text-align: center;
}

.pdf-content {
  /* This class is on the <vue-pdf-embed> component itself */
  margin: 0 auto; /* 对于块级元素，这会使其在父元素中水平居中 */
  display: block; /* vue-pdf-embed 的根元素可能是内联的，确保是块级 */
  width: 100%; /* 使组件占据其计算出的宽度（基于scale和原始尺寸），并受限于max-width */
  max-width: 100%; /* 确保它不会超出 .pdf-container 的 padding box */
  height: auto; /* 高度自适应 */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  user-select: text; /* 允许在PDF内容上选择文本 */
}

/* Deep styles to ensure internal canvas and textLayer fill the .pdf-content area correctly */
:deep(.pdf-content canvas) {
  width: 100% !important; /* 强制 canvas 宽度与 vue-pdf-embed 组件的宽度一致 */
  height: auto !important; /* 高度自适应 */
  display: block !important; /* 移除 canvas 可能有的底部空间 */
  max-width: none !important; /* 移除可能存在的最大宽度限制 */
}

:deep(.pdf-content .textLayer) {
  width: 100% !important; /* 文本层宽度与 canvas 一致 */
  height: auto !important; /* 文本层高度与 canvas 一致 */
  max-width: none !important;
  /* 确保文本层覆盖在 canvas 之上 */
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0.2; /* PDF.js 默认的文本层样式 */
  user-select: text !important;
  cursor: text;
}

/* 其他文本选择相关的深层样式 */
:deep(.vue-pdf-embed .textLayer::selection) {
  background: rgba(0, 113, 227, 0.4); /* 选中文本的背景色 */
}
:deep(.vue-pdf-embed .textLayer > span) {
  cursor: text;
  user-select: text !important;
  /* position and other styles are usually handled by pdf.js textLayer builder */
}
:deep(.vue-pdf-embed .annotationLayer) {
  pointer-events: none; /* 允许点击穿透到文本层 */
  /* position, left, top are usually handled by pdf.js annotationLayer builder */
  left: 0;
  top: 0;
}
:deep(.vue-pdf-embed .annotationLayer > section) {
  pointer-events: auto; /* 允许与注释交互，例如链接 */
}
:deep(.vue-pdf-embed .annotationLayer .linkAnnotation > a) {
  pointer-events: auto; /* 确保链接可点击 */
}
</style>

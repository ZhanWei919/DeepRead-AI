<template>
  <div class="mermaid-diagram-container">
    <div v-if="renderError" class="mermaid-error">
      <p>抱歉，渲染思维导图时出错：</p>
      <pre>{{ renderError }}</pre>
      <p>原始 Mermaid 代码：</p>
      <pre>{{ graphDefinition }}</pre>
    </div>
    <div v-show="!renderError">
      <div ref="mermaidContainer" class="mermaid"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import mermaid from "mermaid";

interface Props {
  graphDefinition: string;
}

const props = defineProps<Props>();

const mermaidContainer = ref<HTMLDivElement | null>(null);
const renderError = ref<string | null>(null);
let uniqueIdCounter = 0; // To ensure unique IDs for mermaid diagrams if multiple are rendered

onMounted(() => {
  // 初始化 Mermaid
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral", // 或者 'default', 'forest', 'dark', 'neutral'
    // securityLevel: 'loose',
    // logLeve: 'debug',
  });
  renderDiagram();
});

watch(
  () => props.graphDefinition,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      // 等待 DOM 更新，确保容器存在且内容（如果直接插入）已更新
      await nextTick();
      renderDiagram();
    } else if (!newVal) {
      clearDiagram();
    }
  },
  { immediate: false } // 不在初始挂载时立即运行，onMounted 会处理
);

const clearDiagram = () => {
  if (mermaidContainer.value) {
    mermaidContainer.value.innerHTML = ""; // 清空之前的图表
  }
  renderError.value = null;
};

const renderDiagram = async () => {
  if (!props.graphDefinition || !mermaidContainer.value) {
    clearDiagram();
    return;
  }

  renderError.value = null;
  // 确保每次渲染的 ID 是唯一的，以避免 Mermaid 内部冲突
  const diagramId = `mermaid-graph-${uniqueIdCounter++}`;

  try {
    mermaidContainer.value.innerHTML = ""; // 清理旧图
    const tempDiv = document.createElement("div");
    tempDiv.className = "mermaid-render-source"; // 给一个class，虽然mermaid主要看class="mermaid"
    tempDiv.textContent = props.graphDefinition;
    mermaidContainer.value.appendChild(tempDiv);

    mermaidContainer.value.innerHTML = props.graphDefinition; // 直接设置原始字符串

    await mermaid.run({
      nodes: [mermaidContainer.value], // 指定要渲染的节点
    });
  } catch (e: any) {
    console.error("Mermaid rendering error (raw object):", e); // 打印原始错误对象

    let detailedErrorMessage = "Unknown error during Mermaid rendering.";
    if (e) {
      if (e.message && typeof e.message === "string") {
        detailedErrorMessage = `Message: ${e.message}`;
      } else if (e.str && typeof e.str === "string") {
        // Mermaid 有时将错误信息放在 e.str
        detailedErrorMessage = `Details: ${e.str}`;
      } else if (typeof e === "string") {
        detailedErrorMessage = e;
      } else {
        // 尝试更全面地序列化错误对象
        try {
          // Object.getOwnPropertyNames(e) 可以帮助获取非标准的错误属性
          detailedErrorMessage = `Error Object: ${JSON.stringify(
            e,
            Object.getOwnPropertyNames(e),
            2
          )}`;
        } catch (jsonError) {
          detailedErrorMessage =
            "Mermaid error object could not be stringified, and no .message or .str property found.";
        }
      }
    }

    console.error(
      "Mermaid rendering error (processed for UI):",
      detailedErrorMessage
    );
    renderError.value = detailedErrorMessage; // 将更详细的错误信息传递给UI
  }
};
</script>

<style scoped>
.mermaid-diagram-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto; /* 如果思维导图很大，允许滚动 */
}

/* 默认情况下，Mermaid 会将其内容直接放入 .mermaid 元素 */
.mermaid {
  display: block; /* Mermaid 自己会处理 */
  width: 100%; /* 让 Mermaid 自适应内容 */
  height: auto;
  text-align: center; /* 让SVG在其容器内居中 */
  /* 如果内容是SVG，它自己会有尺寸 */
}

/* 如果 Mermaid 生成的 SVG 超出其容器，可以这样处理：*/
:deep(.mermaid svg) {
  max-width: 100%;
  height: auto; /* 保持宽高比 */
  display: block; /* 移除SVG下方的额外空间 */
  margin: 0 auto; /* 居中SVG */
  min-width: 1300px; /* 最小宽度，避免过小 */
}

.mermaid-error {
  color: red;
  background-color: #ffeeee;
  padding: 15px;
  border: 1px solid red;
  border-radius: 4px;
  max-width: 80%;
  overflow: auto;
}

.mermaid-error pre {
  white-space: pre-wrap;
  word-break: break-all;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 3px;
  margin-top: 5px;
}
</style>

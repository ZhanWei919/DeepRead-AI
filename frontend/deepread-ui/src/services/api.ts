import axios from "axios";

const LS_API_KEY_NAME = "deepseekUserApiKey"; // 与 SettingsPanel.vue 中一致

// 端口号需要与后端 FastAPI 启动的端口一致
const FASTAPI_PORT = 8008; // 您可以根据需要更改此端口
// API 基础 URL 修改为绝对路径
const API_BASE_URL = `http://127.0.0.1:${FASTAPI_PORT}/api`; // FastAPI 路由已经包含了 /api

const apiClient = axios.create({
  baseURL: API_BASE_URL, // 例如: http://127.0.0.1:8008/api
  headers: {
    "Content-Type": "application/json",
  },
});

// 添加请求拦截器，用于动态添加 API Key 到请求头
apiClient.interceptors.request.use(
  (config) => {
    // 定义需要 API Key 的路径前缀或特定路径
    const requiresApiKeyPaths = [
      "/llm/summarize",
      "/llm/chat_with_context",
      "/pdf/generate_mindmap", // 假设这个也需要LLM
    ];

    // 检查当前请求的 URL 是否需要 API Key
    const needsApiKey = requiresApiKeyPaths.some((path) =>
      config.url?.startsWith(path)
    );

    if (needsApiKey) {
      const userApiKey = localStorage.getItem(LS_API_KEY_NAME);
      if (userApiKey) {
        config.headers["X-User-API-Key"] = userApiKey;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 定义 API 函数
export const uploadPdfAndExtractText = async (
  file: File
): Promise<{ filename: string; extracted_text: string; message?: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await apiClient.post("/pdf/extract-text", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading PDF and extracting text:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to extract text from PDF"
      );
    }
    throw new Error("An unexpected error occurred while extracting text.");
  }
};

export const summarizeText = async (
  text: string
): Promise<{ summary: string }> => {
  try {
    const response = await apiClient.post("/llm/summarize", { text });
    return response.data;
  } catch (error) {
    console.error("Error summarizing text:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || "Failed to summarize text");
    }
    throw new Error("An unexpected error occurred while summarizing text.");
  }
};

export const chatWithContext = async (
  userQuery: string,
  documentContext: string
): Promise<{ ai_response: string }> => {
  try {
    const response = await apiClient.post("/llm/chat_with_context", {
      user_query: userQuery,
      document_context: documentContext,
    });
    return response.data;
  } catch (error) {
    console.error("Error in chatWithContext API:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail ||
          "Failed to get response from AI with context"
      );
    }
    throw new Error(
      "An unexpected error occurred while chatting with context."
    );
  }
};

export const generateMindmap = async (
  documentText: string,
  outputFormat: "mermaid" | "json" = "mermaid"
): Promise<{ mindmap_data: string; format_used: string }> => {
  try {
    const response = await apiClient.post("/pdf/generate_mindmap", {
      document_text: documentText,
      output_format: outputFormat,
    });
    return response.data;
  } catch (error) {
    console.error("Error generating mindmap:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to generate mindmap"
      );
    }
    throw new Error("An unexpected error occurred while generating mindmap.");
  }
};

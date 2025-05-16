# DeepRead AI 

[![许可证](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**DeepRead AI 是一款基于 AI 的智能文献阅读助手，旨在帮助用户更高效地阅读、理解和管理学术文献。它结合了 PDF 解析、大语言模型交互和思维导图生成等功能，提供一站式的文献处理体验。**

![86793c094294ed1585c6c23473fe39d](https://github.com/user-attachments/assets/93efac89-b27d-48b7-a1a9-22e59b28f7cb)  

![f8e56d6f67e0f92407a90a7161554d4](https://github.com/user-attachments/assets/22ee064c-3438-4f06-8444-8819264439b6)



## ✨ 主要特性 (Features)

* **📄 PDF 文档处理**：轻松上传并解析 PDF 文档，提取文本内容。
* **💬 智能问答与上下文聊天**：基于上传的文献内容，与 AI 进行智能对话，深入理解文献细节。
* **💡 AI 文本摘要**：快速生成文献核心内容的摘要。
* **🧠 思维导图生成**：自动从文献内容生成结构化的思维导图 (支持 Mermaid 格式)，帮助梳理文献脉络。
* **🔑 用户自定义 API Key**：允许用户在前端直接输入自己的大语言模型 API Key，增强灵活性和隐私性。
* **🖥️ 跨平台桌面应用**：通过 Electron 打包，可在 Windows (可能还有 macOS, Linux，取决于你的打包目标) 上运行。

## 🛠️ 技术栈 (Tech Stack)

* **前端 (Frontend)**: Vue 3 (使用 `<script setup lang="ts">`), TypeScript, Axios
* **后端 (Backend)**: FastAPI (Python), Uvicorn, Pydantic, Pypdf
* **AI 模型**: DeepSeek API （DeepSeek API兼容Open AI API，所以理论上，可以使用GPT API）
* **桌面应用框架 (Desktop App Framework)**: Electron
* **打包工具 (Packaging)**: PyInstaller (用于后端), Electron Builder (用于桌面应用)

## 🚀 安装与运行 (Installation & Usage)

### 1. 下载预编译版本 (推荐给普通用户)

你可以从项目的 [Releases 页面](https://github.com/<你的GitHub用户名>/<你的仓库名>/releases) 下载最新的预编译安装包 (例如 `.exe` for Windows)。

目前只提供Windows版，你可以自行打包Mac版。

### 2. 从源代码运行 (适合开发者)

如果你希望从源代码运行或进行二次开发，请按照以下步骤操作：

**先决条件:**

* [Node.js](https://nodejs.org/) (建议 LTS 版本，包含 npm)
* [Python](https://www.python.org/downloads/) (建议 3.8 或更高版本，包含 pip)
* (可选) [Git](https://git-scm.com/) (用于克隆仓库)

**步骤:**

1.  **克隆仓库 (或下载源代码):**

	```bash
	git clone [https://github.com/](https://github.com/)<你的GitHub用户名>/<你的仓库名>.git
	cd <你的仓库名>
	```

2.  **安装后端依赖:**

	```bash
	cd backend
	python -m venv venv  # 创建虚拟环境 (推荐)
	# Windows
	venv\Scripts\activate
	# macOS/Linux
	# source venv/bin/activate
	pip install -r requirements.txt # 确保你有一个 requirements.txt 文件
	cd ..
	```

	* **重要**: 你需要在 `backend/.env` 文件中配置你的 DeepSeek API Key (或其他 LLM API Key)。可以复制 `backend/.env.example` (如果提供了) 并重命名为 `.env`，然后填入你的密钥。

		```
		DEEPSEEK_API_KEY=your_actual_api_key_here
		```

3.  **安装前端和 Electron 依赖:**

	```bash
	# 在项目根目录
	npm install
	
	# 进入前端目录安装前端特定依赖
	cd frontend/deepread-ui
	npm install
	cd ../..
	```

4.  **运行开发环境:**

	* **启动后端 FastAPI 服务:**
		打开一个新的命令行窗口，激活后端的 Python 虚拟环境，然后：

		```bash
		cd backend
		# (venv)
		python main.py
		```

		后端服务通常会运行在 `http://127.0.0.1:8001` (或你在代码中配置的端口)。

	* **启动 Electron 应用 (它会自动加载前端并与后端通信):**
		在项目根目录的另一个命令行窗口中运行：

		```bash
		npm start
		```

		*注意：`electron/main.js` 和 `frontend/src/services/api.ts` 中的后端端口号需要与你实际运行的后端服务端口一致。*

### 基本使用

1.  启动 DeepRead AI 应用。
2.  (可选，如果未在后端配置) 在设置中输入你的 AI 模型 API Key。
3.  上传你想要阅读的 PDF 文献。
4.  等待文本提取完成。
5.  你可以：
	* 与 AI 就文献内容进行提问和讨论。
	* 让 AI 生成文献摘要。
	* 让 AI 生成文献的思维导图。

## 📦 打包应用 (Packaging)

如果你想自己从源代码打包桌面应用：

1.  确保所有开发依赖已安装。

2.  确保你的 `.env` (如果后端仍然依赖) 或其他必要配置已就绪。

3.  在项目根目录运行打包脚本 (具体脚本取决于你的 `package.json` 配置，例如)：

	```bash
	# 打包所有平台 (根据 package.json build 配置)
	npm run dist
	
	# 或仅打包 Windows 版本
	npm run dist:win
	```

	打包好的安装程序通常会输出到 `electron_releases/` 目录。

## 🤝 贡献指南 (Contributing)

我们非常欢迎你为 DeepRead AI 做出贡献！你可以通过以下方式参与：

* 报告 Bug (Submit bugs and feature requests)
* 提交代码 (Submit pull requests)
* 改进文档 (Improve documentation)

请在提交 Pull Request 前先阅读我们的贡献指南 (如果项目壮大后可以创建一个 `CONTRIBUTING.md` 文件)。

## 📄 许可证 (License)

本项目采用 [MIT 许可证](LICENSE.md) 开源。

---

**作者**: <你的名字或昵称> ([你的GitHub主页链接](https://github.com/<你的GitHub用户名>))

**致谢**:

* 感谢 DeepSeek API (或其他你使用的 LLM API 服务提供方)。
* 感谢所有使用到的开源库和框架的开发者。


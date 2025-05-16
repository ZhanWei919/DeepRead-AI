import io

from fastapi import FastAPI, File, UploadFile, HTTPException, Header  # 导入 Header
from pydantic import BaseModel, Field
from pypdf import PdfReader
from deepseek_client import DeepSeekClient  # 相对导入
import json
from typing import Optional  # 导入 Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware  # 导入 CORSMiddleware


# --------------------------
# FastAPI 应用初始化
# --------------------------
app = FastAPI(
    title="DeepRead AI Backend",
    description="API for DeepRead AI application, providing PDF processing and AI interaction.",
    version="0.1.0",
)

# CORS 配置
origins = [
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在开发阶段可以使用 "*"，生产中应更具体。
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
)


# --------------------------
# 数据模型 (Pydantic)
# --------------------------
class TextRequest(BaseModel):
    text: str


class SummaryResponse(BaseModel):
    summary: str


class ChatWithContextRequest(BaseModel):
    user_query: str
    document_context: str  # 从前端传递过来的 PDF 文本


class ChatResponse(BaseModel):
    ai_response: str


class MindmapRequest(BaseModel):
    document_text: str
    output_format: str = Field("mermaid", description="Desired output format: 'mermaid' or 'json'")


class MindmapResponse(BaseModel):
    mindmap_data: str
    format_used: str


# --------------------------
# 工具函数
# --------------------------
async def extract_pdf_text(file: UploadFile) -> str:
    """提取PDF文件文本内容"""
    pdf_content = await file.read()
    pdf_file = io.BytesIO(pdf_content)
    reader = PdfReader(pdf_file)

    extracted_text = ""
    for page in reader.pages:
        extracted_text += page.extract_text() or ""

    return extracted_text.strip()


def build_summarize_messages(text: str) -> list[dict]:
    """构建摘要请求的消息结构"""
    return [
        {
            "role": "system",
            "content": (
                "You are an assistant skilled in summarizing texts accurately and concisely. "
                "Please provide the summary in clean, simple Markdown format. "
                "DO NOT use standard paragraph separation (one empty line). "
                "Avoid trailing spaces at the end of lines."
            )
        },
        {"role": "user", "content": f"Please summarize the following text:\n\n{text}"}
    ]


def build_chat_messages(document_context: str, user_query: str) -> list[dict]:
    """构建聊天请求的消息结构"""
    prompt_template = (
        "你是一个智能阅读助手。请根据以下提供的文档内容来回答用户的问题。\n\n"
        "文档内容：\n{document_context}\n\n"
        "用户问题：{user_query}\n\n"
        "你主要的任务有3类，请严格遵守以下指南进行回答：\n"
        "1. **核心任务**：仅基于提供的文档内容回答问题。如果文档内容不足，请明确指出你无法从文档中找到答案，同时根据你自己的知识库推导出答案。\n"
        "2. **回答结构**：请采用“总-分”结构。首先给出一个足够充分并且简明扼要的总体描述或回答。然后，如果需要详细解释或列举多个要点（若有必要），请遵循下面的 Markdown 格式化指南。当用户询问技术细节时，你必须讲的足够详细，做到原文的意思直接传递给用户的程度，不要任何概括。\n"
        "3. **翻译任务**：请根据用户选定的文本，直接给出简单易理解的翻译，若用户没有指定翻译后的语言，默认为汉语，且禁止使用markdown格式。\n"
        "\n"
        "--- Markdown 格式化核心指南 (请务必遵守，特别是关于标题和空行的规则) ---\n"
        "A. **简洁至上**：请使用最简单、最直接的 Markdown 语法。避免任何不必要的复杂结构或花哨的格式。\n"
        "B. **主要分点使用正确的标题格式 (非常重要！)**：\n"
        "   * 如果回答包含多个主要方面或章节，请使用四级 Markdown 标题，格式为 `#### <可选数字>. <标题文本>` (例如：`#### 1. 第一个方面` 或 `#### 主要发现`)。标题标记 `####` 是必需的，标题文本前可以有数字和点，也可以没有。\n"
        "   * **严格禁止使用任何形式的列表项 (如 `1. <内容>` 或 `- <内容>`) 作为主要分点的“标题”或替代标题。所有主要分点的起始都必须是 `####`。**\n"
        "C. **次级列表的紧凑性**：\n"
        "   * 在每个 `####` 标题之下，如果需要列举更细致的子要点，可以使用标准的无序列表 (以 `-` 或 `*` 开头) 或有序列表 (以 `1.`、`2.` 等开头)。\n"
        "   * 列表项内容应紧跟在列表标记和空格之后。\n"
        "   * **为了使列表显示更加紧凑，简单的、连续的列表项之间不应包含空行。** 只有当一个列表项自身包含多个段落或需要特别分隔的复杂内容时，才考虑在该列表项与其他列表项之间使用一个空行。\n"
        "     正确的紧凑列表示例：\n"
        "     - 要点一，这是对要点一的简短说明。\n"
        "     - 要点二，这是对要点二的简短说明。\n"
        "     应避免的格式（除非列表项本身是多段落的，一般情况下请避免）：\n"
        "     - 要点一\n\n"
        "     - 要点二\n"
        "D. **段落与空行的精确控制 (非常重要！)**：\n"
        "   * 不同主题的普通段落之间使用 **且仅使用一个** 空行分隔。\n"
        "   * **从一个普通段落结束过渡到其紧随的 `####` 标题时，它们之间也只能有 **一个** 空行。** (例如： `...段落的末尾。\n\n#### 这是新标题`)\n"
        "   * **`####` 标题行本身独占一行。在其之后，与下面的第一行正文或第一个列表项之间，也只应有 **一个** 空行。** (例如： `#### 这是标题\n\n这是正文第一句。` 或 `#### 这是标题\n\n- 这是列表项一`)\n"
        "   * **严格避免在文档的任何地方产生连续的两个或更多不必要的空行。目标是保持文档结构清晰且最大限度地紧凑，同时保证可读性。**\n"
        "   * **行尾绝对禁止出现任何尾随空格。**\n"
        "E. **数学公式**：如果需要展示数学公式，请使用标准的 LaTeX 标记，例如行内公式 `\\( E=mc^2 \\)` 或块级公式 `\\[ \\sum_{{i=1}}^n i = \\frac{{n(n+1)}}{{2}} \\]`。\n"
        "F. **避免的操作 (再次强调)**：\n"
        "   * 不要在列表项标记（如 `1.` 或 `-`）和其后的文本内容之间插入不必要的换行。\n"
        "   * 绝对不要将列表项（如 `1. 标题内容`）用作主要分点的标题，必须使用 `####`。\n"
        "\n"
        "--- 格式示例 (请严格学习并遵循此结构和空行规则) ---\n"
        "这是总体性的回答概览，通常是一段文字。\n\n"
        "#### 1. 第一个主要方面解释\n\n"
        "这是关于第一个方面的详细说明段落。它可以包含一些行内公式，例如 \\( ax^2 + bx + c = 0 \\)。段落自然换行。\n"
        "如果需要列举（列表项之间无额外空行）：\n"
        "- 这是第一个次级要点。\n"
        "- 这是第二个次级要点，它可能比较长，会自动换行。\n\n"
        "#### 2. 第二个主要方面阐述\n\n"
        "关于第二个方面的解释。如果包含多个步骤，可以使用有序列表（列表项之间无额外空行）：\n"
        "1. 步骤一的描述。\n"
        "2. 步骤二的描述。\n"
        "  这里是步骤二的补充说明，它属于步骤二这个列表项，因此需要正确缩进。\n\n"
        "如果涉及到公式块：\n"
        "\\[\n"
        "\\mathbf{{F}} = m\\mathbf{{a}}\n"
        "\\]\n\n"
        "公式后的解释文本，这是另一个段落。\n"
        "\n"
        "--- 回答结束 ---\n"
        "请再次确认，你的回答必须完全遵循上述所有格式化指南，特别是关于 **`####` 标题的使用** 以及 **空行的精确控制（通常只有一个空行用于分隔，列表项之间无空行，避免连续多空行）**，以实现清晰、紧凑且易于前端正确渲染的 Markdown。"
    )
    full_prompt = prompt_template.format(
        document_context=document_context,
        user_query=user_query
    )

    return [
        {"role": "system",
         "content": "你是一个乐于助人的AI助手，专注于根据用户提供的上下文回答问题，并严格遵守用户指定的 Markdown 格式化输出指南。"},
        {"role": "user", "content": full_prompt}
    ]


# --------------------------
# API 端点
# --------------------------
@app.get("/")
async def root():
    """根路径，返回欢迎信息"""
    return {"message": "Welcome to DeepRead AI Backend!"}


@app.post("/api/pdf/extract-text")
async def extract_text_from_pdf(file: UploadFile = File(...)):
    """
    接收PDF文件，提取文本内容
    - 只接受PDF文件
    - 返回提取的文本或错误信息
    """
    if file.content_type != "application/pdf":
        raise HTTPException(400, detail="Invalid file type. Only PDF files are accepted.")

    try:
        extracted_text = await extract_pdf_text(file)

        if not extracted_text:
            return {
                "filename": file.filename,
                "extracted_text": "",
                "message": "No text could be extracted from the PDF."
            }

        return {
            "filename": file.filename,
            "extracted_text": extracted_text
        }
    except Exception as e:
        print(f"Error processing PDF {file.filename}: {e}")
        raise HTTPException(500, detail=f"Error processing PDF: {str(e)}")
    finally:
        await file.close()


@app.post("/api/llm/summarize", response_model=SummaryResponse)
async def summarize_text(
        request_data: TextRequest,
        x_user_api_key: Optional[str] = Header(None, alias="X-User-API-Key")
):
    """接收文本并返回AI生成的摘要"""
    try:
        # 如果 x_user_api_key 存在，则使用它，否则 DeepSeekClient 会尝试使用环境变量
        client = DeepSeekClient(api_key=x_user_api_key)
        messages = build_summarize_messages(request_data.text)
        response = client.get_chat_completion(messages=messages)

        if response.choices and response.choices[0].message.content:
            return SummaryResponse(summary=response.choices[0].message.content.strip())

        raise HTTPException(500, detail="Failed to get summary from AI")
    except ValueError as ve:  # DeepSeekClient 在 API Key 未找到时可能抛出 ValueError
        print(f"API Key or Client Initialization Error: {ve}")
        raise HTTPException(400, detail=str(ve))
    except Exception as e:
        print(f"Summarization Error: {e}")
        raise HTTPException(500, detail="An error occurred while generating the summary.")


@app.post("/api/llm/chat_with_context", response_model=ChatResponse)
async def chat_with_document_context(
        request_data: ChatWithContextRequest,
        x_user_api_key: Optional[str] = Header(None, alias="X-User-API-Key")  # 新增 API Key Header
):
    """基于文档上下文回答用户问题"""
    try:
        client = DeepSeekClient(api_key=x_user_api_key)
        messages = build_chat_messages(
            request_data.document_context,
            request_data.user_query
        )
        response = client.get_chat_completion(messages=messages, model="deepseek-chat")

        if response.choices and response.choices[0].message.content:
            return ChatResponse(ai_response=response.choices[0].message.content.strip())

        raise HTTPException(500, detail="AI未能生成有效回复")
    except ValueError as ve:
        print(f"API Key or Client Initialization Error for Chat: {ve}")
        raise HTTPException(400, detail=str(ve))
    except Exception as e:
        print(f"Chat with Context Error: {e}")
        # from openai import AuthenticationError
        # if isinstance(e, AuthenticationError):
        #     raise HTTPException(401, detail="Invalid API Key or Authentication Failed with LLM provider.")
        raise HTTPException(500, detail=f"处理聊天请求时发生错误: {str(e)}")


@app.post("/api/pdf/generate_mindmap", response_model=MindmapResponse)
async def generate_document_mindmap(
        request_data: MindmapRequest,
        x_user_api_key: Optional[str] = Header(None, alias="X-User-API-Key")  # 新增 API Key Header
):
    try:
        client = DeepSeekClient(api_key=x_user_api_key)

        if request_data.output_format.lower() == "mermaid":
            system_prompt = "你是一位顶级的AI助手，专门从复杂的学术文献中提取深层结构和核心信息，并将其精准地转化为结构清晰、内容详尽、语法绝对正确的Mermaid思维导图。你的输出必须直接是Mermaid代码，不能包含任何额外的解释、标记或非Mermaid代码内容。"
            user_prompt_template = """
            请仔细阅读并深度理解以下提供的完整学术文档。基于此文档，你需要生成一个全面且详尽的Mermaid语法的思维导图（mindmap）。

            **任务要求与指导：**

            1.  **内容详尽性与深度**：
                * **全面覆盖**：确保思维导图充分展现文档的**主要章节/部分**（如：引言、背景、文献综述、研究方法、实验设计、数据收集与分析、结果、讨论、局限性、结论、未来工作等）。
                * **核心要素**：深入挖掘并清晰呈现文档的**核心论点、子论点、关键概念及其定义、重要假设、关键数据/证据、研究发现、理论贡献、实践意义**等。
                * **逻辑关系**：明确展示不同概念、论点、章节和发现之间的**层级关系与相互联系**。
                * **多层级结构**：鼓励使用至少3-5个层级（甚至更多，如果文献内容复杂且支持）来详细展开各个分支，避免过于概括性的节点。叶子节点应尽可能具体。
                * **中文为主**：鼓励使用中文作为节点内的文本，但是专业名词和特殊用语可以保留原文。

            2.  **Mermaid语法与格式**：
                * **严格的Mermaid Mindmap语法**：输出**必须**严格遵守Mermaid的 `mindmap` 图表类型语法。代码必须以 `mindmap` 关键字开始。
                * **节点文本规范（至关重要！请严格遵守！）：**
                    * **简洁明了**：每个节点的文本应简洁、高度概括，但要包含足够的信息。如果概念复杂，请拆分为子节点。
                    * **首选的节点定义方式**：对于思维导图中的**所有子节点**（即非根节点），为了确保最大的兼容性和避免解析错误，请**优先采用 `("你的节点文本内容")` 的格式来定义节点**。这意味着节点文本本身应该被双引号 `"` 包裹，然后这整个带引号的字符串再被一对圆括号 `()` 包裹。
                        * **即使节点文本不包含任何特殊字符，也推荐使用 `("...")` 格式以保持一致性和稳健性。**
                    * **特殊字符处理**：如果（并且按照上述规则，总是）使用了 `("...")` 格式，那么节点文本内部的特殊字符（例如 `( ) [ ] {{ }} < > " : ; = . % + * & | / \\ _` 等）就自然地被包含在双引号内部了。这是处理特殊字符的推荐方式。
                    * **正确示例**：
                        ```mermaid
                        mindmap
                            ParentNode
                                ("子节点文本，包含(括号)和符号&")
                                ("另一个子节点，可能是版本2.0")
                                ("简单的子节点") 
                        ```
                    * **避免的格式（当文本复杂或含特殊字符时）**：避免直接使用 ` "包含(括号)的文本" ` 作为子节点行，因为这可能导致解析问题，如你所发现。

                * **根节点处理**：对于根节点，通常使用 `root((文本))` 或 `root(("文本"))` 的形式。如果根节点文本包含特殊字符，确保文本部分被双引号包裹，例如 `root(("带有(括号)和符号&的根节点标题"))`。

                * **层级清晰**：通过正确的缩进（通常是2个或4个空格，从父节点的第一个字符开始对齐子节点的定义，例如 `("...")` 的起始圆括号）来表示清晰的父子关系和层级结构。
                * **仅输出代码**：你的最终输出**只能是纯粹的Mermaid代码块**。**严禁**在代码块之前或之后添加任何Markdown标记（如 ```mermaid ... ``` 或 ```）、任何解释性文字、标题、介绍、总结、或其他非Mermaid代码的字符。输出的文本应该可以直接被Mermaid渲染引擎解析。

            **示例输出的结构（你需要根据实际文档内容填充）：**
            ```text
            mindmap
              root((文档核心主题/标题))
                (引言)
                  (研究背景与重要性)
                  (研究问题/目标)
                  (论文结构)
                (文献综述)
                  (相关理论A)
                    (理论A的核心观点1)
                    (理论A的代表学者/文献)
                  (相关研究B)
                (研究方法)
                  (研究范式/设计)
                  (数据收集方法与工具)
                    (样本描述)
                  (数据分析技术)
                (结果与发现)
                  (主要发现一)
                    (具体数据/图表支撑1)
                    (对发现一的初步解读)
                  (主要发现二)
                (讨论)
                  (对结果的深入分析与解释)
                  (与先前研究的比较/联系)
                  (理论贡献与实践启示)
                  (研究的局限性)
                (结论与未来展望)
                  (核心结论总结)
                  (对未来研究的建议)
              现在，请处理以下文档：

              文档全文:{document_text}

            Mermaid 思维导图代码 (请直接从下一行开始输出纯代码):      
            """
        elif request_data.output_format.lower() == "json":
            system_prompt = "你是一个擅长从学术文献中提取核心内容并将其组织成结构化数据的AI助手。"
            user_prompt_template = "请仔细阅读以下提供的文档全文，并生成一个表示其主要结构、核心论点、关键概念和相互关系的 JSON 对象。JSON 对象应该有一个根节点，每个节点包含 'text' (节点显示的文本) 和一个可选的 'children' (子节点对象数组) 属性。例如：{ \"text\": \"根主题\", \"children\": [ { \"text\": \"分支1\", \"children\": [ { \"text\": \"叶子1.1\" } ] }, { \"text\": \"分支2\" } ] }。请直接输出 JSON 对象字符串，不要包含其他解释性文字。\n\n文档全文:\n{document_text}\n\nJSON 输出:\n"
        else:
            raise HTTPException(status_code=400, detail="Unsupported output_format. Choose 'mermaid' or 'json'.")

        full_user_prompt = user_prompt_template.format(document_text=request_data.document_text)
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": full_user_prompt}]

        ai_response = client.get_chat_completion(messages=messages)  # 默认模型 "deepseek-reasoner"

        mindmap_data_str = ""
        if ai_response.choices and ai_response.choices[0].message and ai_response.choices[0].message.content:
            mindmap_data_str = ai_response.choices[0].message.content.strip()
            if request_data.output_format.lower() == "mermaid":
                mindmap_data_str = mindmap_data_str.replace("```mermaid", "").replace("```", "").strip()
            if request_data.output_format.lower() == "json":
                try:
                    json.loads(mindmap_data_str)
                except json.JSONDecodeError:
                    print(f"Warning: LLM did not return valid JSON for mindmap: {mindmap_data_str}")
                    pass
        else:
            print("----------- LLM Response did not contain expected content -----------")
            if ai_response.choices and ai_response.choices[0].finish_reason:
                print(f"LLM Finish Reason: {ai_response.choices[0].finish_reason}")
            raise HTTPException(status_code=500, detail="AI未能生成思维导图数据")

        return MindmapResponse(mindmap_data=mindmap_data_str, format_used=request_data.output_format.lower())

    except ValueError as ve:
        print(f"API Key or Client Initialization Error for Mindmap: {ve}")
        raise HTTPException(400, detail=str(ve))
    except Exception as e:
        print(f"Error generating mindmap: {e}")
        # from openai import AuthenticationError
        # if isinstance(e, AuthenticationError):
        #     raise HTTPException(401, detail="Invalid API Key or Authentication Failed with LLM provider.")
        raise HTTPException(status_code=500, detail=f"生成思维导图时发生错误: {str(e)}")


LOGGING_CONFIG_NO_COLORS = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": "%(levelprefix)s %(asctime)s %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
            "use_colors": False,
        },
        "access": {
            "()": "uvicorn.logging.AccessFormatter",
            "fmt": '%(levelprefix)s %(asctime)s %(client_addr)s - "%(request_line)s" %(status_code)s', # 添加了 asctime
            "datefmt": "%Y-%m-%d %H:%M:%S",
            "use_colors": False,  # 明确禁用颜色
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr", # 或者 "ext://sys.stdout"
        },
        "access": {
            "formatter": "access",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout", # 保持 Uvicorn 的默认行为，access 日志到 stdout
        },
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["default"],
            "level": "INFO",
            "propagate": False
        },
        "uvicorn.error": {
            "handlers": ["default"], # 确保 uvicorn.error 也使用这个配置
            "level": "INFO",
            "propagate": False
        },
        "uvicorn.access": {
            "handlers": ["access"],
            "level": "INFO",
            "propagate": False
        },
    },
}


if __name__ == "__main__":
    import uvicorn
    # 端口号应与前端 api.ts 中配置的一致
    # 以及 Electron main.js 中配置的一致
    PORT = 8008 # 确保这个端口统一

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=PORT,
        log_config=LOGGING_CONFIG_NO_COLORS # <--- 在这里应用自定义日志配置
    )
import os
from openai import OpenAI
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    print("Warning: .env file not found at expected location. API Key might not be loaded.")

DEEPSEEK_API_BASE_URL = "https://api.deepseek.com"  # 或者 "https://api.deepseek.com/v1"


class DeepSeekClient:
    def __init__(self, api_key: str = None):
        """
        初始化 DeepSeek API 客户端。
        如果未提供 api_key，则尝试从环境变量 DEEPSEEK_API_KEY 中获取。
        """
        if api_key:
            self.api_key = api_key
        else:
            self.api_key = os.getenv("DEEPSEEK_API_KEY")

        if not self.api_key:
            raise ValueError("DeepSeek API Key not provided or found in environment variables.")

        self.client = OpenAI(
            api_key=self.api_key,
            base_url=DEEPSEEK_API_BASE_URL
        )

    def get_chat_completion(self, messages: list, model: str = "deepseek-reasoner", stream: bool = False, **kwargs):
        """
        获取聊天模型的补全结果。

        :param messages: 一个消息列表，格式如：
                         [
                             {"role": "system", "content": "You are a helpful assistant."},
                             {"role": "user", "content": "Hello"}
                         ]
        :param model: 使用的模型名称，默认为 "deepseek-chat"。
        :param stream: 是否使用流式输出，默认为 False。
        :param kwargs: 其他传递给 OpenAI SDK create 方法的参数，如 temperature, max_tokens 等。
        :return: 非流式模式下返回 OpenAI 的 ChatCompletion 对象，流式模式下返回一个生成器。
        :raises: OpenAI APIError 如果 API 调用失败。
        """
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=stream,
                **kwargs
            )
            return response
        except Exception as e:  # 可以更具体地捕获 openai.APIError 等
            print(f"Error calling DeepSeek API: {e}")
            # 在实际应用中，你可能想重新抛出异常或返回一个错误指示
            raise


# --- 可选的测试代码 ---
if __name__ == "__main__":
    # 确保你的 .env 文件中有 DEEPSEEK_API_KEY
    # 或者在运行此脚本前设置环境变量
    # export DEEPSEEK_API_KEY="your_key" (Linux/macOS)
    # set DEEPSEEK_API_KEY="your_key" (Windows CMD)
    # $env:DEEPSEEK_API_KEY="your_key" (Windows PowerShell)

    print(f"Attempting to load API key: {os.getenv('DEEPSEEK_API_KEY')[:5]}...")  # 打印部分key用于确认

    try:
        client = DeepSeekClient()  # 它会自动从 .env 加载 API Key
        print("DeepSeekClient initialized successfully.")

        sample_messages = [
            {"role": "system", "content": "你是一个有用的助手。"},
            {"role": "user", "content": "你好，请用中文简单介绍一下你自己。"}
        ]

        print("\nRequesting chat completion (non-streaming)...")
        completion = client.get_chat_completion(messages=sample_messages)


        if completion.choices:
            print("Response:")
            print(completion.choices[0].message.content)
        else:
            print("No choices returned.")

        print(f"\nTotal tokens used: {completion.usage.total_tokens}")

        # print("\nRequesting chat completion (streaming)...")
        # stream_response = client.get_chat_completion(messages=sample_messages, stream=True)
        # print("Streaming Response:")
        # for chunk in stream_response:
        #     if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
        #         print(chunk.choices[0].delta.content, end="", flush=True)
        # print("\nStream finished.")

    except ValueError as ve:
        print(f"ValueError: {ve}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
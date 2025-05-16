// 例: src/types/markdown-it-texmath.d.ts

declare module "markdown-it-texmath" {
  import MarkdownIt from "markdown-it";
  // 我们需要从 'katex' 导入 KatexOptions 类型。
  // 确保你已经安装了 katex 并且它的类型声明是可用的。
  // import Katex from 'katex'; // 如果直接用 Katex.KatexOptions 不行，尝试这样导入

  // 通常 'katex' 包自带类型，可以直接引用
  import { KatexOptions } from "katex";

  interface TexMathOptions {
    engine?: object; // 'katex' 或其他兼容引擎的实例
    delimiters?: string;
    katexOptions?: KatexOptions; // 使用从 'katex' 导入的类型
    // 可以根据 markdown-it-texmath 的文档添加更多实际支持的选项
  }

  // 定义插件函数的类型
  // MarkdownIt.PluginSimple | MarkdownIt.PluginWithOptions<any> | MarkdownIt.PluginWithParams
  const texmathPlugin: MarkdownIt.PluginWithOptions<TexMathOptions>;
  export default texmathPlugin;
}

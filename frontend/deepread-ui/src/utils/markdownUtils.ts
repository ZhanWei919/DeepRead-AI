import MarkdownIt, {
  PluginWithOptions,
  StateInline,
  StateBlock,
  Token,
  Renderer,
} from "markdown-it"; // <-- 导入所需类型
import texmath from "markdown-it-texmath";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "dompurify";

// 定义 TexMath 选项接口 (保持不变)
interface TexMathOptions {
  engine?: any;
  delimiters?: string;
  renderingOptions?: Record<string, any>;
}

// 自定义 markdown-it-texmath 渲染函数 (保持不变)
function renderKaTeX(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: displayMode,
    });
  } catch (error) {
    console.error("KaTeX rendering error:", error);
    return `<span style="color: red; font-weight: bold;">KaTeX Error: ${
      error instanceof Error ? error.message : String(error)
    }</span>`; // 返回更明显的错误提示
  }
}

// 初始化 markdown-it 实例 (保持不变)
const md = new MarkdownIt({
  html: true,
  breaks: false,
  linkify: true,
  typographer: true,
});

// 显式添加 texmath 插件 (保持不变)
// 注意：如果你下面的自定义规则完全覆盖了 texmath 的默认行为，
// 也许你只需要 katex 而不是这个插件？但现在我们先保留它。
md.use(texmath, {
  engine: katex,
  delimiters: "gitlab", // GitLab 风格的分隔符 ($`...`$, ```math) - 注意：你下面的代码似乎在实现 $...$ 和 $$...$$ 或 \(...\) 和 \[...\]
  // 如果你想用 \(...\) 和 \[...\]，这里可能需要设置 'dollars' 或者自定义，或者完全依赖你下面的规则
  renderingOptions: {},
} as TexMathOptions); // 使用类型断言可能隐藏问题，但如果确定选项结构正确则可以

// --- 开始修改 ---
// 移除 (texmath as any).use(...) 包裹层
// 直接在 md 实例上添加或修改规则和渲染器

// --- 自定义规则 ---
// 你正在尝试添加名为 'texmath' 的规则。如果 texmath 插件已经添加了同名规则，
// .push 可能会添加重复的规则或导致意外行为。
// 考虑使用不同的名称，或者如果 texmath 插件允许，禁用它的默认规则。
// 或者，使用 ruler.before/after 来精确控制执行顺序。
// 这里我们暂时保持 'texmath' 名称，假设你想覆盖或优先处理。

// 行内公式自定义规则 \( ... \)
md.inline.ruler.push(
  "custom_texmath_inline",
  function (state: StateInline, silent: boolean): boolean {
    // <-- 添加类型 StateInline, boolean
    const pos = state.pos;
    const max = state.posMax;
    const startDelimiter = "\\(";
    const endDelimiter = "\\)";

    if (state.src.slice(pos, pos + startDelimiter.length) !== startDelimiter) {
      return false;
    }

    let end = -1;
    // 查找结束分隔符，注意转义的反斜杠
    let scanPos = pos + startDelimiter.length;
    while (scanPos < max) {
      if (
        state.src.slice(scanPos, scanPos + endDelimiter.length) === endDelimiter
      ) {
        // 确保不是转义的结束符，例如 \\\)
        if (scanPos === 0 || state.src[scanPos - 1] !== "\\") {
          end = scanPos;
          break;
        }
      }
      scanPos++;
    }

    if (end === -1) {
      return false;
    }

    if (!silent) {
      const token = state.push("texmath_inline", "math", 0); // 使用 'math' 标签类型，与 texmath 一致
      token.content = state.src.slice(pos + startDelimiter.length, end).trim();
      token.markup = startDelimiter; // 可以标记开始的分隔符
      token.info = endDelimiter; // 可以标记结束的分隔符
    }

    state.pos = end + endDelimiter.length;
    return true;
  }
);

// 块级公式自定义规则 \[ ... \]
md.block.ruler.push(
  "custom_texmath_block",
  function (
    state: StateBlock,
    startLine: number,
    endLine: number,
    silent: boolean
  ): boolean {
    // <-- 添加类型 StateBlock, number, number, boolean
    const currentLine = startLine;
    const startPos = state.bMarks[currentLine] + state.tShift[currentLine];
    const maxPos = state.eMarks[currentLine];
    const startDelimiter = "\\[";
    const endDelimiter = "\\]";

    // 检查行首是否为开始分隔符
    if (
      state.src.slice(startPos, startPos + startDelimiter.length) !==
      startDelimiter
    ) {
      return false;
    }

    // 找到块的结束位置
    let endLineFound = -1;
    let endPosFound = -1;

    // 查找结束分隔符所在的行
    let nextLine = startLine;
    while (nextLine < endLine) {
      const lineStartPos = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineMaxPos = state.eMarks[nextLine];
      const lineContent = state.src.slice(lineStartPos, lineMaxPos);

      const endDelimPos = lineContent.indexOf(endDelimiter);
      if (endDelimPos !== -1) {
        // 确保不是转义的，虽然在块模式下不太常见
        // 检查是否在行尾（允许有空格）
        const afterEndDelim = lineContent
          .slice(endDelimPos + endDelimiter.length)
          .trim();
        if (afterEndDelim === "") {
          endLineFound = nextLine;
          // 记录精确的结束位置，用于提取内容
          endPosFound = lineStartPos + endDelimPos;
          break;
        }
      }
      nextLine++;
    }

    if (endLineFound === -1) {
      // 没有找到有效的结束分隔符
      return false;
    }

    if (!silent) {
      const token = state.push("texmath_block", "math", 0); // 使用 'math' 标签类型
      token.block = true; // 标记为块级
      token.markup = startDelimiter; // 标记开始分隔符
      token.info = endDelimiter; // 标记结束分隔符

      // 提取内容：从开始分隔符之后到结束分隔符之前
      const contentStartPos = startPos + startDelimiter.length;
      token.content = state.src.slice(contentStartPos, endPosFound).trim();
      token.map = [startLine, endLineFound + 1]; // 标记内容所占的行范围

      // 更新状态以跳过已处理的块
      state.line = endLineFound + 1;
    }

    return true;
  }
);

// 渲染器配置
// 注意：Renderer 回调的完整签名是 (tokens, idx, options, env, self)
// 你可以只声明你用到的参数，TypeScript 通常能处理好
md.renderer.rules.texmath_inline = function (
  tokens: Token[],
  idx: number
): string {
  return renderKaTeX(tokens[idx].content, false);
};

md.renderer.rules.texmath_block = function (
  tokens: Token[],
  idx: number
): string {
  return renderKaTeX(tokens[idx].content, true);
};
// Markdown 渲染函数 (基本保持不变, DOMPurify 配置很完善)
export const renderMarkdown = (markdownText: string): string => {
  if (markdownText === null || typeof markdownText === "undefined") {
    return "";
  }
  const inputText = String(markdownText);

  try {
    const cleanedText = sanitizeMarkdownInput(inputText);

    let rawHtml = "";
    try {
      rawHtml = md.render(cleanedText);
    } catch (renderError) {
      console.error("Markdown-it render error:", renderError);
      // 返回错误信息，保留原始输入以便调试
      return `<div class="render-error">
                <p><strong>Markdown 渲染错误:</strong></p>
                <pre>${String(renderError)}</pre>
                <p><strong>清理后的输入:</strong></p>
                <pre>${cleanedText
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</pre>
              </div>`;
    }

    // 使用 DOMPurify 清理 HTML 输出，保护免受 XSS 攻击
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true, svg: true, mathMl: true },
      // 你的 ADD_TAGS 和 ADD_ATTR 列表看起来非常全面，适用于 KaTeX 输出
      ADD_TAGS: [
        "math",
        "maction",
        "menclose",
        "merror",
        "mfenced",
        "mfrac",
        "mi",
        "mmultiscripts",
        "mn",
        "mo",
        "mover",
        "mpadded",
        "mphantom",
        "mroot",
        "mrow",
        "ms",
        "mspace",
        "msqrt",
        "mstyle",
        "msub",
        "msubsup",
        "msup",
        "mtable",
        "mtd",
        "mtext",
        "mtr",
        "munder",
        "munderover",
        "semantics",
        "annotation",
        "foreignobject",
        "svg",
        "path",
        "g",
        "defs",
        "symbol",
        "use",
        "line",
        "rect",
        "circle",
        "ellipse",
        "polygon",
        "polyline",
        "text",
        "textPath",
        "tspan",
        "image",
        "filter",
        "feGaussianBlur",
        "feOffset",
        "feFlood",
        "feComposite",
        "feMerge",
        "feMergeNode",
      ],
      ADD_ATTR: [
        "accent",
        "accentunder",
        "actiontype",
        "align",
        "alignmentscope",
        "altimg",
        "altimg-width",
        "altimg-height",
        "altimg-valign",
        "alttext",
        "bevelled",
        "charspacing",
        "class",
        "close",
        "columnalign",
        "columnlines",
        "columnspacing",
        "columnspan",
        "columnwidth",
        "crossout",
        "denomalign",
        "depth",
        "dir",
        "display",
        "displaystyle",
        "edge",
        "fence",
        "fontfamily",
        "fontsize",
        "fontstyle",
        "fontweight",
        "form",
        "frame",
        "framespacing",
        "groupalign",
        "height",
        "href",
        "id",
        "indentalign",
        "indentalignfirst",
        "indentalignlast",
        "indentshift",
        "indentshiftfirst",
        "indentshiftlast",
        "indenttarget",
        "infixlinebreakstyle",
        "largeop",
        "length",
        "linebreak",
        "linebreakmultchar",
        "linebreakstyle",
        "lineleading",
        "linethickness",
        "location",
        "longdiv",
        "lquote",
        "lspace",
        "macros",
        "mathbackground",
        "mathcolor",
        "mathsize",
        "mathvariant",
        "maxsize",
        "minlabelspacing",
        "minsize",
        "movablelimits",
        "notation",
        "numalign",
        "open",
        "operator",
        "overflow",
        "position",
        "preserveaspectratio",
        "rightangle",
        "rowalign",
        "rowlines",
        "rowspacing",
        "rowspan",
        "rquote",
        "rspace",
        "scriptlevel",
        "scriptminsize",
        "scriptsizemultiplier",
        "selection",
        "separator",
        "separators",
        "shift",
        "side",
        "src",
        "stackalign",
        "stretchy",
        "style",
        "symmetric",
        "transform",
        "valign",
        "viewbox",
        "width",
        "window",
        "xmlns",
        "xlink:href",
        "xmlns:xlink",
        "d",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "x",
        "y",
        "dx",
        "dy",
        "rx",
        "ry",
        "cx",
        "cy",
        "r",
        "fx",
        "fy",
        "x1",
        "y1",
        "x2",
        "y2",
        "points",
        "offset",
        "result",
        "in",
        "in2",
        "stdDeviation",
        "flood-color",
        "flood-opacity",
        "text-anchor",
        "dominant-baseline",
        "aria-hidden",
        "role",
      ],
      FORBID_TAGS: [], // 如果需要，可以明确禁止某些标签
      ALLOW_UNKNOWN_PROTOCOLS: true, // 注意安全风险，如果不需要处理未知协议（如 custom://），设为 false
    });
    return cleanHtml;
  } catch (error) {
    console.error("Error in renderMarkdown function:", error);
    // 返回更友好的错误信息
    return `<div class="markdown-error">
              <p><strong>抱歉，内容处理时遇到问题：</strong></p>
              <pre style="color:red;">${String(error)}</pre>
              <p><strong>原始文本:</strong></p>
              <pre>${inputText
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</pre>
            </div>`;
  }
};

// 清理函数 (保持不变)
function sanitizeMarkdownInput(markdown: string): string {
  if (typeof markdown !== "string") {
    return String(markdown);
  }
  // 移除行尾空格，保留换行符
  return markdown
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

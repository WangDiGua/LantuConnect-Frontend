---
name: pretext
description: >-
  Multiline text measurement and line breaking without DOM layout (Pretext / @chenglou/pretext).
  Use when implementing virtualization (fixed/predictable row heights), masonry or custom text
  layouts, canvas/SVG text, textarea auto-height, shrink-to-fit width, or avoiding
  getBoundingClientRect/offsetHeight reflows. Also use when the user says Pretext, 文本测量,
  无 DOM 换行高度, or line-break layout in TypeScript.
license: MIT (library); skill text is project-local
---

# Pretext（多行文本测量与排版）

[Pretext](https://github.com/chenglou/pretext) 用浏览器字体引擎（Canvas `measureText`）在 **不触发布局回流** 的前提下做多行断行与高度计算。本仓库已：

- **运行时依赖**：`@chenglou/pretext`（见 `package.json`，在业务代码里 `import`）。
- **本地参考**：`third-party/pretext`（源码、`README`、`pages/demos` 示例；学习与对照 API，无需改业务 import 指向该目录）。

## 何时启用本技能

- 列表/网格 **虚拟滚动** 需要稳定、可缓存的 **行高** 或 **行数**。
- **Textarea**、聊天气泡、富文本块需要 **预计算高度**，避免加载后 CLS。
- **Canvas / SVG** 手写换行、`fillText` 排版。
- 需要 **shrink-wrap**（给定最大宽度下最窄可容纳宽度）或可变栏宽逐行排版（如绕图）。
- 用户明确要 **Pretext**、**无 DOM 测量**、**避免 reflow** 的排版方案。

## 核心 API（用法 1：只要高度）

`font` 字符串须与对应 DOM 元素的 CSS `font`（字号/字重/字体）**一致**（与 `canvas.font` 格式相同）。

```typescript
import { prepare, layout } from '@chenglou/pretext'

const prepared = prepare('正文内容…', '16px Inter')
const { height, lineCount } = layout(prepared, maxWidthPx, lineHeightPx)
```

- **`prepare()`**：一次性：空白规范化、分段、测量缓存。**同一文本+字体+选项不要重复 prepare**（昂贵）。
- **`layout()`**：纯算术热路径；**窗口变宽只重跑 `layout()`**，不必重跑 `prepare()`。

### 选项

- `{ whiteSpace: 'pre-wrap' }`：保留空格、`\\t`、`\\n`（textarea 类）。
- `{ wordBreak: 'keep-all' }`：类似 CSS `word-break: keep-all`（CJK 等）。

## 核心 API（用法 2：手动逐行 / Canvas）

```typescript
import {
  prepareWithSegments,
  layoutWithLines,
  layoutNextLineRange,
  materializeLineRange,
} from '@chenglou/pretext'
```

- `layoutWithLines`：固定宽度下返回每行文本。
- `layoutNextLineRange` + `materializeLineRange`：栏宽变化时逐行推进（如绕排）。

富文本 **仅行内** 流式排版（chip、mention 等）：`@chenglou/pretext/rich-inline`，见官方 README。

## 与 React / 本项目的集成要点

1. **字体同步**：从设计 token 或计算样式拼出与渲染完全一致的 `font` 字符串。
2. **缓存 `PreparedText`**：放在 `useMemo`、store 或 LRU key `(text, font, options)`；resize 只更新 `layout`。
3. **降级**：`prefers-reduced-motion`、超大文本可做采样或防抖 prepare，避免主线程长任务（见 ui-ux-pro-max 性能项）。
4. **macOS**：避免用 `system-ui` 作为测量字体（Pretext 文档标注可能影响精度），改用具体 family。

## 参考位置

- 包文档与语义：`node_modules/@chenglou/pretext` 或 [chenglou/pretext README](https://github.com/chenglou/pretext)。
- 可视化 demo 思路：`third-party/pretext/pages/demos/`（需在该子项目内按其 `DEVELOPMENT.md` 运行；本前端工程不强制接入）。

## 反模式

- 对每个字符或每次 `mousemove` 都 `prepare()`。
- `font` 与真实 CSS 不一致导致高度偏差。
- 把 Pretext 当作完整 CSS 排版引擎；它覆盖常见 `white-space` / `word-break` / `overflow-wrap` 子集，而非全部 CSS。

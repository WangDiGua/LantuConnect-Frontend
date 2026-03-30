# Nexus AI 设计系统规范

> 本文档从示例代码提炼而来，是全站 UI 实现的唯一设计真相源。
> 所有页面、组件、样式改动必须对齐本规范。

---

## 1. 画板布局 (Canvas Layout)

整体采用「四周留白 + 浮动侧边栏 + 白色主画板」的画板式布局。

```
┌─────────────────────────────────────────────┐
│  bg-[#EFEFF1]  p-3 md:p-4                   │
│  ┌──────────┐  ┌───────────────────────────┐│
│  │ Sidebar  │  │     Main Canvas Card      ││
│  │ 240px    │  │  bg-white                 ││
│  │ 无边框   │  │  rounded-[24px]           ││
│  │          │  │  md:rounded-[32px]        ││
│  │          │  │  shadow-[0_8px_30px_...]  ││
│  │          │  │  border border-slate-200  ││
│  └──────────┘  └───────────────────────────┘│
└─────────────────────────────────────────────┘
```

| 属性 | 浅色 | 深色 |
|------|------|------|
| 画板底色 | `bg-[#EFEFF1]` | `bg-[#0f1117]` |
| 主卡片底色 | `bg-white` | `bg-[#1a1f2e]` |
| 主卡片圆角 | `rounded-[24px] md:rounded-[32px]` | 同左 |
| 主卡片阴影 | `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` | `shadow-[0_8px_30px_rgb(0,0,0,0.2)]` |
| 主卡片边框 | `border border-slate-200/60` | `border border-white/[0.06]` |

### 根容器

```html
<div class="h-screen bg-[#EFEFF1] p-3 md:p-4 flex font-sans overflow-hidden
            selection:bg-violet-200 selection:text-violet-900">
```

### 双层背景约定（避免顶栏与内容区色差分割）

- **外层壳**（侧栏与主画板外的条带）：`pageBg(theme)` → 浅 `#EFEFF1` / 深 `#0f1117`。仅用于 **登录等全屏页**，或 `MainLayout` 最外层。
- **主画板 `<main>` 内**滚动区根节点：必须使用 **`canvasBodyBg(theme)`**（与 `surfaceBg` 相同：浅 `bg-white` / 深 `bg-[#1a1f2e]`）。**禁止**在 `<main>` 内再套 `pageBg`，否则会出现「顶栏白 + 灰带 + 内层白卡」的三段分割。
- 用户管理等使用 `MgmtPageShell` 时，外壳与主画板对齐为 **`bg-transparent`**，仅内层圆角卡片承载内容区底色。

### 主画板内容宽度（避免两侧大块留白）

- 滚动区内边距统一使用 `mainScrollPadX` + `mainScrollPadBottom`（`src/utils/uiClasses.ts`）：`px-4 sm:px-5 lg:px-6`，**不要**再用 `px-8` 叠窄内容区。
- 列表、Bento、Dashboard 等内容容器使用 **`w-full`**，**不要**再套 `max-w-6xl mx-auto` 把内容挤成中间一条。
- 个人资料、设置等「填不满宽屏」的页面：大屏用 **`xl:grid-cols-12`**（左侧身份摘要 + 右侧表单区块），避免 `max-w-4xl mx-auto` 居中造成的分裂感。

### 标题层级与顶栏去重

- **顶栏 `h2`**（`MainLayout`）：当前一级菜单下若存在子导航，**只显示当前子项标题**（与 `navigation.ts` 中子项 `label` 一致）；父级由侧栏展开状态表达，不再使用「父 / 子」双段顶栏文案。
- **正文**：不要用**可见**的页面级 `h1` 重复顶栏同一文案；使用 `useLayoutChrome().chromePageTitle` 与顶栏对齐，正文用 `<h1 class="sr-only">…</h1>` 保留文档大纲，辅以说明性副文案（`text-sm` + `textMuted` 等）。
- **`MgmtPageShell`**：当 `hasSecondarySidebar` 为 true 时，**不展示**卡片内可见面包屑路径，仅保留图标（若有）+ `description` + `toolbar`，避免与顶栏重复；`h1` 仍为 `sr-only`。
- **例外**：登录/错误/占位页、探索发现营销区、工作台欢迎语、Overview 内**区块级**标题、个人资料页以用户名为 `h1` 等，不受「与顶栏去重」约束。

---

## 2. 侧边栏 (Sidebar)

宽度 240px，无背景色（透过画板底色），包含四个区域：

### 2.1 Logo 区域

```html
<div class="flex items-center gap-3 px-2 mt-2 mb-8 cursor-pointer group">
  <!-- 图标: 40x40, rounded-[14px], bg-violet-600, shadow-md -->
  <div class="w-10 h-10 rounded-[14px] bg-violet-600 text-white flex items-center
              justify-center shadow-md shadow-violet-600/20
              group-hover:scale-105 transition-transform">
    <Sparkles size={20} />
  </div>
  <div>
    <h1 class="text-base font-bold text-slate-800 tracking-tight leading-none mb-1">
      Nexus AI
    </h1>
    <p class="text-[11px] text-slate-500 font-medium">智能体协同平台</p>
  </div>
</div>
```

### 2.2 模式切换拨片 (Mode Switcher)

```html
<div class="p-1 bg-slate-200/60 rounded-[14px] flex mb-6 shrink-0">
  <!-- 激活态: bg-white text-violet-700 shadow-sm -->
  <!-- 非激活: text-slate-500 hover:text-slate-700 -->
  <button class="flex-1 flex items-center justify-center gap-1.5 py-2
                 text-[13px] font-semibold rounded-[10px] transition-all duration-300">
```

### 2.3 导航菜单 (多级折叠)

#### 一级菜单项

| 状态 | 样式 |
|------|------|
| 激活 (无子项) | `bg-white text-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)]` |
| 子项激活 | `text-slate-900 font-semibold` |
| 默认 | `text-slate-500 hover:bg-slate-200/50 hover:text-slate-800` |

- 图标: 18px, 激活态 `text-violet-600`, 默认 `text-slate-400`
- 文字: `text-[14px]`, 激活态 `font-semibold`, 默认 `font-medium`
- 展开箭头: 14px ChevronDown, 激活 `rotate-180 text-violet-500`

#### 二级菜单项

- 缩进: `pl-[38px] pr-2`
- 左侧装饰线: `absolute left-[20px] w-px bg-slate-200/60`
- 激活态: `bg-white/60 text-violet-700 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.02)]`
- 激活小圆点: `w-1.5 h-1.5 rounded-full bg-violet-500 ring-4 ring-[#EFEFF1]`
- 文字: `text-[13px]`, 圆角 `rounded-lg`

### 2.4 底部用户卡片

```html
<button class="w-full bg-white rounded-[16px] p-2.5 flex items-center gap-3
               shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md
               transition-all border border-slate-200/50 group">
  <!-- 头像: w-9 h-9 rounded-xl -->
  <!-- 用户名: text-[13px] font-bold, hover text-violet-700 -->
  <!-- 角色标签: text-[9px] px-1.5 py-0.5 rounded-md font-bold
       bg-violet-50 text-violet-600 border border-violet-100/80 -->
  <!-- 更多按钮: MoreVertical 16px -->
</button>
```

---

## 3. 主画板 Header

高度 72px，半透明毛玻璃效果。

```html
<header class="h-[72px] flex items-center justify-between px-8 shrink-0
               bg-white/80 backdrop-blur-md z-10 sticky top-0
               border-b border-slate-100/50">
```

### 左侧: 面包屑标题

```html
<h2 class="text-xl font-bold text-slate-800">{title}</h2>
<!-- 含子页时: 父级 text-slate-400 font-medium / 分隔符 text-slate-300 -->
```

### 右侧: 工具区

- **搜索框**: `w-64 bg-slate-100/80 rounded-full pl-9 pr-4 py-2 text-[13px]`
  - focus: `ring-2 ring-violet-500/20 bg-white border-violet-200`
- **通知铃铛**: `p-2 rounded-full bg-slate-100/50 hover:bg-slate-100`
  - 红点: `w-2 h-2 bg-rose-500 rounded-full border-2 border-white`
- **主操作按钮**: `bg-slate-900 text-white px-4 py-2 rounded-full text-[13px] font-semibold hover:bg-violet-600`

---

## 4. 色彩体系

### 主色

| 用途 | Token |
|------|-------|
| 品牌主色 | `violet-600` (#7c3aed) |
| 品牌悬停 | `violet-500` |
| 品牌浅底 | `violet-50` |
| 品牌文字 | `violet-700` |

### 中性色

| 用途 | Token |
|------|-------|
| 主文字 | `slate-800` / `slate-900` |
| 副文字 | `slate-500` |
| 辅助文字 | `slate-400` |
| 分隔线 | `slate-100` / `slate-200` |
| 浅背景 | `slate-50` / `slate-100/80` |

### 语义色

| 用途 | 背景 | 文字 |
|------|------|------|
| 成功/运行中 | `emerald-100` / `emerald-50` | `emerald-700` / `emerald-600` |
| 信息/技术 | `blue-100` / `blue-50` | `blue-700` / `blue-600` |
| 警告/热门 | `rose-100` / `rose-50` | `rose-700` / `rose-600` |
| 统计强调 | `violet-50` / `violet-100` | `violet-950` / `violet-800` |

---

## 5. 圆角层级

| 层级 | 值 | Tailwind | 用途 |
|------|-----|----------|------|
| 超大 | 24-32px | `rounded-[24px]` / `rounded-[32px]` | 主画板卡片、Bento 内容卡 |
| 大 | 20px | `rounded-[20px]` | Agent 卡片、列表项卡片 |
| 容器 | 16px | `rounded-[16px]` / `rounded-2xl` | 用户卡片、嵌套面板、图表占位 |
| 切换器 | 14px | `rounded-[14px]` | Logo 图标、模式切换轨道 |
| 控件 | 12px | `rounded-xl` | 菜单行、按钮、搜索框内嵌 |
| 子按钮 | 10px | `rounded-[10px]` | 模式切换内部按钮 |
| 紧凑 | 8px | `rounded-lg` | 二级菜单项、小标签 |
| 圆形 | 9999px | `rounded-full` | 搜索框外壳、主操作按钮、通知按钮、头像、徽章 |

---

## 6. 阴影体系

| 级别 | 值 | 用途 |
|------|-----|------|
| 画板 | `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` | 主内容区卡片 |
| 卡片 | `shadow-[0_2px_10px_rgba(0,0,0,0.02)]` | 侧栏激活菜单项 |
| 用户卡片 | `shadow-[0_2px_12px_rgba(0,0,0,0.03)]` | 底部用户信息 |
| 子项 | `shadow-[0_2px_8px_rgba(0,0,0,0.02)]` | 二级菜单激活项 |
| 图标 | `shadow-md shadow-violet-600/20` | Logo 图标 |
| 按钮光效 | `shadow-lg shadow-white/10` | Hero 区白色按钮 |
| Hover | `hover:shadow-md` | 卡片悬停增强 |

---

## 7. Bento Grid 布局

用于首页、Dashboard 等多卡片页面:

```html
<div class="grid grid-cols-1 md:grid-cols-12
            auto-rows-[minmax(140px,auto)] gap-5
            max-w-6xl mx-auto pt-2">
```

### 常用 span 组合

| 卡片 | 列跨度 | 行跨度 |
|------|--------|--------|
| Hero 主卡 | `md:col-span-8` | `md:row-span-2` |
| 统计卡 | `md:col-span-4` | 1 |
| 全宽列表 | `md:col-span-12` | auto |
| 图表主区 | `md:col-span-8` | auto |
| 侧边信息 | `md:col-span-4` | auto |

---

## 8. Hero 卡片

```html
<div class="md:col-span-8 md:row-span-2 relative overflow-hidden
            rounded-[24px] bg-slate-900 p-8 flex flex-col justify-end group">
  <!-- 渐变光球 1: 右上 -->
  <div class="absolute top-0 right-0 w-[400px] h-[400px]
              bg-gradient-to-br from-violet-500/40 to-fuchsia-500/0
              rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3
              group-hover:bg-violet-400/50 transition-colors duration-700" />
  <!-- 渐变光球 2: 左下 -->
  <div class="absolute bottom-0 left-0 w-[300px] h-[300px]
              bg-gradient-to-tr from-blue-500/30 to-transparent
              rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
  <!-- 内容层 z-10 -->
  <!-- 标签: bg-white/10 backdrop-blur-md border border-white/10 rounded-full -->
  <!-- 标题: text-3xl md:text-4xl font-bold text-white tracking-tight -->
  <!-- 描述: text-slate-300 text-sm -->
  <!-- CTA 按钮组 -->
</div>
```

### CTA 按钮

- 主按钮: `px-6 py-3 bg-white text-slate-900 text-sm font-bold rounded-xl hover:scale-[1.02]`
- 次按钮: `px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-sm border border-white/5`

---

## 9. 数据统计卡

```html
<!-- 彩色底卡 -->
<div class="md:col-span-4 rounded-[24px] bg-violet-50 p-6
            flex flex-col justify-between border border-violet-100/50
            hover:bg-violet-100/50 transition-colors">
  <div class="flex items-start justify-between">
    <!-- 图标: w-10 h-10 rounded-xl bg-violet-600 text-white -->
    <!-- 状态标签: text-xs font-bold bg-white px-2.5 py-1 rounded-full shadow-sm -->
  </div>
  <div>
    <!-- 数值: text-[40px] font-black leading-none -->
    <!-- 单位: text-lg font-bold -->
    <!-- 描述: text-sm font-semibold -->
  </div>
</div>
```

---

## 10. Agent 卡片

```html
<div class="bg-white p-5 rounded-[20px] border border-slate-200/60
            shadow-[0_2px_8px_rgba(0,0,0,0.02)]
            hover:shadow-md hover:border-slate-300
            transition-all group cursor-pointer">
  <div class="flex gap-4 items-start">
    <!-- 图标: w-12 h-12 rounded-2xl {color-bg} font-bold text-lg -->
    <div class="flex-1">
      <!-- 名称: font-bold text-slate-800 text-[15px] group-hover:text-violet-600 -->
      <!-- 描述: text-[13px] text-slate-500 leading-snug line-clamp-2 -->
    </div>
  </div>
</div>
```

---

## 11. 管理端视图

```html
<!-- 概况横条 -->
<div class="md:col-span-12 rounded-[24px] bg-slate-50 border border-slate-200
            p-8 flex flex-col md:flex-row items-start md:items-center
            justify-between gap-6">

<!-- 数值块: text-3xl font-black text-slate-800 -->
<!-- 标签: text-xs font-semibold bg-emerald-50 text-emerald-600
     px-2 py-0.5 rounded-full border border-emerald-100 -->

<!-- 图表占位 -->
<div class="rounded-[16px] bg-slate-50 border border-dashed border-slate-300
            flex items-center justify-center text-slate-400 text-sm font-medium">

<!-- 空状态 -->
<div class="rounded-[16px] bg-slate-50 flex flex-col items-center justify-center
            text-slate-400 text-sm font-medium gap-2 border border-slate-100">
```

---

## 12. 按钮规范

| 类型 | 样式 |
|------|------|
| 主操作 (Header) | `bg-slate-900 text-white px-4 py-2 rounded-full text-[13px] font-semibold hover:bg-violet-600 shadow-sm` |
| Hero 主 CTA | `px-6 py-3 bg-white text-slate-900 text-sm font-bold rounded-xl hover:scale-[1.02] shadow-lg` |
| Hero 次 CTA | `px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl backdrop-blur-sm border border-white/5` |
| 文字链接 | `text-sm font-semibold text-violet-600 hover:text-violet-700` |
| 图标按钮 | `p-2 rounded-full bg-slate-100/50 hover:bg-slate-100 text-slate-400 hover:text-slate-800` |

---

## 13. 滚动条

```css
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #94a3b8; }
```

---

## 14. 字体大小速查

| 场景 | 大小 | 字重 |
|------|------|------|
| 页面大标题 | `text-3xl` ~ `text-4xl` | `font-bold` |
| 区块标题 | `text-xl` ~ `text-2xl` | `font-bold` |
| 卡片小标题 | `text-lg` / `text-base` | `font-bold` |
| 正文描述 | `text-sm` | `font-medium` / normal |
| 统计数值 | `text-[40px]` | `font-black` |
| 菜单一级 | `text-[14px]` | `font-semibold` (active) / `font-medium` |
| 菜单二级 | `text-[13px]` | `font-semibold` (active) |
| 搜索框 | `text-[13px]` | `font-medium` |
| Logo 主名 | `text-base` | `font-bold` |
| Logo 副标 | `text-[11px]` | `font-medium` |
| 角色标签 | `text-[9px]` | `font-bold` |
| 状态标签 | `text-xs` | `font-bold` |
| 描述文字 | `text-[13px]` | normal |

---

## 15. 动效约定

- 菜单项: `transition-all duration-200`
- 模式切换: `transition-all duration-300`
- Logo hover: `group-hover:scale-105 transition-transform`
- 渐变光球: `transition-colors duration-700`
- Hero CTA: `hover:scale-[1.02] transition-transform`
- 卡片 hover: `transition-all` (shadow + border 变化)

---

**文档版本**: 2026-03-23 v1.0 — 从示例代码提炼建立

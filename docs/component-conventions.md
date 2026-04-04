# 前端组件约定（列表 / 壳层 / 图表）

与「市场页面布局」无关的**管理台 / 治理类**列表，统一按下列方式扩展，避免第三套手写 `<table>` 分叉。

## 表格

- **管理页且已使用 [`MgmtPageShell`](../src/components/layout/MgmtPageShell.tsx)**：列表优先用 [`MgmtDataTable`](../src/components/management/MgmtDataTable.tsx)，并设 **`surface="plain"`**（壳本身已是大圆角卡片，内层不再套 `BentoCard`，减轻「卡片套卡片」）。
- **独立块、未包壳**：可用 `surface="card"`，由表格自带一层 `BentoCard`。
- **需要客户端排序 / 复杂筛排序列**：沿用 [`DataTable`](../src/components/common/DataTable.tsx)（如审计日志页），或给 `MgmtDataTable` 扩展能力后再迁移 — 不要新增自定义 `<table>` 复制样式。

## 按钮与弹窗

- 新代码优先使用 [`Button`](../src/components/common/Button.tsx)（`variant` + `loading` + `aria-busy`），与现有 `btnPrimary` / `btnSecondary` 视觉一致。
- 弹窗统一从 [`components/common`](../src/components/common/index.ts) 导入 `Modal` / `ConfirmDialog`。

## 图表

- ECharts 选项拼装优先使用 [`echartsTheme`](../src/components/charts/echartsTheme.ts) 的 `baseGrid`、`baseAxis`、`baseTooltip`、`chartColors` 等；具体渲染用 [`EChartCard`](../src/components/charts/EChartCard.tsx)。

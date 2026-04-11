<div align="center">
  <h1>🌐 智能体接入平台</h1>
  <p>面向高校的 AI 能力统一接入 | Agent Gateway Platform</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  </p>
</div>

---

## 📖 项目简介

**智能体接入平台** 面向高校提供智能体接入与管理能力，集成智能体（Agent）、智能应用、数据集、工作流等核心功能，为师生提供便捷、高效、安全的 AI 服务接入。

### 🎯 核心特性

- **🤖 智能体管理**：创建、配置、部署和管理AI智能体 ✅ 已实现
- **📊 数据监控**：实时监控、告警管理、性能分析 ✅ 已实现
- **👥 用户管理**：角色权限、API密钥、组织架构 ✅ 已实现
- **🛠️ 工具市场**：MCP服务器、工具发现与发布 ✅ 已实现
- **📈 数据可视化**：ECharts图表、实时仪表盘 ✅ 已实现
- **📦 资源注册中心**：资源统一注册、编辑、版本管理 ✅ 已实现
- **✅ 审核中心**：资源审核、发布管理 ✅ 已实现
- **👨‍💻 开发者中心**：API 文档、SDK 下载、API 调试、开发者统计 ✅ 已实现
- **🏪 应用市场**：应用浏览、使用、评价 ✅ 已实现
- **📊 数据集市场**：数据集浏览、申请使用 ✅ 已实现
- **🎯 技能市场**：技能浏览、调用、评价 ✅ 已实现
- **🔌 MCP 市场**：MCP 服务器浏览、工具调用 ✅ 已实现
- **⚙️ 提供商管理**：模型提供商配置与管理 ✅ 已实现
- **📤 发布管理**：我的发布资源管理 ✅ 已实现
- **🚪 入驻引导**：开发者入驻申请与审批 ✅ 已实现

### 🏆 产品定位

参考并融合了 **Coze编程**、**阿里百炼**、**百度千帆** 等主流AI平台的核心功能，专注于高校场景的智能体接入与管理需求。

---

## 🛠️ 技术栈

### 核心框架
- **React 19** - UI框架
- **TypeScript 5.0** - 类型安全
- **Vite 6.4** - 构建工具

### UI & 样式
- **Tailwind CSS 4.0** - 原子化CSS
- **DaisyUI 5.5** - 组件库
- **Framer Motion** - 动画库
- **Lucide React** - 图标库

### 状态管理
- **Zustand** - 全局状态管理
- **TanStack React Query** - 服务器状态管理
- **React Hook Form** - 表单管理
- **Zod** - 数据验证

### 数据可视化
- **ECharts** - 图表库
- **Swiper** - 轮播组件

### 路由与导航
- **React Router DOM** - 路由管理
- **统一控制台路径** - 登录后主路径为 **`#/c/{page}`**（`CONSOLE_PATH_PREFIX`，见 `src/constants/consoleRoutes.ts`）；`#/user/*`、`#/admin/*` 仅作兼容重定向
- **侧栏与路由矩阵** - 权威说明见 [docs/frontend/routes-and-navigation.md](./docs/frontend/routes-and-navigation.md)；全量 slug 表见 [docs/frontend-full-spec.md](./docs/frontend-full-spec.md) **A2**（可由 `npm run docs:gen-console-routes` 自源码重生）
- **导航树与顶栏** - `src/constants/navigation.ts`；空间/探索区辅助配置见 `src/constants/spaces.ts`

### HTTP
- **Axios** - HTTP客户端

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 或 **pnpm** >= 8.0.0

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 配置说明

项目支持开发环境和生产环境配置：

#### 开发环境

创建 `.env.development` 文件配置本地开发环境：

```env
# API 基路径
VITE_API_BASE_URL=/api

# Token 存储键名
VITE_TOKEN_KEY=lantu_access_token
VITE_REFRESH_TOKEN_KEY=lantu_refresh_token

# 本地开发：Vite 将 /api 代理到后端
VITE_API_PROXY_TARGET=http://localhost:8080
```

开发服务器会将 `/api` 请求代理到 `VITE_API_PROXY_TARGET` 指定的后端地址。

#### 生产环境

生产环境配置硬编码在 `src/config/env.ts` 中，API 请求直接指向 `/api` 路径，由 Nginx 反向代理处理。

### 运行开发服务器

```bash
npm run dev
```

访问：http://localhost:5173

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

---

## 📁 项目结构

```
src/
├── api/                    # API服务层
│   └── services/           # 各业务域的服务模块
├── components/             # 组件库
│   ├── common/            # 通用组件（表格、搜索、分页等）
│   ├── charts/            # 图表组件
│   ├── layout/            # 布局组件
│   └── business/          # 业务组件
├── config/                # 配置文件
│   └── env.ts             # 环境配置（支持环境变量）
├── constants/             # 常量定义
│   ├── navigation.ts      # 导航配置
│   └── spaces.ts          # 空间导航配置
├── context/               # React Context
├── hooks/                 # 自定义Hooks
│   └── queries/           # React Query Hooks
├── layouts/               # 布局组件
├── lib/                   # 工具库
│   ├── http.ts            # HTTP客户端
│   └── security.ts        # 安全工具（加密、XSS防护）
├── router/                # 路由配置
│   └── guards/            # 路由守卫
├── schemas/               # Zod验证模式
├── stores/                # Zustand状态管理
├── types/                 # TypeScript类型定义
│   ├── dto/               # 数据传输对象
│   └── api.ts             # API类型
├── utils/                 # 工具函数
└── views/                 # 页面组件
    ├── admin/             # 管理员控制台
    ├── agent/             # 智能体管理
    ├── apps/              # 应用市场
    ├── audit/             # 审核中心
    ├── common/            # 公共页面
    ├── dashboard/         # 仪表盘
    ├── dataset/           # 数据集市场
    ├── developer/         # 开发者中心
    ├── login/             # 登录页
    ├── marketplace/       # 统一资源市场
    ├── mcp/               # MCP市场
    ├── monitoring/        # 监控中心
    ├── onboarding/        # 入驻引导
    ├── provider/          # 提供商管理
    ├── publish/           # 发布管理
    ├── resourceCenter/    # 资源注册中心
    ├── skill/             # 技能市场
    ├── systemConfig/      # 系统配置
    ├── user/              # 用户工作台
    └── userMgmt/          # 用户管理
```

---

## 🎨 UI设计规范

项目遵循统一的UI设计规范，详见 [UI_STYLE_GUIDE.md](./.cursor/rules/UI_STYLE_GUIDE.md)。

### 核心原则

- **圆角规范**：控件 `rounded-xl`（12px），容器 `rounded-2xl`（16px）
- **主题支持**：完整的浅色/深色主题切换
- **响应式设计**：移动端、平板、桌面端适配
- **无障碍访问**：遵循WCAG 2.1标准

### 组件库使用

- **优先使用DaisyUI组件**：`btn`、`card`、`badge`、`table`等
- **统一使用通用组件**：`DataTable`、`SearchInput`、`Pagination`等
- **数据可视化**：统一使用 `EChartCard` + `echartsTheme`

#### 业务组件

位于 `src/components/business/` 目录，封装特定业务场景的 UI 组件：

| 组件名 | 用途 | 使用场景 |
|--------|------|----------|
| `PublishStatusStepper` | 发布状态步骤条 | 展示资源发布流程状态（草稿→待审核→测试中→已发布），支持驳回/暂停等特殊状态 |
| `PublishResourceCard` | 发布资源卡片 | 我的发布列表项，展示资源信息、状态步骤条、调用统计，支持审核/发布/撤回操作 |
| `BindingClosureSection` | 绑定闭包区块 | 展示与当前资源在登记关系中处于同一连通分量的关联资源，支持快速跳转 |
| `MessagePanel` | 消息面板 | 消息中心弹层，支持系统/通知/告警分类、已读/未读筛选、时间范围过滤、详情查看 |
| `ResourceReviewsSection` | 资源评论区块 | 资源详情页评论区，支持评分分布展示、评论树形结构、回复、点赞、删除 |

**使用示例**：

```tsx
import { PublishStatusStepper } from '../components/business/PublishStatusStepper';
import { PublishResourceCard } from '../components/business/PublishResourceCard';

<PublishStatusStepper theme={theme} current="pending_review" />

<PublishResourceCard
  theme={theme}
  item={publishItem}
  onView={() => navigateToDetail()}
  onWithdraw={() => handleWithdraw()}
/>
```

#### MCP 组件

位于 `src/components/mcp/` 目录，用于 MCP（Model Context Protocol）资源调用与调试：

| 组件名 | 用途 | 使用场景 |
|--------|------|----------|
| `McpDetailInvokeTab` | MCP 详情调用标签页 | MCP 资源详情页的「调用」标签页，整合快速试用与协议调试功能 |
| `McpInvokeProtocolPanel` | MCP 调用协议面板 | JSON-RPC 协议调试面板，支持快捷/高级模式、流式调用、通道选择 |
| `McpInvokeResultSection` | MCP 调用结果展示区 | 展示网关调用结果，包括状态码、耗时、JSON-RPC 错误解析、内容摘要 |
| `McpToolArgsForm` | MCP 工具参数表单 | 根据 `inputSchema` 自动生成参数表单，支持枚举、布尔、数值、文本类型 |

**使用示例**：

```tsx
import { McpDetailInvokeTab } from '../components/mcp/McpDetailInvokeTab';

<McpDetailInvokeTab
  theme={theme}
  detail={mcpDetail}
  invokeCatalogVersion={version}
  loadMcpDetailByPath={loadDetail}
  detailPageLoading={loading}
  showMessage={showMessage}
/>
```

---

## 🔐 安全特性

- **XSS防护**：所有用户输入经过 `sanitizeInput` 处理
- **加密存储**：敏感数据（token、配置）使用 `encryptStorage` 加密存储
- **CSRF防护**：请求头自动注入CSRF token
- **路由守卫**：`AuthGuard`、`GuestGuard`、`RoleGuard`
- **输入验证**：Zod模式验证所有表单输入

---

## ⚡ 性能优化

- **代码分割**：路由级别的懒加载
- **组件懒加载**：大型组件使用 `React.lazy`
- **资源优化**：图片懒加载、ECharts按需加载
- **缓存策略**：React Query智能缓存
- **本地存储优化**：加密存储、自动清理过期数据

---

## 📦 核心功能模块

### 1. 智能体管理 ✅ 已实现
- Agent列表、创建、编辑、删除
- Agent版本管理
- Agent市场（发现、发布、评分）
- Agent调试与测试
- Agent监控与追踪

### 2. 监控中心 ✅ 已实现
- 实时KPI监控
- 调用日志查询
- 告警管理与规则配置
- 性能分析
- 分布式追踪

### 3. 系统管理（管理员） ✅ 已实现
- 用户与角色管理
- API密钥与Token管理
- 组织架构
- 系统配置（模型、限流、审计日志）
- 网关路由管理
- 数据备份与恢复

### 4. 资源注册中心 ✅ 已实现
- 资源统一注册与编辑
- 版本管理与控制
- 资源元数据维护
- 资源状态管理

### 5. 审核中心 ✅ 已实现
- 资源审核流程
- 发布审批管理
- 审核记录查询
- 审核状态跟踪

### 6. 开发者中心 ✅ 已实现
- API 文档浏览
- SDK 下载
- API 调试工具
- 开发者统计数据

### 7. 应用市场 ✅ 已实现
- 应用浏览与搜索
- 应用使用与部署
- 应用评价与反馈
- 应用收藏管理

### 8. 数据集市场 ✅ 已实现
- 数据集浏览与搜索
- 数据集申请使用
- 数据集详情查看
- 数据集评价

### 9. 技能市场 ✅ 已实现
- 技能浏览与搜索
- 技能调用与测试
- 技能评价与反馈
- 技能收藏管理

### 10. MCP 市场 ✅ 已实现
- MCP 服务器浏览
- 工具列表查看
- 工具调用与测试
- MCP 资源管理

### 11. 提供商管理 ✅ 已实现
- 模型提供商配置
- 提供商连接测试
- 提供商状态监控
- 提供商权限管理

### 12. 发布管理 ✅ 已实现
- 我的发布资源列表
- 发布状态管理
- 发布统计分析
- 发布版本控制

### 13. 入驻引导 ✅ 已实现
- 开发者入驻申请
- 入驻审批流程
- 入驻资料管理
- 入驻进度跟踪

---

## 🎯 开发指南

### 添加新页面

1. 在 `src/views/` 创建页面组件
2. 在 `src/constants/navigation.ts` 配置侧栏/子项，在 `src/constants/consoleRoutes.ts` 的 `ADMIN_SIDEBAR_PAGES` / `USER_SIDEBAR_PAGES` 登记 `page` slug，并在 `src/layouts/MainLayout.tsx` 的 `MainContent` 中挂入渲染分支
3. 运行 `npm run docs:gen-console-routes` 更新文档 **A2**（如有契约变更同步后端 `docs/frontend-alignment-handbook.md`）
4. 创建对应的 API 服务（`src/api/services/`）与 React Query Hooks（`src/hooks/queries/`）

### 添加新组件

1. 在 `src/components/` 创建组件
2. 遵循UI_STYLE_GUIDE.md规范
3. 支持主题切换（light/dark）
4. 使用TypeScript严格类型
5. 导出到 `src/components/common/index.ts`（如果是通用组件）

### API服务开发

1. 在 `src/api/services/` 创建服务文件
2. 使用 `http` 客户端（`src/lib/http.ts`）
3. 定义DTO类型（`src/types/dto/`）
4. 创建React Query Hooks（`src/hooks/queries/`）

---

## 🚢 部署

### 构建

```bash
npm run build
```

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📝 开发规范

### 代码风格

- 使用 **ESLint** + **Prettier** 格式化
- TypeScript严格模式
- 函数式组件优先
- Hooks命名以 `use` 开头

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
perf: 性能优化
test: 添加测试
chore: 构建/工具变更
```

### 组件规范

- 组件文件使用 **PascalCase**
- Props接口以 `Props` 结尾
- 使用 `React.FC<Props>` 类型
- 导出使用 **named export**

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

---

## 📞 联系方式

- **项目地址**：https://github.com/WangDiGua/LantuConnect-Frontend
- **问题反馈**：https://github.com/WangDiGua/LantuConnect-Frontend/issues

---

<div align="center">
  <p>Made with ❤️ for Universities</p>
  <p>© 2026 智能体接入平台. All rights reserved.</p>
</div>

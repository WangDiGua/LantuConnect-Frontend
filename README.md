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

- **🤖 智能体管理**：创建、配置、部署和管理AI智能体
- **📚 知识库系统**：文档上传、向量检索、命中测试
- **🔄 工作流引擎**：可视化工作流设计、执行和监控
- **📊 数据监控**：实时监控、告警管理、性能分析
- **👥 用户管理**：角色权限、API密钥、组织架构
- **💰 计费系统**：使用统计、配额管理、账单查询
- **🛠️ 工具市场**：MCP服务器、工具发现与发布
- **📈 数据可视化**：ECharts图表、实时仪表盘

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
- **自定义空间导航系统** - 类VisionOS风格导航

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
    ├── adminApp/          # 管理员控制台
    ├── agent/             # 智能体管理
    ├── knowledge/         # 知识库
    ├── monitoring/         # 监控中心
    ├── systemConfig/       # 系统配置
    ├── tools/              # 工具管理
    └── userApp/            # 用户工作台
```

---

## 🎨 UI设计规范

项目遵循统一的UI设计规范，详见 [UI_STYLE_GUIDE.md](./docs/UI_STYLE_GUIDE.md)。

### 核心原则

- **圆角规范**：控件 `rounded-xl`（12px），容器 `rounded-2xl`（16px）
- **主题支持**：完整的浅色/深色主题切换
- **响应式设计**：移动端、平板、桌面端适配
- **无障碍访问**：遵循WCAG 2.1标准

### 组件库使用

- **优先使用DaisyUI组件**：`btn`、`card`、`badge`、`table`等
- **统一使用通用组件**：`DataTable`、`SearchInput`、`Pagination`等
- **数据可视化**：统一使用 `EChartCard` + `echartsTheme`

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

### 1. 智能体管理
- Agent列表、创建、编辑、删除
- Agent版本管理
- Agent市场（发现、发布、评分）
- Agent调试与测试
- Agent监控与追踪

### 2. 知识库系统
- 知识库CRUD
- 文档上传（支持批量）
- 向量检索与命中测试
- 开发者API
- 批量操作

### 3. 工作流引擎
- 可视化工作流编辑器
- 工作流执行与调度
- 执行历史与日志
- 工作流模板

### 4. 监控中心
- 实时KPI监控
- 调用日志查询
- 告警管理与规则配置
- 性能分析
- 分布式追踪

### 5. 系统管理（管理员）
- 用户与角色管理
- API密钥与Token管理
- 组织架构
- 系统配置（模型、限流、审计日志）
- 网关路由管理
- 数据备份与恢复

---

## 🎯 开发指南

### 添加新页面

1. 在 `src/views/` 创建页面组件
2. 在 `src/constants/navigation.ts` 添加导航项
3. 在 `src/router/routes.tsx` 添加路由
4. 创建对应的API服务（`src/api/services/`）
5. 创建React Query Hooks（`src/hooks/queries/`）

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

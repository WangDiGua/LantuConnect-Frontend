# 文档维护指南

本文档提供 LantuConnect-Frontend 项目的文档维护规范、检查清单和同步机制，确保文档与代码始终保持一致。

---

## 1. 文档维护规范

### 1.1 文档更新时机

以下情况**必须**更新相关文档：

#### 新增功能
- 新增页面或路由时
- 新增 API 接口时
- 新增组件（特别是业务组件）时
- 新增配置项或环境变量时

#### 修改现有功能
- 修改路由路径或导航结构时
- 修改 API 接口签名或返回格式时
- 修改组件 Props 或使用方式时
- 修改权限控制逻辑时

#### 架构变更
- 目录结构调整时
- 技术栈升级时
- 构建流程变更时
- 部署流程变更时

#### 问题修复
- 修复文档中的错误链接时
- 修正文档中的过时信息时
- 补充缺失的文档说明时

### 1.2 文档格式规范

#### Markdown 格式要求
- 使用标准 Markdown 语法，避免使用特定平台的扩展语法
- 标题层级清晰，最多不超过 4 级标题
- 代码块必须指定语言标识符（如 `typescript`、`bash`、`nginx`）
- 链接使用相对路径，确保在本地和远程仓库中都能正常访问

#### 链接规范
- **相对路径优先**：文档内部链接使用相对路径
- **锚点链接**：同一文档内引用使用 `#` 锚点
- **链接验证**：提交前必须验证所有链接的有效性
- **示例**：
  ```markdown
  ✅ 正确：[路由文档](./frontend/routes-and-navigation.md)
  ✅ 正确：[UI 规范](../.cursor/rules/UI_STYLE_GUIDE.md)
  ❌ 错误：[UI 规范](./docs/UI_STYLE_GUIDE.md)  # 路径不存在
  ```

#### 代码示例规范
- 代码示例必须可执行、可验证
- 包含必要的导入语句和类型定义
- 添加关键注释说明
- 示例：
  ```tsx
  import { PublishStatusStepper } from '../components/business/PublishStatusStepper';
  
  <PublishStatusStepper theme={theme} current="pending_review" />
  ```

#### 表格规范
- 表格必须有表头
- 列宽适当，避免过长的单行内容
- 对齐方式一致

### 1.3 文档审核流程

#### 提交前自查
1. 使用 Markdown 预览工具检查格式
2. 验证所有链接的有效性
3. 检查代码示例的正确性
4. 确认文档内容的准确性

#### Code Review 要点
- 文档是否与代码实现一致
- 是否有遗漏的更新点
- 格式是否符合规范
- 是否有错别字或语法错误

#### 文档更新记录
- 重要文档变更应在提交信息中说明
- 大规模文档重构应创建独立的提交
- 建议在文档末尾添加"最后更新时间"

---

## 2. 文档更新检查清单

### 2.1 新增页面时的检查项

- [ ] **路由配置**
  - [ ] 在 `src/constants/consoleRoutes.ts` 中注册页面 slug
  - [ ] 在 `src/layouts/MainLayout.tsx` 的 `MainContent` 中添加渲染分支
  - [ ] 运行 `npm run docs:gen-console-routes` 更新文档

- [ ] **导航配置**
  - [ ] 在 `src/constants/navigation.ts` 中配置侧栏菜单项
  - [ ] 配置菜单项的图标、名称、权限
  - [ ] 验证菜单项在浅色/深色主题下的显示

- [ ] **文档更新**
  - [ ] 更新 [routes-and-navigation.md](./frontend/routes-and-navigation.md)
  - [ ] 更新 [frontend-full-spec.md](./frontend-full-spec.md) 的 A2 章节
  - [ ] 如有契约变更，同步更新后端 `docs/frontend-alignment-handbook.md`
  - [ ] 更新 README.md 的项目结构说明（如有新目录）

- [ ] **API 服务**
  - [ ] 在 `src/api/services/` 创建对应的 API 服务
  - [ ] 在 `src/types/dto/` 定义 DTO 类型
  - [ ] 在 `src/hooks/queries/` 创建 React Query Hooks

### 2.2 修改路由时的检查项

- [ ] **路由定义**
  - [ ] 更新 `src/constants/consoleRoutes.ts` 中的路由常量
  - [ ] 更新 `src/layouts/MainLayout.tsx` 中的路由匹配逻辑
  - [ ] 检查是否有硬编码的路由路径需要同步修改

- [ ] **导航更新**
  - [ ] 更新 `src/constants/navigation.ts` 中的导航配置
  - [ ] 检查面包屑导航是否需要更新
  - [ ] 检查页面内的跳转链接是否需要更新

- [ ] **文档同步**
  - [ ] 运行 `npm run docs:gen-console-routes` 更新文档
  - [ ] 更新 [routes-and-navigation.md](./frontend/routes-and-navigation.md)
  - [ ] 检查并更新所有引用旧路由的文档

- [ ] **向后兼容**
  - [ ] 如需保留旧路由，添加重定向逻辑
  - [ ] 在 `src/router/` 中配置重定向规则

### 2.3 新增 API 接口时的检查项

- [ ] **类型定义**
  - [ ] 在 `src/types/dto/` 定义请求和响应类型
  - [ ] 使用 Zod 定义验证模式（`src/schemas/`）
  - [ ] 确保类型与后端接口文档一致

- [ ] **API 服务**
  - [ ] 在 `src/api/services/` 创建或更新服务方法
  - [ ] 使用 `src/lib/http.ts` 的 HTTP 客户端
  - [ ] 添加错误处理和类型转换

- [ ] **状态管理**
  - [ ] 在 `src/hooks/queries/` 创建 React Query Hooks
  - [ ] 配置缓存策略和重新验证逻辑
  - [ ] 处理加载状态和错误状态

- [ ] **文档更新**
  - [ ] 更新 API 相关的技术文档
  - [ ] 在开发者中心文档中添加新接口说明
  - [ ] 更新接口映射文档（如有）

### 2.4 新增组件时的检查项

- [ ] **组件开发**
  - [ ] 遵循 [UI_STYLE_GUIDE.md](../.cursor/rules/UI_STYLE_GUIDE.md) 规范
  - [ ] 支持浅色/深色主题切换
  - [ ] 使用 TypeScript 严格类型
  - [ ] 添加 Props 接口定义

- [ ] **组件文档**
  - [ ] 在组件文件顶部添加 JSDoc 注释
  - [ ] 更新 README.md 的组件库使用章节
  - [ ] 提供使用示例代码

- [ ] **导出配置**
  - [ ] 如为通用组件，导出到 `src/components/common/index.ts`
  - [ ] 如为业务组件，在 README.md 的业务组件表格中登记

- [ ] **测试验证**
  - [ ] 在多个页面中测试组件
  - [ ] 验证组件在不同主题下的显示
  - [ ] 验证组件的响应式表现

---

## 3. 如何保持文档与代码同步

### 3.1 使用自动化脚本

项目提供了自动化脚本，用于从源码生成文档：

#### 生成控制台路由文档
```bash
npm run docs:gen-console-routes
```

**功能**：
- 从 `src/constants/consoleRoutes.ts` 提取路由定义
- 从 `src/layouts/MainLayout.tsx` 提取页面映射
- 自动生成 [frontend-full-spec.md](./frontend-full-spec.md) 的 A2 章节

**使用时机**：
- 新增或修改控制台页面时
- 修改路由配置时
- 定期文档审查时

#### 其他自动化工具
- **ESLint**：检查代码规范，部分规则可扩展到文档
- **TypeScript**：类型检查，确保 API 类型定义与文档一致
- **Prettier**：代码格式化，保持代码与文档示例的一致性

### 3.2 定期文档审查机制

#### 审查频率
- **每两周**：快速检查核心文档的有效性
- **每月**：全面审查所有文档的准确性
- **每季度**：深度审查，包括架构文档和设计文档

#### 审查内容
1. **链接有效性**
   - 检查所有文档链接是否可访问
   - 检查锚点链接是否正确
   - 检查外部链接是否仍然有效

2. **内容准确性**
   - 代码示例是否可执行
   - 配置说明是否与实际配置一致
   - API 文档是否与接口实现一致

3. **完整性检查**
   - 新增功能是否有对应文档
   - 废弃功能是否已从文档中移除或标记
   - 是否有遗漏的文档更新

#### 审查流程
1. 创建文档审查任务（Issue 或任务卡片）
2. 按模块分配审查责任人
3. 使用检查清单逐项审查
4. 记录发现的问题并创建修复任务
5. 验证修复结果

### 3.3 文档与代码变更的关联管理

#### 提交规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，明确标识文档变更：

```
feat: 添加用户权限管理页面
docs: 更新路由文档，新增权限管理页面说明

- 新增 src/views/userMgmt/PermissionPage.tsx
- 更新 src/constants/consoleRoutes.ts
- 运行 npm run docs:gen-console-routes
```

#### PR 审查要点
在 Pull Request 模板中添加文档检查项：

```markdown
## 文档更新检查
- [ ] 代码变更是否需要更新文档？
- [ ] 是否已运行 `npm run docs:gen-console-routes`？
- [ ] README.md 是否需要更新？
- [ ] API 文档是否需要更新？
```

#### 关联管理策略
1. **功能分支策略**
   - 功能分支应包含代码和文档的同步变更
   - 避免单独的文档修复分支（除非是纯文档错误）

2. **Issue 关联**
   - 创建功能 Issue 时，明确标注需要更新的文档
   - 文档问题单独创建 Issue，并关联到相关的功能 Issue

3. **变更日志**
   - 重要变更应在 `CHANGELOG.md` 中记录
   - 文档重大变更也应记录在变更日志中

### 3.4 文档维护工具推荐

#### 本地工具
- **VS Code 插件**：
  - Markdown All in One：Markdown 编辑增强
  - markdownlint：Markdown 格式检查
  - Code Spell Checker：拼写检查

- **命令行工具**：
  - `markdown-link-check`：检查 Markdown 链接有效性
  - `markdownlint-cli`：Markdown 格式检查

#### 在线工具
- **GitHub Actions**：自动化文档检查（可配置）
- **Netlify/Vercel**：文档站点自动部署和预览

---

## 4. 常见问题与解决方案

### 4.1 文档链接失效

**问题**：文档中的链接指向不存在的文件或路径

**解决方案**：
1. 使用相对路径而非绝对路径
2. 提交前使用 `markdown-link-check` 验证链接
3. 定期运行链接检查脚本

### 4.2 文档与代码不一致

**问题**：文档描述的功能与实际代码实现不符

**解决方案**：
1. 代码变更时同步更新文档
2. 使用自动化脚本生成部分文档
3. Code Review 时检查文档一致性

### 4.3 文档更新遗漏

**问题**：新增功能后忘记更新相关文档

**解决方案**：
1. 使用本文档提供的检查清单
2. 在 PR 模板中添加文档检查项
3. 定期进行文档审查

### 4.4 文档格式不统一

**问题**：不同文档使用不同的格式风格

**解决方案**：
1. 遵循本文档的格式规范
2. 使用 `markdownlint` 自动检查格式
3. 参考 README.md 的格式风格

---

## 5. 后端接口文档更新规范

### 5.1 前后端接口同步检查机制

#### 接口变更同步流程

当后端接口发生变更时，必须按照以下流程同步更新前端文档：

1. **接口废弃通知**
   - 后端团队在决定废弃接口前，必须提前通知前端团队
   - 在后端 `docs/frontend-alignment-handbook.md` 中记录废弃计划和替代方案
   - 前端文档同步标记废弃状态

2. **文档更新检查点**
   - [ ] 检查所有引用该接口的文档
   - [ ] 添加废弃标记和下线时间
   - [ ] 提供替代方案说明
   - [ ] 更新迁移指南
   - [ ] 验证文档链接有效性

3. **定期同步审查**
   - **每两周**：检查 `frontend-backend-alignment-spec.md` 与后端文档的一致性
   - **每月**：全面审查所有 API 相关文档
   - **每季度**：深度审查接口映射和调用链路文档

#### 接口状态追踪表

维护一个接口状态追踪表，记录所有接口的生命周期：

| 接口路径 | 状态 | 下线时间 | 替代方案 | 文档更新状态 |
|---------|------|---------|---------|------------|
| `/resource-grants` | 已下线 | 2026-04 | `/resource-center/resources` | ✅ 已更新 |
| `/grant-applications` | 已废弃 | 待定 | `/catalog/resources` | ✅ 已更新 |
| `/agents/**` | 已下线 | 2026-03 | `/catalog/resources` | ✅ 已更新 |

### 5.2 废弃接口标记规范

#### 标记格式

废弃接口必须使用统一的标记格式：

```markdown
~~`接口路径`~~（已废弃，下线时间：YYYY-MM）
```

或

```markdown
~~`接口路径`~~（已下线）
```

#### 标记位置

废弃标记应出现在以下位置：

1. **接口列表表格**
   ```markdown
   | 方法 | 路径 | 说明 |
   |------|------|------|
   | ~~POST~~ | ~~`/resource-grants`~~ | ~~创建授权~~ **已下线** |
   ```

2. **API 映射章节**
   ```markdown
   - 接口：
     - ~~创建 `POST /resource-grants`~~ → **替代方案**：使用 `/resource-center/resources`
   ```

3. **页面功能说明**
   ```markdown
   > **⚠️ 重要提示**：该接口已下线（下线时间：YYYY-MM）。请使用 [替代方案](#替代方案链接)。
   ```

#### 废弃标记模板

```markdown
> **⚠️ 重要提示**：`接口路径` 接口已废弃（下线时间：YYYY-MM）。
> 
> **替代方案**：使用 `新接口路径` 进行操作。
> 
> **迁移指南**：
> - 操作说明 1
> - 操作说明 2
> 
> 详见 [相关文档](./文档路径.md)。
```

### 5.3 迁移指南编写规范

#### 迁移指南结构

完整的迁移指南应包含以下内容：

```markdown
## 接口迁移指南：旧接口 → 新接口

### 背景
简要说明接口废弃的原因和背景。

### 接口对照表

| 旧接口 | 新接口 | 说明 |
|--------|--------|------|
| `POST /old-path` | `POST /new-path` | 功能描述 |
| `GET /old-path` | `GET /new-path` | 功能描述 |

### 迁移步骤

1. **步骤一**：详细说明
   ```typescript
   // 旧代码
   await oldService.method();
   
   // 新代码
   await newService.method();
   ```

2. **步骤二**：详细说明

### 注意事项

- 注意点 1
- 注意点 2

### 常见问题

**Q: 旧接口还能用多久？**
A: 明确说明下线时间。

**Q: 如果不迁移会怎样？**
A: 说明影响和风险。
```

#### 迁移指南存放位置

- **主迁移文档**：`docs/frontend-backend-alignment-spec.md` 的"已废弃接口"章节
- **功能文档**：相关功能文档的"迁移指南"小节
- **API 文档**：接口列表中的废弃标记旁

### 5.4 接口文档更新检查清单

当后端接口发生变更时，使用以下检查清单确保文档同步更新：

#### 接口废弃时的检查项

- [ ] **标记废弃状态**
  - [ ] 在接口列表中添加删除线标记
  - [ ] 标注下线时间
  - [ ] 添加替代方案说明

- [ ] **更新相关文档**
  - [ ] 更新 `frontend-backend-alignment-spec.md`
  - [ ] 更新 `frontend-full-spec.md`
  - [ ] 更新功能相关文档（如 `frontend-menu-process-molecular-spec.md`）
  - [ ] 更新 API 映射文档

- [ ] **提供迁移指南**
  - [ ] 编写迁移步骤说明
  - [ ] 提供代码示例
  - [ ] 说明注意事项

- [ ] **验证文档一致性**
  - [ ] 检查所有引用该接口的文档
  - [ ] 确保废弃标记格式统一
  - [ ] 验证替代方案链接有效

#### 新增接口时的检查项

- [ ] **记录接口信息**
  - [ ] 在 `frontend-backend-alignment-spec.md` 中添加接口说明
  - [ ] 在 `frontend-full-spec.md` 中记录接口映射
  - [ ] 更新 API 服务文档

- [ ] **更新功能文档**
  - [ ] 更新相关功能文档的接口引用
  - [ ] 添加接口使用示例
  - [ ] 说明权限要求

- [ ] **同步类型定义**
  - [ ] 在 `src/types/dto/` 中定义类型
  - [ ] 在 `src/api/services/` 中实现服务方法
  - [ ] 更新相关 Hook

### 5.5 文档版本控制

#### 变更记录格式

在文档末尾维护变更记录：

```markdown
## 文档变更记录

| 日期 | 变更内容 | 变更人 | 影响范围 |
|------|---------|--------|---------|
| 2026-04-11 | 标记 `/resource-grants` 接口为已下线 | AI Assistant | 授权管理相关文档 |
| 2026-04-10 | 更新接口迁移指南 | AI Assistant | API 文档 |
```

#### 版本标记规范

对于重要的接口变更，在文档中添加版本标记：

```markdown
> **版本说明**：该接口在 v2.0 版本中废弃，将在 v3.0 版本中移除。
```

---

## 6. 附录

### 6.1 文档索引

#### 核心文档
- [README.md](../README.md)：项目总览和快速开始
- [routes-and-navigation.md](./frontend/routes-and-navigation.md)：路由与导航权威文档
- [frontend-full-spec.md](./frontend-full-spec.md)：前端完整规格说明

#### 规范文档
- [UI_STYLE_GUIDE.md](../.cursor/rules/UI_STYLE_GUIDE.md)：UI 设计规范
- [frontend-backend-alignment-spec.md](./frontend-backend-alignment-spec.md)：前后端对齐规格

#### 开发指南
- [frontend-resource-registration-runbook.md](./frontend-resource-registration-runbook.md)：资源注册操作手册
- [resource-registration-authorization-invocation-guide.md](./resource-registration-authorization-invocation-guide.md)：资源注册授权调用指南

### 6.2 相关脚本

| 脚本命令 | 功能说明 | 使用时机 |
|---------|---------|---------|
| `npm run docs:gen-console-routes` | 从源码生成控制台路由文档 | 新增/修改路由时 |
| `npm run lint` | 代码规范检查 | 提交前 |
| `npm run type-check` | TypeScript 类型检查 | 提交前 |

### 6.3 联系方式

如有文档相关问题或建议，请通过以下方式反馈：
- **GitHub Issues**：https://github.com/WangDiGua/LantuConnect-Frontend/issues
- **项目维护者**：查看 README.md 中的联系方式

---

**最后更新时间**：2026-04-11

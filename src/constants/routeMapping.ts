/**
 * 路由映射：中文显示名称 <-> 英文路由路径
 * 用于在URL中使用英文路径，但在UI中显示中文标签
 */

// 管理员路由映射
export const ADMIN_ROUTE_MAPPING: Record<string, string> = {
  // Sidebar routes
  '系统概览': 'overview',
  '系统配置': 'system-config',
  '用户管理': 'user-management',
  '模型服务管理': 'model-service',
  '工具管理': 'tool-management',
  '运营与安全': 'ops-security',
  '集成与中台': 'integration',
  '监控中心': 'monitoring',
  '数据管理': 'data-management',
  '系统日志': 'system-log',
  
  // Sub-routes (系统概览的子路由)
  // 注意：'系统概览' 作为子路由也映射到 'overview'，与sidebar共享
  '资源监控': 'resource-monitoring',
  '使用统计': 'usage-statistics',
  '健康检查': 'health-check',
  '系统参数': 'system-params',
  '安全设置': 'security-settings',
  '网络配置': 'network-config',
  '限流策略': 'rate-limit',
  '配额管理': 'rate-limit-policy',
  '访问控制': 'access-control',
  '审计日志': 'audit-log',
  '角色管理': 'role-management',
  '组织架构': 'org-structure',
  'API Key 管理': 'api-key-management',
  '模型接入': 'model-integration',
  '模型测试': 'model-test',
  '推理路由': 'inference-routing',
  '模型监控': 'model-monitoring',
  '成本统计': 'cost-statistics',
  'GPU 资源池': 'gpu-pool',
  '工具审核': 'tool-review',
  'MCP Server 审核': 'mcp-review',
  '插件签名': 'plugin-signature',
};

// 用户路由映射
export const USER_ROUTE_MAPPING: Record<string, string> = {
  // Sidebar routes
  '工作台': 'workspace',
  'AI 助手': 'ai-assistant',
  '我的 Agent': 'my-agent',
  '工作流': 'workflow',
  '我的资产': 'my-assets',
  '模型服务': 'model-service',
  '工具广场': 'tool-square',
  '发布与连接': 'publish-connect',
  '我的数据': 'my-data',
  '用量账单': 'usage-billing',
  '个人设置': 'profile',
  '文档教程': 'docs-tutorial',
  
  // Sub-routes
  '概览': 'overview',
  '最近项目': 'recent-projects',
  '对话流编排': 'conversation-flow',
  '版本与发布': 'version-publish',
  '知识库': 'knowledge-base',
  '数据库': 'database',
  '我的工具': 'my-tools',
  '工具市场': 'tool-market',
  '模型接入': 'model-integration',
  '模型测试': 'model-test',
  '推理路由': 'inference-routing',
  'API Key': 'api-key',
  '使用统计': 'usage-statistics',
};

// 反向映射：英文路由 -> 中文显示名称
export const ADMIN_ROUTE_REVERSE_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(ADMIN_ROUTE_MAPPING).map(([cn, en]) => [en, cn])
);

export const USER_ROUTE_REVERSE_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(USER_ROUTE_MAPPING).map(([cn, en]) => [en, cn])
);

/**
 * 将中文路由转换为英文路由
 */
export function toEnglishRoute(chineseRoute: string, isAdmin: boolean): string {
  const mapping = isAdmin ? ADMIN_ROUTE_MAPPING : USER_ROUTE_MAPPING;
  return mapping[chineseRoute] || chineseRoute.toLowerCase().replace(/\s+/g, '-');
}

/**
 * 将英文路由转换为中文显示名称
 */
export function toChineseLabel(englishRoute: string, isAdmin: boolean): string {
  const mapping = isAdmin ? ADMIN_ROUTE_REVERSE_MAPPING : USER_ROUTE_REVERSE_MAPPING;
  return mapping[englishRoute] || englishRoute;
}

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/views/agent/AgentMarket.tsx',
    patterns: ['resourceCatalogService.resolve', 'invokeService.invoke', '查看与使用', '调用中…'],
  },
  {
    file: 'src/views/dataset/DatasetMarket.tsx',
    patterns: ['resourceCatalogService.resolve', 'invokeService.invoke', '申请使用', '调用中…', 'ResourceReviewsSection', 'targetType="dataset"'],
  },
  {
    file: 'src/components/business/ResourceReviewsSection.tsx',
    patterns: ['reviewService.create', 'reviewService.toggleHelpful', '评论提交失败', '操作失败，请重试'],
  },
  {
    file: 'src/views/skill/SkillMarket.tsx',
    patterns: ['ResourceReviewsSection', 'invokeService.invoke'],
  },
  {
    file: 'src/views/apps/AppMarket.tsx',
    patterns: ['ResourceReviewsSection', 'resourceCatalogService.resolve', "resolved.invokeType === 'redirect'", 'mapInvokeFlowError', 'showMessage?.(`该应用为跳转类型'],
  },
  {
    file: 'src/views/mcp/McpMarket.tsx',
    patterns: ['ResourceReviewsSection', 'targetType="mcp"', '评分与评论'],
  },
  {
    file: 'src/views/resourceCenter/ResourceCenterManagementPage.tsx',
    patterns: ['ConfirmDialog', 'PageError', 'EmptyState', 'SearchInput', 'setPage(1)', 'Pagination page={page} pageSize={PAGE_SIZE} total={total}'],
  },
  {
    file: 'src/views/user/UserProfile.tsx',
    patterns: ['authService.listSessions', 'authService.revokeSession', '撤销中…'],
  },
  {
    file: 'src/views/user/UserSettingsPage.tsx',
    patterns: ['userSettingsService.listApiKeys', 'userSettingsService.createApiKey', 'userSettingsService.deleteApiKey', 'API Key 管理'],
  },
  {
    file: 'src/views/dashboard/QuickAccess.tsx',
    patterns: ["navigate(buildPath('user', card.title === '接入文档' ? 'api-docs' : 'hub'))"],
    forbiddenPatterns: ["buildPath(isAdmin ? 'admin' : 'user', 'api-docs')"],
  },
  {
    file: 'src/views/monitoring/CallLogPage.tsx',
    patterns: ['TraceId', 'safeText(r.traceId)', '状态码、TraceId'],
  },
  {
    file: 'src/views/userMgmt/RoleListPage.tsx',
    patterns: ['r.isSystem', '系统内置角色不允许删除', '系统内置角色不允许编辑'],
  },
  {
    file: 'src/views/developer/ApiPlaygroundPage.tsx',
    patterns: ['http.instance.request', 'toRelativeApiPath', 'ApiException'],
  },
  {
    file: 'src/components/common/ConfirmDialog.tsx',
    patterns: ["event.key === 'Escape'", 'aria-labelledby', 'aria-describedby'],
  },
  {
    file: 'src/views/audit/ResourceAuditList.tsx',
    patterns: ["useState<'all' | ResourceAuditItemVO['status']>('pending_review')", 'status: statusFilter === \'all\' ? undefined : statusFilter', "sortBy: 'submitTime'", 'setSearch(value);', 'setPage(1);', 'PageError', 'EmptyState'],
  },
  {
    file: 'src/utils/invokeError.ts',
    patterns: ['err.status === 409 || err.code === 4001', '资源当前状态不允许调用'],
  },
  {
    file: 'src/views/agent/AgentMarket.tsx',
    patterns: ['Failed to load agents', 'showMessage(err instanceof Error ? err.message : \'加载智能体列表失败\''],
  },
];

const failures = [];

for (const check of checks) {
  const abs = path.join(root, check.file);
  if (!fs.existsSync(abs)) {
    failures.push(`${check.file}: file not found`);
    continue;
  }
  const content = fs.readFileSync(abs, 'utf8');
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      failures.push(`${check.file}: missing "${pattern}"`);
    }
  }
  for (const pattern of check.forbiddenPatterns ?? []) {
    if (content.includes(pattern)) {
      failures.push(`${check.file}: should not include "${pattern}"`);
    }
  }
}

if (failures.length > 0) {
  console.error('UI smoke assertions failed:\n' + failures.map((f) => `- ${f}`).join('\n'));
  process.exit(1);
}

console.log('UI smoke assertions passed.');

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

/** 轻量静态断言：关键文件仍包含约定子串（避免大改版后静默漂移）。 */
const checks = [
  {
    file: 'src/views/agent/AgentMarket.tsx',
    patterns: ['agentService', 'resourceCatalogService', '查看与使用', '加载 Agent 市场失败'],
  },
  {
    file: 'src/views/dataset/DatasetMarket.tsx',
    patterns: [
      'datasetService',
      'resourceCatalogService',
      'filterTagsForResourceType',
      'MarketPlazaPageShell',
      '不提供统一网关 invoke',
    ],
  },
  {
    file: 'src/components/business/ResourceReviewsSection.tsx',
    patterns: ['reviewService.create', 'reviewService.toggleHelpful', '评论提交失败', '操作失败，请重试'],
  },
  {
    file: 'src/views/skill/SkillMarket.tsx',
    patterns: ['resourceCatalogService.resolve', 'mapInvokeFlowError', 'GatewayApiKeyInput', 'skillService'],
  },
  {
    file: 'src/views/apps/AppMarket.tsx',
    patterns: ['smartAppService', 'resourceCatalogService', 'embedType', '查看与使用'],
  },
  {
    file: 'src/views/mcp/McpMarket.tsx',
    patterns: ['ResourceReviewsSection', 'targetType="mcp"', '评分与评论'],
  },
  {
    file: 'src/views/resourceCenter/ResourceCenterManagementPage.tsx',
    patterns: [
      'ConfirmDialog',
      'PageError',
      'EmptyState',
      'SearchInput',
      'setPage(1)',
      'page={page} pageSize={PAGE_SIZE} total={total}',
    ],
  },
  {
    file: 'src/views/user/UserProfile.tsx',
    patterns: ['authService.listSessions', 'authService.revokeSession', '撤销中…'],
  },
  {
    file: 'src/views/user/UserSettingsPage.tsx',
    patterns: [
      'userSettingsService.listApiKeys',
      'userSettingsService.createApiKey',
      'userSettingsService.revokeApiKey',
      'API Key',
    ],
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
    patterns: [
      "useState<'all' | ResourceAuditItemVO['status']>('pending_review')",
      "status: statusFilter === 'all' ? undefined : statusFilter",
      "sortBy: 'submitTime'",
      'setSearch(value);',
      'setPage(1);',
      'PageError',
      'EmptyState',
    ],
  },
  {
    file: 'src/utils/invokeError.ts',
    patterns: ['err.status === 409 || err.code === 4001', '资源当前状态不允许调用'],
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

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/views/agent/AgentMarket.tsx',
    patterns: ['agentService', 'resourceCatalogService', '查看与测试', '加载 Agent 市场失败'],
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
    patterns: ['listSessions({ page, pageSize: sessionPageSize })', 'authService.revokeSession', '会话已撤销', '登录设备与会话'],
  },
  {
    file: 'src/views/user/UserSettingsPage.tsx',
    patterns: ['userSettingsService.getWorkspace', 'userSettingsService.updateWorkspace', '登录设备与会话', '密钥与集成套餐'],
  },
  {
    file: 'src/views/monitoring/CallLogPage.tsx',
    patterns: ['TraceId', 'safeText(r.traceId)', '状态码'],
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
      "useState<'all' | ResourceAuditItemVO['status']>('all')",
      "status: statusFilter === 'all' ? 'all' : statusFilter",
      "sortBy: 'submitTime'",
      'setSearch(value);',
      'setPage(1);',
      'PageError',
      'EmptyState',
    ],
  },
  {
    file: 'src/components/management/RowActionGroup.tsx',
    patterns: ['export const RowActionButton', "moreLabel = '更多'", '展开更多操作（${overflowActions.length}项）'],
  },
  {
    file: 'src/views/userMgmt/UserListPage.tsx',
    patterns: ['RowActionGroup', "label: u.status === 'active' ? '禁用' : '启用'", 'ariaLabel: `编辑用户 ${u.username}`'],
    forbiddenPatterns: ["label: '??'", 'ariaLabel: `???? ${u.username}`'],
  },
  {
    file: 'src/views/userMgmt/RoleListPage.tsx',
    patterns: ['RowActionGroup', '系统角色不支持编辑', '系统角色不支持删除'],
    forbiddenPatterns: ["label: '??'", '?????????'],
  },
  {
    file: 'src/views/userMgmt/DeveloperApplicationListPage.tsx',
    patterns: ['RowActionGroup', "label: '通过'", "label: '驳回'"],
    forbiddenPatterns: ["label: '??'"],
  },
  {
    file: 'src/views/userMgmt/ApiKeyListPage.tsx',
    patterns: ['RowActionGroup', '查看 API Key 详情', '吊销 API Key'],
    forbiddenPatterns: ["label: '??'", 'ariaLabel: `?? API Key'],
  },
  {
    file: 'src/views/userMgmt/OrgStructurePage.tsx',
    patterns: ['RowActionGroup', 'ariaLabel: `编辑部门 ${d.name}`', 'ariaLabel: `删除部门 ${d.name}`'],
    forbiddenPatterns: ['className={`text-xs ${textMuted(theme)} hover:text-neutral-800 dark:hover:text-slate-200`}'],
  },
  {
    file: 'src/views/systemConfig/AnnouncementPage.tsx',
    patterns: ['RowActionGroup', "label: '详情'", "label: pubOn ? '停用' : '启用'"],
    forbiddenPatterns: ["label: '??'"],
  },
  {
    file: 'src/views/systemConfig/RateLimitPage.tsx',
    patterns: ['RowActionGroup', "label: '编辑'", "label: '删除'"],
    forbiddenPatterns: ["label: '??'"],
  },
  {
    file: 'src/views/systemConfig/SensitiveWordPage.tsx',
    patterns: ['RowActionGroup', "label: on ? '停用' : '启用'", "label: '删除'"],
    forbiddenPatterns: ["label: '??'"],
  },
  {
    file: 'src/views/monitoring/CallLogPage.tsx',
    patterns: ['RowActionGroup', "label: '链路'", "label: '详情'"],
    forbiddenPatterns: ['className="text-xs text-sky-600 hover:underline"'],
  },
  {
    file: 'src/views/monitoring/AlertCenterPage.tsx',
    patterns: ['RowActionGroup', "label: '认领'", "label: '试跑'"],
    forbiddenPatterns: [
      "className={btnGhost(theme)} onClick={() => setDetailId(item.id)}",
      "className={btnGhost(theme)} onClick={() => { void runDryRun(rule); }}",
    ],
  },
  {
    file: 'src/views/monitoring/HealthGovernancePage.tsx',
    patterns: ['RowActionGroup', "label: '策略'"],
    forbiddenPatterns: ['className={mgmtTableActionGhost(theme)}'],
  },
  {
    file: 'src/views/monitoring/HealthConfigPage.tsx',
    patterns: ['RowActionGroup', 'PencilLine', "label: '编辑'"],
    forbiddenPatterns: ['onClick={() => openEdit(r)} className={mgmtTableActionGhost(theme)}'],
  },
  {
    file: 'src/views/monitoring/CircuitBreakerPage.tsx',
    patterns: ['RowActionGroup', "label: '熔断'", "label: '恢复'"],
    forbiddenPatterns: ['className={mgmtTableActionGhost(theme)}>编辑</button>'],
  },
  {
    file: 'src/views/monitoring/PerformanceAnalysisPanel.tsx',
    patterns: ['RowActionButton', 'RowActionGroup', "label: '链路'", "label: '详情'"],
    forbiddenPatterns: ['className="text-sky-600 hover:text-sky-700 underline-offset-2 hover:underline"'],
  },
  {
    file: 'src/views/resourceCenter/ResourceCenterManagementPage.tsx',
    patterns: ['RowActionGroup', "label: '生命周期'", "publish-${item.id}` ? '发布中' : '发布上架'", "label: '强制下架'"],
    forbiddenPatterns: [
      "onClick={() => onNavigateRegister(item.resourceType, item.id)} className={mgmtTableActionGhost(theme)}",
      "onClick={() => void openVersions(item)} className={mgmtTableActionGhost(theme)}",
    ],
  },
  {
    file: 'src/components/business/PublishResourceCard.tsx',
    patterns: ['RowActionGroup', "audit-approve-${item.id}` ? '处理中' : '通过审核'", "label: '撤回审核'"],
    forbiddenPatterns: ['onClick={onView} className={`${btnGhost(theme)} gap-1.5 px-3 py-2`}'],
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
      failures.push(`${check.file}: missing \"${pattern}\"`);
    }
  }
  for (const pattern of check.forbiddenPatterns ?? []) {
    if (content.includes(pattern)) {
      failures.push(`${check.file}: should not include \"${pattern}\"`);
    }
  }
}

if (failures.length > 0) {
  console.error('UI smoke assertions failed:\n' + failures.map((f) => `- ${f}`).join('\n'));
  process.exit(1);
}

console.log('UI smoke assertions passed.');

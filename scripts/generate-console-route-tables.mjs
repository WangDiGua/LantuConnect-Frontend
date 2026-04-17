#!/usr/bin/env node
/**
 * 从 `src/constants/consoleRoutes.ts` 机械生成 A2.1 / A2.2 矩阵（sidebarId 与 page 与源码一致）。
 * 状态/组件/说明列对齐 `MainLayout.tsx` 与 `normalizeDeprecatedPage` 的当前行为。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const routesPath = path.join(root, 'src/constants/consoleRoutes.ts');

function extractBalancedBlock(src, openIdx) {
  if (src[openIdx] !== '{') throw new Error('expected {');
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { end: i, text: src.slice(openIdx, i + 1) };
    }
  }
  throw new Error('unclosed {');
}

function findConstRecordBlock(src, constName) {
  const needle = `const ${constName}: Record<string, string[]> = `;
  const idx = src.indexOf(needle);
  if (idx < 0) throw new Error(`missing ${needle}`);
  const braceStart = idx + needle.length;
  return extractBalancedBlock(src, braceStart);
}

function parseSidebarPagesObject(blockText) {
  const inner = blockText.slice(1, -1);
  const map = {};
  const keyRe = /'([^']+)'\s*:\s*\[/g;
  let m;
  while ((m = keyRe.exec(inner)) !== null) {
    const sidebarId = m[1];
    const arrStart = m.index + m[0].length;
    let depth = 1;
    let j = arrStart;
    for (; j < inner.length && depth > 0; j++) {
      if (inner[j] === '[') depth++;
      else if (inner[j] === ']') depth--;
    }
    const arrBody = inner.slice(arrStart, j - 1);
    const pages = [...arrBody.matchAll(/'([^']+)'/g)].map((x) => x[1]);
    map[sidebarId] = pages;
  }
  return map;
}

function parseLegacySet(src, exportName) {
  const needle = `export const ${exportName} = new Set([`;
  const i = src.indexOf(needle);
  if (i < 0) return new Set();
  const start = i + needle.length;
  const end = src.indexOf('])', start);
  const body = src.slice(start, end);
  return new Set([...body.matchAll(/'([^']+)'/g)].map((x) => x[1]));
}

function parseLegacyAuditDefaults(src) {
  const needle = 'export const ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE: Partial<Record<string, ResourceType>> = ';
  const i = src.indexOf(needle);
  if (i < 0) throw new Error('missing ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE');
  const braceStart = i + needle.length;
  const { text } = extractBalancedBlock(src, braceStart);
  const inner = text.slice(1, -1);
  const out = {};
  for (const m of inner.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function parseLegacyPageToType(src) {
  const needle = 'export const USER_LEGACY_MARKET_PAGE_TO_TAB: Record<string, ResourceType> = ';
  const i = src.indexOf(needle);
  const out = {};
  if (i >= 0) {
    const { text } = extractBalancedBlock(src, i + needle.length);
    const inner = text.slice(1, -1);
    for (const m of inner.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) {
      out[m[1]] = m[2];
    }
  }
  return out;
}

const LEGACY_USER_LIST = new Set([
  'agent-list',
  'skill-list',
  'mcp-server-list',
  'app-list',
  'dataset-list',
]);

/** 与 MainLayout AdminOverviewModule / 懒导出命名对齐 */
const ADMIN_COMPONENT = {
  dashboard: 'AdminOverviewModule',
  'usage-statistics': 'AdminOverviewModule',
  'data-reports': 'AdminOverviewModule',
  'resource-catalog': 'ResourceCenterManagementPage',
  'agent-register': 'ResourceRegisterPage(agent)',
  'agent-detail': 'AgentDetail',
  'skill-register': 'ResourceRegisterPage(skill)',
  'mcp-register': 'ResourceRegisterPage(mcp)',
  'app-register': 'ResourceRegisterPage(app)',
  'dataset-register': 'ResourceRegisterPage(dataset)',
  'resource-audit': 'ResourceAuditList',
  'user-list': 'AdminUserHubModule',
  'role-management': 'AdminUserHubModule',
  'organization': 'AdminUserHubModule',
  'api-key-management': 'AdminUserHubModule',
  'developer-applications': 'AdminUserHubModule',
  'provider-list': 'ProviderManagementPage',
  'provider-create': 'ProviderManagementPage',
  'monitoring-overview': 'AdminMonitoringHubModule',
  'performance-center': 'AdminMonitoringHubModule',
  'call-logs': 'AdminMonitoringHubModule',
  'trace-center': 'AdminMonitoringHubModule',
  'alert-center': 'AdminMonitoringHubModule',
  'health-governance': 'AdminMonitoringHubModule',
  'tag-management': 'AdminSystemConfigHubModule',
  'system-params': 'AdminSystemConfigHubModule',
  'security-settings': 'AdminSystemConfigHubModule',
  'network-config': 'AdminSystemConfigHubModule',
  'rate-limit-policy': 'AdminSystemConfigHubModule',
  'access-control': 'AdminSystemConfigHubModule',
  'audit-log': 'AdminSystemConfigHubModule',
  'sensitive-words': 'AdminSystemConfigHubModule',
  announcements: 'AdminSystemConfigHubModule',
};

const USER_COMPONENT = {
  hub: 'ExploreHub',
  workspace: 'UserWorkspaceOverview',
  'developer-onboarding': 'DeveloperOnboardingPage',
  'my-favorites': 'MyFavoritesPage',
  'my-agents-pub': 'MyPublishHubPage',
  'resource-market': 'UserResourceMarketHub',
  'skill-market': '—',
  'mcp-market': '—',
  'resource-center': 'ResourceCenterManagementPage',
  'agent-list': 'ResourceCenterManagementPage(agent)',
  'skill-list': 'ResourceCenterManagementPage(skill)',
  'mcp-server-list': 'ResourceCenterManagementPage(mcp)',
  'app-list': 'ResourceCenterManagementPage(app)',
  'dataset-list': 'ResourceCenterManagementPage(dataset)',
  'agent-register': 'ResourceRegisterPage(agent)',
  'skill-register': 'ResourceRegisterPage(skill)',
  'mcp-register': 'ResourceRegisterPage(mcp)',
  'app-register': 'ResourceRegisterPage(app)',
  'dataset-register': 'ResourceRegisterPage(dataset)',
  'skills-center': 'SkillMarket / SkillMarketDetailPage',
  'mcp-center': 'McpMarket',
  'dataset-center': 'DatasetMarket / DatasetMarketDetailPage',
  'agents-center': 'AgentMarket / AgentMarketDetailPage',
  'apps-center': 'AppMarket / AppMarketDetailPage',
  'agent-market': '—',
  'app-market': '—',
  'dataset-market': '—',
  'my-publish-agent': 'MyPublishListRoute',
  'my-publish-skill': 'MyPublishListRoute',
  'my-publish-mcp': 'MyPublishListRoute',
  'my-publish-app': 'MyPublishListRoute',
  'my-publish-dataset': 'MyPublishListRoute',
  'usage-records': 'UsageRecordsPage',
  'usage-stats': 'UsageStatsPage',
  'developer-applications': 'DeveloperApplicationListPage',
  profile: 'UserSettingsHubPage',
  preferences: 'UserSettingsHubPage',
  'api-docs': 'ApiDocsPage',
  'sdk-download': 'SdkDownloadPage',
  'api-playground': 'ApiPlaygroundPage',
  'mcp-integration': 'GatewayIntegrationPage',
  'developer-statistics': 'DeveloperStatsPage',
};

function adminRowStatus(page, legacyList, legacyAudit) {
  if (legacyList.has(page)) {
    return {
      status: 'redirect',
      note: '`MainLayout` replace → `#/c/resource-catalog?type=…`',
    };
  }
  if (legacyAudit[page]) {
    return {
      status: 'redirect',
      note: `\`MainLayout\` replace → \`#/c/resource-audit?type=${legacyAudit[page]}\`（若缺省 \`type\` 则用该默认值）`,
    };
  }
  if (page === 'agent-detail') {
    return { status: 'direct-url-only', note: '菜单无直达子项；需 `/c/agent-detail/{id}`' };
  }
  return { status: 'reachable', note: '—' };
}

function userRowStatus(page, legacyMarketKeys) {
  if (page === 'skill-market') {
    return {
      status: 'redirect',
      note: 'replace → `skills-center`（保留 `resourceId` query）',
    };
  }
  if (legacyMarketKeys.has(page)) {
    return {
      status: 'redirect',
      note: 'replace → 对应广场路由或 `resource-market?tab=`（见 `USER_LEGACY_MARKET_PAGE_TO_TAB`）',
    };
  }
  if (LEGACY_USER_LIST.has(page)) {
    return {
      status: 'redirect',
      note: '`unifiedResourceCenterPath(role,type)` replace（管理视角走 `resource-catalog`，否则 `resource-center`）',
    };
  }
  return { status: 'reachable', note: '—' };
}

function hashPath(page) {
  if (page === 'agent-detail') return '`#/c/agent-detail/{id}`';
  if (page === 'resource-catalog') return '`#/c/resource-catalog?type=…`（管理壳缺省 `type` 时由 `MainLayout` 补 `agent`）';
  if (page === 'resource-audit') return '`#/c/resource-audit?type=…`';
  if (page === 'resource-center') return '`#/c/resource-center?type=…`';
  return `\`#/c/${page}\``;
}

function mdEscapeCell(s) {
  return String(s).replace(/\|/g, '\\|');
}

function buildTable(rows) {
  const lines = [
    '| sidebarId | page slug | Hash 路径 | 渲染组件 | 状态 | 说明 |',
    '|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.sidebarId} | \`${r.page}\` | ${r.hash} | ${r.component} | ${r.status} | ${mdEscapeCell(r.note)} |`,
    );
  }
  return lines.join('\n');
}

function main() {
  const src = fs.readFileSync(routesPath, 'utf8');
  const adminMap = parseSidebarPagesObject(findConstRecordBlock(src, 'ADMIN_SIDEBAR_PAGES').text);
  const userMap = parseSidebarPagesObject(findConstRecordBlock(src, 'USER_SIDEBAR_PAGES').text);
  const adminLegacyList = parseLegacySet(src, 'ADMIN_LEGACY_RESOURCE_LIST_PAGES');
  const legacyAudit = parseLegacyAuditDefaults(src);
  const legacyMarket = parseLegacyPageToType(src);
  const legacyMarketKeys = new Set(Object.keys(legacyMarket));

  const adminRowsFixed = [];
  for (const [sidebarId, pages] of Object.entries(adminMap)) {
    for (const page of pages) {
      const { status, note } = adminRowStatus(page, adminLegacyList, legacyAudit);
      let component = ADMIN_COMPONENT[page];
      if (adminLegacyList.has(page)) component = 'ResourceCenterManagementPage（replace 后生效）';
      else if (legacyAudit[page]) component = 'ResourceAuditList（replace 后生效）';
      else if (!component) component = 'PlaceholderView';
      adminRowsFixed.push({
        sidebarId,
        page,
        hash: hashPath(page),
        component,
        status,
        note,
      });
    }
  }

  const userRows = [];
  for (const [sidebarId, pages] of Object.entries(userMap)) {
    for (const page of pages) {
      const { status, note } = userRowStatus(page, legacyMarketKeys);
      let component = USER_COMPONENT[page] ?? 'PlaceholderView';
      if (LEGACY_USER_LIST.has(page)) component = 'ResourceCenterManagementPage（replace 后生效）';
      if (legacyMarketKeys.has(page) || page === 'skill-market') component = '—（replace 后生效）';
      userRows.push({
        sidebarId,
        page,
        hash: hashPath(page),
        component,
        status,
        note,
      });
    }
  }

  const a21 = [
    '> 本表由 `scripts/generate-console-route-tables.mjs` 从 `ADMIN_SIDEBAR_PAGES` 生成；请勿手改块内内容。',
    '',
    buildTable(adminRowsFixed),
  ].join('\n');

  const a22 = [
    '> 本表由 `scripts/generate-console-route-tables.mjs` 从 `USER_SIDEBAR_PAGES` 生成；请勿手改块内内容。',
    '',
    buildTable(userRows),
  ].join('\n');

  const targets = [
    path.join(root, 'docs/frontend-full-spec.md'),
    path.join(root, 'docs/ai-handoff-docs/frontend-full-spec.md'),
  ];

  for (const file of targets) {
    let doc = fs.readFileSync(file, 'utf8');
    doc = replaceSection(doc, 'AUTO-GENERATED A2.1', a21);
    doc = replaceSection(doc, 'AUTO-GENERATED A2.2', a22);
    fs.writeFileSync(file, doc, 'utf8');
    console.warn('updated', path.relative(root, file));
  }
}

function replaceSection(doc, marker, body) {
  const start = `<!-- ${marker}:BEGIN -->`;
  const end = `<!-- ${marker}:END -->`;
  const i0 = doc.indexOf(start);
  const i1 = doc.indexOf(end);
  if (i0 < 0 || i1 < 0 || i1 < i0) {
    throw new Error(`markers not found: ${marker}`);
  }
  return doc.slice(0, i0 + start.length) + '\n\n' + body + '\n\n' + doc.slice(i1);
}

main();

/**
 * 控制台路由级 code-splitting，集中管理便于审计 chunk 边界。
 */
import { lazy } from 'react';

export const Overview = lazy(() => import('../views/dashboard/Overview').then((m) => ({ default: m.Overview })));
export const ExploreHub = lazy(() => import('../views/dashboard/ExploreHub').then((m) => ({ default: m.ExploreHub })));
export const UserWorkspaceOverview = lazy(() =>
  import('../views/dashboard/UserWorkspaceOverview').then((m) => ({ default: m.UserWorkspaceOverview })),
);
export const DeveloperOnboardingPage = lazy(() =>
  import('../views/onboarding/DeveloperOnboardingPage').then((m) => ({ default: m.DeveloperOnboardingPage })),
);
export const PlaceholderView = lazy(() =>
  import('../views/common/PlaceholderView').then((m) => ({ default: m.PlaceholderView })),
);
export const AgentDetail = lazy(() => import('../views/agent/AgentDetail').then((m) => ({ default: m.AgentDetail })));
export const AgentMonitoringPage = lazy(() =>
  import('../views/agent/AgentMonitoringPage').then((m) => ({ default: m.AgentMonitoringPage })),
);
export const AgentTracePage = lazy(() =>
  import('../views/agent/AgentTracePage').then((m) => ({ default: m.AgentTracePage })),
);
export const ProviderManagementPage = lazy(() =>
  import('../views/provider/ProviderManagementPage').then((m) => ({ default: m.ProviderManagementPage })),
);
export const UserManagementModule = lazy(() =>
  import('../views/userMgmt/UserManagementModule').then((m) => ({ default: m.UserManagementModule })),
);
export const SystemConfigModule = lazy(() =>
  import('../views/systemConfig/SystemConfigModule').then((m) => ({ default: m.SystemConfigModule })),
);
export const MonitoringModule = lazy(() =>
  import('../views/monitoring/MonitoringModule').then((m) => ({ default: m.MonitoringModule })),
);
export const MyPublishHubPage = lazy(() =>
  import('../views/publish/MyPublishHubPage').then((m) => ({ default: m.MyPublishHubPage })),
);
export const MyPublishListRoute = lazy(() =>
  import('../views/publish/MyPublishListRoute').then((m) => ({ default: m.MyPublishListRoute })),
);
export const UserSettingsHubPage = lazy(() =>
  import('../views/user/UserSettingsHubPage').then((m) => ({ default: m.UserSettingsHubPage })),
);
export const UsageRecordsPage = lazy(() =>
  import('../views/user/UsageRecordsPage').then((m) => ({ default: m.UsageRecordsPage })),
);
export const MyFavoritesPage = lazy(() =>
  import('../views/user/MyFavoritesPage').then((m) => ({ default: m.MyFavoritesPage })),
);
export const UsageStatsPage = lazy(() =>
  import('../views/user/UsageStatsPage').then((m) => ({ default: m.UsageStatsPage })),
);
export const ResourceCenterManagementPage = lazy(() =>
  import('../views/resourceCenter/ResourceCenterManagementPage').then((m) => ({ default: m.ResourceCenterManagementPage })),
);
export const ResourceRegisterPage = lazy(() =>
  import('../views/resourceCenter/ResourceRegisterPage').then((m) => ({ default: m.ResourceRegisterPage })),
);
export const ResourceAuditList = lazy(() =>
  import('../views/audit/ResourceAuditList').then((m) => ({ default: m.ResourceAuditList })),
);
export const DeveloperApplicationListPage = lazy(() =>
  import('../views/userMgmt/DeveloperApplicationListPage').then((m) => ({ default: m.DeveloperApplicationListPage })),
);
export const ApiDocsPage = lazy(() =>
  import('../views/developer/ApiDocsPage').then((m) => ({ default: m.ApiDocsPage })),
);
export const SdkDownloadPage = lazy(() =>
  import('../views/developer/SdkDownloadPage').then((m) => ({ default: m.SdkDownloadPage })),
);
export const ApiPlaygroundPage = lazy(() =>
  import('../views/developer/ApiPlaygroundPage').then((m) => ({ default: m.ApiPlaygroundPage })),
);
export const McpIntegrationPage = lazy(() =>
  import('../views/developer/McpIntegrationPage').then((m) => ({ default: m.McpIntegrationPage })),
);
export const DeveloperStatsPage = lazy(() =>
  import('../views/developer/DeveloperStatsPage').then((m) => ({ default: m.DeveloperStatsPage })),
);
export const DataReportsPage = lazy(() =>
  import('../views/dashboard/DataReportsPage').then((m) => ({ default: m.DataReportsPage })),
);
export const HealthCheckOverview = lazy(() =>
  import('../views/dashboard/HealthCheckOverview').then((m) => ({ default: m.HealthCheckOverview })),
);
export const UsageStatsOverview = lazy(() =>
  import('../views/dashboard/UsageStatsOverview').then((m) => ({ default: m.UsageStatsOverview })),
);
export const UserResourceMarketHub = lazy(() =>
  import('../views/marketplace/UserResourceMarketHub').then((m) => ({ default: m.UserResourceMarketHub })),
);
export const SkillMarket = lazy(() => import('../views/skill/SkillMarket').then((m) => ({ default: m.SkillMarket })));
export const McpMarket = lazy(() => import('../views/mcp/McpMarket').then((m) => ({ default: m.McpMarket })));
export const DatasetMarket = lazy(() =>
  import('../views/dataset/DatasetMarket').then((m) => ({ default: m.DatasetMarket })),
);
export const AgentMarket = lazy(() => import('../views/agent/AgentMarket').then((m) => ({ default: m.AgentMarket })));
export const AgentMarketDetailPage = lazy(() =>
  import('../views/agent/AgentMarketDetailPage').then((m) => ({ default: m.AgentMarketDetailPage })),
);
export const AppMarket = lazy(() => import('../views/apps/AppMarket').then((m) => ({ default: m.AppMarket })));
export const AppMarketDetailPage = lazy(() =>
  import('../views/apps/AppMarketDetailPage').then((m) => ({ default: m.AppMarketDetailPage })),
);
export const SkillMarketDetailPage = lazy(() =>
  import('../views/skill/SkillMarketDetailPage').then((m) => ({ default: m.SkillMarketDetailPage })),
);
export const DatasetMarketDetailPage = lazy(() =>
  import('../views/dataset/DatasetMarketDetailPage').then((m) => ({ default: m.DatasetMarketDetailPage })),
);

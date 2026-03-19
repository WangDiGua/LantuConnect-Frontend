/** 工具广场 · 我的工具（演示数据） */
export interface MyToolRow {
  id: string;
  name: string;
  type: 'MCP' | 'HTTP' | '内置';
  status: '运行中' | '已停用' | '异常';
  version: string;
  lastUsed: string;
  calls24h: number;
}

export const MOCK_MY_TOOLS: MyToolRow[] = [
  { id: 't1', name: '教务查询 MCP', type: 'MCP', status: '运行中', version: '1.2.0', lastUsed: '5 分钟前', calls24h: 1280 },
  { id: 't2', name: '图书馆预约 HTTP', type: 'HTTP', status: '运行中', version: '0.9.1', lastUsed: '1 小时前', calls24h: 420 },
  { id: 't3', name: '校园卡充值（内置）', type: '内置', status: '已停用', version: '2.0.0', lastUsed: '3 天前', calls24h: 0 },
];

/** 上架申请演示状态 */
export type PublishStatus = '草稿' | '审核中' | '已上架' | '已驳回';

export interface PublishApplication {
  id: string;
  serverName: string;
  transport: string;
  submittedAt: string;
  status: PublishStatus;
  remark?: string;
}

export const MOCK_PUBLISH_LIST: PublishApplication[] = [
  { id: 'p1', serverName: 'weather-mcp', transport: 'stdio', submittedAt: '2026-03-18 10:20', status: '审核中' },
  { id: 'p2', serverName: 'campus-map', transport: 'sse', submittedAt: '2026-03-10 14:00', status: '已上架' },
  { id: 'p3', serverName: 'legacy-helper', transport: 'stdio', submittedAt: '2026-03-05 09:15', status: '已驳回', remark: '缺少安全说明文档' },
];

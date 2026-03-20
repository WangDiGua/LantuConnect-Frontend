import type MockAdapter from 'axios-mock-adapter';
import type { ToolItem, McpServer, ToolReview } from '../../../types/dto/tool';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const discoverTools: ToolItem[] = [
  { id: 'tl01', name: 'Web搜索引擎', description: '调用搜索API获取实时网页内容', type: 'api', category: '信息检索', author: '蓝图官方', version: '1.2.0', status: 'active', rating: 4.8, usageCount: 15200, featured: true, endpoint: 'https://search.lantu.edu/api', tags: ['搜索', '信息'], createdAt: ts(120), updatedAt: ts(5) },
  { id: 'tl02', name: 'Python代码执行器', description: '在沙箱环境中安全执行Python代码', type: 'function', category: '代码执行', author: '蓝图官方', version: '2.0.0', status: 'active', rating: 4.9, usageCount: 22000, featured: true, tags: ['代码', 'Python', '沙箱'], createdAt: ts(90), updatedAt: ts(3) },
  { id: 'tl03', name: '数据库查询工具', description: '安全执行SQL查询并返回结构化结果', type: 'function', category: '数据处理', author: '蓝图官方', version: '1.5.0', status: 'active', rating: 4.6, usageCount: 8900, featured: false, tags: ['数据库', 'SQL'], createdAt: ts(80), updatedAt: ts(10) },
  { id: 'tl04', name: '文件解析工具', description: '解析PDF、Word、Excel等文档格式', type: 'function', category: '文档处理', author: '极客工坊', version: '1.0.0', status: 'active', rating: 4.5, usageCount: 6500, featured: false, tags: ['文件', '解析', 'PDF'], createdAt: ts(60), updatedAt: ts(15) },
  { id: 'tl05', name: '天气查询MCP', description: '通过MCP协议获取实时天气数据', type: 'mcp_server', category: '生活服务', author: '天气通', version: '1.0.0', status: 'active', rating: 4.3, usageCount: 3200, featured: false, endpoint: 'stdio://weather-mcp', tags: ['天气', 'MCP'], createdAt: ts(45), updatedAt: ts(20) },
  { id: 'tl06', name: '图表生成器', description: '根据数据自动生成ECharts图表', type: 'function', category: '可视化', author: '蓝图官方', version: '1.3.0', status: 'active', rating: 4.7, usageCount: 11000, featured: true, tags: ['图表', 'ECharts', '可视化'], createdAt: ts(100), updatedAt: ts(8) },
  { id: 'tl07', name: '邮件发送工具', description: '通过SMTP发送格式化邮件', type: 'api', category: '通知', author: '消息中心', version: '1.1.0', status: 'active', rating: 4.4, usageCount: 5600, featured: false, tags: ['邮件', '通知'], createdAt: ts(70), updatedAt: ts(12) },
  { id: 'tl08', name: '日程管理MCP', description: '读写校园日历和课表信息', type: 'mcp_server', category: '教务', author: '蓝图官方', version: '1.0.0', status: 'active', rating: 4.5, usageCount: 4800, featured: false, tags: ['日程', '课表', 'MCP'], createdAt: ts(50), updatedAt: ts(7) },
  { id: 'tl09', name: '翻译API', description: '多语言互译接口，支持50+语种', type: 'api', category: '语言', author: '译言科技', version: '2.1.0', status: 'active', rating: 4.8, usageCount: 18000, featured: true, tags: ['翻译', '多语言'], createdAt: ts(85), updatedAt: ts(2) },
  { id: 'tl10', name: 'OCR识别工具', description: '图片文字识别与结构化提取', type: 'function', category: '图像处理', author: '视觉AI', version: '1.2.0', status: 'active', rating: 4.6, usageCount: 7200, featured: false, tags: ['OCR', '图像', '识别'], createdAt: ts(55), updatedAt: ts(9) },
  { id: 'tl11', name: '知识图谱查询', description: '查询校园知识图谱中的实体关系', type: 'api', category: '知识管理', author: '蓝图官方', version: '0.9.0', status: 'pending_review', rating: 0, usageCount: 0, featured: false, tags: ['知识图谱'], createdAt: ts(10), updatedAt: ts(10) },
  { id: 'tl12', name: '视频转写工具', description: '将视频/音频内容转写为文字稿', type: 'api', category: '多媒体', author: '音视科技', version: '1.0.0', status: 'active', rating: 4.2, usageCount: 2100, featured: false, tags: ['视频', '转写', '语音'], createdAt: ts(25), updatedAt: ts(14) },
];

const myMcpServers: McpServer[] = [
  { id: 'mcp01', name: '教务数据MCP', description: '连接教务系统的MCP服务', transportType: 'stdio', command: 'npx', args: ['-y', '@lantu/edu-mcp'], tools: [{ name: 'query_student', description: '查询学生信息', inputSchema: { type: 'object', properties: { student_no: { type: 'string' } } } }, { name: 'query_course', description: '查询课程信息', inputSchema: { type: 'object', properties: { keyword: { type: 'string' } } } }], status: 'running', version: '1.0.0', createdBy: 'admin', createdAt: ts(30), updatedAt: ts(2) },
  { id: 'mcp02', name: '图书馆检索MCP', description: '检索馆藏资源', transportType: 'sse', url: 'http://10.0.1.50:3001/sse', tools: [{ name: 'search_books', description: '搜索图书', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } }], status: 'running', version: '1.1.0', createdBy: 'zhangsan', createdAt: ts(25), updatedAt: ts(5) },
  { id: 'mcp03', name: '校园通知MCP', description: '发送校园通知和消息', transportType: 'streamable-http', url: 'http://10.0.1.60:8080/mcp', tools: [{ name: 'send_notification', description: '发送通知', inputSchema: { type: 'object', properties: { target: { type: 'string' }, message: { type: 'string' } } } }], status: 'stopped', version: '0.5.0', createdBy: 'lisi', createdAt: ts(15), updatedAt: ts(8) },
];

const toolReviews: ToolReview[] = [
  { id: 'tr01', toolId: 'tl11', toolName: '知识图谱查询', submittedBy: 'wangwu', status: 'pending', submittedAt: ts(10), title: '知识图谱查询', submitter: 'wangwu', at: ts(10), description: '查询校园知识图谱中的实体关系' },
  { id: 'tr02', toolId: 'tl_old1', toolName: '旧版搜索API', submittedBy: 'zhangsan', status: 'approved', reviewNote: '符合安全规范', reviewedBy: 'admin', submittedAt: ts(30), reviewedAt: ts(28), title: '旧版搜索API', submitter: 'zhangsan', at: ts(30), description: '旧版搜索API工具提交审核' },
  { id: 'tr03', toolId: 'tl_old2', toolName: '不安全文件操作', submittedBy: 'lisi', status: 'rejected', reviewNote: '存在安全风险，不允许直接文件系统操作', reviewedBy: 'admin', submittedAt: ts(25), reviewedAt: ts(24), title: '不安全文件操作', submitter: 'lisi', at: ts(25), description: '直接文件系统操作工具' },
  { id: 'tr04', toolId: 'tl_new1', toolName: '学生信息查询工具', submittedBy: 'wangwu', status: 'pending', submittedAt: ts(3), title: '学生信息查询工具', submitter: 'wangwu', at: ts(3), description: '查询学生基本信息' },
  { id: 'tr05', toolId: 'tl_new2', toolName: '成绩分析工具', submittedBy: 'zhaoliu', status: 'pending', submittedAt: ts(1), title: '成绩分析工具', submitter: 'zhaoliu', at: ts(1), description: '分析学生成绩数据' },
];

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/tools/discover').reply((config) => {
    const p = config.params || {};
    return paginate(discoverTools, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onGet('/tools/mine').reply(() => mockOk(myMcpServers));

  mock.onPost('/tools/mcp-servers').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const server: McpServer = {
      id: 'mcp_' + Date.now().toString(36),
      name: body.name,
      description: body.description || '',
      transportType: body.transportType || 'stdio',
      command: body.command,
      args: body.args,
      url: body.url,
      tools: [],
      status: 'stopped',
      version: '1.0.0',
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    myMcpServers.push(server);
    return mockOk(server);
  });

  mock.onGet('/tools/reviews').reply((config) => {
    const p = config.params || {};
    return paginate(toolReviews, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPut(/\/tools\/reviews\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/tools\/reviews\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = toolReviews.findIndex((r) => r.id === id);
    if (idx >= 0) {
      toolReviews[idx] = {
        ...toolReviews[idx],
        status: body.status,
        reviewNote: body.reviewNote,
        reviewedBy: 'admin',
        reviewedAt: new Date().toISOString(),
      };
      return mockOk(toolReviews[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });
}

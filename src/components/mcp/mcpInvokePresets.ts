import { MCP_JSONRPC_METHODS } from '../../utils/mcpInvoke';

export const MCP_METHOD_LABELS: Record<(typeof MCP_JSONRPC_METHODS)[number], string> = {
  initialize: '初始化握手',
  'notifications/initialized': '通知已就绪',
  'tools/list': '获取工具列表',
  'tools/call': '调用工具',
};

export const MCP_METHOD_PARAM_EXAMPLES: Record<string, Record<string, unknown>> = {
  initialize: {},
  'notifications/initialized': {},
  'tools/list': {},
  'tools/call': {
    name: 'your_tool_name',
    arguments: {
      input: 'example',
    },
  },
};

export type McpParamPreset = {
  id: string;
  label: string;
  method: string;
  params: Record<string, unknown>;
};

export const MCP_PARAM_PRESETS: McpParamPreset[] = [
  { id: 'initialize-basic', label: '初始化（空参数）', method: 'initialize', params: {} },
  { id: 'notification-ready', label: '通知已就绪（空参数）', method: 'notifications/initialized', params: {} },
  { id: 'tools-list-basic', label: '获取工具列表（空参数）', method: 'tools/list', params: {} },
  {
    id: 'tools-call-generic',
    label: '调用工具（通用占位）',
    method: 'tools/call',
    params: { name: 'your_tool_name', arguments: { input: 'example' } },
  },
  {
    id: 'tools-call-pagination',
    label: '调用工具（分页示例）',
    method: 'tools/call',
    params: { name: 'your_tool_name', arguments: { page: 1, pageSize: 20 } },
  },
  {
    id: 'tools-call-by-id',
    label: '调用工具（按ID查询）',
    method: 'tools/call',
    params: { name: 'your_tool_name', arguments: { id: 'replace-with-id' } },
  },
];

export function getMethodParamExample(method: string): Record<string, unknown> {
  return MCP_METHOD_PARAM_EXAMPLES[method] ?? {};
}

export function getDefaultPresetIdByMethod(method: string): string {
  return MCP_PARAM_PRESETS.find((preset) => preset.method === method)?.id ?? 'custom';
}

export const DEFAULT_MCP_PAYLOAD_TEXT = '{\n  "method": "initialize",\n  "params": {}\n}';

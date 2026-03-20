export interface ToolItem {
  id: string;
  name: string;
  description: string;
  type: 'mcp_server' | 'function' | 'api' | 'plugin';
  category: string;
  icon?: string;
  author: string;
  version: string;
  status: 'active' | 'disabled' | 'pending_review' | 'rejected';
  rating: number;
  usageCount: number;
  featured: boolean;
  endpoint?: string;
  schema?: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface McpServer {
  id: string;
  name: string;
  description: string;
  transportType: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  args?: string[];
  url?: string;
  tools: McpTool[];
  status: 'running' | 'stopped' | 'error';
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolReview {
  id: string;
  toolId: string;
  toolName: string;
  title: string;
  submitter: string;
  at: string;
  description?: string;
  submittedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedBy?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface CreateMcpServerPayload {
  name: string;
  description: string;
  transportType: McpServer['transportType'];
  command?: string;
  args?: string[];
  url?: string;
}

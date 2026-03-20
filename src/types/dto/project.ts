export interface Project {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  type: 'agent' | 'workflow' | 'knowledge' | 'general';
  status: 'active' | 'archived';
  pinned?: boolean;
  agentCount: number;
  workflowCount: number;
  memberCount: number;
  lastActivityAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  type: Project['type'];
  icon?: string;
  color?: string;
  pinned?: boolean;
}

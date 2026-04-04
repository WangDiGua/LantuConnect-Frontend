export interface UsageRecord {
  id: number;
  agentName: string;
  displayName: string;
  type: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
  action: string;
  inputPreview: string;
  outputPreview: string;
  latencyMs: number;
  status: 'success' | 'failed';
  createTime: string;
}

export interface FavoriteItem {
  id: number;
  targetType: 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
  targetId: number;
  displayName: string;
  description: string;
  icon: string | null;
  createTime: string;
}

export interface UserUsageStats {
  todayCalls: number;
  weekCalls: number;
  monthCalls: number;
  totalCalls: number;
  favoriteCount: number;
  recentDays: { date: string; calls: number }[];
}

export interface AuthorizedSkillItem {
  id: number;
  skillId?: number;
  displayName: string;
  description: string;
  status?: string;
  /** 技能资源编码（后端 AuthorizedSkillVO.agentName） */
  agentName?: string;
  /** own | public */
  source?: string;
  packFormat?: string;
  updateTime?: string;
  lastUsedTime?: string;
}

export interface RecentUseItem {
  id: number;
  targetType: 'agent' | 'skill' | 'app' | 'dataset' | 'mcp';
  targetId: number;
  targetCode?: string;
  displayName: string;
  description?: string;
  action?: string;
  status?: 'success' | 'failed' | string;
  latencyMs?: number;
  createTime?: string;
  lastUsedTime?: string;
}

/** 「我的 Agent / Skill」等发布列表项（见 /user/my-agents、/user/my-skills） */
export interface MyPublishItem {
  id: number;
  displayName: string;
  description: string;
  icon: string | null;
  status: 'draft' | 'pending_review' | 'testing' | 'published' | 'rejected' | 'deprecated';
  callCount: number;
  qualityScore: number;
  createTime: string;
  updateTime: string;
}

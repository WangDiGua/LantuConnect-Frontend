import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  Zap, 
  FileText, 
  Play, 
  Edit2, 
  Trash2,
  CheckCircle2,
  Clock,
  BarChart3,
  ShieldCheck,
  Code2,
  Globe,
  Activity
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useAgent, useDeleteAgent } from '../../hooks/queries/useAgent';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface AgentDetailProps {
  agentId: string;
  theme: Theme;
  fontSize: FontSize;
  onBack: () => void;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  published: { label: '已发布', cls: 'badge-success' },
  draft: { label: '草稿', cls: 'badge-ghost' },
  pending_review: { label: '待审核', cls: 'badge-warning' },
  testing: { label: '测试中', cls: 'badge-info' },
  rejected: { label: '已拒绝', cls: 'badge-error' },
  deprecated: { label: '已废弃', cls: 'badge-ghost' },
};

const AGENT_TYPE_LABEL: Record<string, string> = {
  mcp: 'MCP 协议',
  http_api: 'HTTP API',
  builtin: '内置',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  internal: '内部',
  partner: '合作方',
  cloud: '云端',
};

export const AgentDetail: React.FC<AgentDetailProps> = ({ agentId, theme, fontSize, onBack }) => {
  const isDark = theme === 'dark';
  const numericId = Number(agentId);
  const { data: agent, isLoading, isError, error, refetch } = useAgent(numericId);
  const deleteMut = useDeleteAgent();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = () => {
    deleteMut.mutate(numericId, {
      onSuccess: () => { setDeleteOpen(false); onBack(); },
    });
  };

  if (isLoading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageSkeleton type="detail" />
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error instanceof Error ? error : new Error('加载失败')} onRetry={() => refetch()} />
      </div>
    );
  }

  const formatCallCount = (n: number) => {
    if (n >= 10000) return (n / 10000).toFixed(2) + '万';
    return n.toLocaleString();
  };

  const statusInfo = STATUS_MAP[agent.status] ?? { label: agent.status, cls: 'badge-ghost' };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
      isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
    }`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl text-white shadow-none border border-blue-500/30 shrink-0">
              {agent.icon || '🤖'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{agent.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`badge badge-sm font-bold text-[10px] ${statusInfo.cls}`}>
                  {statusInfo.label}
                </div>
                <span className="text-xs text-slate-500">ID: {agentId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="btn btn-ghost btn-sm gap-2">
            <Play size={16} />
            <span>测试</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm gap-2">
            <Edit2 size={16} />
            <span>编辑</span>
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} className="btn btn-error btn-sm btn-outline gap-2">
            <Trash2 size={16} />
            <span>删除</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3 grid grid-cols-1 lg:grid-cols-3 gap-6 content-start">
        {/* Left Column: Info & Config */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">显示名称</label>
                  <p className="font-medium">{agent.displayName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">标识名称</label>
                  <p className="font-medium font-mono text-sm">{agent.agentName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">接入类型</label>
                  <p className="font-medium">{AGENT_TYPE_LABEL[agent.agentType] ?? agent.agentType}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">来源</label>
                  <p className="font-medium">{SOURCE_TYPE_LABEL[agent.sourceType] ?? agent.sourceType}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">模式</label>
                  <p className="font-medium">{agent.mode}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">状态</label>
                  <p className="font-medium">{statusInfo.label}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">描述</label>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {agent.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Settings size={18} className="text-purple-500" />
                配置详情
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl">
                      <Globe size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">连接配置</p>
                      <p className="text-xs text-slate-500 font-mono break-all">
                        {JSON.stringify(agent.specJson)}
                      </p>
                    </div>
                  </div>
                </div>

                {agent.systemPrompt && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-xl">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">系统提示词</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{agent.systemPrompt}</p>
                      </div>
                    </div>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 rounded-xl">
                      <Code2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">运行参数</p>
                      <p className="text-xs text-slate-500">
                        温度: {agent.temperature ?? '—'} | 最大并发: {agent.maxConcurrency} | 最大步数: {agent.maxSteps ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Meta */}
        <div className="space-y-6">
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-500" />
                运行统计
              </h3>
              <div className="space-y-6">
                <div className="stats stats-vertical w-full bg-transparent shadow-none">
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">累计调用量</div>
                    <div className="stat-value text-2xl text-blue-600">{formatCallCount(agent.callCount)}</div>
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">平均成功率</div>
                    <div className="stat-value text-2xl text-emerald-500">{agent.successRate}%</div>
                    <progress className="progress progress-success w-full mt-2" value={agent.successRate} max="100" />
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">平均响应时间</div>
                    <div className="stat-value text-2xl text-orange-500">{agent.avgLatencyMs}ms</div>
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">质量评分</div>
                    <div className="stat-value text-2xl text-purple-500">{agent.qualityScore}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                时间信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">创建时间</span>
                  <span className="font-mono">{agent.createTime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">最后更新</span>
                  <span className="font-mono">{agent.updateTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="删除 Agent"
        message={`确定要删除「${agent.displayName}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};

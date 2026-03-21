import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  FileText,
  Settings,
  BarChart3,
  Clock,
  Code2,
  Globe,
  Server,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentStatus } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface Props {
  skillId: string;
  theme: Theme;
  fontSize: FontSize;
  onBack: () => void;
}

const STATUS_MAP: Record<AgentStatus, { label: string; cls: string }> = {
  published: { label: '已发布', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  draft: { label: '草稿', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300' },
  pending_review: { label: '待审核', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  testing: { label: '测试中', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  rejected: { label: '已拒绝', cls: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
  deprecated: { label: '已废弃', cls: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' },
};

const AGENT_TYPE_LABEL: Record<string, string> = {
  mcp: 'MCP 协议',
  http_api: 'HTTP API',
  builtin: '内置',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  internal: '内部',
  partner: '合作方',
  cloud: '云服务',
};

export const SkillDetail: React.FC<Props> = ({ skillId, theme, fontSize: _fontSize, onBack }) => {
  const isDark = theme === 'dark';
  const numericId = Number(skillId);

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSkill = () => {
    setLoading(true);
    setError(null);
    skillService.getById(numericId)
      .then(setSkill)
      .catch(err => setError(err instanceof Error ? err : new Error('加载失败')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSkill(); }, [numericId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await skillService.remove(numericId);
      setDeleteOpen(false);
      onBack();
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageSkeleton type="detail" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error} onRetry={fetchSkill} />
      </div>
    );
  }

  const statusInfo = STATUS_MAP[skill.status] ?? { label: skill.status, cls: 'bg-slate-100 text-slate-600' };
  const cardCls = `card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`;
  const specJson = skill.specJson as Record<string, unknown>;

  const formatCallCount = (n: number) => n >= 10000 ? (n / 10000).toFixed(2) + '万' : n.toLocaleString();

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-2xl text-white shadow-none border border-purple-500/30 shrink-0">
              {skill.icon || '🔧'}
            </div>
            <div className="min-w-0">
              <h2 className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{skill.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
                <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{skill.agentName}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3 grid grid-cols-1 lg:grid-cols-3 gap-6 content-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <div className={cardCls}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`text-xs block mb-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>显示名称</label>
                  <p className="font-medium">{skill.displayName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">标识名称</label>
                  <p className="font-medium font-mono text-sm">{skill.agentName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">协议类型</label>
                  <p className="font-medium">{AGENT_TYPE_LABEL[skill.agentType] ?? skill.agentType}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">来源</label>
                  <p className="font-medium">{SOURCE_TYPE_LABEL[skill.sourceType] ?? skill.sourceType}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">所属 MCP Server</label>
                  <p className="font-medium">{skill.parentName ?? '独立 Skill'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">展示模板</label>
                  <p className="font-medium">{skill.displayTemplate ?? '无'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">分类</label>
                  <p className="font-medium">{skill.categoryName ?? '未分类'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">公开</label>
                  <p className="font-medium">{skill.isPublic ? '是' : '否'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">描述</label>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {skill.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 连接配置 */}
          <div className={cardCls}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Settings size={18} className="text-purple-500" />
                连接配置
              </h3>
              <div className="space-y-3">
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'} border ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl shrink-0">
                    <Globe size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold mb-1">服务地址</p>
                    <p className={`text-xs font-mono break-all ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {(specJson.url as string) || '—'}
                    </p>
                  </div>
                </div>
                {specJson.api_key && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'} border ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-xl shrink-0">
                      <Settings size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold mb-1">API Key</p>
                      <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>••••••••</p>
                    </div>
                  </div>
                )}
                <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'} border ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                  <div className="p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 rounded-xl shrink-0">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold mb-1">超时时间</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {(specJson.timeout as number) ?? 30} 秒
                    </p>
                  </div>
                </div>
                {skill.parentId && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'} border ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <div className="p-2 bg-violet-100 dark:bg-violet-500/20 text-violet-600 rounded-xl shrink-0">
                      <Server size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold mb-1">MCP Server</p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {skill.parentName ?? `ID: ${skill.parentId}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 参数 Schema */}
          {skill.parametersSchema && (
            <div className={cardCls}>
              <div className="card-body p-6">
                <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                  <Code2 size={18} className="text-emerald-500" />
                  参数 Schema
                </h3>
                <pre className={`text-xs font-mono p-4 rounded-xl overflow-auto max-h-64 ${
                  isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-700'
                }`}>
                  {JSON.stringify(skill.parametersSchema, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* 运行指标 */}
          <div className={cardCls}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-500" />
                运行指标
              </h3>
              <div className="space-y-6">
                <div className="stats stats-vertical w-full bg-transparent shadow-none">
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">累计调用量</div>
                    <div className="stat-value text-2xl text-blue-600">{formatCallCount(skill.callCount)}</div>
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">平均成功率</div>
                    <div className={`stat-value text-2xl ${
                      skill.successRate >= 95 ? 'text-emerald-500'
                        : skill.successRate >= 80 ? 'text-blue-500'
                        : 'text-orange-500'
                    }`}>
                      {skill.successRate}%
                    </div>
                    <progress className="progress progress-success w-full mt-2" value={skill.successRate} max="100" />
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">平均响应时间</div>
                    <div className={`stat-value text-2xl ${
                      skill.avgLatencyMs <= 200 ? 'text-emerald-500'
                        : skill.avgLatencyMs <= 1000 ? 'text-orange-500'
                        : 'text-red-500'
                    }`}>
                      {skill.avgLatencyMs >= 1000 ? (skill.avgLatencyMs / 1000).toFixed(1) + 's' : skill.avgLatencyMs + 'ms'}
                    </div>
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">质量评分</div>
                    <div className="stat-value text-2xl text-purple-500">{skill.qualityScore}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 时间信息 */}
          <div className={cardCls}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                时间信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">创建时间</span>
                  <span className="font-mono">{skill.createTime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">最后更新</span>
                  <span className="font-mono">{skill.updateTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="删除 Skill"
        message={`确定要删除「${skill.displayName}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Zap, Clock, Activity } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { nativeInputClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const CATEGORIES = ['全部', '文档生成', '数据可视化', '搜索检索', '代码工具'] as const;

const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'text-violet-600 bg-violet-500/10' },
  http_api: { label: 'HTTP API', cls: 'text-blue-600 bg-blue-500/10' },
  builtin: { label: '内置', cls: 'text-emerald-600 bg-emerald-500/10' },
};

const SOURCE_BADGE: Record<SourceType, { label: string; cls: string }> = {
  internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' },
  partner: { label: '合作方', cls: 'text-purple-600 bg-purple-500/10' },
  cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' },
};

const ICON_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

function pickColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export const SkillMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const dark = theme === 'dark';
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    skillService
      .list({ status: 'published', pageSize: 100 })
      .then((res) => { if (!cancelled) setSkills(res.list); })
      .catch(() => { if (!cancelled) showMessage?.('加载技能列表失败', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage]);

  const filtered = useMemo(() => {
    let list = skills;
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      list = list.filter(
        (s) =>
          s.displayName.toLowerCase().includes(kw) ||
          s.agentName.toLowerCase().includes(kw) ||
          s.description.toLowerCase().includes(kw)
      );
    }
    if (activeCategory !== '全部') {
      list = list.filter((s) => s.categoryName === activeCategory);
    }
    return list;
  }, [skills, keyword, activeCategory]);

  const inputCls = nativeInputClass(theme);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${dark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Zap className="text-violet-500" size={22} />
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>技能市场</h1>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索技能…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={`${inputCls} !pl-9`}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : dark
                    ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-lg font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>暂无匹配的技能</p>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>尝试调整搜索关键词或分类筛选</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((skill) => {
              const typeBadge = TYPE_BADGE[skill.agentType];
              const srcBadge = SOURCE_BADGE[skill.sourceType];
              return (
                <div
                  key={skill.id}
                  className={`rounded-2xl border p-5 transition-colors ${
                    dark
                      ? 'bg-[#1C1C1E] border-white/10 hover:bg-[#2C2C2E]'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(skill.agentName)}`}>
                      {(skill.displayName || skill.agentName).charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {skill.displayName}
                      </h3>
                      <p className={`text-xs truncate ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {skill.agentName}
                      </p>
                    </div>
                  </div>

                  <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {skill.description || '暂无描述'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${typeBadge.cls}`}>
                      {typeBadge.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${srcBadge.cls}`}>
                      {srcBadge.label}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`flex items-center gap-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Activity size={12} />
                        {formatCount(skill.callCount)} 次
                      </span>
                      <span className={`flex items-center gap-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Clock size={12} />
                        {formatLatency(skill.avgLatencyMs)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => showMessage?.('使用功能开发中', 'info')}
                      className="btn btn-primary btn-xs rounded-xl shadow-none"
                    >
                      使用
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

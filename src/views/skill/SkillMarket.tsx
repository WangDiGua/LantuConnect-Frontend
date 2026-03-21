import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Zap, Clock, Activity, X, Star, ThumbsUp, MessageSquare, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface SkillReview {
  id: string;
  userName: string;
  avatarColor: string;
  rating: number;
  comment: string;
  date: string;
  helpfulCount: number;
  helpedByMe: boolean;
}

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500', 'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500', 'from-cyan-500 to-sky-500',
];

const MOCK_SKILL_REVIEWS: SkillReview[] = [
  { id: 'sr1', userName: '张三', avatarColor: AVATAR_COLORS[0], rating: 5, comment: '文档生成质量很高，格式规范，大大提升了工作效率。', date: '2026-03-17', helpfulCount: 8, helpedByMe: false },
  { id: 'sr2', userName: '李老师', avatarColor: AVATAR_COLORS[1], rating: 4, comment: '代码补全功能实用，偶尔有些小错误，但整体不错。', date: '2026-03-15', helpfulCount: 5, helpedByMe: false },
  { id: 'sr3', userName: '王五', avatarColor: AVATAR_COLORS[2], rating: 5, comment: '搜索检索速度快，结果精准，非常好用！', date: '2026-03-12', helpfulCount: 11, helpedByMe: true },
  { id: 'sr4', userName: '赵六', avatarColor: AVATAR_COLORS[3], rating: 3, comment: '基本功能可以，希望支持更多格式的文件转换。', date: '2026-03-10', helpfulCount: 3, helpedByMe: false },
  { id: 'sr5', userName: '陈七', avatarColor: AVATAR_COLORS[4], rating: 4, comment: '翻译准确率不错，中英文互译很流畅。', date: '2026-03-08', helpfulCount: 6, helpedByMe: false },
];

export const SkillMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const dark = theme === 'dark';
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);
  const [skillReviews, setSkillReviews] = useState<SkillReview[]>(MOCK_SKILL_REVIEWS);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');

  const [useSkill, setUseSkill] = useState<Skill | null>(null);
  const [useParams, setUseParams] = useState<Record<string, string>>({});
  const [useLoading, setUseLoading] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);

  const getParamFields = useCallback((skill: Skill): { key: string; type: string; required: boolean }[] => {
    const schema = skill.parametersSchema as { properties?: Record<string, { type: string }>; required?: string[] } | null;
    if (!schema?.properties) return [{ key: 'input', type: 'string', required: true }];
    return Object.entries(schema.properties).map(([key, val]) => ({
      key,
      type: val.type || 'string',
      required: schema.required?.includes(key) ?? false,
    }));
  }, []);

  const handleOpenUse = useCallback((skill: Skill) => {
    setUseSkill(skill);
    setUseParams({});
    setUseResult(null);
    setUseLoading(false);
  }, []);

  const handleExecute = useCallback(() => {
    setUseLoading(true);
    setUseResult(null);
    const latency = 200 + Math.floor(Math.random() * 1800);
    setTimeout(() => {
      setUseLoading(false);
      setUseResult(`调用成功，耗时 ${latency}ms`);
    }, 1000 + Math.random() * 1000);
  }, []);

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
                  onClick={() => setDetailSkill(skill)}
                  className={`rounded-2xl border p-5 transition-colors cursor-pointer ${
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
                      onClick={(e) => { e.stopPropagation(); handleOpenUse(skill); }}
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

      {/* Skill Detail + Reviews Modal */}
      <AnimatePresence>
        {detailSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDetailSkill(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border flex flex-col ${
                dark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`shrink-0 px-6 py-4 border-b flex items-center justify-between ${
                dark ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(detailSkill.agentName)}`}>
                    {(detailSkill.displayName || detailSkill.agentName).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-lg font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                      {detailSkill.displayName}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{detailSkill.agentName}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_BADGE[detailSkill.agentType].cls}`}>
                        {TYPE_BADGE[detailSkill.agentType].label}
                      </span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setDetailSkill(null)} className="btn btn-ghost btn-sm btn-circle shrink-0">
                  <X size={18} />
                </button>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
                <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {detailSkill.description || '暂无描述'}
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Activity size={13} /> {formatCount(detailSkill.callCount)} 次调用
                  </span>
                  <span className={`flex items-center gap-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Clock size={13} /> {formatLatency(detailSkill.avgLatencyMs)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium ${SOURCE_BADGE[detailSkill.sourceType].cls}`}>
                    {SOURCE_BADGE[detailSkill.sourceType].label}
                  </span>
                </div>

                {/* Review section */}
                <div>
                  <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
                    <MessageSquare size={18} className="text-violet-500" />
                    评分与评论
                  </h4>
                  {/* Rating summary */}
                  <div className={`rounded-xl border p-4 mb-4 ${dark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                          {(skillReviews.reduce((s, r) => s + r.rating, 0) / skillReviews.length).toFixed(1)}
                        </div>
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} className={i < 4 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
                          ))}
                        </div>
                        <p className={`text-[11px] mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{skillReviews.length} 条评价</p>
                      </div>
                    </div>
                  </div>
                  {/* Reviews list */}
                  <div className="space-y-3">
                    {skillReviews.map((review) => (
                      <div key={review.id} className={`rounded-xl border p-3 ${
                        dark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-white'
                      }`}>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${review.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {review.userName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium text-sm ${dark ? 'text-white' : 'text-slate-900'}`}>{review.userName}</span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={10} className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
                                ))}
                              </div>
                              <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{review.date}</span>
                            </div>
                            <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{review.comment}</p>
                            <button
                              type="button"
                              onClick={() => setSkillReviews(prev => prev.map(r =>
                                r.id === review.id ? { ...r, helpfulCount: r.helpedByMe ? r.helpfulCount - 1 : r.helpfulCount + 1, helpedByMe: !r.helpedByMe } : r
                              ))}
                              className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] ${
                                review.helpedByMe ? 'bg-blue-500/10 text-blue-600' : dark ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              <ThumbsUp size={10} className={review.helpedByMe ? 'fill-current' : ''} />
                              有帮助 {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Write review */}
                  <div className={`rounded-xl border p-4 mt-4 ${dark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h5 className={`font-bold text-sm mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>写评价</h5>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>评分：</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={18}
                            className={`cursor-pointer transition-colors ${i < myRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                            onClick={() => setMyRating(i + 1)}
                          />
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={myComment}
                      onChange={(e) => setMyComment(e.target.value)}
                      placeholder="分享你的使用体验…"
                      rows={2}
                      className={`w-full px-3 py-2 rounded-xl border text-sm resize-none mb-2 ${
                        dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={myRating === 0 || !myComment.trim()}
                        onClick={() => {
                          if (myRating === 0 || !myComment.trim()) return;
                          setSkillReviews(prev => [{
                            id: `sr-new-${Date.now()}`,
                            userName: '我',
                            avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
                            rating: myRating,
                            comment: myComment,
                            date: new Date().toISOString().slice(0, 10),
                            helpfulCount: 0,
                            helpedByMe: false,
                          }, ...prev]);
                          setMyRating(0);
                          setMyComment('');
                        }}
                        className="btn btn-primary btn-sm rounded-xl"
                      >
                        提交评价
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 使用面板 */}
      <AnimatePresence>
        {useSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setUseSkill(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`w-full max-w-lg max-h-[80vh] rounded-2xl border flex flex-col ${
                dark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`shrink-0 px-6 py-4 border-b flex items-center justify-between ${
                dark ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div className="min-w-0">
                  <h3 className={`text-base font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                    使用面板 — {useSkill.displayName}
                  </h3>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {useSkill.description || '暂无描述'}
                  </p>
                </div>
                <button type="button" onClick={() => setUseSkill(null)} className="btn btn-ghost btn-sm btn-circle shrink-0">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
                {getParamFields(useSkill).map((f) => (
                  <div key={f.key}>
                    <label className={`text-xs font-semibold block mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {f.key}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                      <span className={`ml-2 font-normal ${dark ? 'text-slate-500' : 'text-slate-400'}`}>({f.type})</span>
                    </label>
                    {f.type === 'array' || f.type === 'object' ? (
                      <textarea
                        rows={3}
                        placeholder={`输入 ${f.type} 类型的 JSON…`}
                        value={useParams[f.key] || ''}
                        onChange={(e) => setUseParams((p) => ({ ...p, [f.key]: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${
                          dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={`输入 ${f.key}…`}
                        value={useParams[f.key] || ''}
                        onChange={(e) => setUseParams((p) => ({ ...p, [f.key]: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-xl border text-sm ${
                          dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                        }`}
                      />
                    )}
                  </div>
                ))}

                {useResult && (
                  <div className={`rounded-xl p-4 text-sm font-medium ${
                    dark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {useResult}
                  </div>
                )}
              </div>
              <div className={`shrink-0 px-6 py-4 border-t flex justify-end gap-2 ${
                dark ? 'border-white/10' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setUseSkill(null)}
                >
                  关闭
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm gap-1.5"
                  disabled={useLoading}
                  onClick={handleExecute}
                >
                  {useLoading ? <><Loader2 size={14} className="animate-spin" /> 调用中…</> : <><Play size={14} /> 调用</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

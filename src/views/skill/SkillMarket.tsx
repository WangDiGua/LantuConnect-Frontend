import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Zap, Clock, Activity, Star, ThumbsUp, MessageSquare, Play, Loader2 } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import type { Review } from '../../types/dto/review';
import { skillService } from '../../api/services/skill.service';
import { reviewService } from '../../api/services/review.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  pageBg, bentoCard, btnPrimary, btnSecondary,
  textPrimary, textSecondary, textMuted, techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { Modal } from '../../components/common/Modal';

interface Props { theme: Theme; fontSize: FontSize; themeColor?: ThemeColor; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const CATEGORIES = ['全部', '文档生成', '数据可视化', '搜索检索', '代码工具'] as const;
const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = { mcp: { label: 'MCP', cls: 'text-violet-600 bg-violet-500/10' }, http_api: { label: 'HTTP API', cls: 'text-blue-600 bg-blue-500/10' }, builtin: { label: '内置', cls: 'text-emerald-600 bg-emerald-500/10' } };
const SOURCE_BADGE: Record<SourceType, { label: string; cls: string }> = { internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' }, partner: { label: '合作方', cls: 'text-purple-600 bg-purple-500/10' }, cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' } };
const ICON_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'];
function pickColor(str: string): string { let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h); return ICON_COLORS[Math.abs(h) % ICON_COLORS.length]; }
function formatLatency(ms: number): string { return ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms'; }
function formatCount(n: number): string { if (n >= 10000) return (n / 10000).toFixed(1) + '万'; if (n >= 1000) return (n / 1000).toFixed(1) + 'k'; return String(n); }

interface SkillReview { id: string; userName: string; avatarColor: string; rating: number; comment: string; date: string; helpfulCount: number; helpedByMe: boolean; }
const AVATAR_COLORS = ['from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500', 'from-orange-500 to-amber-500', 'from-rose-500 to-pink-500', 'from-cyan-500 to-sky-500'];

function reviewToSkillReview(r: Review): SkillReview {
  return { id: String(r.id), userName: r.userName, avatarColor: AVATAR_COLORS[r.id % AVATAR_COLORS.length], rating: r.rating, comment: r.comment, date: r.createTime.slice(0, 10), helpfulCount: r.helpfulCount, helpedByMe: false };
}

export const SkillMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const isDark = theme === 'dark';
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);
  const [skillReviews, setSkillReviews] = useState<SkillReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');

  useEffect(() => {
    if (!detailSkill) return;
    let cancelled = false;
    setReviewsLoading(true);
    reviewService.list('skill', detailSkill.id)
      .then((data) => { if (!cancelled) setSkillReviews(data.map(reviewToSkillReview)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [detailSkill]);
  const [useSkill, setUseSkill] = useState<Skill | null>(null);
  const [useParams, setUseParams] = useState<Record<string, string>>({});
  const [useLoading, setUseLoading] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);

  const getParamFields = useCallback((skill: Skill): { key: string; type: string; required: boolean }[] => {
    const schema = skill.parametersSchema as { properties?: Record<string, { type: string }>; required?: string[] } | null;
    if (!schema?.properties) return [{ key: 'input', type: 'string', required: true }];
    return Object.entries(schema.properties).map(([key, val]) => ({ key, type: val.type || 'string', required: schema.required?.includes(key) ?? false }));
  }, []);
  const handleOpenUse = useCallback((skill: Skill) => { setUseSkill(skill); setUseParams({}); setUseResult(null); setUseLoading(false); }, []);
  const handleExecute = useCallback(async () => {
    if (!useSkill) return;
    setUseLoading(true);
    setUseResult(null);
    try {
      const res = await skillService.invoke(useSkill.id, useParams as Record<string, unknown>);
      setUseResult(`${res.result}，耗时 ${res.latencyMs}ms`);
    } catch (e) {
      setUseResult(`调用失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUseLoading(false);
    }
  }, [useSkill, useParams]);

  useEffect(() => {
    let cancelled = false; setLoading(true);
    skillService.list({ status: 'published', pageSize: 100 })
      .then((res) => { if (!cancelled) setSkills(res.list); })
      .catch(() => { if (!cancelled) showMessage?.('加载技能列表失败', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage]);

  const filtered = useMemo(() => {
    let list = skills;
    if (keyword.trim()) { const kw = keyword.toLowerCase(); list = list.filter((s) => s.displayName.toLowerCase().includes(kw) || s.agentName.toLowerCase().includes(kw) || s.description.toLowerCase().includes(kw)); }
    if (activeCategory !== '全部') list = list.filter((s) => s.categoryName === activeCategory);
    return list;
  }, [skills, keyword, activeCategory]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}><Zap size={22} className="text-violet-500" /></div>
            <h1 className={`text-xl font-bold ${textPrimary(theme)}`}>技能市场</h1>
          </div>
          <GlassPanel theme={theme} padding="sm" className="!p-0 w-full sm:w-72">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="搜索技能…" value={keyword} onChange={(e) => setKeyword(e.target.value)} className={`w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none ${textPrimary(theme)}`} />
            </div>
          </GlassPanel>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>{cat}</button>
          ))}
        </div>

        {/* Grid */}
        {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
        : filtered.length === 0 ? <div className="text-center py-20"><p className={`text-lg font-medium ${textMuted(theme)}`}>暂无匹配的技能</p><p className={`text-sm mt-1 ${textMuted(theme)}`}>尝试调整搜索关键词或分类筛选</p></div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((skill) => (
              <BentoCard key={skill.id} theme={theme} hover glow="indigo" padding="md" onClick={() => setDetailSkill(skill)} className="flex flex-col h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(skill.agentName)}`}>{(skill.displayName || skill.agentName).charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold truncate ${textPrimary(theme)}`}>{skill.displayName}</h3>
                    <p className={`text-xs truncate ${textMuted(theme)}`}>{skill.agentName}</p>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${textSecondary(theme)}`}>{skill.description || '暂无描述'}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_BADGE[skill.agentType].cls}`}>{TYPE_BADGE[skill.agentType].label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${SOURCE_BADGE[skill.sourceType].cls}`}>{SOURCE_BADGE[skill.sourceType].label}</span>
                </div>
                <div className={`flex items-center justify-between pt-3 border-t mt-auto ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <div className={`flex items-center gap-4 text-xs ${textMuted(theme)}`}>
                    <span className="flex items-center gap-1"><Activity size={12} />{formatCount(skill.callCount)} 次</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{formatLatency(skill.avgLatencyMs)}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenUse(skill); }} className={`${btnPrimary} !py-1.5 !px-3 !text-xs`}>使用</button>
                </div>
              </BentoCard>
            ))}
          </div>
        )}
      </div>

      {/* Detail + Reviews Modal */}
      <Modal open={!!detailSkill} onClose={() => setDetailSkill(null)} theme={theme} size="lg">
        {detailSkill && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(detailSkill.agentName)}`}>{(detailSkill.displayName || detailSkill.agentName).charAt(0)}</div>
              <div className="min-w-0">
                <h3 className={`text-lg font-bold truncate ${textPrimary(theme)}`}>{detailSkill.displayName}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${textMuted(theme)}`}>{detailSkill.agentName}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_BADGE[detailSkill.agentType].cls}`}>{TYPE_BADGE[detailSkill.agentType].label}</span>
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{detailSkill.description || '暂无描述'}</p>
              <div className={`flex flex-wrap gap-3 text-xs ${textMuted(theme)}`}>
                <span className="flex items-center gap-1"><Activity size={13} /> {formatCount(detailSkill.callCount)} 次调用</span>
                <span className="flex items-center gap-1"><Clock size={13} /> {formatLatency(detailSkill.avgLatencyMs)}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium ${SOURCE_BADGE[detailSkill.sourceType].cls}`}>{SOURCE_BADGE[detailSkill.sourceType].label}</span>
              </div>
              <div>
                <h4 className={`font-bold text-base mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><MessageSquare size={18} className="text-violet-500" /> 评分与评论</h4>
                <div className={`${bentoCard(theme)} p-4 mb-4`}>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${textPrimary(theme)}`}>{(skillReviews.reduce((s, r) => s + r.rating, 0) / skillReviews.length).toFixed(1)}</div>
                      <div className="flex gap-0.5 mt-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < 4 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />)}</div>
                      <p className={`text-[11px] mt-1 ${textMuted(theme)}`}>{skillReviews.length} 条评价</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {skillReviews.map((review) => (
                    <div key={review.id} className={`${bentoCard(theme)} p-3`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${review.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{review.userName.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${textPrimary(theme)}`}>{review.userName}</span>
                            <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={10} className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />)}</div>
                            <span className={`text-[11px] ${textMuted(theme)}`}>{review.date}</span>
                          </div>
                          <p className={`text-sm ${textSecondary(theme)}`}>{review.comment}</p>
                          <button type="button" onClick={() => setSkillReviews(prev => prev.map(r => r.id === review.id ? { ...r, helpfulCount: r.helpedByMe ? r.helpfulCount - 1 : r.helpfulCount + 1, helpedByMe: !r.helpedByMe } : r))} className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] ${review.helpedByMe ? 'bg-blue-500/10 text-blue-600' : isDark ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                            <ThumbsUp size={10} className={review.helpedByMe ? 'fill-current' : ''} /> 有帮助 {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`${bentoCard(theme)} p-4 mt-4`}>
                  <h5 className={`font-bold text-sm mb-2 ${textPrimary(theme)}`}>写评价</h5>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs ${textSecondary(theme)}`}>评分：</span>
                    <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={18} className={`cursor-pointer transition-colors ${i < myRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} onClick={() => setMyRating(i + 1)} />)}</div>
                  </div>
                  <textarea value={myComment} onChange={(e) => setMyComment(e.target.value)} placeholder="分享你的使用体验…" rows={2} className={`${nativeInputClass(theme)} resize-none mb-2`} />
                  <div className="flex justify-end">
                    <button type="button" disabled={myRating === 0 || !myComment.trim()} onClick={() => { if (myRating === 0 || !myComment.trim()) return; setSkillReviews(prev => [{ id: `sr-new-${Date.now()}`, userName: '我', avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)], rating: myRating, comment: myComment, date: new Date().toISOString().slice(0, 10), helpfulCount: 0, helpedByMe: false }, ...prev]); setMyRating(0); setMyComment(''); }} className={`${btnPrimary} disabled:opacity-50`}>提交评价</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Use panel */}
      <Modal open={!!useSkill} onClose={() => setUseSkill(null)} title={useSkill ? `使用面板 — ${useSkill.displayName}` : ''} theme={theme} size="md" footer={
        <><button type="button" className={btnSecondary(theme)} onClick={() => setUseSkill(null)}>关闭</button>
        <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={useLoading} onClick={handleExecute}>
          {useLoading ? <><Loader2 size={14} className="animate-spin" /> 调用中…</> : <><Play size={14} /> 调用</>}
        </button></>
      }>
        {useSkill && (
          <div className="space-y-4">
            <p className={`text-xs ${textMuted(theme)}`}>{useSkill.description || '暂无描述'}</p>
            {getParamFields(useSkill).map((f) => (
              <div key={f.key}>
                <label className={`text-xs font-semibold block mb-1.5 ${textSecondary(theme)}`}>{f.key}{f.required && <span className="text-rose-500 ml-0.5">*</span>}<span className={`ml-2 font-normal ${textMuted(theme)}`}>({f.type})</span></label>
                {f.type === 'array' || f.type === 'object' ? (
                  <textarea rows={3} placeholder={`输入 ${f.type} 类型的 JSON…`} value={useParams[f.key] || ''} onChange={(e) => setUseParams((p) => ({ ...p, [f.key]: e.target.value }))} className={`${nativeInputClass(theme)} resize-none`} />
                ) : (
                  <input type="text" placeholder={`输入 ${f.key}…`} value={useParams[f.key] || ''} onChange={(e) => setUseParams((p) => ({ ...p, [f.key]: e.target.value }))} className={nativeInputClass(theme)} />
                )}
              </div>
            ))}
            {useResult && <div className={`rounded-xl p-4 text-sm font-medium ${isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{useResult}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

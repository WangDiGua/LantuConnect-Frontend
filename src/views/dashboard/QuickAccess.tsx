import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Zap,
  Cpu,
  Code,
  Layers,
  Activity,
  Database,
  Server,
  ExternalLink,
  Plus,
  X,
  Check,
  ClipboardCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { useUserRole } from '../../context/UserRoleContext';
import { buildPath } from '../../constants/consoleRoutes';
import { bentoCard, canvasBodyBg, mainScrollCompositorClass, textPrimary, textSecondary, textMuted, btnPrimary, btnGhost } from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { DashboardLayout } from '../../components/layout/PageLayouts';
import { parseQuickLinkIds } from '../../lib/safeStorage';

interface QuickAccessProps {
  theme: Theme;
  fontSize: FontSize;
}

const QUICK_LINKS_KEY = 'lantu_quick_links_visible';

const ALL_TOOLS = [
  { id: 'agent', name: '智能体管理', icon: Bot, desc: '注册、审核与发布', page: 'agent-list', glow: 'indigo' as const, perm: 'agent:view' },
  { id: 'skill', name: '技能管理', icon: Zap, desc: 'MCP 工具与 API', page: 'skill-list', glow: 'emerald' as const, perm: 'skill:view' },
  { id: 'app', name: '智能应用', icon: Cpu, desc: '应用注册与上架', page: 'app-list', glow: 'amber' as const, perm: 'app:view' },
  { id: 'dataset', name: '数据集', icon: Database, desc: '数据集管理', page: 'dataset-list', glow: 'rose' as const, perm: 'dataset:view' },
  {
    id: 'grant-inbox',
    name: '授权审批待办',
    icon: ClipboardCheck,
    desc: '待我审批的授权申请',
    page: 'grant-applications',
    glow: 'cyan' as const,
    perm: 'grant-application:review',
  },
  {
    id: 'admin-grants',
    name: '资源授权管理',
    icon: Server,
    desc: '管理后台 · 全局 Grant',
    page: 'resource-grant-management',
    glow: 'indigo' as const,
    perm: 'resource-grant:manage',
  },
  { id: 'monitoring', name: '监控中心', icon: Activity, desc: '调用日志与告警', page: 'monitoring-overview', glow: 'emerald' as const, perm: 'monitor:view' },
] as const;

const ALL_TOOL_IDS = new Set<string>(ALL_TOOLS.map((t) => t.id));

const ICON_BG: Record<string, { light: string; dark: string }> = {
  agent:      { light: 'bg-blue-50 text-blue-600',      dark: 'bg-blue-500/15 text-blue-400' },
  skill:      { light: 'bg-neutral-100 text-neutral-900',  dark: 'bg-neutral-900/10 text-neutral-300' },
  app:        { light: 'bg-emerald-50 text-emerald-600', dark: 'bg-emerald-500/15 text-emerald-400' },
  dataset:    { light: 'bg-orange-50 text-orange-600',  dark: 'bg-orange-500/15 text-orange-400' },
  'grant-inbox': { light: 'bg-cyan-50 text-cyan-600', dark: 'bg-cyan-500/15 text-cyan-400' },
  'admin-grants': { light: 'bg-indigo-50 text-indigo-600', dark: 'bg-indigo-500/15 text-indigo-400' },
  monitoring: { light: 'bg-rose-50 text-rose-600', dark: 'bg-rose-500/15 text-rose-400' },
};

export const QuickAccess: React.FC<QuickAccessProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasPermission, isAdmin } = useUserRole();
  const permittedTools = useMemo(() => ALL_TOOLS.filter((t) => hasPermission(t.perm)), [hasPermission]);
  const navigate = useNavigate();

  const [visibleIds, setVisibleIds] = useState<string[]>(() =>
    parseQuickLinkIds(localStorage.getItem(QUICK_LINKS_KEY), ALL_TOOLS.map((t) => t.id), ALL_TOOL_IDS),
  );
  useEffect(() => {
    const allowed = new Set<string>(permittedTools.map((t) => t.id));
    setVisibleIds((prev) => {
      const filtered = prev.filter((id) => allowed.has(id));
      return filtered.length > 0 ? filtered : permittedTools.map((t) => t.id);
    });
  }, [permittedTools]);
  useEffect(() => {
    try {
      localStorage.setItem(QUICK_LINKS_KEY, JSON.stringify(visibleIds));
    } catch {
      /* ignore quota */
    }
  }, [visibleIds]);

  const [showCustomize, setShowCustomize] = useState(false);
  const [draftVisible, setDraftVisible] = useState<string[]>(visibleIds);

  const tools = permittedTools.filter((t) => visibleIds.includes(t.id));

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <DashboardLayout className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold tracking-tight ${textPrimary(theme)}`}>快捷入口</h2>
          <button
            type="button"
            onClick={() => { setDraftVisible(visibleIds); setShowCustomize(true); }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.97] ${
              isDark
                ? 'bg-white/[0.06] text-slate-300 hover:bg-white/10 border border-white/[0.06]'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Plus size={16} />
            自定义入口
          </button>
        </div>

        {/* Quick Link Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {tools.map((tool, i) => {
            const iconCls = isDark ? ICON_BG[tool.id]?.dark : ICON_BG[tool.id]?.light;
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: i * 0.05 }}
              >
                <BentoCard
                  theme={theme}
                  hover
                  glow={tool.glow}
                  onClick={() => navigate(buildPath(isAdmin ? 'admin' : 'user', tool.page))}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconCls}`}>
                    <tool.icon size={24} />
                  </div>
                  <div>
                    <span className={`text-[13px] font-medium block ${textPrimary(theme)}`}>{tool.name}</span>
                    <span className={`text-xs ${textMuted(theme)}`}>{tool.desc}</span>
                  </div>
                </BentoCard>
              </motion.div>
            );
          })}
        </div>

        {/* Resources */}
        <section className="space-y-4 pt-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">常用资源</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '接入文档', desc: '智能体/技能接入流程与 API 规范文档', icon: Code, glow: 'indigo' as const },
              { title: '最佳实践', desc: '校园场景 AI 智能体落地案例与模板', icon: Layers, glow: 'emerald' as const },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 + i * 0.05 }}
              >
                <BentoCard
                  theme={theme}
                  hover
                  glow={card.glow}
                  onClick={() =>
                    navigate(buildPath('user', card.title === '接入文档' ? 'api-docs' : 'hub'))
                  }
                  className="flex items-start gap-4 group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-white/[0.06]' : 'bg-slate-100'
                  } ${textSecondary(theme)}`}>
                    <card.icon size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className={`text-[14px] font-bold flex items-center gap-1.5 ${textPrimary(theme)}`}>
                      <span>{card.title}</span>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className={`text-[12px] ${textSecondary(theme)}`}>{card.desc}</p>
                  </div>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </section>
      </DashboardLayout>

      {/* Customize Modal */}
      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCustomize(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`w-full max-w-sm p-6 ${bentoCard(theme)} rounded-[24px]`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-base font-bold ${textPrimary(theme)}`}>自定义快捷入口</h3>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-1.5 mb-6">
                {permittedTools.map((tool) => {
                  const checked = draftVisible.includes(tool.id);
                  const iconCls = isDark ? ICON_BG[tool.id]?.dark : ICON_BG[tool.id]?.light;
                  return (
                    <label
                      key={tool.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-neutral-900 border-neutral-900 text-white'
                          : isDark ? 'border-white/20 bg-transparent' : 'border-slate-300 bg-white'
                      }`}>
                        {checked && <Check size={13} strokeWidth={3} />}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => setDraftVisible((prev) =>
                          checked ? prev.filter((id) => id !== tool.id) : [...prev, tool.id]
                        )}
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls}`}>
                        <tool.icon size={16} />
                      </div>
                      <span className={`text-sm font-medium ${textPrimary(theme)}`}>{tool.name}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className={btnGhost(theme)} onClick={() => setShowCustomize(false)}>
                  取消
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => { setVisibleIds(draftVisible); setShowCustomize(false); }}
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

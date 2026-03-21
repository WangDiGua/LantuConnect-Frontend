import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { buildPath } from '../../constants/consoleRoutes';

interface QuickAccessProps {
  theme: Theme;
  fontSize: FontSize;
}

const QUICK_LINKS_KEY = 'lantu_quick_links_visible';

const ALL_TOOLS = [
  { id: 'agent', name: 'Agent 管理', icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: '注册、审核与发布', page: 'agent-list' },
  { id: 'skill', name: 'Skill 管理', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'MCP 工具与 API', page: 'skill-list' },
  { id: 'app', name: '智能应用', icon: Cpu, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: '应用注册与上架', page: 'app-list' },
  { id: 'dataset', name: '数据集', icon: Database, color: 'text-orange-500', bg: 'bg-orange-500/10', desc: '数据集管理', page: 'dataset-list' },
  { id: 'provider', name: 'Provider', icon: Server, color: 'text-cyan-500', bg: 'bg-cyan-500/10', desc: '服务提供商配置', page: 'provider-list' },
  { id: 'monitoring', name: '监控中心', icon: Activity, color: 'text-red-500', bg: 'bg-red-500/10', desc: '调用日志与告警', page: 'monitoring-overview' },
] as const;

export const QuickAccess: React.FC<QuickAccessProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  const [visibleIds, setVisibleIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(QUICK_LINKS_KEY) || 'null') ?? ALL_TOOLS.map((t) => t.id); }
    catch { return ALL_TOOLS.map((t) => t.id); }
  });
  useEffect(() => { localStorage.setItem(QUICK_LINKS_KEY, JSON.stringify(visibleIds)); }, [visibleIds]);

  const [showCustomize, setShowCustomize] = useState(false);
  const [draftVisible, setDraftVisible] = useState<string[]>(visibleIds);

  const tools = ALL_TOOLS.filter((t) => visibleIds.includes(t.id));

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-2 sm:py-3 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${maxW} w-full space-y-8`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>快捷入口</h2>
          <button
            type="button"
            onClick={() => { setDraftVisible(visibleIds); setShowCustomize(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus size={16} />
            <span>自定义入口</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {tools.map((tool) => (
            <motion.div
              key={tool.name}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(buildPath('admin', tool.page))}
              className={`p-4 rounded-2xl border cursor-pointer transition-colors flex flex-col items-center gap-3 text-center shadow-none ${
                isDark ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.bg} ${tool.color}`}>
                <tool.icon size={24} />
              </div>
              <div>
                <span className={`text-[13px] font-medium block ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{tool.name}</span>
                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{tool.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <section className="space-y-4 pt-4">
          <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>常用资源</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '接入文档', desc: 'Agent/Skill 接入流程与 API 规范文档', icon: Code },
              { title: '最佳实践', desc: '校园场景 AI Agent 落地案例与模板', icon: Layers },
            ].map((card) => (
              <div
                key={card.title}
                onClick={() => navigate(buildPath('admin', 'api-docs'))}
                className={`p-5 rounded-2xl border flex items-start gap-4 group cursor-pointer transition-colors shadow-none ${
                  isDark ? 'bg-[#1C1C1E] border-white/10 hover:bg-white/5' : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-slate-100'} text-slate-500`}>
                  <card.icon size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className={`text-[14px] font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>{card.title}</span>
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[12px] text-slate-500">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 自定义入口弹窗 */}
      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCustomize(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={`w-full max-w-sm rounded-2xl border p-6 ${
                isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>自定义快捷入口</h3>
                <button type="button" onClick={() => setShowCustomize(false)} className="btn btn-ghost btn-sm btn-circle">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2 mb-6">
                {ALL_TOOLS.map((tool) => {
                  const checked = draftVisible.includes(tool.id);
                  return (
                    <label
                      key={tool.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-blue-600 border-blue-600 text-white'
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
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tool.bg} ${tool.color}`}>
                        <tool.icon size={16} />
                      </div>
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{tool.name}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCustomize(false)}>
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
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

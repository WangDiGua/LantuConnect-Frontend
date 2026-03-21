import React from 'react';
import { motion } from 'framer-motion';
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
  Plus
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

interface QuickAccessProps {
  theme: Theme;
  fontSize: FontSize;
}

export const QuickAccess: React.FC<QuickAccessProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  const tools = [
    { name: 'Agent 管理', icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: '注册、审核与发布' },
    { name: 'Skill 管理', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'MCP 工具与 API' },
    { name: '智能应用', icon: Cpu, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: '应用注册与上架' },
    { name: '数据集', icon: Database, color: 'text-orange-500', bg: 'bg-orange-500/10', desc: '数据集管理' },
    { name: 'Provider', icon: Server, color: 'text-cyan-500', bg: 'bg-cyan-500/10', desc: '服务提供商配置' },
    { name: '监控中心', icon: Activity, color: 'text-red-500', bg: 'bg-red-500/10', desc: '调用日志与告警' },
  ];

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-2 sm:py-3 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${maxW} w-full space-y-8`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>快捷入口</h2>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
            isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
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
              <div key={card.title} className={`p-5 rounded-2xl border flex items-start gap-4 group cursor-pointer transition-colors shadow-none ${
                isDark ? 'bg-[#1C1C1E] border-white/10 hover:bg-white/5' : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
              }`}>
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
    </div>
  );
};

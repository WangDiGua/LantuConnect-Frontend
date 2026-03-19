import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Theme } from '../../types';
import { FEATURED_TOOLS, TOOL_SECTIONS } from '../../constants/data';

interface ToolMarketDiscoverProps {
  theme: Theme;
}

/** 工具发现：市场首页（精选与分类，子项由侧栏切换） */
export const ToolMarketDiscover: React.FC<ToolMarketDiscoverProps> = ({ theme }) => {
  return (
    <div
      className={`flex-1 overflow-y-auto transition-colors duration-300 ${
        theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-[#000000]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-4">
        <div className="text-center mb-10 py-4 sm:py-8">
          <h1 className={`text-2xl sm:text-4xl font-bold mb-6 sm:mb-8 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            聚合优质工具与 MCP 服务，驱动 Agent 能力高效搭建
          </h1>
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />
            <div
              className={`relative w-full rounded-2xl border transition-colors shadow-none ${
                theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E] border-white/10'
              }`}
            >
              <textarea
                placeholder="输入需要的工具名称或 Agent 需要的能力，智能匹配工具及 MCP 服务"
                className={`w-full h-32 sm:h-36 p-4 sm:p-6 rounded-2xl bg-transparent outline-none resize-none text-[14px] sm:text-[15px] placeholder:text-slate-400 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}
              />
              <button
                type="button"
                className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 sm:px-5 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold flex items-center gap-2 hover:scale-105 transition-transform active:scale-95"
              >
                <Sparkles size={16} />
                智能搜索
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-10">
          <div className={`flex p-1 rounded-2xl ${theme === 'light' ? 'bg-slate-200/50' : 'bg-white/5'}`}>
            <button
              type="button"
              className={`px-6 sm:px-10 py-2 rounded-xl text-[13px] sm:text-[14px] font-semibold transition-colors shadow-none ${
                theme === 'light'
                  ? 'bg-white border border-slate-200/80 text-slate-900'
                  : 'bg-white/15 border border-white/10 text-white'
              }`}
            >
              推荐
            </button>
            <button
              type="button"
              className="px-6 sm:px-10 py-2 rounded-xl text-[13px] sm:text-[14px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              全部
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {FEATURED_TOOLS.map((tool, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-6 sm:p-8 rounded-2xl border bg-gradient-to-br ${tool.color} transition-colors shadow-none hover:opacity-[0.98] ${
                theme === 'light' ? 'border-slate-200/80' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="p-3 bg-white dark:bg-white/10 rounded-2xl shadow-none flex-shrink-0 border border-slate-200/30 dark:border-white/10">
                  <tool.icon size={28} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className={`font-bold text-[16px] sm:text-[18px] tracking-tight ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  {tool.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {tool.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] sm:text-[11px] px-3 py-1 bg-white/60 dark:bg-white/5 rounded-full border border-slate-200/50 dark:border-white/5 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-[12px] sm:text-[13px] text-slate-500 leading-relaxed line-clamp-4">{tool.desc}</p>
            </motion.div>
          ))}
        </div>

        {TOOL_SECTIONS.map((section, i) => (
          <div key={i} className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                {section.title}
              </h2>
              <button
                type="button"
                className="text-[13px] sm:text-[14px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                更多 <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {section.items.map((item, j) => (
                <motion.div
                  key={j}
                  whileHover={{ scale: 1.02, y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: j * 0.05 }}
                  className={`p-6 rounded-2xl border transition-colors shadow-none hover:border-slate-300 dark:hover:border-white/15 ${
                    theme === 'light' ? 'bg-white border-slate-200/80' : 'bg-[#1C1C1E] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <item.icon size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-bold text-[14px] sm:text-[15px] tracking-tight truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        {item.title}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">@{item.author}</p>
                    </div>
                  </div>
                  <p className="text-[12px] sm:text-[13px] text-slate-500 line-clamp-3 mb-5 leading-relaxed">{item.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] sm:text-[10px] px-2 sm:px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-xl text-slate-600 dark:text-slate-400 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

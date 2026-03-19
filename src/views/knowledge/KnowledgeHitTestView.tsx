import React, { useState } from 'react';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  onBack: () => void;
}

export const KnowledgeHitTestView: React.FC<Props> = ({ theme, fontSize, themeColor, onBack }) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [query, setQuery] = useState('');
  const [kbId, setKbId] = useState('');
  const [results, setResults] = useState<{ text: string; score: number }[] | null>(null);

  const runTest = () => {
    if (!query.trim()) return;
    setResults([
      { text: '（模拟）与「' + query.slice(0, 20) + '」相关的政策条款摘要…', score: 0.92 },
      { text: '（模拟）另一段检索到的文档片段，用于验证展示样式。', score: 0.78 },
    ]);
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div
          className={`rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          <div
            className={`shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
              <ArrowLeft size={20} />
            </button>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>命中测试</h1>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 w-full max-w-7xl items-start">
              <div
                className={`rounded-2xl border p-5 sm:p-6 shadow-none space-y-4 ${
                  isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-[#F2F2F7]/80 border-slate-200/80'
                }`}
              >
                <h2 className={`font-bold text-sm uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  检索条件
                </h2>
                <div className="form-control w-full">
                  <label className="label py-0">
                    <span className="label-text font-bold">知识库 ID（可选）</span>
                  </label>
                  <input
                    className="input input-bordered w-full font-mono text-sm"
                    placeholder="留空则使用默认测试库"
                    value={kbId}
                    onChange={(e) => setKbId(e.target.value)}
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label py-0">
                    <span className="label-text font-bold">查询文本</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-[160px] w-full"
                    placeholder="输入要向量检索的问题或关键词…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={runTest}
                  className={`btn w-full sm:w-auto text-white border-0 gap-2 ${tc.bg} shadow-lg ${tc.shadow}`}
                >
                  <Send size={18} />
                  执行检索
                </button>
              </div>

              <div
                className={`rounded-2xl border p-5 sm:p-6 shadow-none min-h-[200px] xl:min-h-[320px] ${
                  isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-[#F2F2F7]/80 border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-4 font-bold">
                  <Sparkles size={18} className={tc.text} />
                  检索结果
                </div>
                {!results ? (
                  <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    填写查询后点击「执行检索」，结果将展示在此区域（当前为演示数据）。
                  </p>
                ) : (
                  <>
                    <p className={`text-xs mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>演示数据</p>
                    <ul className="space-y-3">
                      {results.map((r, i) => (
                        <li
                          key={i}
                          className={`p-4 rounded-xl text-sm leading-relaxed ${
                            isDark ? 'bg-white/5' : 'bg-white border border-slate-200/80'
                          }`}
                        >
                          <div className="flex justify-between gap-2 mb-2">
                            <span className="text-xs font-mono text-slate-400">chunk #{i + 1}</span>
                            <span className={`text-xs font-bold tabular-nums ${tc.text}`}>
                              {(r.score * 100).toFixed(0)}% 相关
                            </span>
                          </div>
                          {r.text}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

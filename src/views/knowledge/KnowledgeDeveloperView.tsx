import React from 'react';
import { ArrowLeft, BookOpen, Code2, Key, ExternalLink } from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  onBack: () => void;
}

const cards = [
  {
    title: 'OpenAPI 文档',
    desc: '知识库创建、文档上传、检索等 REST 接口说明。',
    icon: BookOpen,
  },
  {
    title: 'SDK 与示例',
    desc: 'Python / Node 调用示例与错误码说明。',
    icon: Code2,
  },
  {
    title: 'API Key 管理',
    desc: '在系统配置中创建密钥后，用于服务端调用知识库 API。',
    icon: Key,
  },
];

export const KnowledgeDeveloperView: React.FC<Props> = ({ theme, fontSize, themeColor, onBack }) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];

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
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>开发者资源</h1>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 w-full max-w-7xl">
              {cards.map((c) => (
                <div
                  key={c.title}
                  className={`rounded-2xl border p-5 lg:p-6 flex flex-col sm:flex-row gap-4 shadow-none ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-[#F2F2F7]/80 border-slate-200/80'
                  }`}
                >
                  <div className={`p-3 rounded-xl shrink-0 self-start ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
                    <c.icon size={22} className={tc.text} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className={`font-bold mb-2 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {c.title}
                    </h2>
                    <p className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {c.desc}
                    </p>
                    <button type="button" className={`btn btn-sm btn-ghost gap-1 px-0 ${tc.text}`}>
                      查看详情
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className={`text-xs mt-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              以上为前端占位说明，实际链接由后端接入后配置。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

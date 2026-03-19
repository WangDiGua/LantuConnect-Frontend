import React from 'react';
import {
  BookOpen,
  Rocket,
  FileCode2,
  HelpCircle,
  ScrollText,
  Video,
  ExternalLink,
  ChevronRight,
  Layers,
  Key,
  Activity,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

interface DocsTutorialPageProps {
  theme: Theme;
  fontSize: FontSize;
}

const QUICK_LINKS = [
  {
    title: '快速开始',
    desc: '10 分钟了解控制台布局、Agent 创建流程与首次调用。',
    icon: Rocket,
    tag: '入门',
  },
  {
    title: '平台用户指南',
    desc: '知识库、数据库、监控与用户治理等模块的操作说明与最佳实践。',
    icon: BookOpen,
    tag: '手册',
  },
  {
    title: 'OpenAPI 参考',
    desc: '认证方式、限流头、错误码与主要 REST 路径（演示环境示例）。',
    icon: FileCode2,
    tag: '开发',
  },
  {
    title: '常见问题',
    desc: '配额、模型接入、审计与告警等高频问题整理。',
    icon: HelpCircle,
    tag: '支持',
  },
];

const MODULES = [
  { name: 'Agent 与工具', points: ['创建与调试 Agent', '工具广场与 MCP 发现', '市场安装与版本说明'] },
  { name: '数据与知识', points: ['知识库向量与导入', '数据库连接与权限', '命中测试与检索调优'] },
  { name: '运维与合规', points: ['监控概览与调用日志', '告警确认与订阅', '审计日志导出'] },
];

const CHANGELOG = [
  { ver: '1.2', date: '2026-03', text: '监控中心子页、统一工具栏与原生下拉样式。' },
  { ver: '1.1', date: '2026-02', text: '知识库/数据库全宽布局、外观设置持久化。' },
  { ver: '1.0', date: '2026-01', text: '兰智通控制台初版：概览、Agent、用户与系统配置。' },
];

/** 文档与教程：结构化入口，便于后续替换为真实文档站链接 */
export const DocsTutorialPage: React.FC<DocsTutorialPageProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  const card = `${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'} rounded-2xl border shadow-none`;

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-2 sm:py-3 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${maxW} w-full space-y-8`}>
        <header className={`${card} p-6 sm:p-8`}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <span
              className={`inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${
                isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <ScrollText size={24} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                文档与教程
              </h1>
              <p className={`mt-2 text-sm leading-relaxed max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                以下为兰智通（LantuConnect）控制台配套说明的结构化索引。生产环境可对接内部 Wiki、语雀或
                GitBook；此处为演示文案与布局。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                    isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  站内索引
                </span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                    isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  持续更新
                </span>
              </div>
            </div>
          </div>
        </header>

        <section>
          <h2 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>核心入口</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUICK_LINKS.map((item) => (
              <button
                key={item.title}
                type="button"
                className={`${card} p-5 text-left transition-colors ${
                  isDark ? 'hover:border-white/20' : 'hover:border-slate-300'
                } group`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                      isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <item.icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-[15px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                          isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <p className={`text-[13px] mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.desc}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[12px] font-medium mt-3 ${
                        isDark ? 'text-blue-400' : 'text-blue-600'
                      }`}
                    >
                      查看详情
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className={`${card} p-6 lg:col-span-2`}>
            <h2 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Layers size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              按模块浏览
            </h2>
            <ul className="space-y-5">
              {MODULES.map((m) => (
                <li key={m.name}>
                  <h3 className={`font-semibold text-[14px] mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {m.name}
                  </h3>
                  <ul className={`space-y-1.5 text-[13px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {m.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="text-blue-500 shrink-0">·</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <aside className="space-y-6">
            <div className={`${card} p-5`}>
              <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Key size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                认证说明
              </h2>
              <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                控制台会话与 API 调用建议使用机构统一身份。开放平台场景下，请使用「用户管理」中的 API Key 与
                Token，并在请求头携带约定字段。
              </p>
            </div>
            <div className={`${card} p-5`}>
              <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Video size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                视频教程
              </h2>
              <p className={`text-[12px] leading-relaxed mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                以下为占位链接，可替换为内部培训平台或公开课地址。
              </p>
              <button
                type="button"
                className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium border ${
                  isDark
                    ? 'border-white/15 text-slate-200 hover:bg-white/5'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                打开视频列表
                <ExternalLink size={14} />
              </button>
            </div>
            <div className={`${card} p-5`}>
              <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Activity size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                更新日志
              </h2>
              <ul className="space-y-3">
                {CHANGELOG.map((c) => (
                  <li key={c.ver} className={`text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="font-mono font-semibold text-blue-500">{c.ver}</span>
                    <span className="text-slate-500 mx-1.5">{c.date}</span>
                    <span className="block mt-0.5">{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

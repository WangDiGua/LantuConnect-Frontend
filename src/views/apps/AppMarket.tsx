import React, { useState, useEffect, useMemo } from 'react';
import { Search, LayoutGrid, ExternalLink } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SmartApp, EmbedType } from '../../types/dto/smart-app';
import type { SourceType } from '../../types/dto/agent';
import { smartAppService } from '../../api/services/smart-app.service';
import { nativeInputClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const EMBED_BADGE: Record<EmbedType, { label: string; cls: string }> = {
  iframe: { label: '嵌入式', cls: 'text-blue-600 bg-blue-500/10' },
  redirect: { label: '外链', cls: 'text-amber-600 bg-amber-500/10' },
  micro_frontend: { label: '微前端', cls: 'text-violet-600 bg-violet-500/10' },
};

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
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

export const AppMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const dark = theme === 'dark';
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    smartAppService
      .list({ status: 'published', pageSize: 100 })
      .then((res) => { if (!cancelled) setApps(res.list); })
      .catch(() => { if (!cancelled) showMessage?.('加载应用列表失败', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return apps;
    const kw = keyword.toLowerCase();
    return apps.filter(
      (a) =>
        a.displayName.toLowerCase().includes(kw) ||
        a.appName.toLowerCase().includes(kw) ||
        a.description.toLowerCase().includes(kw)
    );
  }, [apps, keyword]);

  const handleOpen = (app: SmartApp) => {
    if (app.embedType === 'redirect') {
      window.open(app.appUrl, '_blank');
    } else {
      showMessage?.(`应用「${app.displayName}」将以${EMBED_BADGE[app.embedType].label}方式加载`, 'info');
    }
  };

  const inputCls = nativeInputClass(theme);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${dark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <LayoutGrid className="text-blue-500" size={22} />
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>应用广场</h1>
            {apps.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {apps.length}
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索应用…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={`${inputCls} !pl-9`}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-lg font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>暂无匹配的应用</p>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>尝试调整搜索关键词</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((app) => {
              const embedInfo = EMBED_BADGE[app.embedType];
              const srcInfo = SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal;
              return (
                <div
                  key={app.id}
                  className={`rounded-2xl border p-5 transition-colors ${
                    dark
                      ? 'bg-[#1C1C1E] border-white/10 hover:bg-[#2C2C2E]'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${pickColor(app.appName)}`}>
                      {(app.displayName || app.appName).charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {app.displayName}
                      </h3>
                    </div>
                  </div>

                  <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {app.description || '暂无描述'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${embedInfo.cls}`}>
                      {embedInfo.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${srcInfo.cls}`}>
                      {srcInfo.label}
                    </span>
                  </div>

                  <div className={`flex items-center justify-end pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => handleOpen(app)}
                      className="btn btn-primary btn-xs rounded-xl shadow-none gap-1"
                    >
                      打开应用
                      <ExternalLink size={12} />
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

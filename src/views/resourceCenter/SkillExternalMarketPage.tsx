import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, RefreshCw, Settings2, List } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SkillExternalCatalogItemVO } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { buildPath } from '../../constants/consoleRoutes';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Pagination, SearchInput } from '../../components/common';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  canvasBodyBg,
  mainScrollCompositorClass,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { nullDisplay } from '../../utils/errorHandler';
import { SkillExternalMarketSettingsForm } from './SkillExternalMarketSettingsForm';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type MarketTab = 'list' | 'settings';

const PAGE_SIZE = 20;

export const SkillExternalMarketPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [tab, setTab] = useState<MarketTab>('list');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SkillExternalCatalogItemVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const selectMarketTab = (next: MarketTab) => {
    if (tab === 'list' && next !== 'list') {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) ae.blur();
    }
    setTab(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resourceCenterService.listSkillExternalCatalog({
        ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(res.list);
      setTotal(Number.isFinite(res.total) ? res.total : 0);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('加载市场列表失败');
      setError(err);
      setRows([]);
      setTotal(0);
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, showMessage]);

  useEffect(() => {
    if (tab === 'list') void load();
  }, [load, tab]);

  const goImport = (packUrl: string) => {
    const q = `?skillTrack=hosted&skillPackUrl=${encodeURIComponent(packUrl.trim())}`;
    navigate(`${buildPath('admin', 'skill-register')}${q}`);
  };

  const densityClass = fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm';

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)} ${densityClass}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => navigate(`${buildPath('admin', 'resource-catalog')}?type=skill`)} className={btnGhost(theme)}>
                <ArrowLeft size={15} />
                返回资源中心
              </button>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>技能在线市场</h2>
                <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>
                  列表数据由管理员在「市场配置」的<strong>生效方式</strong>中指定（合并多源 / 仅 SkillHub / 仅 SkillsMP / 仅镜像），并在各标签页维护对应站点参数。支持关键字与分页。导入
                  zip 有结构校验。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={`inline-flex rounded-xl border p-0.5 ${isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200 bg-slate-50'}`}>
                <button
                  type="button"
                  onClick={() => setTab('list')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === 'list'
                      ? isDark
                        ? 'bg-white/10 text-white'
                        : 'bg-white text-slate-900 shadow-sm'
                      : `${textMuted(theme)} hover:opacity-90`
                  }`}
                >
                  <List size={15} />
                  市场列表
                </button>
                <button
                  type="button"
                  onClick={() => selectMarketTab('settings')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === 'settings'
                      ? isDark
                        ? 'bg-white/10 text-white'
                        : 'bg-white text-slate-900 shadow-sm'
                      : `${textMuted(theme)} hover:opacity-90`
                  }`}
                >
                  <Settings2 size={15} />
                  市场配置
                </button>
              </div>
              {tab === 'list' ? (
                <button type="button" onClick={() => void load()} className={btnGhost(theme)} disabled={loading}>
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  刷新
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-3">
            {tab === 'settings' ? (
              <SkillExternalMarketSettingsForm
                theme={theme}
                fontSize={fontSize}
                showMessage={showMessage}
                onSaved={() => void load()}
              />
            ) : (
              <>
                <div
                  className={`mb-3 flex flex-col gap-2 px-3 sm:flex-row sm:flex-wrap sm:items-center ${isDark ? '' : ''}`}
                >
                  <div className="min-w-[min(100%,240px)] flex-1">
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="筛选：名称、简介、ZIP 链接、来源…"
                      theme={theme}
                    />
                  </div>
                  {!loading && total > 0 ? (
                    <span className={`text-xs ${textMuted(theme)}`}>
                      共 {total} 条
                      {debouncedSearch ? `（已筛选）` : ''}
                    </span>
                  ) : null}
                </div>
                {loading ? (
                  <PageSkeleton type="table" rows={6} />
                ) : error ? (
                  <PageError error={error} onRetry={() => void load()} retryLabel="重试" />
                ) : rows.length === 0 ? (
                  <p className={`px-4 py-8 text-center text-sm ${textSecondary(theme)}`}>
                    {debouncedSearch
                      ? '无匹配条目，请调整关键字。'
                      : '暂无数据。可在「市场配置」中设置 SkillHub、SkillsMP、镜像 JSON、代理与 provider；亦可使用环境变量与 YAML 默认值。'}
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className={`border-b ${isDark ? 'border-white/[0.06] text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                            <th className="whitespace-nowrap px-3 py-2 font-medium">名称</th>
                            <th className="whitespace-nowrap px-3 py-2 font-medium">星标</th>
                            <th className="min-w-[200px] px-3 py-2 font-medium">简介</th>
                            <th className="min-w-[180px] px-3 py-2 font-medium">ZIP / 下载地址</th>
                            <th className="min-w-[160px] px-3 py-2 font-medium">许可说明</th>
                            <th className="whitespace-nowrap px-3 py-2 font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr
                              key={row.id}
                              className={`border-b ${isDark ? 'border-white/[0.04]' : 'border-slate-100'} ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80'}`}
                            >
                              <td className={`px-3 py-2 font-medium ${textPrimary(theme)}`}>
                                <div className="flex flex-col gap-0.5">
                                  <span>{row.name}</span>
                                  {row.sourceUrl ? (
                                    <a
                                      href={row.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-1 text-xs font-normal ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`}
                                    >
                                      <ExternalLink size={12} />
                                      来源页
                                    </a>
                                  ) : null}
                                </div>
                              </td>
                              <td className={`px-3 py-2 tabular-nums ${textSecondary(theme)}`}>
                                {row.stars != null && row.stars > 0 ? row.stars : '—'}
                              </td>
                              <td className={`px-3 py-2 ${textSecondary(theme)}`}>{nullDisplay(row.summary)}</td>
                              <td className="px-3 py-2">
                                <a
                                  href={row.packUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 break-all ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`}
                                >
                                  <Download size={14} />
                                  {row.packUrl}
                                </a>
                              </td>
                              <td className={`px-3 py-2 ${textSecondary(theme)}`}>{nullDisplay(row.licenseNote)}</td>
                              <td className="px-3 py-2">
                                <button type="button" className={btnPrimary} onClick={() => goImport(row.packUrl)}>
                                  导入到本平台
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-center px-2 pb-2">
                      <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

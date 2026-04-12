import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Send, Copy, Check, Clock, ChevronDown, ChevronUp, Trash2, BookOpen } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { ApiException, type ApiResponse } from '../../types/api';
import { http } from '../../lib/http';
import { GlassPanel } from '../../components/common/GlassPanel';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  btnPrimary, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { env } from '../../config/env';
import { buildPath } from '../../constants/consoleRoutes';
import {
  MAX_PLAYGROUND_HISTORY_ITEMS,
  MAX_STORED_API_KEY_LENGTH,
  normalizeCatalogResourcesListPageSizeInUrl,
  normalizePlaygroundHistory,
  parsePlaygroundHistoryFromStorage,
  readBoundedLocalStorage,
  type PlaygroundHistoryEntry,
} from '../../lib/safeStorage';
import { GatewayPlaygroundToolsSection } from './GatewayPlaygroundToolsSection';

/** 与 `usePersistedGatewayApiKey`、axios 注入逻辑共用 */
const GATEWAY_API_KEY_STORAGE_KEY = 'lantu_api_key';

function readStoredGatewayApiKey(): string {
  return readBoundedLocalStorage(GATEWAY_API_KEY_STORAGE_KEY, MAX_STORED_API_KEY_LENGTH)?.trim() ?? '';
}

function getHeaderValue(pairs: HeaderPair[], name: string): string {
  const n = name.toLowerCase();
  for (const h of pairs) {
    if (h.key.trim().toLowerCase() === n) return h.value;
  }
  return '';
}

/** 相对上下文路径下的接口路径；外链不校验 */
function playgroundPathNeedsApiKey(rawUrl: string): boolean {
  const path = toRelativeApiPath(rawUrl).split('?')[0];
  if (/^https?:\/\//i.test(path)) return false;
  if (path === '/invoke' || path === '/invoke-stream' || path === '/catalog/resolve') return true;
  if (path.startsWith('/mcp/v1/')) return true;
  if (path.startsWith('/sdk/v1/')) return true;
  return false;
}

function effectivePlaygroundApiKey(headers: HeaderPair[]): string {
  const fromForm = getHeaderValue(headers, 'X-Api-Key').trim();
  if (fromForm) return fromForm;
  return readStoredGatewayApiKey();
}

interface HeaderPair { key: string; value: string; }
type HistoryEntry = PlaygroundHistoryEntry;

const METHOD_COLORS: Record<string, string> = { GET: 'text-emerald-500', POST: 'text-blue-500', PUT: 'text-amber-500', DELETE: 'text-rose-500' };

const HTTP_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({ value: m, label: m }));

function toRelativeApiPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '/';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const prefix = env.VITE_API_BASE_URL.replace(/\/$/, '');
  if (prefix && (trimmed === prefix || trimmed.startsWith(`${prefix}/`))) {
    return trimmed.length === prefix.length ? '/' : trimmed.slice(prefix.length);
  }
  if (trimmed.startsWith('/api/') || trimmed === '/api') {
    return trimmed === '/api' ? '/' : trimmed.slice(4);
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function getStatusCls(status: number, isDark: boolean) {
  const k = String(status)[0];
  if (k === '2') return isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700';
  if (k === '4') return isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700';
  return isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-700';
}

function CopyBtn({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="复制">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export interface PlaygroundLinkToDocsButtonProps { theme: Theme }

/** 供「调试与网关」hub 工具栏与独立 Playground 页共用 */
export const PlaygroundLinkToDocsButton: React.FC<PlaygroundLinkToDocsButtonProps> = ({ theme }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
        isDark ? 'border-white/12 text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200/90 text-slate-600 hover:bg-slate-50'
      }`}
      onClick={() => navigate(buildPath('user', 'developer-docs'))}
      aria-label="打开接入与文档中的接入指南"
    >
      <BookOpen size={14} className="shrink-0 opacity-85" aria-hidden />
      接入指南
    </button>
  );
};

export interface ApiPlaygroundPageProps {
  theme: Theme;
  fontSize: FontSize;
  /** 嵌入「调试与网关」hub：不包 MgmtPageShell，由 hub 统一面包屑 */
  embedInHub?: boolean;
}

export const ApiPlaygroundPage: React.FC<ApiPlaygroundPageProps> = ({ theme, fontSize, embedInHub = false }) => {
  const isDark = theme === 'dark';
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState(() =>
    normalizeCatalogResourcesListPageSizeInUrl(
      `${env.VITE_API_BASE_URL.replace(/\/$/, '')}/catalog/resources?page=1&pageSize=10&resourceType=agent`,
    ),
  );
  const [headers, setHeaders] = useState<HeaderPair[]>([
    { key: 'Authorization', value: '' },
    { key: 'X-User-Id', value: '' },
    { key: 'X-Api-Key', value: '' },
    { key: 'X-Trace-Id', value: '' },
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [body, setBody] = useState('{\n  "resourceType": "agent",\n  "resourceId": "1",\n  "payload": {\n    "input": "hello"\n  }\n}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; time: number; body: string; headers: Record<string, string> } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    parsePlaygroundHistoryFromStorage(localStorage.getItem('lantu_playground_history')),
  );
  const [showRespHeaders, setShowRespHeaders] = useState(false);
  const [executeKeyHint, setExecuteKeyHint] = useState<string | null>(null);

  React.useEffect(() => {
    const stored = readStoredGatewayApiKey();
    if (!stored) return;
    setHeaders((prev) => {
      const idx = prev.findIndex((h) => h.key.trim().toLowerCase() === 'x-api-key');
      if (idx < 0) return prev;
      if (prev[idx].value.trim()) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], value: stored };
      return next;
    });
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('lantu_playground_history', JSON.stringify(normalizePlaygroundHistory(history)));
    } catch {
      /* 配额或其它写入失败：忽略，不打断调试 */
    }
  }, [history]);

  React.useEffect(() => {
    setExecuteKeyHint(null);
  }, [url, method]);

  /** 迁移本地「最近请求」与地址栏中仍带 pageSize=20 的旧目录列表 URL */
  React.useEffect(() => {
    setUrl((u) => normalizeCatalogResourcesListPageSizeInUrl(u));
  }, []);

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (idx: number, field: 'key' | 'value', val: string) => { const n = [...headers]; n[idx] = { ...n[idx], [field]: val }; setHeaders(n); };
  const removeHeader = (idx: number) => setHeaders(headers.filter((_, i) => i !== idx));

  const sendRequest = useCallback(async () => {
    const resolvedPath = toRelativeApiPath(url);
    const resolvedEffective = normalizeCatalogResourcesListPageSizeInUrl(resolvedPath);
    if (playgroundPathNeedsApiKey(url) && !effectivePlaygroundApiKey(headers)) {
      setExecuteKeyHint(
        '此路径须带有效 X-Api-Key（完整 secretPlain）。请在 Headers 填写，或在资源市场 / 个人设置保存网关 Key（与 axios 共用本地存储后会自动注入请求）。',
      );
      setResponse(null);
      return;
    }
    setExecuteKeyHint(null);
    setLoading(true);
    setResponse(null);
    const started = Date.now();
    const isAbsolute = /^https?:\/\//i.test(resolvedEffective);

    const hdrs = new Headers();
    headers.forEach((h) => {
      const k = h.key.trim();
      if (k) hdrs.set(k, h.value);
    });

    const init: RequestInit = { method, headers: hdrs };
    if (method !== 'GET' && method !== 'HEAD' && body.trim()) {
      init.body = body;
    }

    try {
      let status = 200;
      let text = '';
      let respHeaders: Record<string, string> = {};
      if (isAbsolute) {
        const res = await fetch(resolvedEffective, init);
        text = await res.text();
        status = res.status;
        res.headers.forEach((v, k) => {
          respHeaders[k] = v;
        });
      } else {
        const reqBody = (method !== 'GET' && method !== 'HEAD' && body.trim())
          ? (() => {
              try { return JSON.parse(body); } catch { return body; }
            })()
          : undefined;
        const axiosRes = await http.instance.request<ApiResponse<unknown>>({
          url: resolvedEffective,
          method,
          data: reqBody,
          headers: Object.fromEntries(hdrs.entries()),
        });
        status = axiosRes.status;
        Object.entries(axiosRes.headers ?? {}).forEach(([k, v]) => {
          respHeaders[k] = Array.isArray(v) ? v.join(',') : String(v ?? '');
        });
        const payload = (axiosRes.data && typeof axiosRes.data === 'object' && 'data' in axiosRes.data)
          ? (axiosRes.data as ApiResponse<unknown>).data
          : axiosRes.data;
        text = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {}, null, 2);
      }
      const time = Date.now() - started;
      setResponse({ status, time, body: text, headers: respHeaders });
      setHistory((prev) =>
        normalizePlaygroundHistory([{ method, url: resolvedEffective, status, time, body, responseBody: text }, ...prev]).slice(
          0,
          MAX_PLAYGROUND_HISTORY_ITEMS,
        ),
      );
      if (resolvedEffective !== resolvedPath) {
        setUrl((u) => normalizeCatalogResourcesListPageSizeInUrl(u));
      }
    } catch (e) {
      const time = Date.now() - started;
      const status = e instanceof ApiException ? e.status : 0;
      const msg = e instanceof Error ? e.message : String(e);
      const respBody = JSON.stringify({ error: msg }, null, 2);
      setResponse({ status, time, body: respBody, headers: {} });
      setHistory((prev) =>
        normalizePlaygroundHistory([{ method, url: resolvedEffective, status, time, body, responseBody: respBody }, ...prev]).slice(
          0,
          MAX_PLAYGROUND_HISTORY_ITEMS,
        ),
      );
      if (resolvedEffective !== resolvedPath) {
        setUrl((u) => normalizeCatalogResourcesListPageSizeInUrl(u));
      }
    } finally {
      setLoading(false);
    }
  }, [method, url, body, headers]);

  const loadHistory = (entry: HistoryEntry) => {
    setMethod(entry.method);
    setUrl(normalizeCatalogResourcesListPageSizeInUrl(entry.url));
    setBody(entry.body);
    setResponse({ status: entry.status, time: entry.time, body: entry.responseBody, headers: {} });
  };

  const playgroundToolbar = <PlaygroundLinkToDocsButton theme={theme} />;

  const mainContent = (
      <div className="w-full min-h-0 flex flex-col gap-8 px-4 pb-12 pt-1 sm:px-6">
        <section aria-labelledby="playground-http-heading" className="min-h-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="playground-http-heading" className={`text-sm font-semibold ${textPrimary(theme)}`}>
                HTTP 调试
              </h2>
              <p className={`mt-0.5 text-xs leading-relaxed ${textMuted(theme)}`}>
                左侧填请求，右侧看返回。执行向接口需有效 Key，详见接入指南。
              </p>
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-4 lg:max-h-[min(640px,calc(100vh-17rem))] lg:flex-row lg:items-stretch">
          {/* Request panel */}
          <GlassPanel theme={theme} padding="sm" className="flex min-h-[280px] flex-col overflow-hidden lg:w-1/2 lg:min-h-0 lg:max-h-full">
            <div className={`px-4 py-3 border-b font-semibold text-sm shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'} ${textPrimary(theme)}`}>请求构造</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex gap-2">
                <LantuSelect
                  theme={theme}
                  className="!w-28 shrink-0"
                  triggerClassName={`font-bold ${METHOD_COLORS[method]}`}
                  value={method}
                  onChange={setMethod}
                  options={HTTP_METHOD_OPTIONS}
                />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={nativeInputClass(theme)}
                  placeholder="/catalog/resources … /reviews/page … /catalog/resolve /invoke（执行向须 Key）"
                />
              </div>
              {playgroundPathNeedsApiKey(url) && (
                <p className={`text-xs leading-snug rounded-lg px-3 py-2 ${isDark ? 'bg-amber-500/10 text-amber-100/90 border border-amber-500/20' : 'bg-amber-50 text-amber-950 border border-amber-200/80'}`}>
                  当前 URL 属于<strong>执行向</strong>：须有效的 <span className="font-mono">X-Api-Key</span>。若已从本机注入，请检查下方 Headers 中的对应行。
                </p>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${textSecondary(theme)}`}>Headers</span>
                  <button type="button" onClick={addHeader} className={`text-xs font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-900'}`}>+ 添加</button>
                </div>
                <div className="space-y-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} className={`${nativeInputClass(theme)} w-2/5`} placeholder="如 X-Api-Key" />
                      <input type="text" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} className={`${nativeInputClass(theme)} flex-1`} placeholder="见接入指南" />
                      <button type="button" onClick={() => removeHeader(i)} className={`p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
              {(method === 'POST' || method === 'PUT') && (
                <div>
                  <span className={`text-xs font-semibold ${textSecondary(theme)}`}>请求体 JSON</span>
                  <AutoHeightTextarea value={body} onChange={(e) => setBody(e.target.value)} minRows={6} maxRows={28} className={`mt-2 ${nativeInputClass(theme)} font-mono resize-none`} placeholder='{"key": "value"}' />
                </div>
              )}
            </div>
            <div className={`px-4 py-3 border-t shrink-0 space-y-2 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              {executeKeyHint && (
                <p className={`text-xs rounded-lg px-3 py-2 ${isDark ? 'bg-rose-500/15 text-rose-100 border border-rose-500/25' : 'bg-rose-50 text-rose-950 border border-rose-200'}`}>
                  {executeKeyHint}
                </p>
              )}
              <button type="button" onClick={sendRequest} disabled={loading} className={`w-full ${btnPrimary} !justify-center`}>
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                {loading ? '请求中...' : '发送请求'}
              </button>
            </div>
          </GlassPanel>

          {/* Response panel */}
          <GlassPanel theme={theme} padding="sm" className="flex min-h-[240px] flex-col overflow-hidden lg:w-1/2 lg:min-h-0 lg:max-h-full">
            <div className={`px-4 py-3 border-b font-semibold text-sm flex items-center justify-between shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={textPrimary(theme)}>响应</span>
              {response && (
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-lg font-bold ${getStatusCls(response.status, isDark)}`}>{response.status}</span>
                  <span className={`flex items-center gap-1 ${textMuted(theme)}`}><Clock size={12} /> {response.time}ms</span>
                </div>
              )}
            </div>
            <div className="flex min-h-[200px] flex-1 flex-col overflow-y-auto lg:min-h-0">
              {!response && !loading && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                  <Terminal size={32} className={`opacity-40 ${textMuted(theme)}`} aria-hidden />
                  <p className={`max-w-[18rem] text-xs leading-relaxed ${textMuted(theme)}`}>
                    左侧填写 URL 与 Headers 后点击「发送请求」，响应将显示在此区域
                  </p>
                </div>
              )}
              {loading && (
                <div className="h-full min-h-[200px] overflow-auto p-4">
                  <PageSkeleton type="detail" />
                </div>
              )}
              {response && (
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold ${textSecondary(theme)}`}>Body</span>
                      <CopyBtn text={response.body} isDark={isDark} />
                    </div>
                    <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 text-emerald-400' : 'bg-slate-900 text-emerald-300'}`}>{response.body}</pre>
                  </div>
                  {Object.keys(response.headers).length > 0 && (
                    <div>
                      <button type="button" onClick={() => setShowRespHeaders(!showRespHeaders)} className={`flex items-center gap-1 text-xs font-semibold ${textSecondary(theme)}`}>
                        Headers {showRespHeaders ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {showRespHeaders && (
                        <div className={`mt-2 rounded-xl p-3 space-y-1 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                          {Object.entries(response.headers).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-xs">
                              <span className={`font-mono font-medium ${textSecondary(theme)}`}>{k}:</span>
                              <span className={`font-mono ${textMuted(theme)}`}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
        </section>

        {/* History：纵向列表便于扫读，避免多列「标签云」 */}
        {history.length > 0 && (
          <section aria-labelledby="playground-history-heading" className="shrink-0">
            <h3 id="playground-history-heading" className={`mb-2 text-xs font-semibold uppercase tracking-wide ${textSecondary(theme)}`}>
              最近请求
            </h3>
            <div
              className={`overflow-hidden rounded-xl border ${
                isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-white'
              }`}
            >
              <ul className={`divide-y ${isDark ? 'divide-white/[0.06]' : 'divide-slate-100'}`}>
                {history.map((entry, i) => (
                  <li key={`${entry.method}-${entry.url}-${i}`}>
                    <button
                      type="button"
                      onClick={() => loadHistory(entry)}
                      className={`flex w-full min-h-11 items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors sm:gap-3 ${
                        isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-11 shrink-0 font-mono font-bold tabular-nums ${METHOD_COLORS[entry.method]}`}>{entry.method}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] sm:text-xs" title={entry.url}>
                        {entry.url}
                      </span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${getStatusCls(entry.status, isDark)}`}>
                        {entry.status}
                      </span>
                      <span className={`w-12 shrink-0 text-right tabular-nums ${textMuted(theme)}`}>{entry.time}ms</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <GatewayPlaygroundToolsSection theme={theme} />
      </div>
  );

  if (embedInHub) {
    return mainContent;
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Terminal}
      breadcrumbSegments={['开发者中心', 'API Playground']}
      description="调试 HTTP；鉴权与路径要求见接入指南「调试与网关页」。"
      toolbar={playgroundToolbar}
      contentScroll="document"
    >
      {mainContent}
    </MgmtPageShell>
  );
};

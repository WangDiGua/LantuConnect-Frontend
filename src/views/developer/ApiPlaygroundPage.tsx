import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Send, Copy, Check, Clock, ChevronDown, ChevronUp, Trash2, BookOpen } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { ApiException, type ApiResponse } from '../../types/api';
import { http } from '../../lib/http';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  btnPrimary, btnGhost, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { env } from '../../config/env';
import { buildPath } from '../../constants/consoleRoutes';
import {
  MAX_PLAYGROUND_HISTORY_ITEMS,
  MAX_STORED_API_KEY_LENGTH,
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

export interface ApiPlaygroundPageProps { theme: Theme; fontSize: FontSize; }

export const ApiPlaygroundPage: React.FC<ApiPlaygroundPageProps> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState(
    () => `${env.VITE_API_BASE_URL.replace(/\/$/, '')}/catalog/resources?page=1&pageSize=20&resourceType=agent`,
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

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (idx: number, field: 'key' | 'value', val: string) => { const n = [...headers]; n[idx] = { ...n[idx], [field]: val }; setHeaders(n); };
  const removeHeader = (idx: number) => setHeaders(headers.filter((_, i) => i !== idx));

  const sendRequest = useCallback(async () => {
    const resolvedPath = toRelativeApiPath(url);
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
    const isAbsolute = /^https?:\/\//i.test(resolvedPath);

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
        const res = await fetch(resolvedPath, init);
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
          url: resolvedPath,
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
        normalizePlaygroundHistory([{ method, url: resolvedPath, status, time, body, responseBody: text }, ...prev]).slice(
          0,
          MAX_PLAYGROUND_HISTORY_ITEMS,
        ),
      );
    } catch (e) {
      const time = Date.now() - started;
      const status = e instanceof ApiException ? e.status : 0;
      const msg = e instanceof Error ? e.message : String(e);
      const respBody = JSON.stringify({ error: msg }, null, 2);
      setResponse({ status, time, body: respBody, headers: {} });
      setHistory((prev) =>
        normalizePlaygroundHistory([{ method, url: resolvedPath, status, time, body, responseBody: respBody }, ...prev]).slice(
          0,
          MAX_PLAYGROUND_HISTORY_ITEMS,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [method, url, body, headers]);

  const loadHistory = (entry: HistoryEntry) => { setMethod(entry.method); setUrl(entry.url); setBody(entry.body); setResponse({ status: entry.status, time: entry.time, body: entry.responseBody, headers: {} }); };

  const playgroundToolbar = (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium ${
        isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
      onClick={() => navigate(buildPath('user', 'developer-docs'))}
      aria-label="打开接入指南"
    >
      <BookOpen size={14} aria-hidden />
      接入指南
    </button>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Terminal}
      breadcrumbSegments={['开发者中心', 'API Playground']}
      description="调试请求；GET /catalog/resources、/reviews/page、/catalog/resources/{type}/{id}/stats 须 X-User-Id 或 X-Api-Key 之一；POST /catalog/resolve、/invoke、/invoke-stream 须 X-Api-Key（与市场共用的本地密钥）。skill 为托管资源，resolve 后走 POST /invoke（resourceType=skill）；其余资源须满足已发布、Key 有效且 scope 覆盖等网关条件。"
      toolbar={playgroundToolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8 w-full flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Request panel */}
          <GlassPanel theme={theme} padding="sm" className="lg:w-1/2 flex flex-col overflow-hidden">
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
          <GlassPanel theme={theme} padding="sm" className="lg:w-1/2 flex flex-col overflow-hidden">
            <div className={`px-4 py-3 border-b font-semibold text-sm flex items-center justify-between shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={textPrimary(theme)}>响应</span>
              {response && (
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-lg font-bold ${getStatusCls(response.status, isDark)}`}>{response.status}</span>
                  <span className={`flex items-center gap-1 ${textMuted(theme)}`}><Clock size={12} /> {response.time}ms</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {!response && !loading && (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center">
                    <Terminal size={40} className={`mx-auto mb-3 ${textMuted(theme)}`} />
                    <p className={`text-sm ${textMuted(theme)}`}>点击「发送请求」查看响应结果</p>
                  </div>
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

        {/* History */}
        {history.length > 0 && (
          <BentoCard theme={theme} padding="sm" className="mt-4 shrink-0">
            <h3 className={`text-xs font-semibold mb-3 px-2 ${textSecondary(theme)}`}>最近请求（最近 5 条）</h3>
            <div className="flex flex-wrap gap-2 px-2">
              {history.map((entry, i) => (
                <button key={i} type="button" onClick={() => loadHistory(entry)} className={btnGhost(theme)}>
                  <span className={`font-bold ${METHOD_COLORS[entry.method]}`}>{entry.method}</span>
                  <span className="font-mono truncate max-w-[200px]">{entry.url}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${getStatusCls(entry.status, isDark)}`}>{entry.status}</span>
                  <span className={textMuted(theme)}>{entry.time}ms</span>
                </button>
              ))}
            </div>
          </BentoCard>
        )}

        <GatewayPlaygroundToolsSection theme={theme} />
      </div>
    </MgmtPageShell>
  );
};

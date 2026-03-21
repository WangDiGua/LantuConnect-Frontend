import React, { useState, useCallback } from 'react';
import { Terminal, Send, Copy, Check, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { GlassPanel } from '../../components/common/GlassPanel';
import { BentoCard } from '../../components/common/BentoCard';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import {
  pageBg, btnPrimary, btnGhost, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface HeaderPair { key: string; value: string; }
interface HistoryEntry { method: string; url: string; status: number; time: number; body: string; responseBody: string; }

const METHOD_COLORS: Record<string, string> = { GET: 'text-emerald-500', POST: 'text-blue-500', PUT: 'text-amber-500', DELETE: 'text-rose-500' };

function getStatusCls(status: number, isDark: boolean) {
  const k = String(status)[0];
  if (k === '2') return isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700';
  if (k === '4') return isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700';
  return isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-700';
}

const MOCK_AGENTS = JSON.stringify({ code: 0, message: 'success', data: { records: [{ id: 1, agentName: 'course-advisor', displayName: '选课助手', status: 'published', callCount: 1520 }], total: 3 } }, null, 2);
const MOCK_GENERIC = JSON.stringify({ code: 0, message: 'success', data: { result: 'ok', timestamp: new Date().toISOString() } }, null, 2);

function CopyBtn({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="复制">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export interface ApiPlaygroundPageProps { theme: Theme; fontSize: FontSize; }

export const ApiPlaygroundPage: React.FC<ApiPlaygroundPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('/api/v1/agents');
  const [headers, setHeaders] = useState<HeaderPair[]>([{ key: 'Authorization', value: 'Bearer <token>' }, { key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('{\n  \n}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; time: number; body: string; headers: Record<string, string> } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showRespHeaders, setShowRespHeaders] = useState(false);

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (idx: number, field: 'key' | 'value', val: string) => { const n = [...headers]; n[idx] = { ...n[idx], [field]: val }; setHeaders(n); };
  const removeHeader = (idx: number) => setHeaders(headers.filter((_, i) => i !== idx));

  const sendRequest = useCallback(() => {
    setLoading(true); setResponse(null);
    const delay = 200 + Math.random() * 300;
    setTimeout(() => {
      const isAgentGet = method === 'GET' && url.includes('/agents');
      const respBody = isAgentGet ? MOCK_AGENTS : MOCK_GENERIC;
      const time = Math.round(delay);
      const resp = { status: 200, time, body: respBody, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': `req_${Date.now().toString(36)}`, 'X-Response-Time': `${time}ms` } };
      setResponse(resp); setLoading(false);
      setHistory((prev) => [{ method, url, status: 200, time, body, responseBody: respBody }, ...prev].slice(0, 5));
    }, delay);
  }, [method, url, body]);

  const loadHistory = (entry: HistoryEntry) => { setMethod(entry.method); setUrl(entry.url); setBody(entry.body); setResponse({ status: entry.status, time: entry.time, body: entry.responseBody, headers: {} }); };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
            <Terminal size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>API Playground</h1>
            <p className={`text-xs ${textMuted(theme)}`}>在线测试 API 接口</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Request panel */}
          <GlassPanel theme={theme} padding="sm" className="lg:w-1/2 flex flex-col overflow-hidden">
            <div className={`px-4 py-3 border-b font-semibold text-sm shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'} ${textPrimary(theme)}`}>请求构造</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex gap-2">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${nativeSelectClass(theme)} !w-28 shrink-0 font-bold ${METHOD_COLORS[method]}`}>
                  <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option>
                </select>
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className={nativeInputClass(theme)} placeholder="/api/v1/..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${textSecondary(theme)}`}>Headers</span>
                  <button type="button" onClick={addHeader} className={`text-xs font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>+ 添加</button>
                </div>
                <div className="space-y-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} className={`${nativeInputClass(theme)} w-2/5`} placeholder="Key" />
                      <input type="text" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} className={`${nativeInputClass(theme)} flex-1`} placeholder="Value" />
                      <button type="button" onClick={() => removeHeader(i)} className={`p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
              {(method === 'POST' || method === 'PUT') && (
                <div>
                  <span className={`text-xs font-semibold ${textSecondary(theme)}`}>Body (JSON)</span>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className={`mt-2 ${nativeInputClass(theme)} font-mono resize-none`} placeholder='{"key": "value"}' />
                </div>
              )}
            </div>
            <div className={`px-4 py-3 border-t shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
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
                <div className="flex items-center justify-center h-full p-8">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
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
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${getStatusCls(entry.status, isDark)}`}>{entry.status}</span>
                  <span className={textMuted(theme)}>{entry.time}ms</span>
                </button>
              ))}
            </div>
          </BentoCard>
        )}
      </div>
    </div>
  );
};

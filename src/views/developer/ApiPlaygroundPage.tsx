import React, { useState, useCallback } from 'react';
import { Terminal, Send, Copy, Check, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';

interface HeaderPair {
  key: string;
  value: string;
}

interface HistoryEntry {
  method: string;
  url: string;
  status: number;
  time: number;
  body: string;
  responseBody: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-500',
  POST: 'text-blue-500',
  PUT: 'text-amber-500',
  DELETE: 'text-red-500',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  '2': { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-500/20', darkText: 'text-emerald-400' },
  '4': { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-500/20', darkText: 'text-amber-400' },
  '5': { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'bg-red-500/20', darkText: 'text-red-400' },
};

function getStatusColor(status: number, isDark: boolean) {
  const key = String(status)[0];
  const c = STATUS_COLORS[key] || STATUS_COLORS['5'];
  return isDark ? `${c.darkBg} ${c.darkText}` : `${c.bg} ${c.text}`;
}

const MOCK_AGENTS_RESPONSE = JSON.stringify({
  code: 0,
  message: 'success',
  data: {
    records: [
      { id: 1, agentName: 'course-advisor', displayName: '选课助手', status: 'published', callCount: 1520 },
      { id: 2, agentName: 'library-search', displayName: '图书馆检索', status: 'published', callCount: 980 },
      { id: 3, agentName: 'campus-guide', displayName: '校园导览', status: 'published', callCount: 756 },
    ],
    total: 3,
    pageNum: 1,
    pageSize: 20,
  },
}, null, 2);

const MOCK_GENERIC_RESPONSE = JSON.stringify({
  code: 0,
  message: 'success',
  data: { result: 'ok', timestamp: new Date().toISOString() },
}, null, 2);

function CopyBtn({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
      title="复制"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export interface ApiPlaygroundPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const ApiPlaygroundPage: React.FC<ApiPlaygroundPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('/api/v1/agents');
  const [headers, setHeaders] = useState<HeaderPair[]>([
    { key: 'Authorization', value: 'Bearer <token>' },
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [body, setBody] = useState('{\n  \n}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; time: number; body: string; headers: Record<string, string> } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showRespHeaders, setShowRespHeaders] = useState(false);

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...headers];
    next[idx] = { ...next[idx], [field]: val };
    setHeaders(next);
  };
  const removeHeader = (idx: number) => setHeaders(headers.filter((_, i) => i !== idx));

  const sendRequest = useCallback(() => {
    setLoading(true);
    setResponse(null);
    const delay = 200 + Math.random() * 300;
    setTimeout(() => {
      const isAgentGet = method === 'GET' && url.includes('/agents');
      const respBody = isAgentGet ? MOCK_AGENTS_RESPONSE : MOCK_GENERIC_RESPONSE;
      const status = 200;
      const time = Math.round(delay);
      const resp = {
        status,
        time,
        body: respBody,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Request-Id': `req_${Date.now().toString(36)}`,
          'X-Response-Time': `${time}ms`,
        },
      };
      setResponse(resp);
      setLoading(false);
      setHistory((prev) => {
        const entry: HistoryEntry = { method, url, status, time, body, responseBody: respBody };
        return [entry, ...prev].slice(0, 5);
      });
    }, delay);
  }, [method, url, body]);

  const loadHistory = (entry: HistoryEntry) => {
    setMethod(entry.method);
    setUrl(entry.url);
    setBody(entry.body);
    setResponse({ status: entry.status, time: entry.time, body: entry.responseBody, headers: {} });
  };

  const inputClass = `w-full px-3 py-2 rounded-xl text-sm transition-colors ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400'
  } border outline-none`;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
            <Terminal size={22} className="text-emerald-500" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>API Playground</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              在线测试 API 接口 · 发送请求并查看响应
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Left: Request Builder */}
          <div className={`lg:w-1/2 flex flex-col rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className={`px-4 py-3 border-b font-semibold text-sm ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'}`}>
              请求构造
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* Method + URL */}
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border outline-none shrink-0 w-28 ${
                    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  } ${METHOD_COLORS[method]}`}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={inputClass}
                  placeholder="/api/v1/..."
                />
              </div>

              {/* Headers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Headers</span>
                  <button type="button" onClick={addHeader} className="text-xs text-blue-500 hover:text-blue-600">+ 添加</button>
                </div>
                <div className="space-y-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => updateHeader(i, 'key', e.target.value)}
                        className={`${inputClass} w-2/5`}
                        placeholder="Key"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => updateHeader(i, 'value', e.target.value)}
                        className={`${inputClass} flex-1`}
                        placeholder="Value"
                      />
                      <button
                        type="button"
                        onClick={() => removeHeader(i)}
                        className={`p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body (for POST/PUT) */}
              {(method === 'POST' || method === 'PUT') && (
                <div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Body (JSON)</span>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    className={`mt-2 ${inputClass} font-mono resize-none`}
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}
            </div>

            {/* Send Button */}
            <div className={`px-4 py-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={sendRequest}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {loading ? '请求中...' : '发送请求'}
              </button>
            </div>
          </div>

          {/* Right: Response Viewer */}
          <div className={`lg:w-1/2 flex flex-col rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className={`px-4 py-3 border-b font-semibold text-sm flex items-center justify-between ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'}`}>
              <span>响应</span>
              {response && (
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-lg font-bold ${getStatusColor(response.status, isDark)}`}>
                    {response.status}
                  </span>
                  <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Clock size={12} /> {response.time}ms
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {!response && !loading && (
                <div className="flex-1 flex items-center justify-center h-full p-8">
                  <div className="text-center">
                    <Terminal size={40} className={`mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      点击「发送请求」查看响应结果
                    </p>
                  </div>
                </div>
              )}
              {loading && (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}
              {response && (
                <div className="p-4 space-y-4">
                  {/* Response Body */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Body</span>
                      <CopyBtn text={response.body} isDark={isDark} />
                    </div>
                    <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 text-emerald-400' : 'bg-slate-900 text-emerald-300'}`}>
                      {response.body}
                    </pre>
                  </div>

                  {/* Response Headers (collapsible) */}
                  {Object.keys(response.headers).length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowRespHeaders(!showRespHeaders)}
                        className={`flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                      >
                        Headers
                        {showRespHeaders ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {showRespHeaders && (
                        <div className={`mt-2 rounded-xl p-3 space-y-1 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                          {Object.entries(response.headers).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-xs">
                              <span className={`font-mono font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{k}:</span>
                              <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className={`mt-4 rounded-2xl border p-4 shrink-0 ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <h3 className={`text-xs font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              最近请求（最近 5 条）
            </h3>
            <div className="flex flex-wrap gap-2">
              {history.map((entry, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => loadHistory(entry)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className={`font-bold ${METHOD_COLORS[entry.method]}`}>{entry.method}</span>
                  <span className="font-mono truncate max-w-[200px]">{entry.url}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${getStatusColor(entry.status, isDark)}`}>
                    {entry.status}
                  </span>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{entry.time}ms</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

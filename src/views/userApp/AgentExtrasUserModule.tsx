import React, { useState } from 'react';
import { GitBranch, Rocket, Send, Copy, Power } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import { useAgentVersions, useSendDebugMessage } from '../../hooks/queries/useAgent';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ApiException } from '../../types/api';

interface AgentExtrasUserModuleProps {
  activeAgentSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  /** 从 Agent 列表进入详情后用于版本与调试接口 */
  agentId?: string | null;
}

interface FlowDraft {
  id: string;
  name: string;
  nodes: string[];
  updatedAt: string;
}

interface PublishedApp {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  qps: number;
}

export const AgentExtrasUserModule: React.FC<AgentExtrasUserModuleProps> = ({
  activeAgentSubItem,
  theme,
  fontSize,
  showMessage,
  agentId,
}) => {
  const [flows, setFlows] = useState<FlowDraft[]>([
    { id: 'f1', name: '招生咨询主流程', nodes: ['开场', '意图识别', '知识检索', '回复'], updatedAt: '2026-03-18' },
  ]);
  const [selectedFlowId, setSelectedFlowId] = useState('f1');
  const [newNode, setNewNode] = useState('');
  const [newVerNote, setNewVerNote] = useState('');
  const [apps, setApps] = useState<PublishedApp[]>([
    { id: 'a1', name: '校园助手 · Web', url: 'https://app.example.com/campus', enabled: true, qps: 42 },
  ]);
  const [debugInput, setDebugInput] = useState('');
  const [debugMsgs, setDebugMsgs] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const versionsQ = useAgentVersions(agentId ?? '');
  const debugM = useSendDebugMessage();

  const selectedFlow = flows.find((f) => f.id === selectedFlowId) ?? flows[0];

  if (activeAgentSubItem === '对话流编排') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="对话流编排" subtitle="选择流程、追加节点并保存（Mock）">
        <div className="grid lg:grid-cols-3 gap-4">
          <div className={`${cardClass(theme)} p-4 lg:col-span-1`}>
            <div className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>流程列表</div>
            <button
              type="button"
              className={`${btnPrimaryClass} w-full mb-3`}
              onClick={() => {
                const id = `f${Date.now()}`;
                setFlows((prev) => [
                  ...prev,
                  { id, name: `新流程 ${prev.length + 1}`, nodes: ['开始'], updatedAt: new Date().toISOString().slice(0, 10) },
                ]);
                setSelectedFlowId(id);
                showMessage('已创建新流程', 'success');
              }}
            >
              新建流程
            </button>
            <div className="space-y-1">
              {flows.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFlowId(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    f.id === selectedFlowId
                      ? theme === 'light'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-white/10 text-white'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div className={`${cardClass(theme)} p-4 lg:col-span-2`}>
            <input
              className={`${inputClass(theme)} mb-4`}
              value={selectedFlow?.name ?? ''}
              onChange={(e) =>
                setFlows((prev) => prev.map((f) => (f.id === selectedFlowId ? { ...f, name: e.target.value } : f)))
              }
            />
            <div className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>节点链</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedFlow?.nodes.map((n, i) => (
                <span
                  key={`${n}-${i}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm ${
                    theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-white/10 text-slate-200'
                  }`}
                >
                  <GitBranch size={14} />
                  {n}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className={`${inputClass(theme)} flex-1 min-w-[200px]`}
                placeholder="新节点名称，如：安全审核"
                value={newNode}
                onChange={(e) => setNewNode(e.target.value)}
              />
              <button
                type="button"
                className={btnPrimaryClass}
                onClick={() => {
                  if (!newNode.trim() || !selectedFlow) return;
                  setFlows((prev) =>
                    prev.map((f) =>
                      f.id === selectedFlowId ? { ...f, nodes: [...f.nodes, newNode.trim()], updatedAt: new Date().toISOString().slice(0, 10) } : f
                    )
                  );
                  setNewNode('');
                  showMessage('节点已追加', 'success');
                }}
              >
                追加节点
              </button>
              <button
                type="button"
                className={btnGhostClass(theme)}
                onClick={() => {
                  setFlows((prev) =>
                    prev.map((f) =>
                      f.id === selectedFlowId && f.nodes.length > 1
                        ? { ...f, nodes: f.nodes.slice(0, -1), updatedAt: new Date().toISOString().slice(0, 10) }
                        : f
                    )
                  );
                  showMessage('已删除末尾节点', 'info');
                }}
              >
                撤销末节点
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" className={btnPrimaryClass} onClick={() => showMessage('流程草稿已保存（Mock）', 'success')}>
                保存草稿
              </button>
            </div>
          </div>
        </div>
      </UserAppShell>
    );
  }

  if (activeAgentSubItem === '版本与发布') {
    if (!agentId) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="版本与发布" subtitle="创建版本、发布到生产">
          <EmptyState
            title="未选择 Agent"
            description="请先在「我的 Agent」列表中打开某个 Agent 详情，再查看版本列表。"
          />
        </UserAppShell>
      );
    }

    if (versionsQ.isLoading) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="版本与发布" subtitle="创建版本、发布到生产">
          <PageSkeleton type="table" rows={4} />
        </UserAppShell>
      );
    }

    if (versionsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="版本与发布" subtitle="创建版本、发布到生产">
          <PageError error={versionsQ.error as Error} onRetry={() => versionsQ.refetch()} />
        </UserAppShell>
      );
    }

    const versions = versionsQ.data ?? [];

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="版本与发布" subtitle="服务端返回的版本列表">
        <div className={`${cardClass(theme)} p-4 mb-4`}>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-slate-500 block mb-1">版本说明（本地备忘）</label>
              <input className={inputClass(theme)} value={newVerNote} onChange={(e) => setNewVerNote(e.target.value)} placeholder="例如：优化欢迎语" />
            </div>
            <button
              type="button"
              className={btnGhostClass(theme)}
              onClick={() => {
                if (!newVerNote.trim()) return;
                setNewVerNote('');
                showMessage('草稿说明已记录；创建版本需后端接口支持', 'info');
              }}
            >
              保存备忘
            </button>
          </div>
        </div>
        <div className={cardClass(theme)}>
          {versions.length === 0 ? (
            <EmptyState title="暂无版本" description="发布或保存版本后，将在此列出。" />
          ) : (
            versions.map((v) => {
              const statusPublished = v.current;
              return (
                <div
                  key={`${v.version}-${v.publishedAt}`}
                  className={`p-4 flex flex-wrap items-center justify-between gap-3 border-b last:border-0 ${
                    theme === 'light' ? 'border-slate-100' : 'border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Rocket size={16} className="text-amber-500" />
                      <span className={`font-mono font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{v.version}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          statusPublished ? 'bg-green-500/20 text-green-600' : 'bg-slate-500/20 text-slate-500'
                        }`}
                      >
                        {statusPublished ? '当前版本' : '历史版本'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{v.note}</div>
                    <div className="text-xs text-slate-400">{v.publishedAt}</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('回滚需调用发布接口', 'info')}>
                      回滚选用
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </UserAppShell>
    );
  }

  if (activeAgentSubItem === '我的应用') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="已发布应用" subtitle="启用状态与访问地址">
        <button
          type="button"
          className={`${btnPrimaryClass} mb-4`}
          onClick={() => {
            const id = `a${Date.now()}`;
            setApps((prev) => [
              ...prev,
              {
                id,
                name: `新应用 ${prev.length + 1}`,
                url: `https://app.example.com/p/${id}`,
                enabled: true,
                qps: 0,
              },
            ]);
            showMessage('已创建发布端点（Mock）', 'success');
          }}
        >
          新建发布
        </button>
        <div className="space-y-3">
          {apps.map((app) => (
            <div key={app.id} className={`${cardClass(theme)} p-4 flex flex-wrap justify-between gap-4`}>
              <div>
                <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{app.name}</div>
                <div className="text-sm text-slate-500 font-mono mt-1 break-all">{app.url}</div>
                <div className="text-xs text-slate-400 mt-2">近 1h QPS: {app.qps}</div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  className={btnGhostClass(theme)}
                  onClick={() => {
                    void navigator.clipboard?.writeText(app.url);
                    showMessage('链接已复制', 'success');
                  }}
                >
                  <Copy size={16} className="inline mr-1" />
                  复制
                </button>
                <button
                  type="button"
                  className={btnGhostClass(theme)}
                  onClick={() => {
                    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, enabled: !a.enabled } : a)));
                    showMessage(app.enabled ? '已停用' : '已启用', 'success');
                  }}
                >
                  <Power size={16} className="inline mr-1" />
                  {app.enabled ? '停用' : '启用'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeAgentSubItem === '调试会话') {
    const pushAssistant = (content: string) => {
      setDebugMsgs((prev) => [...prev, { role: 'assistant', content }]);
    };

    const send = (userText: string) => {
      if (!agentId) {
        showMessage('请先从 Agent 列表进入详情以绑定 Agent', 'error');
        return;
      }
      setDebugMsgs((prev) => [...prev, { role: 'user', content: userText }]);
      setDebugInput('');
      debugM.mutate(
        { agentId, message: userText },
        {
          onSuccess: (msg) => pushAssistant(msg.reply),
          onError: (e) => {
            const m = e instanceof ApiException ? e.message : '发送失败';
            showMessage(m, 'error');
            pushAssistant(`（错误）${m}`);
          },
        }
      );
    };

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="调试会话" subtitle="与当前 Agent 联调">
        {!agentId ? (
          <EmptyState title="未选择 Agent" description="请从「我的 Agent」打开详情后再使用调试会话。" />
        ) : (
          <div className={`${cardClass(theme)} p-4 min-h-[420px] flex flex-col`}>
            {debugMsgs.length === 0 ? (
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>输入内容开始调试对话。</p>
            ) : null}
            <div className="flex-1 space-y-3 overflow-y-auto mb-4 max-h-[320px]">
              {debugMsgs.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? theme === 'light'
                        ? 'ml-auto bg-blue-600 text-white'
                        : 'ml-auto bg-blue-500 text-white'
                      : theme === 'light'
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-white/10 text-slate-200'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {debugM.isPending ? (
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>思考中…</div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <input
                className={`${inputClass(theme)} flex-1`}
                placeholder="输入测试话术…"
                value={debugInput}
                onChange={(e) => setDebugInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const userText = debugInput.trim();
                    if (!userText || debugM.isPending) return;
                    send(userText);
                    showMessage('已发送', 'info');
                  }
                }}
              />
              <button
                type="button"
                className={btnPrimaryClass}
                disabled={debugM.isPending}
                onClick={() => {
                  const userText = debugInput.trim();
                  if (!userText) return;
                  send(userText);
                  showMessage('已发送', 'info');
                }}
              >
                <Send size={18} />
              </button>
            </div>
            <button
              type="button"
              className={`${btnGhostClass(theme)} mt-3 self-start`}
              onClick={() => {
                setDebugMsgs([]);
                showMessage('已清空', 'info');
              }}
            >
              清空会话
            </button>
          </div>
        )}
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeAgentSubItem} subtitle="请选择左侧子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

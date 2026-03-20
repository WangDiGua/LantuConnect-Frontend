import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, RefreshCw, Send, Check, Trash2 } from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  useApiKey,
  useRegenerateApiKey,
  useEmbed,
  useWebhookList,
  useCreateWebhook,
  useDeleteWebhook,
  useShareList,
  useCreateShare,
  useDeleteShare,
  useEventSubscriptions,
  useUpdateEvents,
} from '../../hooks/queries/usePublish';
import { createWebhookSchema, createShareSchema, type CreateWebhookFormValues, type CreateShareFormValues } from '../../schemas/publish.schema';
import type { EventSubscription } from '../../types/dto/publish';

interface PublishConnectUserModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublishConnectUserModule: React.FC<PublishConnectUserModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  themeColor,
  showMessage,
}) => {
  const apiKeyQuery = useApiKey();
  const regenerateKey = useRegenerateApiKey();
  const embedQuery = useEmbed();
  const webhooksQuery = useWebhookList();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const sharesQuery = useShareList();
  const createShare = useCreateShare();
  const deleteShare = useDeleteShare();
  const eventsQuery = useEventSubscriptions();
  const updateEvents = useUpdateEvents();

  const [channelStep, setChannelStep] = useState(0);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
  const [shareToDelete, setShareToDelete] = useState<string | null>(null);

  const webhookForm = useForm<CreateWebhookFormValues>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: { url: '', events: 'agent.completed' },
  });

  const shareForm = useForm<CreateShareFormValues>({
    resolver: zodResolver(createShareSchema),
    defaultValues: { name: '' },
  });

  const eventsForm = useForm<EventSubscription>({
    defaultValues: { completed: true, failed: false, started: true },
  });
  const resetEventsForm = eventsForm.reset;

  useEffect(() => {
    if (eventsQuery.data?.length) {
      resetEventsForm(eventsQuery.data[0]);
    }
  }, [eventsQuery.data, resetEventsForm]);

  const copy = (t: string) => {
    void navigator.clipboard.writeText(t);
    showMessage('已复制到剪贴板', 'success');
  };

  const testApi = () => {
    showMessage('模拟请求成功：200 OK，latency 128ms', 'success');
  };

  const testWebhook = (id: string) => {
    showMessage(`已向 Webhook ${id} 发送测试事件（Mock）`, 'info');
  };

  const onCreateWebhook = (values: CreateWebhookFormValues) => {
    const events = values.events
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    createWebhook.mutate(
      { url: values.url.trim(), events: events.length ? events : ['agent.completed'] },
      {
        onSuccess: () => {
          webhookForm.reset({ url: '', events: 'agent.completed' });
          showMessage('Webhook 已添加', 'success');
        },
        onError: () => showMessage('添加失败，请重试', 'error'),
      },
    );
  };

  const onCreateShare = (values: CreateShareFormValues) => {
    createShare.mutate(
      { name: values.name.trim() },
      {
        onSuccess: () => {
          shareForm.reset({ name: '' });
          showMessage('分享链接已生成', 'success');
        },
        onError: () => showMessage('生成失败，请重试', 'error'),
      },
    );
  };

  const onSaveEvents = eventsForm.handleSubmit((data) => {
    updateEvents.mutate([data], {
      onSuccess: () => showMessage('订阅偏好已保存', 'success'),
      onError: () => showMessage('保存失败，请重试', 'error'),
    });
  });

  if (activeSubItem === 'API 接入') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="API 接入" subtitle="密钥管理与连通性自检">
        {apiKeyQuery.isPending && (
          <div className={cardClass(theme)}>
            <PageSkeleton type="form" />
          </div>
        )}
        {apiKeyQuery.isError && (
          <div className={cardClass(theme)}>
            <PageError error={apiKeyQuery.error as Error} onRetry={() => void apiKeyQuery.refetch()} />
          </div>
        )}
        {apiKeyQuery.isSuccess && (
          <div className={`${cardClass(theme)} p-5 space-y-4`}>
            <div>
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>API Base</div>
              <code className={`block p-3 rounded-xl text-sm ${theme === 'light' ? 'bg-slate-100' : 'bg-black/40'}`}>
                https://api.lantu.school.edu/v1
              </code>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>API Key</span>
                <button
                  type="button"
                  className={btnGhostClass(theme)}
                  disabled={regenerateKey.isPending}
                  onClick={() =>
                    regenerateKey.mutate(undefined, {
                      onSuccess: () => showMessage('已轮换 API Key', 'success'),
                      onError: () => showMessage('轮换失败，请重试', 'error'),
                    })
                  }
                >
                  <RefreshCw size={14} className={`inline mr-1 ${regenerateKey.isPending ? 'animate-spin' : ''}`} /> 轮换
                </button>
              </div>
              <div className="flex gap-2">
                <input readOnly className={inputClass(theme)} value={apiKeyQuery.data.key} />
                <button type="button" className={btnGhostClass(theme)} onClick={() => copy(apiKeyQuery.data.key)}>
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <button type="button" className={btnPrimaryClass} onClick={testApi}>
              测试连通性
            </button>
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '嵌入网页') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="嵌入网页" subtitle="复制脚本到校内站点 HTML">
        {embedQuery.isPending && (
          <div className={cardClass(theme)}>
            <PageSkeleton type="form" />
          </div>
        )}
        {embedQuery.isError && (
          <div className={cardClass(theme)}>
            <PageError error={embedQuery.error as Error} onRetry={() => void embedQuery.refetch()} />
          </div>
        )}
        {embedQuery.isSuccess && (
          <div className={`${cardClass(theme)} p-5 space-y-4`}>
            <div>
              <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>当前 Agent</div>
              <div className={`mt-1 px-3 py-2 rounded-xl text-sm ${theme === 'light' ? 'bg-slate-100' : 'bg-black/40'}`}>
                {embedQuery.data.agentName}
              </div>
            </div>
            <div>
              <div className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>嵌入代码</div>
              <pre
                className={`p-3 rounded-xl text-xs overflow-auto ${theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-black/40 text-slate-300'}`}
              >
                {embedQuery.data.code}
              </pre>
            </div>
            <button type="button" className={btnPrimaryClass} onClick={() => copy(embedQuery.data.code)}>
              复制代码
            </button>
            <div className={`rounded-xl border p-4 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>
              <div className="text-xs text-slate-500 mb-2">预览（示意）</div>
              <div className={`h-24 rounded-lg flex items-center justify-center text-sm ${THEME_COLOR_CLASSES[themeColor].bg} text-white`}>
                {embedQuery.data.agentName} 对话窗
              </div>
            </div>
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '分享链接') {
    const shares = sharesQuery.data ?? [];
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="分享链接" subtitle="生成可对外分发的体验链接">
        <form className={`${cardClass(theme)} p-5 mb-4 flex flex-wrap gap-2 items-end`} onSubmit={shareForm.handleSubmit(onCreateShare)}>
          <div className="flex-1 min-w-[200px]">
            <input
              className={inputClass(theme)}
              placeholder="链接名称"
              {...shareForm.register('name')}
            />
            {shareForm.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">{shareForm.formState.errors.name.message}</p>
            )}
          </div>
          <button type="submit" className={btnPrimaryClass} disabled={createShare.isPending}>
            {createShare.isPending ? '生成中…' : '生成'}
          </button>
        </form>
        <div className={cardClass(theme)}>
          {sharesQuery.isPending && <PageSkeleton type="table" rows={4} />}
          {sharesQuery.isError && (
            <PageError error={sharesQuery.error as Error} onRetry={() => void sharesQuery.refetch()} />
          )}
          {sharesQuery.isSuccess && shares.length === 0 && (
            <EmptyState title="暂无分享链接" description="填写名称后点击生成" />
          )}
          {sharesQuery.isSuccess &&
            shares.map((s) => (
              <div
                key={s.id}
                className={`p-4 flex flex-wrap gap-3 items-center border-b last:border-0 ${
                  theme === 'light' ? 'border-slate-100' : 'border-white/10'
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className={theme === 'dark' ? 'text-white font-medium' : 'text-slate-900 font-medium'}>{s.name}</div>
                  <div className="text-xs font-mono text-slate-500">{s.url}</div>
                  <div className="text-xs text-slate-500">访问 {s.visits}</div>
                </div>
                <button type="button" className={btnGhostClass(theme)} onClick={() => copy(s.url)}>
                  复制
                </button>
                <button
                  type="button"
                  className={btnGhostClass(theme)}
                  onClick={() => setShareToDelete(s.id)}
                  aria-label="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
        </div>
        <ConfirmDialog
          open={shareToDelete !== null}
          title="删除分享链接"
          message="确定删除该分享链接？此操作不可撤销。"
          confirmText="删除"
          variant="danger"
          loading={deleteShare.isPending}
          onCancel={() => setShareToDelete(null)}
          onConfirm={() => {
            if (!shareToDelete) return;
            deleteShare.mutate(shareToDelete, {
              onSuccess: () => {
                setShareToDelete(null);
                showMessage('已删除', 'success');
              },
              onError: () => showMessage('删除失败', 'error'),
            });
          }}
        />
      </UserAppShell>
    );
  }

  if (activeSubItem === '移动端 SDK') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="移动端 SDK" subtitle="应用标识与集成说明（Mock）">
        <div className={`${cardClass(theme)} p-5 space-y-3`}>
          <div>
            <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>App ID</div>
            <div className="flex gap-2 mt-1">
              <input readOnly className={inputClass(theme)} value="lantu-mobile-campus-001" />
              <button type="button" className={btnGhostClass(theme)} onClick={() => copy('lantu-mobile-campus-001')}>
                <Copy size={16} />
              </button>
            </div>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            iOS / Android SDK 文档见校内开发者门户；此处为演示数据。
          </p>
          <button type="button" className={btnPrimaryClass} onClick={() => showMessage('已发送 SDK 文档到邮箱（Mock）', 'info')}>
            发送文档到邮箱
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'Webhook') {
    const webhooks = webhooksQuery.data ?? [];
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="Webhook" subtitle="接收 Agent 完成等事件">
        <form className={`${cardClass(theme)} p-5 mb-4 space-y-3`} onSubmit={webhookForm.handleSubmit(onCreateWebhook)}>
          <div>
            <input className={inputClass(theme)} placeholder="https://" {...webhookForm.register('url')} />
            {webhookForm.formState.errors.url && (
              <p className="text-xs text-red-500 mt-1">{webhookForm.formState.errors.url.message}</p>
            )}
          </div>
          <div>
            <input className={inputClass(theme)} placeholder="事件，逗号分隔" {...webhookForm.register('events')} />
            {webhookForm.formState.errors.events && (
              <p className="text-xs text-red-500 mt-1">{webhookForm.formState.errors.events.message}</p>
            )}
          </div>
          <button type="submit" className={btnPrimaryClass} disabled={createWebhook.isPending}>
            {createWebhook.isPending ? '添加中…' : '添加 Webhook'}
          </button>
        </form>
        <div className={cardClass(theme)}>
          {webhooksQuery.isPending && <PageSkeleton type="table" rows={4} />}
          {webhooksQuery.isError && (
            <PageError error={webhooksQuery.error as Error} onRetry={() => void webhooksQuery.refetch()} />
          )}
          {webhooksQuery.isSuccess && webhooks.length === 0 && (
            <EmptyState title="暂无 Webhook" description="添加 URL 后即可接收事件" />
          )}
          {webhooksQuery.isSuccess &&
            webhooks.map((w) => (
              <div
                key={w.id}
                className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
              >
                <div className="font-mono text-xs break-all mb-2">{w.url}</div>
                <div className="text-xs text-slate-500 mb-2">Secret: {w.secret}</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnGhostClass(theme)} onClick={() => testWebhook(w.id)}>
                    <Send size={14} className="inline mr-1" /> 测试投递
                  </button>
                  <button type="button" className={btnGhostClass(theme)} onClick={() => setWebhookToDelete(w.id)}>
                    <Trash2 size={14} className="inline mr-1" /> 删除
                  </button>
                </div>
              </div>
            ))}
        </div>
        <ConfirmDialog
          open={webhookToDelete !== null}
          title="删除 Webhook"
          message="确定删除该 Webhook？此操作不可撤销。"
          confirmText="删除"
          variant="danger"
          loading={deleteWebhook.isPending}
          onCancel={() => setWebhookToDelete(null)}
          onConfirm={() => {
            if (!webhookToDelete) return;
            deleteWebhook.mutate(webhookToDelete, {
              onSuccess: () => {
                setWebhookToDelete(null);
                showMessage('已删除', 'success');
              },
              onError: () => showMessage('删除失败', 'error'),
            });
          }}
        />
      </UserAppShell>
    );
  }

  if (activeSubItem === '消息渠道' || activeSubItem.includes('企微')) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="消息渠道" subtitle="企业微信 / 钉钉 / 飞书 接入向导">
        <div className={`${cardClass(theme)} p-5`}>
          <div className="flex gap-2 mb-6">
            {['选平台', '填凭证', '完成'].map((label, i) => (
              <div
                key={label}
                className={`flex-1 text-center py-2 rounded-xl text-sm font-medium ${
                  channelStep >= i
                    ? `${THEME_COLOR_CLASSES[themeColor].bg} text-white`
                    : theme === 'light'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-white/10 text-slate-500'
                }`}
              >
                {i + 1}. {label}
              </div>
            ))}
          </div>
          {channelStep === 0 && (
            <div className="space-y-2">
              {['企业微信', '钉钉', '飞书'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-full p-3 rounded-xl text-left ${btnGhostClass(theme)}`}
                  onClick={() => setChannelStep(1)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {channelStep === 1 && (
            <div className="space-y-3">
              <input className={inputClass(theme)} placeholder="CorpId / AppKey" />
              <input className={inputClass(theme)} placeholder="Secret" type="password" />
              <button type="button" className={btnPrimaryClass} onClick={() => setChannelStep(2)}>
                验证并保存
              </button>
            </div>
          )}
          {channelStep === 2 && (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <Check className="mx-auto mb-2" size={40} />
              渠道已连接（演示）
              <div className="mt-4">
                <button type="button" className={btnGhostClass(theme)} onClick={() => setChannelStep(0)}>
                  再绑一个
                </button>
              </div>
            </div>
          )}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '事件订阅') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="事件订阅" subtitle="选择推送到 Webhook 的事件类型">
        {eventsQuery.isPending && (
          <div className={cardClass(theme)}>
            <PageSkeleton type="form" />
          </div>
        )}
        {eventsQuery.isError && (
          <div className={cardClass(theme)}>
            <PageError error={eventsQuery.error as Error} onRetry={() => void eventsQuery.refetch()} />
          </div>
        )}
        {eventsQuery.isSuccess && (
          <form className={`${cardClass(theme)} p-5 space-y-4`} onSubmit={onSaveEvents}>
            {(
              [
                ['completed', '任务完成'],
                ['failed', '执行失败'],
                ['started', '任务开始'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={eventsForm.watch(k)}
                  onChange={(e) => eventsForm.setValue(k, e.target.checked)}
                />
                <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{label}</span>
              </label>
            ))}
            <button type="submit" className={btnPrimaryClass} disabled={updateEvents.isPending}>
              {updateEvents.isPending ? '保存中…' : '保存'}
            </button>
          </form>
        )}
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择左侧子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

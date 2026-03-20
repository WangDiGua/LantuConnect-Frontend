import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from '../userApp/UserAppShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { createModelConfigSchema, type CreateModelConfigFormValues } from '../../schemas/system-config.schema';
import type { CreateModelEndpointDTO } from '../../types/dto/admin';
import {
  useAdminModelEndpoints,
  useCreateModelEndpoint,
  useUpdateModelEndpoint,
  useDeleteModelEndpoint,
} from '../../hooks/queries/useAdmin';

interface Props {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminModelServiceModule: React.FC<Props> = ({ activeSubItem, theme, fontSize, showMessage }) => {
  const [routes, setRoutes] = useState<{ id: string; pattern: string; target: string; weight: number }[]>([
    { id: 'rt1', pattern: 'gpt-*', target: 'cluster-a', weight: 70 },
    { id: 'rt2', pattern: 'gpt-*', target: 'cluster-b', weight: 30 },
  ]);
  const [gpu, setGpu] = useState([
    { id: 'gpu1', node: 'gpu-01', used: 6, total: 8, model: '推理 A' },
    { id: 'gpu2', node: 'gpu-02', used: 3, total: 8, model: '精调 B' },
  ]);
  const [testPrompt, setTestPrompt] = useState('你好');
  const [testOut, setTestOut] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [endpointSearch, setEndpointSearch] = useState('');

  const endpointsQ = useAdminModelEndpoints();
  const createMut = useCreateModelEndpoint();
  const updateMut = useUpdateModelEndpoint();
  const deleteMut = useDeleteModelEndpoint();

  const form = useForm<CreateModelConfigFormValues>({
    resolver: zodResolver(createModelConfigSchema),
    defaultValues: { name: '', provider: '', modelId: '', endpoint: '', apiKey: '' },
  });

  const endpointList = endpointsQ.data ?? [];
  const tableWrap = `overflow-x-auto rounded-2xl border ${theme === 'light' ? 'border-slate-200/80' : 'border-white/10'}`;

  if (activeSubItem === 'model-integration') {
    if (endpointsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="模型接入" subtitle="登记上游推理地址">
          <PageSkeleton type="table" rows={6} />
        </UserAppShell>
      );
    }
    if (endpointsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="模型接入" subtitle="登记上游推理地址">
          <PageError error={endpointsQ.error instanceof Error ? endpointsQ.error : null} onRetry={() => endpointsQ.refetch()} />
        </UserAppShell>
      );
    }

    const deleteTarget = deleteId ? endpointList.find((e) => e.id === deleteId) : undefined;

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="模型接入" subtitle="登记上游推理地址">
        <ConfirmDialog
          open={!!deleteId}
          title="删除接入"
          message={deleteTarget ? `确定删除「${deleteTarget.name}」？此操作不可撤销。` : ''}
          confirmText="删除"
          variant="danger"
          loading={deleteMut.isPending}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            if (!deleteId) return;
            deleteMut.mutate(deleteId, {
              onSuccess: () => {
                showMessage('已删除', 'success');
                setDeleteId(null);
              },
              onError: (err) => showMessage(err instanceof Error ? err.message : '删除失败', 'error'),
            });
          }}
        />
        <form
          className={`${cardClass(theme)} p-4 max-w-xl space-y-3 mb-6`}
          onSubmit={form.handleSubmit((values) => {
            const payload: CreateModelEndpointDTO = {
              name: `${values.name} (${values.modelId})`,
              provider: values.provider,
              endpoint: values.endpoint,
              apiKey: values.apiKey || undefined,
            };
            createMut.mutate(payload, {
              onSuccess: () => {
                form.reset();
                showMessage('接入已登记，健康检查排队中', 'success');
              },
              onError: (err) => showMessage(err instanceof Error ? err.message : '提交失败', 'error'),
            });
          })}
        >
          <div>
            <input className={inputClass(theme)} placeholder="显示名称" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <input className={inputClass(theme)} placeholder="供应商" {...form.register('provider')} />
            {form.formState.errors.provider && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.provider.message}</p>
            )}
          </div>
          <div>
            <input className={inputClass(theme)} placeholder="模型 ID" {...form.register('modelId')} />
            {form.formState.errors.modelId && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.modelId.message}</p>
            )}
          </div>
          <div>
            <input className={inputClass(theme)} placeholder="Base URL" {...form.register('endpoint')} />
            {form.formState.errors.endpoint && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.endpoint.message}</p>
            )}
          </div>
          <div>
            <input className={inputClass(theme)} placeholder="API Key（可选）" type="password" autoComplete="off" {...form.register('apiKey')} />
            {form.formState.errors.apiKey && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.apiKey.message}</p>
            )}
          </div>
          <button type="submit" className={btnPrimaryClass} disabled={createMut.isPending}>
            {createMut.isPending ? '提交中…' : '提交接入'}
          </button>
        </form>
        {endpointList.length === 0 ? (
          <EmptyState title="暂无接入" description="登记上游推理地址后将显示在此列表" />
        ) : (() => {
          const s = endpointSearch.trim().toLowerCase();
          const filtered = s ? endpointList.filter((e) => `${e.name}${e.provider}${e.status}`.toLowerCase().includes(s)) : endpointList;
          return (
          <>
          <div className="mb-4">
            <input className={`${inputClass(theme)} max-w-xs`} placeholder="搜索名称/提供方/状态…" value={endpointSearch} onChange={(e) => setEndpointSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="无匹配端点" description="尝试调整搜索条件" />
          ) : (
          <div className={tableWrap}>
            <table className="min-w-[640px] w-full text-sm">
              <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}>
                <tr>
                  {['名称', '提供方', '状态', '延迟', '操作'].map((h) => (
                    <th key={h} className="text-left p-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={e.id}
                    className={i % 2 === 0 ? (theme === 'light' ? 'bg-white' : 'bg-transparent') : theme === 'light' ? 'bg-slate-50/80' : 'bg-white/5'}
                  >
                    <td className="p-3">{e.name}</td>
                    <td className="p-3">{e.provider}</td>
                    <td className="p-3 whitespace-nowrap">{e.status}</td>
                    <td className="p-3">{e.latencyMs} ms</td>
                    <td className="p-3 flex flex-wrap gap-1">
                      <button
                        type="button"
                        className={`text-blue-600 text-xs ${btnGhostClass(theme)}`}
                        disabled={updateMut.isPending}
                        onClick={() =>
                          updateMut.mutate(
                            {
                              id: e.id,
                              data: {
                                latencyMs: Math.round(20 + Math.random() * 200),
                                status: 'online',
                              },
                            },
                            {
                              onSuccess: () => showMessage('已触发探测', 'info'),
                              onError: (err) => showMessage(err instanceof Error ? err.message : '探测失败', 'error'),
                            }
                          )
                        }
                      >
                        探测
                      </button>
                      <button type="button" className={`text-red-600 text-xs ${btnGhostClass(theme)}`} onClick={() => setDeleteId(e.id)}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          </>
          );
        })()}
      </UserAppShell>
    );
  }

  if (activeSubItem === 'model-config') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="模型配置（平台）" subtitle="与租户侧配置互补：此处管全局路由与默认模型">
        <div className={`${cardClass(theme)} p-4 max-w-xl space-y-3`}>
          <label className="text-xs text-slate-500">默认对话模型</label>
          <select className={inputClass(theme)} defaultValue="gpt-4o">
            <option value="gpt-4o">gpt-4o</option>
            <option value="claude-3">claude-3</option>
          </select>
          <label className="text-xs text-slate-500">全局温度</label>
          <input className={inputClass(theme)} type="number" step={0.1} defaultValue={0.7} />
          <button type="button" className={btnPrimaryClass} onClick={() => showMessage('全局模型策略已保存（Mock）', 'success')}>
            保存
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'model-test') {
    if (endpointsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="模型测试" subtitle="联调任意已接入端点">
          <PageSkeleton type="form" />
        </UserAppShell>
      );
    }
    if (endpointsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="模型测试" subtitle="联调任意已接入端点">
          <PageError error={endpointsQ.error instanceof Error ? endpointsQ.error : null} onRetry={() => endpointsQ.refetch()} />
        </UserAppShell>
      );
    }
    const sel = selectedEndpointId || endpointList[0]?.id || '';
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="模型测试" subtitle="联调任意已接入端点">
        {endpointList.length === 0 ? (
          <EmptyState title="暂无已接入端点" description="请先在「模型接入」中登记端点" />
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${cardClass(theme)} p-4 space-y-3`}>
              <select className={inputClass(theme)} value={sel} onChange={(e) => setSelectedEndpointId(e.target.value)}>
                {endpointList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <textarea className={`${inputClass(theme)} min-h-[120px]`} value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} />
              <button
                type="button"
                className={btnPrimaryClass}
                onClick={() => {
                  setTestOut(`（Mock 响应）Echo: ${testPrompt.slice(0, 200)}`);
                  showMessage('请求完成', 'success');
                }}
              >
                发送
              </button>
            </div>
            <div className={`${cardClass(theme)} p-4 min-h-[200px]`}>
              <div className="text-xs text-slate-500 mb-2">输出</div>
              <pre className={`text-sm whitespace-pre-wrap font-mono ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{testOut || '—'}</pre>
            </div>
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === 'inference-routing') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="推理路由" subtitle="权重分流与灰度（Mock）">
        <button
          type="button"
          className={`${btnPrimaryClass} mb-4`}
          onClick={() => {
            setRoutes((prev) => [
              ...prev,
              { id: `rt${Date.now()}`, pattern: 'new-*', target: `cluster-${prev.length}`, weight: 10 },
            ]);
            showMessage('已添加路由规则', 'success');
          }}
        >
          新增规则
        </button>
        <div className="space-y-2">
          {routes.map((r) => (
            <div key={r.id} className={`${cardClass(theme)} p-4 flex flex-wrap justify-between gap-2`}>
              <div>
                <div className="font-mono text-sm">{r.pattern}</div>
                <div className="text-xs text-slate-500">→ {r.target}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={`${inputClass(theme)} w-20`}
                  value={r.weight}
                  onChange={(e) =>
                    setRoutes((prev) => prev.map((x) => (x.id === r.id ? { ...x, weight: Number(e.target.value) || 0 } : x)))
                  }
                />
                <span className="text-xs text-slate-500">权重</span>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhostClass(theme)} mt-4`} onClick={() => showMessage('路由表已发布（Mock）', 'success')}>
          发布路由表
        </button>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'model-monitoring') {
    if (endpointsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="模型监控" subtitle="错误率与延迟分位（Mock）">
          <PageSkeleton type="cards" />
        </UserAppShell>
      );
    }
    if (endpointsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="模型监控" subtitle="错误率与延迟分位（Mock）">
          <PageError error={endpointsQ.error instanceof Error ? endpointsQ.error : null} onRetry={() => endpointsQ.refetch()} />
        </UserAppShell>
      );
    }
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="模型监控" subtitle="错误率与延迟分位（Mock）">
        {endpointList.length === 0 ? (
          <EmptyState title="暂无端点" description="接入模型后将展示监控卡片" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {endpointList.map((e) => (
              <div key={e.id} className={`${cardClass(theme)} p-4`}>
                <div className="font-medium">{e.name}</div>
                <div className="text-sm text-slate-500 mt-2">P99 延迟：{e.latencyMs + 120} ms</div>
                <div className="text-sm text-slate-500">5xx：0.02%</div>
              </div>
            ))}
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === 'quota-management') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="配额管理（算力）" subtitle="按工作空间限制 Token / 调用（Mock）">
        <div className={tableWrap}>
          <table className="min-w-[560px] w-full text-sm">
            <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}>
              <tr>
                {['工作空间', '月度 Token（万）', '已用', '操作'].map((h) => (
                  <th key={h} className="text-left p-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['教务处', '信息中心'].map((ws, i) => (
                <tr key={ws} className={i % 2 === 0 ? (theme === 'light' ? 'bg-white' : 'bg-transparent') : theme === 'light' ? 'bg-slate-50/80' : 'bg-white/5'}>
                  <td className="p-3">{ws}</td>
                  <td className="p-3">1000</td>
                  <td className="p-3">642</td>
                  <td className="p-3">
                    <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已打开调整向导', 'info')}>
                      调整
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'cost-statistics') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="成本统计" subtitle="按模型与租户汇总（Mock）">
        <div className={`${cardClass(theme)} p-4 mb-4`}>
          <div className="text-sm text-slate-500">本月预估</div>
          <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>¥ 128,400</div>
        </div>
        <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已生成对账文件（Mock）', 'success')}>
          导出对账
        </button>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'gpu-pool') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="GPU 资源池" subtitle="节点占用与任务绑定（Mock）">
        <div className="space-y-3">
          {gpu.map((g) => (
            <div key={g.id} className={`${cardClass(theme)} p-4`}>
              <div className="flex justify-between">
                <span className="font-medium">{g.node}</span>
                <span className="text-sm text-slate-500">{g.model}</span>
              </div>
              <div className={`mt-2 h-2 rounded-full overflow-hidden ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(g.used / g.total) * 100}%` }} />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {g.used}/{g.total} 卡
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${btnPrimaryClass} mt-4`}
          onClick={() => {
            setGpu((prev) => [...prev, { id: `gpu${Date.now()}`, node: `gpu-0${prev.length + 1}`, used: 0, total: 8, model: '空闲' }]);
            showMessage('已登记新节点', 'success');
          }}
        >
          登记节点
        </button>
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

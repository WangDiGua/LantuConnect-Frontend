import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  useConversationList,
  useDeleteConversation,
  useDatasets,
  useCreateDataset,
  useDeleteDataset,
  useEvalRuns,
  useCreateEval,
  useABTests,
  useCreateABTest,
  useUpdateABTest,
  useLabels,
  useUpdateLabel,
  useExportData,
} from '../../hooks/queries/useDataEval';
import {
  createDatasetSchema,
  createEvalSchema,
  createABTestSchema,
  type CreateDatasetFormValues,
  type CreateEvalFormValues,
  type CreateABTestFormValues,
} from '../../schemas/data-eval.schema';
import type { Conversation } from '../../types/dto/data-eval';

interface DataEvalUserModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DataEvalUserModule: React.FC<DataEvalUserModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  const convQuery = useConversationList({ page: 1, pageSize: 100 });
  const deleteConversation = useDeleteConversation();
  const datasetsQuery = useDatasets();
  const createDataset = useCreateDataset();
  const deleteDataset = useDeleteDataset();
  const evalsQuery = useEvalRuns();
  const createEval = useCreateEval();
  const abTestsQuery = useABTests();
  const createABTest = useCreateABTest();
  const updateABTest = useUpdateABTest();
  const labelsQuery = useLabels();
  const updateLabel = useUpdateLabel();
  const exportData = useExportData();

  const [searchQ, setSearchQ] = useState('');
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [exportRange, setExportRange] = useState({ start: '2026-03-01', end: '2026-03-19', format: 'json' as 'json' | 'csv' | 'xlsx' });
  const [trafficLocal, setTrafficLocal] = useState(50);

  const datasetForm = useForm<CreateDatasetFormValues>({
    resolver: zodResolver(createDatasetSchema),
    defaultValues: { name: '', description: '' },
  });

  const evalForm = useForm<CreateEvalFormValues>({
    resolver: zodResolver(createEvalSchema),
    defaultValues: { name: '', modelA: '', modelB: '', datasetId: '' },
  });

  const abTestForm = useForm<CreateABTestFormValues>({
    resolver: zodResolver(createABTestSchema),
    defaultValues: { name: '', trafficA: 50 },
  });

  const conversations = convQuery.data?.list ?? [];
  const datasets = datasetsQuery.data ?? [];
  const abTests = abTestsQuery.data ?? [];
  const primaryAb = abTests[0];

  useEffect(() => {
    if (activeConv && !conversations.some((c) => c.id === activeConv.id)) {
      setActiveConv(null);
    }
  }, [conversations, activeConv]);

  useEffect(() => {
    if (primaryAb) setTrafficLocal(primaryAb.trafficA);
  }, [primaryAb?.id, primaryAb?.trafficA]);

  useEffect(() => {
    if (datasets.length === 0) return;
    const id = evalForm.getValues('datasetId');
    if (!id) evalForm.setValue('datasetId', datasets[0].id);
  }, [datasets, evalForm]);

  const filteredConv = conversations.filter(
    (c) => c.title.includes(searchQ) || c.lastMessage.includes(searchQ) || c.agentName.includes(searchQ),
  );

  const onCreateDataset = (values: CreateDatasetFormValues) => {
    createDataset.mutate(
      { name: values.name.trim(), description: values.description?.trim() || undefined },
      {
        onSuccess: () => {
          datasetForm.reset({ name: '', description: '' });
          showMessage('数据集已创建', 'success');
        },
        onError: () => showMessage('创建失败', 'error'),
      },
    );
  };

  const onCreateEval = (values: CreateEvalFormValues) => {
    createEval.mutate(
      {
        name: values.name.trim(),
        modelA: values.modelA.trim(),
        modelB: values.modelB.trim(),
        datasetId: values.datasetId,
      },
      {
        onSuccess: () => {
          evalForm.reset({ name: '', modelA: '', modelB: '', datasetId: datasets[0]?.id ?? '' });
          showMessage('评测任务已创建', 'success');
        },
        onError: () => showMessage('创建失败', 'error'),
      },
    );
  };

  const onCreateAb = (values: CreateABTestFormValues) => {
    createABTest.mutate(
      {
        name: values.name.trim(),
        trafficA: values.trafficA,
        variantA: '变体 A',
        variantB: '变体 B',
      },
      {
        onSuccess: () => {
          abTestForm.reset({ name: '', trafficA: 50 });
          showMessage('实验已创建', 'success');
        },
        onError: () => showMessage('创建失败', 'error'),
      },
    );
  };

  if (activeSubItem === '对话历史') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="对话历史" subtitle="检索与查看完整会话">
        <input
          className={`${inputClass(theme)} mb-4`}
          placeholder="搜索标题 / 内容 / Agent"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        {convQuery.isPending && <PageSkeleton type="cards" />}
        {convQuery.isError && (
          <PageError error={convQuery.error as Error} onRetry={() => void convQuery.refetch()} />
        )}
        {convQuery.isSuccess && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${cardClass(theme)} max-h-[480px] overflow-y-auto`}>
              {filteredConv.length === 0 ? (
                <EmptyState title="无匹配会话" description="调整搜索或稍后再试" />
              ) : (
                filteredConv.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConv(c)}
                    className={`w-full text-left p-4 border-b last:border-0 transition-colors ${
                      theme === 'light' ? 'border-slate-100 hover:bg-slate-50' : 'border-white/10 hover:bg-white/5'
                    } ${activeConv?.id === c.id ? (theme === 'light' ? 'bg-blue-50' : 'bg-blue-500/10') : ''}`}
                  >
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{c.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {c.agentName} · {c.updatedAt}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">{c.lastMessage}</div>
                  </button>
                ))
              )}
            </div>
            <div className={`${cardClass(theme)} p-4 min-h-[320px]`}>
              {activeConv ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={btnGhostClass(theme)}
                      disabled={deleteConversation.isPending}
                      onClick={() => setConvToDelete(activeConv.id)}
                    >
                      删除会话
                    </button>
                  </div>
                  {activeConv.messages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl text-sm ${
                        m.role === 'user'
                          ? theme === 'light'
                            ? 'bg-slate-100 ml-8'
                            : 'bg-white/10 ml-8'
                          : theme === 'light'
                            ? 'bg-blue-50 mr-8'
                            : 'bg-blue-500/15 mr-8'
                      }`}
                    >
                      <div className="text-xs text-slate-500 mb-1">
                        {m.role} · {m.at}
                      </div>
                      {m.content}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-16 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                  选择左侧会话
                </div>
              )}
            </div>
          </div>
        )}
        <ConfirmDialog
          open={convToDelete !== null}
          title="删除会话"
          message="确定删除该会话？此操作不可撤销。"
          confirmText="删除"
          variant="danger"
          loading={deleteConversation.isPending}
          onCancel={() => setConvToDelete(null)}
          onConfirm={() => {
            if (!convToDelete) return;
            deleteConversation.mutate(convToDelete, {
              onSuccess: () => {
                setConvToDelete(null);
                setActiveConv(null);
                showMessage('已删除', 'success');
              },
              onError: () => showMessage('删除失败', 'error'),
            });
          }}
        />
      </UserAppShell>
    );
  }

  if (activeSubItem === '数据统计') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="数据统计" subtitle="核心指标看板（Mock）">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['日活会话', '428'],
            ['平均轮次', '5.2'],
            ['满意度', '94%'],
            ['首响时延', '1.1s'],
          ].map(([k, v]) => (
            <div key={k} className={`${cardClass(theme)} p-5`}>
              <div className="text-sm text-slate-500">{k}</div>
              <div className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{v}</div>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '导出数据') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="导出数据" subtitle="选择范围与格式">
        <div className={`${cardClass(theme)} p-5 space-y-4`}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>开始日期</label>
              <input
                type="date"
                className={`${inputClass(theme)} mt-1`}
                value={exportRange.start}
                onChange={(e) => setExportRange((r) => ({ ...r, start: e.target.value }))}
              />
            </div>
            <div>
              <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>结束日期</label>
              <input
                type="date"
                className={`${inputClass(theme)} mt-1`}
                value={exportRange.end}
                onChange={(e) => setExportRange((r) => ({ ...r, end: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>格式</label>
            <select
              className={`${inputClass(theme)} mt-1`}
              value={exportRange.format}
              onChange={(e) => setExportRange((r) => ({ ...r, format: e.target.value as 'json' | 'csv' | 'xlsx' }))}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </select>
          </div>
          <button
            type="button"
            className={btnPrimaryClass}
            disabled={exportData.isPending}
            onClick={() =>
              exportData.mutate(
                {
                  format: exportRange.format,
                  dateFrom: exportRange.start,
                  dateTo: exportRange.end,
                },
                {
                  onSuccess: (res) => showMessage(`导出成功：${res.downloadUrl}`, 'success'),
                  onError: () => showMessage('导出失败', 'error'),
                },
              )
            }
          >
            {exportData.isPending ? '导出中…' : '开始导出'}
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '数据集') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="数据集管理" subtitle="评测与标注的数据容器">
        <form className={`${cardClass(theme)} p-4 mb-4 space-y-3`} onSubmit={datasetForm.handleSubmit(onCreateDataset)}>
          <div className="flex flex-wrap gap-2 items-start">
            <div className="flex-1 min-w-[180px] space-y-1">
              <input className={inputClass(theme)} placeholder="数据集名称" {...datasetForm.register('name')} />
              {datasetForm.formState.errors.name && (
                <p className="text-xs text-red-500">{datasetForm.formState.errors.name.message}</p>
              )}
            </div>
            <button type="submit" className={btnPrimaryClass} disabled={createDataset.isPending}>
              {createDataset.isPending ? '创建中…' : '新建'}
            </button>
          </div>
          <textarea
            className={`${inputClass(theme)} min-h-[72px]`}
            placeholder="描述（可选）"
            {...datasetForm.register('description')}
          />
        </form>
        <div className={cardClass(theme)}>
          {datasetsQuery.isPending && <PageSkeleton type="table" rows={4} />}
          {datasetsQuery.isError && (
            <PageError error={datasetsQuery.error as Error} onRetry={() => void datasetsQuery.refetch()} />
          )}
          {datasetsQuery.isSuccess && datasets.length === 0 && (
            <EmptyState title="暂无数据集" description="创建数据集后可上传样本" />
          )}
          {datasetsQuery.isSuccess &&
            datasets.map((d) => (
              <div
                key={d.id}
                className={`p-4 flex flex-wrap gap-2 justify-between items-center border-b last:border-0 ${
                  theme === 'light' ? 'border-slate-100' : 'border-white/10'
                }`}
              >
                <div>
                  <div className={theme === 'dark' ? 'text-white font-medium' : 'text-slate-900 font-medium'}>{d.name}</div>
                  <div className="text-xs text-slate-500">
                    {d.rows} 条 · {d.updatedAt}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnGhostClass(theme)}
                    onClick={() => showMessage(`已打开上传向导：${d.name}（Mock）`, 'info')}
                  >
                    上传样本
                  </button>
                  <button type="button" className={btnGhostClass(theme)} onClick={() => setDatasetToDelete(d.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))}
        </div>
        <ConfirmDialog
          open={datasetToDelete !== null}
          title="删除数据集"
          message="确定删除该数据集？此操作不可撤销。"
          confirmText="删除"
          variant="danger"
          loading={deleteDataset.isPending}
          onCancel={() => setDatasetToDelete(null)}
          onConfirm={() => {
            if (!datasetToDelete) return;
            deleteDataset.mutate(datasetToDelete, {
              onSuccess: () => {
                setDatasetToDelete(null);
                showMessage('已删除', 'success');
              },
              onError: () => showMessage('删除失败', 'error'),
            });
          }}
        />
      </UserAppShell>
    );
  }

  if (activeSubItem === '效果评测') {
    const evals = evalsQuery.data ?? [];
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="效果评测" subtitle="对比两个模型在同一数据集上的表现">
        <form
          className={`${cardClass(theme)} p-4 mb-4 space-y-3`}
          onSubmit={evalForm.handleSubmit(onCreateEval)}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <input className={inputClass(theme)} placeholder="评测名称" {...evalForm.register('name')} />
              {evalForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{evalForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <select className={inputClass(theme)} {...evalForm.register('datasetId')}>
                {datasets.length === 0 ? (
                  <option value="">暂无数据集</option>
                ) : (
                  datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))
                )}
              </select>
              {evalForm.formState.errors.datasetId && (
                <p className="text-xs text-red-500 mt-1">{evalForm.formState.errors.datasetId.message}</p>
              )}
            </div>
            <div>
              <input className={inputClass(theme)} placeholder="模型 A" {...evalForm.register('modelA')} />
              {evalForm.formState.errors.modelA && (
                <p className="text-xs text-red-500 mt-1">{evalForm.formState.errors.modelA.message}</p>
              )}
            </div>
            <div>
              <input className={inputClass(theme)} placeholder="模型 B" {...evalForm.register('modelB')} />
              {evalForm.formState.errors.modelB && (
                <p className="text-xs text-red-500 mt-1">{evalForm.formState.errors.modelB.message}</p>
              )}
            </div>
          </div>
          <button type="submit" className={btnPrimaryClass} disabled={createEval.isPending || datasets.length === 0}>
            {createEval.isPending ? '创建中…' : '新建评测任务'}
          </button>
        </form>
        <div className={`${cardClass(theme)} overflow-x-auto`}>
          {evalsQuery.isPending && <PageSkeleton type="table" rows={5} />}
          {evalsQuery.isError && (
            <PageError error={evalsQuery.error as Error} onRetry={() => void evalsQuery.refetch()} />
          )}
          {evalsQuery.isSuccess && evals.length === 0 && (
            <EmptyState title="暂无评测" description="创建任务后将在此展示结果" />
          )}
          {evalsQuery.isSuccess && evals.length > 0 && (
            <table className="w-full text-sm">
              <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}>
                <tr>
                  <th className="text-left p-3">任务</th>
                  <th className="text-left p-3">模型 A</th>
                  <th className="text-left p-3">模型 B</th>
                  <th className="text-right p-3">Score A</th>
                  <th className="text-right p-3">Score B</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((e) => (
                  <tr key={e.id} className={`border-t ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
                    <td className="p-3">{e.name}</td>
                    <td className="p-3">{e.modelA}</td>
                    <td className="p-3">{e.modelB}</td>
                    <td className="p-3 text-right">{e.scoreA.toFixed(2)}</td>
                    <td className="p-3 text-right">{e.scoreB.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'A/B 实验') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="A/B 实验" subtitle="流量分配与结果查看">
        <form className={`${cardClass(theme)} p-5 mb-4 space-y-3`} onSubmit={abTestForm.handleSubmit(onCreateAb)}>
          <div>
            <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>实验名称</label>
            <input className={`${inputClass(theme)} mt-1`} placeholder="例如：首页助手分流" {...abTestForm.register('name')} />
            {abTestForm.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">{abTestForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>A 侧流量 %</label>
            <input
              type="range"
              min={1}
              max={99}
              className="w-full mt-2"
              {...abTestForm.register('trafficA', { valueAsNumber: true })}
            />
            <div className="text-sm text-slate-500 mt-1">当前 A：{abTestForm.watch('trafficA')}%，B：{100 - abTestForm.watch('trafficA')}%</div>
            {abTestForm.formState.errors.trafficA && (
              <p className="text-xs text-red-500 mt-1">{abTestForm.formState.errors.trafficA.message}</p>
            )}
          </div>
          <button type="submit" className={btnPrimaryClass} disabled={createABTest.isPending}>
            {createABTest.isPending ? '创建中…' : '新建实验'}
          </button>
        </form>
        {abTestsQuery.isPending && (
          <div className={cardClass(theme)}>
            <PageSkeleton type="cards" />
          </div>
        )}
        {abTestsQuery.isError && (
          <div className={cardClass(theme)}>
            <PageError error={abTestsQuery.error as Error} onRetry={() => void abTestsQuery.refetch()} />
          </div>
        )}
        {abTestsQuery.isSuccess && abTests.length === 0 && (
          <div className={cardClass(theme)}>
            <EmptyState title="暂无实验" description="创建实验后可配置流量" />
          </div>
        )}
        {abTestsQuery.isSuccess && abTests.length > 0 && (
          <>
            <div className={`${cardClass(theme)} p-5 mb-4`}>
              <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                调整「{primaryAb?.name ?? '—'}」A 侧流量 %
              </label>
              <input
                type="range"
                min={1}
                max={99}
                className="w-full mt-2"
                value={trafficLocal}
                disabled={!primaryAb || updateABTest.isPending}
                onChange={(e) => setTrafficLocal(Number(e.target.value))}
              />
              <div className="text-sm text-slate-500 mt-1">B 侧 = {100 - trafficLocal}%</div>
              <button
                type="button"
                className={`${btnPrimaryClass} mt-4`}
                disabled={!primaryAb || updateABTest.isPending}
                onClick={() => {
                  if (!primaryAb) return;
                  updateABTest.mutate(
                    { id: primaryAb.id, data: { trafficA: trafficLocal } },
                    {
                      onSuccess: () => showMessage('流量配置已保存', 'success'),
                      onError: () => showMessage('保存失败', 'error'),
                    },
                  );
                }}
              >
                {updateABTest.isPending ? '保存中…' : '保存配置'}
              </button>
            </div>
            <div className={cardClass(theme)}>
              {abTests.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'} border-b last:border-0`}
                >
                  <div className={theme === 'dark' ? 'text-white font-medium' : 'text-slate-900 font-medium'}>{t.name}</div>
                  <div className="text-sm text-slate-500">状态：{t.status}</div>
                  <button
                    type="button"
                    className={`${btnGhostClass(theme)} mt-2`}
                    disabled={updateABTest.isPending || t.status === 'ended'}
                    onClick={() =>
                      updateABTest.mutate(
                        { id: t.id, data: { status: 'ended', winner: 'A' } },
                        {
                          onSuccess: () => showMessage('已结束实验并宣布 A 胜出', 'success'),
                          onError: () => showMessage('操作失败', 'error'),
                        },
                      )
                    }
                  >
                    结束并选出胜者
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '标注任务') {
    const labels = labelsQuery.data ?? [];
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="标注任务" subtitle="人工质检队列">
        {labelsQuery.isPending && <PageSkeleton type="cards" />}
        {labelsQuery.isError && (
          <PageError error={labelsQuery.error as Error} onRetry={() => void labelsQuery.refetch()} />
        )}
        {labelsQuery.isSuccess && labels.length === 0 && (
          <EmptyState title="暂无标注任务" description="任务入队后将显示在此" />
        )}
        {labelsQuery.isSuccess && labels.length > 0 && (
          <div className="space-y-3">
            {labels.map((l) => (
              <div key={l.id} className={`${cardClass(theme)} p-4`}>
                <p className={`mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{l.text}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnPrimaryClass}
                    disabled={updateLabel.isPending}
                    onClick={() =>
                      updateLabel.mutate(
                        { id: l.id, data: { label: 'good' } },
                        {
                          onSuccess: () => showMessage('已标为优质', 'success'),
                          onError: () => showMessage('更新失败', 'error'),
                        },
                      )
                    }
                  >
                    优质
                  </button>
                  <button
                    type="button"
                    className={btnGhostClass(theme)}
                    disabled={updateLabel.isPending}
                    onClick={() =>
                      updateLabel.mutate(
                        { id: l.id, data: { label: 'bad' } },
                        {
                          onSuccess: () => showMessage('已标为待改进', 'info'),
                          onError: () => showMessage('更新失败', 'error'),
                        },
                      )
                    }
                  >
                    待改进
                  </button>
                </div>
                {l.label && l.label !== 'pending' && (
                  <div className="text-xs text-slate-500 mt-2">当前标签：{l.label}</div>
                )}
              </div>
            ))}
          </div>
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

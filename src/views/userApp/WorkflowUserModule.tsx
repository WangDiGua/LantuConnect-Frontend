import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Play, Plus, Copy, Trash2, Clock, Download, Upload, Loader2, History, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import { WorkflowEditor, WorkflowNode } from '../../components/workflow/WorkflowEditor';
import { ProgressBar } from '../../components/common/ProgressBar';
import type { Edge } from '@xyflow/react';
import {
  useWorkflowList,
  useWorkflowRuns,
  useWorkflowSchedules,
  useWorkflowTemplates,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useExecuteWorkflow,
  useCreateSchedule,
  useUpdateSchedule,
} from '../../hooks/queries/useWorkflow';
import {
  createWorkflowSchema,
  createScheduleSchema,
  type CreateWorkflowFormValues,
  type CreateScheduleFormValues,
} from '../../schemas/workflow.schema';
import type { Workflow, WorkflowRun, WorkflowSchedule, WorkflowTemplate } from '../../types/dto/workflow';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ApiException } from '../../types/api';

interface WorkflowUserModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function toError(e: unknown): Error | null {
  if (!e) return null;
  if (e instanceof Error) return e;
  return new Error(String(e));
}

type TemplateCard = WorkflowTemplate & { desc?: string };

function templateDescription(t: TemplateCard): string {
  return t.description || t.desc || '';
}

export const WorkflowUserModule: React.FC<WorkflowUserModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  const [selectedWf, setSelectedWf] = useState<string>('');
  const [runDetail, setRunDetail] = useState<WorkflowRun | null>(null);
  const [importJson, setImportJson] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [scheduleToggleId, setScheduleToggleId] = useState<string | null>(null);
  const [executingWfId, setExecutingWfId] = useState<string | null>(null);
  const [executionProgress, setExecutionProgress] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<WorkflowRun[]>([]);

  const listQuery = useWorkflowList({ page: 1, pageSize: 100 });
  const runsQuery = useWorkflowRuns({ page: 1, pageSize: 100 });
  const schedulesQuery = useWorkflowSchedules();
  const templatesQuery = useWorkflowTemplates();

  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const executeWorkflow = useExecuteWorkflow();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const createWfForm = useForm<CreateWorkflowFormValues>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: { name: '', description: '' },
  });

  const scheduleForm = useForm<CreateScheduleFormValues>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: { workflowId: '', cron: '0 9 * * *' },
  });

  const workflowList = listQuery.data?.list ?? [];

  useEffect(() => {
    const list = listQuery.data?.list;
    if (!list?.length) return;
    if (!selectedWf || !list.some((w) => w.id === selectedWf)) {
      setSelectedWf(list[0].id);
    }
  }, [listQuery.data?.list, selectedWf]);

  const wf: Workflow | undefined =
    workflowList.find((w) => w.id === selectedWf) ?? workflowList[0];

  const runsList = runsQuery.data?.list ?? [];
  const schedulesList = schedulesQuery.data ?? [];
  const templatesList: TemplateCard[] = (templatesQuery.data ?? []) as TemplateCard[];

  const resolveRunWorkflowId = (r: WorkflowRun) =>
    r.workflowId || workflowList.find((w) => w.name === r.workflowName)?.id || '';

  const runDetailRetryId = runDetail ? resolveRunWorkflowId(runDetail) : '';

  const errMessage = (err: unknown) =>
    err instanceof ApiException ? err.message : '操作失败，请稍后重试';

  const onCreateWorkflow = createWfForm.handleSubmit(async (values) => {
    try {
      const created = await createWorkflow.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim(),
      });
      setSelectedWf(created.id);
      createWfForm.reset();
      showMessage('工作流已创建', 'success');
    } catch (e) {
      showMessage(errMessage(e), 'error');
    }
  });

  const duplicateWf = async (w: Workflow) => {
    try {
      const created = await createWorkflow.mutateAsync({
        name: `${w.name} 副本`,
        description: w.description || '—',
        steps: [...w.steps],
      });
      setSelectedWf(created.id);
      showMessage('已复制工作流', 'success');
    } catch (e) {
      showMessage(errMessage(e), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflow.mutateAsync(deleteTarget.id);
      if (selectedWf === deleteTarget.id) setSelectedWf('');
      showMessage('已删除', 'success');
      setDeleteTarget(null);
    } catch (e) {
      showMessage(errMessage(e), 'error');
    }
  };

  const runWorkflowById = async (id: string) => {
    if (!id) {
      showMessage('无法解析工作流，请从列表重新运行', 'error');
      return;
    }
    setExecutingWfId(id);
    setIsExecuting(true);
    setExecutionProgress(0);
    
    // 模拟执行进度
    const progressInterval = setInterval(() => {
      setExecutionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await executeWorkflow.mutateAsync(id);
      showMessage('已触发运行', 'success');
      // 刷新运行记录
      runsQuery.refetch();
    } catch (e) {
      showMessage(errMessage(e), 'error');
    } finally {
      clearInterval(progressInterval);
      setExecutingWfId(null);
      setIsExecuting(false);
      setExecutionProgress(0);
    }
  };

  const addStep = async () => {
    if (!wf) return;
    const steps = [...wf.steps.slice(0, -1), '新节点', '结束'];
    try {
      await updateWorkflow.mutateAsync({ id: wf.id, data: { steps } });
      showMessage('已添加节点', 'info');
    } catch (e) {
      showMessage(errMessage(e), 'error');
    }
  };

  const applyTemplate = async (t: TemplateCard) => {
    try {
      const created = await createWorkflow.mutateAsync({
        name: `来自模板：${t.name}`,
        description: templateDescription(t) || t.name,
        templateId: t.id,
        steps: [...t.steps],
      });
      setSelectedWf(created.id);
      showMessage('已从模板创建工作流', 'success');
    } catch (e) {
      showMessage(errMessage(e), 'error');
    }
  };

  const onCreateSchedule = scheduleForm.handleSubmit(async (values) => {
    try {
      await createSchedule.mutateAsync({
        workflowId: values.workflowId,
        cron: values.cron.trim(),
      });
      scheduleForm.reset({ workflowId: '', cron: '0 9 * * *' });
      showMessage('定时任务已保存', 'success');
    } catch (e) {
      showMessage(errMessage(e), 'error');
    }
  });

  const toggleSchedule = async (s: WorkflowSchedule) => {
    setScheduleToggleId(s.id);
    try {
      await updateSchedule.mutateAsync({ id: s.id, data: { enabled: !s.enabled } });
      showMessage('已切换启用状态', 'success');
    } catch (e) {
      showMessage(errMessage(e), 'error');
    } finally {
      setScheduleToggleId(null);
    }
  };

  const doImport = async () => {
    try {
      const parsed = JSON.parse(importJson) as { name?: string; steps?: string[] };
      if (!parsed.name?.trim() || !parsed.steps?.length) throw new Error('invalid');
      const created = await createWorkflow.mutateAsync({
        name: parsed.name.trim(),
        description: '自 JSON 导入',
        steps: parsed.steps,
      });
      setSelectedWf(created.id);
      setImportJson('');
      showMessage('导入成功', 'success');
    } catch (e) {
      if (e instanceof SyntaxError || (e instanceof Error && e.message === 'invalid')) {
        showMessage('JSON 格式不正确', 'error');
      } else {
        showMessage(errMessage(e), 'error');
      }
    }
  };

  const exportWf = () => {
    if (!wf) return;
    const blob = new Blob([JSON.stringify({ name: wf.name, steps: wf.steps }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${wf.name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showMessage('已导出 JSON', 'success');
  };

  if (activeSubItem === '工作流列表') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="工作流列表" subtitle="创建、复制、删除与手动运行">
        <form onSubmit={onCreateWorkflow} className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2 min-w-0">
            <input
              className={inputClass(theme)}
              placeholder="工作流名称"
              {...createWfForm.register('name')}
            />
            {createWfForm.formState.errors.name && (
              <p className="text-xs text-red-500">{createWfForm.formState.errors.name.message}</p>
            )}
            <input
              className={inputClass(theme)}
              placeholder="描述"
              {...createWfForm.register('description')}
            />
            {createWfForm.formState.errors.description && (
              <p className="text-xs text-red-500">{createWfForm.formState.errors.description.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={createWorkflow.isPending}
            className={`${btnPrimaryClass} shrink-0 inline-flex items-center justify-center gap-2 disabled:opacity-60`}
          >
            {createWorkflow.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {createWorkflow.isPending ? '创建中…' : '新建'}
          </button>
        </form>

        {listQuery.isLoading && <PageSkeleton type="table" rows={6} />}
        {!listQuery.isLoading && listQuery.isError && (
          <PageError error={toError(listQuery.error)} onRetry={() => listQuery.refetch()} />
        )}
        {!listQuery.isLoading && !listQuery.isError && workflowList.length === 0 && (
          <div className={cardClass(theme)}>
            <EmptyState title="暂无工作流" description="在上方填写名称与描述后新建，或从模板创建。" />
          </div>
        )}
        {!listQuery.isLoading && !listQuery.isError && workflowList.length > 0 && (
          <div className={`${cardClass(theme)} divide-y ${theme === 'light' ? 'divide-slate-100' : 'divide-white/10'}`}>
            {workflowList.map((w) => (
              <div key={w.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{w.name}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    {w.description || '—'} · {w.status} · {w.updatedAt}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={executeWorkflow.isPending}
                  className={`${btnGhostClass(theme)} inline-flex items-center disabled:opacity-60`}
                  onClick={() => runWorkflowById(w.id)}
                >
                  {executeWorkflow.isPending && executingWfId === w.id ? (
                    <Loader2 size={14} className="inline mr-1 animate-spin" />
                  ) : (
                    <Play size={14} className="inline mr-1" />
                  )}
                  运行
                </button>
                <button
                  type="button"
                  disabled={createWorkflow.isPending}
                  className={`${btnGhostClass(theme)} inline-flex items-center disabled:opacity-60`}
                  onClick={() => duplicateWf(w)}
                >
                  <Copy size={14} className="inline mr-1" /> 复制
                </button>
                <button
                  type="button"
                  className={`p-2 rounded-xl ${theme === 'light' ? 'text-red-600 hover:bg-red-50' : 'text-red-400'}`}
                  onClick={() => setDeleteTarget({ id: w.id, name: w.name })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="删除工作流"
          message={deleteTarget ? `确定删除「${deleteTarget.name}」？此操作不可撤销。` : ''}
          confirmText="删除"
          variant="danger"
          loading={deleteWorkflow.isPending}
          onConfirm={confirmDelete}
          onCancel={() => !deleteWorkflow.isPending && setDeleteTarget(null)}
        />
      </UserAppShell>
    );
  }

  if (activeSubItem === '画布编排') {
    // 将步骤转换为节点
    const workflowNodes: WorkflowNode[] = wf
      ? wf.steps.map((step, i) => ({
          id: `node-${i}`,
          type: i === 0 ? 'start' : i === wf.steps.length - 1 ? 'end' : 'process',
          position: { x: i * 200, y: 100 },
          data: { label: step, type: i === 0 ? 'start' : i === wf.steps.length - 1 ? 'end' : 'process' },
        }))
      : [];
    
    const workflowEdges: Edge[] = workflowNodes
      .slice(0, -1)
      .map((node, i) => ({
        id: `edge-${i}`,
        source: node.id,
        target: workflowNodes[i + 1].id,
      }));

    const handleSaveWorkflow = (nodes: WorkflowNode[], edges: Edge[]) => {
      const steps = nodes.map((n) => n.data.label);
      if (wf) {
        updateWorkflow.mutate(
          { id: wf.id, data: { steps } },
          {
            onSuccess: () => showMessage('工作流已保存', 'success'),
            onError: (e) => showMessage(errMessage(e), 'error'),
          }
        );
      }
    };

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="画布编排" subtitle="可视化工作流编辑器，支持拖拽节点和连线">
        {listQuery.isLoading && <PageSkeleton type="detail" />}
        {!listQuery.isLoading && listQuery.isError && (
          <PageError error={toError(listQuery.error)} onRetry={() => listQuery.refetch()} />
        )}
        {!listQuery.isLoading && !listQuery.isError && workflowList.length === 0 && (
          <div className={cardClass(theme)}>
            <EmptyState title="暂无工作流" description="请先在「工作流列表」中创建工作流。" />
          </div>
        )}
        {!listQuery.isLoading && !listQuery.isError && workflowList.length > 0 && (
          <>
            <div className="mb-4">
              <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>当前工作流</label>
              <select
                className={`${inputClass(theme)} mt-1`}
                value={selectedWf}
                onChange={(e) => setSelectedWf(e.target.value)}
              >
                {workflowList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            {wf && (
              <div className={`${cardClass(theme)} overflow-hidden`} style={{ height: '600px' }}>
                <WorkflowEditor
                  theme={theme}
                  workflowId={wf.id}
                  initialNodes={workflowNodes}
                  initialEdges={workflowEdges}
                  onSave={handleSaveWorkflow}
                  onExecute={() => runWorkflowById(wf.id)}
                />
              </div>
            )}
            {/* 执行进度 */}
            {isExecuting && executingWfId === wf?.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 ${cardClass(theme)} p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    正在执行工作流...
                  </span>
                </div>
                <ProgressBar value={executionProgress} theme={theme} showLabel={true} />
              </motion.div>
            )}
          </>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '运行记录') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="运行记录" subtitle="查看每次运行的状态与日志">
        {runsQuery.isLoading && <PageSkeleton type="table" rows={6} />}
        {!runsQuery.isLoading && runsQuery.isError && (
          <PageError error={toError(runsQuery.error)} onRetry={() => runsQuery.refetch()} />
        )}
        {!runsQuery.isLoading && !runsQuery.isError && runsList.length === 0 && (
          <div className={cardClass(theme)}>
            <EmptyState title="暂无运行记录" description="在工作流列表中点击「运行」后将显示在此。" />
          </div>
        )}
        {!runsQuery.isLoading && !runsQuery.isError && runsList.length > 0 && (
          <>
            {/* 时间线视图 */}
            <div className={`${cardClass(theme)} mb-4`}>
              <div className="p-4 border-b border-inherit flex items-center gap-2">
                <History size={18} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} />
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  执行历史时间线
                </span>
              </div>
              <div className="p-4">
                <div className="relative">
                  {/* 时间线 */}
                  <div
                    className={`absolute left-4 top-0 bottom-0 w-0.5 ${
                      theme === 'light' ? 'bg-slate-200' : 'bg-white/10'
                    }`}
                  />
                  {/* 时间线项目 */}
                  <div className="space-y-4">
                    {runsList.slice(0, 10).map((r, index) => {
                      const isSuccess = r.status === 'success';
                      const isError = r.status === 'failed' || r.status === 'timeout';
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative flex items-start gap-4 pl-8"
                        >
                          {/* 时间线节点 */}
                          <div
                            className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              isSuccess
                                ? 'bg-emerald-500 border-emerald-600'
                                : isError
                                  ? 'bg-red-500 border-red-600'
                                  : 'bg-blue-500 border-blue-600'
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {r.workflowName}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-lg ${
                                  isSuccess
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                    : isError
                                      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                }`}
                              >
                                {r.status}
                              </span>
                            </div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                              <span className="font-mono">{r.startedAt}</span>
                              <span className="mx-2">·</span>
                              <span>{r.durationMs} ms</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRunDetail(r)}
                              className={`mt-2 text-xs ${btnGhostClass(theme)}`}
                            >
                              查看详情
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 表格视图 */}
            <div className={`${cardClass(theme)} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}>
                  <tr>
                    <th className="text-left p-3">工作流</th>
                    <th className="text-left p-3">状态</th>
                    <th className="text-left p-3">开始时间</th>
                    <th className="text-left p-3">耗时</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {runsList.map((r) => (
                    <tr key={r.id} className={`border-t ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
                      <td className="p-3">{r.workflowName}</td>
                      <td className="p-3">{r.status}</td>
                      <td className="p-3 font-mono text-xs">{r.startedAt}</td>
                      <td className="p-3">{r.durationMs} ms</td>
                      <td className="p-3">
                        <button type="button" className={btnGhostClass(theme)} onClick={() => setRunDetail(r)}>
                          详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {runDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className={`w-full max-w-lg rounded-2xl p-5 ${cardClass(theme)}`}>
              <h3 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>运行日志</h3>
              <pre
                className={`text-xs p-3 rounded-xl overflow-auto max-h-60 ${
                  theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-black/40 text-slate-300'
                }`}
              >
                {runDetail.log}
              </pre>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  disabled={
                    !runDetailRetryId || (executeWorkflow.isPending && executingWfId === runDetailRetryId)
                  }
                  className={`${btnPrimaryClass} inline-flex items-center gap-2 disabled:opacity-60`}
                  onClick={() => runWorkflowById(runDetailRetryId)}
                >
                  {executeWorkflow.isPending && executingWfId === runDetailRetryId ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  重试运行
                </button>
                <button type="button" className={`${btnGhostClass(theme)} ml-2`} onClick={() => setRunDetail(null)}>
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '定时与触发') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="定时与触发" subtitle="Cron 表达式触发工作流">
        <form onSubmit={onCreateSchedule} className={`${cardClass(theme)} p-4 mb-4 space-y-3`}>
          <div>
            <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>工作流</label>
            <select className={`${inputClass(theme)} mt-1`} {...scheduleForm.register('workflowId')}>
              <option value="">请选择</option>
              {workflowList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {scheduleForm.formState.errors.workflowId && (
              <p className="mt-1 text-xs text-red-500">{scheduleForm.formState.errors.workflowId.message}</p>
            )}
          </div>
          <div>
            <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Cron</label>
            <input
              className={`${inputClass(theme)} mt-1 font-mono text-sm`}
              {...scheduleForm.register('cron')}
            />
            {scheduleForm.formState.errors.cron && (
              <p className="mt-1 text-xs text-red-500">{scheduleForm.formState.errors.cron.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={createSchedule.isPending || listQuery.isLoading}
            className={`${btnPrimaryClass} inline-flex items-center gap-2 disabled:opacity-60`}
          >
            {createSchedule.isPending ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
            {createSchedule.isPending ? '保存中…' : '保存定时任务'}
          </button>
        </form>

        {schedulesQuery.isLoading && <PageSkeleton type="table" rows={4} />}
        {!schedulesQuery.isLoading && schedulesQuery.isError && (
          <PageError error={toError(schedulesQuery.error)} onRetry={() => schedulesQuery.refetch()} />
        )}
        {!schedulesQuery.isLoading && !schedulesQuery.isError && schedulesList.length === 0 && (
          <div className={cardClass(theme)}>
            <EmptyState title="暂无定时任务" description="填写 Cron 并选择工作流后保存。" />
          </div>
        )}
        {!schedulesQuery.isLoading && !schedulesQuery.isError && schedulesList.length > 0 && (
          <div className={cardClass(theme)}>
            {schedulesList.map((s) => (
              <div
                key={s.id}
                className={`p-4 flex justify-between items-center border-b last:border-0 ${
                  theme === 'light' ? 'border-slate-100' : 'border-white/10'
                }`}
              >
                <div>
                  <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                    {workflowList.find((w) => w.id === s.workflowId)?.name ?? s.workflowId}
                  </div>
                  <div className="text-xs font-mono text-slate-500">{s.cron}</div>
                </div>
                <button
                  type="button"
                  disabled={scheduleToggleId === s.id && updateSchedule.isPending}
                  className={`${btnGhostClass(theme)} disabled:opacity-60`}
                  onClick={() => toggleSchedule(s)}
                >
                  {scheduleToggleId === s.id && updateSchedule.isPending ? '处理中…' : s.enabled ? '禁用' : '启用'}
                </button>
              </div>
            ))}
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '工作流模板') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="工作流模板" subtitle="一键从模板生成可编辑工作流">
        {templatesQuery.isLoading && <PageSkeleton type="cards" />}
        {!templatesQuery.isLoading && templatesQuery.isError && (
          <PageError error={toError(templatesQuery.error)} onRetry={() => templatesQuery.refetch()} />
        )}
        {!templatesQuery.isLoading && !templatesQuery.isError && templatesList.length === 0 && (
          <div className={cardClass(theme)}>
            <EmptyState title="暂无模板" description="后端暂未提供工作流模板。" />
          </div>
        )}
        {!templatesQuery.isLoading && !templatesQuery.isError && templatesList.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {templatesList.map((t) => (
              <div key={t.id} className={`${cardClass(theme)} p-5`}>
                <h3 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.name}</h3>
                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {templateDescription(t)}
                </p>
                <button
                  type="button"
                  disabled={createWorkflow.isPending}
                  className={`${btnPrimaryClass} inline-flex items-center gap-2 disabled:opacity-60`}
                  onClick={() => applyTemplate(t)}
                >
                  {createWorkflow.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  {createWorkflow.isPending ? '创建中…' : '使用模板'}
                </button>
              </div>
            ))}
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '导入导出' || activeSubItem === '导入 / 导出') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="导入 / 导出" subtitle="JSON 格式：{ name, steps: string[] }">
        <div className={`${cardClass(theme)} p-5 mb-4`}>
          <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>导入</h3>
          <textarea
            className={`${inputClass(theme)} min-h-[120px] font-mono text-xs`}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"name":"示例","steps":["开始","LLM","结束"]}'
          />
          <button
            type="button"
            disabled={createWorkflow.isPending}
            className={`${btnPrimaryClass} mt-3 inline-flex items-center gap-2 disabled:opacity-60`}
            onClick={() => doImport()}
          >
            {createWorkflow.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {createWorkflow.isPending ? '导入中…' : '解析并导入'}
          </button>
        </div>
        <div className={`${cardClass(theme)} p-5`}>
          <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>导出当前</h3>
          <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            先在工作流列表或画布中选择工作流，再导出。
          </p>
          {listQuery.isLoading && <PageSkeleton type="form" />}
          {!listQuery.isLoading && listQuery.isError && (
            <PageError error={toError(listQuery.error)} onRetry={() => listQuery.refetch()} />
          )}
          {!listQuery.isLoading && !listQuery.isError && (
            <button
              type="button"
              className={`${btnPrimaryClass} inline-flex items-center gap-2 disabled:opacity-60`}
              onClick={exportWf}
              disabled={!wf}
            >
              <Download size={16} />
              导出 JSON
            </button>
          )}
        </div>
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择左侧子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

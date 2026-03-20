import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import { useModelList, useSendPlayground, useFineTuneList, useCreateFineTune } from '../../hooks/queries/useModel';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ApiException } from '../../types/api';
import { createFineTuneSchema, type CreateFineTuneFormValues } from '../../schemas/model-service.schema';

interface ModelServiceUserModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PLAYGROUND_TYPES = ['文本模型', '图像模型', '视频模型', '语音模型', '多模态'];

const playgroundFormSchema = z.object({
  modelId: z.string().min(1, '请选择模型'),
  prompt: z.string().min(1, '请输入内容'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(200_000).optional(),
  topP: z.number().min(0).max(1).optional(),
});

type PlaygroundFormValues = z.infer<typeof playgroundFormSchema>;

type PlaygroundLayout = 'split' | 'stack';

function ModelPlaygroundSection({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
  layout,
  stream,
}: Pick<ModelServiceUserModuleProps, 'activeSubItem' | 'theme' | 'fontSize' | 'showMessage'> & {
  layout: PlaygroundLayout;
  stream: boolean;
}) {
  const listQ = useModelList();
  const playgroundM = useSendPlayground();
  const [out, setOut] = useState('');
  const [streaming, setStreaming] = useState(false);
  const streamTimerRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlaygroundFormValues>({
    resolver: zodResolver(playgroundFormSchema),
    defaultValues: {
      modelId: '',
      prompt: '请用一句话介绍本校图书馆开放时间。',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
    },
  });

  const modelId = watch('modelId');

  useEffect(() => {
    const models = listQ.data;
    if (models?.length && !modelId) {
      setValue('modelId', models[0].id);
    }
  }, [listQ.data, modelId, setValue]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    };
  }, []);

  const runPlayground = handleSubmit(async (values) => {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setOut('');
    try {
      const res = await playgroundM.mutateAsync({
        modelId: values.modelId,
        prompt: values.prompt,
        temperature: values.temperature,
        maxTokens: values.maxTokens,
        topP: values.topP,
        stream,
      });
      const text = res.content;
      if (stream) {
        setStreaming(true);
        let i = 0;
        streamTimerRef.current = window.setInterval(() => {
          i += 2;
          setOut(text.slice(0, i));
          if (i >= text.length && streamTimerRef.current) {
            window.clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
            setStreaming(false);
            showMessage('生成完成', 'success');
          }
        }, 40);
      } else {
        setOut(text);
        showMessage('生成完成', 'success');
      }
    } catch (err) {
      showMessage(err instanceof ApiException ? err.message : '推理失败', 'error');
    }
  });

  if (listQ.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="加载模型列表…">
        <PageSkeleton type="detail" />
      </UserAppShell>
    );
  }
  if (listQ.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="模型列表加载失败">
        <PageError error={listQ.error as Error} onRetry={() => listQ.refetch()} />
      </UserAppShell>
    );
  }

  const models = listQ.data ?? [];
  const m = models.find((x) => x.id === modelId) ?? models[0];

  if (layout === 'stack' && models.length === 0) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="暂无可用的推理模型">
        <EmptyState title="暂无可用模型" description="请联系管理员配置模型服务" />
      </UserAppShell>
    );
  }

  const modelPicker = (
    <div className={`${cardClass(theme)} p-4 space-y-2 ${layout === 'split' ? 'lg:col-span-1' : ''}`}>
      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>模型</div>
      {models.length === 0 ? (
        <EmptyState title="暂无可用模型" description="请联系管理员配置模型服务" />
      ) : (
        models.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setValue('modelId', c.id, { shouldValidate: true })}
            className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${
              modelId === c.id
                ? theme === 'light'
                  ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                  : 'bg-blue-500/20 text-blue-200'
                : btnGhostClass(theme)
            }`}
          >
            <div className="font-semibold">{c.name}</div>
            <div className="text-xs opacity-70">
              {c.vendor} · {c.latency}
            </div>
          </button>
        ))
      )}
    </div>
  );

  const paramsFields = (
    <div className="grid sm:grid-cols-3 gap-2 mt-3">
      <div>
        <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>temperature</label>
        <input
          className={`${inputClass(theme)} mt-0.5`}
          type="number"
          step="0.1"
          {...register('temperature', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
          })}
        />
      </div>
      <div>
        <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>maxTokens</label>
        <input
          className={`${inputClass(theme)} mt-0.5`}
          type="number"
          {...register('maxTokens', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
          })}
        />
      </div>
      <div>
        <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>topP</label>
        <input
          className={`${inputClass(theme)} mt-0.5`}
          type="number"
          step="0.05"
          {...register('topP', {
            setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
          })}
        />
      </div>
    </div>
  );

  const outputBlock =
    layout === 'stack' && stream ? (
      <div className={`mt-4 min-h-[80px] p-3 rounded-xl font-mono text-sm ${theme === 'light' ? 'bg-slate-50' : 'bg-black/30'}`}>
        {out}
        {streaming && <span className="animate-pulse">▍</span>}
      </div>
    ) : out ? (
      <div className={`mt-4 p-4 rounded-xl text-sm ${theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}`}>{out}</div>
    ) : null;

  const formInner = (
    <>
      {layout === 'stack' && models.length > 0 && (
        <div className="mb-3">
          <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>模型</label>
          <select className={`${inputClass(theme)} mt-1`} {...register('modelId')}>
            {models.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.vendor}
              </option>
            ))}
          </select>
        </div>
      )}
      {layout === 'split' && <input type="hidden" {...register('modelId')} />}
      <label className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>输入</label>
      <textarea className={`${inputClass(theme)} min-h-[120px] mt-1`} {...register('prompt')} />
      {errors.prompt && <p className="text-xs text-red-500 mt-1">{errors.prompt.message}</p>}
      {errors.modelId && <p className="text-xs text-red-500 mt-1">{errors.modelId.message}</p>}
      {paramsFields}
      <button type="button" className={`${btnPrimaryClass} mt-3`} onClick={() => void runPlayground()} disabled={playgroundM.isPending || streaming}>
        <Sparkles size={16} className="inline mr-2" />
        {playgroundM.isPending ? '请求中…' : stream ? '开始流式生成' : '运行'}
      </button>
      {layout === 'stack' && !stream ? (
        out ? <pre className={`mt-4 p-3 rounded-xl text-sm whitespace-pre-wrap ${theme === 'light' ? 'bg-slate-50' : 'bg-black/30'}`}>{out}</pre> : null
      ) : (
        outputBlock
      )}
    </>
  );

  if (layout === 'split') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle={m ? `当前：${m.name}` : '选择模型'}>
        <div className="grid lg:grid-cols-3 gap-4">
          {modelPicker}
          <div className={`${cardClass(theme)} p-4 lg:col-span-2`}>{formInner}</div>
        </div>
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle={m ? `当前：${m.name}` : ''}>
      <div className={`${cardClass(theme)} p-5`}>{formInner}</div>
    </UserAppShell>
  );
}

function FineTuneSection({ theme, fontSize, showMessage }: Pick<ModelServiceUserModuleProps, 'theme' | 'fontSize' | 'showMessage'>) {
  const listQ = useFineTuneList();
  const createM = useCreateFineTune();
  const form = useForm<CreateFineTuneFormValues>({
    resolver: zodResolver(createFineTuneSchema),
    defaultValues: { name: '', baseModel: '', datasetId: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createM.mutateAsync({
        name: values.name.trim(),
        baseModel: values.baseModel.trim(),
        datasetId: values.datasetId.trim(),
      });
      form.reset();
      showMessage('任务已排队', 'success');
    } catch (err) {
      showMessage(err instanceof ApiException ? err.message : '提交失败', 'error');
    }
  });

  if (listQ.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="精调任务" subtitle="创建与跟踪微调作业">
        <PageSkeleton type="table" rows={4} />
      </UserAppShell>
    );
  }
  if (listQ.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="精调任务" subtitle="创建与跟踪微调作业">
        <PageError error={listQ.error as Error} onRetry={() => listQ.refetch()} />
      </UserAppShell>
    );
  }

  const jobs = listQ.data ?? [];

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="精调任务" subtitle="创建与跟踪微调作业">
      <form onSubmit={onSubmit} className={`${cardClass(theme)} p-5 space-y-3 mb-4`}>
        <div>
          <input className={inputClass(theme)} placeholder="任务名称" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <input className={inputClass(theme)} placeholder="基座模型 ID / 名称" {...form.register('baseModel')} />
          {form.formState.errors.baseModel && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.baseModel.message}</p>
          )}
        </div>
        <div>
          <input className={inputClass(theme)} placeholder="数据集 ID（或上传后填入）" {...form.register('datasetId')} />
          {form.formState.errors.datasetId && (
            <p className="text-xs text-red-500 mt-1">{form.formState.errors.datasetId.message}</p>
          )}
        </div>
        <input
          type="file"
          className="text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && !form.getValues('datasetId')) {
              form.setValue('datasetId', `local:${f.name}`, { shouldValidate: true });
            }
          }}
        />
        <button type="submit" className={btnPrimaryClass} disabled={createM.isPending}>
          {createM.isPending ? '提交中…' : '提交训练'}
        </button>
      </form>
      <div className={`${cardClass(theme)} overflow-x-auto`}>
        {jobs.length === 0 ? (
          <EmptyState title="暂无精调任务" description="提交训练后将在此跟踪进度" />
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}>
              <tr>
                <th className="text-left p-3">名称</th>
                <th className="text-left p-3">基座</th>
                <th className="text-left p-3">状态</th>
                <th className="text-right p-3">进度</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className={`border-t ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
                  <td className="p-3">{j.name}</td>
                  <td className="p-3 font-mono text-xs">{j.baseModel}</td>
                  <td className="p-3">{j.status}</td>
                  <td className="p-3 text-right">{j.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </UserAppShell>
  );
}

function ModelDistillationSection({ theme, fontSize, showMessage }: Pick<ModelServiceUserModuleProps, 'theme' | 'fontSize' | 'showMessage'>) {
  const [step, setStep] = useState(0);

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="模型蒸馏" subtitle="三步向导（演示）">
      <div className={`${cardClass(theme)} p-5`}>
        <div className="flex gap-2 mb-6">
          {['选教师模型', '配置数据', '提交任务'].map((t, i) => (
            <div
              key={t}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
                step >= i ? 'bg-blue-600 text-white' : theme === 'light' ? 'bg-slate-100' : 'bg-white/10'
              }`}
            >
              {t}
            </div>
          ))}
        </div>
        {step === 0 && (
          <div className="space-y-2">
            <select className={inputClass(theme)}>
              <option>通义-Max（教师）</option>
              <option>GPT-4o（教师）</option>
            </select>
            <button type="button" className={btnPrimaryClass} onClick={() => setStep(1)}>
              下一步
            </button>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-2">
            <input type="file" className="text-sm" />
            <div className="flex gap-2">
              <button type="button" className={btnGhostClass(theme)} onClick={() => setStep(0)}>
                上一步
              </button>
              <button type="button" className={btnPrimaryClass} onClick={() => setStep(2)}>
                下一步
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p className={`mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>确认提交蒸馏任务？</p>
            <div className="flex gap-2">
              <button type="button" className={btnGhostClass(theme)} onClick={() => setStep(1)}>
                上一步
              </button>
              <button type="button" className={btnPrimaryClass} onClick={() => showMessage('蒸馏任务已创建（Mock）', 'success')}>
                提交
              </button>
            </div>
          </div>
        )}
      </div>
    </UserAppShell>
  );
}

export const ModelServiceUserModule: React.FC<ModelServiceUserModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  const [prompt, setPrompt] = useState('请用一句话介绍本校图书馆开放时间。');
  const [out, setOut] = useState('');
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'done'>('idle');
  const [promptStudio, setPromptStudio] = useState('你是助手...\n\n用户：{{query}}');
  const [compareA, setCompareA] = useState('通义-Turbo');
  const [compareB, setCompareB] = useState('GPT-4o-mini');
  const [compareOut, setCompareOut] = useState('');

  const submitBatch = () => {
    if (!batchFile) {
      showMessage('请选择文件', 'error');
      return;
    }
    setJobStatus('queued');
    window.setTimeout(() => {
      setJobStatus('done');
      showMessage('批量任务已完成（Mock）', 'success');
    }, 1500);
  };

  const runCompare = () => {
    setCompareOut(
      `【${compareA}】响应更正式，引用条款更完整。\n【${compareB}】措辞更口语，长度更短。\n（Mock 对比结论）`
    );
    showMessage('对比完成', 'success');
  };

  if (PLAYGROUND_TYPES.includes(activeSubItem)) {
    return <ModelPlaygroundSection activeSubItem={activeSubItem} theme={theme} fontSize={fontSize} showMessage={showMessage} layout="split" stream={false} />;
  }

  if (activeSubItem === '在线推理') {
    return <ModelPlaygroundSection activeSubItem={activeSubItem} theme={theme} fontSize={fontSize} showMessage={showMessage} layout="stack" stream={false} />;
  }

  if (activeSubItem === '批量推理') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="批量推理" subtitle="上传 JSONL 一行一条输入">
        <div className={`${cardClass(theme)} p-5 space-y-4`}>
          <input type="file" accept=".jsonl,.txt" onChange={(e) => setBatchFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <div className="text-sm text-slate-500">状态：{jobStatus === 'idle' ? '待提交' : jobStatus === 'queued' ? '排队中…' : '已完成'}</div>
          <button type="button" className={btnPrimaryClass} onClick={submitBatch}>
            提交任务
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '流式输出') {
    return <ModelPlaygroundSection activeSubItem={activeSubItem} theme={theme} fontSize={fontSize} showMessage={showMessage} layout="stack" stream />;
  }

  if (activeSubItem === 'Prompt工程' || activeSubItem === 'Prompt 工程') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="Prompt 工程" subtitle="模板编辑与变量占位">
        <div className={`${cardClass(theme)} p-5 space-y-3`}>
          <textarea className={`${inputClass(theme)} min-h-[200px] font-mono text-sm`} value={promptStudio} onChange={(e) => setPromptStudio(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className={btnPrimaryClass} onClick={() => showMessage('模板已保存', 'success')}>
              保存模板
            </button>
            <button
              type="button"
              className={btnGhostClass(theme)}
              onClick={() => {
                setOut(promptStudio.replace('{{query}}', prompt));
                showMessage('已预览渲染', 'info');
              }}
            >
              预览渲染
            </button>
          </div>
          {out && <pre className={`p-3 rounded-xl text-xs whitespace-pre-wrap ${theme === 'light' ? 'bg-slate-50' : 'bg-black/30'}`}>{out}</pre>}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '精调任务') {
    return <FineTuneSection theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  }

  if (activeSubItem === '评测对比') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="评测对比" subtitle="同一 Prompt 下对比回复风格">
        <div className={`${cardClass(theme)} p-5 space-y-3`}>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={inputClass(theme)} value={compareA} onChange={(e) => setCompareA(e.target.value)} />
            <input className={inputClass(theme)} value={compareB} onChange={(e) => setCompareB(e.target.value)} />
          </div>
          <textarea className={`${inputClass(theme)} min-h-[80px]`} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button type="button" className={btnPrimaryClass} onClick={runCompare}>
            运行对比
          </button>
          {compareOut && <pre className={`p-3 rounded-xl text-sm whitespace-pre-wrap ${theme === 'light' ? 'bg-slate-50' : 'bg-black/30'}`}>{compareOut}</pre>}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '模型蒸馏') {
    return <ModelDistillationSection theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择左侧子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

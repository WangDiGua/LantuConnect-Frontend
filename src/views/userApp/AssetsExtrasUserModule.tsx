import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from './UserAppShell';
import {
  usePromptList,
  useCreatePrompt,
  useUpdatePrompt,
  useDeletePrompt,
  useTermList,
  useCreateTerm,
  useDeleteTerm,
  useSecretList,
  useCreateSecret,
  useDeleteSecret,
  useMemoryList,
  useCreateMemory,
  useDeleteMemory,
  useDocumentList,
  useUploadDocument,
} from '../../hooks/queries/useAsset';
import { createPromptSchema, createTermSchema, createSecretSchema, type CreatePromptFormValues, type CreateTermFormValues, type CreateSecretFormValues } from '../../schemas/asset.schema';
import type { PromptTemplate } from '../../types/dto/asset';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ApiException } from '../../types/api';

interface AssetsExtrasUserModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface MockCard {
  id: string;
  title: string;
  content: string;
}

type ShellProps = Pick<AssetsExtrasUserModuleProps, 'theme' | 'fontSize' | 'showMessage'>;

const INITIAL_CARDS: MockCard[] = [
  { id: 'card1', title: '欢迎语', content: '您好，我是校园助手，请问需要什么帮助？' },
];

const DOC_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  processing: '解析中',
  done: '已向量化',
  failed: '失败',
};

function DocumentImportSection({ theme, fontSize, showMessage }: ShellProps) {
  const listQ = useDocumentList();
  const uploadM = useUploadDocument();
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (listQ.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="文档导入" subtitle="上传到知识库处理队列">
        <PageSkeleton type="table" rows={4} />
      </UserAppShell>
    );
  }
  if (listQ.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="文档导入" subtitle="上传到知识库处理队列">
        <PageError error={listQ.error as Error} onRetry={() => listQ.refetch()} />
      </UserAppShell>
    );
  }

  const docs = listQ.data ?? [];

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="文档导入" subtitle="上传到知识库处理队列">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const fd = new FormData();
          fd.append('file', file);
          try {
            await uploadM.mutateAsync(fd);
            showMessage('已加入处理队列', 'success');
          } catch (err) {
            showMessage(err instanceof ApiException ? err.message : '上传失败', 'error');
          }
        }}
      />
      <div
        className={`${cardClass(theme)} p-8 border-dashed border-2 text-center mb-4 cursor-pointer ${
          theme === 'light' ? 'border-slate-300 hover:bg-slate-50' : 'border-white/20 hover:bg-white/5'
        }`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <Upload className="mx-auto mb-2 opacity-60" size={32} />
        <div className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
          {uploadM.isPending ? '上传中…' : '点击选择文件上传'}
        </div>
      </div>
      <div className={cardClass(theme)}>
        {docs.length === 0 ? (
          <EmptyState title="暂无导入记录" description="上传文档后将在此显示处理状态" />
        ) : (
          docs.map((im) => (
            <div
              key={im.id}
              className={`p-4 flex justify-between border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
            >
              <div>
                <div className={theme === 'dark' ? 'text-white font-medium' : 'text-slate-900 font-medium'}>{im.fileName}</div>
                <div className="text-xs text-slate-500">{im.createdAt}</div>
              </div>
              <span className="text-sm text-blue-600">{DOC_STATUS_LABEL[im.status] ?? im.status}</span>
            </div>
          ))
        )}
      </div>
    </UserAppShell>
  );
}

function PromptTemplatesSection({ theme, fontSize, showMessage }: ShellProps) {
  const listQ = usePromptList();
  const createM = useCreatePrompt();
  const updateM = useUpdatePrompt();
  const deleteM = useDeletePrompt();
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createForm = useForm<CreatePromptFormValues>({
    resolver: zodResolver(createPromptSchema),
    defaultValues: { name: '', content: '' },
  });

  const editForm = useForm<CreatePromptFormValues>({
    resolver: zodResolver(createPromptSchema),
    defaultValues: { name: '', content: '' },
  });

  React.useEffect(() => {
    if (editingPrompt && editingPrompt.id !== '__new__') {
      editForm.reset({ name: editingPrompt.name, content: editingPrompt.content });
    }
  }, [editingPrompt, editForm]);

  if (listQ.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="Prompt 模板" subtitle="增删改与快速复制">
        <PageSkeleton type="cards" />
      </UserAppShell>
    );
  }
  if (listQ.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="Prompt 模板" subtitle="增删改与快速复制">
        <PageError error={listQ.error as Error} onRetry={() => listQ.refetch()} />
      </UserAppShell>
    );
  }

  const prompts = listQ.data ?? [];

  const openCreate = () => {
    createForm.reset({ name: '', content: '' });
    setEditingPrompt({ id: '__new__', name: '', content: '', updatedAt: '' });
  };

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    try {
      await createM.mutateAsync({ name: values.name, content: values.content });
      setEditingPrompt(null);
      createForm.reset();
      showMessage('已创建', 'success');
    } catch (err) {
      showMessage(err instanceof ApiException ? err.message : '创建失败', 'error');
    }
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    if (!editingPrompt || editingPrompt.id === '__new__') return;
    try {
      await updateM.mutateAsync({ id: editingPrompt.id, data: { name: values.name, content: values.content } });
      setEditingPrompt(null);
      showMessage('已保存', 'success');
    } catch (err) {
      showMessage(err instanceof ApiException ? err.message : '保存失败', 'error');
    }
  });

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="Prompt 模板" subtitle="增删改与快速复制">
      <button type="button" className={`${btnPrimaryClass} mb-4`} onClick={openCreate}>
        新建模板
      </button>
      <div className="space-y-3">
        {prompts.length === 0 ? (
          <EmptyState title="暂无模板" description="点击「新建模板」创建第一条 Prompt" action={<button className={btnPrimaryClass} onClick={openCreate}>新建模板</button>} />
        ) : (
          prompts.map((p) => (
            <div key={p.id} className={`${cardClass(theme)} p-4`}>
              <div className="flex justify-between gap-2 mb-2">
                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.name}</span>
                <div className="flex gap-2">
                  <button type="button" className={btnGhostClass(theme)} onClick={() => setEditingPrompt(p)}>
                    编辑
                  </button>
                  <button type="button" className="text-sm text-red-500" onClick={() => setDeleteId(p.id)}>
                    删除
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">{p.content || '（空）'}</p>
            </div>
          ))
        )}
      </div>

      {editingPrompt?.id === '__new__' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-lg rounded-2xl p-5 ${cardClass(theme)}`}>
            <form onSubmit={onCreateSubmit} className="space-y-2">
              <input className={`${inputClass(theme)} mb-2`} placeholder="名称" {...createForm.register('name')} />
              {createForm.formState.errors.name && <p className="text-xs text-red-500">{createForm.formState.errors.name.message}</p>}
              <textarea className={`${inputClass(theme)} min-h-[160px] font-mono text-sm`} placeholder="内容" {...createForm.register('content')} />
              {createForm.formState.errors.content && <p className="text-xs text-red-500">{createForm.formState.errors.content.message}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className={btnGhostClass(theme)} onClick={() => setEditingPrompt(null)}>
                  取消
                </button>
                <button type="submit" className={btnPrimaryClass} disabled={createM.isPending}>
                  {createM.isPending ? '创建中…' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPrompt && editingPrompt.id !== '__new__' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-lg rounded-2xl p-5 ${cardClass(theme)}`}>
            <form onSubmit={onEditSubmit} className="space-y-2">
              <input className={`${inputClass(theme)} mb-2`} {...editForm.register('name')} />
              {editForm.formState.errors.name && <p className="text-xs text-red-500">{editForm.formState.errors.name.message}</p>}
              <textarea className={`${inputClass(theme)} min-h-[160px] font-mono text-sm`} {...editForm.register('content')} />
              {editForm.formState.errors.content && <p className="text-xs text-red-500">{editForm.formState.errors.content.message}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className={btnGhostClass(theme)} onClick={() => setEditingPrompt(null)}>
                  取消
                </button>
                <button type="submit" className={btnPrimaryClass} disabled={updateM.isPending}>
                  {updateM.isPending ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="删除模板"
        message="确定删除该 Prompt 模板？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        loading={deleteM.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteM.mutateAsync(deleteId);
            setDeleteId(null);
            showMessage('已删除', 'success');
          } catch (err) {
            showMessage(err instanceof ApiException ? err.message : '删除失败', 'error');
          }
        }}
      />
    </UserAppShell>
  );
}

function TermsSection({ theme, fontSize, showMessage }: ShellProps) {
  const listQ = useTermList();
  const createM = useCreateTerm();
  const deleteM = useDeleteTerm();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const form = useForm<CreateTermFormValues>({
    resolver: zodResolver(createTermSchema),
    defaultValues: { term: '', definition: '' },
  });

  if (listQ.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="专业词库" subtitle="术语与释义">
        <PageSkeleton type="table" rows={6} />
      </UserAppShell>
    );
  }
  if (listQ.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="专业词库" subtitle="术语与释义">
        <PageError error={listQ.error as Error} onRetry={() => listQ.refetch()} />
      </UserAppShell>
    );
  }

  const terms = listQ.data ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createM.mutateAsync(values);
      form.reset();
      showMessage('已添加', 'success');
    } catch (err) {
      showMessage(err instanceof ApiException ? err.message : '添加失败', 'error');
    }
  });

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="专业词库" subtitle="术语与释义">
      <form onSubmit={onSubmit} className={`${cardClass(theme)} p-4 mb-4 flex flex-wrap gap-2 items-start`}>
        <div className="flex flex-col gap-1">
          <input className={inputClass(theme)} placeholder="术语" {...form.register('term')} />
          {form.formState.errors.term && <span className="text-xs text-red-500">{form.formState.errors.term.message}</span>}
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <input className={inputClass(theme)} placeholder="释义" {...form.register('definition')} />
          {form.formState.errors.definition && <span className="text-xs text-red-500">{form.formState.errors.definition.message}</span>}
        </div>
        <button type="submit" className={btnPrimaryClass} disabled={createM.isPending}>
          {createM.isPending ? '添加中…' : '添加'}
        </button>
      </form>
      <div className={cardClass(theme)}>
        {terms.length === 0 ? (
          <EmptyState title="暂无术语" description="在上方添加专业词汇与释义" />
        ) : (
          terms.map((t) => (
            <div
              key={t.id}
              className={`p-4 flex justify-between gap-3 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
            >
              <div>
                <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.term}</div>
                <div className="text-sm text-slate-500">{t.definition}</div>
              </div>
              <button type="button" className="text-red-500 text-sm" onClick={() => setDeleteId(t.id)}>
                删除
              </button>
            </div>
          ))
        )}
      </div>
      <ConfirmDialog
        open={!!deleteId}
        title="删除术语"
        message="确定从词库中删除该术语？"
        confirmText="删除"
        variant="danger"
        loading={deleteM.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteM.mutateAsync(deleteId);
            setDeleteId(null);
            showMessage('已删除', 'success');
          } catch (err) {
            showMessage(err instanceof ApiException ? err.message : '删除失败', 'error');
          }
        }}
      />
    </UserAppShell>
  );
}

function DialogCardsSection({ theme, fontSize, showMessage }: ShellProps) {
  const [cards, setCards] = useState<MockCard[]>(() => [...INITIAL_CARDS]);
  const [newCard, setNewCard] = useState({ title: '', content: '' });

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="对话卡片" subtitle="可复用的开场与结构化回复">
      <div className={`${cardClass(theme)} p-4 mb-4 space-y-2`}>
        <input className={inputClass(theme)} placeholder="标题" value={newCard.title} onChange={(e) => setNewCard((c) => ({ ...c, title: e.target.value }))} />
        <textarea className={`${inputClass(theme)} min-h-[80px]`} placeholder="内容" value={newCard.content} onChange={(e) => setNewCard((c) => ({ ...c, content: e.target.value }))} />
        <button
          type="button"
          className={btnPrimaryClass}
          onClick={() => {
            if (!newCard.title.trim()) return;
            setCards((prev) => [...prev, { id: `c${Date.now()}`, ...newCard }]);
            setNewCard({ title: '', content: '' });
            showMessage('卡片已创建', 'success');
          }}
        >
          添加卡片
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {cards.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState title="暂无卡片" description="添加可复用的对话卡片" />
          </div>
        ) : (
          cards.map((c) => (
            <div key={c.id} className={`${cardClass(theme)} p-4`}>
              <div className="font-semibold mb-2">{c.title}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </UserAppShell>
  );
}

function MemoriesSection({ theme, fontSize, showMessage }: ShellProps) {
  const listQ = useMemoryList();
  const createM = useCreateMemory();
  const deleteM = useDeleteMemory();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newMem, setNewMem] = useState({ userId: '', content: '' });

  if (listQ.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="长期记忆" subtitle="按用户维度存储偏好与事实">
        <PageSkeleton type="table" rows={5} />
      </UserAppShell>
    );
  }
  if (listQ.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="长期记忆" subtitle="按用户维度存储偏好与事实">
        <PageError error={listQ.error as Error} onRetry={() => listQ.refetch()} />
      </UserAppShell>
    );
  }

  const memories = listQ.data ?? [];

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="长期记忆" subtitle="按用户维度存储偏好与事实">
      <div className={`${cardClass(theme)} p-4 mb-4 space-y-2`}>
        <input className={inputClass(theme)} placeholder="用户 ID" value={newMem.userId} onChange={(e) => setNewMem((m) => ({ ...m, userId: e.target.value }))} />
        <textarea className={`${inputClass(theme)} min-h-[72px]`} placeholder="记忆内容" value={newMem.content} onChange={(e) => setNewMem((m) => ({ ...m, content: e.target.value }))} />
        <button
          type="button"
          className={btnPrimaryClass}
          disabled={createM.isPending}
          onClick={async () => {
            if (!newMem.userId.trim() || !newMem.content.trim()) return;
            try {
              await createM.mutateAsync({ userId: newMem.userId, content: newMem.content });
              setNewMem({ userId: '', content: '' });
              showMessage('记忆已写入', 'success');
            } catch (err) {
              showMessage(err instanceof ApiException ? err.message : '写入失败', 'error');
            }
          }}
        >
          {createM.isPending ? '写入中…' : '添加记忆'}
        </button>
      </div>
      <div className={cardClass(theme)}>
        {memories.length === 0 ? (
          <EmptyState title="暂无记忆条目" description="为用户添加长期记忆后将显示在此" />
        ) : (
          memories.map((m) => (
            <div key={m.id} className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div className="text-xs text-slate-500">
                {m.userId} · {m.updatedAt}
              </div>
              <div className={`mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{m.content}</div>
              <button type="button" className="text-red-500 text-sm mt-2" onClick={() => setDeleteId(m.id)}>
                删除
              </button>
            </div>
          ))
        )}
      </div>
      <ConfirmDialog
        open={!!deleteId}
        title="删除记忆"
        message="确定删除该条记忆？"
        confirmText="删除"
        variant="danger"
        loading={deleteM.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteM.mutateAsync(deleteId);
            setDeleteId(null);
            showMessage('已删除', 'success');
          } catch (err) {
            showMessage(err instanceof ApiException ? err.message : '删除失败', 'error');
          }
        }}
      />
    </UserAppShell>
  );
}

function SecretsSection({ theme, fontSize, showMessage }: ShellProps) {
  const listQ = useSecretList();
  const createM = useCreateSecret();
  const deleteM = useDeleteSecret();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const form = useForm<CreateSecretFormValues>({
    resolver: zodResolver(createSecretSchema),
    defaultValues: { key: '', value: '', scope: 'project' },
  });

  if (listQ.isLoading) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="变量与密钥" subtitle="运行时可注入的环境变量（脱敏显示）">
        <PageSkeleton type="table" rows={5} />
      </UserAppShell>
    );
  }
  if (listQ.isError) {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="变量与密钥" subtitle="运行时可注入的环境变量（脱敏显示）">
        <PageError error={listQ.error as Error} onRetry={() => listQ.refetch()} />
      </UserAppShell>
    );
  }

  const secrets = listQ.data ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createM.mutateAsync(values);
      form.reset({ key: '', value: '', scope: 'project' });
      showMessage('密钥已保存', 'success');
    } catch (err) {
      showMessage(err instanceof ApiException ? err.message : '保存失败', 'error');
    }
  });

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title="变量与密钥" subtitle="运行时可注入的环境变量（脱敏显示）">
      <form onSubmit={onSubmit} className={`${cardClass(theme)} p-4 mb-4 space-y-2`}>
        <div className="flex flex-col gap-1">
          <input className={inputClass(theme)} placeholder="变量名 KEY（大写字母、数字、下划线）" {...form.register('key')} />
          {form.formState.errors.key && <span className="text-xs text-red-500">{form.formState.errors.key.message}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <input className={inputClass(theme)} placeholder="值" type="password" {...form.register('value')} />
          {form.formState.errors.value && <span className="text-xs text-red-500">{form.formState.errors.value.message}</span>}
        </div>
        <select className={inputClass(theme)} {...form.register('scope')}>
          <option value="project">作用域：项目</option>
          <option value="global">作用域：全局</option>
        </select>
        <button type="submit" className={btnPrimaryClass} disabled={createM.isPending}>
          {createM.isPending ? '添加中…' : '添加'}
        </button>
      </form>
      <div className={cardClass(theme)}>
        {secrets.length === 0 ? (
          <EmptyState title="暂无密钥" description="添加运行时可注入的变量" />
        ) : (
          secrets.map((s) => (
            <div
              key={s.id}
              className={`p-4 flex justify-between items-center gap-2 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
            >
              <div>
                <div className="font-mono text-sm">{s.key}</div>
                <div className="text-xs text-slate-500">
                  {s.masked} · {s.scope}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('密钥轮换请联系管理员', 'info')}>
                  轮换
                </button>
                <button type="button" className="text-red-500 text-sm" onClick={() => setDeleteId(s.id)}>
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <ConfirmDialog
        open={!!deleteId}
        title="删除密钥"
        message="确定删除该变量？依赖此密钥的应用可能无法运行。"
        confirmText="删除"
        variant="danger"
        loading={deleteM.isPending}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteM.mutateAsync(deleteId);
            setDeleteId(null);
            showMessage('已删除', 'success');
          } catch (err) {
            showMessage(err instanceof ApiException ? err.message : '删除失败', 'error');
          }
        }}
      />
    </UserAppShell>
  );
}

export const AssetsExtrasUserModule: React.FC<AssetsExtrasUserModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  const shell: ShellProps = { theme, fontSize, showMessage };

  if (activeSubItem === '文档导入') {
    return <DocumentImportSection {...shell} />;
  }

  if (activeSubItem === 'Prompt模板' || activeSubItem === 'Prompt 模板') {
    return <PromptTemplatesSection {...shell} />;
  }

  if (activeSubItem === '专业词库') {
    return <TermsSection {...shell} />;
  }

  if (activeSubItem === '对话卡片') {
    return <DialogCardsSection {...shell} />;
  }

  if (activeSubItem === '长期记忆') {
    return <MemoriesSection {...shell} />;
  }

  if (activeSubItem === '变量与密钥') {
    return <SecretsSection {...shell} />;
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择左侧子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

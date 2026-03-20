import React, { useState } from 'react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from '../userApp/UserAppShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  useAdminOpsQueue,
  useUpdateOpsItem,
  useAdminSensitiveWords,
  useAddSensitiveWord,
  useDeleteSensitiveWord,
  useAdminAnnouncements,
} from '../../hooks/queries/useAdmin';

interface Props {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminOpsSecurityModule: React.FC<Props> = ({ activeSubItem, theme, fontSize, showMessage }) => {
  const [templates, setTemplates] = useState<{ id: string; name: string; level: string }[]>([
    { id: 'tp1', name: '教育场景-严格', level: '高' },
  ]);
  const [tplApps, setTplApps] = useState<{ id: string; title: string; status: string }[]>([
    { id: 'a1', title: '迎新助手模板', status: '待审' },
  ]);
  const [announce, setAnnounce] = useState({ title: '', body: '' });
  const [squareFeatured, setSquareFeatured] = useState<string[]>(['校园助手', '代码评审']);
  const [newWord, setNewWord] = useState('');
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [opsSearch, setOpsSearch] = useState('');

  const opsQ = useAdminOpsQueue();
  const updateOpsMut = useUpdateOpsItem();
  const wordsQ = useAdminSensitiveWords();
  const addWordMut = useAddSensitiveWord();
  const deleteWordMut = useDeleteSensitiveWord();
  const announcementsQ = useAdminAnnouncements();

  if (activeSubItem === '内容审核') {
    if (opsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="内容审核队列" subtitle="人机协同复核">
          <PageSkeleton type="cards" rows={5} />
        </UserAppShell>
      );
    }
    if (opsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="内容审核队列" subtitle="人机协同复核">
          <PageError error={opsQ.error instanceof Error ? opsQ.error : null} onRetry={() => opsQ.refetch()} />
        </UserAppShell>
      );
    }
    const rawQueue = opsQ.data ?? [];
    const opsSearchLower = opsSearch.trim().toLowerCase();
    const queue = opsSearchLower
      ? rawQueue.filter((c) => `${c.type}${c.content}${c.status}${c.risk}`.toLowerCase().includes(opsSearchLower))
      : rawQueue;
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="内容审核队列" subtitle="人机协同复核">
        <div className="flex flex-wrap gap-2 mb-4">
          <input className={`${inputClass(theme)} max-w-xs`} placeholder="筛选类型/内容/风险…" value={opsSearch} onChange={(e) => setOpsSearch(e.target.value)} />
        </div>
        {queue.length === 0 ? (
          <EmptyState title="队列为空" description="暂无待审核内容" />
        ) : (
          <div className="space-y-3">
            {queue.map((c) => (
              <div key={c.id} className={`${cardClass(theme)} p-4`}>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-500/20">{c.type}</span>
                  <span className="text-xs text-slate-500">风险 {c.risk}</span>
                </div>
                <p className="mt-2 text-sm">{c.content}</p>
                <div className="text-xs text-slate-400 mt-1">状态：{c.status}</div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    className={btnPrimaryClass}
                    disabled={updateOpsMut.isPending}
                    onClick={() =>
                      updateOpsMut.mutate(
                        { id: c.id, data: { status: '已拦截' } },
                        {
                          onSuccess: () => showMessage('已拦截', 'success'),
                          onError: (err) => showMessage(err instanceof Error ? err.message : '操作失败', 'error'),
                        }
                      )
                    }
                  >
                    拦截
                  </button>
                  <button
                    type="button"
                    className={btnGhostClass(theme)}
                    disabled={updateOpsMut.isPending}
                    onClick={() =>
                      updateOpsMut.mutate(
                        { id: c.id, data: { status: '已放行' } },
                        {
                          onSuccess: () => showMessage('已放行', 'info'),
                          onError: (err) => showMessage(err instanceof Error ? err.message : '操作失败', 'error'),
                        }
                      )
                    }
                  >
                    放行
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '敏感词库') {
    if (wordsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="敏感词库" subtitle="命中即拦截或替换">
          <PageSkeleton type="form" />
        </UserAppShell>
      );
    }
    if (wordsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="敏感词库" subtitle="命中即拦截或替换">
          <PageError error={wordsQ.error instanceof Error ? wordsQ.error : null} onRetry={() => wordsQ.refetch()} />
        </UserAppShell>
      );
    }
    const words = wordsQ.data ?? [];
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="敏感词库" subtitle="命中即拦截或替换">
        <ConfirmDialog
          open={!!wordToDelete}
          title="删除敏感词"
          message={wordToDelete ? `确定从词库中移除「${wordToDelete}」？` : ''}
          confirmText="删除"
          variant="danger"
          loading={deleteWordMut.isPending}
          onCancel={() => setWordToDelete(null)}
          onConfirm={() => {
            if (!wordToDelete) return;
            deleteWordMut.mutate(wordToDelete, {
              onSuccess: () => {
                showMessage('已删除', 'info');
                setWordToDelete(null);
              },
              onError: (err) => showMessage(err instanceof Error ? err.message : '删除失败', 'error'),
            });
          }}
        />
        <div className={`${cardClass(theme)} p-4 flex flex-wrap gap-2 mb-4`}>
          <input className={inputClass(theme)} placeholder="新词条" value={newWord} onChange={(e) => setNewWord(e.target.value)} />
          <button
            type="button"
            className={btnPrimaryClass}
            disabled={addWordMut.isPending}
            onClick={() => {
              const w = newWord.trim();
              if (!w) return;
              addWordMut.mutate(w, {
                onSuccess: () => {
                  setNewWord('');
                  showMessage('已加入词库', 'success');
                },
                onError: (err) => showMessage(err instanceof Error ? err.message : '添加失败', 'error'),
              });
            }}
          >
            添加
          </button>
        </div>
        {words.length === 0 ? (
          <EmptyState title="词库为空" description="添加词条后将在此展示" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <button
                key={w}
                type="button"
                className={`px-3 py-1.5 rounded-xl text-sm border ${theme === 'light' ? 'border-slate-200' : 'border-white/15'}`}
                onClick={() => setWordToDelete(w)}
              >
                {w} ×
              </button>
            ))}
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '策略模板') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="安全策略模板" subtitle="一键下发到工作空间">
        <button
          type="button"
          className={`${btnPrimaryClass} mb-4`}
          onClick={() => {
            setTemplates((prev) => [...prev, { id: `tp${Date.now()}`, name: `模板 ${prev.length + 1}`, level: '中' }]);
            showMessage('已创建模板草稿', 'success');
          }}
        >
          新建模板
        </button>
        <div className={cardClass(theme)}>
          {templates.map((t) => (
            <div key={t.id} className={`p-4 flex justify-between border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-slate-500">级别 {t.level}</div>
              </div>
              <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已下发 12 个工作空间（Mock）', 'success')}>
                下发
              </button>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '应用模板审核') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="应用模板审核" subtitle="广场模板上架前审核">
        <div className="space-y-3">
          {tplApps.map((a) => (
            <div key={a.id} className={`${cardClass(theme)} p-4 flex justify-between`}>
              <div className="font-medium">{a.title}</div>
              {a.status === '待审' && (
                <button
                  type="button"
                  className={btnPrimaryClass}
                  onClick={() => {
                    setTplApps((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: '已上架' } : x)));
                    showMessage('已批准上架', 'success');
                  }}
                >
                  批准上架
                </button>
              )}
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '广场运营') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="广场运营" subtitle="精选位与排序（Mock）">
        <div className={`${cardClass(theme)} p-4 mb-4`}>
          <div className="text-sm font-medium mb-2">精选 Agent</div>
          {squareFeatured.map((name) => (
            <div
              key={name}
              className={`flex justify-between py-2 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
            >
              <span>{name}</span>
              <button type="button" className="text-red-500 text-sm" onClick={() => setSquareFeatured((p) => p.filter((x) => x !== name))}>
                移除
              </button>
            </div>
          ))}
          <button type="button" className={`${btnGhostClass(theme)} mt-3`} onClick={() => setSquareFeatured((p) => [...p, `精选_${p.length + 1}`])}>
            添加精选
          </button>
        </div>
        <button type="button" className={btnPrimaryClass} onClick={() => showMessage('广场配置已发布', 'success')}>
          发布配置
        </button>
      </UserAppShell>
    );
  }

  if (activeSubItem === '公告管理') {
    if (announcementsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="公告管理" subtitle="全站通知与维护窗">
          <PageSkeleton type="detail" />
        </UserAppShell>
      );
    }
    if (announcementsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="公告管理" subtitle="全站通知与维护窗">
          <PageError error={announcementsQ.error instanceof Error ? announcementsQ.error : null} onRetry={() => announcementsQ.refetch()} />
        </UserAppShell>
      );
    }
    const announcements = announcementsQ.data ?? [];
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="公告管理" subtitle="全站通知与维护窗">
        {announcements.length === 0 ? (
          <EmptyState title="暂无公告" description="接口返回的公告将显示在下方" />
        ) : (
          <div className={`${cardClass(theme)} mb-6`}>
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
              >
                <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{a.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {a.type} · {a.status}
                  {a.publishedAt ? ` · ${a.publishedAt}` : ''}
                </div>
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">{a.content}</p>
              </div>
            ))}
          </div>
        )}
        <div className={`${cardClass(theme)} p-4 max-w-xl space-y-3`}>
          <input className={inputClass(theme)} placeholder="标题" value={announce.title} onChange={(e) => setAnnounce((x) => ({ ...x, title: e.target.value }))} />
          <textarea className={`${inputClass(theme)} min-h-[100px]`} placeholder="正文" value={announce.body} onChange={(e) => setAnnounce((x) => ({ ...x, body: e.target.value }))} />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              if (!announce.title.trim()) {
                showMessage('请填写标题', 'error');
                return;
              }
              showMessage('公告已推送（Mock）', 'success');
            }}
          >
            立即推送
          </button>
        </div>
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};

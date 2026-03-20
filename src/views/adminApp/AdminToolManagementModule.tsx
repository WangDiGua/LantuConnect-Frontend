import React, { useState } from 'react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from '../userApp/UserAppShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAdminToolReviews, useUpdateToolReview } from '../../hooks/queries/useAdmin';

interface Props {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminToolManagementModule: React.FC<Props> = ({ activeSubItem, theme, fontSize, showMessage }) => {
  const [tools, setTools] = useState<{ id: string; name: string; owner: string; public: boolean }[]>([
    { id: 'x1', name: '官方天气', owner: 'platform', public: true },
  ]);
  const [cats, setCats] = useState<string[]>(['办公', '教务', '科研']);
  const [newCat, setNewCat] = useState('');
  const [signFile, setSignFile] = useState('');
  const [mcpList, setMcpList] = useState<{ id: string; name: string; version: string }[]>([
    { id: 'mc1', name: 'filesystem', version: '1.2.0' },
  ]);

  const [reviewSearch, setReviewSearch] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);

  const reviewsQ = useAdminToolReviews();
  const updateReviewMut = useUpdateToolReview();

  if (activeSubItem === 'tool-review') {
    if (reviewsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="工具审核" subtitle="上架前安全与合规检查">
          <PageSkeleton type="cards" rows={4} />
        </UserAppShell>
      );
    }
    if (reviewsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="工具审核" subtitle="上架前安全与合规检查">
          <PageError error={reviewsQ.error instanceof Error ? reviewsQ.error : null} onRetry={() => reviewsQ.refetch()} />
        </UserAppShell>
      );
    }
    const allReviews = reviewsQ.data ?? [];
    const reviewSearchLower = reviewSearch.trim().toLowerCase();
    const reviews = reviewSearchLower
      ? allReviews.filter((r) => `${r.title}${r.submitter}${r.status}${r.description ?? ''}`.toLowerCase().includes(reviewSearchLower))
      : allReviews;
    const rejectTarget = rejectId ? allReviews.find((r) => r.id === rejectId) : undefined;
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="工具审核" subtitle="上架前安全与合规检查">
        <ConfirmDialog
          open={!!rejectId}
          title="驳回工具"
          message={rejectTarget ? `确定驳回「${rejectTarget.title}」？提交者将收到通知。` : ''}
          confirmText="驳回"
          variant="danger"
          loading={updateReviewMut.isPending}
          onCancel={() => setRejectId(null)}
          onConfirm={() => {
            if (!rejectId) return;
            updateReviewMut.mutate(
              { id: rejectId, data: { status: 'rejected' } },
              {
                onSuccess: () => {
                  showMessage('已驳回', 'info');
                  setRejectId(null);
                },
                onError: (err) => showMessage(err instanceof Error ? err.message : '操作失败', 'error'),
              }
            );
          }}
        />
        <div className="mb-4">
          <input className={`${inputClass(theme)} max-w-xs`} placeholder="搜索工具名/提交者…" value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)} />
        </div>
        {reviews.length === 0 ? (
          <EmptyState title="暂无待审" description={allReviews.length > 0 ? '无匹配结果，尝试调整搜索条件' : '新的工具上架申请将出现在此列表'} />
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className={`${cardClass(theme)} p-4 flex flex-wrap justify-between gap-3`}>
                <div>
                  <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{r.title}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {r.submitter} · {r.at}
                  </div>
                  <div className="text-xs mt-1">{r.status}</div>
                  {r.description ? <div className="text-xs text-slate-400 mt-1 max-w-xl">{r.description}</div> : null}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnPrimaryClass}
                      disabled={updateReviewMut.isPending}
                      onClick={() =>
                        updateReviewMut.mutate(
                          { id: r.id, data: { status: 'approved' } },
                          {
                            onSuccess: () => showMessage('已通过', 'success'),
                            onError: (err) => showMessage(err instanceof Error ? err.message : '操作失败', 'error'),
                          }
                        )
                      }
                    >
                      通过
                    </button>
                    <button
                      type="button"
                      className={btnGhostClass(theme)}
                      disabled={updateReviewMut.isPending}
                      onClick={() => setRejectId(r.id)}
                    >
                      驳回
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === 'mcp-review') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="MCP 审核" subtitle="Server 清单与版本核验">
        <div className={cardClass(theme)}>
          {mcpList.map((m) => (
            <div
              key={m.id}
              className={`p-4 flex justify-between border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
            >
              <div>
                <div className="font-mono">{m.name}</div>
                <div className="text-xs text-slate-500">v{m.version}</div>
              </div>
              <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已标记为可信（Mock）', 'success')}>
                标记可信
              </button>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'plugin-signature') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="插件签名" subtitle="上传构建产物校验签名链（Mock）">
        <div className={`${cardClass(theme)} p-4 max-w-xl space-y-3`}>
          <input className={inputClass(theme)} placeholder="插件包 URL 或路径" value={signFile} onChange={(e) => setSignFile(e.target.value)} />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              if (!signFile.trim()) return;
              showMessage('验签通过 · SHA256 已归档', 'success');
            }}
          >
            开始验签
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '工具管理') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="工具管理" subtitle="全站工具实例">
        <button
          type="button"
          className={`${btnPrimaryClass} mb-4`}
          onClick={() => {
            setTools((prev) => [...prev, { id: `x${Date.now()}`, name: `工具_${prev.length}`, owner: 'tenant', public: false }]);
            showMessage('已创建占位工具', 'success');
          }}
        >
          新建工具
        </button>
        <div className={cardClass(theme)}>
          {tools.map((t) => (
            <div key={t.id} className={`p-4 flex justify-between border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-slate-500">{t.owner}</div>
              </div>
              <button
                type="button"
                className={btnGhostClass(theme)}
                onClick={() => {
                  setTools((prev) => prev.map((x) => (x.id === t.id ? { ...x, public: !x.public } : x)));
                  showMessage('可见性已更新', 'success');
                }}
              >
                {t.public ? '下架' : '公开'}
              </button>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'MCP Server 管理') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="MCP Server 管理" subtitle="运行实例与密钥轮换">
        <div className="space-y-2">
          {mcpList.map((m) => (
            <div key={m.id} className={`${cardClass(theme)} p-4 flex justify-between`}>
              <span className="font-mono">{m.name}</span>
              <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已轮换 client_secret（Mock）', 'success')}>
                轮换密钥
              </button>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '工具分类') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="工具分类" subtitle="维护类目树">
        <div className={`${cardClass(theme)} p-4 flex flex-wrap gap-2 mb-4`}>
          <input className={inputClass(theme)} placeholder="新分类" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              if (!newCat.trim()) return;
              setCats((prev) => [...prev, newCat.trim()]);
              setNewCat('');
              showMessage('已添加', 'success');
            }}
          >
            添加
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <span key={c} className={`px-3 py-1.5 rounded-xl text-sm ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
              {c}
            </span>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '官方工具集') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="官方工具集" subtitle="预装与强制升级策略">
        <div className={`${cardClass(theme)} p-4`}>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" />
            新工作空间默认安装「校园通讯录」
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-3">
            <input type="checkbox" className="rounded" />
            强制升级「教务查询」至 v2
          </label>
          <button type="button" className={`${btnPrimaryClass} mt-4`} onClick={() => showMessage('策略已保存', 'success')}>
            保存策略
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

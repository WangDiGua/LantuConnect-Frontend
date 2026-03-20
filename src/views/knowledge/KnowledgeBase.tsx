import React, { useState, useCallback, useMemo } from 'react';
import { Theme, FontSize, ThemeColor } from '../../types';
import type { KnowledgeItem, KnowledgeSubView } from './types';
import { KnowledgeBaseList } from './KnowledgeBaseList';
import { KnowledgeCreateView } from './KnowledgeCreateView';
import { KnowledgeBatchView } from './KnowledgeBatchView';
import { KnowledgeDeveloperView } from './KnowledgeDeveloperView';
import { KnowledgeHitTestView } from './KnowledgeHitTestView';
import { useKnowledgeBases, useDeleteKB } from '../../hooks/queries/useKnowledge';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';

export interface KnowledgeBaseProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  theme,
  fontSize,
  themeColor,
  showMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subView, setSubView] = useState<KnowledgeSubView>('list');

  const { data, isLoading, isError, error, refetch } = useKnowledgeBases();
  const deleteMut = useDeleteKB();

  const items: KnowledgeItem[] = useMemo(() => {
    const list = data?.list ?? [];
    return list.map((kb) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      fileCount: kb.documentCount,
      hosted: kb.status === 'ready' ? '平台托管' : kb.status,
      vectorModel: kb.embeddingModel,
      cluster: 'default',
    }));
  }, [data]);

  const handleCreateSubmit = useCallback(
    () => {
      setSubView('list');
      showMessage('知识库创建成功', 'success');
    },
    [showMessage]
  );

  const handleBatchDelete = useCallback(
    (ids: string[]) => {
      Promise.all(ids.map((id) => deleteMut.mutateAsync(id))).then(() => {
        showMessage(`已删除 ${ids.length} 个知识库`, 'success');
        setSubView('list');
      });
    },
    [showMessage, deleteMut]
  );

  if (isError && subView === 'list') {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${theme === 'dark' ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </div>
    );
  }

  switch (subView) {
    case 'create':
      return (
        <KnowledgeCreateView
          theme={theme}
          fontSize={fontSize}
          themeColor={themeColor}
          onBack={() => setSubView('list')}
          onSubmit={() => handleCreateSubmit()}
        />
      );
    case 'batch':
      return (
        <KnowledgeBatchView
          theme={theme}
          fontSize={fontSize}
          items={items}
          onBack={() => setSubView('list')}
          onDeleteSelected={handleBatchDelete}
        />
      );
    case 'developer':
      return (
        <KnowledgeDeveloperView
          theme={theme}
          fontSize={fontSize}
          themeColor={themeColor}
          onBack={() => setSubView('list')}
        />
      );
    case 'hitTest':
      return (
        <KnowledgeHitTestView
          theme={theme}
          fontSize={fontSize}
          themeColor={themeColor}
          onBack={() => setSubView('list')}
        />
      );
    default:
      return (
        <ContentLoader loading={isLoading}>
          <KnowledgeBaseList
            theme={theme}
            fontSize={fontSize}
            themeColor={themeColor}
            items={items}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreate={() => setSubView('create')}
            onBatch={() => setSubView('batch')}
            onDeveloper={() => setSubView('developer')}
            onHitTest={() => setSubView('hitTest')}
            onRowMenu={(id) => {
              // 编辑功能：可以在这里打开编辑对话框或导航到编辑页面
              showMessage(`编辑知识库 ${id}（功能待完善）`, 'info');
            }}
          />
        </ContentLoader>
      );
  }
};

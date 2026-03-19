import React, { useState, useCallback } from 'react';
import { Theme, FontSize, ThemeColor } from '../../types';
import type { KnowledgeItem, KnowledgeSubView } from './types';
import { KnowledgeBaseList } from './KnowledgeBaseList';
import { KnowledgeCreateView } from './KnowledgeCreateView';
import { KnowledgeBatchView } from './KnowledgeBatchView';
import { KnowledgeDeveloperView } from './KnowledgeDeveloperView';
import { KnowledgeHitTestView } from './KnowledgeHitTestView';

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
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subView, setSubView] = useState<KnowledgeSubView>('list');

  const handleCreateSubmit = useCallback(
    (row: KnowledgeItem) => {
      setItems((prev) => [...prev, row]);
      setSubView('list');
      showMessage('知识库创建成功', 'success');
    },
    [showMessage]
  );

  const handleBatchDelete = useCallback(
    (ids: string[]) => {
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      showMessage(`已删除 ${ids.length} 个知识库`, 'success');
      setSubView('list');
    },
    [showMessage]
  );

  switch (subView) {
    case 'create':
      return (
        <KnowledgeCreateView
          theme={theme}
          fontSize={fontSize}
          themeColor={themeColor}
          onBack={() => setSubView('list')}
          onSubmit={handleCreateSubmit}
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
          onRowMenu={() => showMessage('更多操作（详情/编辑）待接入后端', 'info')}
        />
      );
  }
};

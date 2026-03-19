import React, { useState, useCallback } from 'react';
import { Theme, FontSize, ThemeColor } from '../../types';
import type { DatabaseItem, DatabaseSubView } from './types';
import { DatabaseList } from './DatabaseList';
import { DatabaseCreateView } from './DatabaseCreateView';

export interface DatabaseProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const Database: React.FC<DatabaseProps> = ({ theme, fontSize, themeColor, showMessage }) => {
  const [items, setItems] = useState<DatabaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subView, setSubView] = useState<DatabaseSubView>('list');

  const handleCreate = useCallback(
    (row: DatabaseItem) => {
      setItems((prev) => [...prev, row]);
      setSubView('list');
      showMessage('数据库创建成功', 'success');
    },
    [showMessage]
  );

  if (subView === 'create') {
    return (
      <DatabaseCreateView
        theme={theme}
        fontSize={fontSize}
        themeColor={themeColor}
        onBack={() => setSubView('list')}
        onSubmit={handleCreate}
      />
    );
  }

  return (
    <DatabaseList
      theme={theme}
      fontSize={fontSize}
      themeColor={themeColor}
      items={items}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onCreate={() => setSubView('create')}
      onRowMenu={() => showMessage('详情 / 编辑 / 删除 待接入后端', 'info')}
    />
  );
};

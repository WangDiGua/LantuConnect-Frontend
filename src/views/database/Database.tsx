import React, { useState, useCallback, useMemo } from 'react';
import { Theme, FontSize, ThemeColor } from '../../types';
import type { DatabaseItem, DatabaseSubView } from './types';
import { DatabaseList } from './DatabaseList';
import { DatabaseCreateView } from './DatabaseCreateView';
import { useDatabases } from '../../hooks/queries/useDatabase';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';

export interface DatabaseProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const Database: React.FC<DatabaseProps> = ({ theme, fontSize, themeColor, showMessage }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subView, setSubView] = useState<DatabaseSubView>('list');

  const { data, isLoading, isError, error, refetch } = useDatabases();

  const items: DatabaseItem[] = useMemo(() => {
    const list = data?.list ?? [];
    return list.map((db) => ({
      id: db.id,
      name: db.name,
      description: `${db.type} @ ${db.host}:${db.port}/${db.database}`,
      creationMethod: '控制台创建',
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    }));
  }, [data]);

  const handleCreate = useCallback(
    () => {
      setSubView('list');
      showMessage('数据库创建成功', 'success');
    },
    [showMessage]
  );

  if (isError && subView === 'list') {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${theme === 'dark' ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </div>
    );
  }

  if (subView === 'create') {
    return (
      <DatabaseCreateView
        theme={theme}
        fontSize={fontSize}
        themeColor={themeColor}
        onBack={() => setSubView('list')}
        onSubmit={() => handleCreate()}
      />
    );
  }

  return (
    <ContentLoader loading={isLoading}>
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
    </ContentLoader>
  );
};

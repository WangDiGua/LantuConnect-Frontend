import React from 'react';
import { Theme, FontSize } from '../../types';
import { ToolMarketDiscover } from './ToolMarketDiscover';
import { MyToolsPage } from './MyToolsPage';
import { PublishMcpServerPage } from './PublishMcpServerPage';
import { CreateMcpServerPage } from './CreateMcpServerPage';

interface ToolMarketModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ToolMarketModule: React.FC<ToolMarketModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  switch (activeSubItem) {
    case '我的工具':
      return <MyToolsPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '上架 MCP Server':
      return <PublishMcpServerPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '创建 MCP Server':
      return <CreateMcpServerPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '工具发现':
    default:
      return <ToolMarketDiscover theme={theme} />;
  }
};

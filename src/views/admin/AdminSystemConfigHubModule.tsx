import React from 'react';
import { Theme, FontSize } from '../../types';
import { SystemConfigModule } from '../systemConfig/SystemConfigModule';

export interface AdminSystemConfigHubModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminSystemConfigHubModule: React.FC<AdminSystemConfigHubModuleProps> = ({
  activePage,
  theme,
  fontSize,
  showMessage,
}) => (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <SystemConfigModule activeSubItem={activePage} theme={theme} fontSize={fontSize} showMessage={showMessage} />
      </div>
    </div>
  );

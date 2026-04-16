import React from 'react';
import type { Theme, FontSize } from '../../types';
import { AlertCenterPage } from './AlertCenterPage';

interface AlertMgmtPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AlertMgmtPage: React.FC<AlertMgmtPageProps> = ({ theme, fontSize, showMessage }) => (
  <AlertCenterPage theme={theme} fontSize={fontSize} showMessage={showMessage} />
);

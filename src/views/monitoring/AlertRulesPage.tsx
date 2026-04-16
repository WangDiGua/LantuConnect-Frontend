import React from 'react';
import type { Theme, FontSize } from '../../types';
import { AlertCenterPage } from './AlertCenterPage';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AlertRulesPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => (
  <AlertCenterPage theme={theme} fontSize={fontSize} showMessage={showMessage} />
);

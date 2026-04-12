import React from 'react';
import type { Theme, ThemeMode, FontSize, ThemeColor } from '../../types';
import { UserProfile } from './UserProfile';

interface UserSettingsHubPageProps {
  theme: Theme;
  fontSize: FontSize;
  themePreference: ThemeMode;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onOpenAppearance: () => void;
}

/** 个人资料 / 偏好设置：路由由 `profile` 与 `preferences` slug 区分，正文由 {@link UserProfile} 内解析 */
export const UserSettingsHubPage: React.FC<UserSettingsHubPageProps> = ({
  theme,
  fontSize,
  themePreference,
  themeColor,
  showMessage,
  onOpenAppearance,
}) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <UserProfile
      theme={theme}
      fontSize={fontSize}
      themePreference={themePreference}
      themeColor={themeColor}
      showMessage={showMessage}
      onOpenAppearance={onOpenAppearance}
    />
  </div>
);

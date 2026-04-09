import React, { useEffect, useState } from 'react';
import type { Theme, ThemeMode, FontSize, ThemeColor } from '../../types';
import { UserProfile } from './UserProfile';
import { UserSettingsPage } from './UserSettingsPage';
import { UserPersonalApiKeysPage } from './UserPersonalApiKeysPage';

type SettingsTab = 'profile' | 'my-api-keys' | 'preferences';

interface UserSettingsHubPageProps {
  theme: Theme;
  fontSize: FontSize;
  themePreference: ThemeMode;
  themeColor: ThemeColor;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onOpenAppearance: () => void;
  initialTab?: SettingsTab;
}

export const UserSettingsHubPage: React.FC<UserSettingsHubPageProps> = ({
  theme,
  fontSize,
  themePreference,
  themeColor,
  showMessage,
  onOpenAppearance,
  initialTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {activeTab === 'profile' ? (
        <UserProfile
          theme={theme}
          fontSize={fontSize}
          onOpenSecuritySettings={() => setActiveTab('preferences')}
        />
      ) : activeTab === 'my-api-keys' ? (
        <UserPersonalApiKeysPage
          theme={theme}
          themeColor={themeColor}
          showMessage={(msg, type = 'info') => showMessage(msg, type)}
        />
      ) : (
        <UserSettingsPage
          theme={theme}
          themePreference={themePreference}
          fontSize={fontSize}
          themeColor={themeColor}
          showMessage={(msg, type = 'info') => showMessage(msg, type)}
          onOpenAppearance={onOpenAppearance}
        />
      )}
    </div>
  );
};


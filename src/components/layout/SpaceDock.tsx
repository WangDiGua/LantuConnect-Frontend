import React from 'react';
import { motion } from 'framer-motion';
import { Bell, User } from 'lucide-react';
import { Logo } from '../common/Logo';
import type { Space } from '../../constants/spaces';

export interface SpaceDockProps {
  spaces: Space[];
  activeSpaceId: string;
  onSpaceChange: (spaceId: string) => void;
  theme: 'light' | 'dark';
  themeColor: string;
  unreadCount: number;
  onBellClick: () => void;
  onAvatarClick: () => void;
  onLogoClick: () => void;
}

export const SpaceDock: React.FC<SpaceDockProps> = ({
  spaces,
  activeSpaceId,
  onSpaceChange,
  theme,
  unreadCount,
  onBellClick,
  onAvatarClick,
  onLogoClick,
}) => {
  const isLight = theme === 'light';

  const dockBg = isLight
    ? 'bg-white/70 backdrop-blur-xl border-r border-slate-200/60'
    : 'bg-[#0A0A0A]/80 backdrop-blur-xl border-r border-white/[0.06]';

  return (
    <div
      className={`flex-shrink-0 w-[52px] flex flex-col items-center py-3 gap-1 select-none ${dockBg}`}
    >
      {/* Logo */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onLogoClick}
        className="mb-3 rounded-xl focus:outline-none"
        title="首页"
      >
        <Logo compact />
      </motion.button>

      {/* Divider */}
      <div
        className={`w-5 h-px mb-1 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}
      />

      {/* Space Icons */}
      <div className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto custom-scrollbar">
        {spaces.map((space) => {
          const isActive = space.id === activeSpaceId;
          const Icon = space.icon;

          return (
            <motion.button
              key={space.id}
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSpaceChange(space.id)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors focus:outline-none group"
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${space.accentFrom}, ${space.accentTo})`
                  : undefined,
              }}
              title={space.label}
            >
              {/* Hover tint for inactive items */}
              {!isActive && (
                <span
                  className={`absolute inset-0 rounded-xl transition-colors ${
                    isLight
                      ? 'group-hover:bg-slate-100'
                      : 'group-hover:bg-white/[0.08]'
                  }`}
                />
              )}

              <Icon
                size={18}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={`relative z-10 transition-colors ${
                  isActive
                    ? 'text-white'
                    : isLight
                      ? 'text-slate-500'
                      : 'text-slate-400'
                }`}
              />

              {/* Active indicator bar */}
              {isActive && (
                <motion.span
                  layoutId="space-dock-indicator"
                  className="absolute -left-[5px] w-[3px] h-4 rounded-r-full"
                  style={{
                    background: `linear-gradient(180deg, ${space.accentFrom}, ${space.accentTo})`,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Divider */}
      <div
        className={`w-5 h-px mt-1 mb-1 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}
      />

      {/* Bell */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBellClick}
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          isLight
            ? 'text-slate-500 hover:bg-slate-100'
            : 'text-slate-400 hover:bg-white/[0.08]'
        }`}
        title="消息中心"
      >
        <Bell size={18} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-[3px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Avatar */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onAvatarClick}
        className="mt-1 w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm focus:outline-none"
        title="用户菜单"
      >
        <User size={14} strokeWidth={2.2} />
      </motion.button>
    </div>
  );
};

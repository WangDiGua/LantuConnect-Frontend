import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Space, SpaceNavItem } from '../../constants/spaces';

export interface SpaceNavProps {
  space: Space;
  activeSidebarId: string;
  activeSubItemId: string;
  activeAgentSubItemId: string;
  onItemClick: (item: SpaceNavItem) => void;
  theme: 'light' | 'dark';
  fontSize: string;
}

const sizeClass = (fs: string) =>
  fs === 'small' ? 'text-xs' : fs === 'large' ? 'text-base' : 'text-sm';

const titleSizeClass = (fs: string) =>
  fs === 'small'
    ? 'text-[0.5625rem]'
    : fs === 'large'
      ? 'text-xs'
      : 'text-[0.625rem]';

export const SpaceNav: React.FC<SpaceNavProps> = ({
  space,
  activeSidebarId,
  activeSubItemId,
  activeAgentSubItemId,
  onItemClick,
  theme,
  fontSize,
}) => {
  const isLight = theme === 'light';

  const panelBg = isLight
    ? 'bg-[#F6F6FA]/80 backdrop-blur-md border-r border-slate-200/50'
    : 'bg-[#111113]/80 backdrop-blur-md border-r border-white/[0.06]';

  const isItemActive = (item: SpaceNavItem) => {
    if (item.sidebarId !== activeSidebarId) return false;
    if (item.isAgentSub) return item.subItemId === activeAgentSubItemId;
    return item.subItemId === activeSubItemId;
  };

  return (
    <div className={`flex-shrink-0 w-52 flex flex-col select-none ${panelBg}`}>
      {/* Space header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={space.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="h-14 flex items-center px-5 shrink-0"
        >
          <span
            className="font-bold tracking-tight bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, ${space.accentFrom}, ${space.accentTo})`,
              fontSize: fontSize === 'small' ? 14 : fontSize === 'large' ? 18 : 16,
            }}
          >
            {space.label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Sections */}
      <AnimatePresence mode="wait">
        <motion.div
          key={space.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto px-2.5 pb-4 custom-scrollbar"
        >
          {space.sections.map((section) => (
            <div key={`${section.sidebarId}-${section.title}`} className="mb-2.5">
              {/* Section title */}
              <div className="px-2.5 pt-2 pb-1">
                <span
                  className={`font-semibold uppercase tracking-wider ${titleSizeClass(fontSize)} ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {section.title}
                </span>
              </div>

              {/* Flat items */}
              <div className="space-y-px">
                {section.items.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;

                  return (
                    <motion.button
                      key={`${item.sidebarId}-${item.subItemId}`}
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onItemClick(item)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg transition-all text-left ${sizeClass(fontSize)} ${
                        active
                          ? isLight
                            ? 'bg-white shadow-sm font-semibold'
                            : 'bg-white/10 font-semibold'
                          : isLight
                            ? 'text-slate-600 hover:bg-white/60 font-medium'
                            : 'text-slate-300 hover:bg-white/[0.05] font-medium'
                      }`}
                      style={
                        active
                          ? { color: space.accentFrom }
                          : undefined
                      }
                    >
                      <Icon
                        size={14}
                        strokeWidth={active ? 2.4 : 1.8}
                        className="shrink-0"
                      />
                      <span className="truncate">{item.label}</span>

                      {/* Accent dot for active item */}
                      {active && (
                        <motion.span
                          layoutId="space-nav-dot"
                          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${space.accentFrom}, ${space.accentTo})`,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 26,
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

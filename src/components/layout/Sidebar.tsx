import React from 'react';
import { motion } from 'framer-motion';
import { SidebarItemProps, SidebarGroupProps, FontSize } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

export const SidebarItem: React.FC<SidebarItemProps & { fontSize?: FontSize }> = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick,
  theme,
  themeColor,
  fontSize = 'medium'
}) => (
  <motion.div 
    onClick={onClick}
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl mx-2 my-0.5 ${
      active 
        ? `${THEME_COLOR_CLASSES[themeColor].bg} text-white shadow-sm` 
        : theme === 'light' 
          ? 'text-slate-600 hover:bg-slate-200/50' 
          : 'text-slate-400 hover:bg-white/10'
    }`}
  >
    <Icon size={16} strokeWidth={active ? 2.5 : 2} />
    <span
      className={`font-medium transition-all ${
        fontSize === 'small' ? 'text-xs' : fontSize === 'medium' ? 'text-sm' : 'text-base'
      }`}
    >
      {label}
    </span>
  </motion.div>
);

export const SidebarGroup: React.FC<SidebarGroupProps & { fontSize?: FontSize }> = ({ 
  title, 
  children, 
  theme,
  fontSize = 'medium'
}) => (
  <div className="mt-4 mb-2">
    <div className={`px-5 font-semibold uppercase tracking-wider mb-1.5 transition-all ${
      fontSize === 'small' ? 'text-[0.625rem]' : fontSize === 'medium' ? 'text-xs' : 'text-sm'
    } ${
      theme === 'light' ? 'text-slate-400' : 'text-slate-500'
    }`}>
      {title}
    </div>
    {children}
  </div>
);

import React, { useMemo } from 'react';

interface MultiAvatarProps {
  seed: string;
  alt?: string;
  className?: string;
  /** 头像地址；有则优先展示，否则用 Dicebear */
  imageUrl?: string | null;
}

export interface AvatarGradientFrameProps {
  isDark: boolean;
  /** 描边厚度：顶栏等小尺寸用 sm */
  padding?: 'sm' | 'md';
  /** 如 group-hover/user: 等与父级 group 联动的悬停强化 */
  className?: string;
  children: React.ReactNode;
}

/**
 * 导航区头像外环：柔和 sky→indigo 渐变 + 内高光，替代单色细描边；
 * 无循环动画，仅可选配合父级 group 做轻量 hover（遵守 motion-reduce）。
 */
export const AvatarGradientFrame: React.FC<AvatarGradientFrameProps> = ({
  isDark,
  padding = 'md',
  className = '',
  children,
}) => {
  const pad = padding === 'sm' ? 'p-[1.5px]' : 'p-[2px]';
  return (
    <span
      className={`relative inline-flex shrink-0 rounded-full ${pad} transition-[filter,box-shadow] duration-200 motion-reduce:transition-none ${
        isDark
          ? 'bg-gradient-to-br from-sky-400/50 via-slate-600/40 to-indigo-500/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_0_1px_rgba(255,255,255,0.07)]'
          : 'bg-gradient-to-br from-sky-400/60 via-white to-indigo-400/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_0_0_1px_rgba(148,163,184,0.28)]'
      } ${className}`.trim()}
    >
      <span
        className={`flex overflow-hidden rounded-full ${
          isDark
            ? 'bg-slate-950 ring-1 ring-white/[0.08]'
            : 'bg-white ring-1 ring-slate-300/35'
        }`}
      >
        {children}
      </span>
    </span>
  );
};

/** 全站统一：Dicebear pixel-art（与 fun-emoji 等其它风格区分） */
export const MultiAvatar: React.FC<MultiAvatarProps> = ({ seed, alt = 'avatar', className = '', imageUrl }) => {
  const { src, isGenerated } = useMemo(() => {
    const trimmed = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    if (trimmed) return { src: trimmed, isGenerated: false };
    const safeSeed = encodeURIComponent(seed || 'user');
    return {
      src: `https://api.dicebear.com/9.x/pixel-art/svg?seed=${safeSeed}&radius=16`,
      isGenerated: true,
    };
  }, [seed, imageUrl]);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${isGenerated ? '[image-rendering:pixelated] ' : ''}${className}`.trim()}
    />
  );
};

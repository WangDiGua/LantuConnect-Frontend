import React, { useMemo } from 'react';

interface MultiAvatarProps {
  seed: string;
  alt?: string;
  className?: string;
  /** 头像地址；有则优先展示，否则用 Dicebear */
  imageUrl?: string | null;
}

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

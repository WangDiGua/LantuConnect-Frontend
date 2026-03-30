import React, { useMemo } from 'react';

interface MultiAvatarProps {
  seed: string;
  alt?: string;
  className?: string;
}

/** 全站统一：Dicebear pixel-art（与 fun-emoji 等其它风格区分） */
export const MultiAvatar: React.FC<MultiAvatarProps> = ({ seed, alt = 'avatar', className = '' }) => {
  const src = useMemo(() => {
    const safeSeed = encodeURIComponent(seed || 'user');
    return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${safeSeed}&radius=16`;
  }, [seed]);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`[image-rendering:pixelated] ${className}`.trim()}
    />
  );
};

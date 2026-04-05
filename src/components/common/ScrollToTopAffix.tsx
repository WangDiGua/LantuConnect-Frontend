import React, { useLayoutEffect, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import type { Theme } from '../../types';

const DEFAULT_THRESHOLD_PX = 400;

export interface ScrollToTopAffixProps {
  theme: Theme;
  /** 当前实际滚动的主内容容器（MainLayout 在双栏/单栏间切换 ref） */
  containerRef: RefObject<HTMLElement | null>;
  /** 路由变化时与主内容滚顶同步，先收起按钮 */
  routeResetKey: string;
  thresholdPx?: number;
}

/**
 * 固钉：主内容滚动超过阈值后显示，点击平滑回到顶部。
 */
export const ScrollToTopAffix: React.FC<ScrollToTopAffixProps> = ({
  theme,
  containerRef,
  routeResetKey,
  thresholdPx = DEFAULT_THRESHOLD_PX,
}) => {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    setVisible(false);
  }, [routeResetKey]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      setVisible(el.scrollTop >= thresholdPx);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [containerRef, thresholdPx, routeResetKey]);

  const isDark = theme === 'dark';

  const scrollToTop = () => {
    const el = containerRef.current;
    if (!el) return;
    const smooth = !reduceMotion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: 0, left: 0, behavior: smooth ? 'smooth' : 'auto' });
  };

  return (
    <motion.div
      className="pointer-events-none fixed z-[38] max-md:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] max-md:right-[max(1rem,env(safe-area-inset-right,0px))] md:bottom-8 md:right-8"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.9,
      }}
      transition={{
        duration: reduceMotion ? 0 : 0.2,
        ease: 'easeOut',
      }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="回到顶部"
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-[box-shadow,transform] motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/55 focus-visible:ring-offset-2 active:scale-[0.97] ${
          isDark
            ? 'border-white/12 bg-lantu-card/95 text-slate-100 shadow-black/25 backdrop-blur-sm hover:bg-white/[0.08] focus-visible:ring-offset-lantu-card'
            : 'border-slate-200/90 bg-white/95 text-slate-800 shadow-slate-900/10 backdrop-blur-sm hover:bg-slate-50 focus-visible:ring-offset-white'
        }`}
      >
        <ArrowUp size={20} strokeWidth={2} aria-hidden />
      </button>
    </motion.div>
  );
};

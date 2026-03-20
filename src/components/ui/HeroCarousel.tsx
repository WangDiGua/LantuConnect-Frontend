import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Keyboard, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { Theme } from '../../types';

export interface HeroSlide {
  kicker: string;
  title: string;
  body: string;
  lightMesh: string;
  darkMesh: string;
  kickerLight: string;
  kickerDark: string;
}

interface HeroCarouselProps {
  theme: Theme;
  slides: HeroSlide[];
  /** 自动播放间隔 ms */
  intervalMs?: number;
  className?: string;
}

/**
 * 工作台要闻轮播：基于 Swiper（开源），样式与 §1/§2 扁平边框一致。
 */
export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  theme,
  slides,
  intervalMs = 6500,
  className = '',
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`group/carousel rounded-2xl border overflow-hidden shadow-none flex flex-col relative ${
        isDark ? 'border-white/10' : 'border-slate-200/80'
      } ${className}`}
    >
      <Swiper
        modules={[Autoplay, Pagination, Keyboard, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        speed={480}
        autoplay={{ delay: intervalMs, disableOnInteraction: false }}
        pagination={{ clickable: true, dynamicBullets: true }}
        keyboard={{ enabled: true }}
        className="hero-swiper min-h-[260px] sm:min-h-[300px] w-full"
        aria-label="工作台要闻轮播"
      >
        {slides.map((s, i) => (
          <SwiperSlide key={i} className="!h-auto">
            <div
              className={`relative min-h-[260px] sm:min-h-[300px] flex flex-col bg-gradient-to-br ${
                isDark ? s.darkMesh : s.lightMesh
              }`}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
                style={{
                  backgroundImage: isDark
                    ? 'radial-gradient(ellipse 80% 60% at 90% 20%, rgba(255,255,255,0.06), transparent 55%)'
                    : 'radial-gradient(ellipse 70% 50% at 100% 0%, rgba(59,130,246,0.12), transparent 50%)',
                }}
              />
              <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-10 py-10 sm:py-12">
                <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-center">
                  <div className="min-w-0 space-y-3 sm:space-y-4">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
                        isDark ? s.kickerDark : s.kickerLight
                      }`}
                    >
                      {s.kicker}
                    </p>
                    <h2
                      className={`text-2xl sm:text-3xl font-bold tracking-tight leading-snug ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {s.title}
                    </h2>
                    <p
                      className={`text-sm sm:text-[15px] leading-relaxed max-w-xl ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {s.body}
                    </p>
                  </div>
                  <div
                    className={`hidden sm:flex items-center justify-center tabular-nums select-none text-[5.5rem] sm:text-[6.5rem] font-black leading-none ${
                      isDark ? 'text-white/[0.07]' : 'text-slate-900/[0.06]'
                    }`}
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div
        className={`relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t ${
          isDark ? 'border-white/10 bg-black/20' : 'border-slate-200/90 bg-white/60'
        } backdrop-blur-md`}
      >
        <span className={`text-[11px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          兰智通 · 工作台要闻
        </span>
      </div>
      <style>{`
        .hero-swiper .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          opacity: 0.35;
          background: ${isDark ? '#fff' : '#0f172a'};
        }
        .hero-swiper .swiper-pagination-bullet-active {
          opacity: 1;
          width: 28px;
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
};

import React, { useId } from 'react';

function useNavSvgUid(): string {
  return useId().replace(/:/g, '');
}

export interface NexusNavSvgProps {
  /** 顶栏暗色主题下略提亮描边与节点，避免糊在背景上 */
  isDark?: boolean;
  className?: string;
}

/** 探索发现 */
export const NexusNavIconExplore: React.FC<NexusNavSvgProps> = ({ isDark = false, className }) => {
  const u = useNavSvgUid();
  const gid = `${u}-explore-grad`;
  const stroke = isDark ? '#cbd5e1' : '#1e293b';
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" stroke={`url(#${gid})`} strokeWidth="1.5" opacity="0.5">
        <animate attributeName="r" values="10;28" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="32" cy="32" r="20" stroke={stroke} strokeWidth="2.5" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="8s" repeatCount="indefinite" />
        <path d="M32 16L36 32L32 48L28 32L32 16Z" fill="#3b82f6">
          <animate attributeName="fill" values="#3b82f6;#8b5cf6;#3b82f6" dur="4s" repeatCount="indefinite" />
        </path>
        <circle cx="32" cy="32" r="3" fill={stroke} />
      </g>
      <path d="M46 46L56 56" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

/** Skills 中心 */
export const NexusNavIconSkills: React.FC<NexusNavSvgProps> = ({ className }) => {
  const u = useNavSvgUid();
  const gid = `${u}-skills-grad`;
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="12s" repeatCount="indefinite" />
        <path d="M32 8C33.1 8 34 8.9 34 10V14C34 15.1 33.1 16 32 16C30.9 16 30 15.1 30 14V10C30 8.9 30.9 8 32 8Z" fill="#94a3b8" />
        <path d="M32 48C33.1 48 34 48.9 34 50V54C34 55.1 33.1 56 32 56C30.9 56 30 55.1 30 54V50C30 48.9 30.9 48 32 48Z" fill="#94a3b8" />
        <path d="M56 32C56 33.1 55.1 34 54 34H50C48.9 34 48 33.1 48 32C48 30.9 48.9 30 50 30H54C55.1 30 56 30.9 56 32Z" fill="#94a3b8" />
        <path d="M16 32C16 33.1 15.1 34 14 34H10C8.9 34 8 33.1 8 32C8 30.9 8.9 30 10 30H14C15.1 30 16 30.9 16 32Z" fill="#94a3b8" />
        <path d="M48.97 15.03C49.75 14.25 51.02 14.25 51.8 15.03L54.63 17.86C55.41 18.64 55.41 19.91 54.63 20.69C53.85 21.47 52.58 21.47 51.8 20.69L48.97 17.86C48.19 17.08 48.19 15.81 48.97 15.03Z" fill="#94a3b8" />
        <path d="M12.2 51.8C12.98 51.02 14.25 51.02 15.03 51.8L17.86 54.63C18.64 55.41 18.64 56.68 17.86 57.46C17.08 58.24 15.81 58.24 15.03 57.46L12.2 54.63C11.42 53.85 11.42 52.58 12.2 51.8Z" fill="#94a3b8" />
        <circle cx="32" cy="32" r="12" stroke="#94a3b8" strokeWidth="2.5" />
      </g>
      <path
        d="M32 24V40M32 24L26 30M32 24L38 30"
        stroke={`url(#${gid})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate attributeName="stroke-width" values="3;4;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
};

/** MCP 广场 */
export const NexusNavIconMcp: React.FC<NexusNavSvgProps> = ({ isDark = false, className }) => {
  const u = useNavSvgUid();
  const gid = `${u}-mcp-grad`;
  const nodeFill = isDark ? '#0f172a' : 'white';
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="6" fill={`url(#${gid})`}>
        <animate attributeName="r" values="5;7;5" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
      </circle>
      <path d="M32 16V22M32 42V48M48 32H42M22 32H16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <rect x="28" y="10" width="8" height="8" rx="2" fill={nodeFill} stroke="#3b82f6" strokeWidth="1.5">
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,2; 0,0" dur="4s" repeatCount="indefinite" />
      </rect>
      <rect x="28" y="46" width="8" height="8" rx="2" fill={nodeFill} stroke="#3b82f6" strokeWidth="1.5">
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-2; 0,0" dur="4s" repeatCount="indefinite" />
      </rect>
      <rect x="46" y="28" width="8" height="8" rx="2" fill={nodeFill} stroke="#3b82f6" strokeWidth="1.5">
        <animateTransform attributeName="transform" type="translate" values="0,0; -2,0; 0,0" dur="4s" begin="1s" repeatCount="indefinite" />
      </rect>
      <rect x="10" y="28" width="8" height="8" rx="2" fill={nodeFill} stroke="#3b82f6" strokeWidth="1.5">
        <animateTransform attributeName="transform" type="translate" values="0,0; 2,0; 0,0" dur="4s" begin="1s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
};

/** 数据集 */
export const NexusNavIconDatasets: React.FC<NexusNavSvgProps> = ({ className }) => {
  const u = useNavSvgUid();
  const flowGrad = `${u}-data-flow-grad`;
  const clipId = `${u}-data-clip`;
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id={flowGrad} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M32 57C22 57 14 55 14 52.5V9.5C14 7 22 5 32 5C42 5 50 7 50 9.5V52.5C50 55 42 57 32 57Z" />
        </clipPath>
      </defs>
      <g>
        <path d="M32 46C42 46 50 44 50 41.5V52.5C50 55 42 57 32 57C22 57 14 55 14 52.5V41.5C14 44 22 46 32 46Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
        <ellipse cx="32" cy="41.5" rx="18" ry="4.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-2; 0,0" dur="3s" repeatCount="indefinite" />
          <path d="M32 30C42 30 50 28 50 25.5V36.5C50 39 42 41 32 41C22 41 14 39 14 36.5V25.5C14 28 22 30 32 30Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          <ellipse cx="32" cy="25.5" rx="18" ry="4.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
        </g>
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur="3s" begin="0.5s" repeatCount="indefinite" />
          <path d="M32 14C42 14 50 12 50 9.5V20.5C50 23 42 25 32 25C22 25 14 23 14 20.5V9.5C14 12 22 14 32 14Z" fill="white" stroke="#3b82f6" strokeWidth="2" />
          <ellipse cx="32" cy="9.5" rx="18" ry="4.5" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
        </g>
      </g>
      <rect x="26" y="10" width="12" height="40" fill={`url(#${flowGrad})`} opacity="0.3" clipPath={`url(#${clipId})`}>
        <animate attributeName="x" values="14;50" dur="2s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
};

/** Agent 广场 */
export const NexusNavIconAgent: React.FC<NexusNavSvgProps> = ({ isDark = false, className }) => {
  const stroke = isDark ? '#cbd5e1' : '#1e293b';
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect x="14" y="18" width="36" height="30" rx="8" stroke={stroke} strokeWidth="2.5" />
      <path d="M24 48V54M40 48V54M20 18L16 12M44 18L48 12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <g>
        <path d="M32 26L33.5 30.5L38 32L33.5 33.5L32 38L30.5 33.5L26 32L30.5 30.5L32 26Z" fill="#8b5cf6">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          <animateTransform
            attributeName="transform"
            type="scale"
            from="0.9"
            to="1.1"
            additive="sum"
            dur="2s"
            repeatCount="indefinite"
            origin="32 32"
          />
        </path>
        <circle cx="42" cy="26" r="1.5" fill="#22d3ee">
          <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
      <line x1="18" y1="25" x2="46" y2="25" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 4" opacity="0.3">
        <animate attributeName="y1" values="25;42;25" dur="4s" repeatCount="indefinite" />
        <animate attributeName="y2" values="25;42;25" dur="4s" repeatCount="indefinite" />
      </line>
    </svg>
  );
};

/** 应用集 */
export const NexusNavIconAppSet: React.FC<NexusNavSvgProps> = ({ isDark = false, className }) => {
  const ring = isDark ? '#334155' : '#f1f5f9';
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <g>
        <rect x="16" y="16" width="14" height="14" rx="4" fill="#3b82f6">
          <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="2s" repeatCount="indefinite" origin="23 23" />
        </rect>
        <rect x="34" y="16" width="14" height="14" rx="4" fill={isDark ? '#94a3b8' : '#1e293b'}>
          <animate attributeName="opacity" values="1;0.6;1" dur="2s" begin="0.5s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="2s" begin="0.5s" repeatCount="indefinite" origin="41 23" />
        </rect>
        <rect x="16" y="34" width="14" height="14" rx="4" fill="#94a3b8">
          <animate attributeName="opacity" values="1;0.6;1" dur="2s" begin="1s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="2s" begin="1s" repeatCount="indefinite" origin="23 41" />
        </rect>
        <rect x="34" y="34" width="14" height="14" rx="4" fill="#8b5cf6">
          <animate attributeName="opacity" values="1;0.6;1" dur="2s" begin="1.5s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="2s" begin="1.5s" repeatCount="indefinite" origin="41 41" />
        </rect>
      </g>
      <rect x="10" y="10" width="44" height="44" rx="10" stroke={ring} strokeWidth="1.5" />
    </svg>
  );
};

const USER_NAV_ICON_MAP: Record<string, React.FC<NexusNavSvgProps>> = {
  hub: NexusNavIconExplore,
  'skills-center': NexusNavIconSkills,
  'mcp-center': NexusNavIconMcp,
  'dataset-center': NexusNavIconDatasets,
  'agents-center': NexusNavIconAgent,
  'apps-center': NexusNavIconAppSet,
};

/** 用户顶栏六个一级入口的动态 SVG（需配合 prefers-reduced-motion 在父级回退 Lucide） */
export const NexusTopNavPrimaryAnimatedIcon: React.FC<
  NexusNavSvgProps & { sidebarId: string }
> = ({ sidebarId, isDark, className }) => {
  const Cmp = USER_NAV_ICON_MAP[sidebarId];
  if (!Cmp) return null;
  return <Cmp isDark={isDark} className={className} />;
};

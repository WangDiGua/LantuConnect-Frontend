import React, { useId } from 'react';

function useNavSvgUid(): string {
  return useId().replace(/:/g, '');
}

export interface NexusNavSvgProps {
  isDark?: boolean;
  className?: string;
  motionActive?: boolean;
}

function NexusGlobalDefs({ uid, isDark }: { uid: string; isDark: boolean }) {
  const gradId = `${uid}-nexus-grad`;
  const glowId = `${uid}-soft-glow`;
  return (
    <defs>
      <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={isDark ? '#60a5fa' : '#3b82f6'} />
        <stop offset="100%" stopColor={isDark ? '#93c5fd' : '#60a5fa'} />
      </linearGradient>
      <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={isDark ? '3' : '2'} result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}

/** 探索发现 */
export const NexusNavIconExplore: React.FC<NexusNavSvgProps> = ({
  isDark = false,
  className,
  motionActive = false,
}) => {
  const uid = useNavSvgUid();
  const gradId = `${uid}-nexus-grad`;
  const glowId = `${uid}-soft-glow`;
  const hole = isDark ? '#0f172a' : 'white';
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <NexusGlobalDefs uid={uid} isDark={isDark} />
      {motionActive ? (
        <path d="M32 4L36 28L60 32L36 36L32 60L28 36L4 32L28 28L32 4Z" fill={`url(#${gradId})`} filter={`url(#${glowId})`}>
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1;1.05;1"
            dur="3s"
            repeatCount="indefinite"
            additive="sum"
            attributeType="XML"
          />
        </path>
      ) : (
        <path d="M32 4L36 28L60 32L36 36L32 60L28 36L4 32L28 28L32 4Z" fill={`url(#${gradId})`} filter={`url(#${glowId})`} />
      )}
      {motionActive ? (
        <circle cx="32" cy="32" r="4" fill={hole}>
          <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" />
        </circle>
      ) : (
        <circle cx="32" cy="32" r="4" fill={hole} />
      )}
    </svg>
  );
};

/** Skills 中心 */
export const NexusNavIconSkills: React.FC<NexusNavSvgProps> = ({
  isDark = false,
  className,
  motionActive = false,
}) => {
  const uid = useNavSvgUid();
  const gradId = `${uid}-nexus-grad`;
  const glowId = `${uid}-soft-glow`;
  const check = isDark ? '#0f172a' : 'white';
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <NexusGlobalDefs uid={uid} isDark={isDark} />
      <rect x="12" y="12" width="40" height="40" rx="12" fill={`url(#${gradId})`} />
      {motionActive ? (
        <path d="M22 32L28 38L42 24" stroke={check} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="stroke-dasharray" values="0 100;100 0" dur="2s" repeatCount="indefinite" />
        </path>
      ) : (
        <path d="M22 32L28 38L42 24" stroke={check} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {motionActive ? (
        <circle cx="50" cy="14" r="6" fill="#fbbf24" filter={`url(#${glowId})`}>
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      ) : (
        <circle cx="50" cy="14" r="6" fill="#fbbf24" filter={`url(#${glowId})`} />
      )}
    </svg>
  );
};

/** MCP 广场 */
export const NexusNavIconMcp: React.FC<NexusNavSvgProps> = ({
  isDark = false,
  className,
  motionActive = false,
}) => {
  const uid = useNavSvgUid();
  const gradId = `${uid}-nexus-grad`;
  const glowId = `${uid}-soft-glow`;
  const sat = isDark ? '#60a5fa' : '#3b82f6';
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <NexusGlobalDefs uid={uid} isDark={isDark} />
      <circle
        cx="32"
        cy="32"
        r="16"
        stroke={`url(#${gradId})`}
        strokeWidth="4"
        strokeDasharray="4 8"
        opacity={isDark ? 0.4 : 1}
        fill="none"
      />
      {motionActive ? (
        <circle cx="32" cy="32" r="8" fill={`url(#${gradId})`}>
          <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
        </circle>
      ) : (
        <circle cx="32" cy="32" r="8" fill={`url(#${gradId})`} />
      )}
      {motionActive ? (
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="4s" repeatCount="indefinite" />
          <circle cx="50" cy="32" r="4" fill={sat} filter={`url(#${glowId})`} />
        </g>
      ) : (
        <circle cx="50" cy="32" r="4" fill={sat} filter={`url(#${glowId})`} />
      )}
    </svg>
  );
};

/** 数据集 */
export const NexusNavIconDatasets: React.FC<NexusNavSvgProps> = ({
  isDark = false,
  className,
  motionActive = false,
}) => {
  const uid = useNavSvgUid();
  const gradId = `${uid}-nexus-grad`;
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <NexusGlobalDefs uid={uid} isDark={isDark} />
      <rect x="10" y="44" width="44" height="12" rx="4" fill={isDark ? '#1e293b' : '#cbd5e1'} />
      {motionActive ? (
        <rect x="10" y="26" width="44" height="12" rx="4" fill={isDark ? '#334155' : '#94a3b8'}>
          <animate attributeName="y" values="26;24;26" dur="3s" repeatCount="indefinite" />
        </rect>
      ) : (
        <rect x="10" y="26" width="44" height="12" rx="4" fill={isDark ? '#334155' : '#94a3b8'} />
      )}
      {motionActive ? (
        <rect x="10" y="8" width="44" height="12" rx="4" fill={`url(#${gradId})`}>
          <animate attributeName="y" values="8;4;8" dur="3s" repeatCount="indefinite" />
        </rect>
      ) : (
        <rect x="10" y="8" width="44" height="12" rx="4" fill={`url(#${gradId})`} />
      )}
      <rect x="18" y="12" width="8" height="4" rx="2" fill="white" opacity="0.4" />
    </svg>
  );
};

/** Agent 广场 */
export const NexusNavIconAgent: React.FC<NexusNavSvgProps> = ({
  isDark = false,
  className,
  motionActive = false,
}) => {
  const uid = useNavSvgUid();
  const gradId = `${uid}-nexus-grad`;
  const glowId = `${uid}-soft-glow`;
  const eye = isDark ? '#0f172a' : 'white';
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <NexusGlobalDefs uid={uid} isDark={isDark} />
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke={`url(#${gradId})`}
        strokeWidth="1"
        strokeDasharray="2 4"
        opacity={isDark ? 0.3 : 1}
        fill="none"
      />
      <path
        d="M32 10C20 10 10 20 10 32C10 44 20 54 32 54C44 54 54 44 54 32"
        stroke={`url(#${gradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {motionActive ? (
        <circle cx="32" cy="32" r="12" fill={`url(#${gradId})`} filter={`url(#${glowId})`}>
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      ) : (
        <circle cx="32" cy="32" r="12" fill={`url(#${gradId})`} filter={`url(#${glowId})`} />
      )}
      <rect x="26" y="28" width="4" height="8" rx="2" fill={eye} />
      <rect x="34" y="28" width="4" height="8" rx="2" fill={eye} />
    </svg>
  );
};

/** 应用集 */
export const NexusNavIconAppSet: React.FC<NexusNavSvgProps> = ({
  isDark = false,
  className,
  motionActive = false,
}) => {
  const uid = useNavSvgUid();
  const gradId = `${uid}-nexus-grad`;
  const fillPulseDark = isDark ? '#1e293b;#334155;#1e293b' : '#e2e8f0;#bfdbfe;#e2e8f0';
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <NexusGlobalDefs uid={uid} isDark={isDark} />
      <rect x="8" y="8" width="22" height="22" rx="6" fill={`url(#${gradId})`} />
      {motionActive ? (
        <rect x="34" y="8" width="22" height="22" rx="6" fill={isDark ? '#1e293b' : '#e2e8f0'}>
          <animate attributeName="fill" values={fillPulseDark} dur="4s" repeatCount="indefinite" />
        </rect>
      ) : (
        <rect x="34" y="8" width="22" height="22" rx="6" fill={isDark ? '#1e293b' : '#e2e8f0'} />
      )}
      {motionActive ? (
        <rect x="8" y="34" width="22" height="22" rx="6" fill={isDark ? '#1e293b' : '#e2e8f0'}>
          <animate attributeName="fill" values={fillPulseDark} dur="4s" begin="1s" repeatCount="indefinite" />
        </rect>
      ) : (
        <rect x="8" y="34" width="22" height="22" rx="6" fill={isDark ? '#1e293b' : '#e2e8f0'} />
      )}
      <rect x="34" y="34" width="22" height="22" rx="6" fill="#3b82f6" opacity={isDark ? 0.6 : 0.8} />
      {motionActive ? (
        <circle cx="45" cy="45" r="4" fill="white">
          <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
        </circle>
      ) : (
        <circle cx="45" cy="45" r="4" fill="white" opacity={0.5} />
      )}
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

/** 用户顶栏六个一级入口的 SVG（选中项 motionActive 时播放 SMIL；系统减少动效时父组件改回 Lucide） */
export const NexusTopNavPrimaryAnimatedIcon: React.FC<NexusNavSvgProps & { sidebarId: string }> = ({
  sidebarId,
  isDark,
  className,
  motionActive = false,
}) => {
  const Cmp = USER_NAV_ICON_MAP[sidebarId];
  if (!Cmp) return null;
  return <Cmp isDark={isDark} className={className} motionActive={motionActive} />;
};

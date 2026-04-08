import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';
import { getRootFontSizePx } from './constants/theme';
import { readAppearanceState } from './utils/appearanceState';
import { normalizeHashRouterUrl } from './utils/normalizeHashRouterUrl';

/** Hash 路由：收束 `.../login#/c/...`（或旧版 `#/user/*`）这类歧义 URL，使 hash 前的 pathname 与部署 base 一致 */
normalizeHashRouterUrl();

/** 首屏前同步 rem，避免 React useEffect 执行前沿用浏览器默认字号导致「先大后小」 */
const appearance = readAppearanceState();
document.documentElement.style.fontSize = getRootFontSizePx(appearance.fontSize);

const root = document.getElementById('root')!;

/**
 * 默认不启用 StrictMode：React 19 在开发态会对 effect 双跑以暴露副作用问题，会导致同一请求发两次。
 * 需要排查副作用时再在 .env.development 设置 VITE_ENABLE_STRICT_MODE=true。
 */
const strictOn = import.meta.env.VITE_ENABLE_STRICT_MODE === 'true';

createRoot(root).render(
  strictOn ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <App />
  ),
);

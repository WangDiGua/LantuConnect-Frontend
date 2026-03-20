import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';
import { getRootFontSizePx } from './constants/theme';
import { readAppearanceState } from './utils/appearanceState';

/** 首屏前同步 rem，避免 React useEffect 执行前沿用浏览器默认字号导致「先大后小」 */
const appearance = readAppearanceState();
document.documentElement.style.fontSize = getRootFontSizePx(appearance.fontSize);

const root = document.getElementById('root')!;
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

requestAnimationFrame(() => {
  const splash = document.getElementById('pre-splash');
  if (splash) {
    splash.style.transition = 'opacity 0.3s ease-out';
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 300);
  }
});

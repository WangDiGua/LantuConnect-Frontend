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

/** 优化pre-splash淡出逻辑 - 确保React加载完成后平滑淡出 */
const hidePreSplash = () => {
  const splash = document.getElementById('pre-splash');
  if (splash) {
    // 添加hidden类触发CSS过渡动画
    splash.classList.add('hidden');
    // 动画完成后移除元素，避免占用DOM
    setTimeout(() => {
      if (splash.parentNode) {
        splash.remove();
      }
    }, 300); // 与CSS transition时间一致
  }
};

// 确保React渲染完成后再隐藏pre-splash
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 使用requestAnimationFrame确保DOM更新完成
// 双重RAF确保在浏览器下一次重绘前执行
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    // 等待React首次渲染完成
    setTimeout(() => {
      hidePreSplash();
    }, 50); // 给React一点时间完成初始渲染
  });
});

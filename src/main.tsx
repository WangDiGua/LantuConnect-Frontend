import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';
import { getRootFontSizePx } from './constants/theme';
import { readAppearanceState } from './utils/appearanceState';
import { normalizeHashRouterUrl } from './utils/normalizeHashRouterUrl';

/** Hash 路由：收束 `.../login#/user/...` 这类歧义 URL 为 `.../#/user/...` */
normalizeHashRouterUrl();

/** 首屏前同步 rem，避免 React useEffect 执行前沿用浏览器默认字号导致「先大后小」 */
const appearance = readAppearanceState();
document.documentElement.style.fontSize = getRootFontSizePx(appearance.fontSize);

const root = document.getElementById('root')!;

createRoot(root).render(<App />);

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { TITLE_SIZE_CLASSES } from '../../constants/theme';
import { AI_ASSISTANT_SUGGESTIONS } from '../../constants/data';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

interface AIAssistantProps {
  theme: Theme;
  fontSize: FontSize;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ theme, fontSize }) => {
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const contentMax = hasSecondarySidebar ? 'max-w-2xl' : 'max-w-3xl w-full';
  return (
    <div
      className={`flex-1 overflow-y-auto flex flex-col items-center justify-center ${outerPad} py-6 ${
        theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-[#000000]'
      }`}
    >
      <div className={`${contentMax} mx-auto text-center`}>
        <div className={`mb-6 inline-flex p-4 rounded-2xl transition-colors border shadow-none ${
          theme === 'light' ? 'bg-white border-slate-200/80 text-blue-600' : 'bg-[#1C1C1E] border-white/10 text-blue-400'
        }`}>
          <Sparkles size={40} />
        </div>
        <h1 className={`${TITLE_SIZE_CLASSES[fontSize]} font-bold tracking-tight mb-3 transition-all`}>
          你好，我是 AI 助手
        </h1>
        <p className="text-base text-slate-500 mb-8 transition-all">
          我可以帮你写代码、分析数据、生成图像，或者只是聊聊天。
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {AI_ASSISTANT_SUGGESTIONS.map((item, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 border rounded-2xl cursor-pointer transition-colors shadow-none ${
                theme === 'light' 
                  ? 'border-slate-200/80 bg-white hover:border-slate-300' 
                  : 'border-white/10 bg-[#1C1C1E] hover:border-white/15'
              }`}
            >
              <div className="text-base font-semibold mb-1 transition-all">{item.title}</div>
              <div className="text-xs text-slate-500">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

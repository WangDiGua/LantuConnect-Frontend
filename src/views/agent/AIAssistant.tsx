import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Bot, User, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { TITLE_SIZE_CLASSES } from '../../constants/theme';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

interface AIAssistantProps {
  theme: Theme;
  fontSize: FontSize;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { title: '如何防范电信诈骗？', desc: '了解常见的诈骗手段和保护措施。' },
  { title: '帮我写一段 Python 代码', desc: '快速生成高质量的代码片段。' },
  { title: '创建一个新 Agent', desc: '引导你完成 Agent 配置与发布。' },
  { title: '查看本周调用统计', desc: '了解 API 用量和账单概览。' },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({ theme, fontSize }) => {
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const contentMax = hasSecondarySidebar ? 'max-w-2xl' : 'max-w-3xl w-full';
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSuggestionClick = (title: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: title,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: getAssistantResponse(title),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 800);
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasMessages = messages.length > 0;

  if (!hasMessages) {
    return (
      <div
        className={`flex-1 overflow-y-auto flex flex-col items-center justify-center ${outerPad} py-6 ${
          isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
        }`}
      >
        <div className={`${contentMax} mx-auto text-center`}>
          <div
            className={`mb-6 inline-flex p-4 rounded-2xl transition-colors border shadow-none ${
              isDark
                ? 'bg-[#1C1C1E] border-white/10 text-blue-400'
                : 'bg-white border-slate-200/80 text-blue-600'
            }`}
          >
            <Sparkles size={40} />
          </div>
          <h1 className={`${TITLE_SIZE_CLASSES[fontSize]} font-bold tracking-tight mb-3 transition-all`}>
            你好，我是 AI 助手
          </h1>
          <p className={`text-base mb-8 transition-all ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            我可以帮你写代码、分析数据、管理 Agent，或回答关于平台的任何问题。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {SUGGESTIONS.map((item, i) => (
              <motion.button
                key={i}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => handleSuggestionClick(item.title)}
                className={`p-4 border rounded-2xl cursor-pointer transition-colors shadow-none text-left ${
                  isDark
                    ? 'border-white/10 bg-[#1C1C1E] hover:border-white/15'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {item.title}
                </div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-4 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${contentMax} mx-auto space-y-5`}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Bot size={16} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-[#1C1C1E] border border-white/10 text-slate-200'
                      : 'bg-white border border-slate-200/80 text-slate-800'
                }`}
              >
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div
                  className={`flex items-center gap-1 mt-2 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-between'
                  }`}
                >
                  <span
                    className={`text-[11px] ${
                      msg.role === 'user' ? 'text-white/50' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className={`p-1 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title="复制"
                      >
                        {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button
                        type="button"
                        className={`p-1 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title="有帮助"
                      >
                        <ThumbsUp size={13} />
                      </button>
                      <button
                        type="button"
                        className={`p-1 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title="没帮助"
                      >
                        <ThumbsDown size={13} />
                      </button>
                      <button
                        type="button"
                        className={`p-1 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title="重新生成"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  <User size={14} />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

function getAssistantResponse(question: string): string {
  const responses: Record<string, string> = {
    '如何防范电信诈骗？':
      '以下是常见的电信诈骗防范建议：\n\n1. 不轻信陌生来电、短信或网络链接\n2. 涉及转账汇款需多方核实\n3. 保护个人身份证号、银行卡号和验证码\n4. 遇可疑情况拨打 96110 反诈热线\n5. 安装国家反诈中心 App，开启预警功能\n\n如需了解更多，请前往「文档教程」查看安全指南。',
    '帮我写一段 Python 代码':
      '好的，这是一个简单的 Python 快速排序示例：\n\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\nprint(quicksort([3, 6, 8, 10, 1, 2, 1]))\n\n需要其他类型的代码可以继续告诉我。',
    '创建一个新 Agent':
      '创建 Agent 的流程如下：\n\n1. 进入「我的 Agent」→「Agent 工作台」\n2. 点击右上角「创建 Agent」\n3. 填写名称、描述和能力配置\n4. 选择关联的知识库与工具\n5. 测试调试后发布\n\n你可以随时回来问我配置相关的问题。',
    '查看本周调用统计':
      '本周 API 调用概览（演示数据）：\n\n- 总调用次数：12,483 次\n- 成功率：99.7%\n- 平均响应时间：186ms\n- Token 消耗：约 3.2M\n- 费用预估：¥42.60\n\n详细数据请前往「用量账单」模块查看。',
  };
  return responses[question] || '收到你的问题，让我帮你查找相关信息。你可以尝试更具体的提问来获得更好的回答。';
}

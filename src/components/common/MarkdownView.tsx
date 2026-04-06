import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import './markdown-view.css';

/** 收紧链接/资源协议，降低公告 Markdown 中 javascript:/data: 恶意链风险 */
const announcementSanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https'],
  },
};

interface MarkdownViewProps {
  value: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ value, className = '' }) => {
  return (
    <div className={`markdown-view min-w-0 max-w-none ${className}`.trim()}>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeSanitize, announcementSanitizeSchema]]}
        >
          {value || ''}
        </ReactMarkdown>
      </div>
    </div>
  );
};

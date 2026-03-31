import React from 'react';
import { Viewer } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import type { Schema } from 'hast-util-sanitize';
import 'bytemd/dist/index.css';
import './markdown-view.css';

const MD_PLUGINS = [gfm()];

/** 收紧链接/资源协议，降低公告 Markdown 中 javascript:/data: 恶意链风险 */
function tightenAnnouncementMarkdownSchema(schema: Schema): Schema {
  return {
    ...schema,
    protocols: {
      ...schema.protocols,
      href: ['http', 'https', 'mailto', 'tel'],
      src: ['http', 'https'],
    },
  };
}

interface MarkdownViewProps {
  value: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ value, className = '' }) => {
  return (
    <div className={`markdown-view ${className}`.trim()}>
      <Viewer value={value} plugins={MD_PLUGINS} sanitize={tightenAnnouncementMarkdownSchema} />
    </div>
  );
};

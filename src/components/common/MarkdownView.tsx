import React from 'react';
import { Viewer } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import 'bytemd/dist/index.css';
import './markdown-view.css';

const MD_PLUGINS = [gfm()];

interface MarkdownViewProps {
  value: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ value, className = '' }) => {
  return (
    <div className={`markdown-view ${className}`.trim()}>
      <Viewer value={value} plugins={MD_PLUGINS} />
    </div>
  );
};

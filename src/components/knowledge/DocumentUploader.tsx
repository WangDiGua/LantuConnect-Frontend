import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Theme, ThemeColor } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  speed?: number;
}

interface DocumentUploaderProps {
  theme: Theme;
  themeColor?: ThemeColor;
  onUploadComplete?: (files: UploadFile[]) => void;
  multiple?: boolean;
  accept?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  theme,
  themeColor = 'blue',
  onUploadComplete,
  multiple = true,
  accept = '.pdf,.doc,.docx,.txt,.md',
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const simulateUpload = useCallback((file: UploadFile) => {
    let progress = 0;
    const speed = 50000 + Math.random() * 100000; // 50-150 KB/s
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, progress: 100, status: 'success', speed: 0 } : f
          )
        );
        setTimeout(() => {
          onUploadComplete?.(files.filter((f) => f.status === 'success'));
        }, 500);
        return;
      }
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, progress, speed } : f))
      );
    }, 200);
  }, [files, onUploadComplete]);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending' as const,
        speed: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // 开始上传
      newFiles.forEach((file) => {
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: 'uploading' } : f))
        );
        simulateUpload(file);
      });
    },
    [simulateUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          isDragging
            ? `${tc.border} ${isDark ? 'bg-white/10' : 'bg-blue-50'}`
            : isDark
              ? 'border-white/10 bg-white/5'
              : 'border-slate-300 bg-slate-50'
        }`}
      >
        <Upload size={32} className={`mx-auto mb-3 ${tc.text}`} />
        <p className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          拖拽文件到此处或点击上传
        </p>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          支持 {accept} 格式，{multiple ? '可多选' : '单文件'}
        </p>
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`inline-block mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white ${tc.bg} cursor-pointer hover:opacity-90 transition-opacity`}
        >
          选择文件
        </label>
      </div>

      {/* 文件列表 */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-4 rounded-xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FileText size={20} className={tc.text} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {file.name}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {file.status === 'success' && (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle size={20} className="text-red-500" />
                  )}
                  {file.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className={`p-1 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                    >
                      <X size={16} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
                    </button>
                  )}
                </div>
                {file.status === 'uploading' && (
                  <ProgressBar
                    value={file.progress}
                    theme={theme}
                    themeColor={themeColor}
                    speed={file.speed}
                    showLabel={true}
                    height="sm"
                  />
                )}
                {file.status === 'error' && file.error && (
                  <p className="text-xs text-red-500 mt-2">{file.error}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

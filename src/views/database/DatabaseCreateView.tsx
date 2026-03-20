import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import type { DatabaseItem } from './types';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { useCreateDatabase, useUpdateDatabase } from '../../hooks/queries/useDatabase';
import { createDatabaseSchema } from '../../schemas/database.schema';
import type { DatabaseInstance } from '../../types/dto/database';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  onBack: () => void;
  onSubmit: (item: DatabaseItem) => void;
  initialData?: DatabaseInstance;
}

export const DatabaseCreateView: React.FC<Props> = ({ theme, fontSize, themeColor, onBack, onSubmit, initialData }) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const isEdit = !!initialData;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dbType, setDbType] = useState<'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis'>('postgresql');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMut = useCreateDatabase();
  const updateMut = useUpdateDatabase();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setDbType(initialData.type || 'postgresql');
      setHost(initialData.host || 'localhost');
      setPort(String(initialData.port || '5432'));
      setDatabase(initialData.database || '');
      setUsername(initialData.username || '');
      setPassword(''); // 编辑时不显示密码
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = createDatabaseSchema.safeParse({
      name: name.trim(),
      type: dbType,
      host: host.trim(),
      port: Number(port),
      database: database.trim(),
      username: username.trim(),
      password,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => { fieldErrors[String(err.path[0])] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (isEdit && initialData) {
      updateMut.mutate(
        { id: initialData.id, data: result.data },
        {
          onSuccess: (db) => {
            const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
            onSubmit({
              id: db.id,
              name: db.name,
              description: description.trim() || '—',
              creationMethod: '控制台创建',
              createdAt: initialData.createdAt || now,
              updatedAt: now,
            });
          },
          onError: (err) => {
            setErrors({ submit: err instanceof Error ? err.message : '更新失败' });
          },
        }
      );
    } else {
      createMut.mutate(result.data, {
        onSuccess: (db) => {
          const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
          onSubmit({
            id: db.id,
            name: db.name,
            description: description.trim() || '—',
            creationMethod: '控制台创建',
            createdAt: now,
            updatedAt: now,
          });
        },
        onError: (err) => {
          setErrors({ submit: err instanceof Error ? err.message : '创建失败' });
        },
      });
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div
          className={`rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          <div
            className={`shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
              <ArrowLeft size={20} />
            </button>
            <h1 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEdit ? '编辑数据库' : '创建数据库'}
            </h1>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="p-4 sm:px-8 sm:py-6 lg:px-10 lg:py-8 w-full max-w-6xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                <div className="form-control w-full gap-1 lg:col-span-2">
                  <label className="label py-0">
                    <span className="label-text font-bold">数据库名称</span>
                  </label>
                  <input
                    className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：教务业务库"
                    maxLength={80}
                  />
                  {errors.name && <label className="label py-0"><span className="label-text-alt text-error">{errors.name}</span></label>}
                </div>
                <div className="form-control w-full gap-1 lg:col-span-2">
                  <label className="label py-0">
                    <span className="label-text font-bold">描述</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered min-h-[100px] w-full"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="说明数据用途、表结构规范或接入方式"
                  />
                </div>
                <div className="form-control w-full gap-1">
                  <label className="label py-0">
                    <span className="label-text font-bold">数据库类型</span>
                  </label>
                  <select
                    className={nativeSelectClass(theme)}
                    value={dbType}
                    onChange={(e) => setDbType(e.target.value as typeof dbType)}
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="mongodb">MongoDB</option>
                    <option value="redis">Redis</option>
                  </select>
                </div>
                <div className="form-control w-full gap-1">
                  <label className="label py-0">
                    <span className="label-text font-bold">主机</span>
                  </label>
                  <input
                    className={`input input-bordered w-full ${errors.host ? 'input-error' : ''}`}
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                  />
                  {errors.host && <label className="label py-0"><span className="label-text-alt text-error">{errors.host}</span></label>}
                </div>
                <div className="form-control w-full gap-1">
                  <label className="label py-0">
                    <span className="label-text font-bold">端口</span>
                  </label>
                  <input
                    className={`input input-bordered w-full ${errors.port ? 'input-error' : ''}`}
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                  />
                  {errors.port && <label className="label py-0"><span className="label-text-alt text-error">{errors.port}</span></label>}
                </div>
                <div className="form-control w-full gap-1">
                  <label className="label py-0">
                    <span className="label-text font-bold">数据库名</span>
                  </label>
                  <input
                    className={`input input-bordered w-full ${errors.database ? 'input-error' : ''}`}
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                  />
                  {errors.database && <label className="label py-0"><span className="label-text-alt text-error">{errors.database}</span></label>}
                </div>
                <div className="form-control w-full gap-1">
                  <label className="label py-0">
                    <span className="label-text font-bold">用户名</span>
                  </label>
                  <input
                    className={`input input-bordered w-full ${errors.username ? 'input-error' : ''}`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  {errors.username && <label className="label py-0"><span className="label-text-alt text-error">{errors.username}</span></label>}
                </div>
                <div className="form-control w-full gap-1">
                  <label className="label py-0">
                    <span className="label-text font-bold">密码</span>
                  </label>
                  <input
                    className={`input input-bordered w-full ${errors.password ? 'input-error' : ''}`}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEdit ? '留空则不修改密码' : ''}
                  />
                  {errors.password && <label className="label py-0"><span className="label-text-alt text-error">{errors.password}</span></label>}
                  {isEdit && <label className="label py-0"><span className="label-text-alt text-slate-500">留空则不修改密码</span></label>}
                </div>
              </div>

              {errors.submit && (
                <div className="mt-4 text-sm text-error">{errors.submit}</div>
              )}

              <div className="flex flex-wrap justify-end gap-2 mt-10 pt-6 border-t border-dashed border-slate-200/80 dark:border-white/10">
                <button type="button" onClick={onBack} className="btn btn-ghost">
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className={`btn text-white border-0 ${tc.bg} shadow-lg ${tc.shadow}`}
                >
                  {(createMut.isPending || updateMut.isPending) && <Loader2 size={16} className="animate-spin mr-1" />}
                  {isEdit ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

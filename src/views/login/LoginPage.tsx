import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, LogIn, User, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { loginSchema, LoginFormValues } from '../../schemas/auth.schema';
import { authService } from '../../api/services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { ApiException } from '../../types/api';
import { Logo } from '../../components/common/Logo';
import type { Theme } from '../../types';
import { defaultPath } from '../../constants/consoleRoutes';
import { pageBg, btnPrimary } from '../../utils/uiClasses';
import { hidePreSplash } from '../../App';

const springHover = { type: 'spring' as const, stiffness: 400, damping: 30 };

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  useEffect(() => { hidePreSplash(); }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = prefersDark;
  const theme: Theme = isDark ? 'dark' : 'light';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    try {
      const res = await authService.login({
        username: values.username,
        password: values.password,
        remember: values.remember,
      });
      login(res.token, res.refreshToken, res.user);
      const isAdmin = res.user.role === 'admin';
      navigate(defaultPath(isAdmin ? 'admin' : 'user'), { replace: true });
    } catch (err) {
      if (err instanceof ApiException) {
        setServerError(err.message);
      } else {
        setServerError('登录失败，请稍后重试');
      }
    }
  };

  const inputBase = `w-full rounded-xl border px-3 py-2.5 text-sm min-h-[2.75rem] box-border outline-none transition-all duration-200 ${
    isDark
      ? 'bg-white/[0.06] border-white/[0.08] text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40'
      : 'bg-white/70 border-slate-200/60 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40'
  }`;

  return (
    <div
      data-theme={theme === 'dark' ? 'dark' : 'light'}
      className={`min-h-screen flex items-center justify-center transition-colors ${pageBg(theme)}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
        className="w-full max-w-[420px] mx-4"
      >
        {/* Glassmorphic card */}
        <div className={`rounded-3xl border p-8 sm:p-10 ${
          isDark
            ? 'bg-[#1a1f2e]/60 backdrop-blur-2xl border-white/[0.08] shadow-2xl'
            : 'bg-white/60 backdrop-blur-2xl border-slate-200/40 shadow-[0_8px_40px_rgba(0,0,0,0.06)]'
        }`}>
          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <Logo fontSize="large" theme={theme} />
            </div>
            <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              兰智通
            </h1>
            <p className={`text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              智能体接入平台
            </p>
          </div>

          {serverError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div>
              <label className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                学工号
              </label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="请输入学工号"
                  className={`${inputBase} !pl-10 !pr-4 ${
                    errors.username ? '!border-rose-500/50 focus:!border-rose-400' : ''
                  }`}
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                密码
              </label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className={`${inputBase} !pl-10 !pr-10 ${
                    errors.password ? '!border-rose-500/50 focus:!border-rose-400' : ''
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            {/* Remember */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className={`w-4 h-4 rounded border bg-transparent focus:ring-indigo-500/30 focus:ring-offset-0 accent-indigo-600 ${
                    isDark ? 'border-white/20' : 'border-slate-300'
                  }`}
                  {...register('remember')}
                />
                <span className={`text-sm ${isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-500 group-hover:text-slate-700'} transition-colors`}>
                  记住我
                </span>
              </label>
            </div>

            {/* Login Button — spring motion */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springHover}
              className={`${btnPrimary} w-full !py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isSubmitting ? '登录中...' : '登录'}
            </motion.button>

            {/* CAS — ghost style, disabled */}
            <button
              type="button"
              disabled
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-not-allowed transition-all border ${
                isDark
                  ? 'bg-white/[0.04] border-white/[0.06] text-slate-500'
                  : 'bg-transparent border-slate-200/60 text-slate-400'
              }`}
            >
              <ShieldCheck size={16} />
              高校统一认证登录
            </button>
          </form>

          {/* Demo credentials */}
          <div className={`mt-6 p-3 rounded-xl border ${
            isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50/50 border-slate-200/40'
          }`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              演示账号：
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              管理员：{' '}
              <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isDark ? 'bg-white/[0.06] text-indigo-300' : 'bg-indigo-50 text-indigo-600'
              }`}>
                admin
              </code>
              {' / '}
              <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isDark ? 'bg-white/[0.06] text-indigo-300' : 'bg-indigo-50 text-indigo-600'
              }`}>
                123456
              </code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-xs mt-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          &copy; 2026 LantuConnect
        </p>
      </motion.div>
    </div>
  );
};

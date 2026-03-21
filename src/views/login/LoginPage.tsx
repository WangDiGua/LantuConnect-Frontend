import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, LogIn, User, Lock, ShieldCheck } from 'lucide-react';
import { loginSchema, LoginFormValues } from '../../schemas/auth.schema';
import { authService } from '../../api/services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { ApiException } from '../../types/api';
import { Logo } from '../../components/common/Logo';
import type { Theme } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

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
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiException) {
        setServerError(err.message);
      } else {
        setServerError('登录失败，请稍后重试');
      }
    }
  };

  const bgMain = isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
  const cardBg = isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80';
  const labelColor = isDark ? 'text-slate-300' : 'text-slate-700';
  const subtitleColor = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen flex items-center justify-center ${bgMain} transition-colors`}>
      <div className="w-full max-w-[400px] mx-4">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          <div className={`mb-4 p-3 rounded-2xl border shadow-none ${cardBg}`}>
            <Logo fontSize="large" theme={isDark ? 'dark' : 'light'} />
          </div>
          <h1 className={`text-lg font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            兰智通 · 智能体接入平台
          </h1>
          <p className={`text-sm mt-1 ${subtitleColor}`}>
            高校智能服务统一入口
          </p>
        </div>

        {/* Card */}
        <div className={`rounded-2xl border shadow-none p-6 sm:p-8 ${cardBg}`}>
          {serverError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username (学工号) */}
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${labelColor}`}>
                学工号
              </label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${subtitleColor}`}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="请输入学工号"
                  className={`${nativeInputClass(theme)} !pl-10 !pr-4 ${
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
              <label className={`block text-sm font-medium mb-1.5 ${labelColor}`}>
                密码
              </label>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${subtitleColor}`}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className={`${nativeInputClass(theme)} !pl-10 !pr-10 ${
                    errors.password ? '!border-rose-500/50 focus:!border-rose-400' : ''
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${subtitleColor} hover:${isDark ? 'text-white' : 'text-slate-700'}`}
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
                  className={`w-4 h-4 rounded border bg-transparent focus:ring-blue-500/30 focus:ring-offset-0 ${
                    isDark ? 'border-white/20 text-blue-500' : 'border-slate-300 text-blue-600'
                  }`}
                  {...register('remember')}
                />
                <span className={`text-sm ${subtitleColor} group-hover:${isDark ? 'text-slate-200' : 'text-slate-700'} transition-colors`}>
                  记住我
                </span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm
                bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isSubmitting ? '登录中...' : '登录'}
            </button>

            {/* CAS placeholder */}
            <button
              type="button"
              disabled
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium cursor-not-allowed transition-colors border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <ShieldCheck size={16} />
              高校统一认证登录
            </button>
          </form>

          {/* Demo credentials */}
          <div className={`mt-5 p-3 rounded-xl border ${
            isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-50 border-slate-100'
          }`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              演示账号：
            </p>
            <p className={`text-xs ${subtitleColor}`}>
              管理员：{' '}
              <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isDark ? 'bg-white/[0.08] text-blue-300' : 'bg-slate-100 text-blue-600'
              }`}>
                admin
              </code>
              {' / '}
              <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isDark ? 'bg-white/[0.08] text-blue-300' : 'bg-slate-100 text-blue-600'
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
      </div>
    </div>
  );
};

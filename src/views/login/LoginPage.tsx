import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock } from 'lucide-react';
import { loginSchema, LoginFormValues } from '../../schemas/auth.schema';
import { authService } from '../../api/services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { ApiException } from '../../types/api';
import { Logo } from '../../components/common/Logo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    try {
      const res = await authService.login({
        email: values.email,
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

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950" />

      {/* Animated orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)',
          animation: 'orbFloat 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
          animation: 'orbFloat 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(79,70,229,0.5) 0%, transparent 70%)',
          animation: 'orbFloat 18s ease-in-out 3s infinite',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Logo and title */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3 p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">
            <Logo fontSize="large" theme="dark" />
          </div>
          <p className="text-sm text-indigo-200/60 font-medium tracking-wide">
            企业级 AI 智能体平台
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/[0.12] shadow-2xl shadow-indigo-500/5 p-8">
          <h2 className="text-xl font-semibold text-white mb-1">欢迎回来</h2>
          <p className="text-sm text-slate-400 mb-6">请登录您的账号以继续</p>

          {serverError && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                邮箱
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@school.edu.cn"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 transition-all outline-none
                    bg-white/[0.06] border ${
                      errors.email
                        ? 'border-red-500/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/20'
                        : 'border-white/10 focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/20'
                    }`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                密码
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 transition-all outline-none
                    bg-white/[0.06] border ${
                      errors.password
                        ? 'border-red-500/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/20'
                        : 'border-white/10 focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/20'
                    }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
                  {...register('remember')}
                />
                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                  记住我
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                忘记密码？
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-medium text-sm
                bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-500 hover:to-violet-500
                active:from-indigo-700 active:to-violet-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isSubmitting ? '登录中...' : '登录'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <p className="text-xs text-slate-500 mb-1">演示账号：</p>
            <p className="text-xs text-slate-400">
              管理员:{' '}
              <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-indigo-300">
                admin@school.edu.cn
              </code>{' '}
              /{' '}
              <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-indigo-300">
                admin123
              </code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          &copy; 2026 LantuConnect. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
      `}</style>
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye, EyeOff, Loader2, ArrowRight, LockKeyhole, Mail,
  ShieldCheck, RefreshCcw, Fingerprint, Command,
} from 'lucide-react';
import { loginSchema, LoginFormValues } from '../../schemas/auth.schema';
import { authService } from '../../api/services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { ApiException } from '../../types/api';
import { useMessage } from '../../components/common/Message';
import { defaultPath } from '../../constants/consoleRoutes';
import { normalizeRole } from '../../context/UserRoleContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { showMessage } = useMessage();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [captchaError, setCaptchaError] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');

  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [latency, setLatency] = useState('12.4');
  const [hash, setHash] = useState('0x8F...A2B');

  useEffect(() => {
    const latencyInterval = setInterval(() => {
      setLatency((12 + Math.random() * 2).toFixed(1));
    }, 2500);
    const hashInterval = setInterval(() => {
      const chars = '0123456789ABCDEF';
      let result = '0x';
      for (let i = 0; i < 2; i++) result += chars[Math.floor(Math.random() * 16)];
      result += '...';
      for (let i = 0; i < 3; i++) result += chars[Math.floor(Math.random() * 16)];
      setHash(result);
    }, 4000);
    return () => { clearInterval(latencyInterval); clearInterval(hashInterval); };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', captchaCode: '', remember: false },
  });

  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaError('');
    try {
      const captcha = await authService.getCaptcha();
      setCaptchaId(captcha.captchaId);
      setCaptchaImage(captcha.captchaImage);
      setValue('captchaCode', '');
    } catch (err) {
      setCaptchaError(err instanceof Error ? err.message : '验证码加载失败');
    } finally {
      setCaptchaLoading(false);
    }
  }, [setValue]);

  useEffect(() => { refreshCaptcha(); }, [refreshCaptcha]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    if (!captchaId) { setServerError('验证码无效，请刷新后重试'); return; }
    try {
      const res = await authService.login({
        username: values.username,
        password: values.password,
        captchaId,
        captchaCode: values.captchaCode.trim(),
        remember: values.remember,
      });
      const normalized = normalizeRole(res.user.role);
      const userWithNormalized = { ...res.user, role: normalized };
      login(res.token, res.refreshToken, userWithNormalized, values.username);
      showMessage('登录成功，欢迎回来', 'success');
      navigate(defaultPath(), { replace: true });
    } catch (err) {
      const errorMsg = err instanceof ApiException ? err.message : '登录失败，请稍后重试';
      setServerError(errorMsg);
      refreshCaptcha();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const inputCls = 'w-full pl-10 pr-4 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 focus:bg-white transition-all duration-300';
  const inputErrorCls = '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500/10';

  /** 左栏日食尺寸：随视口高度收紧，保证 lg+ 一屏内无需滚动 */
  const eclipseSize =
    'min(500px, 85vw, 32dvh, max(160px, calc((100dvh - 260px) * 0.44)))';

  return (
    <div className="h-[100dvh] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain lg:overflow-hidden">
      <div className="min-h-0 h-full lg:h-full flex flex-col lg:flex-row font-sans bg-white selection:bg-neutral-900 selection:text-white max-lg:min-h-min">

        {/* Left: Eclipse Quantum Core — lg+ 整栏锁在一屏内 */}
        <div
          className="hidden lg:flex lg:w-1/2 relative bg-[#020202] overflow-x-hidden flex-col shrink-0 lg:h-full lg:min-h-0"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
        >
          <div className="absolute inset-0 opacity-30" style={{ backgroundSize: '24px 24px', backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)' }} />
          <div
            className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 ease-out"
            style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 40%)` }}
          />

          <div className="relative z-20 flex items-center justify-between p-6 sm:p-8 lg:p-10 xl:p-12">
            <div className="flex items-center gap-3 text-white">
              <Command className="w-6 h-6" />
              <span className="text-lg font-medium tracking-wide">NEXUS</span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] font-mono text-neutral-600 mb-1 tracking-widest uppercase">System.Status</div>
              <div className="flex items-center justify-end gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono text-neutral-300 tracking-wider">OPTIMAL</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 py-2 lg:py-3 [@media(min-width:1024px)_and_(max-height:780px)]:lg:py-1 [@media(min-width:1024px)_and_(max-height:680px)]:lg:py-0 xl:-mt-4 xl:[@media(min-height:860px)]:-mt-8 xl:[@media(min-height:960px)]:-mt-10">
            <div
              className="relative flex items-center justify-center mx-auto"
              style={{ width: eclipseSize, height: eclipseSize }}
            >
              <div className="absolute inset-[3%] rounded-full bg-gradient-to-tr from-neutral-800/40 via-blue-500/20 to-neutral-700/40 animate-spin blur-[40px] mix-blend-screen opacity-70" style={{ animationDuration: '10s' }} />
              <div className="absolute inset-[12%] rounded-full bg-gradient-to-bl from-cyan-400/30 via-neutral-700/30 to-emerald-400/20 blur-[30px] mix-blend-screen opacity-50" style={{ animation: 'spin 15s linear infinite reverse' }} />
              <div className="absolute inset-[10.5%] rounded-full bg-[#020202] shadow-[inset_0_0_80px_rgba(0,0,0,1)] border border-white/[0.03] z-10 flex items-center justify-center">
                <div className="absolute w-2 h-2 rounded-full bg-white/20 blur-[2px]" />
                <Fingerprint className="w-8 h-8 text-white/[0.05] z-20" strokeWidth={1} />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] h-[92%] border border-white/[0.04] rounded-full z-0" style={{ animation: 'spin 60s linear infinite' }} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72%] h-[72%] border border-white/[0.06] border-dashed rounded-full z-20 flex items-start justify-center" style={{ animation: 'spin 40s linear infinite reverse' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 blur-[1px] -mt-[3px] shadow-[0_0_10px_rgba(23,23,23,0.5)]" />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] h-[52%] border border-white/[0.03] rounded-full z-20 border-t-white/[0.15] border-r-white/[0.05]" style={{ animation: 'spin 20s linear infinite' }} />
            </div>
          </div>

          <div className="relative z-20 shrink-0 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between p-6 sm:p-8 lg:p-10 xl:p-12 mt-auto [@media(min-width:1024px)_and_(max-height:780px)]:lg:gap-3 [@media(min-width:1024px)_and_(max-height:780px)]:lg:p-5 [@media(min-width:1024px)_and_(max-height:680px)]:lg:p-4 [@media(min-width:1024px)_and_(max-height:680px)]:lg:gap-2">
            <div className="min-w-0">
              <h1 className="font-medium tracking-tighter text-white leading-[1.05] mb-2 sm:mb-4 [@media(min-width:1024px)_and_(max-height:780px)]:lg:!text-[clamp(1.25rem,2vw+0.5rem,2.75rem)] [@media(min-width:1024px)_and_(max-height:680px)]:lg:!mb-1 text-[clamp(1.75rem,2.5vw+0.75rem,3.75rem)] xl:text-[clamp(2rem,3vw+1rem,3.75rem)]">
                Intelligence,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-300 to-neutral-700">
                  Orchestrated.
                </span>
              </h1>
              <p className="text-neutral-500 max-w-sm text-[13px] leading-relaxed font-light tracking-wide [@media(min-width:1024px)_and_(max-height:720px)]:lg:text-xs [@media(min-width:1024px)_and_(max-height:640px)]:lg:hidden">
                构建企业级智能体协同中枢。<br />优雅、强大、深不可测。
              </p>
            </div>
            <div className="text-left sm:text-right space-y-3 shrink-0 [@media(min-width:1024px)_and_(max-height:680px)]:lg:space-y-2">
              <div>
                <div className="text-[10px] font-mono text-neutral-600 mb-1 tracking-widest uppercase">Node.Latency</div>
                <div className="text-[11px] font-mono text-neutral-300 tracking-wider">{latency} ms</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-neutral-600 mb-1 tracking-widest uppercase">Sync.Hash</div>
                <div className="text-[11px] font-mono text-neutral-400 tracking-wider">{hash}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Clean Form — lg+ 与左栏同高裁切在一屏内；移动端允许整页滚动 */}
        <div className="w-full lg:w-1/2 flex min-h-min lg:min-h-0 lg:h-full lg:flex-1 flex-col items-center justify-center bg-white px-6 pt-20 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-12 sm:pt-20 sm:pb-10 lg:overflow-hidden lg:px-14 lg:py-6 xl:px-16 xl:py-10 2xl:p-24 relative [@media(min-width:1024px)_and_(max-height:780px)]:lg:py-5 [@media(min-width:1024px)_and_(max-height:680px)]:lg:py-4 [@media(min-width:1024px)_and_(max-height:780px)]:lg:px-10">
          <div className="absolute top-6 left-6 sm:top-8 sm:left-8 flex lg:hidden items-center gap-2 text-neutral-900">
            <Command className="w-6 h-6" />
            <span className="text-lg font-semibold tracking-tight">NEXUS</span>
          </div>

          <div className="w-full max-w-[380px] space-y-8 sm:space-y-10 pb-6 [@media(min-width:1024px)_and_(max-height:820px)]:lg:space-y-5 [@media(min-width:1024px)_and_(max-height:720px)]:lg:space-y-4 [@media(min-width:1024px)_and_(max-height:820px)]:lg:pb-3">
          <div className="space-y-1.5 sm:space-y-2 [@media(min-width:1024px)_and_(max-height:720px)]:lg:space-y-1">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 [@media(min-width:1024px)_and_(max-height:760px)]:lg:text-2xl">Sign in</h2>
            <p className="text-sm text-neutral-500 [@media(min-width:1024px)_and_(max-height:680px)]:lg:text-xs">输入学工号进入您的智能工作空间</p>
          </div>

          {serverError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-600 flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 [@media(min-width:1024px)_and_(max-height:820px)]:lg:space-y-4 [@media(min-width:1024px)_and_(max-height:720px)]:lg:space-y-3">
            <div className="space-y-4 [@media(min-width:1024px)_and_(max-height:780px)]:lg:space-y-3 [@media(min-width:1024px)_and_(max-height:680px)]:lg:space-y-2.5">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-neutral-700">学工号 (ID)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. 20230001"
                    className={`${inputCls} ${errors.username ? inputErrorCls : ''}`}
                    {...register('username')}
                  />
                </div>
                {errors.username && <p className="text-xs text-rose-500">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-neutral-700">密码 (Password)</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <LockKeyhole className="w-4 h-4 text-neutral-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`${inputCls} !pr-10 ${errors.password ? inputErrorCls : ''}`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-neutral-700">安全验证 (Verification)</label>
                {captchaLoading ? (
                  <div className="h-11 flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-neutral-400" />
                  </div>
                ) : captchaError ? (
                  <div className="h-11 flex items-center justify-center gap-2">
                    <span className="text-xs text-rose-500">{captchaError}</span>
                    <button type="button" onClick={refreshCaptcha} className="text-xs underline text-neutral-500 hover:text-neutral-900">重试</button>
                  </div>
                ) : (
                  <div className="flex gap-3 h-11">
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="输入右侧代码"
                      className={`flex-1 px-4 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 focus:bg-white transition-all duration-300 ${errors.captchaCode ? inputErrorCls : ''}`}
                      {...register('captchaCode')}
                    />
                    <div
                      onClick={refreshCaptcha}
                      className="w-[124px] shrink-0 bg-neutral-100/80 border border-neutral-200 rounded-xl relative overflow-hidden group cursor-pointer flex items-center justify-center"
                    >
                      {captchaImage ? (
                        <img src={captchaImage} alt="验证码" className="block h-full w-full" />
                      ) : (
                        <span className="text-[22px] font-medium tracking-[0.15em] text-neutral-800 select-none" style={{ fontFamily: 'Georgia, serif' }}>
                          ····
                        </span>
                      )}
                      <div className="absolute inset-0 bg-neutral-900/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                        <RefreshCcw className="w-4 h-4 text-neutral-700" />
                      </div>
                    </div>
                  </div>
                )}
                {errors.captchaCode && <p className="text-xs text-rose-500 mt-1">{errors.captchaCode.message}</p>}
              </div>
            </div>

            <label className="flex items-center cursor-pointer group w-fit">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" className="peer sr-only" {...register('remember')} />
                <div className="w-4 h-4 rounded-md border border-neutral-300 bg-white peer-checked:bg-neutral-900 peer-checked:border-neutral-900 transition-all duration-200" />
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="ml-2.5 text-[13px] text-neutral-600 group-hover:text-neutral-900 transition-colors select-none">保持会话 (Keep me signed in)</span>
            </label>

            <div className="space-y-3 pt-2 [@media(min-width:1024px)_and_(max-height:780px)]:lg:space-y-2 [@media(min-width:1024px)_and_(max-height:780px)]:lg:pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center gap-2">
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 验证中...</>
                  ) : (
                    <>进入系统 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </span>
              </button>

              <div className="relative flex items-center py-3 [@media(min-width:1024px)_and_(max-height:760px)]:lg:py-2 [@media(min-width:1024px)_and_(max-height:660px)]:lg:py-1.5">
                <div className="flex-grow border-t border-neutral-100" />
                <span className="flex-shrink-0 mx-4 text-[11px] text-neutral-400 uppercase tracking-widest font-mono">Alternative</span>
                <div className="flex-grow border-t border-neutral-100" />
              </div>

              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300"
              >
                <ShieldCheck className="w-4 h-4 text-neutral-500" />
                高校统一认证 (SSO)
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-8 border-t border-neutral-100 [@media(min-width:1024px)_and_(max-height:800px)]:lg:pt-4 [@media(min-width:1024px)_and_(max-height:680px)]:lg:pt-3 [@media(min-width:1024px)_and_(max-height:800px)]:lg:text-[11px]">
            <span>&copy; 2026 Nexus AI</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-neutral-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-neutral-900 transition-colors">Terms</a>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

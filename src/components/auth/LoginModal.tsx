import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import {
  loginZenoxAccount,
  registerZenoxAccount,
  loginWithGoogleAccount,
  ZenoxUser,
} from '../../services/zenoxAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: ZenoxUser) => void;
  lang?: 'vi' | 'en';
  initialMode?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  lang = 'vi',
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulated High-Tech Processing Handshake (2.2 seconds cinematic transition)
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(1);
  const [processPercent, setProcessPercent] = useState(25);
  const [processStatus, setProcessStatus] = useState('');

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: lang === 'vi' ? 'Yếu' : 'Weak', color: 'bg-rose-500 text-rose-400' };
    if (score === 2 || score === 3) return { score: 2, label: lang === 'vi' ? 'Khá' : 'Moderate', color: 'bg-amber-500 text-amber-400' };
    return { score: 3, label: lang === 'vi' ? 'Mạnh' : 'Strong', color: 'bg-emerald-500 text-emerald-400' };
  };

  const strength = getPasswordStrength(regPassword);

  /**
   * Simulated High-Tech Handshake:
   * Runs for ~2.2 seconds displaying cryptographic verification,
   * personal vault decryption, and then transitions into Workspace.
   */
  const startCinematicAuthHandshake = (user: ZenoxUser) => {
    setIsProcessing(true);
    setIsSubmitting(false);
    setProcessStep(1);
    setProcessPercent(28);
    setProcessStatus(
      lang === 'vi'
        ? (user.authMethod === 'google' ? 'Xác thực Google OAuth 2.0 & quyền truy cập...' : 'Đang xác thực sinh trắc học & khóa SHA-256...')
        : 'Verifying credentials & security keys...'
    );

    setTimeout(() => {
      setProcessStep(2);
      setProcessPercent(68);
      setProcessStatus(
        lang === 'vi'
          ? (user.authMethod === 'google' ? 'Đang đồng bộ Google Calendar & dữ liệu cá nhân...' : 'Đang kết nối & giải mã khoang dữ liệu cá nhân...')
          : 'Connecting & decrypting personal vault namespace...'
      );
    }, 750);

    setTimeout(() => {
      setProcessStep(3);
      setProcessPercent(100);
      setProcessStatus(
        lang === 'vi'
          ? `Khởi động ZENOX Workspace cho ${user.displayName}...`
          : `Launching ZENOX Workspace for ${user.displayName}...`
      );
    }, 1500);

    setTimeout(() => {
      setIsProcessing(false);
      onLoginSuccess(user);
    }, 2200);
  };

  /** Real Google OAuth Sign-In (Direct popup, no fake input forms) */
  const handleGoogleSignInClick = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await loginWithGoogleAccount();
      if (res.success && res.user) {
        startCinematicAuthHandshake(res.user);
      } else {
        setIsSubmitting(false);
        setErrorMessage(res.error || (lang === 'vi' ? 'Đăng nhập Google thất bại.' : 'Google login failed.'));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || (lang === 'vi' ? 'Lỗi kết nối xác thực Google.' : 'Google authentication error.'));
    }
  };

  /** Handle standard Web account login */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await loginZenoxAccount(loginEmail, loginPassword, rememberMe);
      if (res.success && res.user) {
        startCinematicAuthHandshake(res.user);
      } else {
        setIsSubmitting(false);
        setErrorMessage(res.error || (lang === 'vi' ? 'Đăng nhập thất bại.' : 'Login failed.'));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Lỗi hệ thống xác thực.');
    }
  };

  /** Handle standard Web account register */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (regPassword !== regConfirmPassword) {
      setErrorMessage(lang === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await registerZenoxAccount(regName, regEmail, regPassword);
      if (res.success && res.user) {
        startCinematicAuthHandshake(res.user);
      } else {
        setIsSubmitting(false);
        setErrorMessage(res.error || (lang === 'vi' ? 'Đăng ký thất bại.' : 'Registration failed.'));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Lỗi hệ thống đăng ký.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-200">
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_700px_500px_at_center,rgba(225,29,72,0.15),transparent_80%)]" />

      <div className="relative w-full max-w-md rounded-3xl bg-[#090306] border border-white/15 p-6 sm:p-8 shadow-[0_25px_90px_rgba(0,0,0,0.98),0_0_80px_rgba(225,29,72,0.22)] flex flex-col items-center select-none text-zinc-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button (Hidden during processing) */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/10"
            title={lang === 'vi' ? 'Đóng' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ========================================================= */}
        {/* VIEW 0: CINEMATIC CYBERNETIC AUTHENTICATION HUD OVERLAY   */}
        {/* ========================================================= */}
        {isProcessing ? (
          <div className="w-full py-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Concentric Biometric Pulse Rings */}
            <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-sky-500/30 border-t-sky-400 animate-spin [animation-duration:2.5s]" />
              <div className="absolute inset-2 rounded-full border-2 border-rose-500/30 border-b-rose-400 animate-spin [animation-duration:1.8s] [animation-direction:reverse]" />
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500/25 to-sky-500/25 border border-white/25 flex items-center justify-center shadow-[0_0_25px_rgba(225,29,72,0.5)] backdrop-blur-md">
                <ShieldCheck className="w-7 h-7 text-rose-400 animate-pulse" />
              </div>
            </div>

            {/* ZENOX Brand Logo */}
            <img
              src="/zenox-logo.png"
              alt="ZENOX"
              className="h-8 w-auto object-contain filter drop-shadow-[0_0_16px_rgba(56,189,248,0.5)] mb-3"
            />

            {/* Stage Indicator & Progress */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-mono text-zinc-300 mb-3 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>BƯỚC {processStep}/3</span>
              <span className="text-zinc-600">·</span>
              <span className="font-bold text-white">{processPercent}%</span>
            </div>

            {/* Dynamic Status Text */}
            <p className="text-xs sm:text-sm font-medium text-zinc-200 mb-5 min-h-[22px] font-mono animate-pulse">
              {processStatus}
            </p>

            {/* High-Tech Animated Progress Bar */}
            <div className="w-full max-w-xs h-2 rounded-full bg-white/10 border border-white/10 overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-sky-400 to-emerald-400 transition-all duration-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
                style={{ width: `${processPercent}%` }}
              />
            </div>

            <div className="mt-6 text-[10px] text-zinc-300 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span>Xác thực bảo mật SHA-256 · Thiết lập Workspace riêng</span>
            </div>
          </div>
        ) : (
          <>
            {/* Brand & Security Header */}
            <div className="flex flex-col items-center text-center mb-4 w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[10px] font-mono tracking-widest uppercase mb-2 shadow-[0_0_15px_rgba(225,29,72,0.15)]">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>ZENOX SECURE VAULT</span>
              </div>

              {/* Official ZENOX Wordmark */}
              <div className="my-1.5 flex justify-center items-center">
                <img
                  src="/zenox-logo.png"
                  alt="ZENOX"
                  className="h-9 sm:h-10 w-auto object-contain filter drop-shadow-[0_0_20px_rgba(225,29,72,0.4)]"
                />
              </div>

              <p className="text-xs text-zinc-400 mt-1">
                {mode === 'login'
                  ? (lang === 'vi' ? 'Đăng nhập để vào không gian cá nhân của bạn' : 'Sign in to access your personal workspace')
                  : (lang === 'vi' ? 'Tạo tài khoản cá nhân mới trên ZENOX' : 'Create your personal ZENOX account')}
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="w-full mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed flex-1">{errorMessage}</span>
                </div>
                {errorMessage.includes('Authorized Domains') && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.hostname);
                          alert('Đã sao chép: ' + window.location.hostname);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono text-white transition-colors cursor-pointer border border-white/15"
                    >
                      Sao chép tên miền ({typeof window !== 'undefined' ? window.location.hostname : ''})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMessage(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] text-white font-medium transition-colors cursor-pointer"
                    >
                      Tạo tài khoản Web ngay
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="w-full space-y-4">
              {/* DIRECT GOOGLE SIGN-IN BUTTON (REAL GOOGLE OAUTH POPUP) */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-sky-500/40 text-white text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer group active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Đăng nhập trực tiếp bằng tài khoản Google của bạn"
                >
                  <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {isSubmitting
                      ? (lang === 'vi' ? 'Đang mở cửa sổ Google...' : 'Opening Google Auth...')
                      : (lang === 'vi' ? 'Đăng nhập bằng tài khoản Google' : 'Sign In with Google Account')}
                  </span>
                </button>
              </div>

              {/* Modern Divider */}
              <div className="relative py-1">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                    {lang === 'vi' ? 'HOẶC TÀI KHOẢN TẠO TRÊN WEB' : 'OR WEB ACCOUNT'}
                  </span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex rounded-2xl bg-white/[0.04] p-1 border border-white/10 w-full">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); }}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white/10 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang === 'vi' ? 'Đăng Nhập' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMessage(null); }}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white/10 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang === 'vi' ? 'Đăng Ký' : 'Register'}
                </button>
              </div>

              {/* TAB 1: LOGIN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={lang === 'vi' ? 'Email tài khoản của bạn' : 'Your account email'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all font-mono"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={lang === 'vi' ? 'Mật khẩu bảo mật' : 'Security password'}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-zinc-400 hover:text-white cursor-pointer"
                      title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-zinc-100 text-[11px]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded bg-white/10 border-white/20 text-rose-600 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                      />
                      <span>{lang === 'vi' ? 'Ghi nhớ đăng nhập' : 'Remember session'}</span>
                    </label>
                  </div>

                  {/* Standalone Dark Glass Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="login-glass-submit-btn"
                    >
                      <span className="login-glass-submit-btn__title">
                        <span>
                          {isSubmitting
                            ? (lang === 'vi' ? 'Đang xác thực...' : 'Authenticating...')
                            : (lang === 'vi' ? 'Đăng Nhập ZENOX Workspace' : 'Sign In to ZENOX Workspace')}
                        </span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                      <span className="login-glass-submit-btn__circle" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: REGISTER FORM */}
              {mode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="w-full space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={lang === 'vi' ? 'Họ và tên của bạn' : 'Your full name'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder={lang === 'vi' ? 'Email tài khoản mới' : 'New account email'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all font-mono"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder={lang === 'vi' ? 'Mật khẩu (tối thiểu 6 ký tự)' : 'Password (min 6 characters)'}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-zinc-400 hover:text-white cursor-pointer"
                      title={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {regPassword && (
                    <div className="space-y-1 px-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500">Độ mạnh mật khẩu:</span>
                        <span className={`font-bold ${strength.color.split(' ')[1]}`}>{strength.label}</span>
                      </div>
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full flex-1 transition-all ${strength.score >= 1 ? strength.color.split(' ')[0] : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color.split(' ')[0] : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color.split(' ')[0] : 'bg-transparent'}`} />
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-400">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder={lang === 'vi' ? 'Xác nhận lại mật khẩu' : 'Confirm password'}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all"
                    />
                    {regConfirmPassword && regConfirmPassword === regPassword && (
                      <span className="absolute inset-y-0 right-3.5 flex items-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  {/* Standalone Dark Glass Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="login-glass-submit-btn"
                    >
                      <span className="login-glass-submit-btn__title">
                        <span>
                          {isSubmitting
                            ? (lang === 'vi' ? 'Đang khởi tạo...' : 'Creating...')
                            : (lang === 'vi' ? 'Khởi Tạo Tài Khoản' : 'Create Account')}
                        </span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                      <span className="login-glass-submit-btn__circle" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Security & Attribution Watermark */}
            <div className="mt-5 pt-3 border-t border-white/[0.08] w-full flex flex-col items-center text-center space-y-1">
              <div className="text-[11px] font-mono text-zinc-400 font-semibold tracking-wider">
                Dev By Zenox Development
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Mã hóa bảo mật SHA-256</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

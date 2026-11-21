import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Activity,
  Calendar,
  Clock,
  ArrowRight,
  Dumbbell,
  HeartPulse,
  Flame,
  ShieldCheck,
  Wallet,
  Zap,
  Cpu,
  Lock,
  Check,
  Play,
  ArrowDown,
  TrendingUp,
  Sparkles,
  Scale,
  Compass,
  ChevronRight,
  Layers,
  CircleDot,
  CheckCircle2,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenLogin?: () => void;
  isLoggedIn?: boolean;
  userName?: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onOpenLogin,
  isLoggedIn = false,
  userName,
  darkMode = true,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'ntn' | 'tdee' | 'schedule' | 'finance'>('ntn');
  const [activeNav, setActiveNav] = useState<string>('hero');
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  const scrollToSection = (id: string) => navigateToSection(id);

  const navigateToSection = (sectionId: string, previewTabId?: 'ntn' | 'tdee' | 'schedule' | 'finance') => {
    setActiveNav(previewTabId || sectionId);

    if (previewTabId) {
      setActiveTab(previewTabId);
    }

    setHighlightedSection(previewTabId ? 'preview' : sectionId);
    setTimeout(() => {
      setHighlightedSection(null);
    }, 2000);

    const el = document.getElementById(sectionId);
    if (el) {
      const topOffset = sectionId === 'hero' ? 0 : el.getBoundingClientRect().top + window.pageYOffset - 35;
      window.scrollTo({
        top: topOffset,
        behavior: 'smooth',
      });
    }
  };

  // ScrollSpy to sync active nav capsule indicator with page scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const previewEl = document.getElementById('preview');
      const scienceEl = document.getElementById('science');

      if (scienceEl && scrollY >= scienceEl.offsetTop - 300) {
        setActiveNav('science');
      } else if (previewEl && scrollY >= previewEl.offsetTop - 300) {
        setActiveNav(activeTab);
      } else {
        setActiveNav('hero');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#030002] text-zinc-100 font-sans selection:bg-rose-900 selection:text-white relative overflow-x-hidden p-2 sm:p-4 lg:p-6">
      {/* HERO FRAME CONTAINER (Exact Reference Monitor/Display Frame) */}
      <div className="relative rounded-[28px] sm:rounded-[36px] lg:rounded-[44px] bg-[#070205] border border-white/[0.08] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.9),0_0_120px_rgba(225,29,72,0.12)] min-h-[92vh] flex flex-col justify-between">
        {/* Dynamic Living Ambient Background with Organic Float */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Orb 1: Rose / Ruby Organic Pulse */}
          <div className="absolute top-[-5%] left-[18%] w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(225,29,72,0.22)_0%,transparent_70%)] blur-3xl animate-ambient-1" />
          {/* Orb 2: Electric Cyan / Blue Flare */}
          <div className="absolute top-[20%] right-[12%] w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,transparent_70%)] blur-3xl animate-ambient-2" />
          {/* Orb 3: Cosmic Purple */}
          <div className="absolute bottom-[5%] left-[30%] w-[600px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.16)_0%,transparent_70%)] blur-3xl animate-ambient-3" />
          
          {/* Cyber Grid with Moving Laser Scanline */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px] opacity-40"></div>
          <div className="absolute inset-x-0 h-28 bg-gradient-to-b from-transparent via-rose-500/10 to-transparent pointer-events-none animate-laser-scan" />
        </div>

        {/* TOP NAVIGATION BAR (Zero-Collision 3-Column Grid Layout) */}
        <header className="relative z-30 pt-5 px-4 sm:px-8 max-w-[1720px] mx-auto w-full grid grid-cols-[auto_1fr_auto] xl:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {/* Column 1: Official ZENOX Brand Logo */}
          <div className="flex items-center justify-start shrink-0">
            <div
              onClick={() => navigateToSection('hero')}
              title="ZENOX - Hệ điều hành hiệu suất cá nhân"
              className="cursor-pointer select-none py-1 group transition-transform duration-200 hover:scale-[1.03] flex items-center"
            >
              <img
                src="/zenox-logo.png"
                alt="ZENOX"
                className="h-7 sm:h-8 w-auto object-contain filter drop-shadow-[0_0_16px_rgba(56,189,248,0.45)]"
              />
            </div>
          </div>

          {/* Column 2: Mathematically Centered Capsule Navigation with Kinetic Gliding */}
          <div className="hidden lg:flex items-center justify-center min-w-0">
            <nav className="flex items-center gap-0.5 sm:gap-1 px-2 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs select-none whitespace-nowrap">
              {[
                { id: 'hero', label: 'Trang chủ', target: 'hero' },
                { id: 'ntn', label: 'Lộ trình NTN', target: 'preview', previewTab: 'ntn' },
                { id: 'tdee', label: 'TDEE Thích ứng', target: 'preview', previewTab: 'tdee' },
                { id: 'schedule', label: 'Lịch trình', target: 'preview', previewTab: 'schedule' },
                { id: 'finance', label: 'Tài chính', target: 'preview', previewTab: 'finance' },
                { id: 'science', label: 'Nguyên lý', target: 'science' },
              ].map((tab) => {
                const isActive = activeNav === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateToSection(tab.target, tab.previewTab as any)}
                    className={`relative px-3 py-1.5 rounded-full text-xs transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'text-white font-semibold bg-white/[0.12] border border-white/20 shadow-[0_0_16px_rgba(244,63,94,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] scale-[1.02]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-pulse" />
                    )}
                  </button>
                );
              })}

              <div className="h-3.5 w-px bg-white/15 mx-1" />

              <button
                onClick={() => navigateToSection('preview', 'ntn')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  activeNav === 'ntn'
                    ? 'bg-rose-500/25 border-rose-500/50 text-white shadow-[0_0_15px_rgba(225,29,72,0.35)]'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 text-rose-300 hover:text-white'
                }`}
              >
                <span>Mesocycle</span>
                <span className="text-[10px]">↗</span>
              </button>
            </nav>
          </div>

          {/* Column 3: Actions (Theme Toggle, Workspace Launch, User Glass Button) */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm group shrink-0"
              title={darkMode ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-300 transition-transform group-hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-rose-300 transition-transform group-hover:-rotate-12" />
              )}
            </button>

            {isLoggedIn ? (
              <>
                <button
                  onClick={onEnterApp}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-white transition-all cursor-pointer px-3.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.25)] hover:scale-[1.02] whitespace-nowrap"
                  title="Vào Workspace ZENOX"
                >
                  <span>Vào Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-300" />
                </button>

                <button
                  onClick={onEnterApp}
                  className="nav-glass-btn shrink-0"
                  title="Tài khoản ZENOX đã đăng nhập - Bấm để vào Workspace"
                >
                  <span className="nav-glass-btn__title">
                    {userName ? (userName.length > 12 ? userName.slice(0, 10) + '...' : userName) : 'Tài Khoản'}
                  </span>
                  <span className="nav-glass-btn__circle" aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenLogin}
                className="nav-glass-btn shrink-0"
                title="Đăng nhập tài khoản ZENOX bảo mật"
              >
                <span className="nav-glass-btn__title">
                  Đăng Nhập
                </span>
                <span className="nav-glass-btn__circle" aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        {/* HERO SECTION WITH CALM ENTRANCE & CRISP TYPOGRAPHY */}
        <div id="hero" className="relative z-20 flex-1 flex flex-col justify-center items-center px-4 sm:px-8 py-12 sm:py-16 text-center max-w-5xl mx-auto w-full animate-calm-fade-rise select-none">
          {/* Version Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/15 text-xs text-zinc-300 mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"></span>
            <span className="font-medium tracking-wide">Hệ điều hành hiệu suất cá nhân</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 font-mono text-[11px]">v2.4 Core</span>
          </div>

          {/* Grand Headline: Solid High-Contrast Typography (No Blurry Gradient Text) */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.12] [text-wrap:balance] max-w-4xl mx-auto mb-6 text-center">
            <span>Nền Tảng Điều Hành</span>{' '}
            <span className="text-rose-400 animate-text-shimmer">Thể Hình &amp; Hiệu Suất</span>
          </h1>

          {/* Subtitle: Clean, Readable zinc-300 with Proper Line-Height */}
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto mb-8 font-normal [text-wrap:balance] text-center">
            Hợp nhất quản trị thời gian làm việc tập trung, dữ liệu tài chính và giao thức thể hình Mesocycle với thuật toán TDEE thích ứng theo dữ liệu chuyển hóa thực tế.
          </p>

          {/* Primary Action Pairing */}
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={onEnterApp}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 text-sm font-semibold transition-all duration-200 cursor-pointer shadow-[0_4px_25px_rgba(255,255,255,0.25)] hover:scale-[1.01] active:scale-[0.98]"
            >
              <span>Vào Ứng Dụng Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigateToSection('preview', 'ntn')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-zinc-200 hover:text-white text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <span>Khám Phá Tính Năng</span>
              <span className="text-xs text-zinc-400">↓</span>
            </button>
          </div>


          {/* ANCHORED 4-METRIC CRAFTED BAR (Replaces Chaotic Orbiting Sway Nodes) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 max-w-4xl mx-auto w-full mt-12 text-left">
            <div
              onClick={() => navigateToSection('preview', 'ntn')}
              className="card-futuristic-interactive p-4 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 group-hover:text-rose-300 transition-colors">01 / Lộ trình NTN</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              </div>
              <div className="text-base font-bold text-white mt-1.5 tabular-nums group-hover:text-rose-200 transition-colors">2.302 kcal</div>
              <div className="text-xs text-zinc-400 mt-0.5">Mesocycle Tuần 3/12</div>
            </div>

            <div
              onClick={() => navigateToSection('preview', 'tdee')}
              className="card-futuristic-interactive p-4 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 group-hover:text-emerald-300 transition-colors">02 / TDEE Thích ứng</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="text-base font-bold text-rose-300 mt-1.5 tabular-nums group-hover:text-emerald-300 transition-colors">2.780 kcal/ngày</div>
              <div className="text-xs text-zinc-400 mt-0.5">Thuật toán Hall et al.</div>
            </div>

            <div
              onClick={() => navigateToSection('preview', 'schedule')}
              className="card-futuristic-interactive p-4 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 group-hover:text-blue-300 transition-colors">03 / Lịch trình Khối</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>
              <div className="text-base font-bold text-white mt-1.5 tabular-nums group-hover:text-blue-200 transition-colors">94% Tuân thủ</div>
              <div className="text-xs text-zinc-400 mt-0.5">Deep Work 4.5h/ngày</div>
            </div>

            <div
              onClick={() => navigateToSection('preview', 'finance')}
              className="card-futuristic-interactive p-4 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 group-hover:text-amber-300 transition-colors">04 / Tài chính cá nhân</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
              <div className="text-base font-bold text-emerald-400 mt-1.5 tabular-nums group-hover:text-amber-200 transition-colors">Đầu tư 35%</div>
              <div className="text-xs text-zinc-400 mt-0.5">Kiểm soát dòng tiền</div>
            </div>
          </div>
        </div>

        {/* BOTTOM NAV BAR SCROLL HINT */}
        <div className="relative z-30 pb-6 px-6 sm:px-10 flex items-center justify-between text-xs text-zinc-400 font-mono select-none">
          <button
            onClick={() => navigateToSection('preview', 'ntn')}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer group"
          >
            <div className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center group-hover:translate-y-0.5 transition-transform">
              <ArrowDown className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[11px]">Cuộn xuống xem bảng điều khiển</span>
          </button>

          <div className="text-[11px] text-zinc-400">
            ZENOX OS · Khoa Học Thể Hình &amp; Hiệu Suất
          </div>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE PERFORMANCE TERMINAL */}
      <section id="preview" className="pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="text-xs font-mono text-rose-400 tracking-wider">BẢNG ĐIỀU KHIỂN TƯƠNG TÁC THỰC TẾ</div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
            Trải nghiệm hệ điều hành ZENOX
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed [text-wrap:balance]">
            Chọn từng module bên dưới để quan sát dữ liệu và mô hình tính toán thích ứng theo thời gian thực.
          </p>
        </div>

        <div className={`relative rounded-[28px] p-[1.5px] bg-gradient-to-b from-white/30 via-white/10 to-transparent shadow-[0_25px_90px_-20px_rgba(225,29,72,0.35),0_0_60px_rgba(0,0,0,0.85)] transition-all duration-500 ${
          highlightedSection === 'preview' ? 'animate-target-pulse ring-2 ring-rose-500/60' : ''
        }`}>
          <div className="rounded-[26px] bg-[#0c050a]/95 backdrop-blur-3xl border border-white/[0.08] overflow-hidden shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent z-20"></div>

            <div className="h-14 px-6 bg-white/[0.02] backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_8px_rgba(255,95,86,0.6)]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_8px_rgba(255,189,46,0.6)]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_8px_rgba(39,201,63,0.6)]"></div>
                </div>
                <span className="font-mono text-[11px] text-zinc-400 pl-2 border-l border-white/10">
                  zenox.engine // interactive_human_performance_core
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-3 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
                  Đồng bộ hóa 0ms
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">Mesocycle 1 (Tuần 3/12)</span>
              </div>
            </div>

            <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] bg-black/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: 'ntn', label: 'Lộ trình NTN', icon: Dumbbell },
                  { id: 'tdee', label: 'TDEE Thích Ứng', icon: Flame },
                  { id: 'schedule', label: 'Lịch trình Time-Block', icon: Clock },
                  { id: 'finance', label: 'Quản Trị Tài Chính', icon: Wallet },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-rose-600/35 text-white border border-rose-500/50 shadow-[0_0_20px_rgba(225,29,72,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-rose-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Mô phỏng tương tác thực tế</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {activeTab === 'ntn' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/30 via-white/[0.02] to-transparent border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-700/10 border border-rose-500/40 flex items-center justify-center text-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                          <Dumbbell className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-mono text-rose-400 tracking-wider">LỘ TRÌNH THỂ HÌNH CHU KỲ HÓA (NTN)</div>
                          <div className="text-lg font-bold text-white">Giai đoạn Xây dựng Cơ nạc (Hypertrophy Meso 1)</div>
                          <div className="text-xs text-zinc-400">Tuần 3 trong chu kỳ 12 tuần · Target RPE: 8 (RIR 2)</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                          <span className="text-zinc-500 block text-[10px]">MỤC TIÊU CALO</span>
                          <span className="text-white font-bold text-sm tabular-nums">2.302 kcal</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                          <span className="text-zinc-500 block text-[10px]">ĐẠM (MPS 3.2G LEUCINE)</span>
                          <span className="text-rose-300 font-bold text-sm tabular-nums">110g</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                          <span className="text-zinc-500 block text-[10px]">TINH BỘT</span>
                          <span className="text-white font-bold text-sm tabular-nums">310g</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                          <span className="text-zinc-500 block text-[10px]">CHẤT BÉO</span>
                          <span className="text-white font-bold text-sm tabular-nums">69g</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200">Ngực (Chest Volume)</span>
                        <span className="font-mono text-rose-400 font-bold">14 / 18 sets (MAV)</span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full w-[78%] shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>MEV: 10 sets</span>
                        <span className="text-rose-300">MAV: 14 sets</span>
                        <span>MRV: 18 sets</span>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200">Lưng (Back Volume)</span>
                        <span className="font-mono text-rose-400 font-bold">16 / 20 sets (MAV)</span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full w-[80%] shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>MEV: 12 sets</span>
                        <span className="text-rose-300">MAV: 16 sets</span>
                        <span>MRV: 20 sets</span>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200">Đùi trước (Quads Volume)</span>
                        <span className="font-mono text-rose-400 font-bold">12 / 16 sets (MAV)</span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full w-[75%] shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>MEV: 8 sets</span>
                        <span className="text-rose-300">MAV: 12 sets</span>
                        <span>MRV: 16 sets</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tdee' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/20 to-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                          <Flame className="w-4 h-4 text-rose-500" />
                          <span>Tiêu hao chuyển hóa thực nghiệm</span>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          100% tin cậy (14 ngày)
                        </span>
                      </div>

                      <div>
                        <div className="text-3xl font-bold text-white tracking-tight tabular-nums ">
                          2.093 <span className="text-base font-normal text-zinc-400">kcal/ngày</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Phương trình cân bằng năng lượng thực nghiệm Hall et al.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] space-y-2 text-xs font-mono text-zinc-400">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Cân nặng làm mịn (EMA)</span>
                          <span className="text-white font-bold tabular-nums">68.20 kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Tốc độ biến thiên cân</span>
                          <span className="text-emerald-400 font-bold tabular-nums">-0.35 kg/tuần</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Khuyến nghị thặng dư</span>
                          <span className="text-rose-300 font-bold tabular-nums">+209 kcal</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/20 to-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                          <HeartPulse className="w-4 h-4 text-rose-500" />
                          <span>Cronometer &amp; Vi chất tối ưu</span>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/15">
                          95+ chỉ số
                        </span>
                      </div>

                      <div>
                        <div className="text-3xl font-bold text-white tracking-tight tabular-nums ">
                          100% <span className="text-base font-normal text-zinc-400">độ phủ vi chất</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Ngưỡng Leucine kích hoạt tổng hợp cơ bắp (MPS)
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] space-y-2.5 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1 font-mono">
                            <span className="text-zinc-400">Ngưỡng Leucine MPS</span>
                            <span className="text-rose-300 font-bold">3.2g / 3.0g chuẩn</span>
                          </div>
                          <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full w-[100%] shadow-[0_0_8px_rgba(225,29,72,0.6)]"></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1 font-mono">
                            <span className="text-zinc-400">Tỷ lệ Omega 3:6</span>
                            <span className="text-emerald-400 font-bold">1:3.2 (Chống viêm)</span>
                          </div>
                          <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full w-[95%] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/20 to-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                          <Scale className="w-4 h-4 text-rose-500" />
                          <span>Cân Bằng Năng Lượng</span>
                        </div>
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10">
                          Equation
                        </span>
                      </div>

                      <div className="font-mono text-xs text-zinc-300 space-y-2 p-3 rounded-xl bg-black/30 border border-white/[0.06]">
                        <div className="text-[11px] text-zinc-500 font-sans">Mô hình toán học Hall:</div>
                        <div className="text-rose-300">TDEE = Intake - (ΔWeight_EMA × 7700)</div>
                        <div className="text-zinc-400 text-[11px]">→ 2.302 - (+209) = 2.093 kcal</div>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Tự động bóc tách nước, glycogen và chất thải để tính chính xác lượng mỡ/cơ thay đổi hàng tuần.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-6 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-rose-500" />
                        <span className="font-bold text-white text-sm">Khối thời gian tập trung hôm nay</span>
                      </div>
                      <span className="font-mono text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-zinc-400">
                        Pomodoro 90 phút / khối
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-rose-400 font-bold">06:30 - 07:30</span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">THỂ HÌNH</span>
                        </div>
                        <div className="font-semibold text-white text-sm">Tập NTN Push A</div>
                        <div className="text-xs text-zinc-400">Ngực, vai, tay sau · RPE 8</div>
                      </div>

                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-blue-400 font-bold">08:30 - 11:30</span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">DEEP WORK</span>
                        </div>
                        <div className="font-semibold text-white text-sm">Khối làm việc sâu 1</div>
                        <div className="text-xs text-zinc-400">Phát triển sản phẩm &amp; Code</div>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-amber-400 font-bold">12:00 - 12:45</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">MACRO</span>
                        </div>
                        <div className="font-semibold text-white text-sm">Bữa trưa dinh dưỡng 1</div>
                        <div className="text-xs text-zinc-400">850 kcal · 42g Đạm (MPS 3.5g)</div>
                      </div>

                      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-purple-400 font-bold">14:00 - 17:00</span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">DEEP WORK</span>
                        </div>
                        <div className="font-semibold text-white text-sm">Khối làm việc sâu 2</div>
                        <div className="text-xs text-zinc-400">Review chiến lược &amp; Tài chính</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-3">
                      <div className="text-xs text-zinc-400 font-mono">DÒNG TIỀN RÒNG THÁNG NÀY</div>
                      <div className="text-3xl font-bold text-emerald-400 tabular-nums ">
                        +18.500.000 <span className="text-sm font-normal text-zinc-400">₫</span>
                      </div>
                      <p className="text-xs text-zinc-400">Thu nhập vượt chi tiêu 42%, bảo toàn vốn kỷ luật.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-3">
                      <div className="text-xs text-zinc-400 font-mono">MÔ HÌNH PHÂN BỔ 6 LỌ</div>
                      <div className="text-3xl font-bold text-white tabular-nums ">
                        100% <span className="text-sm font-normal text-zinc-400">tuân thủ</span>
                      </div>
                      <p className="text-xs text-zinc-400">Nhu cầu 55%, Tiết kiệm 10%, Đầu tư 10%, Hưởng thụ 10%.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-3">
                      <div className="text-xs text-zinc-400 font-mono">QUỸ DỰ PHÒNG KHẨN CẤP</div>
                      <div className="text-3xl font-bold text-rose-300 tabular-nums ">
                        6 <span className="text-sm font-normal text-zinc-400">tháng sinh hoạt</span>
                      </div>
                      <p className="text-xs text-zinc-400">Đạt ngưỡng an toàn tài chính tuyệt đối.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FOUR CORE PILLARS WITH UNIFORM HEIGHT & BALANCED TEXT */}
      <section id="pillars" className="py-24 border-t border-white/[0.08] px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="text-xs font-mono text-rose-400 tracking-wider">HỆ THỐNG VẬN HÀNH TOÀN DIỆN</div>
          <h2 className="text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
            Bốn trụ cột hiệu suất cao
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed [text-wrap:balance]">
            Mỗi module được thiết kế với chất lượng hoàn thiện chuẩn xác, dựa trên nguyên tắc khoa học thực nghiệm thay vì cảm tính.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          <div className="relative group p-6 rounded-3xl bg-white/[0.025] hover:bg-white/[0.045] backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between space-y-6 h-full">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/25 to-rose-700/10 border border-rose-500/35 flex items-center justify-center text-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.25)]">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white [text-wrap:balance]">Lộ trình thể hình (NTN)</h3>
              <p className="text-xs text-zinc-300 leading-relaxed [text-wrap:balance]">
                Chu kỳ hóa Mesocycle 8-12 tuần theo giao thức RP. Kiểm soát thể tích cơ bắp MEV, MAV và MRV để tối ưu hóa phì đại cơ nạc mà không quá tải hệ thần kinh.
              </p>
            </div>
            <ul className="text-xs font-mono text-zinc-400 space-y-2 pt-4 border-t border-white/[0.06]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Quá tải lũy tiến theo RPE/RIR</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Theo dõi thể tích từng nhóm cơ</span>
              </li>
            </ul>
          </div>

          <div className="relative group p-6 rounded-3xl bg-white/[0.025] hover:bg-white/[0.045] backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between space-y-6 h-full">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/25 to-rose-700/10 border border-rose-500/35 flex items-center justify-center text-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.25)]">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white [text-wrap:balance]">TDEE Thích Ứng</h3>
              <p className="text-xs text-zinc-300 leading-relaxed [text-wrap:balance]">
                Thuật toán cân bằng năng lượng thực nghiệm Hall et al. Tự động cập nhật mức calo mục tiêu mỗi ngày từ lượng nạp thực tế và xu hướng cân nặng làm mịn EMA.
              </p>
            </div>
            <ul className="text-xs font-mono text-zinc-400 space-y-2 pt-4 border-t border-white/[0.06]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Loại bỏ hoàn toàn nhiễu nước</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Chuẩn xác theo chuyển hóa cá nhân</span>
              </li>
            </ul>
          </div>

          <div className="relative group p-6 rounded-3xl bg-white/[0.025] hover:bg-white/[0.045] backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between space-y-6 h-full">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/25 to-rose-700/10 border border-rose-500/35 flex items-center justify-center text-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.25)]">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white [text-wrap:balance]">Lịch trình đa nhiệm</h3>
              <p className="text-xs text-zinc-300 leading-relaxed [text-wrap:balance]">
                Time-blocking 5 góc nhìn với cơ chế kéo thả mượt mà. Tích hợp đồng hồ tập trung Pomodoro, phân loại danh mục thông minh và đồng bộ hóa ngoại tuyến.
              </p>
            </div>
            <ul className="text-xs font-mono text-zinc-400 space-y-2 pt-4 border-t border-white/[0.06]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Kiến trúc Offline-First an toàn</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Tích hợp Google Calendar OAuth</span>
              </li>
            </ul>
          </div>

          <div className="relative group p-6 rounded-3xl bg-white/[0.025] hover:bg-white/[0.045] backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between space-y-6 h-full">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/25 to-rose-700/10 border border-rose-500/35 flex items-center justify-center text-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.25)]">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white [text-wrap:balance]">Quản lý tài chính</h3>
              <p className="text-xs text-zinc-300 leading-relaxed [text-wrap:balance]">
                Quản trị dòng tiền kỷ luật với mô hình phân bổ quỹ 6 lọ. Báo cáo dòng tiền ròng, tỷ lệ tiết kiệm và giám sát chi tiêu theo từng hạn mức danh mục.
              </p>
            </div>
            <ul className="text-xs font-mono text-zinc-400 space-y-2 pt-4 border-t border-white/[0.06]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Theo dõi dòng tiền ròng thực tế</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Bảo toàn vốn và mục tiêu dài hạn</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 4: COMPARISON MATRIX */}
      <section id="science" className="py-24 border-t border-white/[0.08] px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="text-xs font-mono text-rose-400 tracking-wider">SO SÁNH BẢN CHẤT</div>
          <h2 className="text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
            Nguyên lý khoa học vs. Phương pháp truyền thống
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed [text-wrap:balance]">
            Sự khác biệt giữa các ứng dụng ước tính tĩnh thông thường và hệ thống thích ứng dữ liệu thực nghiệm của ZENOX.
          </p>
        </div>

        <div className={`rounded-3xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-2xl shadow-2xl transition-all duration-500 ${
          highlightedSection === 'science' ? 'animate-target-pulse ring-2 ring-rose-500/60' : ''
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
            <div className="p-8 space-y-6 bg-black/40">
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-bold">
                ỨNG DỤNG TRUYỀN THỐNG
              </div>
              <ul className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-mono font-bold text-sm mt-0.5 shrink-0">✕</span>
                  <span className="[text-wrap:balance]">
                    <strong className="text-zinc-300">TDEE cố định bất biến:</strong> Sử dụng công thức tĩnh (Harris-Benedict, Mifflin-St Jeor) và không bao giờ tự động điều chỉnh theo thích ứng chuyển hóa khi cơ thể thâm hụt hoặc thặng dư.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-mono font-bold text-sm mt-0.5 shrink-0">✕</span>
                  <span className="[text-wrap:balance]">
                    <strong className="text-zinc-300">Nhiễu cân nặng tức thời:</strong> Người dùng dễ hoang mang trước các biến động cân nặng ngắn hạn do nước, natri và glycogen thay vì nhìn vào đường xu hướng làm mịn.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-mono font-bold text-sm mt-0.5 shrink-0">✕</span>
                  <span className="[text-wrap:balance]">
                    <strong className="text-zinc-300">Dữ liệu phân mảnh:</strong> Lịch làm việc, nhật ký tạ, dinh dưỡng và chi tiêu tài chính nằm ở 4 app khác nhau, không có sự cộng hưởng về năng lượng và thời gian.
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-8 space-y-6 bg-gradient-to-br from-rose-950/25 via-white/[0.02] to-transparent relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent"></div>
              <div className="text-xs font-mono text-rose-300 uppercase tracking-wider font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)]"></span>
                HỆ THỐNG ZENOX ADAPTIVE CORE
              </div>
              <ul className="space-y-4 text-xs text-zinc-200 leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-mono font-bold text-sm mt-0.5 shrink-0">✓</span>
                  <span className="[text-wrap:balance]">
                    <strong className="text-white">TDEE động thích ứng thực nghiệm:</strong> Hiệu chỉnh liên tục mỗi ngày dựa trên độ dốc cân nặng thực tế và nhật ký calo theo mô hình toán học Hall et al.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-mono font-bold text-sm mt-0.5 shrink-0">✓</span>
                  <span className="[text-wrap:balance]">
                    <strong className="text-white">Lọc làm mịn số liệu EMA:</strong> Thuật toán lọc trung bình hàm mũ bóc tách mô mỡ thực tế khỏi các biến động nước, giúp quyết định dinh dưỡng chuẩn xác.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-mono font-bold text-sm mt-0.5 shrink-0">✓</span>
                  <span className="[text-wrap:balance]">
                    <strong className="text-white">Hợp nhất hiệu suất toàn diện:</strong> Lịch trình time-blocking bảo vệ giờ tập NTN, quản trị năng lượng trao đổi chất và kiểm soát chi tiêu cùng một nơi.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.08] py-8 px-6 bg-[#040102]/90 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-3 select-none">
            <img
              src="/zenox-logo.png"
              alt="ZENOX"
              className="h-6 w-auto object-contain opacity-95 hover:opacity-100 transition-opacity"
            />
            <span className="text-zinc-400">· Hệ điều hành hiệu suất cá nhân © 2026</span>
            <span className="text-zinc-600 hidden sm:inline">|</span>
            <span className="text-rose-400 font-mono text-[11px] font-semibold tracking-wider">
              Dev By Zenox Development
            </span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span className="text-zinc-500">Thiết kế theo chuẩn Cinema Viewport &amp; Neural Nodes</span>
            <button
              onClick={onEnterApp}
              className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-semibold"
            >
              Khởi động ứng dụng →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
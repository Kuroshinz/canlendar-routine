import { notifySuccess } from '../../../utils/notify';
import React, { useState, useMemo } from 'react';
import {
  User,
  Target,
  Edit2,
  Check,
  Sparkles,
  ShieldCheck,
  LogIn,
  Flame,
  Activity,
  HeartPulse,
  Dumbbell,
  Compass,
  Scale,
  History,
  ChevronRight,
  TrendingUp,
  Zap,
  Calendar,
  CheckCircle2,
  Layers,
  ArrowRight,
  Clock,
  Award,
} from 'lucide-react';
import {
  ACTIVITY_LABEL,
  ActivityLevel,
  BodyPoint,
  CtgPeriodizedRoadmap,
  CtgProfile,
  GOAL_LABEL,
  Goal,
  Sex,
} from '../../../types/productivity';
import { ffmi, leanMassKg, fatMassKg, ffmiCategory, tdee } from '../../../utils/fitnessMetrics';

interface ProfileTabProps {
  profile: CtgProfile;
  currentUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onGoogleSignIn?: () => Promise<void>;
  lang: 'vi' | 'en';
  onUpdateProfile: (patch: Partial<CtgProfile>) => void;
  bodyPoints?: BodyPoint[];
  ctgPeriodizedRoadmap?: CtgPeriodizedRoadmap | null;
  savedCtgRoadmaps?: CtgPeriodizedRoadmap[];
  onNavigateTab?: (tab: 'overview' | 'roadmap' | 'inbody' | 'training' | 'nutrition' | 'profile') => void;
  onSwitchCtgRoadmap?: (roadmapId: string) => void;
  onDeleteCtgRoadmap?: (roadmapId: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  currentUser,
  onGoogleSignIn,
  lang,
  onUpdateProfile,
  bodyPoints = [],
  ctgPeriodizedRoadmap,
  savedCtgRoadmaps = [],
  onNavigateTab,
  onSwitchCtgRoadmap,
  onDeleteCtgRoadmap,
}) => {
  const [editing, setEditing] = useState(false);
  const effectiveName = currentUser?.displayName || profile.name || 'Người dùng CTG';
  const effectiveEmail = currentUser?.email || profile.email;

  const [name, setName] = useState(effectiveName);
  const [age, setAge] = useState(String(profile.age || 25));
  const [sex, setSex] = useState<Sex>(profile.sex || 'male');
  const [heightCm, setHeightCm] = useState(String(profile.heightCm || 172));
  const [goal, setGoal] = useState<Goal>(profile.goal || 'cut');
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity || 'moderate');
  const [targetWeightKg, setTargetWeightKg] = useState(String(profile.targetWeightKg || 68));
  const [targetBodyFatPct, setTargetBodyFatPct] = useState(String(profile.targetBodyFatPct || 15));
  const [stepGoal, setStepGoal] = useState(String(profile.stepGoal || 8000));

  // Biometrics from latest BodyPoint or profile
  const latestPoint = useMemo(() => {
    if (!bodyPoints.length) return null;
    const sorted = [...bodyPoints].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    return sorted[sorted.length - 1];
  }, [bodyPoints]);

  const curWeight = latestPoint?.weightKg ?? profile.targetWeightKg ?? 70;
  const curBf = latestPoint?.bodyFatPct ?? profile.targetBodyFatPct ?? 18;
  const curHeight = profile.heightCm || 172;
  const curLbm = leanMassKg(curWeight, curBf);
  const curFfmi = ffmi(curWeight, curBf, curHeight);
  const curBmr = Math.round(370 + 21.6 * curLbm);
  const curTdee = tdee(profile, curWeight);
  const idealBf = profile.sex === 'male' ? 15 : 23;
  const ffmiBand = ffmiCategory(curFfmi, profile.sex);

  const bfAssessment = useMemo(() => {
    const diff = curBf - idealBf;
    if (diff <= 0) return { label: 'Mức mỡ lý tưởng', tone: 'text-emerald-400', desc: 'Độ nhạy insulin đỉnh cao, tối ưu hấp thụ dưỡng chất để tăng cơ.' };
    if (diff <= 4) return { label: 'Hơi cao hơn lý tưởng', tone: 'text-amber-400', desc: 'Có thể vào sóng tăng cơ hoặc siết nhẹ 3-4 tuần trước khi bulk.' };
    return { label: 'Cao hơn mức lý tưởng', tone: 'text-rose-400', desc: 'Khuyến nghị ưu tiên giảm mỡ trước theo CTG để tăng độ nhạy insulin & tối ưu P-ratio.' };
  }, [curBf, idealBf]);

  const allRoadmaps = useMemo(() => {
    const list = [...savedCtgRoadmaps];
    if (ctgPeriodizedRoadmap && !list.some((r) => r.id === ctgPeriodizedRoadmap.id)) {
      list.unshift(ctgPeriodizedRoadmap);
    }
    return list;
  }, [savedCtgRoadmaps, ctgPeriodizedRoadmap]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      age: Number(age) || profile.age,
      sex,
      heightCm: Number(heightCm) || profile.heightCm,
      goal,
      activity,
      targetWeightKg: Number(targetWeightKg) || profile.targetWeightKg,
      targetBodyFatPct: Number(targetBodyFatPct) || profile.targetBodyFatPct,
      stepGoal: Number(stepGoal) || profile.stepGoal,
    });
    setEditing(false);
    notifySuccess('Cập nhật hồ sơ thành công!', 'Các chỉ số thể hình & mục tiêu mới đã được lưu.');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Official CTG Profile Identity Header */}
      <div className="bg-[#050102] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-rose-500/40 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-900 text-white flex items-center justify-center font-bold text-2xl shadow-lg shrink-0 border border-rose-500/40">
                {effectiveName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
                  {effectiveName}
                </h1>
                {currentUser?.email ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Đã liên kết Google
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white/60 border border-white/10">
                    Hồ sơ cá nhân (Offline)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-white/60">
                {effectiveEmail && <span className="font-mono text-white/70">{effectiveEmail}</span>}
                <span>Chi nhánh: <strong className="text-white/90">Cá nhân (CTG Pro)</strong></span>
                <span className="text-rose-400 font-semibold">• Toàn quyền sở hữu dữ liệu</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!currentUser?.email && onGoogleSignIn && (
              <button
                type="button"
                onClick={() => onGoogleSignIn()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 shadow-xs cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4 text-rose-400" />
                <span>Liên kết Google Sync</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{editing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa thông số'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CTG Biometrics & InBody Performance Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-[#070205] border border-white/10 shadow-xs">
          <div className="text-[10px] text-white/40 uppercase font-semibold">Cân nặng hiện tại</div>
          <div className="text-xl font-bold font-display text-white mt-1">
            {curWeight} <span className="text-xs font-normal text-white/50">kg</span>
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Mục tiêu: <span className="text-rose-400 font-semibold">{profile.targetWeightKg} kg</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070205] border border-white/10 shadow-xs">
          <div className="text-[10px] text-white/40 uppercase font-semibold">Tỷ lệ mỡ Bodyfat</div>
          <div className="text-xl font-bold font-display text-rose-400 mt-1">
            {curBf} <span className="text-xs font-normal text-white/50">%</span>
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Lý tưởng: <span className="text-white/80 font-semibold">{idealBf}%</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070205] border border-white/10 shadow-xs">
          <div className="text-[10px] text-white/40 uppercase font-semibold">Khối cơ nạc (LBM)</div>
          <div className="text-xl font-bold font-display text-emerald-400 mt-1">
            {curLbm} <span className="text-xs font-normal text-white/50">kg</span>
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Mỡ: <span className="text-white/80 font-semibold">{fatMassKg(curWeight, curBf)} kg</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070205] border border-white/10 shadow-xs">
          <div className="text-[10px] text-white/40 uppercase font-semibold">Chỉ số cơ nạc FFMI</div>
          <div className="text-xl font-bold font-display text-sky-400 mt-1">
            {curFfmi} <span className="text-xs font-normal text-white/50">pts</span>
          </div>
          <div className="text-[11px] text-white/50 mt-1 truncate" title={ffmiBand.label}>
            Xếp hạng: <span className="text-white/90 font-semibold">{ffmiBand.label}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070205] border border-white/10 shadow-xs">
          <div className="text-[10px] text-white/40 uppercase font-semibold">Trao đổi chất BMR</div>
          <div className="text-xl font-bold font-display text-amber-400 mt-1">
            {curBmr.toLocaleString()} <span className="text-xs font-normal text-white/50">kcal</span>
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            Katch-McArdle LBM
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#070205] border border-white/10 shadow-xs">
          <div className="text-[10px] text-white/40 uppercase font-semibold">Tiêu thụ TDEE</div>
          <div className="text-xl font-bold font-display text-purple-400 mt-1">
            {curTdee.toLocaleString()} <span className="text-xs font-normal text-white/50">kcal</span>
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            {ACTIVITY_LABEL[profile.activity]}
          </div>
        </div>
      </div>

      {/* 3. CTG Official Section: Lịch sử và Phân tích (matching ctg-web /app/profile) */}
      <section aria-label="Lịch sử và phân tích" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-rose-500" />
              Lịch Sử và Phân Tích Lộ Trình CTG
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Định hướng chu kỳ sóng tăng cơ & mini-cut, hồ sơ tiến độ InBody và lịch sử tạo lộ trình.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Lập Lộ Trình Mới */}
          <div
            onClick={() => onNavigateTab?.('roadmap')}
            className="group p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-[#070205] to-[#0a0307] border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer shadow-lg hover:shadow-rose-950/40 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl group-hover:bg-rose-600/20 transition-all" />
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/40">
                4 Bước Chuẩn CTG
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
              <span>Lập Lộ Trình Chu Kỳ Mới</span>
              <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Khảo sát BMR, NEAT bước chân, EAT kháng lực, FFMI mục tiêu và sinh tự động chu kỳ sóng Hypertrophy + Mini-cut.
            </p>
          </div>

          {/* Card 2: Lịch sử tạo lộ trình */}
          <div
            onClick={() => onNavigateTab?.('roadmap')}
            className="group p-5 rounded-2xl bg-[#070205] border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                <History className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-white/50">
                {allRoadmaps.length} bản ghi
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
              <span>Lịch Sử Tạo Lộ Trình</span>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              {ctgPeriodizedRoadmap ? (
                <span>Đang áp dụng: <strong className="text-white/90">{ctgPeriodizedRoadmap.title || 'Lộ trình CTG'}</strong> ({ctgPeriodizedRoadmap.phases?.length || 0} chặng).</span>
              ) : (
                'Xem lại các lộ trình đã tạo, chuyển đổi giáo án và mục tiêu dinh dưỡng bất cứ lúc nào.'
              )}
            </p>
          </div>

          {/* Card 3: Kết quả phân tích InBody & Check Body */}
          <div
            onClick={() => onNavigateTab?.('inbody')}
            className="group p-5 rounded-2xl bg-[#070205] border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono text-white/50">
                {bodyPoints.length} lần đo
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
              <span>Tiến Độ InBody & Check Body</span>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Theo dõi biểu đồ cân nặng, tỷ lệ mỡ, cơ nạc LBM và album ảnh check body trực quan theo tuần.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Active Roadmap Fast Switcher (if saved roadmaps exist) */}
      {allRoadmaps.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#070205] border border-white/10 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Danh Sách Lộ Trình Trong Thư Viện
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab?.('roadmap')}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Quản lý chi tiết ›
            </button>
          </div>

          <div className="space-y-2">
            {allRoadmaps.map((rm) => {
              const isCurrent = ctgPeriodizedRoadmap?.id === rm.id;
              return (
                <div
                  key={rm.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-rose-950/30 border-rose-500/40 text-white'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/8'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{rm.title || 'Lộ trình CTG'}</span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                          <CheckCircle2 className="w-3 h-3" />
                          Đang Áp Dụng
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50 mt-1">
                      <span>{rm.phases?.length || 0} chặng</span>
                      {(() => {
                        const finalP = rm.phases?.[rm.phases.length - 1];
                        return finalP ? (
                          <span>Mục tiêu: <strong className="text-white/80">{finalP.targetWeightKg} kg</strong> ({finalP.targetBodyFatPct}%)</span>
                        ) : null;
                      })()}
                      <span>FFMI: <strong className="text-white/80">{rm.targetFfmi}</strong></span>
                      {rm.phases?.[0]?.startDate && (
                        <span>Khởi động: {rm.phases[0].startDate}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrent && onSwitchCtgRoadmap && (
                      <button
                        type="button"
                        onClick={() => onSwitchCtgRoadmap(rm.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Kích hoạt lộ trình này
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigateTab?.('roadmap')}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-white/80 text-xs font-semibold cursor-pointer"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Profile Details & Settings (Quản Lý Tài Khoản) */}
      <div className="bg-[#070205] rounded-2xl border border-white/10 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Thông Tin Sinh Trắc Học & Mục Tiêu Thể Hình
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Cơ sở để hệ thống CTG tính toán chính xác BMR Katch-McArdle, TDEE và mục tiêu Calo/Macro hàng ngày.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white/80 hover:bg-white/5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-white/60" />
            <span>{editing ? 'Đóng form' : 'Chỉnh sửa'}</span>
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">Giới tính sinh học</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="male">Nam (Mức mỡ lý tưởng 15%)</option>
                  <option value="female">Nữ (Mức mỡ lý tưởng 23%)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">Tuổi hiện tại</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">Chiều cao (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">Mục tiêu hiện tại</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as Goal)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="cut">Giảm mỡ (Cut -15% kcal)</option>
                  <option value="maintain">Duy trì (Maintain TDEE)</option>
                  <option value="bulk">Tăng cơ (Bulk +10% kcal)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">Mức vận động</label>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="sedentary">Ít vận động (x1.2)</option>
                  <option value="light">Vận động nhẹ (x1.375)</option>
                  <option value="moderate">Vận động vừa (x1.55)</option>
                  <option value="active">Vận động nhiều (x1.725)</option>
                  <option value="very_active">Vận động rất nhiều (x1.9)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">Cân nặng mục tiêu (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50">% Mỡ mục tiêu</label>
                <input
                  type="number"
                  step="0.5"
                  value={targetBodyFatPct}
                  onChange={(e) => setTargetBodyFatPct(e.target.value)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu thông tin hồ sơ</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase font-semibold">Giới tính & Tuổi</div>
              <div className="font-bold text-white mt-1">
                {profile.sex === 'male' ? 'Nam' : 'Nữ'} · {profile.age} tuổi
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase font-semibold">Chiều cao</div>
              <div className="font-bold text-white mt-1">{profile.heightCm} cm</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase font-semibold">Mục tiêu thể hình</div>
              <div className="font-bold text-rose-400 mt-1">
                {GOAL_LABEL[profile.goal]}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase font-semibold">Mức vận động</div>
              <div className="font-bold text-white mt-1">
                {ACTIVITY_LABEL[profile.activity]}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase font-semibold">Cân nặng mục tiêu</div>
              <div className="font-bold text-white mt-1">{profile.targetWeightKg} kg</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase font-semibold">Mục tiêu bước / ngày</div>
              <div className="font-bold text-white mt-1">
                {profile.stepGoal.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Scientific Fitness & Nutrition Strategy (CTG Sports Medicine Principles) */}
      <div className="bg-gradient-to-br from-rose-950/20 via-[#070205] to-transparent p-5 rounded-2xl border border-rose-500/20 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-white">
              Chiến Lược Thể Hình &amp; Dinh Dưỡng Khoa Học CTG ({GOAL_LABEL[profile.goal]})
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30">
            Cơ Chế P-Ratio & Insulin
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[#0a0306] border border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
              <Flame className="w-4 h-4" />
              <span>Cơ Chế Năng Lượng & P-Ratio</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              {profile.goal === 'cut'
                ? 'Thâm hụt 15-20% kcal kết hợp lượng protein cao (2.2-2.5g/kg LBM) để bảo toàn tối đa khối nạc và thúc đẩy độ nhạy insulin đạt đỉnh.'
                : profile.goal === 'bulk'
                ? 'Thặng dư nhẹ 10% kcal (khoảng +200-300 kcal/ngày). Tránh bulk bẩn (dirty bulk) vì mỡ tích tụ sẽ làm suy giảm độ nhạy insulin, khiến calo dư biến thành mỡ thay vì cơ.'
                : 'Giữ năng lượng quanh mức TDEE để tái cấu trúc cơ thể (Body Recomposition), vừa tối ưu phục hồi vừa giảm dần % mỡ thừa.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0306] border border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <Dumbbell className="w-4 h-4" />
              <span>Kháng Lực & Mesocycle</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Áp dụng phân chia Upper/Lower 4 buổi hoặc Push/Pull/Legs 5 buổi/tuần. Mỗi hiệp tập cách ngưỡng thất bại 1-3 reps (RIR 1-3) và tăng tải lũy tiến (Progressive Overload) liên tục.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0306] border border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <HeartPulse className="w-4 h-4" />
              <span>Hydration & Giấc Ngủ Sâu</span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Nạp tối thiểu 2.500ml nước mỗi ngày và ngủ đủ 7-8 tiếng để tối ưu hóa nồng độ Testosterone và hormone tăng trưởng GH, bảo vệ hệ thần kinh trung ương và cơ bắp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

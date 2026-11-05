import React, { useState, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Flame,
  Dumbbell,
  Scale,
  Award,
  Zap,
  Info,
} from 'lucide-react';
import { CtgProfile, Goal, Sex } from '../../../types/productivity';
import { ffmi, leanMassKg, fatMassKg, tdee, calorieTarget, macroTargets } from '../../../utils/fitnessMetrics';

interface RoadmapTabProps {
  profile: CtgProfile;
  lang: 'vi' | 'en';
  onUpdateProfile: (patch: Partial<CtgProfile>) => void;
  onNavigateTab?: (tab: 'inbody' | 'training' | 'nutrition' | 'profile') => void;
}

// CTG Standards & Classification criteria from ctg-web / lo-trinh-page.js
const CTG_STANDARDS = {
  nam: {
    targetFfmi: 19,
    idealBodyfatPct: 15,
    highFatPct: 20,
    naturalFfmiLimit: 25,
  },
  nu: {
    targetFfmi: 16,
    idealBodyfatPct: 25,
    highFatPct: 30,
    naturalFfmiLimit: 22,
  },
};

const FFMI_BANDS = {
  nam: [
    { max: 19, label: 'Ít cơ (Cần tăng cơ)', color: '#f59e0b', desc: 'Lượng cơ nạc còn mỏng, cần tập trung kháng lực & tăng protein' },
    { max: 23, label: 'Lý tưởng (Săn chắc)', color: '#10b981', desc: 'Tỷ lệ cơ nạc chuẩn người tập thể hình tự nhiên, hình thể cân đối' },
    { max: 25, label: 'Sát giới hạn tự nhiên', color: '#6366f1', desc: 'Rất cơ bắp, đã đạt đỉnh tiềm năng phát triển tự nhiên' },
    { max: 99, label: 'Vượt ngưỡng tự nhiên', color: '#ec4899', desc: 'Khối cơ cực lớn, thường thấy ở vận động viên chuyên nghiệp' },
  ],
  nu: [
    { max: 16, label: 'Ít cơ (Cần tăng cơ)', color: '#f59e0b', desc: 'Khối lượng cơ mỏng, nên bổ sung kháng lực để săn chắc' },
    { max: 20, label: 'Lý tưởng (Fit & Toned)', color: '#10b981', desc: 'Thân hình thể thao, săn chắc và khỏe khoắn' },
    { max: 22, label: 'Sát giới hạn tự nhiên', color: '#6366f1', desc: 'Rất săn chắc, vận động viên thể hình nữ' },
    { max: 99, label: 'Vượt ngưỡng tự nhiên', color: '#ec4899', desc: 'Khối cơ phi tự nhiên' },
  ],
};

const BODYFAT_BANDS = {
  nam: [
    { max: 10, label: 'Thấp - Khô', tone: 'warning', color: '#f59e0b' },
    { max: 20, label: 'Lý tưởng', tone: 'success', color: '#10b981' },
    { max: 30, label: 'Mỡ cao', tone: 'warning', color: '#f97316' },
    { max: 99, label: 'Béo phì', tone: 'danger', color: '#ef4444' },
  ],
  nu: [
    { max: 18, label: 'Thấp - Khô', tone: 'warning', color: '#f59e0b' },
    { max: 30, label: 'Lý tưởng', tone: 'success', color: '#10b981' },
    { max: 40, label: 'Mỡ cao', tone: 'warning', color: '#f97316' },
    { max: 99, label: 'Béo phì', tone: 'danger', color: '#ef4444' },
  ],
};

export const RoadmapTab: React.FC<RoadmapTabProps> = ({
  profile,
  lang,
  onUpdateProfile,
  onNavigateTab,
}) => {
  // Input form state initialized from profile
  const [sex, setSex] = useState<Sex>(profile.sex || 'male');
  const [heightCm, setHeightCm] = useState(String(profile.heightCm || 172));
  const [weightKg, setWeightKg] = useState(String(profile.targetWeightKg || 68));
  const [bodyfatPct, setBodyfatPct] = useState(String(profile.targetBodyFatPct || 18));
  const [waistCm, setWaistCm] = useState('80');
  const [userGoal, setUserGoal] = useState<'auto' | Goal>('auto');
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const sexKey = sex === 'female' ? 'nu' : 'nam';
  const hNum = Number(heightCm) || 172;
  const wNum = Number(weightKg) || 68;
  const bfNum = Number(bodyfatPct) || 18;
  const waistNum = Number(waistCm) || 0;

  // Analysis result using CTG algorithm
  const analysis = useMemo(() => {
    const std = CTG_STANDARDS[sexKey];
    const hMeter = hNum / 100;
    const lbm = wNum * (1 - bfNum / 100);
    const bfm = wNum * (bfNum / 100);
    const computedFfmi = hMeter > 0 ? lbm / (hMeter * hMeter) : 0;

    // Determine FFMI band
    const ffmiBandItem =
      FFMI_BANDS[sexKey].find((b) => computedFfmi < b.max) || FFMI_BANDS[sexKey][FFMI_BANDS[sexKey].length - 1];

    // Determine Body Fat band
    const bfBandItem =
      BODYFAT_BANDS[sexKey].find((b) => bfNum < b.max) || BODYFAT_BANDS[sexKey][BODYFAT_BANDS[sexKey].length - 1];

    // Waist-to-height ratio
    const whtr = waistNum > 0 && hNum > 0 ? Math.round((waistNum / hNum) * 100) / 100 : 0;

    // Decision Logic
    let recommendedPlan: Goal = 'cut';
    let planLabelVi = 'Cắt mỡ (Cut)';
    let rationaleVi = '';
    let projectedWeightKg = wNum;
    let projectedBodyfatPct = std.idealBodyfatPct;

    if (bfNum > std.highFatPct) {
      recommendedPlan = 'cut';
      planLabelVi = 'Cắt mỡ (Cut)';
      projectedWeightKg = Math.round((lbm / (1 - std.idealBodyfatPct / 100)) * 10) / 10;
      projectedBodyfatPct = std.idealBodyfatPct;
      const weightDiff = Math.abs(Math.round((wNum - projectedWeightKg) * 10) / 10);
      const isUnderFfmi = computedFfmi < std.targetFfmi;

      rationaleVi = `Tỷ lệ mỡ ${bfNum}% đang cao hơn ngưỡng an toàn (${std.highFatPct}%). Ưu tiên hàng đầu là thâm hụt calo để cắt mỡ về khoảng ${std.idealBodyfatPct}% — tương đương giảm ~${weightDiff}kg mỡ để đạt ${projectedWeightKg}kg nếu giữ nguyên khối cơ.${
        isUnderFfmi
          ? ` Sau khi hoàn thành giai đoạn cắt mỡ, bạn nên chuyển sang tăng cơ (lean bulk), vì FFMI hiện tại (${computedFfmi.toFixed(1)}) vẫn còn dưới ngưỡng chuẩn (${std.targetFfmi}).`
          : ' Bạn đã có nền tảng cơ bắp rất tốt, sau khi giảm mỡ sẽ lộ rõ múi bụng và các khối cơ săn chắc.'
      }`;
    } else if (computedFfmi < std.targetFfmi) {
      recommendedPlan = 'bulk';
      planLabelVi = 'Tăng cơ nạc (Lean Bulk)';
      const neededMuscleKg = (std.targetFfmi - computedFfmi) * (hMeter * hMeter);
      const fatGainKg = neededMuscleKg * 0.5; // realistic lean bulk ratio
      projectedWeightKg = Math.round((wNum + neededMuscleKg + fatGainKg) * 10) / 10;
      projectedBodyfatPct = Math.round(((wNum - lbm + fatGainKg) / projectedWeightKg) * 1000) / 10;

      rationaleVi = `Tỷ lệ mỡ (${bfNum}%) của bạn đang ở mức an toàn, nhưng chỉ số cơ nạc FFMI (${computedFfmi.toFixed(1)}) còn dưới chuẩn (${std.targetFfmi}). Bạn nên tập trung tăng thêm ~${neededMuscleKg.toFixed(1)}kg cơ nạc — nạp thặng dư nhẹ 10% calo và tăng cân từ từ lên ~${projectedWeightKg}kg để có vóc dáng dày dặn, săn chắc.`;
    } else {
      recommendedPlan = 'maintain';
      planLabelVi = 'Duy trì / Tái cấu trúc cơ thể (Recomp)';
      projectedWeightKg = wNum;
      projectedBodyfatPct = bfNum;
      rationaleVi = `Tỷ lệ mỡ ${bfNum}% và chỉ số cơ nạc FFMI ${computedFfmi.toFixed(1)} đều đang ở vùng lý tưởng. Chiến lược tốt nhất hiện tại là duy trì calo chuẩn TDEE, tinh chỉnh dần dần để vừa siết nét vừa phát triển sức mạnh bền vững (Body Recomposition).`;
    }

    const effectiveGoal = userGoal === 'auto' ? recommendedPlan : userGoal;
    const estTdee = tdee(profile, wNum);
    const targetKcal = calorieTarget(estTdee, effectiveGoal, 0);
    const macros = macroTargets(targetKcal, wNum, effectiveGoal, { overrides: {}, tdeeOffset: 0 });

    return {
      lbmKg: Math.round(lbm * 10) / 10,
      bfmKg: Math.round(bfm * 10) / 10,
      ffmi: Math.round(computedFfmi * 10) / 10,
      ffmiBand: ffmiBandItem,
      bfBand: bfBandItem,
      whtr,
      recommendedPlan,
      effectiveGoal,
      planLabelVi,
      rationaleVi,
      projectedWeightKg,
      projectedBodyfatPct,
      targetKcal,
      macros,
    };
  }, [sexKey, hNum, wNum, bfNum, waistNum, userGoal, profile]);

  const handleApplyRoadmap = () => {
    onUpdateProfile({
      sex,
      heightCm: hNum,
      targetWeightKg: analysis.projectedWeightKg,
      targetBodyFatPct: analysis.projectedBodyfatPct,
      goal: analysis.effectiveGoal,
    });
    setAppliedBanner(
      `Đã áp dụng lộ trình: Mục tiêu ${analysis.effectiveGoal === 'cut' ? 'Giảm mỡ' : analysis.effectiveGoal === 'bulk' ? 'Tăng cơ' : 'Duy trì'} (${analysis.projectedWeightKg}kg / ${analysis.projectedBodyfatPct}% mỡ). Mục tiêu Calo và Giáo án đã được tự động điều chỉnh!`
    );
    setTimeout(() => setAppliedBanner(null), 6000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* CTG Header Banner */}
      <div className="bg-[#121212] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6025]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                CTG<span className="text-[#ff6025]">.</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#ff6025]/20 text-[#ff6025] border border-[#ff6025]/30">
                AI Fitness Analyzer
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              Định Hướng Mục Tiêu Fitness Cá Nhân Hóa
            </h2>
            <p className="text-xs text-white/60 mt-1 max-w-xl leading-relaxed">
              Dựa trên chiều cao, cân nặng và tỷ lệ mỡ thực tế, hệ thống tính toán chính xác chỉ số cơ nạc FFMI,
              mỡ cơ thể và xây dựng chiến lược tập luyện — dinh dưỡng tối ưu cho thể trạng người Việt.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleApplyRoadmap}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6025] hover:bg-[#ff4400] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-orange-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Áp dụng vào hồ sơ cá nhân</span>
            </button>
          </div>
        </div>
      </div>

      {/* Applied Banner Toast */}
      {appliedBanner && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-200 flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm text-white">Cập nhật lộ trình thành công!</div>
            <div className="mt-0.5 text-emerald-200/90">{appliedBanner}</div>
          </div>
        </div>
      )}

      {/* Main Grid: Input Form on Left, Diagnostic Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 5 Columns */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1c1d21] rounded-2xl border border-white/10 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#ff6025]" />
                Thông Số Đầu Vào
              </h3>
              <span className="text-[10px] text-white/40">Bước 1: Điền số đo</span>
            </div>

            <div className="space-y-3.5">
              {/* Sex selection */}
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50 block mb-1">
                  Giới tính sinh học
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSex('male')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      sex === 'male'
                        ? 'bg-[#ff6025] text-white border-[#ff6025] shadow-xs'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Nam
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('female')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      sex === 'female'
                        ? 'bg-[#ff6025] text-white border-[#ff6025] shadow-xs'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Nữ
                  </button>
                </div>
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-white/50 block">
                    Chiều cao (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-[#ff6025] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-white/50 block">
                    Cân nặng (kg)
                  </label>
                  <input
                    type="number"
                    min="25"
                    max="400"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-[#ff6025] focus:outline-none"
                  />
                </div>
              </div>

              {/* Bodyfat % & Waist */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase text-white/50 block">
                      Bodyfat (%)
                    </label>
                    <span className="text-[9px] text-[#ff6025] font-bold">InBody</span>
                  </div>
                  <input
                    type="number"
                    min="3"
                    max="70"
                    step="0.1"
                    value={bodyfatPct}
                    onChange={(e) => setBodyfatPct(e.target.value)}
                    className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-[#ff6025] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-white/50 block">
                    Vòng eo (cm) <span className="text-white/30 lowercase">(tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="180"
                    step="0.5"
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-[#ff6025] focus:outline-none"
                  />
                </div>
              </div>

              {/* Goal Choice */}
              <div>
                <label className="text-[10px] font-semibold uppercase text-white/50 block mb-1">
                  Mục tiêu mong muốn
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'auto', label: 'Chưa rõ định hướng (Hệ thống tự gợi ý theo AI)', hint: 'Khuyên dùng' },
                    { id: 'cut', label: 'Cắt mỡ (Cut) — Giảm cân & Siết cơ', hint: '-15% kcal' },
                    { id: 'bulk', label: 'Tăng cơ (Lean Bulk) — Tăng khối nạc', hint: '+10% kcal' },
                    { id: 'maintain', label: 'Duy trì & Săn chắc (Recomposition)', hint: 'TDEE chuẩn' },
                  ].map((g) => (
                    <label
                      key={g.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        userGoal === g.id
                          ? 'border-[#ff6025] bg-[#ff6025]/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/8'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="userGoal"
                          value={g.id}
                          checked={userGoal === g.id}
                          onChange={() => setUserGoal(g.id as any)}
                          className="accent-[#ff6025]"
                        />
                        <span className="text-xs font-semibold">{g.label}</span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">{g.hint}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reference Table Accordions / Infocards */}
          <div className="bg-[#1c1d21] rounded-2xl border border-white/10 p-4 shadow-xs space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#ff6025]" />
              Bảng Tham Chiếu Thể Hình Chuẩn ({sex === 'male' ? 'Nam' : 'Nữ'})
            </h4>

            {/* Bodyfat Reference */}
            <div className="p-2.5 rounded-xl bg-[#0e0f11] border border-white/5 text-xs">
              <div className="font-semibold text-white/90 text-[11px] mb-1.5 flex justify-between">
                <span>Ngưỡng Tỷ Lệ Mỡ (Bodyfat %)</span>
                <span className="text-[10px] text-white/40">Khuyến nghị: 10-20%</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                {BODYFAT_BANDS[sexKey].map((b) => (
                  <div key={b.label} className="p-1 rounded-lg bg-white/5">
                    <div className="font-bold" style={{ color: b.color }}>
                      &lt;{b.max}%
                    </div>
                    <div className="text-[9px] text-white/60 truncate">{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* FFMI Reference */}
            <div className="p-2.5 rounded-xl bg-[#0e0f11] border border-white/5 text-xs">
              <div className="font-semibold text-white/90 text-[11px] mb-1.5 flex justify-between">
                <span>Chỉ Số Cơ Nạc FFMI</span>
                <span className="text-[10px] text-white/40">Đỉnh tự nhiên: {CTG_STANDARDS[sexKey].naturalFfmiLimit}</span>
              </div>
              <div className="space-y-1 text-[10px]">
                {FFMI_BANDS[sexKey].map((b) => (
                  <div key={b.label} className="flex items-center justify-between p-1 rounded-lg bg-white/5">
                    <span className="font-semibold" style={{ color: b.color }}>
                      {b.label}
                    </span>
                    <span className="font-mono text-white/70">&lt; {b.max}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Output: 7 Columns */}
        <div className="lg:col-span-7 space-y-4">
          {/* Diagnostic Key Numbers */}
          <div className="bg-[#1c1d21] rounded-2xl border border-white/10 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ff6025]" />
                Kết Quả Chẩn Đoán & Định Lượng Thể Trạng
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6025]/20 text-[#ff6025] font-bold">
                CTG Verified
              </span>
            </div>

            {/* 3 Large Stat Boxes */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="p-3.5 rounded-xl bg-[#0e0f11] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase text-white/40">Khối Nạc (LBM)</span>
                <div className="mt-1">
                  <span className="font-display text-xl sm:text-2xl font-extrabold text-white">
                    {analysis.lbmKg}
                  </span>
                  <span className="text-[11px] text-white/50 ml-1">kg</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold mt-1">Cơ bắp & xương</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e0f11] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase text-white/40">Chỉ Số FFMI</span>
                <div className="mt-1">
                  <span className="font-display text-xl sm:text-2xl font-extrabold text-white">
                    {analysis.ffmi}
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold mt-1 truncate"
                  style={{ color: analysis.ffmiBand.color }}
                >
                  {analysis.ffmiBand.label.split(' ')[0]}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e0f11] border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase text-white/40">Tỷ Lệ Mỡ (BF)</span>
                <div className="mt-1">
                  <span className="font-display text-xl sm:text-2xl font-extrabold text-white">
                    {bfNum}%
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold mt-1"
                  style={{ color: analysis.bfBand.color }}
                >
                  {analysis.bfBand.label}
                </span>
              </div>
            </div>

            {/* Extra Row: Fat Mass & Waist ratio */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="text-white/60 text-[11px]">Tổng lượng mỡ (BFM):</span>
                <span className="font-mono font-bold text-orange-400">{analysis.bfmKg} kg</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="text-white/60 text-[11px]">Tỷ lệ Eo/Chiều cao:</span>
                <span className="font-mono font-bold text-white">
                  {analysis.whtr > 0 ? (
                    <span className={analysis.whtr > 0.5 ? 'text-rose-400' : 'text-emerald-400'}>
                      {analysis.whtr} ({analysis.whtr > 0.5 ? 'Mỡ bụng cao' : 'Chuẩn khỏe'})
                    </span>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Strategic Roadmap Recommendation Box */}
          <div className="bg-[#1c1d21] rounded-2xl border border-white/10 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#ff6025]" />
                <h3 className="text-sm font-bold text-white">
                  Định Hướng Chiến Lược: {analysis.planLabelVi}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#ff6025] text-white">
                Khuyến Nghị AI
              </span>
            </div>

            {/* Scientific Rationale text */}
            <p className="text-xs text-white/80 leading-relaxed bg-[#0e0f11] p-3.5 rounded-xl border border-white/5">
              {analysis.rationaleVi}
            </p>

            {/* Target Projections */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] uppercase font-semibold text-white/40">Cân nặng mục tiêu</div>
                <div className="text-base font-extrabold text-[#ff6025] font-mono mt-0.5">
                  {analysis.projectedWeightKg} kg
                </div>
                <div className="text-[10px] text-white/40">
                  {analysis.projectedWeightKg !== wNum
                    ? `${analysis.projectedWeightKg > wNum ? '+' : ''}${(analysis.projectedWeightKg - wNum).toFixed(1)} kg`
                    : 'Duy trì mốc'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] uppercase font-semibold text-white/40">% Mỡ đích đến</div>
                <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                  {analysis.projectedBodyfatPct}%
                </div>
                <div className="text-[10px] text-white/40">Ngưỡng chuẩn CTG</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-semibold text-white/40">Mục tiêu Calo/ngày</div>
                <div className="text-base font-extrabold text-indigo-400 font-mono mt-0.5">
                  {analysis.targetKcal} kcal
                </div>
                <div className="text-[10px] text-white/40">Theo TDEE hiện tại</div>
              </div>
            </div>

            {/* Recommended Macro Splits */}
            <div className="p-3.5 rounded-xl bg-[#0e0f11] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white/70 text-[11px]">Đa lượng Macro đề xuất mỗi ngày:</span>
                <span className="text-[10px] text-white/40">Ăn món Việt chuẩn dinh dưỡng</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[9px] uppercase font-bold text-rose-400 block">Đạm (Protein)</span>
                  <span className="text-sm font-bold text-white font-mono">{analysis.macros.protein}g</span>
                  <span className="text-[9px] text-white/40 block">~{(analysis.macros.protein / wNum).toFixed(1)}g/kg</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[9px] uppercase font-bold text-amber-400 block">Tinh Bột (Carbs)</span>
                  <span className="text-sm font-bold text-white font-mono">{analysis.macros.carbs}g</span>
                  <span className="text-[9px] text-white/40 block">Cơm, yến mạch, bún</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block">Chất Béo (Fat)</span>
                  <span className="text-sm font-bold text-white font-mono">{analysis.macros.fat}g</span>
                  <span className="text-[9px] text-white/40 block">25% tổng Calo</span>
                </div>
              </div>
            </div>

            {/* Apply & Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleApplyRoadmap}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#ff6025] hover:bg-[#ff4400] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Áp Dụng Lộ Trình Này Vào Hệ Thống</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

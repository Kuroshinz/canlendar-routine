import React, { useMemo, useState } from 'react';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Activity,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Ruler,
  Info,
} from 'lucide-react';
import { BodyPoint, CtgProfile, GOAL_LABEL } from '../../../types/productivity';
import {
  bmi,
  bmiLabel,
  bmr,
  deltaSummary,
  etaWeeks,
  fatMassKg,
  ffmi,
  ffmiCategory,
  fmt1,
  fmtSigned,
  leanMassKg,
  sortPoints,
  tdee,
  withUnit,
} from '../../../utils/fitnessMetrics';
import { ChartSeries, MultiSeriesLineChart } from '../../charts/SimpleCharts';

interface InBodyTabProps {
  points: BodyPoint[];
  profile: CtgProfile;
  lang: 'vi' | 'en';
  onAddPoint: (point: Omit<BodyPoint, 'id' | 'createdAt'>) => void;
  onDeletePoint: (id: string) => void;
}

export const InBodyTab: React.FC<InBodyTabProps> = ({
  points,
  profile,
  lang,
  onAddPoint,
  onDeletePoint,
}) => {
  const sorted = useMemo(() => sortPoints(points), [points]);
  const first = useMemo(() => (sorted.length > 0 ? sorted[0] : null), [sorted]);
  const latest = useMemo(() => (sorted.length > 0 ? sorted[sorted.length - 1] : null), [sorted]);

  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const filteredPoints = useMemo(() => {
    if (range === 'all' || sorted.length === 0) return sorted;
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
    const subset = sorted.filter((p) => p.date >= cutoff);
    return subset.length >= 2 ? subset : sorted;
  }, [sorted, range]);

  const chartSeries: ChartSeries[] = useMemo(() => {
    return [
      {
        key: 'weight',
        label: 'Cân nặng',
        color: '#ff6025',
        unit: 'kg',
        values: filteredPoints.map((p) => ({ x: p.date.slice(5), y: p.weightKg })),
      },
      {
        key: 'bodyFat',
        label: '% Mỡ',
        color: '#2f86e8',
        unit: '%',
        values: filteredPoints.map((p) => ({ x: p.date.slice(5), y: p.bodyFatPct })),
      },
    ];
  }, [filteredPoints]);

  const currentWeight = latest ? latest.weightKg : profile.targetWeightKg;
  const currentBf = latest ? latest.bodyFatPct : profile.targetBodyFatPct;
  const userBmi = bmi(currentWeight, profile.heightCm);
  const userFfmi = ffmi(currentWeight, currentBf, profile.heightCm);
  const userLeanKg = leanMassKg(currentWeight, currentBf);
  const userFatKg = fatMassKg(currentWeight, currentBf);
  const userBmr = bmr(profile, currentWeight);
  const userTdee = tdee(profile, currentWeight);

  const delta = useMemo(() => deltaSummary(points, profile.heightCm), [points, profile.heightCm]);
  const eta = useMemo(() => {
    if (!delta || !latest) return null;
    return etaWeeks(latest.weightKg, profile.targetWeightKg, delta.weightRate);
  }, [delta, latest, profile.targetWeightKg]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState('68');
  const [bodyFatPct, setBodyFatPct] = useState('17');
  const [waistCm, setWaistCm] = useState('83');
  const [chestCm, setChestCm] = useState('99');
  const [armCm, setArmCm] = useState('34');
  const [thighCm, setThighCm] = useState('56');
  const [note, setNote] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg || !bodyFatPct) return;
    onAddPoint({
      date,
      weightKg: Number(weightKg),
      bodyFatPct: Number(bodyFatPct),
      waistCm: waistCm ? Number(waistCm) : undefined,
      chestCm: chestCm ? Number(chestCm) : undefined,
      armCm: armCm ? Number(armCm) : undefined,
      thighCm: thighCm ? Number(thighCm) : undefined,
      note: note.trim() || undefined,
    });
    setShowForm(false);
    setNote('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Target */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent dark:from-orange-950/30 dark:via-amber-950/20 rounded-2xl border border-orange-200 dark:border-orange-900/50 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white">
              {GOAL_LABEL[profile.goal]}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Sở hữu: <span className="font-semibold text-gray-700 dark:text-gray-200">{profile.name}</span>
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Phân Tích Thành Phần Cơ Thể (InBody)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Mục tiêu: {profile.targetWeightKg} kg · {profile.targetBodyFatPct}% mỡ · Chiều cao {profile.heightCm} cm
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ghi nhận InBody mới</span>
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Thêm số đo InBody & Thước dây
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              Hủy
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Ngày</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Cân nặng (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">% Mỡ (Fat %)</label>
              <input
                type="number"
                step="0.1"
                required
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Vòng eo (cm)</label>
              <input
                type="number"
                step="0.5"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Vòng ngực (cm)</label>
              <input
                type="number"
                step="0.5"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Bắp tay (cm)</label>
              <input
                type="number"
                step="0.5"
                value={armCm}
                onChange={(e) => setArmCm(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Vòng đùi (cm)</label>
              <input
                type="number"
                step="0.5"
                value={thighCm}
                onChange={(e) => setThighCm(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ghi chú (ví dụ: Đo sáng sớm chưa ăn uống...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              Lưu đo lường
            </button>
          </div>
        </form>
      )}

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Cân nặng hiện tại</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {fmt1(currentWeight)} <span className="text-xs font-normal text-gray-400">kg</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Mục tiêu: {profile.targetWeightKg} kg
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">% Mỡ cơ thể</div>
          <div className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
            {fmt1(currentBf)} <span className="text-xs font-normal text-gray-400">%</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Mục tiêu: {profile.targetBodyFatPct}%
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Khối cơ nạc (LBM)</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {fmt1(userLeanKg)} <span className="text-xs font-normal text-gray-400">kg</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Khối mỡ: {fmt1(userFatKg)} kg
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Chỉ số FFMI</div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {fmt1(userFfmi)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {userFfmi >= 20 ? 'Cơ bắp phát triển' : 'Tiềm năng tăng cơ'}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Chỉ số BMI</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {fmt1(userBmi)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {bmiLabel(userBmi)}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">BMR / TDEE</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {userTdee} <span className="text-xs font-normal text-gray-400">kcal</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            BMR nền: {userBmr} kcal
          </div>
        </div>
      </div>

      {/* Interactive InBody Trend Chart (Weight & Body Fat Dual-Series) */}
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-500" />
              Biểu Đồ Xu Hướng Thành Phần Cơ Thể (InBody Dual-Series)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Chạm hoặc click vào các mốc trên biểu đồ để xem chi tiết cân nặng và tỷ lệ mỡ
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl self-start sm:self-auto">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  range === r
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {r === '7d' ? '7 Ngày' : r === '30d' ? '30 Ngày' : r === '90d' ? '90 Ngày' : 'Tất Cả'}
              </button>
            ))}
          </div>
        </div>

        <MultiSeriesLineChart
          series={chartSeries}
          height={180}
          emptyLabel="Chưa có đủ dữ liệu InBody để vẽ biểu đồ."
        />
      </div>

      {/* FFMI Athletic Evaluation Card */}
      {(() => {
        const ffmiEval = ffmiCategory(userFfmi, profile.sex);
        return (
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent dark:from-indigo-950/20 dark:via-purple-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  Đánh Giá Chỉ Số Cơ Nạc FFMI: <span className={ffmiEval.tone}>{ffmiEval.label}</span>
                </h4>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                FFMI {fmt1(userFfmi)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
              {ffmiEval.desc}
            </p>
          </div>
        );
      })()}

      {/* Delta Rate & Tape Measurements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Rate Card */}
        <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Tốc Độ Thay Đổi & Tiến Trình
            </h3>
            {delta && (
              <span className="text-[10px] text-gray-400 font-mono">
                {delta.weeks} tuần theo dõi
              </span>
            )}
          </div>

          {delta ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Tốc độ cân nặng</div>
                <div className={`text-base font-bold mt-1 ${delta.weightRate <= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {fmtSigned(delta.weightRate)} kg/tuần
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Tổng: {fmtSigned(delta.weightKg)} kg
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Tốc độ mỡ</div>
                <div className="text-base font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {fmtSigned(delta.fatRate)} kg/tuần
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  % mỡ: {fmtSigned(delta.bodyFatPct)}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Dự kiến đạt mục tiêu</div>
                <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {eta !== null ? `~${eta} tuần` : 'Đang đi đúng hướng'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Khối nạc: {fmtSigned(delta.leanRate)} kg/tuần
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4 text-center">
              Cần ít nhất 2 mốc đo InBody để tính toán tốc độ thay đổi.
            </p>
          )}
        </div>

        {/* Tape Measurements Card */}
        <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-blue-500" />
              Số Đo Thước Dây & Độ Thay Đổi
            </h3>
            {latest && (
              <span className="text-[10px] text-gray-400 font-mono">
                {latest.date}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Vòng eo', val: latest?.waistCm, init: first?.waistCm, unit: 'cm', color: 'text-rose-600' },
              { label: 'Vòng ngực', val: latest?.chestCm, init: first?.chestCm, unit: 'cm', color: 'text-blue-600' },
              { label: 'Bắp tay', val: latest?.armCm, init: first?.armCm, unit: 'cm', color: 'text-amber-600' },
              { label: 'Vòng đùi', val: latest?.thighCm, init: first?.thighCm, unit: 'cm', color: 'text-emerald-600' },
            ].map((t) => {
              const diff = t.val !== undefined && t.init !== undefined ? Math.round((t.val - t.init) * 10) / 10 : null;
              return (
                <div key={t.label} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center border border-gray-100 dark:border-gray-800">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">{t.label}</div>
                  <div className={`text-base font-bold mt-1 ${t.color}`}>
                    {t.val ? `${t.val} ${t.unit}` : '—'}
                  </div>
                  {diff !== null && Math.abs(diff) >= 0.1 ? (
                    <div className={`text-[10px] font-semibold mt-0.5 ${diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {diff > 0 ? `+${diff}` : diff} {t.unit}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 mt-0.5">Ban đầu: {t.init ?? '—'}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Measurement History Table */}
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4">
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-500" />
          Lịch Sử Đo InBody ({points.length} lần đo)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
            <thead className="text-[10px] uppercase font-semibold bg-gray-50 dark:bg-gray-800/50 text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-2.5 px-3">Ngày</th>
                <th className="py-2.5 px-3">Cân nặng</th>
                <th className="py-2.5 px-3">% Mỡ</th>
                <th className="py-2.5 px-3">Khối nạc</th>
                <th className="py-2.5 px-3">FFMI</th>
                <th className="py-2.5 px-3">Thước dây (Eo / Ngực / Tay / Đùi)</th>
                <th className="py-2.5 px-3">Ghi chú</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...sorted].reverse().map((p) => {
                const lean = leanMassKg(p.weightKg, p.bodyFatPct);
                const userFf = ffmi(p.weightKg, p.bodyFatPct, profile.heightCm);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="py-2 px-3 font-semibold text-gray-900 dark:text-gray-100 font-mono">
                      {p.date}
                    </td>
                    <td className="py-2 px-3 font-bold text-gray-800 dark:text-gray-200">
                      {fmt1(p.weightKg)} kg
                    </td>
                    <td className="py-2 px-3 text-orange-600 dark:text-orange-400 font-semibold">
                      {fmt1(p.bodyFatPct)}%
                    </td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400">
                      {fmt1(lean)} kg
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {fmt1(userFf)}
                    </td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">
                      {p.waistCm || '—'} / {p.chestCm || '—'} / {p.armCm || '—'} / {p.thighCm || '—'} cm
                    </td>
                    <td className="py-2 px-3 text-gray-400 italic truncate max-w-xs">
                      {p.note || '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onDeletePoint(p.id)}
                        className="p-1 rounded-lg text-gray-300 hover:text-rose-500 cursor-pointer"
                        title="Xóa mốc đo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


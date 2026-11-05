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
  Edit2,
  Check,
  X,
  Camera,
  Image as ImageIcon,
  Eye,
  ArrowRight,
  Upload,
  Maximize2,
  Columns,
  Layers,
} from 'lucide-react';
import { BodyCheckPhoto, BodyPoint, CtgProfile, GOAL_LABEL, PhotoPose } from '../../../types/productivity';
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
  bodyPhotos?: BodyCheckPhoto[];
  lang: 'vi' | 'en';
  onAddPoint: (point: Omit<BodyPoint, 'id' | 'createdAt'>) => void;
  onUpdatePoint?: (id: string, patch: Partial<BodyPoint>) => void;
  onDeletePoint: (id: string) => void;
  onAddBodyPhoto?: (photo: Omit<BodyCheckPhoto, 'id' | 'createdAt'>) => BodyCheckPhoto;
  onDeleteBodyPhoto?: (id: string) => void;
}

const POSE_LABELS: Record<PhotoPose, { label: string; badgeClass: string }> = {
  front: { label: 'Mặt trước', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  side: { label: 'Góc nghiêng', badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  back: { label: 'Sau lưng', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  other: { label: 'Toàn thân / Khác', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
};

/**
 * Nén ảnh phía client bằng HTML Canvas trước khi lưu vào localStorage.
 * Giữ chất lượng cao (~1024px max dimension, quality 0.82) với dung lượng chỉ ~60-120KB.
 */
const compressImageFile = (file: File, maxDim = 1024, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể giải mã file ảnh'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const InBodyTab: React.FC<InBodyTabProps> = ({
  points,
  profile,
  bodyPhotos = [],
  lang,
  onAddPoint,
  onUpdatePoint,
  onDeletePoint,
  onAddBodyPhoto,
  onDeleteBodyPhoto,
}) => {
  const sorted = useMemo(() => sortPoints(points), [points]);
  const first = useMemo(() => (sorted.length > 0 ? sorted[0] : null), [sorted]);
  const latest = useMemo(() => (sorted.length > 0 ? sorted[sorted.length - 1] : null), [sorted]);

  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [editingPoint, setEditingPoint] = useState<BodyPoint | null>(null);

  // Body Check Photo states
  const [photoPoseFilter, setPhotoPoseFilter] = useState<'all' | PhotoPose>('all');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPose, setPhotoPose] = useState<PhotoPose>('front');
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photoWeight, setPhotoWeight] = useState<string>(latest ? String(latest.weightKg) : '68');
  const [photoBf, setPhotoBf] = useState<string>(latest ? String(latest.bodyFatPct) : '17');
  const [photoNote, setPhotoNote] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Lightbox & Compare states
  const [lightboxPhoto, setLightboxPhoto] = useState<BodyCheckPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [beforePhotoId, setBeforePhotoId] = useState<string | null>(null);
  const [afterPhotoId, setAfterPhotoId] = useState<string | null>(null);

  const sortedPhotos = useMemo(() => {
    return [...bodyPhotos].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  }, [bodyPhotos]);

  const filteredPhotos = useMemo(() => {
    if (photoPoseFilter === 'all') return sortedPhotos;
    return sortedPhotos.filter((p) => p.pose === photoPoseFilter);
  }, [sortedPhotos, photoPoseFilter]);

  const beforePhoto = useMemo(() => {
    if (beforePhotoId) return sortedPhotos.find((p) => p.id === beforePhotoId) || null;
    return sortedPhotos.length > 0 ? sortedPhotos[0] : null;
  }, [sortedPhotos, beforePhotoId]);

  const afterPhoto = useMemo(() => {
    if (afterPhotoId) return sortedPhotos.find((p) => p.id === afterPhotoId) || null;
    return sortedPhotos.length > 1 ? sortedPhotos[sortedPhotos.length - 1] : null;
  }, [sortedPhotos, afterPhotoId]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }
    setPhotoError(null);
    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file);
      setPhotoPreview(compressed);
    } catch (err: any) {
      setPhotoError(err.message || 'Không thể xử lý hình ảnh');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      setPhotoError('Vui lòng chọn một tấm ảnh để tải lên');
      return;
    }
    onAddBodyPhoto?.({
      date: photoDate,
      photoUrl: photoPreview,
      pose: photoPose,
      weightKg: photoWeight ? Number(photoWeight) : undefined,
      bodyFatPct: photoBf ? Number(photoBf) : undefined,
      note: photoNote.trim() || undefined,
    });
    setShowPhotoModal(false);
    setPhotoPreview(null);
    setPhotoNote('');
    setPhotoError(null);
  };

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

      {/* 4. Body Check Photos & Visual Progress */}
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#ff6025]" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Hình Ảnh Check Body &amp; Tiến Trình Thực Tế
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff6025]/15 text-[#ff6025] border border-[#ff6025]/25">
                {bodyPhotos.length} ảnh
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hình ảnh trực quan không bao giờ nói dối: theo dõi cơ bắp, độ nét múi bụng và tỉ lệ cơ thể thực tế
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {bodyPhotos.length >= 2 && (
              <button
                type="button"
                onClick={() => setCompareMode((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  compareMode
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{compareMode ? 'Đóng so sánh' : 'So sánh Trước / Sau'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (latest) {
                  setPhotoWeight(String(latest.weightKg));
                  setPhotoBf(String(latest.bodyFatPct));
                }
                setShowPhotoModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff6025] hover:bg-[#e0531e] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm ảnh mới</span>
            </button>
          </div>
        </div>

        {/* Before & After Interactive Comparison View */}
        {compareMode && beforePhoto && afterPhoto && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/20 via-[#121212]/50 to-orange-950/20 border border-indigo-500/30 dark:border-indigo-500/20 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Đối Chiếu Tiến Trình Trực Quan (Before &amp; After)
                </span>
              </div>

              {/* Quick diff badges */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                {(() => {
                  const daysBetween = Math.round(
                    Math.abs(new Date(afterPhoto.date).getTime() - new Date(beforePhoto.date).getTime()) / 86400000
                  );
                  const wDiff =
                    afterPhoto.weightKg !== undefined && beforePhoto.weightKg !== undefined
                      ? Math.round((afterPhoto.weightKg - beforePhoto.weightKg) * 10) / 10
                      : null;
                  const bfDiff =
                    afterPhoto.bodyFatPct !== undefined && beforePhoto.bodyFatPct !== undefined
                      ? Math.round((afterPhoto.bodyFatPct - beforePhoto.bodyFatPct) * 10) / 10
                      : null;

                  return (
                    <>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] font-mono">
                        {daysBetween} ngày cách biệt
                      </span>
                      {wDiff !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                            wDiff <= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                          }`}
                        >
                          Cân nặng: {wDiff > 0 ? `+${wDiff}` : wDiff} kg
                        </span>
                      )}
                      {bfDiff !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                            bfDiff <= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          % Mỡ: {bfDiff > 0 ? `+${bfDiff}` : bfDiff}%
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Side-by-Side Dual Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Column */}
              <div className="bg-black/40 rounded-xl p-3 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                    Mốc Trước (Before)
                  </span>
                  <select
                    value={beforePhoto.id}
                    onChange={(e) => setBeforePhotoId(e.target.value)}
                    className="text-[11px] bg-white/10 text-white px-2 py-1 rounded-lg border border-white/20 focus:outline-none"
                  >
                    {sortedPhotos.map((p) => (
                      <option key={`bf-${p.id}`} value={p.id} className="bg-gray-900 text-white">
                        {p.date} · {POSE_LABELS[p.pose].label} {p.weightKg ? `(${p.weightKg}kg)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  onClick={() => setLightboxPhoto(beforePhoto)}
                  className="aspect-[3/4] rounded-lg overflow-hidden relative cursor-pointer group bg-black/60"
                >
                  <img
                    src={beforePhoto.photoUrl}
                    alt="Before Check Body"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                    <div className="flex items-center justify-between text-white text-xs">
                      <span className="font-mono font-bold">{beforePhoto.date}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${POSE_LABELS[beforePhoto.pose].badgeClass}`}>
                        {POSE_LABELS[beforePhoto.pose].label}
                      </span>
                    </div>
                    {(beforePhoto.weightKg || beforePhoto.bodyFatPct) && (
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80">
                        {beforePhoto.weightKg && <span>{beforePhoto.weightKg} kg</span>}
                        {beforePhoto.bodyFatPct && <span>· {beforePhoto.bodyFatPct}% mỡ</span>}
                      </div>
                    )}
                    {beforePhoto.note && (
                      <p className="text-[10px] text-white/60 italic truncate mt-0.5">{beforePhoto.note}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* After Column */}
              <div className="bg-black/40 rounded-xl p-3 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#ff6025] text-white">
                    Mốc Sau (After)
                  </span>
                  <select
                    value={afterPhoto.id}
                    onChange={(e) => setAfterPhotoId(e.target.value)}
                    className="text-[11px] bg-white/10 text-white px-2 py-1 rounded-lg border border-white/20 focus:outline-none"
                  >
                    {sortedPhotos.map((p) => (
                      <option key={`af-${p.id}`} value={p.id} className="bg-gray-900 text-white">
                        {p.date} · {POSE_LABELS[p.pose].label} {p.weightKg ? `(${p.weightKg}kg)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  onClick={() => setLightboxPhoto(afterPhoto)}
                  className="aspect-[3/4] rounded-lg overflow-hidden relative cursor-pointer group bg-black/60"
                >
                  <img
                    src={afterPhoto.photoUrl}
                    alt="After Check Body"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                    <div className="flex items-center justify-between text-white text-xs">
                      <span className="font-mono font-bold">{afterPhoto.date}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${POSE_LABELS[afterPhoto.pose].badgeClass}`}>
                        {POSE_LABELS[afterPhoto.pose].label}
                      </span>
                    </div>
                    {(afterPhoto.weightKg || afterPhoto.bodyFatPct) && (
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80">
                        {afterPhoto.weightKg && <span>{afterPhoto.weightKg} kg</span>}
                        {afterPhoto.bodyFatPct && <span>· {afterPhoto.bodyFatPct}% mỡ</span>}
                      </div>
                    )}
                    {afterPhoto.note && (
                      <p className="text-[10px] text-white/60 italic truncate mt-0.5">{afterPhoto.note}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter bar by Pose */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['all', 'front', 'side', 'back', 'other'] as const).map((poseKey) => {
            const count =
              poseKey === 'all'
                ? sortedPhotos.length
                : sortedPhotos.filter((p) => p.pose === poseKey).length;
            const label = poseKey === 'all' ? 'Tất cả' : POSE_LABELS[poseKey].label;
            const active = photoPoseFilter === poseKey;

            return (
              <button
                key={poseKey}
                type="button"
                onClick={() => setPhotoPoseFilter(poseKey)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#ff6025] text-white font-bold shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gallery Grid or Empty State */}
        {filteredPhotos.length === 0 ? (
          <div className="py-10 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-950/30 flex items-center justify-center text-[#ff6025]">
              <Camera className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {sortedPhotos.length === 0
                  ? 'Chưa có ảnh check body nào'
                  : 'Không có ảnh trong góc chụp này'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Số đo trên bàn cân chỉ phản ánh 50% câu chuyện. Chụp ảnh check body định kỳ (1-2 tuần/lần)
                giúp bạn thấy rõ múi bụng, vai, ngực và độ săn chắc được cải thiện qua từng tuần!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#ff6025] hover:bg-[#e0531e] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              Tải lên ảnh đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredPhotos.map((photo) => {
              const poseMeta = POSE_LABELS[photo.pose];
              return (
                <div
                  key={photo.id}
                  className="group rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#121418] flex flex-col shadow-xs hover:shadow-md transition-shadow relative"
                >
                  {/* Photo with Overlay */}
                  <div
                    onClick={() => setLightboxPhoto(photo)}
                    className="aspect-[3/4] w-full overflow-hidden relative cursor-pointer bg-black/40"
                  >
                    <img
                      src={photo.photoUrl}
                      alt={`Check body ${photo.date}`}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Floating Pose Badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-md border ${poseMeta.badgeClass}`}>
                        {poseMeta.label}
                      </span>
                    </div>

                    {/* Zoom Icon Hint */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white p-1 rounded-lg backdrop-blur-xs">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>

                    {/* Bottom Gradient with Date & Metric */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 flex flex-col justify-end">
                      <div className="flex items-center justify-between text-white text-xs">
                        <span className="font-mono font-bold text-[11px]">{photo.date}</span>
                        {photo.weightKg && (
                          <span className="text-[11px] font-bold text-emerald-400">
                            {photo.weightKg} kg
                          </span>
                        )}
                      </div>
                      {photo.bodyFatPct && (
                        <div className="text-[10px] text-orange-300 font-mono mt-0.5">
                          {photo.bodyFatPct}% mỡ
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note & Action buttons */}
                  <div className="p-2.5 flex flex-col justify-between flex-1 space-y-2">
                    {photo.note ? (
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {photo.note}
                      </p>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">Không có ghi chú</span>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/80 gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBeforePhotoId(photo.id);
                            setCompareMode(true);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                            beforePhotoId === photo.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
                          }`}
                          title="Đặt làm mốc Trước để so sánh"
                        >
                          Trước
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAfterPhotoId(photo.id);
                            setCompareMode(true);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                            afterPhotoId === photo.id
                              ? 'bg-[#ff6025] text-white'
                              : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
                          }`}
                          title="Đặt làm mốc Sau để so sánh"
                        >
                          Sau
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa ảnh chụp ngày ${photo.date}?`)) {
                            onDeleteBodyPhoto?.(photo.id);
                          }
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                        title="Xóa ảnh này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingPoint(p)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors"
                          title="Chỉnh sửa số đo này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePoint(p.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                          title="Xóa mốc đo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1e24] rounded-3xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-[#ff6025]">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Tải Lên Ảnh Check Body
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Nén tự động tối ưu lưu trữ offline, an toàn và bảo mật trên thiết bị
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPhotoModal(false);
                  setPhotoPreview(null);
                  setPhotoError(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-4">
              {photoError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}

              {/* Photo Upload / Preview Zone */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                  Hình ảnh thể hình
                </label>
                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-black/40 aspect-[4/3] flex items-center justify-center">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-xs cursor-pointer border border-white/20 transition-colors">
                        Đổi ảnh khác
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#ff6025] dark:hover:border-[#ff6025] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800/40">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#ff6025] flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Chọn file ảnh từ thiết bị
                      </span>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Hỗ trợ JPG, PNG, WEBP. Tự động nén chất lượng cao.
                      </p>
                    </div>
                    {isCompressing && (
                      <span className="text-xs text-[#ff6025] font-semibold animate-pulse">
                        Đang tối ưu &amp; nén ảnh...
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Pose Selection */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                  Góc chụp (Pose)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['front', 'side', 'back', 'other'] as const).map((p) => {
                    const active = photoPose === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPhotoPose(p)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          active
                            ? 'bg-[#ff6025] text-white border-[#ff6025] shadow-xs'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {POSE_LABELS[p].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Metrics (Prefilled from InBody) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                    Ngày chụp
                  </label>
                  <input
                    type="date"
                    required
                    value={photoDate}
                    onChange={(e) => setPhotoDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                    Cân nặng (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="VD: 68.5"
                    value={photoWeight}
                    onChange={(e) => setPhotoWeight(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                    % Mỡ cơ thể
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="VD: 16.5"
                    value={photoBf}
                    onChange={(e) => setPhotoBf(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
              </div>

              {/* Note / Caption */}
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1">
                  Cảm nhận &amp; Ghi chú buổi check body
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Buổi sáng lúc bụng rỗng, cơ bụng và ngực trên bắt đầu rõ..."
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPhotoModal(false);
                    setPhotoPreview(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!photoPreview || isCompressing}
                  className="px-5 py-2 rounded-xl bg-[#ff6025] hover:bg-[#e0531e] disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Lưu Ảnh Vào Tiến Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full max-h-[95vh] flex flex-col bg-[#121418] rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-white">
                  {lightboxPhoto.date}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${POSE_LABELS[lightboxPhoto.pose].badgeClass}`}>
                  {POSE_LABELS[lightboxPhoto.pose].label}
                </span>
                {lightboxPhoto.weightKg && (
                  <span className="text-xs text-emerald-400 font-bold font-mono">
                    {lightboxPhoto.weightKg} kg
                  </span>
                )}
                {lightboxPhoto.bodyFatPct && (
                  <span className="text-xs text-orange-400 font-bold font-mono">
                    {lightboxPhoto.bodyFatPct}% mỡ
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Xóa ảnh check body ngày ${lightboxPhoto.date}?`)) {
                      onDeleteBodyPhoto?.(lightboxPhoto.id);
                      setLightboxPhoto(null);
                    }
                  }}
                  className="p-2 rounded-xl text-white/50 hover:text-rose-400 hover:bg-white/5 cursor-pointer transition-colors"
                  title="Xóa ảnh này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo View */}
            <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-black/50">
              <img
                src={lightboxPhoto.photoUrl}
                alt="Full Body Check"
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Note & Bottom Bar */}
            {lightboxPhoto.note && (
              <div className="px-5 py-3 bg-black/60 border-t border-white/10 text-xs text-white/80">
                <span className="text-white/40 mr-1.5 font-semibold">Ghi chú:</span>
                {lightboxPhoto.note}
              </div>
            )}
          </div>
        </div>
      )}
      {editingPoint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-500" />
                Chỉnh Sửa Mốc Đo InBody ({editingPoint.date})
              </h3>
              <button
                type="button"
                onClick={() => setEditingPoint(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingPoint) return;
                onUpdatePoint?.(editingPoint.id, {
                  date: editingPoint.date,
                  weightKg: Number(editingPoint.weightKg),
                  bodyFatPct: Number(editingPoint.bodyFatPct),
                  waistCm: editingPoint.waistCm ? Number(editingPoint.waistCm) : undefined,
                  chestCm: editingPoint.chestCm ? Number(editingPoint.chestCm) : undefined,
                  armCm: editingPoint.armCm ? Number(editingPoint.armCm) : undefined,
                  thighCm: editingPoint.thighCm ? Number(editingPoint.thighCm) : undefined,
                  note: editingPoint.note?.trim() || undefined,
                });
                setEditingPoint(null);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Ngày đo</label>
                  <input
                    type="date"
                    value={editingPoint.date}
                    onChange={(e) => setEditingPoint({ ...editingPoint, date: e.target.value })}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Cân nặng (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPoint.weightKg}
                    onChange={(e) =>
                      setEditingPoint({ ...editingPoint, weightKg: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">% Mỡ cơ thể</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingPoint.bodyFatPct}
                    onChange={(e) =>
                      setEditingPoint({ ...editingPoint, bodyFatPct: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Vòng eo (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPoint.waistCm || ''}
                    onChange={(e) =>
                      setEditingPoint({ ...editingPoint, waistCm: Number(e.target.value) || undefined })
                    }
                    placeholder="Tùy chọn"
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Vòng ngực (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPoint.chestCm || ''}
                    onChange={(e) =>
                      setEditingPoint({ ...editingPoint, chestCm: Number(e.target.value) || undefined })
                    }
                    placeholder="Tùy chọn"
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Bắp tay (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingPoint.armCm || ''}
                    onChange={(e) =>
                      setEditingPoint({ ...editingPoint, armCm: Number(e.target.value) || undefined })
                    }
                    placeholder="Tùy chọn"
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Ghi chú</label>
                  <input
                    type="text"
                    value={editingPoint.note || ''}
                    onChange={(e) => setEditingPoint({ ...editingPoint, note: e.target.value })}
                    placeholder="Ghi chú buổi đo InBody..."
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingPoint(null)}
                  className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


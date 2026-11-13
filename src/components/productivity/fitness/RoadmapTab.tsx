import React, { useState, useMemo, useEffect } from 'react';
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
  Bookmark,
  BookmarkCheck,
  Save,
  Trash2,
  Sliders,
  Check,
  X,
  History,
  Layers,
  Utensils,
  Calendar,
  Clock,
  Target,
  PlayCircle,
  ChevronRight,
  Filter,
  Eye,
  Edit3,
  PlusCircle,
  RefreshCw,
  Wand2,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import {
  BodyPoint,
  CtgPeriodizedRoadmap,
  CtgProfile,
  CtgRoadmapPhase,
  CtgPhaseType,
  Goal,
  NutritionSettings,
  RoutineSplitTemplate,
  SavedRoadmap,
  Sex,
} from '../../../types/productivity';
import { SEED_CTG_PERIODIZED_ROADMAP } from '../../../data/productivitySeed';
import {
  ffmi,
  leanMassKg,
  fatMassKg,
  tdee,
  calorieTarget,
  macroTargets,
  MESOCYCLE_PHASES,
  generateCtgPeriodizedRoadmap,
  calculatePhaseNutrition,
} from '../../../utils/fitnessMetrics';
import { notifySuccess } from '../../../utils/notify';

interface RoadmapTabProps {
  profile: CtgProfile;
  lang: 'vi' | 'en';
  bodyPoints?: BodyPoint[];
  ctgPeriodizedRoadmap?: CtgPeriodizedRoadmap | null;
  onUpdateCtgPeriodizedRoadmap?: (roadmap: CtgPeriodizedRoadmap | null) => void;
  onSetActiveRoadmapPhase?: (phaseId: string) => void;
  savedRoadmaps?: SavedRoadmap[];
  onAddSavedRoadmap?: (roadmap: Omit<SavedRoadmap, 'id' | 'createdAt'>) => SavedRoadmap;
  onDeleteSavedRoadmap?: (id: string) => void;
  nutritionSettings?: NutritionSettings;
  onUpdateNutritionSettings?: (patch: Partial<NutritionSettings>) => void;
  onUpdateProfile: (patch: Partial<CtgProfile>) => void;
  onNavigateTab?: (tab: 'inbody' | 'training' | 'nutrition' | 'profile') => void;
  onApplySplitTemplate?: (template: RoutineSplitTemplate) => void;
  savedCtgRoadmaps?: CtgPeriodizedRoadmap[];
  onSaveCtgRoadmap?: (roadmap: CtgPeriodizedRoadmap) => void;
  onDeleteCtgRoadmap?: (roadmapId: string) => void;
  onSwitchCtgRoadmap?: (roadmapId: string) => void;
  onDeleteCurrentCtgRoadmap?: () => void;
}

// VortexCal Standards & Classification criteria from AI analyzer algorithm
const VORTEXCAL_STANDARDS = {
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

export function parseVnDate(str: string): Date {
  if (!str || typeof str !== 'string') return new Date(NaN);
  const trimmed = str.trim();
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (isNaN(p0) || isNaN(p1) || isNaN(p2)) return new Date(NaN);
    if (parts[0].length === 4) {
      // YYYY-MM-DD or YYYY/MM/DD
      return new Date(p0, p1 - 1, p2);
    }
    // DD/MM/YYYY
    const year = p2 < 100 ? 2000 + p2 : p2;
    return new Date(year, p1 - 1, p0);
  }
  return new Date(trimmed);
}

export function getPhaseStatus(phase: CtgRoadmapPhase, activePhaseId?: string): 'completed' | 'current' | 'upcoming' {
  if (activePhaseId && phase.id === activePhaseId) return 'current';
  if (!activePhaseId && phase.isCurrent) return 'current';
  const now = new Date();
  const end = parseVnDate(phase.endDate);
  if (Number.isFinite(end.getTime())) {
    end.setHours(23, 59, 59, 999);
    if (now > end) return 'completed';
  }
  const start = parseVnDate(phase.startDate);
  if (Number.isFinite(start.getTime())) {
    start.setHours(0, 0, 0, 0);
    if (now < start) return 'upcoming';
  }
  return 'current';
}

export const RoadmapTab: React.FC<RoadmapTabProps> = ({
  profile,
  lang,
  bodyPoints = [],
  ctgPeriodizedRoadmap,
  onUpdateCtgPeriodizedRoadmap,
  onSetActiveRoadmapPhase,
  savedRoadmaps = [],
  onAddSavedRoadmap,
  onDeleteSavedRoadmap,
  nutritionSettings,
  onUpdateNutritionSettings,
  onUpdateProfile,
  onNavigateTab,
  onApplySplitTemplate,
  savedCtgRoadmaps = [],
  onSaveCtgRoadmap,
  onDeleteCtgRoadmap,
  onSwitchCtgRoadmap,
  onDeleteCurrentCtgRoadmap,
}) => {
  // View mode switcher: CTG Master Periodization vs Saved Roadmaps vs Single Snapshot vs Saved Milestones
  const [activeViewMode, setActiveViewMode] = useState<'ctg_periodized' | 'saved_roadmaps' | 'single_analyzer' | 'saved_milestones'>('ctg_periodized');
  const [expandedRoadmapId, setExpandedRoadmapId] = useState<string | null>(null);
  const [roadmapToDelete, setRoadmapToDelete] = useState<CtgPeriodizedRoadmap | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'current' | 'completed' | 'upcoming' | 'bulk' | 'cut'>('all');
  const [selectedPhase, setSelectedPhase] = useState<CtgRoadmapPhase | null>(null);

  const activeRoadmap = ctgPeriodizedRoadmap ?? null;
  const phases = activeRoadmap?.phases || [];

  const allSavedCtgRoadmaps = useMemo(() => {
    const list = [...savedCtgRoadmaps];
    if (activeRoadmap && !list.some((r) => r.id === activeRoadmap.id)) {
      list.unshift(activeRoadmap);
    }
    return list;
  }, [savedCtgRoadmaps, activeRoadmap]);

  // Sorted BodyPoints and latest point
  const sortedPoints = useMemo(() => {
    return [...(bodyPoints || [])].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  }, [bodyPoints]);
  const latestPoint = useMemo(() => (sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null), [sortedPoints]);

  // Input form state initialized from profile
  const [sex, setSex] = useState<Sex>(profile.sex || 'male');
  const [heightCm, setHeightCm] = useState(String(profile.heightCm || 172));
  const [weightKg, setWeightKg] = useState(String(profile.targetWeightKg || 68));
  const [bodyfatPct, setBodyfatPct] = useState(String(profile.targetBodyFatPct || 18));
  const [userGoal, setUserGoal] = useState<'auto' | Goal>('auto');
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const [isLiveTrackingCollapsed, setIsLiveTrackingCollapsed] = useState(false);

  const activePhase = useMemo(() => {
    if (!activeRoadmap || phases.length === 0) return null;
    if (activeRoadmap.activePhaseId && activeRoadmap.activePhaseId !== 'none') {
      const found = phases.find((p) => p.id === activeRoadmap.activePhaseId);
      if (found) return found;
    }
    const currentExplicit = phases.find((p) => p.isCurrent);
    if (currentExplicit) return currentExplicit;
    const today = new Date();
    const byDate = phases.find((p) => {
      const s = parseVnDate(p.startDate);
      const e = parseVnDate(p.endDate);
      return today >= s && today <= e;
    });
    return byDate || phases[0] || null;
  }, [activeRoadmap, phases]);

  // Cân nặng hiện tại: ưu tiên số đo thực tế nếu mới hơn mốc bắt đầu của lộ trình/giai đoạn,
  // nếu chưa có số đo mới thì lấy đúng mốc khởi điểm lộ trình do người dùng tạo (VD: 64.5kg)
  const currentWeight = useMemo(() => {
    if (activeRoadmap?.initialWeightKg) {
      if (latestPoint && activePhase?.startDate) {
        const ptDate = new Date(latestPoint.date).getTime();
        const phDate = parseVnDate(activePhase.startDate).getTime();
        if (ptDate > phDate) {
          return latestPoint.weightKg;
        }
      }
      return activePhase?.startWeightKg ?? activeRoadmap.initialWeightKg;
    }
    return latestPoint?.weightKg ?? Number(weightKg) ?? 67.8;
  }, [activeRoadmap, activePhase, latestPoint, weightKg]);

  const currentBf = useMemo(() => {
    if (activeRoadmap?.initialBodyFatPct) {
      if (latestPoint && activePhase?.startDate) {
        const ptDate = new Date(latestPoint.date).getTime();
        const phDate = parseVnDate(activePhase.startDate).getTime();
        if (ptDate > phDate) {
          return latestPoint.bodyFatPct;
        }
      }
      return activePhase?.startBodyFatPct ?? activeRoadmap.initialBodyFatPct;
    }
    return latestPoint?.bodyFatPct ?? Number(bodyfatPct) ?? 17.1;
  }, [activeRoadmap, activePhase, latestPoint, bodyfatPct]);

  const currentLbm = useMemo(() => {
    return latestPoint ? leanMassKg(latestPoint.weightKg, latestPoint.bodyFatPct) : leanMassKg(currentWeight, currentBf);
  }, [latestPoint, currentWeight, currentBf]);

  const currentFfmi = useMemo(() => {
    return latestPoint ? ffmi(latestPoint.weightKg, latestPoint.bodyFatPct, Number(heightCm) || 172) : ffmi(currentWeight, currentBf, Number(heightCm) || 172);
  }, [latestPoint, currentWeight, currentBf, heightCm]);

  // Tự động khôi phục phase hợp lệ nếu activePhaseId đang là 'none' hoặc bị trống
  useEffect(() => {
    if (activeRoadmap && activeRoadmap.activePhaseId === 'none' && phases.length > 0) {
      onSetActiveRoadmapPhase?.(phases[0].id);
    }
  }, [activeRoadmap, phases, onSetActiveRoadmapPhase]);

  // CTG Periodized Generator & Custom Phase Modals
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [genMode, setGenMode] = useState<'auto' | 'blank'>('auto');
  const [blankTitle, setBlankTitle] = useState('Lộ Trình Thể Hình Mới');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRoadmapManagerModal, setShowRoadmapManagerModal] = useState(false);

  const [genSex, setGenSex] = useState<Sex>(profile.sex || 'male');
  const [genHeight, setGenHeight] = useState(String(profile.heightCm || 172));
  const [genWeight, setGenWeight] = useState(String(currentWeight || 68));
  const [genBodyFat, setGenBodyFat] = useState(String(currentBf || 18));
  const [genTargetFfmi, setGenTargetFfmi] = useState(profile.sex === 'female' ? '19.5' : '22.0');
  const [genStartDate, setGenStartDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  });

  const [showAddPhaseModal, setShowAddPhaseModal] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('Tăng cơ');
  const [newPhaseType, setNewPhaseType] = useState<CtgPhaseType>('bulk');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newStartWeight, setNewStartWeight] = useState(String(currentWeight));
  const [newTargetWeight, setNewTargetWeight] = useState(String(Math.round((currentWeight + 4) * 10) / 10));
  const [newStartBf, setNewStartBf] = useState(String(currentBf));
  const [newTargetBf, setNewTargetBf] = useState(String(Math.round((currentBf + 1.5) * 10) / 10));
  const [newKcal, setNewKcal] = useState('2300');
  const [newProtein, setNewProtein] = useState('130');
  const [newCarbs, setNewCarbs] = useState('300');
  const [newFat, setNewFat] = useState('65');
  const [newNote, setNewNote] = useState('');

  const [editingPhase, setEditingPhase] = useState<CtgRoadmapPhase | null>(null);

  // Saved Roadmaps Modal & State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNote, setSaveNote] = useState('');

  // Macro Studio Customizer State
  type MacroPreset = 'viet_balanced' | 'high_protein' | 'cutting' | 'low_carb' | 'custom';
  const [macroPreset, setMacroPreset] = useState<MacroPreset>('viet_balanced');
  const [isCustomMacroActive, setIsCustomMacroActive] = useState(false);
  const [customProtein, setCustomProtein] = useState(140);
  const [customCarbs, setCustomCarbs] = useState(200);
  const [customFat, setCustomFat] = useState(55);

  const sexKey = sex === 'female' ? 'nu' : 'nam';
  const hNum = Number(heightCm) || 172;
  const wNum = Number(weightKg) || 68;
  const bfNum = Number(bodyfatPct) || 18;

  // Analysis result using VortexCal algorithm
  const analysis = useMemo(() => {
    const std = VORTEXCAL_STANDARDS[sexKey];
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
      recommendedPlan,
      effectiveGoal,
      planLabelVi,
      rationaleVi,
      projectedWeightKg,
      projectedBodyfatPct,
      targetKcal,
      macros,
    };
  }, [sexKey, hNum, wNum, bfNum, userGoal, profile]);

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

  const handleApplyRoadmapAndCreateSplit = () => {
    let recommendedSplit: RoutineSplitTemplate = 'upper_lower';
    let splitName = 'Upper / Lower (4 ngày/tuần)';
    if (sex === 'female' && (userGoal === 'maintain' || userGoal === 'cut')) {
      recommendedSplit = 'glute_lower';
      splitName = 'Glute & Lower Focus (4 ngày/tuần)';
    } else if (analysis.effectiveGoal === 'bulk') {
      recommendedSplit = 'ppl';
      splitName = 'PPL Hypertrophy (5 ngày/tuần)';
    } else if (analysis.effectiveGoal === 'cut') {
      recommendedSplit = 'upper_lower';
      splitName = 'Upper / Lower Sức Mạnh & Cắt Nét (4 ngày/tuần)';
    } else {
      recommendedSplit = 'arnold';
      splitName = 'Arnold Classic Split (6 ngày/tuần)';
    }

    onUpdateProfile({
      sex,
      heightCm: hNum,
      targetWeightKg: analysis.projectedWeightKg,
      targetBodyFatPct: analysis.projectedBodyfatPct,
      goal: analysis.effectiveGoal,
    });

    onUpdateNutritionSettings?.({
      overrides: {
        ...(nutritionSettings?.overrides || {}),
        [analysis.effectiveGoal]: {
          kcal: customMacroKcal,
          protein: currentActiveMacros.protein,
          carbs: currentActiveMacros.carbs,
          fat: currentActiveMacros.fat,
        },
      },
    });

    onApplySplitTemplate?.(recommendedSplit);

    setAppliedBanner(
      `Đã kích hoạt toàn diện: Mục tiêu ${analysis.effectiveGoal === 'cut' ? 'Giảm mỡ' : analysis.effectiveGoal === 'bulk' ? 'Tăng cơ' : 'Duy trì'} (${analysis.projectedWeightKg}kg / ${analysis.projectedBodyfatPct}% mỡ) · Kích hoạt giáo án "${splitName}" · Dinh dưỡng ${customMacroKcal} kcal!`
    );
    setTimeout(() => setAppliedBanner(null), 10000);
  };

  const handleSelectMacroPreset = (preset: MacroPreset) => {
    setMacroPreset(preset);
    setIsCustomMacroActive(true);
    const kcal = analysis.targetKcal;
    if (preset === 'viet_balanced') {
      setCustomProtein(Math.round((kcal * 0.30) / 4));
      setCustomFat(Math.round((kcal * 0.25) / 9));
      setCustomCarbs(Math.round((kcal * 0.45) / 4));
    } else if (preset === 'high_protein') {
      const p = Math.round(wNum * 2.2);
      const f = Math.round(wNum * 1.0);
      const c = Math.max(20, Math.round((kcal - p * 4 - f * 9) / 4));
      setCustomProtein(p);
      setCustomFat(f);
      setCustomCarbs(c);
    } else if (preset === 'cutting') {
      const p = Math.round(wNum * 2.4);
      const f = Math.round(wNum * 0.7);
      const c = Math.max(15, Math.round((kcal - p * 4 - f * 9) / 4));
      setCustomProtein(p);
      setCustomFat(f);
      setCustomCarbs(c);
    } else if (preset === 'low_carb') {
      const p = Math.round((kcal * 0.25) / 4);
      const f = Math.round((kcal * 0.65) / 9);
      const c = Math.round((kcal * 0.10) / 4);
      setCustomProtein(p);
      setCustomFat(f);
      setCustomCarbs(c);
    }
  };

  const currentActiveMacros = useMemo(() => {
    if (isCustomMacroActive) {
      return {
        protein: customProtein,
        carbs: customCarbs,
        fat: customFat,
      };
    }
    return analysis.macros;
  }, [isCustomMacroActive, customProtein, customCarbs, customFat, analysis.macros]);

  const customMacroKcal = currentActiveMacros.protein * 4 + currentActiveMacros.carbs * 4 + currentActiveMacros.fat * 9;

  const handleApplyMacroToNutrition = () => {
    onUpdateNutritionSettings?.({
      overrides: {
        ...(nutritionSettings?.overrides || {}),
        [analysis.effectiveGoal]: {
          kcal: customMacroKcal,
          protein: currentActiveMacros.protein,
          carbs: currentActiveMacros.carbs,
          fat: currentActiveMacros.fat,
        },
      },
    });
    setAppliedBanner(
      `Đã đồng bộ Macro (${currentActiveMacros.protein}g Protein · ${currentActiveMacros.carbs}g Carbs · ${currentActiveMacros.fat}g Fat = ${customMacroKcal} kcal) vào mục tiêu dinh dưỡng!`
    );
    setTimeout(() => setAppliedBanner(null), 5000);
  };

  const handleSaveRoadmapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = saveTitle.trim() || `Lộ trình ${analysis.planLabelVi} (${analysis.projectedWeightKg}kg / ${analysis.projectedBodyfatPct}% mỡ)`;
    onAddSavedRoadmap?.({
      title,
      date: new Date().toISOString().slice(0, 10),
      weightKg: wNum,
      bodyfatPct: bfNum,
      heightCm: hNum,
      sex,
      goal: analysis.effectiveGoal,
      lbmKg: analysis.lbmKg,
      bfmKg: analysis.bfmKg,
      ffmi: analysis.ffmi,
      targetWeightKg: analysis.projectedWeightKg,
      targetBodyfatPct: analysis.projectedBodyfatPct,
      targetKcal: analysis.targetKcal,
      macros: {
        protein: currentActiveMacros.protein,
        carbs: currentActiveMacros.carbs,
        fat: currentActiveMacros.fat,
      },
      note: saveNote.trim() || undefined,
    });
    setShowSaveModal(false);
    setSaveTitle('');
    setSaveNote('');
    setAppliedBanner(`Đã lưu mốc định hướng chiến lược "${title}" vào thư viện!`);
    setTimeout(() => setAppliedBanner(null), 5000);
  };

  const handleLoadSavedRoadmap = (rm: SavedRoadmap) => {
    setSex(rm.sex);
    setHeightCm(String(rm.heightCm));
    setWeightKg(String(rm.weightKg));
    setBodyfatPct(String(rm.bodyfatPct));
    setUserGoal(rm.goal);
    setIsCustomMacroActive(true);
    setCustomProtein(rm.macros.protein);
    setCustomCarbs(rm.macros.carbs);
    setCustomFat(rm.macros.fat);

    onUpdateProfile({
      sex: rm.sex,
      heightCm: rm.heightCm,
      targetWeightKg: rm.targetWeightKg,
      targetBodyFatPct: rm.targetBodyfatPct,
      goal: rm.goal,
    });

    onUpdateNutritionSettings?.({
      overrides: {
        ...(nutritionSettings?.overrides || {}),
        [rm.goal]: {
          kcal: rm.targetKcal,
          protein: rm.macros.protein,
          carbs: rm.macros.carbs,
          fat: rm.macros.fat,
        },
      },
    });

    setAppliedBanner(
      `Đã kích hoạt lại định hướng "${rm.title}": Mục tiêu ${rm.targetWeightKg}kg · ${rm.targetBodyfatPct}% mỡ · ${rm.targetKcal} kcal!`
    );
    setTimeout(() => setAppliedBanner(null), 6000);
  };

  // Handlers for CTG Periodized Roadmap
  const handleApplySinglePhase = (phase: CtgRoadmapPhase) => {
    const goal: Goal = phase.phaseType === 'bulk' ? 'bulk' : 'cut';
    onUpdateProfile({
      goal,
      targetWeightKg: phase.targetWeightKg,
      targetBodyFatPct: phase.targetBodyFatPct,
    });
    onUpdateNutritionSettings?.({
      overrides: {
        ...(nutritionSettings?.overrides || {}),
        [goal]: {
          kcal: phase.targetKcal,
          protein: phase.macros.protein,
          carbs: phase.macros.carbs,
          fat: phase.macros.fat,
        },
      },
    });
    const split: RoutineSplitTemplate = phase.phaseType === 'bulk' ? 'ppl' : 'upper_lower';
    onApplySplitTemplate?.(split);
    setAppliedBanner(
      `Đã áp dụng giai đoạn "${phase.name}" (${phase.startDate} – ${phase.endDate}): Mục tiêu ${phase.targetWeightKg}kg · ${phase.targetBodyFatPct}% mỡ · Calo ${phase.targetKcal} kcal (${phase.macros.protein}g Đạm / ${phase.macros.carbs}g Carb / ${phase.macros.fat}g Fat)!`
    );
    setTimeout(() => setAppliedBanner(null), 8000);
  };

  const handleApplyFullRoadmap = () => {
    if (!activePhase) return;
    onSetActiveRoadmapPhase?.(activePhase.id);
    handleApplySinglePhase(activePhase);
    setAppliedBanner(
      `Đã kích hoạt toàn bộ đại lộ trình "${activeRoadmap?.title || 'CTG'}" (${phases.length} giai đoạn)! Giai đoạn đang chạy: "${activePhase.name}" (${activePhase.startDate} – ${activePhase.endDate}). Mục tiêu Dinh Dưỡng và Giáo Án đã tự động đồng bộ!`
    );
    setTimeout(() => setAppliedBanner(null), 8000);
  };

  const handleSetCurrentPhase = (phaseId: string) => {
    onSetActiveRoadmapPhase?.(phaseId);
    const p = phases.find((item) => item.id === phaseId);
    if (p) {
      handleApplySinglePhase(p);
      notifySuccess(
        'Đã chọn giai đoạn theo dõi!',
        `Giai đoạn "${p.name}" (${p.startDate} – ${p.endDate}) đã được kích hoạt.`
      );
    }
  };

  const handleGenerateNewRoadmap = () => {
    const h = Number(genHeight) || 172;
    const w = Number(genWeight) || 68;
    const bf = Number(genBodyFat) || 18;
    const targetFfmiVal = Number(genTargetFfmi) || (genSex === 'female' ? 19.5 : 22.0);

    const generated = generateCtgPeriodizedRoadmap({
      sex: genSex,
      heightCm: h,
      currentWeightKg: w,
      currentBodyFatPct: bf,
      targetFfmi: targetFfmiVal,
      startDate: genStartDate || undefined,
    });

    onUpdateCtgPeriodizedRoadmap?.(generated);
    onSaveCtgRoadmap?.(generated);
    setShowGeneratorModal(false);

    // Mặc định kích hoạt và áp dụng giai đoạn đầu tiên của lộ trình mới
    const firstP = generated.phases[0];
    if (firstP) {
      handleApplySinglePhase(firstP);
    }
    notifySuccess(
      'Tạo lộ trình chu kỳ thành công!',
      `Đã thiết lập ${generated.phases.length} giai đoạn tối ưu hóa riêng cho thể trạng của bạn!`
    );
  };

  const handleCreateBlankRoadmap = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newRoadmap: CtgPeriodizedRoadmap = {
      id: `ctg-manual-${Date.now()}`,
      title: blankTitle.trim() || 'Lộ Trình Thể Hình Mới',
      createdAt: Date.now(),
      sex: profile.sex || 'male',
      heightCm: Number(profile.heightCm) || 172,
      initialWeightKg: currentWeight,
      initialBodyFatPct: currentBf,
      targetFfmi: profile.sex === 'female' ? 19.5 : 22.0,
      phases: [],
    };
    onUpdateCtgPeriodizedRoadmap?.(newRoadmap);
    onSaveCtgRoadmap?.(newRoadmap);
    setShowGeneratorModal(false);
    setShowAddPhaseModal(true);
    setAppliedBanner(`Đã tạo lộ trình mới "${newRoadmap.title}". Hãy thêm giai đoạn đầu tiên!`);
    setTimeout(() => setAppliedBanner(null), 6000);
    notifySuccess('Đã tạo lộ trình mới!', `Lộ trình "${newRoadmap.title}" đã sẵn sàng.`);
  };

  const handleCopyRoadmapSummary = async () => {
    if (!activeRoadmap) return;
    const lines = [
      `🏋️ LỘ TRÌNH THỂ HÌNH CHU KỲ CHUẨN CTG: ${activeRoadmap.title}`,
      `• Mục tiêu: ${profile.goal === 'cut' ? 'Giảm mỡ' : profile.goal === 'bulk' ? 'Tăng cơ' : 'Duy trì'} · Tổng số giai đoạn: ${phases.length}`,
      `• Thể trạng ban đầu: Chiều cao ${profile.heightCm || 172}cm · Cân nặng ${currentWeight}kg · Mỡ ${currentBf}% (LBM: ${currentLbm}kg, FFMI: ${currentFfmi})`,
      '',
      '📅 CHI TIẾT CÁC GIAI ĐOẠN:',
      ...phases.map((p, idx) => {
        return `#${idx + 1}. ${p.name} (${p.startDate} – ${p.endDate}): ${p.startWeightKg}kg → ${p.targetWeightKg}kg (% mỡ: ${p.startBodyFatPct}% → ${p.targetBodyFatPct}%) | Calo: ${p.targetKcal.toLocaleString('vi-VN')} kcal (Đạm: ${p.macros.protein}g / Carb: ${p.macros.carbs}g / Fat: ${p.macros.fat}g)${p.note ? ` | Lời khuyên: ${p.note}` : ''}`;
      }),
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setAppliedBanner('Đã sao chép toàn bộ tóm tắt lộ trình vào bộ nhớ tạm (Clipboard)!');
      setTimeout(() => setAppliedBanner(null), 4000);
      notifySuccess('Đã sao chép tóm tắt!', 'Toàn bộ nội dung lộ trình đã được lưu vào clipboard.');
    } catch {
      setAppliedBanner('Đã chuẩn bị tóm tắt lộ trình.');
      setTimeout(() => setAppliedBanner(null), 3000);
    }
  };

  const handleConfirmDeleteCurrentRoadmap = () => {
    if (onDeleteCurrentCtgRoadmap) {
      onDeleteCurrentCtgRoadmap();
    } else {
      onUpdateCtgPeriodizedRoadmap?.(null);
    }
    setShowDeleteConfirmModal(false);
    setAppliedBanner('Đã xóa bỏ hoàn toàn lộ trình hiện tại.');
    setTimeout(() => setAppliedBanner(null), 4000);
    notifySuccess('Đã xóa lộ trình', 'Lộ trình hiện tại đã được loại bỏ.');
  };

  const handleSwitchRoadmap = (rm: CtgPeriodizedRoadmap) => {
    if (onSwitchCtgRoadmap) {
      onSwitchCtgRoadmap(rm.id);
    } else {
      onUpdateCtgPeriodizedRoadmap?.(rm);
    }
    const targetPhase = rm.phases?.find((p) => p.id === rm.activePhaseId) || rm.phases?.[0];
    if (targetPhase) {
      handleApplySinglePhase(targetPhase);
    }
    setAppliedBanner(`Đã kích hoạt lộ trình "${rm.title || 'Mới'}"!`);
    setTimeout(() => setAppliedBanner(null), 5000);
    setActiveViewMode('ctg_periodized');
  };

  const handleDeleteSavedRoadmap = (rmId: string) => {
    if (activeRoadmap?.id === rmId) {
      if (onDeleteCurrentCtgRoadmap) {
        onDeleteCurrentCtgRoadmap();
      } else {
        onUpdateCtgPeriodizedRoadmap?.(null);
      }
    } else {
      onDeleteCtgRoadmap?.(rmId);
    }
    setAppliedBanner('Đã xóa lộ trình khỏi danh sách.');
    setTimeout(() => setAppliedBanner(null), 4000);
    setRoadmapToDelete(null);
  };

  const handleAddCustomPhaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hMeter = (Number(profile.heightCm) || 172) / 100;
    const hSq = hMeter * hMeter;
    const sW = Number(newStartWeight) || currentWeight;
    const tW = Number(newTargetWeight) || currentWeight;
    const sBf = Number(newStartBf) || currentBf;
    const tBf = Number(newTargetBf) || currentBf;
    const sLbm = Math.round(sW * (1 - sBf / 100) * 10) / 10;
    const tLbm = Math.round(tW * (1 - tBf / 100) * 10) / 10;
    const sFfmi = Math.round((sLbm / hSq) * 10) / 10;
    const tFfmi = Math.round((tLbm / hSq) * 10) / 10;

    const createdPhase: CtgRoadmapPhase = {
      id: `ctg-custom-${Date.now()}`,
      name: newPhaseName.trim() || 'Giai đoạn tùy chỉnh',
      phaseType: newPhaseType,
      startDate: newStartDate.trim() || 'Hôm nay',
      endDate: newEndDate.trim() || 'Tương lai',
      startWeightKg: sW,
      targetWeightKg: tW,
      startBodyFatPct: sBf,
      targetBodyFatPct: tBf,
      startLbmKg: sLbm,
      targetLbmKg: tLbm,
      startFfmi: sFfmi,
      targetFfmi: tFfmi,
      targetKcal: Number(newKcal) || 2000,
      macros: {
        protein: Number(newProtein) || 130,
        carbs: Number(newCarbs) || 220,
        fat: Number(newFat) || 50,
      },
      note: newNote.trim() || '',
    };

    const baseRoadmap: CtgPeriodizedRoadmap = activeRoadmap || {
      id: `ctg-manual-${Date.now()}`,
      title: 'Lộ Trình Thể Hình Tùy Chỉnh',
      createdAt: Date.now(),
      sex: profile.sex || 'male',
      heightCm: Number(profile.heightCm) || 172,
      initialWeightKg: currentWeight,
      initialBodyFatPct: currentBf,
      targetFfmi: profile.sex === 'female' ? 19.5 : 22.0,
      phases: [],
    };

    const updatedPhases = [...baseRoadmap.phases, createdPhase];
    const updatedRoadmap: CtgPeriodizedRoadmap = {
      ...baseRoadmap,
      activePhaseId: baseRoadmap.activePhaseId || createdPhase.id,
      phases: updatedPhases,
    };
    onUpdateCtgPeriodizedRoadmap?.(updatedRoadmap);
    onSaveCtgRoadmap?.(updatedRoadmap);
    setShowAddPhaseModal(false);
    setAppliedBanner(`Đã thêm giai đoạn "${createdPhase.name}" vào lộ trình!`);
    setTimeout(() => setAppliedBanner(null), 6000);
    notifySuccess('Đã thêm giai đoạn mới!', `Giai đoạn "${createdPhase.name}" đã được thêm vào lộ trình.`);
  };

  const handleUpdatePhaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase || !activeRoadmap) return;
    const hMeter = (Number(profile.heightCm) || 172) / 100;
    const hSq = hMeter * hMeter;
    const sW = Number(editingPhase.startWeightKg) || currentWeight;
    const tW = Number(editingPhase.targetWeightKg) || currentWeight;
    const sBf = Number(editingPhase.startBodyFatPct) || currentBf;
    const tBf = Number(editingPhase.targetBodyFatPct) || currentBf;
    const sLbm = Math.round(sW * (1 - sBf / 100) * 10) / 10;
    const tLbm = Math.round(tW * (1 - tBf / 100) * 10) / 10;
    const sFfmi = Math.round((sLbm / hSq) * 10) / 10;
    const tFfmi = Math.round((tLbm / hSq) * 10) / 10;

    const updated: CtgRoadmapPhase = {
      ...editingPhase,
      startLbmKg: sLbm,
      targetLbmKg: tLbm,
      startFfmi: sFfmi,
      targetFfmi: tFfmi,
    };

    const updatedPhases = activeRoadmap.phases.map((p) => (p.id === updated.id ? updated : p));
    const updatedRoadmap = {
      ...activeRoadmap,
      phases: updatedPhases,
    };
    onUpdateCtgPeriodizedRoadmap?.(updatedRoadmap);
    onSaveCtgRoadmap?.(updatedRoadmap);
    setEditingPhase(null);
    setAppliedBanner(`Đã cập nhật thông tin giai đoạn "${updated.name}"!`);
    setTimeout(() => setAppliedBanner(null), 6000);
    notifySuccess('Đã cập nhật giai đoạn!', `Giai đoạn "${updated.name}" đã được cập nhật thành công.`);
  };

  const handleSyncPhaseWithCurrentWeight = (phase: CtgRoadmapPhase) => {
    if (!activeRoadmap) return;
    const hMeter = (Number(profile.heightCm) || 172) / 100;
    const hSq = hMeter * hMeter;
    const sW = currentWeight;
    const sBf = currentBf;
    const sLbm = Math.round(sW * (1 - sBf / 100) * 10) / 10;
    const sFfmi = Math.round((sLbm / hSq) * 10) / 10;

    let tW = phase.targetWeightKg;
    let tBf = phase.targetBodyFatPct;
    let tLbm = phase.targetLbmKg;
    let tFfmi = phase.targetFfmi;

    if (phase.phaseType === 'cut' || phase.phaseType === 'minicut') {
      tBf = Math.max(10, Math.round((sBf - 2.0) * 10) / 10);
      tLbm = Math.round(sLbm * 0.995 * 10) / 10;
      tW = Math.round((tLbm / (1 - tBf / 100)) * 10) / 10;
      tFfmi = Math.round((tLbm / hSq) * 10) / 10;
    } else if (phase.phaseType === 'bulk') {
      tW = Math.round((sW + 3.5) * 10) / 10;
      tBf = Math.round((sBf + 1.2) * 10) / 10;
      tLbm = Math.round((tW * (1 - tBf / 100)) * 10) / 10;
      tFfmi = Math.round((tLbm / hSq) * 10) / 10;
    }

    const nut = calculatePhaseNutrition(
      profile.sex || 'male',
      Number(profile.heightCm) || 172,
      (sW + tW) / 2,
      phase.phaseType
    );

    const updatedPhase: CtgRoadmapPhase = {
      ...phase,
      startWeightKg: sW,
      startBodyFatPct: sBf,
      startLbmKg: sLbm,
      startFfmi: sFfmi,
      targetWeightKg: tW,
      targetBodyFatPct: tBf,
      targetLbmKg: tLbm,
      targetFfmi: tFfmi,
      targetKcal: nut.targetKcal,
      macros: {
        protein: nut.protein,
        carbs: nut.carbs,
        fat: nut.fat,
      },
    };

    const updatedPhases = activeRoadmap.phases.map((p) => (p.id === updatedPhase.id ? updatedPhase : p));
    const updatedRoadmap = {
      ...activeRoadmap,
      phases: updatedPhases,
    };
    onUpdateCtgPeriodizedRoadmap?.(updatedRoadmap);
    onSaveCtgRoadmap?.(updatedRoadmap);
    setAppliedBanner(`Đã đồng bộ mốc xuất phát giai đoạn về cân nặng thực tế ${sW}kg (${sBf}% mỡ)!`);
    setTimeout(() => setAppliedBanner(null), 6000);
    notifySuccess('Đã đồng bộ cân nặng xuất phát!', `Giai đoạn cập nhật xuất phát từ ${sW}kg (${sBf}% mỡ).`);
  };

  const handleDeletePhase = (phaseId: string) => {
    if (!activeRoadmap) return;
    if (phases.length <= 1) {
      if (window.confirm('Đây là giai đoạn duy nhất còn lại. Bạn có muốn xóa toàn bộ lộ trình không?')) {
        handleConfirmDeleteCurrentRoadmap();
      }
      return;
    }
    const remaining = phases.filter((p) => p.id !== phaseId);
    let nextActiveId = activeRoadmap.activePhaseId;
    if (nextActiveId === phaseId) {
      nextActiveId = remaining[0]?.id;
    }
    const updatedRoadmap = {
      ...activeRoadmap,
      activePhaseId: nextActiveId,
      phases: remaining,
    };
    onUpdateCtgPeriodizedRoadmap?.(updatedRoadmap);
    onSaveCtgRoadmap?.(updatedRoadmap);
    setAppliedBanner('Đã xóa giai đoạn khỏi lộ trình.');
    setTimeout(() => setAppliedBanner(null), 4000);
    notifySuccess('Đã xóa giai đoạn', 'Giai đoạn đã được loại bỏ khỏi lộ trình.');
  };

  const handleResetToSeedRoadmap = () => {
    if (window.confirm('Khôi phục lại Đại Lộ Trình Chu Kỳ 17 Giai Đoạn chuẩn (2026 – 2029)?')) {
      onUpdateCtgPeriodizedRoadmap?.(SEED_CTG_PERIODIZED_ROADMAP);
      onSaveCtgRoadmap?.(SEED_CTG_PERIODIZED_ROADMAP);
      setAppliedBanner('Đã khôi phục lại đại lộ trình chu kỳ 17 giai đoạn chuẩn!');
      setTimeout(() => setAppliedBanner(null), 5000);
      notifySuccess('Đã khôi phục mẫu chuẩn!', 'Lộ trình 17 giai đoạn chuẩn CTG đã sẵn sàng.');
    }
  };

  const firstPhase = phases[0];
  const lastPhase = phases[phases.length - 1];
  const totalLbmGain =
    firstPhase && lastPhase ? Math.round((lastPhase.targetLbmKg - firstPhase.startLbmKg) * 10) / 10 : 0;
  const totalFfmiGain =
    firstPhase && lastPhase ? Math.round((lastPhase.targetFfmi - firstPhase.startFfmi) * 10) / 10 : 0;

  const completedPhasesCount = useMemo(() => {
    return phases.filter((p) => getPhaseStatus(p, activeRoadmap?.activePhaseId) === 'completed').length;
  }, [phases, activeRoadmap?.activePhaseId]);

  const currentPhaseIndex = useMemo(() => {
    return activePhase ? phases.findIndex((p) => p.id === activePhase.id) : -1;
  }, [phases, activePhase]);

  const bulkPhasesCount = useMemo(() => {
    return phases.filter((p) => p.phaseType === 'bulk').length;
  }, [phases]);

  const cutPhasesCount = useMemo(() => {
    return phases.filter((p) => p.phaseType === 'cut' || p.phaseType === 'minicut').length;
  }, [phases]);

  const macrocyclePercent = useMemo(() => {
    if (!phases.length) return 0;
    const effectiveDone = completedPhasesCount + (currentPhaseIndex >= 0 ? 0.5 : 0);
    return Math.min(100, Math.round((effectiveDone / phases.length) * 100));
  }, [phases.length, completedPhasesCount, currentPhaseIndex]);

  const isBulkPhase = activePhase?.phaseType === 'bulk';
  const startW = activePhase?.startWeightKg ?? currentWeight;
  const targetW = activePhase?.targetWeightKg ?? currentWeight;
  const wDelta = activePhase ? Math.round((currentWeight - targetW) * 10) / 10 : 0;
  const lbmGain = activePhase ? Math.round((currentLbm - activePhase.startLbmKg) * 10) / 10 : 0;
  const targetLbmGain = activePhase ? Math.round((activePhase.targetLbmKg - activePhase.startLbmKg) * 10) / 10 : 0;

  const weightProgress = useMemo(() => {
    if (!activePhase) return 0;
    if (isBulkPhase) {
      if (currentWeight >= targetW) return 100;
      if (currentWeight <= startW) return 0;
      return Math.min(100, Math.max(0, Math.round(((currentWeight - startW) / (targetW - startW)) * 100)));
    } else {
      if (currentWeight <= targetW) return 100;
      if (currentWeight >= startW) return 0;
      return Math.min(100, Math.max(0, Math.round(((startW - currentWeight) / (startW - targetW)) * 100)));
    }
  }, [activePhase, isBulkPhase, currentWeight, startW, targetW]);

  const timeProgress = useMemo(() => {
    if (!activePhase) return 0;
    const s = parseVnDate(activePhase.startDate);
    const e = parseVnDate(activePhase.endDate);
    const now = new Date();
    const total = e.getTime() - s.getTime();
    if (total <= 0) return 0;
    const elapsed = now.getTime() - s.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [activePhase]);

  const daysRemaining = useMemo(() => {
    if (!activePhase?.endDate) return 0;
    const e = parseVnDate(activePhase.endDate);
    const eMs = e.getTime();
    if (!Number.isFinite(eMs)) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const diff = Math.round((e.getTime() - now.getTime()) / 864e5);
    return Math.max(0, Number.isFinite(diff) ? diff : 0);
  }, [activePhase]);

  const filteredPhases = useMemo(() => {
    return phases.filter((p) => {
      const status = getPhaseStatus(p, activeRoadmap?.activePhaseId);
      if (phaseFilter === 'current') return status === 'current';
      if (phaseFilter === 'completed') return status === 'completed';
      if (phaseFilter === 'upcoming') return status === 'upcoming';
      if (phaseFilter === 'bulk') return p.phaseType === 'bulk';
      if (phaseFilter === 'cut') return p.phaseType === 'cut' || p.phaseType === 'minicut' || p.phaseType === 'final_cut';
      return true;
    });
  }, [phases, phaseFilter, activeRoadmap?.activePhaseId]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Applied Banner Toast */}
      {appliedBanner && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-200 flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm text-white">Cập nhật thành công!</div>
            <div className="mt-0.5 text-emerald-200/90 leading-relaxed">{appliedBanner}</div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('training')}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                <span>Chuyển Sang Xem Giáo Án Buổi Tập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top View Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#0b101b] border border-white/10 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveViewMode('ctg_periodized')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeViewMode === 'ctg_periodized'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lộ Trình Chu Kỳ CTG</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {phases.length} Giai Đoạn
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewMode('saved_roadmaps')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeViewMode === 'saved_roadmaps'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Lộ Trình Đã Tạo</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {allSavedCtgRoadmaps.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewMode('single_analyzer')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeViewMode === 'single_analyzer'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Phân Tích AI VortexCal Đơn Lẻ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewMode('saved_milestones')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeViewMode === 'saved_milestones'
              ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Mốc Đã Lưu ({savedRoadmaps.length})</span>
        </button>
      </div>

      {/* VIEW 1: CTG MASTER PERIODIZED ROADMAP */}
      {activeViewMode === 'ctg_periodized' && (!activeRoadmap || phases.length === 0) && (
        <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-8 sm:p-12 text-center shadow-xl space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
            <Layers className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-bold text-white">Chưa Có Lộ Trình Nào Đang Kích Hoạt</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Bạn chưa có lộ trình chu kỳ nào hoặc vừa xóa bỏ lộ trình cũ. Hãy chọn một cách dưới đây để thiết lập hành trình chuyển hóa hình thể:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2 text-left">
            {/* Option 1: Tạo tự động theo thể trạng */}
            <div
              onClick={() => {
                setGenMode('auto');
                setGenHeight(String(profile.heightCm || 172));
                setGenWeight(String(currentWeight || 68));
                setGenBodyFat(String(currentBf || 18));
                setGenSex(profile.sex || 'male');
                setShowGeneratorModal(true);
              }}
              className="p-5 rounded-2xl bg-linear-to-b from-blue-900/30 to-blue-950/20 border border-blue-500/30 hover:border-blue-500/60 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Wand2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">
                  ⚡ Tự Động Theo Thể Trạng (AI)
                </h4>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Thuật toán tự động tính toán chu kỳ Tăng cơ &amp; Mini-cut khoa học tối ưu riêng theo Chiều cao, Cân nặng và FFMI của bạn.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs text-blue-400 font-bold">
                <span>Tạo tự động ngay</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Option 2: Tạo lộ trình thủ công trống */}
            <div
              onClick={() => {
                setGenMode('blank');
                setBlankTitle('Lộ Trình Thể Hình Mới');
                setShowGeneratorModal(true);
              }}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                  📝 Tạo Thủ Công (Trống)
                </h4>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Tạo lộ trình trắng từ con số 0 và tự do thêm từng giai đoạn theo kế hoạch riêng của bạn hoặc huấn luyện viên.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <span>Tạo lộ trình trống</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Option 3: Khôi phục mẫu 17 giai đoạn chuẩn */}
            <div
              onClick={handleResetToSeedRoadmap}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                  ↺ Nạp Mẫu Chuẩn (17 Giai Đoạn)
                </h4>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Lộ trình mẫu chuẩn CTG 17 giai đoạn (2026 – 2029) từ 63.55kg lên 81.23kg cực đại cơ bắp tự nhiên.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <span>Nạp mẫu chuẩn</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Nếu có lộ trình đã lưu trong danh sách */}
          {savedCtgRoadmaps.length > 0 && (
            <div className="pt-4 border-t border-white/10 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setActiveViewMode('saved_roadmaps')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span>Xem danh sách các lộ trình đã lưu ({allSavedCtgRoadmaps.length})</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: ACTIVE CTG MASTER PERIODIZED ROADMAP (KHI CÓ GIAI ĐOẠN) */}
      {activeViewMode === 'ctg_periodized' && activeRoadmap && phases.length > 0 && (
        <div className="space-y-5 animate-fadeIn">
          {/* 1. TỔNG QUAN HÀNH TRÌNH CHUYỂN HÓA & CÔNG CỤ */}
          <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-extrabold text-xl tracking-tight text-white">
                    {activeRoadmap.title || 'Lộ Trình Chu Kỳ CTG'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {phases.length} Giai Đoạn · {firstPhase?.startDate} – {lastPhase?.endDate}
                  </span>
                  {activeRoadmap.heightCm && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white/70">
                      {activeRoadmap.heightCm}cm · {activeRoadmap.initialWeightKg}kg
                    </span>
                  )}
                </div>

                {/* Thanh hành trình chuyển hóa trực quan */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/70">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 font-mono">
                    <span className="text-white/40 text-[10px] uppercase font-sans">Xuất phát:</span>
                    <span className="text-white font-bold">{firstPhase?.startWeightKg}kg</span>
                    <span className="text-white/50">({firstPhase?.startBodyFatPct}%)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 font-mono">
                    <span className="text-blue-400 text-[10px] uppercase font-sans font-bold">Đích đến:</span>
                    <span className="text-blue-300 font-bold">{lastPhase?.targetWeightKg}kg</span>
                    <span className="text-blue-300/70">({lastPhase?.targetBodyFatPct}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-mono text-emerald-300 font-bold">
                    <span>+{totalLbmGain >= 0 ? totalLbmGain : 0}kg Cơ nạc</span>
                    <span className="text-emerald-300/60 font-normal">· FFMI {lastPhase?.targetFfmi}</span>
                  </div>
                </div>
              </div>

              {/* Thanh công cụ thao tác */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('saved_roadmaps')}
                  className="px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Xem danh sách tất cả các lộ trình đã tạo trong thư viện"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>📁 Lộ Trình Đã Tạo ({allSavedCtgRoadmaps.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGenMode('auto');
                    setGenHeight(String(profile.heightCm || 172));
                    setGenWeight(String(currentWeight || 68));
                    setGenBodyFat(String(currentBf || 18));
                    setGenSex(profile.sex || 'male');
                    setShowGeneratorModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>⚡ Tạo Lộ Trình Mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewStartWeight(String(currentWeight));
                    setNewTargetWeight(String(Math.round((currentWeight + (isBulkPhase ? 4 : -3)) * 10) / 10));
                    setNewStartBf(String(currentBf));
                    setNewTargetBf(String(Math.round((currentBf + (isBulkPhase ? 1.5 : -2)) * 10) / 10));
                    setShowAddPhaseModal(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Thêm 1 Giai Đoạn</span>
                </button>

                {/* XÓA BỎ LỘ TRÌNH */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Xóa bỏ hoàn toàn lộ trình hiện tại"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Lộ Trình</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyRoadmapSummary}
                  className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Sao chép toàn bộ lộ trình ra văn bản tóm tắt để lưu trữ hoặc gửi huấn luyện viên"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sao Chép Tóm Tắt</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToSeedRoadmap}
                  className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                  title="Khôi phục lộ trình 17 giai đoạn chuẩn"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Mẫu chuẩn</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. GIAI ĐOẠN ĐANG THEO DÕI (LIVE MILESTONE TRACKING) */}
          {activePhase && (
            <div className="rounded-3xl border border-blue-500/40 bg-linear-to-b from-[#10192e] to-[#0b101b] p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Giai Đoạn Đang Theo Dõi
                      </span>
                      <span className="text-xs text-white/50 font-mono">
                        {activePhase.startDate} – {activePhase.endDate}
                      </span>
                      <span className="text-[11px] text-amber-400 font-semibold">
                        (Còn ~{daysRemaining} ngày)
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-white mt-0.5">
                      {activePhase.name}
                      {!activePhase.name.toLowerCase().includes('tăng cơ') &&
                        !activePhase.name.toLowerCase().includes('giảm mỡ') &&
                        !activePhase.name.toLowerCase().includes('mini-cut') && (
                          <span className="text-xs font-normal text-white/50 ml-2">
                            ({activePhase.phaseType === 'bulk' ? 'Tăng cơ' : activePhase.phaseType === 'minicut' ? 'Mini-cut' : activePhase.phaseType === 'cut' ? 'Giảm mỡ' : 'Hoàn thiện'})
                          </span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLiveTrackingCollapsed((v) => !v)}
                    className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                    title={isLiveTrackingCollapsed ? "Mở rộng thẻ này" : "Thu gọn thẻ này"}
                  >
                    {isLiveTrackingCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsed Preview or Full 3-Column Stats */}
              {!isLiveTrackingCollapsed && (
                <>
                  {/* 3 Cột chỉ số trực quan */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Cột 1: Cân nặng & Tiến độ */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40 uppercase font-bold text-[10px]">Cân Nặng Thực Tế</span>
                        <span className="font-bold font-mono text-blue-400">
                          {!isBulkPhase && currentWeight > startW
                            ? 'Chưa vào mốc đích'
                            : `${weightProgress}% mục tiêu`}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold text-white font-mono">{currentWeight}</span>
                        <span className="text-xs text-white/40">/ {activePhase.targetWeightKg} kg</span>
                        <span
                          className={`text-xs font-bold font-mono ml-auto ${
                            isBulkPhase
                              ? currentWeight >= targetW
                                ? 'text-emerald-400'
                                : 'text-blue-400'
                              : currentWeight <= targetW
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                          }`}
                        >
                          {isBulkPhase
                            ? currentWeight >= targetW
                              ? '✓ Đạt đích'
                              : `Cần +${Math.round((targetW - currentWeight) * 10) / 10} kg`
                            : currentWeight <= targetW
                              ? '✓ Đạt đích'
                              : `Cần -${Math.round((currentWeight - targetW) * 10) / 10} kg`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${weightProgress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-white/40 flex justify-between font-mono">
                        <span>Bắt đầu: {activePhase.startWeightKg}kg</span>
                        <span>Đích: {activePhase.targetWeightKg}kg</span>
                      </div>
                    </div>

                    {/* Cột 2: Mỡ & Khối Nạc */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40 uppercase font-bold text-[10px]">Mỡ &amp; Khối Nạc (LBM)</span>
                        <span className="font-mono text-xs text-orange-400 font-bold">{currentBf}% mỡ</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-indigo-300 font-mono">{currentLbm}</span>
                        <span className="text-xs text-white/40">kg LBM</span>
                        <span className="text-xs font-mono font-bold text-emerald-400 ml-auto">FFMI {currentFfmi}</span>
                      </div>
                      <div className="text-[11px] text-white/60 pt-1 border-t border-white/5 flex justify-between">
                        <span>Mục tiêu mỡ: <strong className="text-orange-300">{activePhase.targetBodyFatPct}%</strong></span>
                        <span>Đích nạc: <strong className="text-indigo-300">{activePhase.targetLbmKg}kg</strong></span>
                        <span>Đích FFMI: <strong className="text-emerald-300">{activePhase.targetFfmi}</strong></span>
                      </div>
                    </div>

                    {/* Cột 3: Dinh Dưỡng Giai Đoạn */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40 uppercase font-bold text-[10px]">Dinh Dưỡng Mỗi Ngày</span>
                        <span className="font-mono text-sm font-extrabold text-white">
                          {activePhase.targetKcal.toLocaleString('vi-VN')} kcal
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
                        <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 font-mono font-bold">
                          <div className="text-[9px] uppercase font-sans text-rose-300/80">Đạm</div>
                          {activePhase.macros.protein}g
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 font-mono font-bold">
                          <div className="text-[9px] uppercase font-sans text-amber-300/80">Carb</div>
                          {activePhase.macros.carbs}g
                        </div>
                        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono font-bold">
                          <div className="text-[9px] uppercase font-sans text-emerald-300/80">Fat</div>
                          {activePhase.macros.fat}g
                        </div>
                      </div>
                      {activePhase.note && (
                        <p className="text-[10px] text-white/50 italic line-clamp-1">
                          💡 {activePhase.note}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. DÒNG THỜI GIAN LỘ TRÌNH (SEQUENTIAL PIPELINE TIMELINE - 1 CỘT TUẦN TỰ) */}
          <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Dòng Thời Gian Lộ Trình ({phases.length} Giai Đoạn)
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Trình tự các chu kỳ sóng từ điểm xuất phát đến khi đạt cực đại cơ bắp tự nhiên
                </p>
              </div>

              {/* Filter chips tinh gọn */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all' as const, label: `Tất cả (${phases.length})` },
                  { id: 'current' as const, label: 'Đang diễn ra' },
                  { id: 'completed' as const, label: 'Đã hoàn thành' },
                  { id: 'upcoming' as const, label: 'Sắp tới' },
                  { id: 'bulk' as const, label: 'Tăng cơ' },
                  { id: 'cut' as const, label: 'Mini-cut/Giảm mỡ' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPhaseFilter(f.id)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border ${
                      phaseFilter === f.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Macrocycle Visual Stepper & Overview Bar (Chuẩn CTG Web) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">
                    Tiến độ toàn chu kỳ:
                  </span>
                  <span className="font-bold text-white">
                    {completedPhasesCount} / {phases.length} giai đoạn hoàn thành ({macrocyclePercent}%)
                  </span>
                </div>
                <div className="text-[11px] font-mono text-white/50 flex items-center gap-2">
                  <span className="text-blue-300 font-bold">{bulkPhasesCount} đợt Tăng cơ</span>
                  <span>·</span>
                  <span className="text-amber-300 font-bold">{cutPhasesCount} đợt Mini-cut / Giảm mỡ</span>
                </div>
              </div>

              {/* Progress Bar Line */}
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${macrocyclePercent}%` }}
                />
              </div>

              {/* Interactive Phase Stepper Pills (Scrollable) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                {phases.map((p, idx) => {
                  const status = getPhaseStatus(p, activeRoadmap?.activePhaseId);
                  const isCur = status === 'current';
                  const isDone = status === 'completed';
                  const shortName = p.name.includes('Tăng cơ')
                    ? 'Tăng cơ'
                    : p.name.includes('Mini-cut')
                    ? 'Mini-cut'
                    : p.name.includes('Giảm mỡ')
                    ? 'Giảm mỡ'
                    : p.name;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`phase-card-${p.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      title={`#${idx + 1}: ${p.name} (${p.startDate} – ${p.endDate}) · ${p.startWeightKg}kg → ${p.targetWeightKg}kg · ${p.targetKcal} kcal`}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-semibold shrink-0 transition-all cursor-pointer border flex items-center gap-1 ${
                        isCur
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30 ring-2 ring-blue-400 font-bold scale-105'
                          : isDone
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-black/30 text-white/50 border-white/5 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span>#{idx + 1}</span>
                      <span className="hidden sm:inline font-sans text-[10px]">{shortName}</span>
                      {isDone && <span className="text-emerald-400">✓</span>}
                      {isCur && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTG PHASES LIST (BÓC TÁCH CHUẨN CTG WEB) */}
            <div className="space-y-4">
              {filteredPhases.map((phase) => {
                const status = getPhaseStatus(phase, activeRoadmap?.activePhaseId);
                const isCurrent = status === 'current';
                const isCompleted = status === 'completed';
                const realIndex = phases.findIndex((p) => p.id === phase.id) + 1;
                const formattedIdx = String(realIndex).padStart(2, '0');

                return (
                  <div
                    key={phase.id}
                    id={`phase-card-${phase.id}`}
                    className={`rounded-3xl border transition-all p-5 space-y-4 ${
                      isCurrent
                        ? 'bg-linear-to-b from-[#111c38] to-[#0c1326] border-blue-500/80 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/40'
                        : isCompleted
                        ? 'bg-[#0b101b]/80 border-white/5 opacity-85 hover:opacity-100'
                        : 'bg-[#0b101b] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header: Phase Name, Date, Current Phase Badge & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-xs font-mono font-bold text-white/40">
                            #{formattedIdx}
                          </span>
                          <h4 className="text-lg font-black text-white tracking-tight">
                            {phase.name}
                          </h4>
                          {isCurrent ? (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-500 text-white shadow-xs">
                              Giai đoạn hiện tại
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCurrentPhase(phase.id)}
                              className="px-3 py-0.5 rounded-full text-[11px] font-semibold text-white/60 hover:text-blue-300 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/40 transition-all cursor-pointer"
                            >
                              Đặt làm giai đoạn hiện tại
                            </button>
                          )}
                          {isCompleted && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ Đã xong
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-white/50 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-white/40" />
                          <span>{phase.startDate} – {phase.endDate}</span>
                        </div>
                      </div>

                      {/* Right Actions: Sửa, Xóa */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setEditingPhase({ ...phase })}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                          title="Sửa thông số giai đoạn này"
                        >
                          <Edit3 className="w-4 h-4 text-amber-400" />
                        </button>
                        {phases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhase(phase.id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Xóa giai đoạn này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4 Thẻ chỉ số Thể Trạng chuẩn CTG Web */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <div className="text-[11px] text-white/50 font-medium">Cân nặng</div>
                        <div className="text-base sm:text-lg font-bold font-mono text-white">
                          {phase.startWeightKg} → {phase.targetWeightKg} kg
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <div className="text-[11px] text-orange-400/80 font-medium">Mỡ cơ thể</div>
                        <div className="text-base sm:text-lg font-bold font-mono text-orange-300">
                          {phase.startBodyFatPct} → {phase.targetBodyFatPct} %
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <div className="text-[11px] text-indigo-400/80 font-medium">Khối nạc</div>
                        <div className="text-base sm:text-lg font-bold font-mono text-indigo-300">
                          {phase.startLbmKg} → {phase.targetLbmKg} kg
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <div className="text-[11px] text-emerald-400/80 font-medium">FFMI</div>
                        <div className="text-base sm:text-lg font-bold font-mono text-emerald-300">
                          {phase.startFfmi} → {phase.targetFfmi}
                        </div>
                      </div>
                    </div>

                    {/* Dinh dưỡng đã lưu cho giai đoạn (Chuẩn CTG Web) */}
                    <div className="p-4 rounded-2xl bg-black/35 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                          Dinh dưỡng đã lưu cho giai đoạn
                        </div>
                        <div className="text-xl font-extrabold font-mono text-white">
                          {phase.targetKcal.toLocaleString('vi-VN')} kcal
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
                        <div className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 font-bold">
                          <span className="font-sans text-[10px] text-rose-300/70 mr-1.5 uppercase font-normal">Đạm</span>
                          <span className="text-sm">{phase.macros.protein} g</span>
                        </div>
                        <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 font-bold">
                          <span className="font-sans text-[10px] text-amber-300/70 mr-1.5 uppercase font-normal">Tinh bột</span>
                          <span className="text-sm">{phase.macros.carbs} g</span>
                        </div>
                        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-bold">
                          <span className="font-sans text-[10px] text-emerald-300/70 mr-1.5 uppercase font-normal">Chất béo</span>
                          <span className="text-sm">{phase.macros.fat} g</span>
                        </div>
                      </div>
                    </div>

                    {phase.note && (
                      <div className="text-[11px] text-white/50 italic flex items-center gap-1.5 pt-0.5">
                        <span>💡</span>
                        <span>{phase.note}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PHASE DETAIL MODAL */}
          {selectedPhase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
              <div className="bg-[#101726] border border-white/20 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {selectedPhase.name}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">
                      Chi Tiết Giai Đoạn ({selectedPhase.startDate} – {selectedPhase.endDate})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPhase(null)}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Targets breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Mục Tiêu Thể Trạng</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-white/40 block">Cân nặng</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {selectedPhase.startWeightKg} kg → {selectedPhase.targetWeightKg} kg
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-white/40 block">Mỡ cơ thể</span>
                      <span className="font-mono font-bold text-orange-400 text-sm">
                        {selectedPhase.startBodyFatPct}% → {selectedPhase.targetBodyFatPct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-white/40 block">Khối nạc LBM</span>
                      <span className="font-mono font-bold text-indigo-400 text-sm">
                        {selectedPhase.startLbmKg} kg → {selectedPhase.targetLbmKg} kg
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-white/40 block">FFMI</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {selectedPhase.startFfmi} → {selectedPhase.targetFfmi}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nutrition breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Dinh Dưỡng Thiết Lập</h4>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/70">Tổng năng lượng:</span>
                      <span className="text-base font-extrabold text-white font-mono">
                        {selectedPhase.targetKcal.toLocaleString('vi-VN')} kcal/ngày
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-white/5">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-300">
                        <div className="text-[9px] uppercase font-bold">Đạm (Protein)</div>
                        <div className="font-mono font-bold mt-0.5">{selectedPhase.macros.protein}g</div>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300">
                        <div className="text-[9px] uppercase font-bold">Tinh bột (Carb)</div>
                        <div className="font-mono font-bold mt-0.5">{selectedPhase.macros.carbs}g</div>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
                        <div className="text-[9px] uppercase font-bold">Chất béo (Fat)</div>
                        <div className="font-mono font-bold mt-0.5">{selectedPhase.macros.fat}g</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPhase({ ...selectedPhase });
                      setSelectedPhase(null);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa giai đoạn</span>
                  </button>
                  {activeRoadmap?.activePhaseId === selectedPhase.id ? (
                    <span className="px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      <span>✓ Giai đoạn đang thực hiện</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleSetCurrentPhase(selectedPhase.id);
                        setSelectedPhase(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đặt làm giai đoạn hiện tại</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: DANH SÁCH TẤT CẢ LỘ TRÌNH ĐÃ TẠO (ALL CREATED ROADMAPS) */}
      {activeViewMode === 'saved_roadmaps' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header Bar */}
          <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <span>Lộ Trình Đã Tạo</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {allSavedCtgRoadmaps.length} Lộ Trình
                    </span>
                  </h3>
                  <p className="text-xs text-white/50">
                    Xem lại, so sánh mục tiêu, kích hoạt hoặc quản lý tất cả các lộ trình chu kỳ đã thiết lập
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGenMode('auto');
                  setGenHeight(String(profile.heightCm || 172));
                  setGenWeight(String(currentWeight || 68));
                  setGenBodyFat(String(currentBf || 18));
                  setGenSex(profile.sex || 'male');
                  setShowGeneratorModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>+ Tạo Lộ Trình Mới</span>
              </button>

              <button
                type="button"
                onClick={handleResetToSeedRoadmap}
                className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Khôi phục hoặc thêm mẫu chuẩn 17 giai đoạn"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>↺ Nạp Mẫu Chuẩn</span>
              </button>
            </div>
          </div>

          {/* Empty State */}
          {allSavedCtgRoadmaps.length === 0 ? (
            <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-12 text-center shadow-xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 text-white/40 mx-auto flex items-center justify-center">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Chưa Có Lộ Trình Nào Trong Thư Viện</h4>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  Bạn có thể tạo tự động theo thể trạng hoặc nạp mẫu 17 giai đoạn chuẩn để bắt đầu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGenMode('auto');
                  setShowGeneratorModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                ⚡ Tạo Lộ Trình Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {allSavedCtgRoadmaps.map((rm, idx) => {
                const isActive = activeRoadmap?.id === rm.id;
                const rmPhases = rm.phases || [];
                const firstP = rmPhases[0];
                const lastP = rmPhases[rmPhases.length - 1];
                const isExpanded = expandedRoadmapId === rm.id;
                const totalLbm =
                  firstP && lastP
                    ? Math.round((lastP.targetLbmKg - firstP.startLbmKg) * 10) / 10
                    : 0;

                return (
                  <div
                    key={rm.id || idx}
                    className={`rounded-3xl border transition-all p-5 sm:p-6 space-y-4 ${
                      isActive
                        ? 'bg-linear-to-b from-[#111c38] to-[#0c1326] border-blue-500/80 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/40'
                        : 'bg-[#0b101b] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header: Title, Active Badge, Date span, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h4 className="text-lg font-black text-white tracking-tight">
                            {rm.title || `Lộ Trình Chu Kỳ #${idx + 1}`}
                          </h4>
                          {isActive ? (
                            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Đang Sử Dụng</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/60">
                              Lộ Trình Đã Lưu
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {rmPhases.length} Giai Đoạn
                          </span>
                        </div>
                        <div className="text-xs font-mono text-white/50 flex flex-wrap items-center gap-2">
                          {firstP && lastP && (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-white/40" />
                              <span>
                                {firstP.startDate} – {lastP.endDate}
                              </span>
                              <span>·</span>
                            </>
                          )}
                          {rm.heightCm && (
                            <span>
                              Thể trạng gốc: {rm.heightCm}cm / {rm.initialWeightKg}kg ({rm.initialBodyFatPct}% mỡ)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right action buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={() => setActiveViewMode('ctg_periodized')}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <span>Xem Chi Tiết Mốc</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSwitchRoadmap(rm)}
                            className="px-3.5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Kích Hoạt Lộ Trình Này</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedRoadmapId(isExpanded ? null : rm.id)}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          <span>{isExpanded ? 'Ẩn Giai Đoạn' : `Xem ${rmPhases.length} Giai Đoạn`}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => setRoadmapToDelete(rm)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Xóa lộ trình này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 4 Metric Summary Cards */}
                    {firstP && lastP && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                          <div className="text-[11px] text-white/50 font-medium">Xuất phát</div>
                          <div className="text-base font-bold font-mono text-white">
                            {firstP.startWeightKg} kg
                            <span className="text-xs text-white/50 ml-1.5 font-normal">
                              ({firstP.startBodyFatPct}%)
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                          <div className="text-[11px] text-blue-400/80 font-medium">Đích đến cuối</div>
                          <div className="text-base font-bold font-mono text-blue-300">
                            {lastP.targetWeightKg} kg
                            <span className="text-xs text-blue-300/60 ml-1.5 font-normal">
                              ({lastP.targetBodyFatPct}%)
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                          <div className="text-[11px] text-emerald-400/80 font-medium">Tiềm năng cơ nạc</div>
                          <div className="text-base font-bold font-mono text-emerald-300">
                            +{totalLbm > 0 ? totalLbm : 0} kg nạc
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                          <div className="text-[11px] text-purple-400/80 font-medium">FFMI đỉnh cao</div>
                          <div className="text-base font-bold font-mono text-purple-300">
                            {lastP.targetFfmi || rm.targetFfmi || '22.0'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Accordion Preview of all phases */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-white/5 space-y-2 animate-fadeIn">
                        <div className="text-xs font-bold text-white/70 flex items-center justify-between pb-1">
                          <span>Chi tiết các giai đoạn trong lộ trình:</span>
                          <span className="text-[11px] text-white/40">
                            {rmPhases.length} giai đoạn tuần tự
                          </span>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {rmPhases.map((p, pIdx) => (
                            <div
                              key={p.id || pIdx}
                              className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-white/40 font-bold">
                                    #{String(pIdx + 1).padStart(2, '0')}
                                  </span>
                                  <span className="font-bold text-white">{p.name}</span>
                                  <span className="text-[10px] font-mono text-white/50">
                                    {p.startDate} – {p.endDate}
                                  </span>
                                </div>
                                <div className="text-[11px] text-white/60 flex items-center gap-3 font-mono">
                                  <span>
                                    Cân nặng:{' '}
                                    <strong className="text-white">
                                      {p.startWeightKg} → {p.targetWeightKg}kg
                                    </strong>
                                  </span>
                                  <span>
                                    Mỡ:{' '}
                                    <strong className="text-orange-300">
                                      {p.startBodyFatPct}% → {p.targetBodyFatPct}%
                                    </strong>
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                                <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 font-bold">
                                  {p.targetKcal} kcal
                                </span>
                                <span className="text-white/40">
                                  {p.macros.protein}P / {p.macros.carbs}C / {p.macros.fat}F
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SINGLE SNAPSHOT ANALYZER (VORTEXCAL) */}
      {activeViewMode === 'single_analyzer' && (
        <div className="space-y-6 animate-fadeIn">
      {/* VortexCal Header Banner */}
      <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                VortexCal<span className="text-[#2563EB]">.</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30">
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleApplyRoadmap}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Lưu vào hồ sơ sức khỏe</span>
            </button>
            <button
              type="button"
              onClick={handleApplyRoadmapAndCreateSplit}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-orange-500/30"
            >
              <Zap className="w-4 h-4" />
              <span>⚡ Tạo Lộ Trình & Giáo Án Từ Phân Tích</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Input Form on Left, Diagnostic Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 5 Columns */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#131b2e] rounded-2xl border border-white/10 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#2563EB]" />
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
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
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
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
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
                    className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-[#2563EB] focus:outline-none"
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
                    className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              {/* Bodyfat % */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase text-white/50 block">
                    Tỷ lệ mỡ Bodyfat (%)
                  </label>
                  <span className="text-[9px] text-[#2563EB] font-bold">Ước tính / InBody</span>
                </div>
                <input
                  type="number"
                  min="3"
                  max="70"
                  step="0.1"
                  value={bodyfatPct}
                  onChange={(e) => setBodyfatPct(e.target.value)}
                  className="mt-1 w-full text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-[#0e0f11] text-white focus:border-[#2563EB] focus:outline-none"
                />
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
                          ? 'border-[#2563EB] bg-[#2563EB]/10 text-white'
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
                          className="accent-[#2563EB]"
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
          <div className="bg-[#131b2e] rounded-2xl border border-white/10 p-4 shadow-xs space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#2563EB]" />
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
                <span className="text-[10px] text-white/40">Đỉnh tự nhiên: {VORTEXCAL_STANDARDS[sexKey].naturalFfmiLimit}</span>
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
          <div className="bg-[#131b2e] rounded-2xl border border-white/10 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                Kết Quả Chẩn Đoán & Định Lượng Thể Trạng
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563EB]/20 text-[#2563EB] font-bold">
                VortexCal AI Verified
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

            {/* Extra Row: Fat Mass & Lean Mass */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="text-white/60 text-[11px]">Tổng lượng mỡ (BFM):</span>
                <span className="font-mono font-bold text-orange-400">{analysis.bfmKg} kg</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <span className="text-white/60 text-[11px]">Khối lượng cơ nạc (LBM):</span>
                <span className="font-mono font-bold text-emerald-400">{analysis.lbmKg} kg</span>
              </div>
            </div>
          </div>

          {/* Strategic Roadmap Recommendation Box */}
          <div className="bg-[#131b2e] rounded-2xl border border-white/10 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-white">
                  Định Hướng Chiến Lược: {analysis.planLabelVi}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#2563EB] text-white">
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
                <div className="text-base font-extrabold text-[#2563EB] font-mono mt-0.5">
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
                <div className="text-[10px] text-white/40">Ngưỡng chuẩn VortexCal</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-semibold text-white/40">Mục tiêu Calo/ngày</div>
                <div className="text-base font-extrabold text-indigo-400 font-mono mt-0.5">
                  {analysis.targetKcal} kcal
                </div>
                <div className="text-[10px] text-white/40">Theo TDEE hiện tại</div>
              </div>
            </div>

            {/* Advanced Macro Studio Customizer */}
            <div className="p-4 rounded-2xl bg-[#0e0f11] border border-white/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-[#2563EB]" />
                    <span className="font-bold text-white text-xs">Căn Chỉnh Tỉ Lệ Đa Lượng Macro</span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Tùy biến theo thể trạng, phương pháp ăn hoặc chọn nhanh cấu hình chuẩn
                  </p>
                </div>

                {/* Energy balance check */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[10px] text-white/50">Năng lượng:</span>
                  <span className="text-xs font-mono font-bold text-white">{customMacroKcal} kcal</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    Math.abs(customMacroKcal - analysis.targetKcal) <= 50
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : customMacroKcal > analysis.targetKcal
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {customMacroKcal >= analysis.targetKcal ? `+${customMacroKcal - analysis.targetKcal}` : `${customMacroKcal - analysis.targetKcal}`}
                  </span>
                </div>
              </div>

              {/* Macro Presets Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'viet_balanced' as const, label: 'Chuẩn Việt (30/45/25)', desc: 'Cơm canh thịt cá' },
                  { id: 'high_protein' as const, label: 'Tăng Cơ (2.2g/kg)', desc: 'Tối đa cơ nạc' },
                  { id: 'cutting' as const, label: 'Siết Mỡ (2.4g/kg)', desc: 'Thâm hụt giữ cơ' },
                  { id: 'low_carb' as const, label: 'Low Carb (25/10/65)', desc: 'Ít tinh bột' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectMacroPreset(p.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      macroPreset === p.id
                        ? 'bg-[#2563EB]/15 border-[#2563EB] text-white'
                        : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{p.label}</div>
                    <div className="text-[9px] text-white/40">{p.desc}</div>
                  </button>
                ))}
              </div>

              {/* 3 Interactive Macro Cards & Sliders */}
              <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
                {/* Protein */}
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">Đạm (Protein)</span>
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min="40"
                      max="350"
                      value={currentActiveMacros.protein}
                      onChange={(e) => {
                        setIsCustomMacroActive(true);
                        setMacroPreset('custom');
                        setCustomProtein(Number(e.target.value) || 0);
                      }}
                      className="w-16 text-center text-sm font-bold text-white bg-slate-100 dark:bg-slate-800/60 border border-rose-500/30 rounded-lg py-0.5 font-mono"
                    />
                    <span className="text-xs text-white/60">g</span>
                  </div>
                  <span className="text-[10px] text-rose-300/80 block font-mono">
                    ~{(currentActiveMacros.protein / wNum).toFixed(1)}g/kg ({currentActiveMacros.protein * 4} kcal)
                  </span>
                  <input
                    type="range"
                    min="50"
                    max="280"
                    step="5"
                    value={currentActiveMacros.protein}
                    onChange={(e) => {
                      setIsCustomMacroActive(true);
                      setMacroPreset('custom');
                      setCustomProtein(Number(e.target.value));
                    }}
                    className="w-full h-1.5 bg-rose-950/60 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Carbs */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Tinh Bột (Carbs)</span>
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={currentActiveMacros.carbs}
                      onChange={(e) => {
                        setIsCustomMacroActive(true);
                        setMacroPreset('custom');
                        setCustomCarbs(Number(e.target.value) || 0);
                      }}
                      className="w-16 text-center text-sm font-bold text-white bg-slate-100 dark:bg-slate-800/60 border border-amber-500/30 rounded-lg py-0.5 font-mono"
                    />
                    <span className="text-xs text-white/60">g</span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 block font-mono">
                    {Math.round(((currentActiveMacros.carbs * 4) / customMacroKcal) * 100) || 0}% calo ({currentActiveMacros.carbs * 4} kcal)
                  </span>
                  <input
                    type="range"
                    min="20"
                    max="450"
                    step="5"
                    value={currentActiveMacros.carbs}
                    onChange={(e) => {
                      setIsCustomMacroActive(true);
                      setMacroPreset('custom');
                      setCustomCarbs(Number(e.target.value));
                    }}
                    className="w-full h-1.5 bg-amber-950/60 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Fat */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Chất Béo (Fat)</span>
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      min="15"
                      max="200"
                      value={currentActiveMacros.fat}
                      onChange={(e) => {
                        setIsCustomMacroActive(true);
                        setMacroPreset('custom');
                        setCustomFat(Number(e.target.value) || 0);
                      }}
                      className="w-16 text-center text-sm font-bold text-white bg-slate-100 dark:bg-slate-800/60 border border-emerald-500/30 rounded-lg py-0.5 font-mono"
                    />
                    <span className="text-xs text-white/60">g</span>
                  </div>
                  <span className="text-[10px] text-emerald-300/80 block font-mono">
                    {Math.round(((currentActiveMacros.fat * 9) / customMacroKcal) * 100) || 0}% calo ({currentActiveMacros.fat * 9} kcal)
                  </span>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    step="2"
                    value={currentActiveMacros.fat}
                    onChange={(e) => {
                      setIsCustomMacroActive(true);
                      setMacroPreset('custom');
                      setCustomFat(Number(e.target.value));
                    }}
                    className="w-full h-1.5 bg-emerald-950/60 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              {/* Sync Macro Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-white/40">
                  Tự động chia thành mục tiêu từng bữa ăn (Sáng, Trưa, Tối, Phụ)
                </span>
                <button
                  type="button"
                  onClick={handleApplyMacroToNutrition}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Utensils className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Đồng bộ Macro vào Dinh Dưỡng</span>
                </button>
              </div>
            </div>

            {/* Apply & Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaveTitle(`Lộ trình ${analysis.planLabelVi} (${analysis.projectedWeightKg}kg / ${analysis.projectedBodyfatPct}% mỡ)`);
                  setSaveNote(`Mục tiêu Calo: ${analysis.targetKcal} kcal. Macro: ${currentActiveMacros.protein}P / ${currentActiveMacros.carbs}C / ${currentActiveMacros.fat}F.`);
                  setShowSaveModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>Lưu Mốc Định Hướng Này</span>
              </button>

              <button
                type="button"
                onClick={handleApplyRoadmap}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Chỉ Lưu Hồ Sơ</span>
              </button>

              <button
                type="button"
                onClick={handleApplyRoadmapAndCreateSplit}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>⚡ Kích Hoạt Lộ Trình & Khởi Tạo Giáo Án</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Phase Mesocycle Periodization Roadmap */}
      <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Chu Kỳ Phân Kỳ Huấn Luyện 12 Tuần (Mesocycle Periodization)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Chuẩn Khoa Học
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Quy luật tăng tải luân phiên giúp cơ bắp phá vỡ ngưỡng chững (Plateau) và liên tục phát triển bền vững
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyRoadmapAndCreateSplit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-orange-400 text-xs font-bold transition-colors cursor-pointer border border-orange-500/30"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Đồng bộ ngay vào lịch tập</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 pt-1">
          {MESOCYCLE_PHASES.map((p) => (
            <div
              key={p.phase}
              className="p-4 rounded-2xl border border-white/10 bg-[#131b2e]/80 flex flex-col justify-between space-y-3 hover:border-orange-500/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono"
                    style={{ backgroundColor: `${p.color}22`, color: p.color }}
                  >
                    {p.durationWeeks}
                  </span>
                  <span className="text-[10px] font-bold text-white/40">GĐ {p.phase}</span>
                </div>

                <h4 className="text-xs font-bold text-white leading-snug">{p.nameVi}</h4>
                <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{p.descriptionVi}</p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5 text-[10px]">
                <div className="flex items-center justify-between text-white/70">
                  <span>Cường độ:</span>
                  <span className="font-bold font-mono text-white" style={{ color: p.color }}>
                    {p.intensityRpe}
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/70">
                  <span>Khối lượng/tuần:</span>
                  <span className="font-semibold text-white/90">{p.volumeTarget}</span>
                </div>
                <div className="flex items-center justify-between text-white/70">
                  <span>Khoảng Reps:</span>
                  <span className="font-mono text-amber-400">{p.repsRange}</span>
                </div>
                <div className="mt-1 p-2 rounded-lg bg-black/30 text-white/60 text-[10px] italic">
                  💡 {p.nutritionTipVi}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      )}

      {/* VIEW 3: SAVED ROADMAPS MILESTONE LEDGER */}
      {activeViewMode === 'saved_milestones' && (
      <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <BookmarkCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Thư Viện Định Hướng &amp; Mốc Mục Tiêu Đã Lưu
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {savedRoadmaps.length} mốc
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Lưu giữ các bản kế hoạch chiến lược để đối chiếu và tái kích hoạt bất kỳ lúc nào
              </p>
            </div>
          </div>
        </div>

        {savedRoadmaps.length === 0 ? (
          <div className="py-8 px-4 rounded-2xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center space-y-2">
            <Bookmark className="w-8 h-8 text-white/30" />
            <h4 className="text-xs font-bold text-white/80">Chưa có mốc định hướng nào được lưu</h4>
            <p className="text-[11px] text-white/40 max-w-md leading-relaxed">
              Bấm nút &quot;Lưu Mốc Định Hướng Này&quot; ở trên sau khi phân tích để lưu lại kế hoạch siết mỡ hoặc tăng cơ, giúp bạn theo dõi quá trình chuyển hóa cơ thể qua từng giai đoạn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {savedRoadmaps.map((rm) => (
              <div
                key={rm.id}
                className="p-4 rounded-2xl bg-[#131b2e] border border-white/10 space-y-3 flex flex-col justify-between hover:border-white/20 transition-all shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-white/40 block">{rm.date}</span>
                      <h4 className="text-xs font-bold text-white leading-tight mt-0.5">{rm.title}</h4>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                      rm.goal === 'cut'
                        ? 'bg-rose-500/20 text-rose-400'
                        : rm.goal === 'bulk'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {rm.goal === 'cut' ? 'Cắt mỡ' : rm.goal === 'bulk' ? 'Tăng cơ' : 'Duy trì'}
                    </span>
                  </div>

                  {/* Metrics preview */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-center font-mono">
                    <div>
                      <span className="text-[9px] text-white/40 block">Cân nặng</span>
                      <span className="text-xs font-bold text-white">{rm.weightKg} &rarr; {rm.targetWeightKg}kg</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 block">% Mỡ</span>
                      <span className="text-xs font-bold text-emerald-400">{rm.bodyfatPct}% &rarr; {rm.targetBodyfatPct}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 block">Calo/ngày</span>
                      <span className="text-xs font-bold text-indigo-400">{rm.targetKcal} kcal</span>
                    </div>
                  </div>

                  {/* Macro preview */}
                  <div className="flex items-center justify-between text-[10px] text-white/60 bg-white/5 px-2.5 py-1.5 rounded-lg">
                    <span>Macro:</span>
                    <span className="font-mono text-white/90">
                      <b className="text-rose-400">{rm.macros.protein}g P</b> · <b className="text-amber-400">{rm.macros.carbs}g C</b> · <b className="text-emerald-400">{rm.macros.fat}g F</b>
                    </span>
                  </div>

                  {rm.note && (
                    <p className="text-[11px] text-white/50 italic line-clamp-2 leading-relaxed">
                      {rm.note}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xóa mốc định hướng "${rm.title}"?`)) {
                        onDeleteSavedRoadmap?.(rm.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/5 cursor-pointer transition-colors"
                    title="Xóa mốc định hướng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadSavedRoadmap(rm)}
                    className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Kích Hoạt Lại</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Save Roadmap Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#131b2e] rounded-3xl border border-white/10 max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">Lưu Bản Định Hướng Chiến Lược</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoadmapSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-white/50 mb-1">
                  Tiêu đề mốc định hướng
                </label>
                <input
                  type="text"
                  required
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Ví dụ: Siết Mỡ 6 Tuần Đón Tết..."
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-white/15 bg-slate-100 dark:bg-slate-800/60 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Snapshot summary pill */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between text-white/70">
                  <span>Mục tiêu:</span>
                  <span className="font-bold text-[#2563EB]">{analysis.planLabelVi}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Cân nặng &amp; % Mỡ:</span>
                  <span className="font-mono text-white">{wNum}kg ({bfNum}%) &rarr; {analysis.projectedWeightKg}kg ({analysis.projectedBodyfatPct}%)</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>Năng lượng &amp; Macro:</span>
                  <span className="font-mono text-white">{analysis.targetKcal} kcal ({currentActiveMacros.protein}P/{currentActiveMacros.carbs}C/{currentActiveMacros.fat}F)</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-white/50 mb-1">
                  Ghi chú &amp; Chiến lược cá nhân
                </label>
                <textarea
                  rows={2}
                  value={saveNote}
                  onChange={(e) => setSaveNote(e.target.value)}
                  placeholder="Ví dụ: Giữ cardio 3 buổi/tuần, cắt calo chủ yếu từ bữa tối..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-white/15 bg-slate-100 dark:bg-slate-800/60 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-xs font-semibold text-white/70 hover:bg-white/5 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Định Hướng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATOR MODAL: TẠO ĐẠI LỘ TRÌNH CHU KỲ MỚI THEO SỐ ĐO (TỰ ĐỘNG HOẶC THỦ CÔNG) */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#101726] border border-white/20 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  {genMode === 'auto' ? <Wand2 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {genMode === 'auto' ? 'Tạo Đại Lộ Trình Chu Kỳ Tự Động' : 'Tạo Lộ Trình Thể Hình Thủ Công (Trống)'}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {genMode === 'auto'
                      ? 'Tự động tính chu kỳ Tăng Cơ & Mini-cut theo số đo cá nhân'
                      : 'Tạo lộ trình trắng từ con số 0 và thêm các giai đoạn tùy biến'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGeneratorModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setGenMode('auto')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  genMode === 'auto'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>⚡ Tự Động Theo Thể Trạng (AI)</span>
              </button>
              <button
                type="button"
                onClick={() => setGenMode('blank')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  genMode === 'blank'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>📝 Tạo Thủ Công (Trống)</span>
              </button>
            </div>

            {/* TAB 1: TỰ ĐỘNG THEO THỂ TRẠNG */}
            {genMode === 'auto' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerateNewRoadmap();
                }}
                className="space-y-4 text-xs"
              >
                {/* Giới tính */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-white/50 mb-1.5">Giới tính</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGenSex('male');
                        setGenTargetFfmi('22.0');
                      }}
                      className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer text-center ${
                        genSex === 'male'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      Nam (Male)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGenSex('female');
                        setGenTargetFfmi('19.5');
                      }}
                      className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer text-center ${
                        genSex === 'female'
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      Nữ (Female)
                    </button>
                  </div>
                </div>

                {/* Chiều cao, cân nặng, % mỡ */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Chiều cao (cm)</label>
                    <input
                      type="number"
                      required
                      min={120}
                      max={230}
                      value={genHeight}
                      onChange={(e) => setGenHeight(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Cân nặng (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min={30}
                      max={200}
                      value={genWeight}
                      onChange={(e) => setGenWeight(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">% Mỡ cơ thể</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min={5}
                      max={50}
                      value={genBodyFat}
                      onChange={(e) => setGenBodyFat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Mục tiêu FFMI & Ngày bắt đầu */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Mục tiêu FFMI</label>
                    <select
                      value={genTargetFfmi}
                      onChange={(e) => setGenTargetFfmi(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1a233a] border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {genSex === 'male' ? (
                        <>
                          <option value="20.0">20.0 - Săn chắc Thể thao</option>
                          <option value="21.0">21.0 - Cơ bắp Lực lưỡng</option>
                          <option value="22.0">22.0 - Đỉnh cao Tự nhiên (Khuyên dùng)</option>
                          <option value="23.0">23.0 - Đỉnh cao Vận động viên</option>
                        </>
                      ) : (
                        <>
                          <option value="17.5">17.5 - Thon gọn Săn chắc</option>
                          <option value="18.5">18.5 - Thể thao Athletic</option>
                          <option value="19.5">19.5 - Fitness Đỉnh cao (Khuyên dùng)</option>
                          <option value="20.5">20.5 - Vận động viên Nữ</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Ngày bắt đầu</label>
                    <input
                      type="text"
                      value={genStartDate}
                      onChange={(e) => setGenStartDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Dự phóng nhanh */}
                {(() => {
                  const hM = (Number(genHeight) || 172) / 100;
                  const hSq = hM * hM;
                  const w = Number(genWeight) || 68;
                  const bf = Number(genBodyFat) || 18;
                  const curLbm = Math.round(w * (1 - bf / 100) * 10) / 10;
                  const curFfmi = Math.round((curLbm / hSq) * 10) / 10;
                  const targetF = Number(genTargetFfmi) || 22.0;
                  const targetL = Math.round(targetF * hSq * 10) / 10;
                  const netLbm = Math.round((targetL - curLbm) * 10) / 10;
                  const finalBf = genSex === 'female' ? 20 : 16;
                  const finalW = Math.round((targetL / (1 - finalBf / 100)) * 10) / 10;

                  return (
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                        Dự Phóng Phân Kỳ Chu Kỳ Khoa Học
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-white/80 pt-1">
                        <div>
                          Hiện tại: <span className="font-mono text-white font-bold">{curLbm}kg LBM</span> (FFMI {curFfmi})
                        </div>
                        <div>
                          Đích đến: <span className="font-mono text-emerald-400 font-bold">{finalW}kg</span> ({finalBf}% mỡ)
                        </div>
                        <div>
                          Cơ nạc tích lũy: <span className="font-mono text-indigo-300 font-bold">+{netLbm > 0 ? netLbm : 0}kg LBM</span>
                        </div>
                        <div>
                          FFMI cực đại: <span className="font-mono text-amber-300 font-bold">{targetF}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/50 pt-1 leading-relaxed border-t border-white/5 mt-1">
                        Thuật toán sẽ tự động phân giải thành chuỗi chu kỳ sóng Tăng Cơ (~12 tuần) xen kẽ các đợt Mini-cut (2–4 tuần) siết mỡ sâu để bảo toàn độ nhạy insulin và phát triển tối đa cơ nạc.
                      </p>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowGeneratorModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 cursor-pointer font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>⚡ Tạo Đại Lộ Trình Ngay</span>
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: TẠO THỦ CÔNG TRỐNG */
              <form onSubmit={handleCreateBlankRoadmap} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-white/50 mb-1">
                    Tên lộ trình
                  </label>
                  <input
                    type="text"
                    required
                    value={blankTitle}
                    onChange={(e) => setBlankTitle(e.target.value)}
                    placeholder="Ví dụ: Lộ Trình Cá Nhân Hóa 2026..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-white/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Số đo khởi điểm của bạn
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                    <div>Chiều cao: <strong className="text-white">{profile.heightCm || 172} cm</strong></div>
                    <div>Cân nặng: <strong className="text-white">{currentWeight} kg</strong></div>
                    <div>% Mỡ: <strong className="text-white">{currentBf}%</strong></div>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed pt-2 border-t border-white/5">
                    Lộ trình mới sẽ được khởi tạo ở trạng thái trống. Ngay sau khi tạo, cửa sổ thêm giai đoạn sẽ mở ra để bạn tự do điền mốc ngày, cân nặng mục tiêu, calo và đạm tùy thích.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowGeneratorModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 cursor-pointer font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>📝 Tạo Lộ Trình &amp; Thêm Giai Đoạn</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ROADMAP MANAGER MODAL: QUẢN LÝ / CHUYỂN ĐỔI CÁC LỘ TRÌNH ĐÃ LƯU */}
      {showRoadmapManagerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#101726] border border-white/20 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Thư Viện Lộ Trình Thể Hình</h3>
                  <p className="text-[11px] text-white/50">Quản lý, chuyển đổi hoặc xóa các lộ trình đã tạo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRoadmapManagerModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of saved roadmaps */}
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {(() => {
                const list = [...savedCtgRoadmaps];
                if (activeRoadmap && !list.some((r) => r.id === activeRoadmap.id)) {
                  list.unshift(activeRoadmap);
                }
                if (list.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-white/40">
                      Chưa có lộ trình nào được lưu.
                    </div>
                  );
                }
                return list.map((rm) => {
                  const isActive = activeRoadmap?.id === rm.id;
                  const phaseCount = rm.phases?.length || 0;
                  const firstP = rm.phases?.[0];
                  const lastP = rm.phases?.[phaseCount - 1];

                  return (
                    <div
                      key={rm.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-blue-950/40 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{rm.title || 'Lộ Trình Chu Kỳ'}</span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Đang Kích Hoạt
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/60 flex flex-wrap items-center gap-2">
                            <span>{phaseCount} giai đoạn</span>
                            {firstP && lastP && (
                              <>
                                <span>·</span>
                                <span className="font-mono text-white/70">
                                  {firstP.startWeightKg}kg → {lastP.targetWeightKg}kg
                                </span>
                                <span>·</span>
                                <span className="text-emerald-400 font-mono font-bold">
                                  FFMI {lastP.targetFfmi}
                                </span>
                              </>
                            )}
                          </div>
                          {rm.heightCm && (
                            <div className="text-[11px] text-white/40 font-mono">
                              Thể trạng: {rm.heightCm}cm · {rm.initialWeightKg}kg · {rm.initialBodyFatPct}% mỡ
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isActive && onSwitchCtgRoadmap && (
                            <button
                              type="button"
                              onClick={() => {
                                onSwitchCtgRoadmap(rm.id);
                                setShowRoadmapManagerModal(false);
                                setAppliedBanner(`Đã kích hoạt lộ trình "${rm.title}"!`);
                                setTimeout(() => setAppliedBanner(null), 5000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                            >
                              Kích Hoạt
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xóa lộ trình "${rm.title}" khỏi danh sách?`)) {
                                if (onDeleteCtgRoadmap) {
                                  onDeleteCtgRoadmap(rm.id);
                                }
                                if (isActive) {
                                  handleConfirmDeleteCurrentRoadmap();
                                }
                              }
                            }}
                            className="p-1.5 rounded-xl hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Xóa lộ trình này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowRoadmapManagerModal(false);
                  setGenMode('auto');
                  setShowGeneratorModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Tạo Lộ Trình Mới</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRoadmapManagerModal(false)}
                className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 cursor-pointer font-semibold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ROADMAP CONFIRMATION MODAL */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#101726] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Xóa Bỏ Lộ Trình Này?</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Bạn có chắc chắn muốn xóa lộ trình <strong className="text-white">"{activeRoadmap?.title || 'Lộ Trình Chu Kỳ CTG'}"</strong> gồm <strong className="text-rose-400">{phases.length} giai đoạn</strong> không?
              </p>
              <p className="text-[11px] text-white/40">
                Sau khi xóa, bạn có thể tạo lại lộ trình mới hoặc khôi phục lại mẫu chuẩn bất cứ lúc nào.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="py-2.5 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 cursor-pointer font-semibold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCurrentRoadmap}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors shadow-sm text-xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác Nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM PHASE MODAL: THÊM 1 GIAI ĐOẠN ĐƠN LẺ VÀO LỘ TRÌNH */}
      {showAddPhaseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#101726] border border-white/20 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Thêm Giai Đoạn Đơn Lẻ Vào Lộ Trình</h3>
                  <p className="text-[11px] text-white/50">Tùy biến mục tiêu cân nặng, % mỡ và dinh dưỡng cho giai đoạn này</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPhaseModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomPhaseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Tên giai đoạn</label>
                  <input
                    type="text"
                    required
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    placeholder="Ví dụ: Tăng cơ đợt 3, Mini-cut Tết..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Loại giai đoạn</label>
                  <select
                    value={newPhaseType}
                    onChange={(e) => setNewPhaseType(e.target.value as CtgPhaseType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1a233a] border border-white/15 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="bulk">Tăng cơ (Hypertrophy Surplus)</option>
                    <option value="minicut">Mini-cut (Siết mỡ ngắt quãng)</option>
                    <option value="cut">Giảm mỡ / Cắt nét (Cut)</option>
                    <option value="final_cut">Giảm mỡ hoàn thiện</option>
                    <option value="maintain">Duy trì (Maintenance)</option>
                  </select>
                </div>
              </div>

              {/* Ngày bắt đầu & Ngày kết thúc */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Ngày bắt đầu</label>
                  <input
                    type="text"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Ngày kết thúc</label>
                  <input
                    type="text"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Số đo bắt đầu & mục tiêu */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">Cân bắt đầu (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newStartWeight}
                    onChange={(e) => setNewStartWeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">Cân mục tiêu (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTargetWeight}
                    onChange={(e) => setNewTargetWeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">% Mỡ bắt đầu</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newStartBf}
                    onChange={(e) => setNewStartBf(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">% Mỡ mục tiêu</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newTargetBf}
                    onChange={(e) => setNewTargetBf(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dinh dưỡng & Nút tính tự động */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Dinh Dưỡng Mục Tiêu</span>
                  <button
                    type="button"
                    onClick={() => {
                      const avgW = ((Number(newStartWeight) || currentWeight) + (Number(newTargetWeight) || currentWeight)) / 2;
                      const nut = calculatePhaseNutrition(
                        profile.sex || 'male',
                        Number(profile.heightCm) || 172,
                        avgW,
                        newPhaseType
                      );
                      setNewKcal(String(nut.targetKcal));
                      setNewProtein(String(nut.protein));
                      setNewCarbs(String(nut.carbs));
                      setNewFat(String(nut.fat));
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>⚡ Tự tính theo số đo</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] text-white/40 uppercase mb-0.5">Calo (kcal)</label>
                    <input
                      type="number"
                      required
                      value={newKcal}
                      onChange={(e) => setNewKcal(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-rose-300 uppercase mb-0.5">Đạm (g)</label>
                    <input
                      type="number"
                      required
                      value={newProtein}
                      onChange={(e) => setNewProtein(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-rose-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-amber-300 uppercase mb-0.5">Carb (g)</label>
                    <input
                      type="number"
                      required
                      value={newCarbs}
                      onChange={(e) => setNewCarbs(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-amber-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-emerald-300 uppercase mb-0.5">Fat (g)</label>
                    <input
                      type="number"
                      required
                      value={newFat}
                      onChange={(e) => setNewFat(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-emerald-300 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Ghi chú chiến lược</label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ví dụ: Tăng calo từ gạo lứt, duy trì progressive overload..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddPhaseModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 cursor-pointer font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Thêm Giai Đoạn Này</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PHASE MODAL: CHỈNH SỬA BẤT KỲ GIAI ĐOẠN NÀO */}
      {editingPhase && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#101726] border border-white/20 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Chỉnh Sửa Giai Đoạn</h3>
                  <p className="text-[11px] text-white/50">{editingPhase.name} ({editingPhase.startDate} – {editingPhase.endDate})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPhase(null)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePhaseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Tên giai đoạn</label>
                  <input
                    type="text"
                    required
                    value={editingPhase.name}
                    onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Loại giai đoạn</label>
                  <select
                    value={editingPhase.phaseType}
                    onChange={(e) => setEditingPhase({ ...editingPhase, phaseType: e.target.value as CtgPhaseType })}
                    className="w-full px-3 py-2 rounded-xl bg-[#1a233a] border border-white/15 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="bulk">Tăng cơ (Hypertrophy Surplus)</option>
                    <option value="minicut">Mini-cut (Siết mỡ ngắt quãng)</option>
                    <option value="cut">Giảm mỡ / Cắt nét (Cut)</option>
                    <option value="final_cut">Giảm mỡ hoàn thiện</option>
                    <option value="maintain">Duy trì (Maintenance)</option>
                  </select>
                </div>
              </div>

              {/* Ngày bắt đầu & Ngày kết thúc */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Ngày bắt đầu</label>
                  <input
                    type="text"
                    required
                    value={editingPhase.startDate}
                    onChange={(e) => setEditingPhase({ ...editingPhase, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Ngày kết thúc</label>
                  <input
                    type="text"
                    required
                    value={editingPhase.endDate}
                    onChange={(e) => setEditingPhase({ ...editingPhase, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Số đo bắt đầu & mục tiêu */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">Cân bắt đầu (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingPhase.startWeightKg}
                    onChange={(e) => setEditingPhase({ ...editingPhase, startWeightKg: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">Cân mục tiêu (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingPhase.targetWeightKg}
                    onChange={(e) => setEditingPhase({ ...editingPhase, targetWeightKg: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">% Mỡ bắt đầu</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingPhase.startBodyFatPct}
                    onChange={(e) => setEditingPhase({ ...editingPhase, startBodyFatPct: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold uppercase text-white/50 mb-1">% Mỡ mục tiêu</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingPhase.targetBodyFatPct}
                    onChange={(e) => setEditingPhase({ ...editingPhase, targetBodyFatPct: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dinh dưỡng & Nút tính tự động */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Dinh Dưỡng Thiết Lập</span>
                  <button
                    type="button"
                    onClick={() => {
                      const avgW = (Number(editingPhase.startWeightKg) + Number(editingPhase.targetWeightKg)) / 2;
                      const nut = calculatePhaseNutrition(
                        profile.sex || 'male',
                        Number(profile.heightCm) || 172,
                        avgW,
                        editingPhase.phaseType
                      );
                      setEditingPhase({
                        ...editingPhase,
                        targetKcal: nut.targetKcal,
                        macros: {
                          protein: nut.protein,
                          carbs: nut.carbs,
                          fat: nut.fat,
                        },
                      });
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>⚡ Tính lại tự động</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] text-white/40 uppercase mb-0.5">Calo (kcal)</label>
                    <input
                      type="number"
                      required
                      value={editingPhase.targetKcal}
                      onChange={(e) => setEditingPhase({ ...editingPhase, targetKcal: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-rose-300 uppercase mb-0.5">Đạm (g)</label>
                    <input
                      type="number"
                      required
                      value={editingPhase.macros.protein}
                      onChange={(e) =>
                        setEditingPhase({
                          ...editingPhase,
                          macros: { ...editingPhase.macros, protein: Number(e.target.value) },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-rose-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-amber-300 uppercase mb-0.5">Carb (g)</label>
                    <input
                      type="number"
                      required
                      value={editingPhase.macros.carbs}
                      onChange={(e) =>
                        setEditingPhase({
                          ...editingPhase,
                          macros: { ...editingPhase.macros, carbs: Number(e.target.value) },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-amber-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-emerald-300 uppercase mb-0.5">Fat (g)</label>
                    <input
                      type="number"
                      required
                      value={editingPhase.macros.fat}
                      onChange={(e) =>
                        setEditingPhase({
                          ...editingPhase,
                          macros: { ...editingPhase.macros, fat: Number(e.target.value) },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-black/30 border border-white/10 text-emerald-300 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-white/50 mb-1">Ghi chú chiến lược</label>
                <textarea
                  rows={2}
                  value={editingPhase.note || ''}
                  onChange={(e) => setEditingPhase({ ...editingPhase, note: e.target.value })}
                  placeholder="Ghi chú giai đoạn..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingPhase(null)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/5 cursor-pointer font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE ROADMAP CONFIRMATION MODAL */}
      {roadmapToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#101726] border border-white/20 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold">Xác Nhận Xóa Lộ Trình</h3>
              <p className="text-xs text-white/60">
                Bạn có chắc chắn muốn xóa "{roadmapToDelete.title || 'Lộ trình này'}"? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoadmapToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSavedRoadmap(roadmapToDelete.id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


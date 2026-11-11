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

interface RoadmapTabProps {
  profile: CtgProfile;
  lang: 'vi' | 'en';
  bodyPoints?: BodyPoint[];
  ctgPeriodizedRoadmap?: CtgPeriodizedRoadmap;
  onUpdateCtgPeriodizedRoadmap?: (roadmap: CtgPeriodizedRoadmap) => void;
  onSetActiveRoadmapPhase?: (phaseId: string) => void;
  savedRoadmaps?: SavedRoadmap[];
  onAddSavedRoadmap?: (roadmap: Omit<SavedRoadmap, 'id' | 'createdAt'>) => SavedRoadmap;
  onDeleteSavedRoadmap?: (id: string) => void;
  nutritionSettings?: NutritionSettings;
  onUpdateNutritionSettings?: (patch: Partial<NutritionSettings>) => void;
  onUpdateProfile: (patch: Partial<CtgProfile>) => void;
  onNavigateTab?: (tab: 'inbody' | 'training' | 'nutrition' | 'profile') => void;
  onApplySplitTemplate?: (template: RoutineSplitTemplate) => void;
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
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(str);
}

export function getPhaseStatus(phase: CtgRoadmapPhase, activePhaseId?: string): 'completed' | 'current' | 'upcoming' {
  if (activePhaseId && phase.id === activePhaseId) return 'current';
  if (!activePhaseId && phase.isCurrent) return 'current';
  const now = new Date();
  const end = parseVnDate(phase.endDate);
  if (now > end) return 'completed';
  const start = parseVnDate(phase.startDate);
  if (now < start) return 'upcoming';
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
}) => {
  // View mode switcher: CTG Master Periodization vs Single Snapshot vs Saved Milestones
  const [activeViewMode, setActiveViewMode] = useState<'ctg_periodized' | 'single_analyzer' | 'saved_milestones'>('ctg_periodized');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'current' | 'completed' | 'upcoming' | 'bulk' | 'cut'>('all');
  const [selectedPhase, setSelectedPhase] = useState<CtgRoadmapPhase | null>(null);

  const activeRoadmap = ctgPeriodizedRoadmap || SEED_CTG_PERIODIZED_ROADMAP;
  const phases = activeRoadmap.phases;

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

  const currentWeight = latestPoint?.weightKg ?? Number(weightKg) ?? 67.8;
  const currentBf = latestPoint?.bodyFatPct ?? Number(bodyfatPct) ?? 17.1;
  const currentLbm = latestPoint ? leanMassKg(latestPoint.weightKg, latestPoint.bodyFatPct) : leanMassKg(currentWeight, currentBf);
  const currentFfmi = latestPoint ? ffmi(latestPoint.weightKg, latestPoint.bodyFatPct, Number(heightCm) || 172) : ffmi(currentWeight, currentBf, Number(heightCm) || 172);

  const activePhase = useMemo(() => {
    if (activeRoadmap.activePhaseId) {
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
    return byDate || phases[1] || phases[0];
  }, [activeRoadmap, phases]);

  // CTG Periodized Generator & Custom Phase Modals
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
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
    onSetActiveRoadmapPhase?.(activePhase.id);
    handleApplySinglePhase(activePhase);
    setAppliedBanner(
      `Đã kích hoạt toàn bộ đại lộ trình 17 giai đoạn CTG (2026 – 2029)! Giai đoạn đang chạy: "${activePhase.name}" (${activePhase.startDate} – ${activePhase.endDate}). Mục tiêu Dinh Dưỡng và Giáo Án đã tự động đồng bộ!`
    );
    setTimeout(() => setAppliedBanner(null), 8000);
  };

  const handleSetCurrentPhase = (phaseId: string) => {
    onSetActiveRoadmapPhase?.(phaseId);
    const p = phases.find((item) => item.id === phaseId);
    if (p) {
      setAppliedBanner(`Đã đặt "${p.name} (${p.startDate} – ${p.endDate})" làm mốc giai đoạn hiện tại!`);
      setTimeout(() => setAppliedBanner(null), 5000);
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
    setShowGeneratorModal(false);
    setAppliedBanner(
      `Đã tạo đại lộ trình chu kỳ mới với ${generated.phases.length} giai đoạn tối ưu hóa riêng cho chiều cao ${h}cm, cân nặng ${w}kg, % mỡ ${bf}%!`
    );
    setTimeout(() => setAppliedBanner(null), 8000);
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

    const updatedPhases = [...activeRoadmap.phases, createdPhase];
    onUpdateCtgPeriodizedRoadmap?.({
      ...activeRoadmap,
      phases: updatedPhases,
    });
    setShowAddPhaseModal(false);
    setAppliedBanner(`Đã thêm giai đoạn "${createdPhase.name}" vào lộ trình!`);
    setTimeout(() => setAppliedBanner(null), 6000);
  };

  const handleUpdatePhaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase) return;
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
    onUpdateCtgPeriodizedRoadmap?.({
      ...activeRoadmap,
      phases: updatedPhases,
    });
    setEditingPhase(null);
    setAppliedBanner(`Đã cập nhật thông tin giai đoạn "${updated.name}"!`);
    setTimeout(() => setAppliedBanner(null), 6000);
  };

  const handleDeletePhase = (phaseId: string) => {
    if (phases.length <= 1) {
      alert('Lộ trình cần có ít nhất 1 giai đoạn.');
      return;
    }
    const remaining = phases.filter((p) => p.id !== phaseId);
    let nextActiveId = activeRoadmap.activePhaseId;
    if (nextActiveId === phaseId) {
      nextActiveId = remaining[0]?.id;
    }
    onUpdateCtgPeriodizedRoadmap?.({
      ...activeRoadmap,
      activePhaseId: nextActiveId,
      phases: remaining,
    });
    setAppliedBanner('Đã xóa giai đoạn khỏi lộ trình.');
    setTimeout(() => setAppliedBanner(null), 4000);
  };

  const handleResetToSeedRoadmap = () => {
    if (window.confirm('Khôi phục lại Đại Lộ Trình Chu Kỳ 17 Giai Đoạn chuẩn (2026 – 2029)?')) {
      onUpdateCtgPeriodizedRoadmap?.(SEED_CTG_PERIODIZED_ROADMAP);
      setAppliedBanner('Đã khôi phục lại đại lộ trình chu kỳ 17 giai đoạn chuẩn!');
      setTimeout(() => setAppliedBanner(null), 5000);
    }
  };

  const firstPhase = phases[0];
  const lastPhase = phases[phases.length - 1];
  const totalLbmGain =
    firstPhase && lastPhase ? Math.round((lastPhase.targetLbmKg - firstPhase.startLbmKg) * 10) / 10 : 0;
  const totalFfmiGain =
    firstPhase && lastPhase ? Math.round((lastPhase.targetFfmi - firstPhase.startFfmi) * 10) / 10 : 0;

  const isBulkPhase = activePhase.phaseType === 'bulk';
  const startW = activePhase.startWeightKg;
  const targetW = activePhase.targetWeightKg;
  const wDelta = Math.round((currentWeight - targetW) * 10) / 10;
  const lbmGain = Math.round((currentLbm - activePhase.startLbmKg) * 10) / 10;
  const targetLbmGain = Math.round((activePhase.targetLbmKg - activePhase.startLbmKg) * 10) / 10;

  const weightProgress = useMemo(() => {
    if (isBulkPhase) {
      if (currentWeight >= targetW) return 100;
      if (currentWeight <= startW) return 0;
      return Math.min(100, Math.max(0, Math.round(((currentWeight - startW) / (targetW - startW)) * 100)));
    } else {
      if (currentWeight <= targetW) return 100;
      if (currentWeight >= startW) return 0;
      return Math.min(100, Math.max(0, Math.round(((startW - currentWeight) / (startW - targetW)) * 100)));
    }
  }, [isBulkPhase, currentWeight, startW, targetW]);

  const timeProgress = useMemo(() => {
    const s = parseVnDate(activePhase.startDate);
    const e = parseVnDate(activePhase.endDate);
    const now = new Date();
    const total = e.getTime() - s.getTime();
    if (total <= 0) return 0;
    const elapsed = now.getTime() - s.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }, [activePhase]);

  const daysRemaining = useMemo(() => {
    const e = parseVnDate(activePhase.endDate);
    const now = new Date();
    return Math.max(0, Math.round((e.getTime() - now.getTime()) / 864e5));
  }, [activePhase]);

  const filteredPhases = useMemo(() => {
    return phases.filter((p) => {
      const status = getPhaseStatus(p, activeRoadmap.activePhaseId);
      if (phaseFilter === 'current') return status === 'current';
      if (phaseFilter === 'completed') return status === 'completed';
      if (phaseFilter === 'upcoming') return status === 'upcoming';
      if (phaseFilter === 'bulk') return p.phaseType === 'bulk';
      if (phaseFilter === 'cut') return p.phaseType === 'cut' || p.phaseType === 'minicut' || p.phaseType === 'final_cut';
      return true;
    });
  }, [phases, phaseFilter, activeRoadmap.activePhaseId]);

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
      {activeViewMode === 'ctg_periodized' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Hero Banner for CTG Master Periodization */}
          <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                    CTG<span className="text-[#2563EB]">.</span>Periodization
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    {firstPhase?.startDate} – {lastPhase?.endDate}
                  </span>
                  {activeRoadmap.heightCm && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {activeRoadmap.heightCm} cm · {activeRoadmap.initialWeightKg} kg
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                  {activeRoadmap.title || `Đại Lộ Trình Phân Kỳ Chu Kỳ (${phases.length} Giai Đoạn)`}
                </h2>
                <p className="text-xs text-white/60 mt-1 max-w-2xl leading-relaxed">
                  Chiến lược phân kỳ chu kỳ dài hạn kết hợp các đợt Tăng Cơ (Hypertrophy Surplus) và Mini-cut siết mỡ sâu (Fast Deficit). Giúp tối đa hóa lượng cơ nạc LBM mà không làm tích mỡ dư thừa theo đúng thể trạng riêng của bạn.
                </p>

                {/* Creator and Modifier Action Bar */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setGenHeight(String(profile.heightCm || 172));
                      setGenWeight(String(currentWeight || 68));
                      setGenBodyFat(String(currentBf || 18));
                      setGenSex(profile.sex || 'male');
                      setShowGeneratorModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>⚡ Tạo Lộ Trình Mới Theo Thể Trạng</span>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ Thêm 1 Giai Đoạn</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToSeedRoadmap}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/50 hover:text-white text-xs transition-colors cursor-pointer"
                    title="Khôi phục lại lộ trình 17 giai đoạn chuẩn mẫu"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Khôi phục mẫu chuẩn</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 self-start md:self-center">
                <button
                  type="button"
                  onClick={() => handleApplySinglePhase(activePhase)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Target className="w-4 h-4 text-blue-400" />
                  <span>🎯 Áp Dụng 1 Giai Đoạn Này ({activePhase.name})</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyFullRoadmap}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-orange-500/30"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Kích Hoạt Cả Lộ Trình ({phases.length} Giai Đoạn)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE PHASE HERO CARD: MỐC ĐANG ĐẠT ĐƯỢC & TIẾN ĐỘ THỰC TẾ */}
          <div className="rounded-3xl border border-blue-500/30 bg-linear-to-b from-[#10192e] to-[#0b101b] p-5 sm:p-6 shadow-xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Phase info + Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Giai Đoạn Đang Thực Hiện
                    </span>
                    <span className="text-xs text-white/50 font-mono">
                      {activePhase.startDate} – {activePhase.endDate}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-0.5 flex items-center gap-2">
                    {activePhase.name}
                    <span className="text-xs font-normal text-white/50">
                      ({activePhase.phaseType === 'bulk' ? 'Tăng cơ có kiểm soát' : activePhase.phaseType === 'minicut' ? 'Mini-cut siết mỡ bảo toàn cơ' : activePhase.phaseType === 'cut' ? 'Cắt mỡ' : 'Giảm mỡ hoàn thiện'})
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplySinglePhase(activePhase)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Áp Dụng Dinh Dưỡng Này</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhase(activePhase)}
                  className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Xem chi tiết"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LIVE COMPARISON: Thống kê đối soát với thực tế */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
              {/* Cân nặng */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-white/40 block">Cân nặng</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-white font-mono">{currentWeight}</span>
                  <span className="text-xs text-white/40">/ {activePhase.targetWeightKg} kg</span>
                </div>
                <div className="text-[10px] text-white/50 flex items-center justify-between pt-0.5 border-t border-white/5">
                  <span>Ban đầu: {activePhase.startWeightKg} kg</span>
                  <span className={`font-bold font-mono ${wDelta >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {wDelta > 0 ? `+${wDelta}` : wDelta} kg
                  </span>
                </div>
              </div>

              {/* % Mỡ cơ thể */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-white/40 block">% Mỡ cơ thể</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-orange-400 font-mono">{currentBf}%</span>
                  <span className="text-xs text-white/40">/ {activePhase.targetBodyFatPct}%</span>
                </div>
                <div className="text-[10px] text-white/50 flex items-center justify-between pt-0.5 border-t border-white/5">
                  <span>Ban đầu: {activePhase.startBodyFatPct}%</span>
                  <span className="font-bold text-orange-300 font-mono">
                    Đích: {activePhase.targetBodyFatPct}%
                  </span>
                </div>
              </div>

              {/* Khối cơ nạc LBM */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-white/40 block">Khối nạc (LBM)</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-indigo-400 font-mono">{currentLbm}</span>
                  <span className="text-xs text-white/40">/ {activePhase.targetLbmKg} kg</span>
                </div>
                <div className="text-[10px] text-white/50 flex items-center justify-between pt-0.5 border-t border-white/5">
                  <span>Ban đầu: {activePhase.startLbmKg} kg</span>
                  <span className={`font-bold font-mono ${lbmGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {lbmGain > 0 ? `+${lbmGain}` : lbmGain} kg LBM
                  </span>
                </div>
              </div>

              {/* FFMI */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-white/40 block">Chỉ số FFMI</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">{currentFfmi}</span>
                  <span className="text-xs text-white/40">/ {activePhase.targetFfmi}</span>
                </div>
                <div className="text-[10px] text-white/50 flex items-center justify-between pt-0.5 border-t border-white/5">
                  <span>Ban đầu: {activePhase.startFfmi}</span>
                  <span className="font-bold text-emerald-300 font-mono">
                    Mục tiêu: {activePhase.targetFfmi}
                  </span>
                </div>
              </div>
            </div>

            {/* DUAL PROGRESS BARS: Tiến độ Cân Nặng Mục Tiêu & Tiến Độ Thời Gian */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-black/30 border border-white/5 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 font-semibold flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-blue-400" />
                    Tiến độ cân nặng giai đoạn
                  </span>
                  <span className="font-bold text-blue-400 font-mono">{weightProgress}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${weightProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span>{activePhase.startWeightKg} kg</span>
                  <span>Hiện tại: {currentWeight} kg</span>
                  <span>Đích: {activePhase.targetWeightKg} kg</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    Tiến độ thời gian giai đoạn
                  </span>
                  <span className="font-bold text-orange-400 font-mono">
                    {timeProgress}% (còn ~{daysRemaining} ngày)
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${timeProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span>{activePhase.startDate}</span>
                  <span>Thời gian kế hoạch</span>
                  <span>{activePhase.endDate}</span>
                </div>
              </div>
            </div>

            {/* Dinh dưỡng đã lưu cho giai đoạn hiện tại */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                    Dinh Dưỡng Đã Lưu Cho Giai Đoạn Này
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-extrabold text-white font-mono">
                      {activePhase.targetKcal.toLocaleString('vi-VN')} kcal/ngày
                    </span>
                    <span className="text-xs text-white/50">·</span>
                    <span className="text-xs text-rose-300 font-semibold">{activePhase.macros.protein}g Đạm</span>
                    <span className="text-xs text-amber-300 font-semibold">{activePhase.macros.carbs}g Tinh bột</span>
                    <span className="text-xs text-emerald-300 font-semibold">{activePhase.macros.fat}g Chất béo</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleApplySinglePhase(activePhase)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Đồng Bộ Vào Mục Tiêu Dinh Dưỡng</span>
              </button>
            </div>
          </div>

          {/* TRANSFORMATION MASTER SUMMARY */}
          <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Tổng Quan Chuyển Hóa Cơ Thể {firstPhase?.startDate ? `(${firstPhase.startDate} – ${lastPhase?.endDate || ''})` : ''}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {phases.length} Chu Kỳ Sóng
                    </span>
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Chiến lược phân kỳ chu kỳ dài hạn tối ưu hóa theo thể trạng cá nhân
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase font-semibold block">
                  Xuất Phát ({firstPhase?.startDate || 'Ban đầu'})
                </span>
                <div className="text-base font-extrabold text-white font-mono mt-1">
                  {firstPhase?.startWeightKg ?? 63.55} kg
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  {firstPhase?.startBodyFatPct ?? 17.5}% mỡ · {firstPhase?.startLbmKg ?? 52.4}kg LBM · FFMI {firstPhase?.startFfmi ?? 16.9}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#131b2e] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase font-semibold block">
                  Đích Đến ({lastPhase?.endDate || 'Kết thúc'})
                </span>
                <div className="text-base font-extrabold text-blue-400 font-mono mt-1">
                  {lastPhase?.targetWeightKg ?? 81.23} kg
                </div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  {lastPhase?.targetBodyFatPct ?? 16.0}% mỡ · {lastPhase?.targetLbmKg ?? 68.2}kg LBM · FFMI {lastPhase?.targetFfmi ?? 22.0}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Cơ Nạc Tăng Trưởng</span>
                <div className="text-base font-extrabold text-emerald-300 font-mono mt-1">
                  {totalLbmGain >= 0 ? `+${totalLbmGain}` : totalLbmGain} kg LBM
                </div>
                <div className="text-[10px] text-emerald-400/70 mt-0.5">Khối cơ thuần tự nhiên</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="text-[10px] text-indigo-400 uppercase font-semibold block">Chỉ Số FFMI Đạt Được</span>
                <div className="text-base font-extrabold text-indigo-300 font-mono mt-1">
                  {lastPhase?.targetFfmi ?? 22.0} ({totalFfmiGain >= 0 ? `+${totalFfmiGain}` : totalFfmiGain})
                </div>
                <div className="text-[10px] text-indigo-400/70 mt-0.5">Mức độ phát triển cơ bắp</div>
              </div>
            </div>
          </div>

          {/* TIMELINE & LIST */}
          <div className="bg-[#0b101b] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Danh Sách {phases.length} Giai Đoạn Chi Tiết
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Bấm vào từng giai đoạn để xem chi tiết, chỉnh sửa số đo, áp dụng dinh dưỡng hoặc đổi mốc đang thực hiện
                </p>
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all' as const, label: `Tất cả (${phases.length})` },
                  { id: 'current' as const, label: 'Đang diễn ra' },
                  { id: 'completed' as const, label: 'Đã hoàn thành' },
                  { id: 'upcoming' as const, label: 'Sắp tới' },
                  { id: 'bulk' as const, label: 'Chỉ Tăng cơ' },
                  { id: 'cut' as const, label: 'Chỉ Mini-cut/Giảm mỡ' },
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

            {/* Grid of Phase Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPhases.map((phase) => {
                const status = getPhaseStatus(phase, activeRoadmap.activePhaseId);
                const isCurrent = status === 'current';
                const isCompleted = status === 'completed';
                const typeColor =
                  phase.phaseType === 'bulk'
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                    : phase.phaseType === 'minicut'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                    : phase.phaseType === 'cut'
                    ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                    : 'border-purple-500/40 bg-purple-500/10 text-purple-400';

                const weightDiff = Math.round((phase.targetWeightKg - phase.startWeightKg) * 100) / 100;
                const bfDiff = Math.round((phase.targetBodyFatPct - phase.startBodyFatPct) * 10) / 10;
                const lbmDiff = Math.round((phase.targetLbmKg - phase.startLbmKg) * 10) / 10;
                const ffmiDiff = Math.round((phase.targetFfmi - phase.startFfmi) * 10) / 10;

                return (
                  <div
                    key={phase.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3.5 relative overflow-hidden ${
                      isCurrent
                        ? 'bg-[#121c35] border-blue-500 shadow-md shadow-blue-500/15'
                        : isCompleted
                        ? 'bg-[#0f1422] border-emerald-500/30 opacity-90'
                        : 'bg-[#131b2e] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${typeColor}`}>
                            {phase.name}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                              🔥 Giai đoạn hiện tại
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ✓ Đã hoàn thành
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-white/50 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-white/40" />
                          <span>{phase.startDate} – {phase.endDate}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedPhase(phase)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metrics 4 columns */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs relative z-10 pt-1">
                      <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[9px] uppercase text-white/40 font-semibold">Cân nặng</div>
                        <div className="font-bold text-white font-mono mt-0.5 text-[11px]">
                          {phase.startWeightKg} → {phase.targetWeightKg}
                        </div>
                        <div className={`text-[9px] font-mono font-bold mt-0.2 ${weightDiff >= 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                          {weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[9px] uppercase text-white/40 font-semibold">Mỡ cơ thể</div>
                        <div className="font-bold text-orange-400 font-mono mt-0.5 text-[11px]">
                          {phase.startBodyFatPct} → {phase.targetBodyFatPct}%
                        </div>
                        <div className="text-[9px] font-mono text-orange-300 mt-0.2">
                          {bfDiff > 0 ? `+${bfDiff}` : bfDiff}%
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[9px] uppercase text-white/40 font-semibold">Khối nạc LBM</div>
                        <div className="font-bold text-indigo-400 font-mono mt-0.5 text-[11px]">
                          {phase.startLbmKg} → {phase.targetLbmKg}
                        </div>
                        <div className={`text-[9px] font-mono font-bold mt-0.2 ${lbmDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {lbmDiff > 0 ? `+${lbmDiff}` : lbmDiff} kg
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[9px] uppercase text-white/40 font-semibold">FFMI</div>
                        <div className="font-bold text-emerald-400 font-mono mt-0.5 text-[11px]">
                          {phase.startFfmi} → {phase.targetFfmi}
                        </div>
                        <div className="text-[9px] font-mono text-emerald-300 mt-0.2">
                          {ffmiDiff > 0 ? `+${ffmiDiff}` : ffmiDiff}
                        </div>
                      </div>
                    </div>

                    {/* Nutrition badge */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs relative z-10">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span className="font-mono font-bold text-white text-[11px]">
                          {phase.targetKcal.toLocaleString('vi-VN')} kcal
                        </span>
                        <span className="text-[10px] text-white/50">
                          ({phase.macros.protein}P · {phase.macros.carbs}C · {phase.macros.fat}F)
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 uppercase font-semibold">
                        Dinh dưỡng đã lưu
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 relative z-10">
                      <button
                        type="button"
                        onClick={() => setEditingPhase({ ...phase })}
                        className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        title="Chỉnh sửa giai đoạn"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sửa</span>
                      </button>
                      {phases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePhase(phase.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Xóa giai đoạn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleSetCurrentPhase(phase.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Đặt làm hiện tại
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleApplySinglePhase(phase)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Áp dụng</span>
                      </button>
                    </div>
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
                  <button
                    type="button"
                    onClick={() => {
                      handleSetCurrentPhase(selectedPhase.id);
                      setSelectedPhase(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Đặt làm hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplySinglePhase(selectedPhase);
                      setSelectedPhase(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Áp Dụng Giai Đoạn Này</span>
                  </button>
                </div>
              </div>
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
              <span>Chỉ áp dụng hồ sơ</span>
            </button>
            <button
              type="button"
              onClick={handleApplyRoadmapAndCreateSplit}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:shadow-orange-500/30"
            >
              <Zap className="w-4 h-4" />
              <span>⚡ Kích Hoạt Lộ Trình & Giáo Án</span>
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

      {/* GENERATOR MODAL: TẠO ĐẠI LỘ TRÌNH CHU KỲ MỚI THEO SỐ ĐO CỦA TỪNG NGƯỜI */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-[#101726] border border-white/20 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Tạo Đại Lộ Trình Chu Kỳ CTG Tự Động</h3>
                  <p className="text-[11px] text-white/50">Tối ưu hóa các đợt Tăng Cơ &amp; Mini-cut theo thể trạng riêng</p>
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
    </div>
  );
};


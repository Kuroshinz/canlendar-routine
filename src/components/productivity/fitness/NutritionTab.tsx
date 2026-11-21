import React, { useMemo, useState } from 'react';
import {
  Utensils,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  PieChart,
  ChevronRight,
  Info,
  Calendar,
  CheckCircle2,
  Loader2,
  Volume2,
  Sliders,
  Droplets,
  X,
  Search,
  BookOpen,
  Coffee,
  Flame,
  Check,
  Target,
  Zap,
  Compass,
  ArrowRight,
  Dumbbell,
  Apple,
  Activity,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Award,
  AlertCircle,
  Copy,
  Layers,
  Heart,
} from 'lucide-react';
import {
  CtgPeriodizedRoadmap,
  CtgProfile,
  CtgRoadmapPhase,
  FoodItem,
  GOAL_LABEL,
  Goal,
  HealthDayLog,
  MEAL_LABEL,
  MealLog,
  MealSlot,
  NutritionSettings,
  BodyPoint,
} from '../../../types/productivity';
import {
  BALANCED_MEAL_COMBOS,
  CatalogFoodItem,
  FOOD_CATEGORY_LABEL,
  FoodCategory,
  MealComboPreset,
  VIETNAMESE_FOOD_CATALOG,
  calorieTarget,
  dayTotals,
  macroTargets,
  mealTotals,
  parseFoodText,
  tdee,
  todayString,
  calculateAdaptiveTDEE,
  calculateTrendWeights,
  calculateProteinDistribution,
  calculateMicronutrientSummary,
  calculateCarbCyclingTargets,
  calculateCronometerNutrientScores,
  formatDateString,
} from '../../../utils/fitnessMetrics';
import { Donut, ProgressBar, StackedBar } from '../../charts/SimpleCharts';
import { GeminiMacroModal } from './GeminiMacroModal';
import { GeminiMacroItem } from '../../../services/geminiSync';
import { notifySuccess, notifyInfo } from '../../../utils/notify';
import { playSuccessSound } from '../../../utils/sound';

interface NutritionTabProps {
  meals: MealLog[];
  profile: CtgProfile;
  userWeightKg: number;
  nutritionSettings: NutritionSettings;
  lang: 'vi' | 'en';
  onAddMealLog: (meal: Omit<MealLog, 'id' | 'createdAt'>) => MealLog;
  onUpdateMealLog?: (id: string, patch: Partial<MealLog>) => void;
  onDeleteMealLog: (id: string) => void;
  onUpdateNutritionSettings: (patch: Partial<NutritionSettings>) => void;
  healthLogs?: HealthDayLog[];
  onUpsertHealthLog?: (log: HealthDayLog) => void;
  ctgPeriodizedRoadmap?: CtgPeriodizedRoadmap | null;
  bodyPoints?: BodyPoint[];
  onUpdateProfile?: (patch: Partial<CtgProfile>) => void;
}

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'pre_workout', 'post_workout', 'dinner', 'snack'];

export const NutritionTab: React.FC<NutritionTabProps> = ({
  meals,
  profile,
  userWeightKg,
  nutritionSettings,
  lang,
  onAddMealLog,
  onUpdateMealLog,
  onDeleteMealLog,
  onUpdateNutritionSettings,
  healthLogs,
  onUpsertHealthLog,
  ctgPeriodizedRoadmap,
  bodyPoints,
  onUpdateProfile,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch');
  const [inputMode, setInputMode] = useState<'quick' | 'direct_macro' | 'manual'>('quick');
  const [inputText, setInputText] = useState('');

  // Direct Macro Input State
  const [macroTitle, setMacroTitle] = useState('');
  const [macroProtein, setMacroProtein] = useState('30');
  const [macroCarbs, setMacroCarbs] = useState('45');
  const [macroFat, setMacroFat] = useState('10');

  const directKcal = useMemo(() => {
    const p = Number(macroProtein) || 0;
    const c = Number(macroCarbs) || 0;
    const f = Number(macroFat) || 0;
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [macroProtein, macroCarbs, macroFat]);

  const handleAddDirectMacro = (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(macroProtein) || 0;
    const c = Number(macroCarbs) || 0;
    const f = Number(macroFat) || 0;
    if (p <= 0 && c <= 0 && f <= 0) return;

    const title = macroTitle.trim() || `Bữa ${MEAL_LABEL[selectedSlot]}`;
    const newItem: FoodItem = {
      name: title,
      amount: 100,
      unit: 'g',
      kcal: directKcal,
      protein: p,
      carbs: c,
      fat: f,
    };

    onAddMealLog({
      date: selectedDate,
      slot: selectedSlot,
      description: `${title} (P:${p}g, C:${c}g, F:${f}g - ${directKcal} kcal)`,
      items: [newItem],
    });

    setMacroTitle('');
    setComboToast(`Đã ghi nhận ${title} (${directKcal} kcal · ${p}g P, ${c}g C, ${f}g F)!`);
    setTimeout(() => setComboToast(null), 3000);
    notifySuccess('Đã lưu macro bữa ăn!', `${title}: +${directKcal} kcal (${p}g Đạm / ${c}g Carb / ${f}g Fat)!`);
  };

  // Manual food form state
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('150');
  const [manualUnit, setManualUnit] = useState<'g' | 'ml'>('g');
  const [manualKcal, setManualKcal] = useState('220');
  const [manualProtein, setManualProtein] = useState('20');
  const [manualCarbs, setManualCarbs] = useState('25');
  const [manualFat, setManualFat] = useState('5');

  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Food Catalog & Meal Combos state
  const [showFoodCatalogModal, setShowFoodCatalogModal] = useState(false);
  const [showCombosSection, setShowCombosSection] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<'all' | FoodCategory>('all');
  const [selectedCatalogFood, setSelectedCatalogFood] = useState<CatalogFoodItem | null>(null);
  const [catalogMultiplier, setCatalogMultiplier] = useState(1);
  const [catalogTargetSlot, setCatalogTargetSlot] = useState<MealSlot>('lunch');
  const [comboToast, setComboToast] = useState<string | null>(null);
  const [isSyncingCtg, setIsSyncingCtg] = useState(false);
  const [justSyncedCtg, setJustSyncedCtg] = useState(false);
  const [isApplyingAdaptive, setIsApplyingAdaptive] = useState(false);
  const [justAppliedAdaptive, setJustAppliedAdaptive] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);

  const handleApplyGeminiMacros = (geminiItems: GeminiMacroItem[]) => {
    const grouped: Partial<Record<MealSlot, FoodItem[]>> = {};
    for (const it of geminiItems) {
      if (!grouped[it.slot]) grouped[it.slot] = [];
      grouped[it.slot]!.push({
        name: it.name,
        amount: it.amount,
        unit: it.unit,
        kcal: it.kcal,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
      });
    }

    for (const [slotKey, items] of Object.entries(grouped)) {
      if (!items || items.length === 0) continue;
      const slot = slotKey as MealSlot;
      const desc = items.map((i) => `${i.name} (${i.amount}${i.unit})`).join(' + ');
      onAddMealLog({
        date: selectedDate,
        slot,
        description: desc,
        items,
      });
    }

    setComboToast(`Đã đồng bộ ${geminiItems.length} món từ Gemini AI vào nhật ký ${selectedDate}!`);
    setTimeout(() => setComboToast(null), 3500);
    notifySuccess('Đã đồng bộ món từ AI!', `Đã thêm ${geminiItems.length} món vào nhật ký ngày ${selectedDate}.`);
  };

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return VIETNAMESE_FOOD_CATALOG.filter((item) => {
      const matchCat = catalogCategory === 'all' || item.category === catalogCategory;
      const matchSearch =
        !catalogSearch.trim() ||
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.note?.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalogCategory, catalogSearch]);

  const handleAddCatalogFood = (item: CatalogFoodItem, mult = 1, slot = selectedSlot) => {
    const amount = Math.round(item.servingGramsOrMl * mult);
    const kcal = Math.round(item.kcalPerServing * mult);
    const protein = Math.round(item.protein * mult * 10) / 10;
    const carbs = Math.round(item.carbs * mult * 10) / 10;
    const fat = Math.round(item.fat * mult * 10) / 10;

    const portionText = mult === 1 ? item.servingLabel : `${mult}x ${item.servingLabel}`;
    onAddMealLog({
      date: selectedDate,
      slot,
      description: `${item.name} (${portionText})`,
      items: [
        {
          name: item.name,
          amount,
          unit: item.unit,
          kcal,
          protein,
          carbs,
          fat,
        },
      ],
    });

    setComboToast(`Đã thêm "${item.name}" vào ${MEAL_LABEL[slot]}!`);
    setTimeout(() => setComboToast(null), 3000);
    notifySuccess('Đã thêm món ăn!', `${item.name} (${portionText}): +${kcal} kcal!`);
  };

  const handleApplyCombo = (combo: MealComboPreset) => {
    onAddMealLog({
      date: selectedDate,
      slot: combo.slot,
      description: combo.name,
      items: combo.items,
    });
    setComboToast(`Đã nạp toàn bộ combo "${combo.name}" vào ${MEAL_LABEL[combo.slot]} hôm nay!`);
    setTimeout(() => setComboToast(null), 3500);
    notifySuccess('Đã nạp combo món ăn!', `Combo "${combo.name}" đã được ghi nhận vào ${MEAL_LABEL[combo.slot]}!`);
  };

  // Day meals parsed early for analytics
  const dayMeals = useMemo(
    () => meals.filter((m) => m.date === selectedDate),
    [meals, selectedDate]
  );

  // CTG Active Phase from Periodized Roadmap
  const ctgActivePhase = useMemo(() => {
    if (!ctgPeriodizedRoadmap || !ctgPeriodizedRoadmap.phases?.length) return null;
    if (ctgPeriodizedRoadmap.activePhaseId && ctgPeriodizedRoadmap.activePhaseId !== 'none') {
      const found = ctgPeriodizedRoadmap.phases.find((p) => p.id === ctgPeriodizedRoadmap.activePhaseId);
      if (found) return found;
    }
    const current = ctgPeriodizedRoadmap.phases.find((p) => p.isCurrent);
    return current || ctgPeriodizedRoadmap.phases[0] || null;
  }, [ctgPeriodizedRoadmap]);

  const activeGoal: Goal = useMemo(() => {
    if (!ctgActivePhase) return profile.goal;
    if (ctgActivePhase.phaseType === 'bulk') return 'bulk';
    if (ctgActivePhase.phaseType === 'cut' || ctgActivePhase.phaseType === 'minicut' || ctgActivePhase.phaseType === 'final_cut') return 'cut';
    return 'maintain';
  }, [ctgActivePhase, profile.goal]);

  // Carb Cycling Strategy Mode (Chuẩn CTG)
  const [carbCyclingMode, setCarbCyclingMode] = useState<'training' | 'rest' | 'refeed'>('training');
  const userTdee = tdee(profile, userWeightKg);
  const targetKcal = calorieTarget(userTdee, profile.goal, nutritionSettings.tdeeOffset);
  const baseTargets = macroTargets(targetKcal, userWeightKg, profile.goal, nutritionSettings);

  const cyclingTargets = useMemo(
    () => calculateCarbCyclingTargets(baseTargets.kcal, baseTargets.protein, baseTargets.carbs, baseTargets.fat),
    [baseTargets]
  );

  const targets = useMemo(() => {
    if (carbCyclingMode === 'training') return cyclingTargets.trainingDay;
    if (carbCyclingMode === 'rest') return cyclingTargets.restDay;
    return cyclingTargets.refeedDay;
  }, [carbCyclingMode, cyclingTargets]);
  const isRefeedMode = carbCyclingMode === 'refeed';

  // Adaptive Metabolic Expenditure & Trend Weight (Tracked.gg / MacroFactor signature)
  const trendWeights = useMemo(() => calculateTrendWeights(bodyPoints || []), [bodyPoints]);
  const latestTrend = trendWeights.trendPoints.length > 0 ? trendWeights.trendPoints[trendWeights.trendPoints.length - 1] : null;

  const adaptiveExpenditure = useMemo(
    () => calculateAdaptiveTDEE(meals, bodyPoints || [], userTdee, activeGoal, ctgActivePhase?.targetKcal),
    [meals, bodyPoints, userTdee, activeGoal, ctgActivePhase]
  );

  // Protein Distribution & Leucine / MPS Threshold (CTG Web)
  const proteinDist = useMemo(() => {
    const lbmKg = (userWeightKg * (100 - (profile.targetBodyFatPct || 15))) / 100;
    return calculateProteinDistribution(dayMeals, targets.protein, lbmKg);
  }, [dayMeals, targets.protein, userWeightKg, profile.targetBodyFatPct]);

  // Micronutrients Breakdown (Tracked.gg)
  const currentDayLog = useMemo(
    () => healthLogs?.find((l) => l.date === selectedDate),
    [healthLogs, selectedDate]
  );
  const currentWaterMl = currentDayLog?.waterMl || 0;
  const targetWaterMl = 2500;

  const microSummary = useMemo(
    () => calculateMicronutrientSummary(dayMeals, currentWaterMl),
    [dayMeals, currentWaterMl]
  );

  // Cronometer Advanced Micronutrients & Scores
  const [showCronometerDrawer, setShowCronometerDrawer] = useState(false);
  const cronoScores = useMemo(
    () => calculateCronometerNutrientScores(dayMeals, currentWaterMl, targets.protein),
    [dayMeals, currentWaterMl, targets.protein]
  );

  const handleCopyYesterdayMeals = () => {
    const yesterdayDate = formatDateString(new Date(new Date(selectedDate).getTime() - 86400000));
    const yesterdayMeals = meals.filter((m) => m.date === yesterdayDate);
    if (yesterdayMeals.length === 0) {
      notifyInfo('Không có dữ liệu hôm qua', `Ngày ${yesterdayDate} chưa có bữa ăn nào để sao chép.`);
      return;
    }
    for (const m of yesterdayMeals) {
      onAddMealLog({
        date: selectedDate,
        slot: m.slot,
        description: m.description,
        items: m.items,
      });
    }
    notifySuccess(
      'Đã sao chép thực đơn hôm qua!',
      `Đã nạp ${yesterdayMeals.length} bữa ăn từ ngày ${yesterdayDate} vào ngày ${selectedDate}.`
    );
  };

  const handleApplyAdaptiveTDEE = () => {
    playSuccessSound();
    setIsApplyingAdaptive(true);

    const recKcal = adaptiveExpenditure.recommendedCaloTarget;
    const calcCarbs = Math.max(50, Math.round((recKcal - targets.protein * 4 - targets.fat * 9) / 4));

    onUpdateNutritionSettings({
      overrides: {
        ...(nutritionSettings.overrides || {}),
        [profile.goal]: {
          kcal: recKcal,
          protein: targets.protein,
          carbs: calcCarbs,
          fat: targets.fat,
        },
      },
    });
    setOverrideKcal(String(recKcal));
    setOverrideProtein(String(targets.protein));
    setOverrideCarbs(String(calcCarbs));
    setOverrideFat(String(targets.fat));

    setTimeout(() => {
      setIsApplyingAdaptive(false);
      setJustAppliedAdaptive(true);
      setComboToast(`✓ Đã kích hoạt Calo Thích Ứng (${recKcal.toLocaleString('vi-VN')} kcal) từ Tiêu Hao Chuyển Hóa!`);
      setTimeout(() => setComboToast(null), 4000);
      notifySuccess(
        'Đã áp dụng TDEE Thích Ứng thành công!',
        `Mục tiêu calo đã chuyển sang ${recKcal.toLocaleString('vi-VN')} kcal (TDEE Trao Đổi Chất Thực Tế: ${adaptiveExpenditure.adaptiveTdee.toLocaleString('vi-VN')} kcal).`
      );
      setTimeout(() => setJustAppliedAdaptive(false), 3500);
    }, 200);
  };



  const isSyncedWithCtgPhase = useMemo(() => {
    if (!ctgActivePhase) return true;
    const currentOverride = nutritionSettings.overrides?.[profile.goal];
    if (currentOverride && currentOverride.kcal) {
      const diffKcal = Math.abs(currentOverride.kcal - ctgActivePhase.targetKcal);
      const diffProtein = Math.abs((currentOverride.protein || 0) - ctgActivePhase.macros.protein);
      return diffKcal <= 10 && diffProtein <= 2;
    }
    const diffKcal = Math.abs(baseTargets.kcal - ctgActivePhase.targetKcal);
    const diffProtein = Math.abs(baseTargets.protein - ctgActivePhase.macros.protein);
    return diffKcal <= 10 && diffProtein <= 2;
  }, [ctgActivePhase, nutritionSettings.overrides, profile.goal, baseTargets]);

  const isAdaptiveApplied = useMemo(() => {
    const currentOverride = nutritionSettings.overrides?.[profile.goal];
    if (!currentOverride || !currentOverride.kcal) return false;
    return Math.abs(currentOverride.kcal - adaptiveExpenditure.recommendedCaloTarget) <= 5;
  }, [nutritionSettings.overrides, profile.goal, adaptiveExpenditure.recommendedCaloTarget]);

  const handleSyncWithCtgPhase = () => {
    if (!ctgActivePhase) return;
    playSuccessSound();
    setIsSyncingCtg(true);

    onUpdateNutritionSettings({
      overrides: {
        ...(nutritionSettings.overrides || {}),
        [profile.goal]: {
          kcal: ctgActivePhase.targetKcal,
          protein: ctgActivePhase.macros.protein,
          carbs: ctgActivePhase.macros.carbs,
          fat: ctgActivePhase.macros.fat,
        },
      },
    });
    setOverrideKcal(String(ctgActivePhase.targetKcal));
    setOverrideProtein(String(ctgActivePhase.macros.protein));
    setOverrideCarbs(String(ctgActivePhase.macros.carbs));
    setOverrideFat(String(ctgActivePhase.macros.fat));

    setTimeout(() => {
      setIsSyncingCtg(false);
      setJustSyncedCtg(true);
      setComboToast(`✓ Đã đồng bộ chuẩn dinh dưỡng theo Giai đoạn "${ctgActivePhase.name}" (${ctgActivePhase.targetKcal} kcal)!`);
      setTimeout(() => setComboToast(null), 4000);
      notifySuccess(
        'Đã đồng bộ chuẩn CTG thành công!',
        `Mục tiêu calo đã chuyển sang ${ctgActivePhase.targetKcal.toLocaleString('vi-VN')} kcal theo Giai đoạn "${ctgActivePhase.name}" (${ctgActivePhase.macros.protein}g Đạm / ${ctgActivePhase.macros.carbs}g Carb / ${ctgActivePhase.macros.fat}g Fat).`
      );
      setTimeout(() => setJustSyncedCtg(false), 3500);
    }, 200);
  };

  // Macro override form state
  const currentOverride = nutritionSettings.overrides[profile.goal];
  const [overrideKcal, setOverrideKcal] = useState(String(currentOverride?.kcal || ''));
  const [overrideProtein, setOverrideProtein] = useState(String(currentOverride?.protein || ''));
  const [overrideCarbs, setOverrideCarbs] = useState(String(currentOverride?.carbs || ''));
  const [overrideFat, setOverrideFat] = useState(String(currentOverride?.fat || ''));

  // Day totals
  const currentTotals = useMemo(() => dayTotals(meals, selectedDate), [meals, selectedDate]);

  // Water tracking handled in unified state above

  const handleAddWater = (delta: number) => {
    if (!onUpsertHealthLog) return;
    const newAmount = Math.max(0, currentWaterMl + delta);
    onUpsertHealthLog({
      date: selectedDate,
      source: 'manual',
      ...(currentDayLog || {}),
      waterMl: newAmount,
    });
  };

  const donutSegments = useMemo(() => {
    return [
      { label: 'Protein', value: Math.max(0, Math.round(currentTotals.protein * 4)), color: '#E11D48' },
      { label: 'Carbs', value: Math.max(0, Math.round(currentTotals.carbs * 4)), color: '#F59E0B' },
      { label: 'Fat', value: Math.max(0, Math.round(currentTotals.fat * 9)), color: '#8E24AA' },
    ];
  }, [currentTotals]);

  // Quick parser preview
  const parsedPreview = useMemo(() => {
    if (!inputText.trim()) return [];
    return parseFoodText(inputText);
  }, [inputText]);

  const previewKcal = parsedPreview.reduce((sum, p) => sum + p.item.kcal, 0);
  const previewProtein = parsedPreview.reduce((sum, p) => sum + p.item.protein, 0);

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || parsedPreview.length === 0) return;

    onAddMealLog({
      date: selectedDate,
      slot: selectedSlot,
      description: inputText.trim(),
      items: parsedPreview.map((p) => p.item),
    });

    notifySuccess(
      'Đã ghi nhận bữa ăn!',
      `Bữa ${MEAL_LABEL[selectedSlot]}: +${Math.round(previewKcal)} kcal (${Math.round(previewProtein)}g Đạm)!`
    );
    setInputText('');
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || Number(manualKcal) <= 0) return;
    const amountNum = Number(manualAmount) || 100;
    const newItem: FoodItem = {
      name: manualName.trim(),
      amount: amountNum,
      unit: manualUnit,
      kcal: Number(manualKcal),
      protein: Number(manualProtein) || 0,
      carbs: Number(manualCarbs) || 0,
      fat: Number(manualFat) || 0,
    };
    onAddMealLog({
      date: selectedDate,
      slot: selectedSlot,
      description: `${manualName.trim()} (${amountNum}${manualUnit})`,
      items: [newItem],
    });
    notifySuccess(
      'Đã thêm món ăn!',
      `${manualName.trim()}: +${Number(manualKcal)} kcal vào bữa ${MEAL_LABEL[selectedSlot]}!`
    );
    setManualName('');
  };

  const handleDeleteMealItem = (meal: MealLog, itemIdx: number) => {
    const newItems = meal.items.filter((_, idx) => idx !== itemIdx);
    if (newItems.length === 0) {
      onDeleteMealLog(meal.id);
    } else {
      onUpdateMealLog?.(meal.id, {
        items: newItems,
        description: newItems.map((i) => `${i.name} (${i.amount}${i.unit})`).join(' + '),
      });
    }
  };



  const remainingKcal = targets.kcal - currentTotals.kcal;
  const remainingProtein = targets.protein - currentTotals.protein;
  const remainingCarbs = targets.carbs - currentTotals.carbs;
  const remainingFat = targets.fat - currentTotals.fat;

  return (
    <div className="space-y-5">
      {/* CTG Active Phase Sync Card */}
      {ctgActivePhase && (
        <div className="bg-gradient-to-r from-rose-950/40 via-red-950/30 to-[#070204] border border-rose-500/40 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Giai Đoạn CTG Hiện Tại
                </span>
                <span className="text-xs text-white/50 font-mono">
                  {ctgActivePhase.startDate} – {ctgActivePhase.endDate}
                </span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5 flex flex-wrap items-center gap-2">
                <span>{ctgActivePhase.name}:</span>
                <span className="text-rose-400 font-mono font-extrabold">{ctgActivePhase.targetKcal.toLocaleString('vi-VN')} kcal</span>
                <span className="text-xs text-white/60 font-mono">
                  ({ctgActivePhase.macros.protein}g Đạm / {ctgActivePhase.macros.carbs}g Carb / {ctgActivePhase.macros.fat}g Fat)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
            {isSyncingCtg ? (
              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 rounded-xl bg-rose-700/80 text-white font-bold text-xs flex items-center gap-2 cursor-wait shadow-inner"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Đang đồng bộ...</span>
              </button>
            ) : justSyncedCtg ? (
              <button
                type="button"
                onClick={handleSyncWithCtgPhase}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 btn-success-glow border border-emerald-300 transform scale-105 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                <span>✓ ĐÃ ĐỒNG BỘ THÀNH CÔNG!</span>
              </button>
            ) : isSyncedWithCtgPhase ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>✓ Đang khớp chuẩn CTG ({ctgActivePhase.targetKcal} kcal)</span>
                </span>
                <button
                  type="button"
                  onClick={handleSyncWithCtgPhase}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10 flex items-center gap-1"
                  title="Bấm để đồng bộ lại"
                >
                  <Zap className="w-3 h-3 text-rose-400" />
                  <span>Đồng bộ lại</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSyncWithCtgPhase}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs cursor-pointer shadow-md hover:shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-rose-200" />
                <span>Đồng Bộ Chuẩn CTG</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tracked.gg Adaptive Metabolic Expenditure & Smoothed Trend Weight Engine */}
      <div className="bg-gradient-to-r from-rose-950/50 via-[#0a0306] to-[#050102] border border-rose-500/30 rounded-2xl p-4 md:p-5 shadow-lg space-y-4 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-600/30 text-rose-300 border border-rose-500/40">
                  Tracked.gg Engine
                </span>
                <span className="text-xs text-rose-400/90 font-semibold">
                  TDEE Thích Ứng & Cân Nặng Xu Hướng
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-0.5">
                Tính toán tiêu hao trao đổi chất thực tế dựa trên delta cân nặng xu hướng (EMA) và lượng calo nạp 14 ngày.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isApplyingAdaptive ? (
              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 rounded-xl bg-rose-700/80 text-white font-bold text-xs flex items-center gap-2 cursor-wait shadow-inner"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Đang áp dụng...</span>
              </button>
            ) : justAppliedAdaptive ? (
              <button
                type="button"
                onClick={handleApplyAdaptiveTDEE}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 btn-success-glow border border-emerald-300 transform scale-105 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                <span>✓ ĐÃ ÁP DỤNG {adaptiveExpenditure.recommendedCaloTarget} KCAL!</span>
              </button>
            ) : isAdaptiveApplied ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>✓ Đang áp dụng TDEE ({adaptiveExpenditure.recommendedCaloTarget} kcal)</span>
                </span>
                <button
                  type="button"
                  onClick={handleApplyAdaptiveTDEE}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10 flex items-center gap-1"
                  title="Bấm để cập nhật lại"
                >
                  <Zap className="w-3 h-3 text-rose-400" />
                  <span>Cập nhật lại</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleApplyAdaptiveTDEE}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs cursor-pointer shadow-md hover:shadow-rose-600/30 transition-all flex items-center gap-1.5"
                title="Cập nhật mục tiêu dinh dưỡng theo mức chuyển hóa thực tế của cơ thể"
              >
                <Zap className="w-3.5 h-3.5 text-rose-200" />
                <span>Áp dụng TDEE Thích Ứng ({adaptiveExpenditure.recommendedCaloTarget} kcal)</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Adaptive TDEE */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center justify-between">
              <span>TDEE Thích Ứng Thực Tế</span>
              <Activity className="w-3 h-3 text-rose-400" />
            </div>
            <div className="text-lg font-black font-mono text-white mt-1">
              {adaptiveExpenditure.adaptiveTdee.toLocaleString('vi-VN')} <span className="text-xs font-normal text-white/50">kcal</span>
            </div>
            <div className="text-[11px] text-rose-300/80 mt-0.5 font-mono">
              {adaptiveExpenditure.differenceKcal !== 0
                ? `${adaptiveExpenditure.differenceKcal > 0 ? '+' : ''}${adaptiveExpenditure.differenceKcal} kcal vs Cơ sở`
                : 'Chuẩn chuyển hóa theo mục tiêu'}
            </div>
          </div>

          {/* Card 2: Recommended Target */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-between">
              <span>Calo Đề Xuất ({ctgActivePhase ? ctgActivePhase.name : GOAL_LABEL[profile.goal]})</span>
              <Target className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-lg font-black font-mono text-amber-300 mt-1">
              {adaptiveExpenditure.recommendedCaloTarget.toLocaleString('vi-VN')} <span className="text-xs font-normal text-white/50">kcal</span>
            </div>
            <div className="text-[11px] text-white/50 mt-0.5">
              {ctgActivePhase ? 'Khớp lộ trình Giai đoạn CTG' : 'Tối ưu cho mục tiêu cá nhân'}
            </div>
          </div>

          {/* Card 3: Trend Weight */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] uppercase font-bold text-cyan-400 flex items-center justify-between">
              <span>Cân Nặng Xu Hướng (EMA)</span>
              {trendWeights.weeklyRateKg <= 0 ? <TrendingDown className="w-3 h-3 text-cyan-400" /> : <TrendingUp className="w-3 h-3 text-amber-400" />}
            </div>
            <div className="text-lg font-black font-mono text-cyan-300 mt-1">
              {latestTrend ? latestTrend.trendWeight : userWeightKg} <span className="text-xs font-normal text-white/50">kg</span>
            </div>
            <div className="text-[11px] text-cyan-200/80 mt-0.5 font-mono">
              {trendWeights.weeklyRateKg > 0 ? '+' : ''}{trendWeights.weeklyRateKg} kg/tuần
            </div>
          </div>

          {/* Card 4: Confidence Score */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
              <span>Độ Tin Cậy Dữ Liệu</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-lg font-black font-mono text-emerald-300 mt-1">
              {adaptiveExpenditure.confidenceScore}%
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-0.5">
              {adaptiveExpenditure.loggedDaysCount} ngày nhật ký hợp lệ
            </div>
          </div>
        </div>

        {/* Biological Adaptation Feedback */}
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs text-rose-200/90 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white mr-1.5">Nhận định chuyển hóa:</span>
            {adaptiveExpenditure.analysisMessage}
          </div>
        </div>
      </div>

      {/* CTG Carb Cycling Day Strategy Selector */}
      <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 md:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Chiến Lược Carb Cycling (Chuẩn CTG Web)
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Luân phiên tinh bột theo ngày tập và ngày nghỉ để tối đa hóa hiệu suất nâng tạ mà không bị tích mỡ thừa.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {carbCyclingMode === 'training' ? '🏋️ Ngày Tập Luyện' : carbCyclingMode === 'rest' ? '🛌 Ngày Nghỉ Phục Hồi' : '⚡ Ngày Refeed'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Training Day */}
          <button
            type="button"
            onClick={() => setCarbCyclingMode('training')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              carbCyclingMode === 'training'
                ? 'bg-rose-500/15 border-rose-500/60 ring-2 ring-rose-500/40 text-rose-300'
                : 'bg-gray-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] hover:border-rose-400/40 text-gray-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-rose-500" />
                  Ngày Tập Luyện (High Carb)
                </span>
                {carbCyclingMode === 'training' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-600 text-white">
                    Đang chọn
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Tăng tinh bột nạp trước & sau buổi tập để nạp đầy kho glycogen cơ bắp và tối đa hóa sức mạnh phát lực.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-white/[0.08] font-mono text-[11px] text-gray-700 dark:text-gray-300">
              <span className="font-bold text-rose-600 dark:text-rose-400">{cyclingTargets.trainingDay.kcal} kcal</span> · P: {cyclingTargets.trainingDay.protein}g · C: {cyclingTargets.trainingDay.carbs}g · F: {cyclingTargets.trainingDay.fat}g
            </div>
          </button>

          {/* Option 2: Rest Day */}
          <button
            type="button"
            onClick={() => setCarbCyclingMode('rest')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              carbCyclingMode === 'rest'
                ? 'bg-cyan-500/15 border-cyan-500/60 ring-2 ring-cyan-500/40 text-cyan-300'
                : 'bg-gray-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] hover:border-cyan-400/40 text-gray-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-cyan-500" />
                  Ngày Nghỉ Phục Hồi (Low Carb)
                </span>
                {carbCyclingMode === 'rest' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-cyan-600 text-white">
                    Đang chọn
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Hạ lượng carb xuống, tăng chất béo tốt (omega-3, dầu olive) để phục hồi hệ thần kinh và khớp.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-white/[0.08] font-mono text-[11px] text-gray-700 dark:text-gray-300">
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{cyclingTargets.restDay.kcal} kcal</span> · P: {cyclingTargets.restDay.protein}g · C: {cyclingTargets.restDay.carbs}g · F: {cyclingTargets.restDay.fat}g
            </div>
          </button>

          {/* Option 3: Refeed Day */}
          <button
            type="button"
            onClick={() => setCarbCyclingMode('refeed')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              carbCyclingMode === 'refeed'
                ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/40 text-amber-300'
                : 'bg-gray-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] hover:border-amber-400/40 text-gray-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Ngày Refeed (Leptin Reset)
                </span>
                {carbCyclingMode === 'refeed' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500 text-black">
                    Đang chọn
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Siêu nạp carbohydrate tinh khiết, ép Fat &lt; 30g để kích thích reset hormone Leptin và tăng trao đổi chất.
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-white/[0.08] font-mono text-[11px] text-gray-700 dark:text-gray-300">
              <span className="font-bold text-amber-600 dark:text-amber-400">{cyclingTargets.refeedDay.kcal} kcal</span> · P: {cyclingTargets.refeedDay.protein}g · C: {cyclingTargets.refeedDay.carbs}g · F: {cyclingTargets.refeedDay.fat}g
            </div>
          </button>
        </div>
      </div>

      {/* Protein Distribution & Leucine / MPS Threshold Tracker (CTG & Tracked.gg) */}
      <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 md:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-white/[0.08] pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-rose-500" />
              Tổng Hợp Protein Cơ Bắp (MPS & Ngưỡng Leucine)
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Cơ bắp chỉ kích hoạt đồng hóa phát triển khi đạt ngưỡng Leucine (~25g - 40g đạm) trong mỗi cữ ăn.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              {proteinDist.successfulMpsTriggers} / {proteinDist.optimalFeedingWindowsCount} Cửa Sổ MPS Đạt Chuẩn
            </span>
          </div>
        </div>

        {/* Feeding Windows Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {MEAL_SLOTS.map((slot) => {
            const slotMealList = dayMeals.filter((m) => m.slot === slot);
            const slotProt = slotMealList.reduce((sum, m) => sum + mealTotals(m).protein, 0);
            const slotKcal = slotMealList.reduce((sum, m) => sum + mealTotals(m).kcal, 0);
            const isHit = slotProt >= 25;

            return (
              <div
                key={slot}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  slotProt === 0
                    ? 'border-dashed border-gray-200 dark:border-white/[0.08] bg-gray-50/40 dark:bg-white/[0.01]'
                    : isHit
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 truncate">
                    {MEAL_LABEL[slot]}
                  </div>
                  <div className="text-sm font-black font-mono mt-1 text-gray-900 dark:text-white">
                    {Math.round(slotProt)}g <span className="text-[10px] font-normal text-gray-400">đạm</span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-white/[0.08]">
                  {slotProt === 0 ? (
                    <span className="text-[10px] text-gray-400">Chưa nạp</span>
                  ) : isHit ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> MPS Kích Hoạt
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      &lt; 25g (Thiếu leucine)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MPS Coach Feedback */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{proteinDist.feedback}</span>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent dark:from-emerald-950/30 dark:via-teal-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
              Dinh Dưỡng Theo Mục Tiêu ({GOAL_LABEL[profile.goal]})
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              TDEE: {userTdee} kcal · BMR nền: Mifflin–St Jeor
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Nhật Ký Bữa Ăn & Macro Đa Lượng
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Nhận diện món ăn Việt tự động từ văn bản mô tả (VD: "200g ức gà + 250g cơm").
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleCopyYesterdayMeals}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer shadow-2xs transition-all"
            title="Tự động sao chép toàn bộ các bữa ăn của ngày hôm qua sang hôm nay"
          >
            <Copy className="w-3.5 h-3.5 text-rose-500" />
            <span>Sao Chép Hôm Qua</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCronometerDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
            title="Mở bảng vi chất & 3 thang điểm dinh dưỡng chuyên sâu chuẩn Cronometer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Vi Chất Cronometer (95+)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Tùy chỉnh Macro</span>
          </button>
        </div>
      </div>

      {/* Quick Remaining Macro Pills (Chuẩn CTG Web) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className={`p-3 rounded-2xl border transition-all ${
          remainingKcal >= 0 ? 'bg-white dark:bg-white/[0.03] backdrop-blur-xl border-slate-200 dark:border-white/[0.08]' : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div className="text-[10px] uppercase font-bold text-gray-400">Calo Còn Lại</div>
          <div className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
            remainingKcal >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-500'
          }`}>
            {remainingKcal >= 0 ? `${remainingKcal} kcal` : `Vượt +${-remainingKcal}`}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border transition-all ${
          remainingProtein >= 0 ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
        }`}>
          <div className="text-[10px] uppercase font-bold opacity-75">Đạm (Protein) Còn Lại</div>
          <div className="text-base sm:text-lg font-black font-mono mt-0.5">
            {remainingProtein >= 0 ? `${Math.round(remainingProtein)} g` : `Đạt đích (+${Math.round(-remainingProtein)}g)`}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border transition-all ${
          remainingCarbs >= 0 ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="text-[10px] uppercase font-bold opacity-75">Carb (Tinh Bột) Còn Lại</div>
          <div className="text-base sm:text-lg font-black font-mono mt-0.5">
            {remainingCarbs >= 0 ? `${Math.round(remainingCarbs)} g` : `Vượt +${Math.round(-remainingCarbs)}g`}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border transition-all ${
          remainingFat >= 0 ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="text-[10px] uppercase font-bold opacity-75">Chất Béo Còn Lại</div>
          <div className="text-base sm:text-lg font-black font-mono mt-0.5">
            {remainingFat >= 0 ? `${Math.round(remainingFat)} g` : `Vượt +${Math.round(-remainingFat)}g`}
          </div>
        </div>
      </div>

      {/* Headline Macro Cards with Iconic Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Macro Donut Ring Chart */}
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Năng Lượng Ngày ({selectedDate})
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {currentTotals.kcal} <span className="text-xs font-normal text-gray-400">/ {targets.kcal} kcal</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {currentTotals.kcal <= targets.kcal
                ? `Còn lại ${targets.kcal - currentTotals.kcal} kcal cho mục tiêu`
                : `Vượt mức +${currentTotals.kcal - targets.kcal} kcal`}
            </p>
            <div className="flex items-center gap-3 mt-3 text-[11px]">
              <span className="flex items-center gap-1 font-medium text-rose-500">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Đạm
              </span>
              <span className="flex items-center gap-1 font-medium text-amber-500">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Tinh bột
              </span>
              <span className="flex items-center gap-1 font-medium text-purple-500">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Béo
              </span>
            </div>
          </div>

          <Donut
            segments={donutSegments}
            size={120}
            centerValue={`${currentTotals.kcal}`}
            centerLabel={`/ ${targets.kcal} kcal`}
          />
        </div>

        {/* 3 Macro Target Progress Cards */}
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-3 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] pb-2">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
              Tiến Độ Đa Lượng (Macros Breakdown)
            </h3>
            <span className="text-[10px] text-gray-400">
              Protein {profile.goal === 'cut' ? '2.1g/kg' : '1.8g/kg'} · Fat 25% kcal
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Protein (Chất đạm): {Math.round(currentTotals.protein)}g / {targets.protein}g
                  <span className="text-[11px] font-normal text-rose-400/80 ml-2">
                    {remainingProtein >= 0 ? `(còn ${Math.round(remainingProtein)}g)` : `(+${Math.round(-remainingProtein)}g)`}
                  </span>
                </span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {targets.protein > 0 ? Math.round((currentTotals.protein / targets.protein) * 100) : 0}%
                </span>
              </div>
              <ProgressBar
                percent={targets.protein > 0 ? Math.round((currentTotals.protein / targets.protein) * 100) : 0}
                color="#E11D48"
                height={6}
              />
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Carbs (Tinh bột): {Math.round(currentTotals.carbs)}g / {targets.carbs}g
                  <span className="text-[11px] font-normal text-amber-400/80 ml-2">
                    {remainingCarbs >= 0 ? `(còn ${Math.round(remainingCarbs)}g)` : `(+${Math.round(-remainingCarbs)}g)`}
                  </span>
                </span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {targets.carbs > 0 ? Math.round((currentTotals.carbs / targets.carbs) * 100) : 0}%
                </span>
              </div>
              <ProgressBar
                percent={targets.carbs > 0 ? Math.round((currentTotals.carbs / targets.carbs) * 100) : 0}
                color="#F59E0B"
                height={6}
              />
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  Fat (Chất béo): {Math.round(currentTotals.fat)}g / {targets.fat}g
                  <span className="text-[11px] font-normal text-purple-400/80 ml-2">
                    {remainingFat >= 0 ? `(còn ${Math.round(remainingFat)}g)` : `(+${Math.round(-remainingFat)}g)`}
                  </span>
                </span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {targets.fat > 0 ? Math.round((currentTotals.fat / targets.fat) * 100) : 0}%
                </span>
              </div>
              <ProgressBar
                percent={targets.fat > 0 ? Math.round((currentTotals.fat / targets.fat) * 100) : 0}
                color="#8E24AA"
                height={6}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tracked.gg Micronutrients & Hydration Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Metric 1: Fiber */}
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
              <span className="flex items-center gap-1.5">
                <Apple className="w-4 h-4 text-emerald-500" />
                Chất Xơ (Fiber)
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {microSummary.fiberGrams} / {microSummary.fiberTargetGrams}g
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Kiểm soát đường huyết, hỗ trợ vi sinh & no lâu khi siết
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar
              percent={microSummary.fiberScorePct}
              color="#10B981"
              height={6}
            />
          </div>
        </div>

        {/* Metric 2: Sugar Limit */}
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Đường (Sugar Max)
              </span>
              <span className={`font-mono ${microSummary.sugarGrams > microSummary.sugarLimitGrams ? 'text-rose-500' : 'text-amber-500'}`}>
                {microSummary.sugarGrams} / {microSummary.sugarLimitGrams}g
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Ngưỡng tối đa bảo vệ gan & hạn chế tích mỡ nội tạng
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar
              percent={Math.min(100, Math.round((microSummary.sugarGrams / microSummary.sugarLimitGrams) * 100))}
              color={microSummary.sugarGrams > microSummary.sugarLimitGrams ? '#F43F5E' : '#F59E0B'}
              height={6}
            />
          </div>
        </div>

        {/* Metric 3: Sodium Reference */}
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                Natri (Sodium)
              </span>
              <span className="font-mono text-purple-600 dark:text-purple-400">
                {microSummary.sodiumMg} / {microSummary.sodiumTargetMg}mg
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Cân bằng điện giải, bơm cơ & điều hòa tích nước
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar
              percent={Math.min(100, Math.round((microSummary.sodiumMg / microSummary.sodiumTargetMg) * 100))}
              color="#A855F7"
              height={6}
            />
          </div>
        </div>

        {/* Metric 4: Water Hydration with Quick Add */}
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
              <span className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-500" />
                Nước (Hydration)
              </span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                {currentWaterMl} / {targetWaterMl}ml
              </span>
            </div>
            <ProgressBar
              percent={Math.min(100, Math.round((currentWaterMl / targetWaterMl) * 100))}
              color="#06B6D4"
              height={6}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-1 mt-2.5">
            <button
              type="button"
              onClick={() => handleAddWater(250)}
              className="flex-1 py-1 px-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[10px] font-bold cursor-pointer text-center"
            >
              +250ml
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(500)}
              className="flex-1 py-1 px-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[10px] font-bold cursor-pointer text-center"
            >
              +500ml
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(1000)}
              className="flex-1 py-1 px-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[10px] font-bold cursor-pointer text-center"
            >
              +1L
            </button>
            {currentWaterMl > 0 && (
              <button
                type="button"
                onClick={() => handleAddWater(-250)}
                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-500 text-[10px] cursor-pointer"
                title="Giảm 250ml"
              >
                <Minus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification Banner - Centered, Vibrant & Animated */}
      {comboToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999999] pointer-events-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(16,185,129,0.5)] border border-emerald-300 flex items-center gap-3 toast-card-enter">
          <div className="p-1 rounded-lg bg-white/20">
            <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
          </div>
          <span className="tracking-wide">{comboToast}</span>
        </div>
      )}

      {/* Balanced Meal Combos Section */}
      {showCombosSection && (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-orange-200 dark:border-orange-900/50 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Gợi Ý Thực Đơn Mẫu Chuẩn Thể Hình Việt
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Các combo bữa ăn được tính toán sẵn macro tối ưu quanh các món ăn truyền thống Việt Nam.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCombosSection(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BALANCED_MEAL_COMBOS.map((combo) => (
              <div
                key={combo.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-gray-50/50 dark:bg-gray-900/30 flex flex-col justify-between gap-3 hover:border-orange-300 dark:hover:border-orange-800 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      {combo.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 shrink-0">
                      {MEAL_LABEL[combo.slot]}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {combo.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {combo.items.map((it, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-slate-200 dark:border-white/[0.1] text-gray-700 dark:text-gray-300"
                      >
                        {it.name} ({it.amount}{it.unit})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/[0.08]/60">
                  <div className="text-[11px] font-mono text-gray-600 dark:text-gray-300">
                    <span className="font-bold text-orange-600 dark:text-orange-400">{combo.totalKcal} kcal</span> · P:{' '}
                    {combo.totalProtein}g · C: {combo.totalCarbs}g · F: {combo.totalFat}g
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCombo(combo)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nạp Combo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food Input Box: Tabs for NLP vs Manual Input */}
      <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Thêm Món Ăn Vào ({MEAL_LABEL[selectedSlot]})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFoodCatalogModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Thư Viện Món Việt (50+)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCombosSection((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30 text-xs font-semibold cursor-pointer transition-all"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{showCombosSection ? 'Ẩn Thực Đơn Mẫu' : 'Thực Đơn Mẫu (Combos)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGeminiModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
              title="Nhập cấu trúc bữa ăn & tính toán Macro tự động qua Prompt"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Prompt Macro AI</span>
            </button>

            {/* Toggle between NLP, Direct Macro and Manual mode */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setInputMode('quick')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  inputMode === 'quick'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Nhập nhanh
              </button>
              <button
                type="button"
                onClick={() => setInputMode('direct_macro')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  inputMode === 'direct_macro'
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Nhập Macro (P-C-F)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('manual')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  inputMode === 'manual'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Thủ công
              </button>
            </div>
          </div>
        </div>

        {/* Meal Slot Picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {MEAL_SLOTS.map((slot) => {
            const Icon =
              slot === 'breakfast'
                ? Coffee
                : slot === 'lunch'
                ? Utensils
                : slot === 'pre_workout'
                ? Dumbbell
                : slot === 'post_workout'
                ? Zap
                : slot === 'dinner'
                ? Flame
                : Apple;

            return (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedSlot === slot
                    ? 'bg-rose-600 text-white shadow-xs font-bold ring-2 ring-rose-400/40'
                    : 'bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{MEAL_LABEL[slot]}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Selector Display */}
        {inputMode === 'direct_macro' ? (
          <form onSubmit={handleAddDirectMacro} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Mô tả bữa ăn (không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder={`Ví dụ: Bữa ${MEAL_LABEL[selectedSlot]} ngoài quán, Whey...`}
                  value={macroTitle}
                  onChange={(e) => setMacroTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">
                  Đạm / Protein (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={macroProtein}
                  onChange={(e) => setMacroProtein(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 text-gray-800 dark:text-gray-100 font-bold font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={macroCarbs}
                  onChange={(e) => setMacroCarbs(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 text-gray-800 dark:text-gray-100 font-bold font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block mb-1">
                  Béo / Fat (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={macroFat}
                  onChange={(e) => setMacroFat(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 text-gray-800 dark:text-gray-100 font-bold font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2">
                <div className="text-center flex-1">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Tự tính:</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {directKcal} <span className="text-[10px]">kcal</span>
                  </span>
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lưu</span>
                </button>
              </div>
            </div>
          </form>
        ) : inputMode === 'quick' ? (
          <form onSubmit={handleAddMeal} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ví dụ: 200g ức gà + 250g cơm trắng + 1 chuối hoặc 1 bát phở bò..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
              />
              <button
                type="submit"
                disabled={parsedPreview.length === 0}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors shadow-xs"
              >
                + Ghi nhận ({MEAL_LABEL[selectedSlot]})
              </button>
            </div>

            {parsedPreview.length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Xem trước kết quả nhận diện:</span>
                  <span>
                    {previewKcal} kcal · {previewProtein}g protein
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsedPreview.map((p, idx) => (
                    <span
                      key={idx}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
                        p.recognised
                          ? 'bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-800 text-gray-800 dark:text-gray-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {p.item.name} ({p.item.amount}
                      {p.item.unit}): <span className="font-bold">{p.item.kcal} kcal</span> (P:{' '}
                      {p.item.protein}g, C: {p.item.carbs}g, F: {p.item.fat}g)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          /* Mode 2: Manual Custom Food Form */
          <form onSubmit={handleAddManualItem} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400">Tên món ăn</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bún chả thịt nướng"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Định lượng</label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                  <select
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value as 'g' | 'ml')}
                    className="text-xs px-1 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800"
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Calo (kcal)</label>
                <input
                  type="number"
                  min="0"
                  value={manualKcal}
                  onChange={(e) => setManualKcal(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-rose-500">Đạm / Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-amber-500">Tinh bột / Carbs (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-purple-500">Béo / Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!manualName.trim() || Number(manualKcal) <= 0}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                + Thêm Món Vào ({MEAL_LABEL[selectedSlot]})
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Logged Meals List grouped by Slot */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
          <Utensils className="w-4 h-4 text-emerald-500" />
          Các Bữa Ăn Trong Ngày ({selectedDate})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MEAL_SLOTS.map((slot) => {
            const slotMeals = dayMeals.filter((m) => m.slot === slot);
            const slotKcal = slotMeals.reduce((sum, m) => sum + mealTotals(m).kcal, 0);
            const Icon =
              slot === 'breakfast'
                ? Coffee
                : slot === 'lunch'
                ? Utensils
                : slot === 'pre_workout'
                ? Dumbbell
                : slot === 'post_workout'
                ? Zap
                : slot === 'dinner'
                ? Flame
                : Apple;

            return (
              <div
                key={slot}
                className="bg-white dark:bg-white/[0.03] backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] pb-2 mb-3">
                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-rose-500" />
                      {MEAL_LABEL[slot]}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {slotKcal} kcal
                    </span>
                  </div>

                  {slotMeals.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">Chưa ghi nhận món ăn nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {slotMeals.map((meal) => {
                        const totals = mealTotals(meal);
                        return (
                          <div
                            key={meal.id}
                            className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-white/[0.08]/80 space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 pr-2">
                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                  {meal.description}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  Tổng: <span className="text-emerald-600 font-bold">{totals.kcal} kcal</span> · P: {Math.round(totals.protein)}g · C: {Math.round(totals.carbs)}g · F: {Math.round(totals.fat)}g
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeleteMealLog(meal.id)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors shrink-0"
                                title="Xóa toàn bộ bữa này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Detailed breakdown of items inside this meal */}
                            {meal.items && meal.items.length > 0 && (
                              <div className="divide-y divide-gray-200/60 dark:divide-gray-700/60 pt-1 border-t border-slate-200/60 dark:border-white/[0.1]/60">
                                {meal.items.map((item, iIdx) => (
                                  <div key={iIdx} className="py-1.5 flex items-center justify-between text-[11px]">
                                    <div className="truncate pr-2">
                                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {item.name}
                                      </span>{' '}
                                      <span className="text-gray-400">
                                        ({item.amount}{item.unit})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono text-gray-600 dark:text-gray-300 font-bold">
                                        {item.kcal} kcal
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMealItem(meal, iIdx)}
                                        className="text-gray-300 hover:text-rose-500 cursor-pointer p-0.5"
                                        title="Xóa món này khỏi bữa"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Macro Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/[0.08] max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Tùy Chỉnh Mục Tiêu Calo & Đa Lượng ({GOAL_LABEL[profile.goal]})
              </h3>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Calo mục tiêu (kcal)</label>
                  <input
                    type="number"
                    value={overrideKcal}
                    placeholder={`Tự động: ${targetKcal}`}
                    onChange={(e) => setOverrideKcal(e.target.value)}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">TDEE Offset (kcal)</label>
                  <input
                    type="number"
                    step="50"
                    value={nutritionSettings.tdeeOffset}
                    onChange={(e) =>
                      onUpdateNutritionSettings({ tdeeOffset: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-rose-500">Đạm (g)</label>
                  <input
                    type="number"
                    value={overrideProtein}
                    placeholder={`Tự động: ${targets.protein}`}
                    onChange={(e) => setOverrideProtein(e.target.value)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-amber-500">Tinh bột (g)</label>
                  <input
                    type="number"
                    value={overrideCarbs}
                    placeholder={`Tự động: ${targets.carbs}`}
                    onChange={(e) => setOverrideCarbs(e.target.value)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-purple-500">Chất béo (g)</label>
                  <input
                    type="number"
                    value={overrideFat}
                    placeholder={`Tự động: ${targets.fat}`}
                    onChange={(e) => setOverrideFat(e.target.value)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-400">
                Để trống các ô trên nếu bạn muốn hệ thống tự động tính toán khoa học theo công thức Mifflin–St Jeor & TDEE.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  const updatedOverrides = { ...nutritionSettings.overrides };
                  delete updatedOverrides[profile.goal];
                  onUpdateNutritionSettings({ overrides: updatedOverrides, tdeeOffset: 0 });
                  setOverrideKcal('');
                  setOverrideProtein('');
                  setOverrideCarbs('');
                  setOverrideFat('');
                  setShowOverrideModal(false);
                }}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Khôi phục tự động
              </button>

              <button
                type="button"
                onClick={() => {
                  const updatedOverrides = { ...nutritionSettings.overrides };
                  const hasCustom = overrideKcal || overrideProtein || overrideCarbs || overrideFat;
                  if (hasCustom) {
                    updatedOverrides[profile.goal] = {
                      kcal: overrideKcal ? Number(overrideKcal) : undefined,
                      protein: overrideProtein ? Number(overrideProtein) : undefined,
                      carbs: overrideCarbs ? Number(overrideCarbs) : undefined,
                      fat: overrideFat ? Number(overrideFat) : undefined,
                    };
                  } else {
                    delete updatedOverrides[profile.goal];
                  }
                  onUpdateNutritionSettings({ overrides: updatedOverrides });
                  setShowOverrideModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Lưu Tùy Chỉnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vietnamese Food Catalog & Multiplier Modal */}
      {showFoodCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/[0.08] bg-linear-to-r from-emerald-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Thư Viện Món Ăn Việt & Thực Phẩm Thể Hình
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Tra cứu và nạp nhanh món ăn chuẩn định lượng calo & macro vào nhật ký
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFoodCatalogModal(false);
                  setSelectedCatalogFood(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controls: Search, Category Filter & Slot Selector */}
            <div className="p-4 border-b border-gray-100 dark:border-white/[0.08] space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Tìm món: phở bò, ức gà, cơm tấm, bún chả, whey, cá hồi..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Thêm vào:</span>
                  <select
                    value={catalogTargetSlot}
                    onChange={(e) => setCatalogTargetSlot(e.target.value as MealSlot)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold"
                  >
                    {MEAL_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {MEAL_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCatalogCategory('all')}
                  className={`px-3 py-1 rounded-lg whitespace-nowrap font-semibold cursor-pointer transition-colors ${
                    catalogCategory === 'all'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-white/[0.1]'
                  }`}
                >
                  Tất cả ({VIETNAMESE_FOOD_CATALOG.length})
                </button>
                {(
                  [
                    'pho_bun',
                    'rice_dish',
                    'protein',
                    'carbs',
                    'dairy_whey',
                    'veg_soup',
                    'drinks_snacks',
                  ] as FoodCategory[]
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={`px-3 py-1 rounded-lg whitespace-nowrap font-semibold cursor-pointer transition-colors ${
                      catalogCategory === cat
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-white/[0.1]'
                    }`}
                  >
                    {FOOD_CATEGORY_LABEL[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Không tìm thấy món ăn nào khớp với từ khóa "{catalogSearch}".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-gray-900/40 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all flex flex-col justify-between gap-2.5 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                            {item.name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0 font-medium">
                            {item.servingLabel}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.note}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 font-mono text-[11px]">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.kcalPerServing} kcal
                          </span>
                          <span className="text-gray-300 dark:text-gray-700">·</span>
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            P: {item.protein}g
                          </span>
                          <span className="text-gray-300 dark:text-gray-700">·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            C: {item.carbs}g
                          </span>
                          <span className="text-gray-300 dark:text-gray-700">·</span>
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            F: {item.fat}g
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/[0.08]">
                        <div className="flex items-center gap-1">
                          {[0.5, 1, 1.5, 2].map((mult) => (
                            <button
                              key={mult}
                              type="button"
                              onClick={() => handleAddCatalogFood(item, mult, catalogTargetSlot)}
                              className="px-2 py-1 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                              title={`Thêm ${mult}x suất`}
                            >
                              +{mult}x
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddCatalogFood(item, 1, catalogTargetSlot)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm 1 suất</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between text-xs text-gray-500">
              <span>Đang chọn nạp vào: <strong className="text-gray-800 dark:text-gray-200">{MEAL_LABEL[catalogTargetSlot]}</strong></span>
              <button
                type="button"
                onClick={() => setShowFoodCatalogModal(false)}
                className="px-4 py-1.5 rounded-xl border border-gray-300 dark:border-white/[0.1] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cronometer Advanced Micronutrients & Scores Modal */}
      {showCronometerDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#090306] border border-rose-500/40 rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col text-white animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white">
                      Cronometer Gold Standard
                    </span>
                    <span className="text-xs text-rose-300 font-mono font-bold">
                      Điểm Dinh Dưỡng Tổng: {cronoScores.overallNutritionScorePct}%
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    Bảng Phân Tích Vi Chất & Thang Điểm Phục Hồi ({selectedDate})
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCronometerDrawer(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Cronometer Nutrition Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              {/* Electrolyte Balance */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-400 mb-1">
                    <span>Cân Bằng Điện Giải</span>
                    <span className="font-mono text-base font-extrabold">{cronoScores.electrolyteScorePct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Độ phủ Kali + Natri + Magie và nước uống giúp chống chuột rút và tối đa áp suất thẩm thấu cơ.
                  </p>
                </div>
                <div className="mt-3">
                  <ProgressBar percent={cronoScores.electrolyteScorePct} color="#06B6D4" height={6} />
                </div>
              </div>

              {/* Muscle Recovery */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1">
                    <span>Phục Hồi Cơ Bắp</span>
                    <span className="font-mono text-base font-extrabold">{cronoScores.recoveryScorePct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Hợp chất Protein hoàn chỉnh, Leucine, Magie và Kẽm giúp tái tạo sợi cơ nạc sau buổi tập nặng.
                  </p>
                </div>
                <div className="mt-3">
                  <ProgressBar percent={cronoScores.recoveryScorePct} color="#E11D48" height={6} />
                </div>
              </div>

              {/* Vitality & Immunity */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                    <span>Sinh Lực & Miễn Dịch</span>
                    <span className="font-mono text-base font-extrabold">{cronoScores.vitalityScorePct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Vitamin C, Vitamin D3, Sắt và B12 bảo vệ hệ miễn dịch, năng lượng tế bào và nồng độ hormone.
                  </p>
                </div>
                <div className="mt-3">
                  <ProgressBar percent={cronoScores.vitalityScorePct} color="#F59E0B" height={6} />
                </div>
              </div>
            </div>

            {/* Detailed Micronutrient Breakdown Grid */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Mục Tiêu Vi Lượng Thiết Yếu (RDA / DRI Targets)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Minerals Column */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/[0.08] pb-1.5">
                    <span>Khoáng Chất & Điện Giải</span>
                  </div>

                  {/* Potassium */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Kali (Potassium)</span>
                      <span className="font-bold text-cyan-300">{cronoScores.potassiumMg} / {cronoScores.potassiumTargetMg} mg</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.potassiumMg / cronoScores.potassiumTargetMg) * 100))} color="#06B6D4" height={5} />
                  </div>

                  {/* Magnesium */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Magie (Magnesium)</span>
                      <span className="font-bold text-cyan-300">{cronoScores.magnesiumMg} / {cronoScores.magnesiumTargetMg} mg</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.magnesiumMg / cronoScores.magnesiumTargetMg) * 100))} color="#06B6D4" height={5} />
                  </div>

                  {/* Calcium */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Canxi (Calcium)</span>
                      <span className="font-bold text-cyan-300">{cronoScores.calciumMg} / {cronoScores.calciumTargetMg} mg</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.calciumMg / cronoScores.calciumTargetMg) * 100))} color="#06B6D4" height={5} />
                  </div>

                  {/* Zinc */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Kẽm (Zinc)</span>
                      <span className="font-bold text-cyan-300">{cronoScores.zincMg} / {cronoScores.zincTargetMg} mg</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.zincMg / cronoScores.zincTargetMg) * 100))} color="#06B6D4" height={5} />
                  </div>

                  {/* Iron */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Sắt (Iron)</span>
                      <span className="font-bold text-cyan-300">{cronoScores.ironMg} / {cronoScores.ironTargetMg} mg</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.ironMg / cronoScores.ironTargetMg) * 100))} color="#06B6D4" height={5} />
                  </div>
                </div>

                {/* Vitamins & Fatty Acids Column */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/[0.08] pb-1.5">
                    <span>Vitamins & Chất Béo Thiết Yếu</span>
                  </div>

                  {/* Vitamin D */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Vitamin D</span>
                      <span className="font-bold text-amber-300">{cronoScores.vitaminDIu} / {cronoScores.vitaminDTargetIu} IU</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.vitaminDIu / cronoScores.vitaminDTargetIu) * 100))} color="#F59E0B" height={5} />
                  </div>

                  {/* Vitamin C */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Vitamin C</span>
                      <span className="font-bold text-amber-300">{cronoScores.vitaminCMg} / {cronoScores.vitaminCTargetMg} mg</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.vitaminCMg / cronoScores.vitaminCTargetMg) * 100))} color="#F59E0B" height={5} />
                  </div>

                  {/* Vitamin B12 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Vitamin B12</span>
                      <span className="font-bold text-amber-300">{cronoScores.vitaminB12Mcg} / {cronoScores.vitaminB12TargetMcg} µg</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.vitaminB12Mcg / cronoScores.vitaminB12TargetMcg) * 100))} color="#F59E0B" height={5} />
                  </div>

                  {/* Omega-3 */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-300">Omega-3 (EPA/DHA)</span>
                      <span className="font-bold text-amber-300">{cronoScores.omega3Grams} / {cronoScores.omega3TargetGrams} g</span>
                    </div>
                    <ProgressBar percent={Math.min(100, Math.round((cronoScores.omega3Grams / cronoScores.omega3TargetGrams) * 100))} color="#F59E0B" height={5} />
                  </div>

                  {/* Dietary Note */}
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] text-gray-400 italic">
                    💡 Dữ liệu vi chất được tính toán & đối chiếu tự động theo cơ sở dữ liệu USDA & Viện Dinh Dưỡng Quốc Gia Việt Nam.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setShowCronometerDrawer(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
              >
                Đóng Bảng Vi Chất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Macro Modal */}
      <GeminiMacroModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onApplyGeminiMacros={handleApplyGeminiMacros}
        selectedDate={selectedDate}
        defaultSlot={selectedSlot}
      />
    </div>
  );
};


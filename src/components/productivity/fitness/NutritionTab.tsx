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
  Sliders,
  Droplets,
  X,
} from 'lucide-react';
import {
  CtgProfile,
  FoodItem,
  GOAL_LABEL,
  HealthDayLog,
  MEAL_LABEL,
  MealLog,
  MealSlot,
  NutritionSettings,
} from '../../../types/productivity';
import {
  calorieTarget,
  dayTotals,
  macroTargets,
  mealTotals,
  parseFoodText,
  tdee,
  todayString,
} from '../../../utils/fitnessMetrics';
import { Donut, ProgressBar, StackedBar } from '../../charts/SimpleCharts';

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
}

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

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
}) => {
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch');
  const [inputMode, setInputMode] = useState<'quick' | 'manual'>('quick');
  const [inputText, setInputText] = useState('');

  // Manual food form state
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('150');
  const [manualUnit, setManualUnit] = useState<'g' | 'ml'>('g');
  const [manualKcal, setManualKcal] = useState('220');
  const [manualProtein, setManualProtein] = useState('20');
  const [manualCarbs, setManualCarbs] = useState('25');
  const [manualFat, setManualFat] = useState('5');

  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Targets
  const userTdee = tdee(profile, userWeightKg);
  const targetKcal = calorieTarget(userTdee, profile.goal, nutritionSettings.tdeeOffset);
  const targets = macroTargets(targetKcal, userWeightKg, profile.goal, nutritionSettings);

  // Macro override form state
  const currentOverride = nutritionSettings.overrides[profile.goal];
  const [overrideKcal, setOverrideKcal] = useState(String(currentOverride?.kcal || ''));
  const [overrideProtein, setOverrideProtein] = useState(String(currentOverride?.protein || ''));
  const [overrideCarbs, setOverrideCarbs] = useState(String(currentOverride?.carbs || ''));
  const [overrideFat, setOverrideFat] = useState(String(currentOverride?.fat || ''));

  // Day totals
  const currentTotals = useMemo(() => dayTotals(meals, selectedDate), [meals, selectedDate]);

  // Water tracking for the day
  const currentDayLog = useMemo(
    () => healthLogs?.find((l) => l.date === selectedDate),
    [healthLogs, selectedDate]
  );
  const currentWaterMl = currentDayLog?.waterMl || 0;
  const targetWaterMl = 2500;

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

  const dayMeals = useMemo(
    () => meals.filter((m) => m.date === selectedDate),
    [meals, selectedDate]
  );

  return (
    <div className="space-y-6">
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

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
          <button
            onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Tùy chỉnh Macro</span>
          </button>
        </div>
      </div>

      {/* Headline Macro Cards with Iconic Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Macro Donut Ring Chart */}
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between gap-4">
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
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
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

      {/* Quick Water Tracker & TDEE Offset Adjuster */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Water Tracker */}
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-500" />
              Nạp Nước Trong Ngày ({selectedDate})
            </h3>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
              {currentWaterMl} / {targetWaterMl} ml
            </span>
          </div>

          <ProgressBar
            percent={Math.min(100, Math.round((currentWaterMl / targetWaterMl) * 100))}
            color="#06B6D4"
            height={7}
            className="mb-3"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddWater(250)}
              className="flex-1 py-2 px-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              +250ml Cốc
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(500)}
              className="flex-1 py-2 px-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              +500ml Chai
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(1000)}
              className="flex-1 py-2 px-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              +1L Bình
            </button>
            {currentWaterMl > 0 && (
              <button
                type="button"
                onClick={() => handleAddWater(-250)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs transition-colors cursor-pointer"
                title="Giảm 250ml"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick TDEE Offset */}
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              Hiệu Chỉnh Mục Tiêu Thâm Hụt / Dư Thừa (TDEE Offset)
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {nutritionSettings.tdeeOffset >= 0 ? `+${nutritionSettings.tdeeOffset}` : nutritionSettings.tdeeOffset} kcal
            </span>
          </div>

          <p className="text-[11px] text-gray-400 mb-3">
            Tăng giảm mức calo nạp hàng ngày so với mức tính toán lý thuyết để phù hợp với tốc độ siết hoặc xả thực tế.
          </p>

          <div className="grid grid-cols-5 gap-1.5">
            {[-200, -100, 0, 100, 200].map((offset) => (
              <button
                key={offset}
                type="button"
                onClick={() => onUpdateNutritionSettings({ tdeeOffset: offset })}
                className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center ${
                  nutritionSettings.tdeeOffset === offset
                    ? 'bg-[#ff6025] text-white font-bold'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {offset > 0 ? `+${offset}` : offset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Food Input Box: Tabs for NLP vs Manual Input */}
      <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Thêm Món Ăn Vào ({MEAL_LABEL[selectedSlot]})
            </h3>
          </div>

          {/* Toggle between NLP and Manual mode */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setInputMode('quick')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                inputMode === 'quick'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Nhập nhanh văn bản
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                inputMode === 'manual'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Nhập chi tiết thủ công
            </button>
          </div>
        </div>

        {/* Meal Slot Picker */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {MEAL_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                selectedSlot === slot
                  ? 'bg-[#ff6025] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {MEAL_LABEL[slot]}
            </button>
          ))}
        </div>

        {/* Mode 1: Quick NLP Input */}
        {inputMode === 'quick' ? (
          <form onSubmit={handleAddMeal} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ví dụ: 200g ức gà + 250g cơm trắng + 1 chuối hoặc 1 bát phở bò..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
              />
              <button
                type="submit"
                disabled={parsedPreview.length === 0}
                className="px-4 py-2.5 rounded-xl bg-[#ff6025] hover:bg-[#ff4400] disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors shadow-xs"
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
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
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
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                  <select
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value as 'g' | 'ml')}
                    className="text-xs px-1 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
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
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
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
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
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
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
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
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!manualName.trim() || Number(manualKcal) <= 0}
                className="px-4 py-2 rounded-xl bg-[#ff6025] hover:bg-[#ff4400] disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MEAL_SLOTS.map((slot) => {
            const slotMeals = dayMeals.filter((m) => m.slot === slot);
            const slotKcal = slotMeals.reduce((sum, m) => sum + mealTotals(m).kcal, 0);

            return (
              <div
                key={slot}
                className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-3">
                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
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
                            className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/80 space-y-2 text-xs"
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
                              <div className="divide-y divide-gray-200/60 dark:divide-gray-700/60 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
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
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
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
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
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
                    className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-amber-500">Tinh bột (g)</label>
                  <input
                    type="number"
                    value={overrideCarbs}
                    placeholder={`Tự động: ${targets.carbs}`}
                    onChange={(e) => setOverrideCarbs(e.target.value)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-purple-500">Chất béo (g)</label>
                  <input
                    type="number"
                    value={overrideFat}
                    placeholder={`Tự động: ${targets.fat}`}
                    onChange={(e) => setOverrideFat(e.target.value)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold"
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-400">
                Để trống các ô trên nếu bạn muốn hệ thống tự động tính toán khoa học theo công thức Mifflin–St Jeor & TDEE.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
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
                className="px-4 py-2 rounded-xl bg-[#ff6025] hover:bg-[#ff4400] text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Lưu Tùy Chỉnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


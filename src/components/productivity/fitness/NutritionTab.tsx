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
} from 'lucide-react';
import {
  CtgProfile,
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
  onDeleteMealLog,
  onUpdateNutritionSettings,
  healthLogs,
  onUpsertHealthLog,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch');
  const [inputText, setInputText] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Targets
  const userTdee = tdee(profile, userWeightKg);
  const targetKcal = calorieTarget(userTdee, profile.goal, nutritionSettings.tdeeOffset);
  const targets = macroTargets(targetKcal, userWeightKg, profile.goal, nutritionSettings);

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
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {offset > 0 ? `+${offset}` : offset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Meal Input Box with NLP Heuristic Parser */}
      <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Nhập Nhanh Món Ăn Bằng Văn Bản (Tự Động Bóc Tách Calo & Macro)
          </h3>
          <span className="text-[10px] text-gray-400">Hỗ trợ cơm, ức gà, bò, trứng, cá hồi, phở, yến mạch...</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {MEAL_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                selectedSlot === slot
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {MEAL_LABEL[slot]}
            </button>
          ))}
        </div>

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
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
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
                    <div className="space-y-2">
                      {slotMeals.map((meal) => {
                        const totals = mealTotals(meal);
                        return (
                          <div
                            key={meal.id}
                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/80 flex items-start justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-gray-800 dark:text-gray-200">
                                {meal.description}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                P: {Math.round(totals.protein)}g · C: {Math.round(totals.carbs)}g · F:{' '}
                                {Math.round(totals.fat)}g
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {totals.kcal} kcal
                              </span>
                              <button
                                onClick={() => onDeleteMealLog(meal.id)}
                                className="p-1 text-gray-300 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Tùy Chỉnh Calo & TDEE Offset
            </h3>

            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-400">
                TDEE Offset (Bù trừ kcal / ngày)
              </label>
              <input
                type="number"
                step="50"
                value={nutritionSettings.tdeeOffset}
                onChange={(e) =>
                  onUpdateNutritionSettings({ tdeeOffset: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
              <span className="text-[10px] text-gray-400">
                Tăng/giảm trực tiếp vào mức calo mục tiêu (vd: -200 nếu muốn thâm hụt sâu hơn).
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Đóng & Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


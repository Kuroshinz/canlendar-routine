import React, { useMemo, useState } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Sparkles,
  PieChart,
  ChevronRight,
  Info,
  Calendar,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  CtgProfile,
  GOAL_LABEL,
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
import { ProgressBar, StackedBar } from '../../charts/SimpleCharts';

interface NutritionTabProps {
  meals: MealLog[];
  profile: CtgProfile;
  userWeightKg: number;
  nutritionSettings: NutritionSettings;
  lang: 'vi' | 'en';
  onAddMealLog: (meal: Omit<MealLog, 'id' | 'createdAt'>) => MealLog;
  onDeleteMealLog: (id: string) => void;
  onUpdateNutritionSettings: (patch: Partial<NutritionSettings>) => void;
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

      {/* Headline Macro Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tổng Calo Nạp</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {currentTotals.kcal}{' '}
            <span className="text-xs font-normal text-gray-400">/ {targets.kcal} kcal</span>
          </div>
          <div className="mt-2">
            <ProgressBar
              percent={targets.kcal > 0 ? Math.round((currentTotals.kcal / targets.kcal) * 100) : 0}
              color={currentTotals.kcal > targets.kcal ? '#E11D48' : '#059669'}
              height={5}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Protein (Chất đạm)</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {Math.round(currentTotals.protein)}{' '}
            <span className="text-xs font-normal text-gray-400">/ {targets.protein} g</span>
          </div>
          <div className="mt-2">
            <ProgressBar
              percent={targets.protein > 0 ? Math.round((currentTotals.protein / targets.protein) * 100) : 0}
              color="#E11D48"
              height={5}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Carbs (Tinh bột)</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {Math.round(currentTotals.carbs)}{' '}
            <span className="text-xs font-normal text-gray-400">/ {targets.carbs} g</span>
          </div>
          <div className="mt-2">
            <ProgressBar
              percent={targets.carbs > 0 ? Math.round((currentTotals.carbs / targets.carbs) * 100) : 0}
              color="#F59E0B"
              height={5}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Fat (Chất béo)</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {Math.round(currentTotals.fat)}{' '}
            <span className="text-xs font-normal text-gray-400">/ {targets.fat} g</span>
          </div>
          <div className="mt-2">
            <ProgressBar
              percent={targets.fat > 0 ? Math.round((currentTotals.fat / targets.fat) * 100) : 0}
              color="#8E24AA"
              height={5}
            />
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


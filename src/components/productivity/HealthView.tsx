import React, { useMemo, useState } from 'react';
import {
  HeartPulse,
  Footprints,
  Droplets,
  Moon,
  Flame,
  Scale,
  Dumbbell,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
  X,
  Activity,
  Utensils,
  User,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  BodyCheckPhoto,
  BodyPoint,
  CtgProfile,
  Exercise,
  HealthDayLog,
  HealthProfile,
  HealthSource,
  MealLog,
  NutritionSettings,
  PlannedSession,
  RoutineSplitTemplate,
  SavedRoadmap,
  SportSession,
  WorkoutLog,
  WorkoutSession,
  WorkoutType,
} from '../../types/productivity';
import {
  DEFAULT_NUTRITION_SETTINGS,
  SEED_BODY_POINTS,
  SEED_CTG_PROFILE,
  SEED_MEALS,
  SEED_PLANNED_SESSIONS,
  SEED_SPORTS,
  SEED_WORKOUT_SESSIONS,
} from '../../data/productivitySeed';
import { LineChart, ProgressBar, StackedBar } from '../charts/SimpleCharts';
import {
  bmi,
  bmiLabel,
  healthAverages,
  macroCalories,
  macroPercentages,
  weightTrend,
  workoutMinutesThisWeek,
} from '../../utils/productivityUtils';
import { calculateDailyHealthScore } from '../../utils/fitnessMetrics';
import { formatDateString } from '../../utils/calendarUtils';
import { InBodyTab } from './fitness/InBodyTab';
import { TrainingTab } from './fitness/TrainingTab';
import { NutritionTab } from './fitness/NutritionTab';
import { ProfileTab } from './fitness/ProfileTab';
import { RoadmapTab } from './fitness/RoadmapTab';

export interface HealthViewProps {
  healthLogs: HealthDayLog[];
  healthProfile: HealthProfile;
  workouts: WorkoutLog[];
  lang: 'vi' | 'en';
  onUpsertHealthLog: (log: HealthDayLog) => void;
  onUpdateHealthProfile: (patch: Partial<HealthProfile>) => void;
  onAddWorkout: (w: Omit<WorkoutLog, 'id' | 'createdAt'>) => void;
  onDeleteWorkout: (id: string) => void;
  // Google Account integration
  currentUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onGoogleSignIn?: () => Promise<void>;
  // CTG Fitness additions
  ctgProfile?: CtgProfile;
  onUpdateCtgProfile?: (patch: Partial<CtgProfile>) => void;
  bodyPoints?: BodyPoint[];
  onAddBodyPoint?: (point: Omit<BodyPoint, 'id' | 'createdAt'>) => BodyPoint;
  onUpdateBodyPoint?: (id: string, patch: Partial<BodyPoint>) => void;
  onDeleteBodyPoint?: (id: string) => void;
  bodyPhotos?: BodyCheckPhoto[];
  onAddBodyPhoto?: (photo: Omit<BodyCheckPhoto, 'id' | 'createdAt'>) => BodyCheckPhoto;
  onDeleteBodyPhoto?: (id: string) => void;
  savedRoadmaps?: SavedRoadmap[];
  onAddSavedRoadmap?: (roadmap: Omit<SavedRoadmap, 'id' | 'createdAt'>) => SavedRoadmap;
  onDeleteSavedRoadmap?: (id: string) => void;
  customExercises?: Exercise[];
  onAddCustomExercise?: (exercise: Omit<Exercise, 'id'>) => Exercise;
  onDeleteCustomExercise?: (id: string) => void;
  onApplySplitTemplate?: (template: RoutineSplitTemplate) => void;
  plannedSessions?: PlannedSession[];
  onAddPlannedSession?: (session: PlannedSession) => void;
  onUpdatePlannedSession?: (session: PlannedSession) => void;
  onDeletePlannedSession?: (id: string) => void;
  workoutSessions?: WorkoutSession[];
  onLogWorkoutSession?: (w: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  onUpdateWorkoutSession?: (session: WorkoutSession) => void;
  onDeleteWorkoutSession?: (id: string) => void;
  sportSessions?: SportSession[];
  onAddSportSession?: (s: Omit<SportSession, 'id' | 'createdAt'>) => SportSession;
  onDeleteSportSession?: (id: string) => void;
  meals?: MealLog[];
  onAddMealLog?: (m: Omit<MealLog, 'id' | 'createdAt'>) => MealLog;
  onUpdateMealLog?: (id: string, patch: Partial<MealLog>) => void;
  onDeleteMealLog?: (id: string) => void;
  nutritionSettings?: NutritionSettings;
  onUpdateNutritionSettings?: (patch: Partial<NutritionSettings>) => void;
  onScheduleSessionToCalendar?: (title: string, date: string, color: string) => void;
}

type SubTab = 'overview' | 'roadmap' | 'inbody' | 'training' | 'nutrition' | 'profile';

const WORKOUT_TYPES: { id: WorkoutType; labelVi: string; labelEn: string; color: string }[] = [
  { id: 'strength', labelVi: 'Sức mạnh', labelEn: 'Strength', color: '#3F51B5' },
  { id: 'cardio', labelVi: 'Cardio', labelEn: 'Cardio', color: '#F4511E' },
  { id: 'flexibility', labelVi: 'Dẻo dai', labelEn: 'Flexibility', color: '#33B679' },
  { id: 'sport', labelVi: 'Thể thao', labelEn: 'Sport', color: '#8E24AA' },
];

const emptyLog = (date: string): HealthDayLog => ({ date, source: 'manual' });

export const HealthView: React.FC<HealthViewProps> = ({
  healthLogs,
  healthProfile,
  workouts,
  lang,
  onUpsertHealthLog,
  onUpdateHealthProfile,
  onAddWorkout,
  onDeleteWorkout,
  currentUser,
  onGoogleSignIn,
  ctgProfile = SEED_CTG_PROFILE,
  onUpdateCtgProfile = () => {},
  bodyPoints = SEED_BODY_POINTS,
  onAddBodyPoint = (p) => ({ ...p, id: 'tmp', createdAt: Date.now() }),
  onUpdateBodyPoint = () => {},
  onDeleteBodyPoint = () => {},
  bodyPhotos = [],
  onAddBodyPhoto = (p) => ({ ...p, id: 'tmp', createdAt: Date.now() }),
  onDeleteBodyPhoto = () => {},
  savedRoadmaps = [],
  onAddSavedRoadmap = (r) => ({ ...r, id: 'tmp', createdAt: Date.now() }),
  onDeleteSavedRoadmap = () => {},
  customExercises = [],
  onAddCustomExercise = (e) => ({ ...e, id: 'tmp', isCustom: true }),
  onDeleteCustomExercise = () => {},
  onApplySplitTemplate = () => {},
  plannedSessions = SEED_PLANNED_SESSIONS,
  onAddPlannedSession = () => {},
  onUpdatePlannedSession = () => {},
  onDeletePlannedSession = () => {},
  workoutSessions = SEED_WORKOUT_SESSIONS,
  onLogWorkoutSession = (w) => ({ ...w, id: 'tmp' }),
  onUpdateWorkoutSession = () => {},
  onDeleteWorkoutSession = () => {},
  sportSessions = SEED_SPORTS,
  onAddSportSession = (s) => ({ ...s, id: 'tmp', createdAt: Date.now() }),
  onDeleteSportSession = () => {},
  meals = SEED_MEALS,
  onAddMealLog = (m) => ({ ...m, id: 'tmp', createdAt: Date.now() }),
  onUpdateMealLog = () => {},
  onDeleteMealLog = () => {},
  nutritionSettings = DEFAULT_NUTRITION_SETTINGS,
  onUpdateNutritionSettings = () => {},
  onScheduleSessionToCalendar,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const today = formatDateString(new Date());
  const todayLog = useMemo(
    () => healthLogs.find((l) => l.date === today) || emptyLog(today),
    [healthLogs, today]
  );

  const [selectedDate, setSelectedDate] = useState(today);
  const selectedLog = useMemo(
    () => healthLogs.find((l) => l.date === selectedDate) || emptyLog(selectedDate),
    [healthLogs, selectedDate]
  );

  const [showWorkoutForm, setShowWorkoutForm] = useState(false);

  // --- Workout form state
  const [woName, setWoName] = useState('');
  const [woType, setWoType] = useState<WorkoutType>('strength');
  const [woDuration, setWoDuration] = useState('45');
  const [woSets, setWoSets] = useState('');
  const [woReps, setWoReps] = useState('');
  const [woCalories, setWoCalories] = useState('');

  const averages = useMemo(() => healthAverages(healthLogs, 7), [healthLogs]);
  const trend = useMemo(() => weightTrend(healthLogs, 30), [healthLogs]);
  const weeklyWorkoutMinutes = useMemo(() => workoutMinutesThisWeek(workouts), [workouts]);

  const currentBmi = bmi(selectedLog.weightKg || 0, healthProfile.heightCm);
  const macros = macroPercentages(selectedLog.protein || 0, selectedLog.carbs || 0, selectedLog.fat || 0);
  const macroTotal = macroCalories(selectedLog.protein || 0, selectedLog.carbs || 0, selectedLog.fat || 0);

  const healthScore = useMemo(() => {
    return calculateDailyHealthScore(
      selectedLog,
      healthProfile.dailySteps || 8000,
      healthProfile.dailyWaterMl || 2500,
      2000,
      140
    );
  }, [selectedLog, healthProfile]);

  const patchLog = (patch: Partial<HealthDayLog>) => {
    onUpsertHealthLog({ ...selectedLog, ...patch, date: selectedDate, source: 'manual' });
  };

  const numericInput = (
    key: keyof HealthDayLog,
    label: string,
    unit: string,
    step: number = 1,
    placeholder?: string
  ) => {
    const raw = selectedLog[key] as number | undefined;
    return (
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        <div className="mt-1 flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            step={step}
            value={raw === undefined || raw === null ? '' : raw}
            placeholder={placeholder}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : Number(e.target.value);
              patchLog({ [key]: v } as Partial<HealthDayLog>);
            }}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold"
          />
          <span className="text-[10px] text-gray-400 shrink-0 w-8">{unit}</span>
        </div>
      </label>
    );
  };

  const handleSubmitWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woName.trim()) return;
    onAddWorkout({
      date: selectedDate,
      name: woName.trim(),
      type: woType,
      durationMin: Number(woDuration) || 0,
      sets: woSets ? Number(woSets) : undefined,
      reps: woReps ? Number(woReps) : undefined,
      caloriesBurned: woCalories ? Number(woCalories) : undefined,
    });
    setWoName('');
    setWoDuration('45');
    setWoSets('');
    setWoReps('');
    setWoCalories('');
    setShowWorkoutForm(false);
  };

  const metricCards = [
    {
      label: lang === 'vi' ? 'Số bước chân' : 'Steps',
      value: (selectedLog.steps || 0).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US'),
      hint: `/ ${healthProfile.dailySteps.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}`,
      percent: healthProfile.dailySteps > 0 ? Math.round(((selectedLog.steps || 0) / healthProfile.dailySteps) * 100) : 0,
      icon: Footprints,
      color: '#039BE5',
      cls: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40',
    },
    {
      label: lang === 'vi' ? 'Nước uống' : 'Water',
      value: `${selectedLog.waterMl || 0}`,
      hint: `ml / ${healthProfile.dailyWaterMl} ml`,
      percent:
        healthProfile.dailyWaterMl > 0 ? Math.round(((selectedLog.waterMl || 0) / healthProfile.dailyWaterMl) * 100) : 0,
      icon: Droplets,
      color: '#29B6F6',
      cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: lang === 'vi' ? 'Giấc ngủ' : 'Sleep',
      value: `${selectedLog.sleepHours || 0}`,
      hint: `h / ${healthProfile.dailySleepHours} h`,
      percent:
        healthProfile.dailySleepHours > 0
          ? Math.round(((selectedLog.sleepHours || 0) / healthProfile.dailySleepHours) * 100)
          : 0,
      icon: Moon,
      color: '#7986CB',
      cls: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      label: lang === 'vi' ? 'Calo tiêu thụ' : 'Calories burned',
      value: `${selectedLog.caloriesBurned || 0}`,
      hint: lang === 'vi' ? 'kcal hôm nay' : 'kcal today',
      percent: 0,
      icon: Flame,
      color: '#F4511E',
      cls: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40',
    },
  ];

  const recentWorkouts = useMemo(
    () => [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 8),
    [workouts]
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-[#0b101b] p-4 md:p-6 lg:p-8 select-none">
      {/* VortexCal Brand Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-2xl md:text-3xl tracking-tight text-slate-900 dark:text-white">
              Vortex<span className="text-blue-600 dark:text-blue-400">Cal</span>
            </span>
            <span className="text-[10px] font-extrabold tracking-wider uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full">
              HEALTH & MACRO
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'vi'
              ? 'Ăn món Việt, vẫn xuống mỡ — Lộ trình tập luyện & dinh dưỡng cá nhân hóa quanh cơm tấm, bún phở.'
              : 'Vietnamese diet fitness — Personalized training & nutrition roadmap with Google Calendar integration.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
            {lang === 'vi' ? 'Hôm nay' : 'Today'}
          </button>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            {lang === 'vi' ? 'Tự nhập liệu' : 'Manual Track'}
          </span>
        </div>
      </div>

      {/* Multitasking Sub-Tabs Sticky Bar */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0b101b]/95 backdrop-blur-md pt-2 pb-3 mb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5">
          {[
            { id: 'overview', label: lang === 'vi' ? 'Tổng quan & Chỉ số' : 'Overview & Logs', icon: HeartPulse },
            { id: 'roadmap', label: lang === 'vi' ? 'Định hướng lộ trình' : 'Roadmap & AI', icon: Compass },
            { id: 'inbody', label: lang === 'vi' ? 'Tiến độ & Check Body' : 'Progress & Body Check', icon: Scale },
            { id: 'training', label: lang === 'vi' ? 'Giáo án & Buổi tập' : 'Workouts & Mesocycle', icon: Dumbbell },
            { id: 'nutrition', label: lang === 'vi' ? 'Dinh dưỡng & Món Việt' : 'Nutrition & Meals', icon: Utensils },
            { id: 'profile', label: lang === 'vi' ? 'Hồ sơ của tôi' : 'My Profile', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as SubTab)}
                className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold leading-none transition-all cursor-pointer shrink-0 shadow-2xs ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                    : 'bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSubTab === 'roadmap' && (
        <RoadmapTab
          profile={ctgProfile}
          lang={lang}
          savedRoadmaps={savedRoadmaps}
          onAddSavedRoadmap={onAddSavedRoadmap}
          onDeleteSavedRoadmap={onDeleteSavedRoadmap}
          nutritionSettings={nutritionSettings}
          onUpdateNutritionSettings={onUpdateNutritionSettings}
          onUpdateProfile={onUpdateCtgProfile}
          onNavigateTab={(tab) => setActiveSubTab(tab as SubTab)}
        />
      )}

      {activeSubTab === 'inbody' && (
        <InBodyTab
          points={bodyPoints}
          profile={ctgProfile}
          bodyPhotos={bodyPhotos}
          lang={lang}
          onAddPoint={onAddBodyPoint}
          onUpdatePoint={onUpdateBodyPoint}
          onDeletePoint={onDeleteBodyPoint}
          onAddBodyPhoto={onAddBodyPhoto}
          onDeleteBodyPhoto={onDeleteBodyPhoto}
        />
      )}

      {activeSubTab === 'training' && (
        <TrainingTab
          plannedSessions={plannedSessions}
          workoutSessions={workoutSessions}
          sportSessions={sportSessions}
          userWeightKg={selectedLog.weightKg || ctgProfile.targetWeightKg}
          customExercises={customExercises}
          onAddCustomExercise={onAddCustomExercise}
          onDeleteCustomExercise={onDeleteCustomExercise}
          onApplySplitTemplate={onApplySplitTemplate}
          lang={lang}
          onLogWorkoutSession={onLogWorkoutSession}
          onUpdateWorkoutSession={onUpdateWorkoutSession}
          onDeleteWorkoutSession={onDeleteWorkoutSession}
          onAddSportSession={onAddSportSession}
          onDeleteSportSession={onDeleteSportSession}
          onAddPlannedSession={onAddPlannedSession}
          onUpdatePlannedSession={onUpdatePlannedSession}
          onDeletePlannedSession={onDeletePlannedSession}
          onScheduleSessionToCalendar={onScheduleSessionToCalendar}
        />
      )}

      {activeSubTab === 'nutrition' && (
        <NutritionTab
          meals={meals}
          profile={ctgProfile}
          userWeightKg={selectedLog.weightKg || ctgProfile.targetWeightKg}
          nutritionSettings={nutritionSettings}
          lang={lang}
          onAddMealLog={onAddMealLog}
          onUpdateMealLog={onUpdateMealLog}
          onDeleteMealLog={onDeleteMealLog}
          onUpdateNutritionSettings={onUpdateNutritionSettings}
          healthLogs={healthLogs}
          onUpsertHealthLog={onUpsertHealthLog}
        />
      )}

      {activeSubTab === 'profile' && (
        <ProfileTab
          profile={ctgProfile}
          currentUser={currentUser}
          onGoogleSignIn={onGoogleSignIn}
          lang={lang}
          onUpdateProfile={onUpdateCtgProfile}
        />
      )}

      {activeSubTab === 'overview' && (
        <>
          {/* Daily Health Score Banner */}
      <div className="bg-white dark:bg-[#131b2e] p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* Big Score Badge */}
          <div
            className="w-18 h-18 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-md font-mono"
            style={{ backgroundColor: healthScore.badgeColor }}
          >
            <span className="text-2xl font-black leading-none">{healthScore.score}</span>
            <span className="text-[10px] font-semibold opacity-90 mt-0.5">/ 100 ĐIỂM</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: healthScore.badgeColor }}
              >
                {healthScore.statusLabel}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Chỉ số sức khỏe tổng hợp ngày {selectedDate}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {healthScore.score >= 85
                ? 'Tuyệt vời! Bạn đang duy trì lối sống đỉnh cao.'
                : healthScore.score >= 70
                  ? 'Rất tốt! Tiến độ rèn luyện & dinh dưỡng đang đi đúng hướng.'
                  : healthScore.score >= 50
                    ? 'Khá tốt! Hãy nạp thêm nước hoặc vận động nhẹ để tối ưu điểm số.'
                    : 'Hãy hoàn thành các mục tiêu bước chân, nước và giấc ngủ hôm nay!'}
            </h3>
          </div>
        </div>

        {/* 4 Score Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 md:min-w-[420px]">
          {healthScore.breakdown.map((item) => (
            <div
              key={item.title}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-semibold truncate">{item.title.split(' ')[0]}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {item.score}/{item.max}
                </span>
              </div>
              <ProgressBar percent={item.pct} color={healthScore.badgeColor} height={4} className="mb-1.5" />
              <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate font-mono">
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-[#131b2e] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.cls}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    {card.label}
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {card.value}
                    <span className="text-[10px] font-normal text-slate-400 ml-1">{card.hint}</span>
                  </div>
                </div>
              </div>
              {card.percent > 0 && (
                <div className="mt-2.5">
                  <ProgressBar percent={card.percent} color={card.color} height={5} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: manual inputs */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === 'vi' ? `Chỉ số ngày ${selectedDate}` : `Metrics for ${selectedDate}`}
              </h3>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  selectedLog.source === 'google-fit'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : selectedLog.source === 'mock'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {selectedLog.source === 'google-fit'
                  ? 'Google Fit'
                  : selectedLog.source === 'mock'
                    ? lang === 'vi'
                      ? 'Mô phỏng'
                      : 'Mock'
                    : lang === 'vi'
                      ? 'Nhập tay'
                      : 'Manual'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {numericInput('weightKg', lang === 'vi' ? 'Cân nặng' : 'Weight', 'kg', 0.1, '67.5')}
              {numericInput('caloriesIn', lang === 'vi' ? 'Calo nạp' : 'Calories in', 'kcal', 10, '2200')}
              {numericInput('caloriesBurned', lang === 'vi' ? 'Calo đốt' : 'Calories out', 'kcal', 10, '2400')}
              {numericInput('sleepHours', lang === 'vi' ? 'Giấc ngủ' : 'Sleep', 'h', 0.1, '7.5')}
              {numericInput('steps', lang === 'vi' ? 'Số bước' : 'Steps', 'b', 100, '8000')}
              {numericInput('waterMl', lang === 'vi' ? 'Nước' : 'Water', 'ml', 50, '2500')}
            </div>

            <div className="flex items-center gap-2 mt-3">
              {[250, 500].map((delta) => (
                <button
                  key={delta}
                  onClick={() => patchLog({ waterMl: Math.max(0, (selectedLog.waterMl || 0) + delta) })}
                  className="flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-950/70 cursor-pointer"
                >
                  +{delta} ml
                </button>
              ))}
              <button
                onClick={() => patchLog({ steps: Math.max(0, (selectedLog.steps || 0) + 1000) })}
                className="flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70 cursor-pointer"
              >
                +1.000 {lang === 'vi' ? 'bước' : 'steps'}
              </button>
              <button
                onClick={() => patchLog({ waterMl: 0 })}
                className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {lang === 'vi' ? 'Đặt lại' : 'Reset'}
              </button>
            </div>
          </div>

          {/* Macros */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {lang === 'vi' ? 'Macros (Protein / Carbs / Fat)' : 'Macros (Protein / Carbs / Fat)'}
            </h3>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { key: 'protein' as const, label: 'Protein', color: '#E11D48' },
                { key: 'carbs' as const, label: 'Carbs', color: '#F59E0B' },
                { key: 'fat' as const, label: 'Fat', color: '#8E24AA' },
              ].map((m) => (
                <label key={m.key} className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: m.color }}>
                    {m.label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={selectedLog[m.key] === undefined ? '' : selectedLog[m.key]}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : Number(e.target.value);
                      patchLog({ [m.key]: v } as Partial<HealthDayLog>);
                    }}
                    className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </label>
              ))}
            </div>

            <StackedBar
              segments={[
                { value: selectedLog.protein || 0, color: '#E11D48', label: 'Protein' },
                { value: selectedLog.carbs || 0, color: '#F59E0B', label: 'Carbs' },
                { value: selectedLog.fat || 0, color: '#8E24AA', label: 'Fat' },
              ]}
              height={10}
            />

            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
              <span>
                {macros.protein}% · {macros.carbs}% · {macros.fat}%
              </span>
              <span className="font-mono">
                {macroTotal > 0 ? `${macroTotal} kcal` : lang === 'vi' ? 'Chưa nhập' : 'No data'}
              </span>
            </div>
          </div>

          {/* BMI / profile */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              {lang === 'vi' ? 'Chỉ số cơ thể' : 'Body metrics'}
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex flex-col items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{currentBmi || '—'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  BMI · {bmiLabel(currentBmi, lang)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {lang === 'vi' ? 'Chiều cao' : 'Height'} {healthProfile.heightCm} cm ·{' '}
                  {lang === 'vi' ? 'Mục tiêu' : 'Target'} {healthProfile.targetWeightKg || '—'} kg
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={100}
                    step={1}
                    value={healthProfile.heightCm}
                    onChange={(e) => onUpdateHealthProfile({ heightCm: Number(e.target.value) || 0 })}
                    className="w-20 text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <span className="text-[10px] text-slate-400">cm</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={healthProfile.targetWeightKg ?? ''}
                    onChange={(e) => onUpdateHealthProfile({ targetWeightKg: Number(e.target.value) || undefined })}
                    className="w-20 text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <span className="text-[10px] text-slate-400">kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: charts + workouts */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === 'vi' ? 'Xu hướng cân nặng (30 ngày)' : 'Weight trend (30 days)'}
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {lang === 'vi' ? 'TB 7 ngày' : '7-day avg'}: {averages.steps.toLocaleString()} b ·{' '}
                {averages.sleepHours}h
              </span>
            </div>
            <LineChart
              data={trend.map((row) => ({ label: row.date.slice(5), value: row.weightKg }))}
              height={150}
              color="#E11D48"
              formatValue={(v) => `${v} kg`}
              emptyLabel={lang === 'vi' ? 'Chưa có dữ liệu cân nặng' : 'No weight data'}
            />
          </div>

          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Lịch sử tập luyện' : 'Workout log'}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">
                  {lang === 'vi' ? 'Tuần này' : 'This week'}: {weeklyWorkoutMinutes} min
                </span>
                <button
                  onClick={() => setShowWorkoutForm((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {lang === 'vi' ? 'Thêm' : 'Add'}
                </button>
              </div>
            </div>

            {showWorkoutForm && (
              <form onSubmit={handleSubmitWorkout} className="mb-3 p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <input
                    className="col-span-2 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    placeholder={lang === 'vi' ? 'Tên bài tập' : 'Workout name'}
                    value={woName}
                    onChange={(e) => setWoName(e.target.value)}
                  />
                  <select
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    value={woType}
                    onChange={(e) => setWoType(e.target.value as WorkoutType)}
                  >
                    {WORKOUT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {lang === 'vi' ? t.labelVi : t.labelEn}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    placeholder="min"
                    value={woDuration}
                    onChange={(e) => setWoDuration(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    placeholder="sets"
                    value={woSets}
                    onChange={(e) => setWoSets(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    placeholder="reps"
                    value={woReps}
                    onChange={(e) => setWoReps(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    className="col-span-2 md:col-span-1 text-xs px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    placeholder="kcal"
                    value={woCalories}
                    onChange={(e) => setWoCalories(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="col-span-2 md:col-span-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    {lang === 'vi' ? 'Lưu' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWorkoutForm(false)}
                    className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-[11px] font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {recentWorkouts.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                {lang === 'vi' ? 'Chưa có buổi tập nào.' : 'No workouts logged yet.'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800 -mx-4">
                {recentWorkouts.map((wo) => {
                  const meta = WORKOUT_TYPES.find((t) => t.id === wo.type) || WORKOUT_TYPES[0];
                  return (
                    <div key={wo.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-gray-50 dark:hover:bg-[#1e293b]">
                      <span
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                      >
                        <Activity className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{wo.name}</div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {wo.date} · {lang === 'vi' ? meta.labelVi : meta.labelEn} · {wo.durationMin} min
                          {wo.sets ? ` · ${wo.sets}×${wo.reps || 0}` : ''}
                          {wo.caloriesBurned ? ` · ${wo.caloriesBurned} kcal` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteWorkout(wo.id)}
                        className="p-1 rounded-lg text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        aria-label={lang === 'vi' ? 'Xóa buổi tập' : 'Delete workout'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              {lang === 'vi' ? 'Theo dõi thể hình & sức khỏe' : 'Personal Health & Fitness Tracking'}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              {lang === 'vi'
                ? 'Nhập các chỉ số bước chân, calo tiêu thụ, giấc ngủ, lượng nước và cân nặng hàng ngày trực tiếp vào bảng bên trên để hệ thống tự động tính điểm sức khỏe tổng hợp và vẽ biểu đồ tiến độ chính xác.'
                : 'Log daily steps, calories burned, sleep, water, and weight directly above to compute your daily health score.'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(['steps', 'caloriesBurned', 'waterMl', 'sleepHours', 'weightKg'] as const).map((k) => (
                <span
                  key={k}
                  className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono font-semibold"
                >
                  ✓ {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export type { HealthSource };


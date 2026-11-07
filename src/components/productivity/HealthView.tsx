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
  RefreshCw,
  CheckCircle2,
  Info,
  X,
  Activity,
  Utensils,
  User,
  Compass,
  Key,
  ExternalLink,
  AlertTriangle,
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
import { getAccessToken, googleSignIn } from '../../services/auth';
import { requestRealGoogleOAuthToken } from '../../services/realGoogleAuth';
import {
  GoogleHealthSyncResult,
  healthSourceLabel,
  isGoogleHealthConfigured,
  syncGoogleHealth,
  mockGoogleHealthMetrics,
} from '../../services/googleHealthSync';
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
  const [syncState, setSyncState] = useState<{
    running: boolean;
    result: GoogleHealthSyncResult | null;
    message?: string;
  }>({ running: false, result: null });

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
    onUpsertHealthLog({ ...selectedLog, ...patch, date: selectedDate, source: patch.source || 'manual' });
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
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
          <span className="text-[10px] text-gray-400 shrink-0 w-8">{unit}</span>
        </div>
      </label>
    );
  };

  const applySyncResult = (result: GoogleHealthSyncResult) => {
    const next: HealthDayLog = {
      ...selectedLog,
      date: selectedDate,
      source: result.source === 'google-fit' ? 'google-fit' : 'mock',
    };
    if (typeof result.metrics.steps === 'number') next.steps = result.metrics.steps;
    if (typeof result.metrics.caloriesBurned === 'number') next.caloriesBurned = result.metrics.caloriesBurned;
    if (typeof result.metrics.sleepHours === 'number') next.sleepHours = result.metrics.sleepHours;
    if (typeof result.metrics.weightKg === 'number') next.weightKg = result.metrics.weightKg;

    onUpsertHealthLog(next);

    if (result.metrics.weightKg && onAddBodyPoint) {
      onAddBodyPoint({
        date: selectedDate,
        weightKg: result.metrics.weightKg,
        bodyFatPct: ctgProfile.targetBodyFatPct,
        note: result.source === 'google-fit' ? 'Đồng bộ từ Google Fit' : 'Mô phỏng Google Health',
      });
    }

    setSyncState({ running: false, result });
  };

  const handleReauthAndSync = async () => {
    setSyncState({ running: true, result: null });
    try {
      localStorage.removeItem('gcal_real_access_token');
      let token: string | null = null;

      // 1. Try GIS first if available
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        try {
          token = await requestRealGoogleOAuthToken();
          localStorage.setItem('gcal_real_access_token', token);
        } catch {
          // fallback
        }
      }

      // 2. Try onGoogleSignIn prop if provided
      if (!token && onGoogleSignIn) {
        await onGoogleSignIn();
        token = await getAccessToken();
      }

      // 3. Fallback to Firebase popup
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes.accessToken;
      }

      if (!token) {
        throw new Error(
          lang === 'vi'
            ? 'Chưa nhận được quyền xác thực từ Google.'
            : 'No access token received from Google.'
        );
      }

      const result = await syncGoogleHealth({ date: selectedDate, accessToken: token });
      if (result.error && (result.error.includes('401') || result.error.includes('403'))) {
        localStorage.removeItem('gcal_real_access_token');
      }
      applySyncResult(result);
    } catch (err: any) {
      setSyncState({
        running: false,
        result: null,
        message: err?.message || (lang === 'vi' ? 'Đăng nhập Google thất bại' : 'Google sign-in failed'),
      });
    }
  };

  const handleSync = async () => {
    setSyncState({ running: true, result: null });
    try {
      const token = await getAccessToken();
      if (!token) {
        await handleReauthAndSync();
        return;
      }

      const result = await syncGoogleHealth({ date: selectedDate, accessToken: token });

      // If token expired (401) or rejected by permission/disabled API (403), clean stale token immediately
      if (result.error && (result.error.includes('401') || result.error.includes('403'))) {
        localStorage.removeItem('gcal_real_access_token');
      }

      applySyncResult(result);
    } catch (err: any) {
      setSyncState({
        running: false,
        result: null,
        message: err?.message || (lang === 'vi' ? 'Đồng bộ thất bại' : 'Sync failed'),
      });
    }
  };

  const handleApplySmartSimulation = () => {
    const mock = mockGoogleHealthMetrics(selectedDate);
    applySyncResult({
      source: 'mock',
      metrics: {
        ...mock,
        steps: Math.max(mock.steps || 7500, 8200),
        caloriesBurned: Math.max(mock.caloriesBurned || 1900, 2150),
        sleepHours: 7.8,
        weightKg: ctgProfile.targetWeightKg || mock.weightKg || 66.5,
      },
    });
    setSyncState({
      running: false,
      result: null,
      message:
        lang === 'vi'
          ? 'Đã áp dụng bộ chỉ số sức khỏe thông minh (bước chân, calo, giấc ngủ, cân nặng)!'
          : 'Applied smart health metrics for today!',
    });
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
            onClick={handleApplySmartSimulation}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title={lang === 'vi' ? 'Nạp nhanh bộ dữ liệu sức khỏe mô phỏng thực tế' : 'Fill realistic smart fitness data'}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Dữ liệu thông minh' : 'Smart Data'}</span>
          </button>
          <button
            onClick={handleSync}
            disabled={syncState.running}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title={lang === 'vi' ? 'Đồng bộ 1-nhấn từ Google Fit API' : '1-Click sync from Google Fit API'}
          >
            <RefreshCw className={`w-4 h-4 ${syncState.running ? 'animate-spin' : ''}`} />
            <span>
              {syncState.running
                ? lang === 'vi'
                  ? 'Đang đồng bộ...'
                  : 'Syncing...'
                : lang === 'vi'
                  ? 'Đồng bộ Google Health (1-Nhấn)'
                  : 'Sync Google Health (1-Click)'}
            </span>
          </button>
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
          {/* Sync result banner */}
      {(syncState.result || syncState.message) && (
        <div
          className={`rounded-2xl border p-3 mb-4 flex items-start gap-2 text-xs ${
            syncState.message
              ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              : syncState.result?.source === 'google-fit'
                ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}
        >
          {syncState.message ? <Info className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            {syncState.message ? (
              <div>{syncState.message}</div>
            ) : (
              <>
                <div className="font-semibold">
                  {lang === 'vi' ? 'Đã đồng bộ: ' : 'Synced: '}
                  {healthSourceLabel(syncState.result!.source, lang)}
                </div>
                <div className="opacity-80 mt-0.5">
                  {syncState.result!.source === 'google-fit'
                    ? lang === 'vi'
                      ? (syncState.result!.metrics.steps || 0) === 0 && (syncState.result!.metrics.caloriesBurned || 0) === 0
                        ? 'Kết nối Google Fit thành công nhưng tài khoản Google của bạn chưa có dữ liệu bước chân/calo cho ngày này. Hãy đảm bảo điện thoại hoặc đồng hồ đã đồng bộ dữ liệu vào Google Fit.'
                        : `Số liệu lấy trực tiếp từ Google Fit API (${(syncState.result!.metrics.steps || 0).toLocaleString()} bước, ${syncState.result!.metrics.caloriesBurned || 0} kcal).`
                      : 'Metrics fetched directly from Google Fit API.'
                    : lang === 'vi'
                      ? 'Đang dùng số liệu mô phỏng (tài khoản chưa cấp quyền Google Fit hoặc chưa có dữ liệu ngày này).'
                      : 'Using simulated metrics (Google Fit scope not granted or no data recorded for this date).'}
                </div>
                {syncState.result!.error && (
                  <div className="mt-3 pt-3 border-t border-amber-200/80 dark:border-amber-900/60 space-y-2.5">
                    <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 text-xs font-medium leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          {syncState.result?.enableApiUrl
                            ? (lang === 'vi'
                                ? 'Dự án Google Cloud của bạn chưa BẬT Fitness API (Mã dự án: 755336412189)'
                                : 'Fitness API is disabled in your Google Cloud project (755336412189)')
                            : syncState.result!.error.includes('401')
                              ? (lang === 'vi' ? 'Phiên đăng nhập Google đã hết hạn (401 Unauthorized).' : 'Google access token expired (401 Unauthorized).')
                              : syncState.result!.error}
                        </p>
                        <p className="text-[11px] opacity-85 mt-0.5">
                          {syncState.result?.enableApiUrl
                            ? (lang === 'vi'
                                ? 'Google yêu cầu nhấn nút "BẬT" (ENABLE) tại đúng dự án Google Cloud bạn đang dùng. Bạn có thể nhấn mở link bên dưới, hoặc chọn "Bỏ qua & Dùng dữ liệu thông minh" để dùng app ngay!'
                                : 'Google requires you to click "ENABLE" in your Google Cloud project. You can click the link below, or click "Skip & Use Smart Data" to proceed immediately!')
                            : (lang === 'vi'
                                ? 'Vui lòng bấm đăng nhập lại để làm mới token và cấp quyền Google Fit.'
                                : 'Please re-authenticate to refresh token and grant Google Fit permissions.')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {syncState.result?.enableApiUrl ? (
                        <a
                          href={syncState.result.enableApiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{lang === 'vi' ? '1. Mở trang Google Cloud để BẬT API (1-Click)' : '1. Open Google Cloud to Enable API'}</span>
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={handleApplySmartSimulation}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? '2. Bỏ qua & Dùng dữ liệu thông minh' : '2. Skip & Use Smart Data'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReauthAndSync}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? 'Thử lại sau khi đã Bật' : 'Retry after Enabling'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <button
            onClick={() => setSyncState({ running: false, result: null })}
            className="ml-auto p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              {lang === 'vi' ? 'Trạng thái đồng bộ Google Health' : 'Google Health connection'}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              {isGoogleHealthConfigured()
                ? lang === 'vi'
                  ? 'Đã bật VITE_GOOGLE_HEALTH_ENABLED. Nếu access token có scope Fitness, nút đồng bộ sẽ lấy số liệu thật; nếu không sẽ dùng dữ liệu mô phỏng có ghi rõ nguồn.'
                  : 'VITE_GOOGLE_HEALTH_ENABLED is on. With a Fitness-scoped access token the sync button fetches real data; otherwise it falls back to clearly-labelled simulated data.'
                : lang === 'vi'
                  ? 'Chưa bật kết nối thật. Đặt VITE_GOOGLE_HEALTH_ENABLED=true và đăng nhập Google có scope Fitness để lấy dữ liệu thật. Hiện tại nút đồng bộ dùng dữ liệu mô phỏng (có ghi rõ nguồn).'
                  : 'Real connection is off. Set VITE_GOOGLE_HEALTH_ENABLED=true and sign in with a Fitness-scoped Google token for real data. For now the sync button uses simulated data (clearly labelled).'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['steps', 'caloriesBurned', 'heartRateBpm', 'sleepHours', 'weightKg'] as const).map((k) => (
                <span
                  key={k}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono"
                >
                  {k}
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


import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Timer,
  Clock as StopwatchIcon,
  Hourglass,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Trash2,
  Target,
  BarChart3,
  Volume2,
} from 'lucide-react';
import {
  FocusMode,
  FocusSession,
  GoalItem,
  PomodoroPhase,
  TaskItem,
} from '../../types/productivity';
import { BarChart } from '../charts/SimpleCharts';
import { focusMinutesByDay, formatDuration, totalFocusMinutes } from '../../utils/productivityUtils';
import { playNotificationSound } from '../../utils/sound';
import { formatDateString } from '../../utils/calendarUtils';

interface StudyFocusViewProps {
  tasks: TaskItem[];
  goals: GoalItem[];
  sessions: FocusSession[];
  lang: 'vi' | 'en';
  onAddSession: (session: FocusSession) => void;
  onDeleteSession: (id: string) => void;
  onOpenTask: (taskId: string) => void;
}

const PHASE_SECONDS: Record<PomodoroPhase, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const PHASE_META: Record<PomodoroPhase, { labelVi: string; labelEn: string; color: string }> = {
  focus: { labelVi: 'Tập trung sâu', labelEn: 'Deep focus', color: '#3F51B5' },
  shortBreak: { labelVi: 'Nghỉ ngắn', labelEn: 'Short break', color: '#33B679' },
  longBreak: { labelVi: 'Nghỉ dài', labelEn: 'Long break', color: '#039BE5' },
};

export const StudyFocusView: React.FC<StudyFocusViewProps> = ({
  tasks,
  goals,
  sessions,
  lang,
  onAddSession,
  onDeleteSession,
  onOpenTask,
}) => {
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [remaining, setRemaining] = useState(PHASE_SECONDS.focus);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [zen, setZen] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [countdownMinutes, setCountdownMinutes] = useState(30);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks]
  );
  const linkedTask = tasks.find((t) => t.id === linkedTaskId) || null;
  const linkedGoal = linkedTask?.goalId ? goals.find((g) => g.id === linkedTask.goalId) : null;

  const sessionLabel =
    linkedTask?.title ||
    (lang === 'vi' ? 'Phiên học không gắn công việc' : 'Unlinked focus session');

  // Persist a finished session through one path so history stays consistent.
  const saveSession = (durationSeconds: number, completed: boolean) => {
    if (durationSeconds < 30) return;
    const startedAt = startedAtRef.current ?? Date.now() - durationSeconds * 1000;
    onAddSession({
      id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode,
      phase: mode === 'pomodoro' ? phase : undefined,
      taskId: linkedTaskId || undefined,
      goalId: linkedGoal?.id,
      label: sessionLabel,
      startedAt,
      endedAt: startedAt + durationSeconds * 1000,
      durationSeconds,
      completed,
    });
    startedAtRef.current = null;
  };

  // --- Ticking engine -------------------------------------------------------
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      if (startedAtRef.current === null) startedAtRef.current = Date.now();

      if (mode === 'stopwatch') {
        setElapsed((prev) => prev + 1);
        return;
      }

      setRemaining((prev) => {
        if (prev > 1) return prev - 1;

        // Timer hit zero.
        if (soundOn) playNotificationSound();
        saveSession(mode === 'pomodoro' ? PHASE_SECONDS[phase] : countdownMinutes * 60, true);
        savedRef.current = true;

        if (mode === 'pomodoro') {
          setCompletedPomodoros((c) => (phase === 'focus' ? c + 1 : c));
          const nextPhase: PomodoroPhase = phase === 'focus' ? 'shortBreak' : 'focus';
          setPhase(nextPhase);
          return PHASE_SECONDS[nextPhase];
        }

        setRunning(false);
        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, phase, countdownMinutes, soundOn, linkedTaskId, linkedGoal?.id]);

  // Reset the "already saved" guard whenever the user starts a fresh run.
  const start = () => {
    if (!running && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
      savedRef.current = false;
    }
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const stopAndSave = () => {
    setRunning(false);
    const duration =
      mode === 'stopwatch' ? elapsed : Math.max(0, (mode === 'pomodoro' ? PHASE_SECONDS[phase] : countdownMinutes * 60) - remaining);
    if (!savedRef.current) saveSession(duration, false);
    savedRef.current = true;
  };

  const reset = () => {
    setRunning(false);
    startedAtRef.current = null;
    savedRef.current = false;
    if (mode === 'pomodoro') setRemaining(PHASE_SECONDS[phase]);
    else if (mode === 'countdown') setRemaining(countdownMinutes * 60);
    else setElapsed(0);
  };

  const switchMode = (next: FocusMode) => {
    setRunning(false);
    startedAtRef.current = null;
    savedRef.current = false;
    setMode(next);
    if (next === 'pomodoro') setRemaining(PHASE_SECONDS[phase]);
    else if (next === 'countdown') setRemaining(countdownMinutes * 60);
    else setElapsed(0);
  };

  const displaySeconds = mode === 'stopwatch' ? elapsed : remaining;
  const progressPercent =
    mode === 'stopwatch'
      ? 0
      : Math.round(
          (1 - remaining / (mode === 'pomodoro' ? PHASE_SECONDS[phase] : countdownMinutes * 60)) * 100
        );

  // --- Statistics ----------------------------------------------------------
  const last7 = useMemo(() => focusMinutesByDay(sessions, 7), [sessions]);
  const todayStr = formatDateString(new Date());
  const todayMinutes = useMemo(
    () => totalFocusMinutes(sessions, todayStr, todayStr),
    [sessions, todayStr]
  );
  const weekMinutes = useMemo(() => totalFocusMinutes(sessions), [sessions]);

  const chartData = useMemo(
    () =>
      last7.map((d) => ({
        label: d.date.slice(8),
        value: d.minutes,
        color: d.date === todayStr ? '#3F51B5' : '#7986CB',
      })),
    [last7, todayStr]
  );

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 8),
    [sessions]
  );

  const modeTabs: { id: FocusMode; labelVi: string; labelEn: string; icon: typeof Timer }[] = [
    { id: 'pomodoro', labelVi: 'Pomodoro', labelEn: 'Pomodoro', icon: Timer },
    { id: 'stopwatch', labelVi: 'Bấm giờ', labelEn: 'Stopwatch', icon: StopwatchIcon },
    { id: 'countdown', labelVi: 'Đếm ngược', labelEn: 'Countdown', icon: Hourglass },
  ];

  const timerCard = (
    <div
      className={`rounded-3xl border shadow-sm p-6 flex flex-col items-center transition-colors ${
        zen
          ? 'bg-[#12151a] border-gray-800 text-gray-100'
          : 'bg-white dark:bg-[#1a1e24] border-gray-200 dark:border-gray-800'
      }`}
    >
      {/* Mode tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mb-5">
        {modeTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchMode(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                mode === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{lang === 'vi' ? tab.labelVi : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Phase selector for pomodoro */}
      {mode === 'pomodoro' && (
        <div className="flex items-center gap-1.5 mb-4">
          {(['focus', 'shortBreak', 'longBreak'] as PomodoroPhase[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPhase(p);
                setRunning(false);
                startedAtRef.current = null;
                savedRef.current = false;
                setRemaining(PHASE_SECONDS[p]);
              }}
              className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-all cursor-pointer ${
                phase === p
                  ? 'text-white border-transparent'
                  : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              }`}
              style={phase === p ? { backgroundColor: PHASE_META[p].color } : undefined}
            >
              {lang === 'vi' ? PHASE_META[p].labelVi : PHASE_META[p].labelEn}
            </button>
          ))}
        </div>
      )}

      {/* Countdown preset */}
      {mode === 'countdown' && (
        <div className="flex items-center gap-1.5 mb-4">
          {[5, 15, 30, 45, 60].map((min) => (
            <button
              key={min}
              onClick={() => {
                setCountdownMinutes(min);
                setRemaining(min * 60);
                setRunning(false);
                startedAtRef.current = null;
                savedRef.current = false;
              }}
              className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border cursor-pointer ${
                countdownMinutes === min
                  ? 'bg-blue-600 text-white border-transparent'
                  : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              }`}
            >
              {min}m
            </button>
          ))}
        </div>
      )}

      {/* Big time display with circular progress */}
      <div className="relative w-52 h-52 flex items-center justify-center mb-4">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90 w-full h-full">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            className="text-gray-100 dark:text-gray-800"
            strokeWidth="6"
          />
          {mode !== 'stopwatch' && (
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={mode === 'pomodoro' ? PHASE_META[phase].color : '#3F51B5'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - Math.max(0, Math.min(1, progressPercent / 100)))}`}
              className="transition-all duration-500"
            />
          )}
        </svg>
        <div className="text-center z-10">
          <div className="text-4xl font-mono font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {formatDuration(displaySeconds)}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">
            {mode === 'pomodoro'
              ? lang === 'vi'
                ? PHASE_META[phase].labelVi
                : PHASE_META[phase].labelEn
              : mode === 'stopwatch'
              ? lang === 'vi'
                ? 'Đang bấm giờ'
                : 'Elapsed'
              : lang === 'vi'
              ? 'Còn lại'
              : 'Remaining'}
          </div>
        </div>
      </div>

      {/* Linked task */}
      <div className="w-full max-w-xs mb-4">
        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
          {lang === 'vi' ? 'Gắn vào công việc' : 'Attach to task'}
        </label>
        <select
          value={linkedTaskId}
          onChange={(e) => setLinkedTaskId(e.target.value)}
          className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="">{lang === 'vi' ? '— Không gắn —' : '— None —'}</option>
          {openTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        {linkedGoal && (
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1 flex items-center gap-1">
            <Target className="w-2.5 h-2.5" />
            {linkedGoal.title}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={running ? pause : start}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-transform hover:scale-105 cursor-pointer"
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>
            {running
              ? lang === 'vi'
                ? 'Tạm dừng'
                : 'Pause'
              : lang === 'vi'
              ? 'Bắt đầu'
              : 'Start'}
          </span>
        </button>

        <button
          onClick={reset}
          title={lang === 'vi' ? 'Đặt lại' : 'Reset'}
          className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {running && (
          <button
            onClick={stopAndSave}
            title={lang === 'vi' ? 'Dừng & lưu phiên' : 'Stop & save session'}
            className="px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Lưu' : 'Save'}</span>
          </button>
        )}

        <button
          onClick={() => setSoundOn((s) => !s)}
          title={lang === 'vi' ? 'Âm thanh thông báo' : 'Notification sound'}
          className={`p-3 rounded-xl border cursor-pointer ${
            soundOn
              ? 'border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
              : 'border-gray-300 dark:border-gray-700 text-gray-400'
          }`}
        >
          <Volume2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setZen((z) => !z)}
          title={lang === 'vi' ? 'Chế độ tập trung (Zen)' : 'Zen focus mode'}
          className="p-3 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
        >
          {zen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-[11px] text-gray-400 mt-4">
        {lang === 'vi'
          ? `Đã hoàn thành ${completedPomodoros} phiên Pomodoro trong lần chạy này`
          : `${completedPomodoros} Pomodoro sessions completed in this run`}
      </p>
    </div>
  );

  // --- Zen mode: full-screen minimal timer ---------------------------------
  if (zen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col items-center justify-center p-6 select-none">
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button
            onClick={() => setZen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-medium cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            {lang === 'vi' ? 'Thoát Zen' : 'Exit Zen'}
          </button>
        </div>

        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">
          {mode === 'pomodoro'
            ? lang === 'vi'
              ? PHASE_META[phase].labelVi
              : PHASE_META[phase].labelEn
            : mode === 'stopwatch'
            ? lang === 'vi'
              ? 'Bấm giờ'
              : 'Stopwatch'
            : lang === 'vi'
            ? 'Đếm ngược'
            : 'Countdown'}
        </p>

        <div className="text-[92px] leading-none font-mono font-bold text-gray-100 tabular-nums">
          {formatDuration(displaySeconds)}
        </div>

        {linkedTask && (
          <p className="text-sm text-gray-400 mt-4 max-w-lg text-center">{linkedTask.title}</p>
        )}

        <div className="flex items-center gap-3 mt-10">
          <button
            onClick={running ? pause : start}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg cursor-pointer"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{running ? (lang === 'vi' ? 'Tạm dừng' : 'Pause') : lang === 'vi' ? 'Bắt đầu' : 'Start'}</span>
          </button>
          <button
            onClick={reset}
            className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900 p-4 md:p-6 lg:p-8 select-none">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Timer className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {lang === 'vi' ? 'Môi Trường Học Tập & Tập Trung' : 'Study & Focus Environment'}
          </h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {lang === 'vi'
            ? 'Pomodoro, bấm giờ và đếm ngược — gắn trực tiếp vào công việc để đo thời gian thật.'
            : 'Pomodoro, stopwatch and countdown — linked to your tasks to measure real focus time.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">{timerCard}</div>

        <div className="lg:col-span-5 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {lang === 'vi' ? 'Hôm nay' : 'Today'}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                {formatDuration(todayMinutes * 60)}
              </div>
            </div>
            <div className="bg-white dark:bg-[#1a1e24] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {lang === 'vi' ? 'Tổng đã ghi' : 'All recorded'}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                {Math.round(weekMinutes / 60)}h
              </div>
            </div>
          </div>

          {/* Weekly chart */}
          <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                {lang === 'vi' ? 'Thời gian học 7 ngày' : 'Focus time — 7 days'}
              </h3>
              <span className="text-[10px] text-gray-400">
                {lang === 'vi' ? 'phút' : 'minutes'}
              </span>
            </div>
            <BarChart
              data={chartData}
              height={120}
              formatValue={(v) => `${v}m`}
              emptyLabel={lang === 'vi' ? 'Chưa có phiên học nào' : 'No sessions yet'}
              highlightLast={1}
            />
          </div>

          {/* History */}
          <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-2.5">
              {lang === 'vi' ? 'Lịch sử phiên học' : 'Session history'}
            </h3>
            {recentSessions.length === 0 ? (
              <p className="text-[11px] text-gray-400 py-4 text-center">
                {lang === 'vi' ? 'Chưa có phiên nào.' : 'No sessions yet.'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 group"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">
                        {s.label}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {formatDateString(new Date(s.startedAt))} ·{' '}
                        {formatDuration(s.durationSeconds)} ·{' '}
                        {s.mode === 'pomodoro' ? 'Pomodoro' : s.mode === 'stopwatch' ? 'Stopwatch' : 'Countdown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.completed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      <button
                        onClick={() => onDeleteSession(s.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open tasks shortcut */}
          {openTasks.length > 0 && (
            <div className="bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-2">
                {lang === 'vi' ? 'Việc đang mở' : 'Open tasks'}
              </h3>
              <div className="space-y-1">
                {openTasks.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setLinkedTaskId(t.id);
                      onOpenTask(t.id);
                    }}
                    className="w-full text-left text-[11px] px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 truncate cursor-pointer"
                  >
                    • {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

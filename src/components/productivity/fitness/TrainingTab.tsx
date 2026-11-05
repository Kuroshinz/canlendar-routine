import React, { useState } from 'react';
import {
  Dumbbell,
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  ChevronRight,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  Exercise,
  MUSCLE_COLOR,
  MUSCLE_LABEL,
  PlannedSession,
  SPORT_LABEL,
  SportSession,
  SportType,
  WorkoutSession,
} from '../../../types/productivity';
import {
  EXERCISES,
  exerciseById,
  gymCalories,
  personalRecords,
  setVolume,
  sportCalories,
  todayString,
} from '../../../utils/fitnessMetrics';

interface TrainingTabProps {
  plannedSessions: PlannedSession[];
  workoutSessions: WorkoutSession[];
  sportSessions: SportSession[];
  userWeightKg: number;
  lang: 'vi' | 'en';
  onLogWorkoutSession: (w: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  onDeleteWorkoutSession: (id: string) => void;
  onAddSportSession: (s: Omit<SportSession, 'id' | 'createdAt'>) => SportSession;
  onDeleteSportSession: (id: string) => void;
  onScheduleSessionToCalendar?: (title: string, date: string, color: string) => void;
}

const SPORT_OPTIONS: SportType[] = [
  'running',
  'cycling',
  'swimming',
  'football',
  'badminton',
  'basketball',
  'tennis',
  'other',
];

export const TrainingTab: React.FC<TrainingTabProps> = ({
  plannedSessions,
  workoutSessions,
  sportSessions,
  userWeightKg,
  lang,
  onLogWorkoutSession,
  onDeleteWorkoutSession,
  onAddSportSession,
  onDeleteSportSession,
  onScheduleSessionToCalendar,
}) => {
  const [scheduledBanner, setScheduledBanner] = useState<string | null>(null);
  const [showSportModal, setShowSportModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Sport form state
  const [sportType, setSportType] = useState<SportType>('running');
  const [sportDuration, setSportDuration] = useState('30');
  const [sportDate, setSportDate] = useState(() => todayString());
  const [sportNote, setSportNote] = useState('');

  const prs = personalRecords(workoutSessions);

  const handleSchedule = (session: PlannedSession) => {
    const today = todayString();
    if (onScheduleSessionToCalendar) {
      onScheduleSessionToCalendar(session.title, today, '#ff6025');
    }
    setScheduledBanner(`Đã lên lịch "${session.title}" vào Google Calendar hôm nay (${today})!`);
    setTimeout(() => setScheduledBanner(null), 4000);
  };

  const handleQuickLog = (session: PlannedSession) => {
    const today = todayString();
    const sets = session.prescriptions.flatMap((p, pIdx) =>
      Array.from({ length: p.sets }, (_, sIdx) => ({
        id: `s-${Date.now()}-${pIdx}-${sIdx}`,
        exerciseId: p.exerciseId,
        setIndex: sIdx,
        weightKg: 50,
        reps: 10,
        rpe: p.rpe,
      }))
    );

    onLogWorkoutSession({
      date: today,
      sessionId: session.id,
      title: session.title,
      startedAt: Date.now() - 60 * 60_000,
      finishedAt: Date.now(),
      sets,
      note: 'Hoàn thành theo giáo án thể hình cá nhân.',
    });

    setScheduledBanner(`Đã ghi nhận hoàn thành buổi tập "${session.title}"!`);
    setTimeout(() => setScheduledBanner(null), 4000);
  };

  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = Number(sportDuration);
    if (!dur || dur <= 0) return;

    onAddSportSession({
      date: sportDate,
      type: sportType,
      durationMin: dur,
      note: sportNote.trim() || undefined,
    });

    setShowSportModal(false);
    setSportNote('');
    setScheduledBanner(`Đã thêm buổi "${SPORT_LABEL[sportType]}" (${dur} phút)!`);
    setTimeout(() => setScheduledBanner(null), 4000);
  };

  const filteredExercises = EXERCISES.filter(
    (e) =>
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      MUSCLE_LABEL[e.muscle]?.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/50 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
              Giáo Án Kháng Lực Cá Nhân
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Phân chia Upper / Lower · 4 buổi/tuần
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            Lịch Tập & Giáo Án Huấn Luyện
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tích hợp trực tiếp với Google Calendar: Lên lịch buổi tập chỉ với 1 click.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowLibraryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Thư viện bài tập</span>
          </button>
          <button
            onClick={() => setShowSportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm thể thao (MET)</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {scheduledBanner && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{scheduledBanner}</span>
        </div>
      )}

      {/* Mesocycle Planned Sessions Grid */}
      <div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-orange-500" />
          Giáo Án Kháng Lực Đang Áp Dụng (Mesocycle)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plannedSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {session.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {session.prescriptions.length} bài tập
                  </span>
                </div>

                <div className="space-y-2 my-3">
                  {session.prescriptions.map((pres, idx) => {
                    const ex = exerciseById(pres.exerciseId);
                    const muscleLabel = ex ? MUSCLE_LABEL[ex.muscle] : 'Toàn thân';
                    const muscleColor = ex ? MUSCLE_COLOR[ex.muscle] : '#ff6025';

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                              style={{ backgroundColor: `${muscleColor}22`, color: muscleColor }}
                            >
                              {muscleLabel}
                            </span>
                            <span className="truncate">{ex ? ex.name : pres.exerciseId}</span>
                            {pres.supersetId && (
                              <span className="text-[9px] px-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                Superset
                              </span>
                            )}
                          </div>
                          {ex && (
                            <div className="text-[10px] text-gray-400 italic truncate mt-0.5">
                              {ex.cue}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {pres.sets} × {pres.reps}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            RPE {pres.rpe} · Nghỉ {pres.restSeconds}s
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <button
                  onClick={() => handleSchedule(session)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 cursor-pointer transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Lên lịch vào Calendar</span>
                </button>
                <button
                  onClick={() => handleQuickLog(session)}
                  className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã tập xong</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Personal Records + Sports Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Records Table */}
        <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Kỷ Lục Cá Nhân (PR - Personal Records)
          </h3>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.keys(prs).length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có kỷ lục nào.</p>
            ) : (
              Object.entries(prs).map(([exId, record]) => {
                const ex = exerciseById(exId);
                return (
                  <div key={exId} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {ex ? ex.name : exId}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {ex ? ex.equipment : 'Free weight'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {record.weightKg} kg
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">× {record.reps} reps</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sports Tracker Card */}
        <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Thể Thao Ngoài Gym (MET Tracker)
            </h3>
            <button
              onClick={() => setShowSportModal(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Thêm buổi tập
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {sportSessions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Chưa có hoạt động thể thao nào.</p>
            ) : (
              sportSessions.slice(0, 5).map((s) => {
                const kcal = sportCalories(s, userWeightKg);
                return (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <span>{SPORT_LABEL[s.type]}</span>
                        <span className="text-[10px] text-gray-400 font-mono">({s.date})</span>
                      </div>
                      {s.note && <div className="text-[10px] text-gray-400 italic">{s.note}</div>}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-rose-600 dark:text-rose-400">{kcal} kcal</div>
                        <div className="text-[10px] text-gray-400">{s.durationMin} phút</div>
                      </div>
                      <button
                        onClick={() => onDeleteSportSession(s.id)}
                        className="p-1 text-gray-300 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Sport Modal */}
      {showSportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Thêm Buổi Tập Thể Thao (MET)
            </h3>

            <form onSubmit={handleAddSport} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Bộ môn</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value as SportType)}
                  className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  {SPORT_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {SPORT_LABEL[st]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Thời gian (phút)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sportDuration}
                    onChange={(e) => setSportDuration(e.target.value)}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Ngày</label>
                  <input
                    type="date"
                    required
                    value={sportDate}
                    onChange={(e) => setSportDate(e.target.value)}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Ghi chú</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chạy 5km công viên, đá bóng sân 7..."
                  value={sportNote}
                  onChange={(e) => setSportNote(e.target.value)}
                  className="mt-1 w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300">
                Ước tính tiêu thụ:{' '}
                <span className="font-bold">
                  {sportCalories({ id: '', date: '', type: sportType, durationMin: Number(sportDuration) || 0, createdAt: 0 }, userWeightKg)}{' '}
                  kcal
                </span>{' '}
                (theo cân nặng {userWeightKg} kg).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSportModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Lưu hoạt động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exercise Library Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1e24] rounded-2xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Thư Viện Bài Tập & Cách Đọc Cues
              </h3>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <input
              type="text"
              placeholder="Tìm kiếm bài tập hoặc nhóm cơ..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
            />

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 pr-1">
              {filteredExercises.map((ex) => {
                const color = MUSCLE_COLOR[ex.muscle];
                return (
                  <div key={ex.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                        {ex.name}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        {MUSCLE_LABEL[ex.muscle]} · {ex.equipment}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic flex items-center gap-1">
                      <span className="text-orange-500 font-bold not-italic">Cue:</span> {ex.cue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


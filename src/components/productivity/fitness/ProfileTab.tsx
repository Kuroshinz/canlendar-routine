import React, { useState } from 'react';
import {
  User,
  Target,
  Edit2,
  Check,
  Sparkles,
  ShieldCheck,
  LogIn,
  Flame,
  Activity,
  HeartPulse,
  Dumbbell,
} from 'lucide-react';
import {
  ACTIVITY_LABEL,
  ActivityLevel,
  CtgProfile,
  GOAL_LABEL,
  Goal,
  Sex,
} from '../../../types/productivity';

interface ProfileTabProps {
  profile: CtgProfile;
  currentUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onGoogleSignIn?: () => Promise<void>;
  lang: 'vi' | 'en';
  onUpdateProfile: (patch: Partial<CtgProfile>) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  currentUser,
  onGoogleSignIn,
  lang,
  onUpdateProfile,
}) => {
  const [editing, setEditing] = useState(false);
  const effectiveName = currentUser?.displayName || profile.name;
  const effectiveEmail = currentUser?.email || profile.email;

  const [name, setName] = useState(effectiveName);
  const [age, setAge] = useState(String(profile.age));
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity);
  const [targetWeightKg, setTargetWeightKg] = useState(String(profile.targetWeightKg));
  const [targetBodyFatPct, setTargetBodyFatPct] = useState(String(profile.targetBodyFatPct));
  const [stepGoal, setStepGoal] = useState(String(profile.stepGoal));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      age: Number(age) || profile.age,
      sex,
      heightCm: Number(heightCm) || profile.heightCm,
      goal,
      activity,
      targetWeightKg: Number(targetWeightKg) || profile.targetWeightKg,
      targetBodyFatPct: Number(targetBodyFatPct) || profile.targetBodyFatPct,
      stepGoal: Number(stepGoal) || profile.stepGoal,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Google Account Ownership Card */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/50 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Google avatar"
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
              <User className="w-7 h-7" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">
                {effectiveName}
              </h2>
              {currentUser?.email ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Đã liên kết Google
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Cá nhân (Offline)
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {effectiveEmail ? (
                <span className="font-mono">{effectiveEmail}</span>
              ) : (
                'Chưa liên kết email Google'
              )}
              {' · '}
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Toàn quyền sở hữu cá nhân
              </span>
            </p>
          </div>
        </div>

        <div>
          {!currentUser?.email && onGoogleSignIn && (
            <button
              onClick={() => onGoogleSignIn()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Liên kết tài khoản Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Details & Settings Card */}
      <div className="bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              Hồ Sơ Thể Hình & Mục Tiêu Cá Nhân
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Cơ sở để hệ thống tính toán chính xác BMR, TDEE và mục tiêu Calo/Macro hàng ngày.
            </p>
          </div>

          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
            <span>{editing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa'}</span>
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Giới tính</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Tuổi</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Chiều cao (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Mục tiêu thể hình</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as Goal)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  <option value="cut">Giảm mỡ (Cut -15% kcal)</option>
                  <option value="maintain">Duy trì (Maintain TDEE)</option>
                  <option value="bulk">Tăng cơ (Bulk +10% kcal)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Mức vận động hàng ngày</label>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  <option value="sedentary">Ít vận động (x1.2)</option>
                  <option value="light">Vận động nhẹ (x1.375)</option>
                  <option value="moderate">Vận động vừa (x1.55)</option>
                  <option value="active">Vận động nhiều (x1.725)</option>
                  <option value="very_active">Vận động rất nhiều (x1.9)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Cân nặng mục tiêu (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">% Mỡ mục tiêu</label>
                <input
                  type="number"
                  step="0.5"
                  value={targetBodyFatPct}
                  onChange={(e) => setTargetBodyFatPct(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Mục tiêu bước chân / ngày</label>
                <input
                  type="number"
                  step="500"
                  value={stepGoal}
                  onChange={(e) => setStepGoal(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu thông tin hồ sơ</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Giới tính & Tuổi</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">
                {profile.sex === 'male' ? 'Nam' : 'Nữ'} · {profile.age} tuổi
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Chiều cao</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">{profile.heightCm} cm</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Mục tiêu</div>
              <div className="font-bold text-orange-600 dark:text-orange-400 mt-1">
                {GOAL_LABEL[profile.goal]}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Mức vận động</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">
                {ACTIVITY_LABEL[profile.activity]}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Cân nặng mục tiêu</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">{profile.targetWeightKg} kg</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-slate-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Mục tiêu bước / ngày</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">
                {profile.stepGoal.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Smart Fitness Strategy */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/10 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Chiến Lược Thể Hình &amp; Dinh Dưỡng Cho Bạn ({GOAL_LABEL[profile.goal]})
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white">
            Cá Nhân Hóa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <Flame className="w-4 h-4" />
              <span>Chiến Lược Calo</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
              {profile.goal === 'cut'
                ? 'Duy trì mức thâm hụt 15% kcal so với TDEE để đốt mỡ ổn định, bảo toàn tối đa lượng cơ nạc LBM.'
                : profile.goal === 'bulk'
                ? 'Nạp thặng dư nhẹ +10% kcal so với TDEE (khoảng +200-300 kcal/ngày) để tăng cơ nạc sạch và hạn chế tích mỡ.'
                : 'Duy trì mức calo chuẩn TDEE để tái cấu trúc cơ thể (Body Recomposition), vừa giảm mỡ vừa săn chắc cơ.'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-purple-100 dark:border-purple-900/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
              <Dumbbell className="w-4 h-4" />
              <span>Kháng Lực & Phục Hồi</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
              Áp dụng phân chia Upper/Lower 4 buổi/tuần. Luôn ghi lại số kg và reps mỗi hiệp để kích hoạt nguyên lý Progressive Overload (tăng tải trọng lũy tiến).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-pink-100 dark:border-pink-900/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600 dark:text-pink-400">
              <HeartPulse className="w-4 h-4" />
              <span>Nước & Giấc Ngủ</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
              Nạp tối thiểu 2.500ml nước mỗi ngày và ngủ đủ 7-8 tiếng để tối ưu hóa hormone tăng trưởng GH, giúp phục hồi cơ bắp và hệ thần kinh trung ương.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Users,
  User,
  Target,
  Edit2,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  ACTIVITY_LABEL,
  ActivityLevel,
  Branch,
  CtgProfile,
  DEFAULT_BRANCHES,
  GOAL_LABEL,
  Goal,
  Sex,
} from '../../../types/productivity';

interface BranchesTabProps {
  profile: CtgProfile;
  lang: 'vi' | 'en';
  onUpdateProfile: (patch: Partial<CtgProfile>) => void;
}

export const BranchesTab: React.FC<BranchesTabProps> = ({
  profile,
  lang,
  onUpdateProfile,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity);
  const [targetWeightKg, setTargetWeightKg] = useState(String(profile.targetWeightKg));
  const [targetBodyFatPct, setTargetBodyFatPct] = useState(String(profile.targetBodyFatPct));
  const [stepGoal, setStepGoal] = useState(String(profile.stepGoal));
  const [trainerName, setTrainerName] = useState(profile.trainerName);
  const [branchId, setBranchId] = useState(profile.branchId);

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
      trainerName,
      branchId,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white dark:bg-[#1a1e24] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{profile.name}</h3>
              <p className="text-[11px] text-gray-400">
                Hội viên CTG Fitness · HLV phụ trách: {profile.trainerName}
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
            <span>{editing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa hồ sơ'}</span>
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
                <label className="text-[10px] font-semibold uppercase text-gray-400">Mục tiêu</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as Goal)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  <option value="cut">Giảm mỡ</option>
                  <option value="maintain">Duy trì</option>
                  <option value="bulk">Tăng cơ</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Mức vận động</label>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value as ActivityLevel)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  <option value="sedentary">Ít vận động</option>
                  <option value="light">Vận động nhẹ</option>
                  <option value="moderate">Vận động vừa</option>
                  <option value="active">Vận động nhiều</option>
                  <option value="very_active">Vận động rất nhiều</option>
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
                <label className="text-[10px] font-semibold uppercase text-gray-400">Mục tiêu bước chân</label>
                <input
                  type="number"
                  step="500"
                  value={stepGoal}
                  onChange={(e) => setStepGoal(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Tên HLV phụ trách</label>
                <input
                  type="text"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Chi nhánh tập luyện</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                >
                  {DEFAULT_BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Giới tính & Tuổi</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {profile.sex === 'male' ? 'Nam' : 'Nữ'} · {profile.age} tuổi
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Chiều cao</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{profile.heightCm} cm</div>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Mục tiêu</div>
              <div className="font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                {GOAL_LABEL[profile.goal]}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Mức vận động</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {ACTIVITY_LABEL[profile.activity]}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Cân nặng mục tiêu</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{profile.targetWeightKg} kg</div>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 uppercase font-semibold">Mục tiêu bước/ngày</div>
              <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {profile.stepGoal.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branches Directory */}
      <div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-orange-500" />
          Hệ Thống Chi Nhánh CTG Fitness
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_BRANCHES.map((b) => (
            <div
              key={b.id}
              className={`bg-white dark:bg-[#1a1e24] p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
                profile.branchId === b.id
                  ? 'border-orange-500/80 ring-1 ring-orange-500/50'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{b.name}</h4>
                  {profile.branchId === b.id && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300">
                      Chi nhánh của tôi
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 my-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span>{b.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.openHours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.trainers} Huấn luyện viên chuyên nghiệp</span>
                  </div>
                </div>
              </div>

              {profile.branchId !== b.id && (
                <button
                  onClick={() => onUpdateProfile({ branchId: b.id })}
                  className="w-full mt-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Chọn chi nhánh này
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

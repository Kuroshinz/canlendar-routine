import React from 'react';
import { OverloadDayItem } from '../../types/multiHub';
import { AlertTriangle, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface BurnoutAlertProps {
  overloadedDays: OverloadDayItem[];
  lang: 'vi' | 'en';
}

export const BurnoutAlert: React.FC<BurnoutAlertProps> = ({ overloadedDays, lang }) => {
  if (overloadedDays.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <div className="text-xs font-bold">
            {lang === 'vi' ? 'Lịch trình cân bằng lý tưởng' : 'Well-Balanced Schedule'}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
            {lang === 'vi'
              ? 'Không có ngày nào vượt quá 8 giờ làm việc. Bạn đang duy trì năng suất và sức khỏe tốt!'
              : 'No days exceed 8 scheduled hours. Great job maintaining a healthy pace!'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-xs">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">
              {lang === 'vi' ? 'Cảnh báo Nguy cơ Quá tải / Kiệt sức' : 'Workload Overload Warning'}
            </span>
            <span className="text-[10px] font-semibold bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
              {overloadedDays.length} {lang === 'vi' ? 'ngày dày đặc' : 'heavy days'}
            </span>
          </div>

          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
            {lang === 'vi'
              ? 'Hệ thống phát hiện một số ngày có thời gian làm việc hoặc họp liên tục vượt mức khuyến nghị. Hãy cân nhắc kéo giãn lịch hoặc chèn thêm khoảng nghỉ 15 phút giữa các ca.'
              : 'Several days have heavy consecutive schedules exceeding recommended limits. Consider rescheduling or adding 15-minute buffer breaks.'}
          </p>

          <div className="mt-3 flex flex-col gap-1.5 border-t border-amber-200/60 dark:border-amber-800/60 pt-2">
            {overloadedDays.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between text-xs bg-white/60 dark:bg-gray-800/60 px-2.5 py-1.5 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    {item.date}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 text-[11px] truncate">
                    {item.reason}
                  </span>
                </div>
                <span className="font-bold text-amber-800 dark:text-amber-300 shrink-0">
                  {item.totalHours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

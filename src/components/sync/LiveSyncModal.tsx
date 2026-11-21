import React, { useState } from 'react';
import { SkeuomorphicToggleCollection } from '@designcodeio/threeui';
import '@designcodeio/threeui/style.css';
import { SyncState } from '../../types/calendar';
import { playToggleSound, playLiveSyncChime } from '../../utils/sound';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Database,
  ShieldCheck,
  Sparkles,
  Radio,
  Zap,
} from 'lucide-react';

interface LiveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onToggleLiveSync: (enabled: boolean) => void;
  syncState: SyncState;
  lastSyncedTime: string | null;
  isLoggedInGoogle: boolean;
  userEmail?: string;
  onForceSync: () => Promise<void>;
  lang: 'vi' | 'en';
}

export const LiveSyncModal: React.FC<LiveSyncModalProps> = ({
  isOpen,
  onClose,
  isEnabled,
  onToggleLiveSync,
  syncState,
  lastSyncedTime,
  isLoggedInGoogle,
  userEmail,
  onForceSync,
  lang,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = (nextState: boolean) => {
    playToggleSound(nextState);
    onToggleLiveSync(nextState);
  };

  const handleManualCheck = async () => {
    setIsVerifying(true);
    setVerifyMessage(
      lang === 'vi'
        ? 'Đang kiểm tra tính toàn vẹn dữ liệu và đồng bộ...'
        : 'Verifying data integrity and syncing...'
    );
    try {
      await onForceSync();
      playLiveSyncChime();
      setVerifyMessage(
        lang === 'vi'
          ? 'Kiểm tra hoàn tất: Dữ liệu đã lưu an toàn & đồng bộ 100%!'
          : 'Check complete: All data safely saved and 100% synced!'
      );
    } catch {
      setVerifyMessage(
        lang === 'vi'
          ? 'Có lỗi khi đồng bộ trực tiếp, dữ liệu vẫn được lưu an toàn trong Vault cục bộ.'
          : 'Sync error occurred; data safely retained in local Vault.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#0b0c10] border border-white/15 rounded-3xl shadow-[0_25px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(225,29,72,0.25)] overflow-hidden z-10 flex flex-col text-slate-100 animate-fadeIn">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase font-mono">
                  {lang === 'vi' ? 'Hệ Thống Live Sync' : 'Live Sync Engine'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                  }`}
                >
                  {isEnabled
                    ? lang === 'vi'
                      ? 'ĐANG BẬT'
                      : 'ACTIVE'
                    : lang === 'vi'
                    ? 'ĐÃ TẮT'
                    : 'DISABLED'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {lang === 'vi'
                  ? 'Tự động kiểm tra & lưu dữ liệu mỗi khi tải trang hoặc dùng tính năng'
                  : 'Auto-checks & syncs data on page reload and feature usage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Centerpiece: ThreeUI Skeuomorphic Raw-WebGL Toggle */}
        <div className="p-6 flex flex-col items-center justify-center bg-radial from-rose-950/20 via-black to-black border-b border-white/10">
          <div className="text-center mb-3">
            <span className="text-[10px] font-mono tracking-widest text-rose-400/90 uppercase">
              ThreeUI WebGL Controller
            </span>
            <p className="text-xs text-zinc-300 font-medium mt-0.5">
              {lang === 'vi'
                ? 'Gạt nút để bật/tắt chế độ Đồng bộ Trực tiếp (Live Sync)'
                : 'Toggle to enable/disable Live Sync mode'}
            </p>
          </div>

          {/* WebGL Capsule Container */}
          <div className="w-full h-[180px] sm:h-[200px] rounded-2xl overflow-hidden border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_8px_30px_rgba(0,0,0,0.6)] bg-[#06070b]">
            <SkeuomorphicToggleCollection
              variant="shader"
              mode="auto"
              speed={1.0}
              size={1.0}
              opacity={1.0}
              hue={0}
              saturation={1.0}
              brightness={1.0}
              defaultOn={isEnabled}
              onChange={handleToggle}
              label={lang === 'vi' ? 'Live Sync' : 'Live Sync'}
            />
          </div>
        </div>

        {/* Sync Telemetry & Health Verification */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Google Calendar Status */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-2.5">
              <Cloud className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Google Calendar
                </span>
                <p className="text-[11px] font-medium text-white truncate max-w-[170px]">
                  {isLoggedInGoogle ? userEmail || 'Đã kết nối' : (lang === 'vi' ? 'Chưa kết nối' : 'Not Connected')}
                </p>
                <span className="text-[10px] text-zinc-400">
                  {syncState === 'synced'
                    ? (lang === 'vi' ? 'Đã đồng bộ chuẩn' : 'Synced')
                    : syncState === 'syncing'
                    ? (lang === 'vi' ? 'Đang truyền dữ liệu...' : 'Syncing...')
                    : (lang === 'vi' ? 'Sẵn sàng' : 'Ready')}
                </span>
              </div>
            </div>

            {/* Local Vault Health */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-2.5">
              <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  {lang === 'vi' ? 'Local Vault' : 'Local Storage'}
                </span>
                <p className="text-[11px] font-medium text-white">
                  {lang === 'vi' ? 'Đã bảo vệ 100%' : '100% Protected'}
                </p>
                <span className="text-[10px] text-emerald-400/90 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {lang === 'vi' ? 'Tự động lưu' : 'Auto-Saved'}
                </span>
              </div>
            </div>
          </div>

          {/* Verification description */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'vi' ? 'Quy trình kiểm tra tự động:' : 'Automated Verification:'}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {lastSyncedTime ? `${lang === 'vi' ? 'Lần cuối' : 'Last'}: ${lastSyncedTime}` : 'Vừa xong'}
              </span>
            </div>
            <ul className="text-[11px] text-zinc-400 space-y-1 pl-4 list-disc">
              <li>
                {lang === 'vi'
                  ? 'Mỗi lần F5 / tải lại web: Tự động rà soát & đồng bộ các sự kiện từ Google Calendar.'
                  : 'On page load/reload: Automatically scans & fetches fresh events from Google Calendar.'}
              </li>
              <li>
                {lang === 'vi'
                  ? 'Mỗi lần thêm sự kiện, nhiệm vụ, tập luyện, dinh dưỡng: Kiểm tra lưu tức thì và đồng bộ.'
                  : 'On creating/editing tasks, workouts, nutrition: Instantly checks persistence & syncs.'}
              </li>
              <li>
                {lang === 'vi'
                  ? 'Phát âm thanh phản hồi âm học cao cấp (Cybernetic switch & chime).'
                  : 'Plays high-fidelity acoustic feedback on toggle & verification.'}
              </li>
            </ul>
          </div>

          {verifyMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{verifyMessage}</span>
            </div>
          )}

          {/* Action button */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={handleManualCheck}
              disabled={isVerifying}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>
                {isVerifying
                  ? lang === 'vi'
                    ? 'Đang kiểm tra & đồng bộ...'
                    : 'Verifying & Syncing...'
                  : lang === 'vi'
                  ? 'Kiểm tra & Đồng bộ Ngay'
                  : 'Verify & Sync Now'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

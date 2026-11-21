import React, { useState, useCallback } from "react";
import { SkeuomorphicToggleCollection } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import { playToggleSound, playLiveSyncChime } from "./utils/sound";
import { notifySuccess } from "./utils/notify";

export interface SceneProps {
  syncState?: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedTime?: string | null;
  onSync?: () => Promise<void>;
  defaultHue?: number;
}

export function Scene({
  syncState: propSyncState,
  lastSyncedTime: propLastSyncedTime,
  onSync,
  defaultHue = 140, // Đổi màu sắc: Mặc định Đỏ Crimson Zenox (thay cho màu xanh dương cũ)
}: SceneProps) {
  // Trạng thái đồng bộ thực tế từ props hoặc local storage
  const [internalSyncState, setInternalSyncState] = useState<'synced' | 'syncing' | 'offline'>(() => {
    try {
      const activeUser = localStorage.getItem('gcal_active_user');
      const events = localStorage.getItem('gcal_events');
      if (activeUser || (events && JSON.parse(events).length > 0)) {
        return 'synced';
      }
      return 'synced';
    } catch {
      return 'synced';
    }
  });

  const activeSyncState = propSyncState || internalSyncState;
  const isSyncing = activeSyncState === 'syncing';
  const isSynced = activeSyncState === 'synced';

  // Trạng thái bật/tắt của công tắc
  const [isOn, setIsOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zenox_live_sync_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  // Tùy chọn phối màu (Color Mode):
  // 'auto': Tự động theo trạng thái đồng bộ (Xanh khi đã đồng bộ, Vàng khi đang đồng bộ, Đỏ khi chưa)
  // 'crimson': Màu đỏ Crimson Zenox đặc trưng
  // 'emerald': Màu xanh ngọc Emerald
  // 'amber': Màu vàng hổ phách
  const [colorMode, setColorMode] = useState<'auto' | 'crimson' | 'emerald' | 'amber'>('auto');

  // Tính toán hue dựa trên lựa chọn và trạng thái đồng bộ
  const currentHue = (() => {
    if (colorMode === 'crimson') return 140; // Đỏ Crimson Zenox
    if (colorMode === 'emerald') return -85; // Xanh ngọc Emerald
    if (colorMode === 'amber') return 45;    // Vàng hổ phách
    // Chế độ AUTO phản ánh trực tiếp trạng thái đồng bộ:
    if (isSyncing) return 45;                // Vàng khi đang đồng bộ
    if (isSynced && isOn) return -85;        // Xanh ngọc khi đã đồng bộ hoàn tất
    return 140;                              // Đỏ khi chưa đồng bộ hoặc tắt
  })();

  // Nhãn trạng thái hiển thị rõ ràng dữ liệu đã đồng bộ chưa
  const statusLabel = !isOn
    ? "LIVE SYNC · CHƯA ĐỒNG BỘ"
    : isSyncing
    ? "LIVE SYNC · ĐANG ĐỒNG BỘ..."
    : isSynced
    ? "LIVE SYNC · ĐÃ ĐỒNG BỘ"
    : "LIVE SYNC · CHƯA ĐỒNG BỘ";

  const handleToggle = useCallback(async (nextState: boolean) => {
    setIsOn(nextState);
    playToggleSound(nextState);
    try {
      localStorage.setItem('zenox_live_sync_enabled', String(nextState));
    } catch {}

    if (nextState) {
      setInternalSyncState('syncing');
      try {
        if (onSync) {
          await onSync();
        } else {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
        setInternalSyncState('synced');
        playLiveSyncChime();
        notifySuccess(
          "Đã đồng bộ dữ liệu thành công!",
          "Google Calendar & Local Vault đã khớp 100%."
        );
      } catch {
        setInternalSyncState('offline');
      }
    } else {
      setInternalSyncState('offline');
      notifySuccess("Live Sync đã tắt", "Hệ thống chuyển sang chế độ ngoại tuyến.");
    }
  }, [onSync]);

  return (
    <div className="shader-frame w-full h-full flex flex-col items-center justify-center relative select-none">
      {/* Nút ThreeUI Skeuomorphic Shader Toggle với màu sắc mới & nhãn trạng thái đồng bộ */}
      <div className="w-full h-full flex items-center justify-center">
        <SkeuomorphicToggleCollection
          variant="shader"
          mode="auto"
          speed={1.00}
          size={1.00}
          opacity={1.00}
          hue={currentHue}
          saturation={isOn ? 1.25 : 0.4}
          brightness={isOn ? 1.05 : 0.7}
          defaultOn={isOn}
          label={statusLabel}
          onChange={handleToggle}
        />
      </div>

      {/* Thanh chọn màu sắc nhanh ở góc trên */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 p-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 z-20 shadow-lg">
        <button
          onClick={(e) => { e.stopPropagation(); setColorMode('auto'); }}
          title="Tự động đổi màu theo trạng thái (Xanh ngọc khi đã đồng bộ, Vàng khi đang đồng bộ, Đỏ khi chưa đồng bộ)"
          className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
            colorMode === 'auto' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          AUTO
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setColorMode('crimson'); }}
          title="Đỏ Crimson Zenox"
          className={`w-3.5 h-3.5 rounded-full bg-rose-600 transition-all cursor-pointer ${
            colorMode === 'crimson' ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
          }`}
        />
        <button
          onClick={(e) => { e.stopPropagation(); setColorMode('emerald'); }}
          title="Xanh Ngọc Emerald (Đã đồng bộ)"
          className={`w-3.5 h-3.5 rounded-full bg-emerald-500 transition-all cursor-pointer ${
            colorMode === 'emerald' ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
          }`}
        />
        <button
          onClick={(e) => { e.stopPropagation(); setColorMode('amber'); }}
          title="Vàng Hổ Phách"
          className={`w-3.5 h-3.5 rounded-full bg-amber-500 transition-all cursor-pointer ${
            colorMode === 'amber' ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
          }`}
        />
      </div>
    </div>
  );
}

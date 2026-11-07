import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Smartphone,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Upload,
  Footprints,
  Flame,
  Scale,
  Moon,
  Droplets,
} from 'lucide-react';
import {
  AppleHealthDayData,
  IOS_SHORTCUT_RECIPE,
  parseAppleHealthShortcutJson,
  parseAppleHealthXml,
} from '../../../services/appleHealthSync';

interface AppleHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAppleHealthData: (data: AppleHealthDayData[]) => void;
  selectedDate: string;
}

export const AppleHealthModal: React.FC<AppleHealthModalProps> = ({
  isOpen,
  onClose,
  onApplyAppleHealthData,
  selectedDate,
}) => {
  const [activeTab, setActiveTab] = useState<'shortcut' | 'xml' | 'guide'>('shortcut');
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<AppleHealthDayData[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedRecipe, setCopiedRecipe] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);

  if (!isOpen) return null;

  // Handle parse shortcut JSON
  const handleParseJson = (text: string) => {
    setJsonInput(text);
    setErrorMsg(null);
    if (!text.trim()) {
      setParsedData([]);
      return;
    }
    const results = parseAppleHealthShortcutJson(text);
    if (results.length === 0) {
      setErrorMsg('Không thể nhận diện định dạng dữ liệu từ Apple Health. Vui lòng kiểm tra lại cấu trúc JSON.');
      setParsedData([]);
    } else {
      setParsedData(results);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleParseJson(text);
    } catch {
      setErrorMsg('Trình duyệt chưa được cấp quyền đọc bộ nhớ tạm. Hãy dán trực tiếp bằng phím tắt Ctrl+V / Cmd+V.');
    }
  };

  // Handle XML File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMsg('Không thể đọc file đã chọn.');
      setIsReadingFile(false);
    };
    reader.onload = () => {
      try {
        const content = reader.result as string;
        // Parse sample or full XML
        const results = parseAppleHealthXml(content, selectedDate);
        if (results.length === 0) {
          setErrorMsg(`Không tìm thấy bản ghi Apple Health nào cho ngày ${selectedDate} trong file XML.`);
        } else {
          setParsedData(results);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi khi xử lý file XML Apple Health.');
      } finally {
        setIsReadingFile(false);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyRecipe = () => {
    navigator.clipboard.writeText(IOS_SHORTCUT_RECIPE);
    setCopiedRecipe(true);
    setTimeout(() => setCopiedRecipe(false), 2500);
  };

  const handleSyncSubmit = () => {
    if (parsedData.length === 0) return;
    onApplyAppleHealthData(parsedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1e24] w-full max-w-2xl max-h-[88vh] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-gray-100 dark:border-gray-800 bg-linear-to-r from-red-500/10 via-rose-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Đồng Bộ Apple Health (iOS)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nạp số bước chân, calo tiêu hao, cân nặng và giấc ngủ từ iPhone vào VortexCal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('shortcut')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'shortcut'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Phím Tắt iOS (1-Chạm)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('xml')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'xml'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>File Xuất Apple Health (XML)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cầu Nối Google Fit</span>
          </button>
        </div>

        {/* Tab 1: Shortcut JSON Paste */}
        {activeTab === 'shortcut' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start justify-between gap-3">
              <div>
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  Đồng bộ tức thì trong 1 giây:
                </p>
                <p className="mt-1 leading-relaxed text-[11px] opacity-90">
                  Chỉ cần chạm 1 lần vào phím tắt trên màn hình chính iPhone để đọc dữ liệu từ ứng dụng Sức Khỏe rồi bấm nút dán bên dưới.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyRecipe}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
              >
                {copiedRecipe ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRecipe ? 'Đã sao chép!' : 'Xem mẫu Phím tắt'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase text-gray-400">
                  Dán nội dung JSON từ Phím tắt iPhone:
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Dán Từ Bộ Nhớ Tạm</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={jsonInput}
                onChange={(e) => handleParseJson(e.target.value)}
                placeholder='{"date": "2026-11-07", "steps": 8500, "activeEnergyKcal": 450, "weightKg": 68.0, "sleepHours": 7.5, "waterMl": 2400}'
                className="w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Tab 2: XML Export Upload */}
        {activeTab === 'xml' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-rose-500 dark:hover:border-rose-500 transition-colors bg-gray-50/50 dark:bg-gray-900/30">
              <Upload className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Chọn file export.xml từ Apple Health
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                (Trên iPhone: Ứng dụng Sức Khỏe $\rightarrow$ Chạm Avatar $\rightarrow$ "Xuất dữ liệu sức khỏe" $\rightarrow$ chọn file export.xml)
              </p>
              <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                <span>{isReadingFile ? 'Đang đọc file...' : 'Tải file export.xml lên'}</span>
                <input
                  type="file"
                  accept=".xml"
                  disabled={isReadingFile}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Google Fit Bridge Guide */}
        {activeTab === 'guide' && (
          <div className="p-5 flex-1 overflow-y-auto space-y-3.5 text-xs leading-relaxed">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                Đồng bộ tự động 100% qua Google Fit trên iPhone:
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Nếu bạn muốn dữ liệu từ Apple Watch &amp; Apple Health tự động đồng bộ lên đám mây mà không cần copy hay tải file thủ công:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-gray-700 dark:text-gray-300 font-medium">
                <li>Cài đặt ứng dụng <strong>Google Fit</strong> miễn phí từ App Store trên iPhone.</li>
                <li>Mở Google Fit và bật tính năng: <strong>"Đồng bộ với Apple Health (HealthKit)"</strong>.</li>
                <li>Apple Health sẽ tự động chuyển giao số bước, calo đốt, cân nặng sang Google Fit.</li>
                <li>Trên VortexCal, bạn chỉ cần bấm nút <strong>"Đồng bộ Google Health"</strong> ở thanh trên cùng để nạp tức thì!</li>
              </ol>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-5 mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedData.length > 0 && (
          <div className="mx-5 mb-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã nhận diện thành công ({parsedData.length} ngày):
              </span>
              <span className="font-mono">{parsedData[0].date}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {parsedData[0].steps !== undefined && (
                <div className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-sky-500" />
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Bước chân</div>
                    <div className="font-mono font-bold text-xs">{parsedData[0].steps.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {parsedData[0].activeEnergyKcal !== undefined && (
                <div className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Calo Đốt</div>
                    <div className="font-mono font-bold text-xs">{parsedData[0].activeEnergyKcal} kcal</div>
                  </div>
                </div>
              )}

              {parsedData[0].weightKg !== undefined && (
                <div className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Cân nặng</div>
                    <div className="font-mono font-bold text-xs">{parsedData[0].weightKg} kg</div>
                  </div>
                </div>
              )}

              {parsedData[0].sleepHours !== undefined && (
                <div className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Giấc ngủ</div>
                    <div className="font-mono font-bold text-xs">{parsedData[0].sleepHours} h</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {parsedData.length > 0 ? `Sẵn sàng đồng bộ ${parsedData.length} bản ghi` : 'Chưa có bản ghi nào'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={parsedData.length === 0}
              onClick={handleSyncSubmit}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Đồng Bộ Vào VortexCal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


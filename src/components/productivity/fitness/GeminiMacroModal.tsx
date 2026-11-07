import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Camera,
  Upload,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Utensils,
  Key,
  Flame,
  PieChart,
} from 'lucide-react';
import { MealSlot } from '../../../types/productivity';
import {
  callGeminiMacroApi,
  GEMINI_NUTRITION_PROMPT_TEMPLATE,
  GeminiMacroItem,
  parseGeminiMacroResponse,
} from '../../../services/geminiSync';

interface GeminiMacroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyGeminiMacros: (items: GeminiMacroItem[]) => void;
  selectedDate: string;
  defaultSlot?: MealSlot;
}

export const GeminiMacroModal: React.FC<GeminiMacroModalProps> = ({
  isOpen,
  onClose,
  onApplyGeminiMacros,
  selectedDate,
  defaultSlot = 'lunch',
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'ingest'>('ingest');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('vortexcal_gemini_api_key') || '');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(defaultSlot);

  // Mode 1: Direct API states
  const [promptText, setPromptText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mode 2: Ingest from Gemini Chat states
  const [chatInput, setChatInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Result states
  const [parsedItems, setParsedItems] = useState<GeminiMacroItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Direct API call
  const handleCallApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setErrorMsg('Vui lòng nhập Gemini API Key của bạn.');
      return;
    }

    localStorage.setItem('vortexcal_gemini_api_key', apiKey.trim());
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await callGeminiMacroApi(promptText, apiKey.trim(), imagePreview || undefined, 'image/jpeg', selectedSlot);
      if (res.items.length === 0) {
        setErrorMsg('Gemini không tìm thấy món ăn nào trong ảnh/mô tả. Hãy thử mô tả chi tiết hơn.');
      } else {
        setParsedItems(res.items);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gọi Gemini API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Chat Ingest parsing
  const handleChatInputChange = (text: string) => {
    setChatInput(text);
    setErrorMsg(null);
    if (!text.trim()) {
      setParsedItems([]);
      return;
    }

    const items = parseGeminiMacroResponse(text, selectedSlot);
    if (items.length === 0) {
      setErrorMsg('Chưa nhận diện được macro. Hãy copy cả đoạn phân tích của Gemini hoặc dùng Prompt mẫu bên dưới.');
      setParsedItems([]);
    } else {
      setParsedItems(items);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(GEMINI_NUTRITION_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleApply = () => {
    if (parsedItems.length === 0) return;
    onApplyGeminiMacros(parsedItems);
    onClose();
  };

  const totalKcal = parsedItems.reduce((sum, it) => sum + it.kcal, 0);
  const totalProtein = Math.round(parsedItems.reduce((sum, it) => sum + it.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(parsedItems.reduce((sum, it) => sum + it.carbs, 0) * 10) / 10;
  const totalFat = Math.round(parsedItems.reduce((sum, it) => sum + it.fat, 0) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#131b2e] w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-gray-100 dark:border-slate-800 bg-linear-to-r from-blue-600/10 via-indigo-600/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Gemini AI Macro Studio
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Phân tích ảnh món ăn hoặc nhận diện văn bản tự do thành Macro &amp; Calo chính xác
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

        {/* Tab switch */}
        <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ingest')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ingest'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-gray-700'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Nạp Từ Gemini Chat (Không Cần API Key)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'api'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-gray-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Gemini AI Trực Tiếp (Ảnh &amp; API Key)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Target meal slot selector */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nạp vào bữa ăn ngày <strong className="text-blue-600 dark:text-blue-400 font-mono">{selectedDate}</strong>:
            </span>
            <div className="flex items-center gap-1">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                    selectedSlot === slot
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {slot === 'breakfast' ? 'Sáng' : slot === 'lunch' ? 'Trưa' : slot === 'dinner' ? 'Tối' : 'Phụ'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab 1: Ingest from Gemini Chat */}
          {activeTab === 'ingest' && (
            <div className="space-y-3.5">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Cách dùng với Gemini Web / App (Miễn phí):
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] opacity-90 mt-1 pl-1">
                    <li>Bấm nút bên phải để sao chép Prompt dinh dưỡng chuẩn thể hình.</li>
                    <li>Mở <strong>gemini.google.com</strong> hoặc ứng dụng Gemini trên điện thoại.</li>
                    <li>Dán prompt kèm ảnh bữa ăn hoặc dòng chat của bạn.</li>
                    <li>Sao chép toàn bộ câu trả lời của Gemini và dán vào ô bên dưới!</li>
                  </ol>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Đã sao chép!' : 'Sao chép Prompt'}</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">
                  Dán câu trả lời từ Gemini vào đây:
                </label>
                <textarea
                  rows={5}
                  value={chatInput}
                  onChange={(e) => handleChatInputChange(e.target.value)}
                  placeholder="Dán JSON hoặc kết quả phân tích từ Gemini vào đây. Ví dụ:
1. Phở bò tái: 450 kcal, 35g protein, 55g carbs, 8g fat
2. Bát cơm trắng: 200 calo, 4g đạm, 44g carb..."
                  className="mt-1 w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Direct API with Image & Text */}
          {activeTab === 'api' && (
            <form onSubmit={handleCallApi} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400 flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-500" />
                    <span>Gemini API Key</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="mt-1 w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400">Ảnh món ăn (Tùy chọn)</label>
                  <label className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300 text-xs font-semibold cursor-pointer hover:border-blue-500">
                    <Camera className="w-4 h-4 text-blue-500" />
                    <span>{imagePreview ? 'Đã chọn ảnh' : 'Tải ảnh món'}</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              {imagePreview && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 bg-black">
                  <img src={imagePreview} alt="Meal preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/60 text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">
                  Mô tả món ăn hoặc nguyên liệu (kèm ảnh hoặc chỉ văn bản):
                </label>
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Ví dụ: 1 đĩa cơm tấm sườn nướng ít mỡ, 1 trứng ốp la, 1 tô canh khổ qua thịt bằm..."
                  className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || (!promptText.trim() && !imagePreview)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-2"
                >
                  <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Gemini Đang Phân Tích...' : 'Gemini Phân Tích Macro'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã nhận diện {parsedItems.length} món ăn:
                </span>
                <span className="font-mono">
                  Tổng: {totalKcal} kcal · {totalProtein}g P · {totalCarbs}g C · {totalFat}g F
                </span>
              </div>

              <div className="space-y-1.5">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{item.name}</span>
                      <span className="text-[11px] text-gray-400 ml-1.5">
                        ({item.amount}
                        {item.unit})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold text-orange-600 dark:text-orange-400">{item.kcal} kcal</span>
                      <span className="text-gray-300 dark:text-gray-700">·</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">P: {item.protein}g</span>
                      <span className="text-gray-300 dark:text-gray-700">·</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">C: {item.carbs}g</span>
                      <span className="text-gray-300 dark:text-gray-700">·</span>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">F: {item.fat}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {parsedItems.length > 0 ? `Sẵn sàng nạp ${parsedItems.length} món vào nhật ký` : 'Chưa có món ăn nào'}
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
              disabled={parsedItems.length === 0}
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
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


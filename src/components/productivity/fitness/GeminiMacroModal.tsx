import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Utensils,
  Key,
  FileText,
  Send,
  Zap,
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
  const [activeTab, setActiveTab] = useState<'ingest' | 'api'>('ingest');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('vortexcal_gemini_api_key') || '');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(defaultSlot);

  // Tab 1: Ingest from prompt / natural text states
  const [promptInput, setPromptInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Tab 2: Direct text prompt API states
  const [naturalPromptText, setNaturalPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Result states
  const [parsedItems, setParsedItems] = useState<GeminiMacroItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Text Prompt Ingest Parsing
  const handlePromptInputChange = (text: string) => {
    setPromptInput(text);
    setErrorMsg(null);
    if (!text.trim()) {
      setParsedItems([]);
      return;
    }

    const items = parseGeminiMacroResponse(text, selectedSlot);
    if (items.length === 0) {
      setErrorMsg('Chưa nhận diện được macro. Hãy nhập theo cú pháp: [Tên món]: <số> kcal, <số>P, <số>C, <số>F hoặc dán kết quả từ AI.');
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

  const applyPreset = (presetText: string) => {
    setPromptInput(presetText);
    const items = parseGeminiMacroResponse(presetText, selectedSlot);
    setParsedItems(items);
    setErrorMsg(null);
  };

  // Direct Text Prompt API Call
  const handleCallApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setErrorMsg('Vui lòng nhập Gemini API Key để phân tích.');
      return;
    }
    if (!naturalPromptText.trim()) {
      setErrorMsg('Vui lòng nhập nội dung mô tả bữa ăn.');
      return;
    }

    localStorage.setItem('vortexcal_gemini_api_key', apiKey.trim());
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await callGeminiMacroApi(naturalPromptText, apiKey.trim(), selectedSlot);
      if (res.items.length === 0) {
        setErrorMsg('Gemini không tìm thấy món ăn nào trong mô tả. Hãy mô tả cụ thể hơn.');
      } else {
        setParsedItems(res.items);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gọi Gemini API.');
    } finally {
      setIsLoading(false);
    }
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

  // Macro Ring calculations
  const pCal = totalProtein * 4;
  const cCal = totalCarbs * 4;
  const fCal = totalFat * 9;
  const sumCal = pCal + cCal + fCal || 1;
  const pPct = pCal / sumCal;
  const cPct = cCal / sumCal;
  const fPct = fCal / sumCal;

  const circumference = 2 * Math.PI * 40; // ~251.32
  const pLen = pPct * circumference;
  const cLen = cPct * circumference;
  const fLen = fPct * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#131b2e] w-full max-w-2xl max-h-[92vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Prompt Cấu Trúc Bữa Ăn &amp; Macro
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nhập hoặc dán prompt cấu trúc bữa ăn để tự động bóc tách Calo, Đạm, Tinh bột, Chất béo
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
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Dán / Gõ Cấu Trúc Macro (Khuyên Dùng)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'api'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-slate-200 dark:border-gray-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Phân Tích Prompt Văn Bản Với Gemini API</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Target meal slot selector */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Mặc định nạp vào bữa:
            </span>
            <div className="flex items-center gap-1">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    if (promptInput.trim()) {
                      const items = parseGeminiMacroResponse(promptInput, slot);
                      setParsedItems(items);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    selectedSlot === slot
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {slot === 'breakfast' ? 'Sáng' : slot === 'lunch' ? 'Trưa' : slot === 'dinner' ? 'Tối' : 'Phụ'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab 1: Ingest from prompt / natural text */}
          {activeTab === 'ingest' && (
            <div className="space-y-3">
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-3.5 text-xs text-orange-950 dark:text-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-orange-800 dark:text-orange-300">
                    <Zap className="w-4 h-4 text-orange-500" />
                    Cú pháp nhanh hoặc kết quả từ ChatGPT / Gemini / Claude:
                  </p>
                  <p className="text-[11px] opacity-90">
                    Hỗ trợ cú pháp ngắn: <code>[Tên món] [Kcal] kcal, [P]P, [C]C, [F]F</code> hoặc JSON.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-[11px] font-bold shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Đã sao chép!' : 'Copy Prompt Mẫu'}</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('Trưa: Cơm tấm sườn bì chả 680 kcal (38P, 78C, 22F)')}
                  className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-[11px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
                >
                  🍚 Cơm tấm sườn
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Sáng: Phở bò tái gầu 480 kcal (34P, 56C, 12F)')}
                  className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-[11px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
                >
                  🍜 Phở bò
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(
                      `Sáng: Phở bò 450 kcal, 32P, 55C, 10F\nTrưa: Cơm tấm sườn 650 kcal, 38P, 75C, 20F\nTối: 200g ức gà + 200g khoai lang 380 kcal, 46P, 42C, 4F\nPhụ: 1 muỗng Whey 120 kcal, 25P, 2C, 1.5F`
                    )
                  }
                  className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-[11px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
                >
                  🥗 Thực đơn 4 bữa
                </button>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">
                  Nhập danh sách bữa ăn hoặc dán prompt macro vào đây:
                </label>
                <textarea
                  rows={5}
                  value={promptInput}
                  onChange={(e) => handlePromptInputChange(e.target.value)}
                  placeholder={`Ví dụ gõ trực tiếp:\nSáng: Phở bò tái 450 kcal, 32P, 55C, 10F\nTrưa: Cơm tấm sườn 650 kcal, 38P, 75C, 20F\nTối: 200g ức gà, khoai lang 380 kcal (45P, 40C, 4F)`}
                  className="mt-1 w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs leading-relaxed focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Direct Text Prompt API with Gemini */}
          {activeTab === 'api' && (
            <form onSubmit={handleCallApi} className="space-y-3.5">
              <div>
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
                <label className="text-[10px] font-semibold uppercase text-gray-400">
                  Nhập văn bản mô tả bữa ăn (Prompt tự do):
                </label>
                <textarea
                  rows={3}
                  value={naturalPromptText}
                  onChange={(e) => setNaturalPromptText(e.target.value)}
                  placeholder="Ví dụ: Trưa nay ăn 1 đĩa cơm gà xối mỡ, 1 bát canh cải thịt băm, uống 1 ly nước mía ít ngọt..."
                  className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !naturalPromptText.trim()}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-2"
                >
                  <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Gemini Đang Phân Tích Prompt...' : 'Gemini Phân Tích Macro'}</span>
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

          {/* Parsed Result Preview with CTG Macro Ring */}
          {parsedItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Bóc tách thành công {parsedItems.length} món ăn:
                </span>
                <span className="text-gray-500 text-[11px]">
                  Bữa ngày: <strong className="text-blue-600 dark:text-blue-400">{selectedDate}</strong>
                </span>
              </div>

              {/* CTG Macro Ring Visualization */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-gray-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-gray-700">
                {/* SVG Ring */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-800" fill="none" />
                    {/* Protein stroke (CTG Green) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#75c6ac"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${pLen} ${circumference}`}
                      strokeDashoffset="0"
                    />
                    {/* Carbs stroke (CTG Lime) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#97f64f"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${cLen} ${circumference}`}
                      strokeDashoffset={-pLen}
                    />
                    {/* Fat stroke (CTG Orange) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#ff6025"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${fLen} ${circumference}`}
                      strokeDashoffset={-(pLen + cLen)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black font-mono leading-none text-gray-900 dark:text-gray-100">{totalKcal}</span>
                    <span className="text-[9px] uppercase font-bold text-gray-400">kcal</span>
                  </div>
                </div>

                {/* Macro breakdown badges */}
                <div className="flex-1 grid grid-cols-3 gap-2 w-full text-center">
                  <div className="p-2 rounded-lg bg-[#75c6ac]/15 border border-[#75c6ac]/30">
                    <div className="text-[10px] font-bold text-[#1f6b54] dark:text-[#75c6ac] uppercase">Đạm (P)</div>
                    <div className="text-sm font-black font-mono text-gray-900 dark:text-gray-100">{totalProtein}g</div>
                    <div className="text-[9px] text-gray-400">{Math.round(pPct * 100)}% calo</div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#97f64f]/15 border border-[#97f64f]/30">
                    <div className="text-[10px] font-bold text-[#4c8024] dark:text-[#97f64f] uppercase">Carbs (C)</div>
                    <div className="text-sm font-black font-mono text-gray-900 dark:text-gray-100">{totalCarbs}g</div>
                    <div className="text-[9px] text-gray-400">{Math.round(cPct * 100)}% calo</div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#ff6025]/15 border border-[#ff6025]/30">
                    <div className="text-[10px] font-bold text-[#b33900] dark:text-[#ff804d] uppercase">Béo (F)</div>
                    <div className="text-sm font-black font-mono text-gray-900 dark:text-gray-100">{totalFat}g</div>
                    <div className="text-[9px] text-gray-400">{Math.round(fPct * 100)}% calo</div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[9px] font-bold uppercase text-gray-600 dark:text-gray-300">
                        {item.slot === 'breakfast' ? 'Sáng' : item.slot === 'lunch' ? 'Trưa' : item.slot === 'dinner' ? 'Tối' : 'Phụ'}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold text-orange-600 dark:text-orange-400">{item.kcal} kcal</span>
                      <span className="text-gray-300 dark:text-gray-700">·</span>
                      <span className="text-[#1f6b54] dark:text-[#75c6ac] font-semibold">{item.protein}P</span>
                      <span className="text-gray-300 dark:text-gray-700">·</span>
                      <span className="text-[#4c8024] dark:text-[#97f64f] font-semibold">{item.carbs}C</span>
                      <span className="text-gray-300 dark:text-gray-700">·</span>
                      <span className="text-[#b33900] dark:text-[#ff804d] font-semibold">{item.fat}F</span>
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
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Vào Nhật Ký Bữa Ăn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

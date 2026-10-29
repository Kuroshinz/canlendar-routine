import React, { useState, useMemo } from 'react';
import { X, Sparkles, Clock, Calendar as CalIcon, ArrowRight } from 'lucide-react';
import { parseNaturalLanguageInput } from '../utils/calendarUtils';
import { CalendarEvent } from '../types/calendar';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: CalendarEvent) => void;
  currentDate: Date;
  lang: 'vi' | 'en';
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onAddEvent,
  currentDate,
  lang,
}) => {
  const [inputText, setInputText] = useState('');

  const parsed = useMemo(() => {
    if (!inputText.trim()) return null;
    return parseNaturalLanguageInput(inputText, currentDate);
  }, [inputText, currentDate]);

  if (!isOpen) return null;

  const suggestions = lang === 'vi'
    ? [
        'Há»p chiáº¿n lÆ°á»£c lÃºc 10h sÃ¡ng mai',
        'Ä‚n trÆ°a cÃ¹ng nhÃ³m thiáº¿t káº¿ lÃºc 12h thá»© 6',
        'Gáº·p khÃ¡ch hÃ ng lÃºc 15h30 chiá»u mai',
        'Táº­p gym lÃºc 18h hÃ ng ngÃ y',
      ]
    : [
        'Team retrospective at 10am tomorrow',
        'Lunch with design leads on Friday at 12:30pm',
        'Client demo tomorrow at 3pm',
        'Daily standup at 9am',
      ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed || !parsed.title.trim()) return;

    const newEvent: CalendarEvent = {
      id: `ev-qa-${Date.now()}`,
      title: parsed.title,
      startDate: parsed.date,
      startTime: parsed.startTime,
      endDate: parsed.date,
      endTime: parsed.endTime,
      allDay: false,
      calendarId: 'personal',
      color: '#039BE5',
      type: 'event',
      createdAt: Date.now(),
    };

    onAddEvent(newEvent);
    setInputText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/45 backdrop-blur-2xs">
      <div className="bg-white dark:bg-[#1a1e24] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold">
              {lang === 'vi' ? 'Táº¡o nhanh sá»± kiá»‡n thÃ´ng minh' : 'Quick Create with Natural Language'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#242931] text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                lang === 'vi'
                  ? 'VÃ­ dá»¥: Há»p bÃ¡o cÃ¡o tiáº¿n Ä‘á»™ 14h ngÃ y mai'
                  : 'E.g.: Product review tomorrow at 2pm'
              }
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-blue-300 dark:border-blue-700 focus:border-blue-500 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none bg-blue-50/20 dark:bg-gray-800 shadow-xs"
            />
          </div>

          {/* Parsed Live Preview */}
          {parsed && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
              <span className="font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                {lang === 'vi' ? 'Káº¿t quáº£ phÃ¢n tÃ­ch:' : 'Parsed Result:'}
              </span>
              <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                {parsed.title}
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 font-mono">
                <span className="flex items-center gap-1">
                  <CalIcon className="w-3.5 h-3.5 text-blue-500" />
                  {parsed.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {parsed.startTime} â€“ {parsed.endTime}
                </span>
              </div>
            </div>
          )}

          {/* Sample Prompts */}
          <div>
            <span className="text-[11px] font-medium text-gray-400 block mb-1.5">
              {lang === 'vi' ? 'Gá»£i Ã½ cÃ¢u lá»‡nh máº«u:' : 'Suggestions:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(s)}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              {lang === 'vi' ? 'Há»§y' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!parsed || !parsed.title.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>{lang === 'vi' ? 'Táº¡o sá»± kiá»‡n' : 'Add event'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


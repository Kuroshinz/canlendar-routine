import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Hand,
  MessageSquare,
  Users,
  Share2,
  Smile,
  ShieldCheck,
  Send,
  MoreVertical,
  Volume2,
} from 'lucide-react';
import { CalendarEvent } from '../types/calendar';

interface GoogleMeetRoomProps {
  event: CalendarEvent;
  onLeave: () => void;
  lang: 'vi' | 'en';
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export const GoogleMeetRoom: React.FC<GoogleMeetRoomProps> = ({ event, onLeave, lang }) => {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState<'people' | 'chat' | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string }[]>([]);

  // In-call chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'm-1', sender: 'Hương Mai', text: 'Chào mọi người, em đã tải lên bản thiết kế mới trong Google Drive rồi ạ.', time: '09:32' },
    { id: 'm-2', sender: 'Tuấn Anh', text: 'Ok Hương, team dev đang xem qua và thấy giao diện mới rất mượt.', time: '09:34' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const participants = [
    { name: 'Bạn (Nhân Nguyễn)', role: lang === 'vi' ? 'Người tổ chức' : 'Host', avatar: 'N', color: '#1a73e8', isSpeaking: true },
    { name: 'Hương Mai', role: 'Lead Designer', avatar: 'H', color: '#e3742f', isSpeaking: false },
    { name: 'Tuấn Anh', role: 'Tech Lead', avatar: 'T', color: '#188038', isSpeaking: false },
    { name: 'David Trần', role: 'Đối tác', avatar: 'D', color: '#a142f4', isSpeaking: false },
  ];

  const handleSendReaction = (emoji: string) => {
    const id = `r-${Date.now()}-${Math.random()}`;
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setChatMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: 'Bạn (Nhân Nguyễn)',
        text: newMessage.trim(),
        time: timeStr,
      },
    ]);
    setNewMessage('');
  };

  const meetCode = event.meetUrl ? event.meetUrl.replace('https://meet.google.com/', '') : 'meet-call-room';

  return (
    <div className="fixed inset-0 z-50 bg-[#202124] text-white flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-200">
      {/* Floating animated reactions container */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex gap-3">
        {floatingReactions.map((r) => (
          <span key={r.id} className="text-3xl animate-bounce">
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Top Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm sm:text-base truncate max-w-xs sm:max-w-md">
              {event.title}
            </span>
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
              | {meetCode}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800">
            <ShieldCheck className="w-3 h-3" />
            <span className="hidden sm:inline">{lang === 'vi' ? 'Đã mã hóa đầu cuối' : 'Encrypted'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Main Body: Video Grid + Side Drawer */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Video Tiles Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
          {participants.map((p, idx) => {
            const isMe = idx === 0;

            return (
              <div
                key={idx}
                className="bg-[#3c4043] rounded-2xl relative overflow-hidden flex flex-col items-center justify-center shadow-lg border border-gray-700 group"
              >
                {/* Simulated video background or avatar */}
                {isMe && !cameraOn ? (
                  <div
                    style={{ backgroundColor: p.color }}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md"
                  >
                    {p.avatar}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-linear-to-b from-gray-700 to-[#1a1e24] relative">
                    <div
                      style={{ backgroundColor: p.color }}
                      className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold shadow-xl border-4 border-white/10"
                    >
                      {p.avatar}
                    </div>

                    {/* Speaking indicator wave */}
                    {p.isSpeaking && micOn && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full text-emerald-400 text-xs">
                        <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                        <span className="text-[10px]">{lang === 'vi' ? 'Đang nói' : 'Speaking'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Participant name bar */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-lg backdrop-blur-xs">
                  <span className="text-xs font-medium text-white">{p.name}</span>
                  {isMe ? (
                    micOn ? (
                      <Mic className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-red-400" />
                    )
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-gray-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Side Panel (People or Chat) */}
        {activeTab && (
          <div className="w-80 bg-[#282a2d] rounded-2xl border border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-right duration-150">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {activeTab === 'people'
                  ? (lang === 'vi' ? 'Mọi người (4)' : 'People (4)')
                  : (lang === 'vi' ? 'Tin nhắn cuộc gọi' : 'In-call Messages')}
              </h3>
              <button
                onClick={() => setActiveTab(null)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* People Tab */}
            {activeTab === 'people' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {participants.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: p.color }}
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                      >
                        {p.avatar}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.role}</p>
                      </div>
                    </div>
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((m) => (
                    <div key={m.id} className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-400">{m.sender}</span>
                        <span className="text-[10px] text-gray-500">{m.time}</span>
                      </div>
                      <p className="text-gray-200 bg-gray-700/40 p-2 rounded-lg">{m.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={lang === 'vi' ? 'Gửi tin nhắn...' : 'Send message...'}
                    className="flex-1 bg-gray-800 text-xs px-3 py-2 rounded-lg border border-gray-700 focus:outline-blue-500 text-white placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="h-20 flex items-center justify-center gap-3 px-6 shrink-0 relative bg-[#202124] border-t border-gray-800">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mic Button */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              micOn ? 'bg-[#3c4043] hover:bg-[#474a4d] text-white' : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera Button */}
          <button
            onClick={() => setCameraOn(!cameraOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              cameraOn ? 'bg-[#3c4043] hover:bg-[#474a4d] text-white' : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Raise Hand */}
          <button
            onClick={() => setHandRaised(!handRaised)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              handRaised ? 'bg-amber-400 text-gray-950 font-bold' : 'bg-[#3c4043] hover:bg-[#474a4d] text-white'
            }`}
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Emoji Reactions */}
          <div className="hidden sm:flex items-center gap-1 bg-[#3c4043] px-2 py-1 rounded-full">
              {['👏', '👍', '❤️', '🎉'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-sm cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Leave Call (Red Pill) */}
          <button
            onClick={onLeave}
            className="px-6 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 font-medium text-xs cursor-pointer shadow-lg transition-transform hover:scale-105 ml-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Rời cuộc họp' : 'Leave call'}</span>
          </button>
        </div>

        {/* Side Panel toggles on the right */}
        <div className="absolute right-6 hidden md:flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'people' ? null : 'people')}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              activeTab === 'people' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              activeTab === 'chat' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { X, Award, CheckCircle2, ArrowRight, Building2, Calendar, User, Mail, Sparkles, BookOpen } from 'lucide-react';
import { SystemLetterData, ScreenView } from '../types';

interface SystemLetterModalProps {
  letter: SystemLetterData | null;
  onClose: () => void;
  onNavigate: (view: ScreenView) => void;
}

export const SystemLetterModal: React.FC<SystemLetterModalProps> = ({
  letter,
  onClose,
  onNavigate,
}) => {
  if (!letter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Official Header Banner */}
        <div className="bg-gradient-to-r from-[#B90013] via-[#94000F] to-[#73000C] text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng thư"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#B90013] flex items-center justify-center font-black text-sm shadow-md shrink-0">
              PTIT
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-red-200">
                Học viện Công nghệ Bưu chính Viễn thông
              </p>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Trung tâm Hỗ trợ Sinh viên & Hướng nghiệp PTIT
              </h2>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
            <Mail className="w-3.5 h-3.5" />
            <span>Thư thông báo trực tiếp từ hệ thống</span>
          </div>
        </div>

        {/* Letter Metadata Info Card */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs shrink-0">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Người nhận:
            </span>
            <p className="font-bold text-[#131B2E]">
              {letter.recipientName} • {letter.recipientMajor} ({letter.recipientYear})
            </p>
          </div>

          <div className="space-y-0.5 sm:text-right">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 sm:justify-end">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Ngày gửi:
            </span>
            <p className="font-bold text-slate-700">{letter.sentDate}</p>
          </div>
        </div>

        {/* Scrollable Letter Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-slate-700 leading-relaxed text-sm">
          {/* Letter Title */}
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base sm:text-lg font-black text-[#131B2E]">
              {letter.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              V/v: {letter.subject}
            </p>
          </div>

          {/* Greeting */}
          {letter.greeting && (
            <p className="font-bold text-slate-900">
              {letter.greeting}
            </p>
          )}

          {/* Paragraphs */}
          <div className="space-y-3.5 text-justify">
            {letter.content.map((paragraph, idx) => (
              <p key={idx} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Recommendations Highlight Box */}
          {letter.recommendations && letter.recommendations.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-100 space-y-2.5">
              <div className="flex items-center gap-2 text-[#B90013] font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Khuyến nghị trọng tâm dành cho bạn</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {letter.recommendations.map((rec, rIdx) => (
                  <li key={rIdx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#B90013] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signature & Stamp */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 italic">
              Văn bản điện tử được phát hành tự động qua Cổng Hướng nghiệp PTIT.
            </div>
            <div className="text-right space-y-1 shrink-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {letter.senderRole}
              </p>
              <div className="h-10 flex items-center justify-end">
                <div className="px-3 py-1 rounded-md bg-red-50 text-[#B90013] text-[10px] font-black border border-red-200 inline-block uppercase">
                  Đã xác thực điện tử PTIT
                </div>
              </div>
              <p className="text-sm font-extrabold text-[#131B2E]">
                {letter.sender}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-colors text-xs cursor-pointer"
          >
            Đóng thông báo
          </button>

          {letter.ctaLabel && letter.ctaView && (
            <button
              onClick={() => {
                onClose();
                onNavigate(letter.ctaView!);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{letter.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

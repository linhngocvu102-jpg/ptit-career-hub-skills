import React, { useState, useEffect } from 'react';
import { ScreenView, CareerEvent, UserAuth } from '../../types';
import { loadAuthSession } from '../../services/userService';
import {
  Calendar,
  Clock,
  MapPin,
  Bookmark,
  Share2,
  ChevronLeft,
  Users,
  Award,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Send,
  X,
  FileText,
  Mail,
  Phone,
  ArrowRight,
  UserCheck,
  CalendarPlus,
  ListPlus,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const TASKS_STORAGE_KEY = 'ptit_career_hub_tasks_v2';

interface EventDetailViewProps {
  event: CareerEvent;
  allEvents: CareerEvent[];
  onBack: () => void;
  onNavigate: (view: ScreenView) => void;
  onSelectEventDetail?: (event: CareerEvent) => void;
  onToggleSaveEvent?: (eventId: string) => void;
  auth?: UserAuth;
  onRequireLogin?: (reason?: string) => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event,
  allEvents,
  onBack,
  onNavigate,
  onSelectEventDetail,
  onToggleSaveEvent,
  auth,
  onRequireLogin,
}) => {
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const checkIsTaskAdded = (): boolean => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list.some(
            (t: any) => t.id === `task-event-${event.id}` || t.eventId === event.id
          );
        }
      }
    } catch {}
    return false;
  };

  const [isTaskAdded, setIsTaskAdded] = useState<boolean>(checkIsTaskAdded);

  useEffect(() => {
    setIsTaskAdded(checkIsTaskAdded());
    const handleStorageChange = () => {
      setIsTaskAdded(checkIsTaskAdded());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ptit_tasks_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ptit_tasks_updated', handleStorageChange);
    };
  }, [event.id]);

  const showToast = (msg: string, actionLabel?: string, onAction?: () => void) => {
    setToastMessage({ text: msg, actionLabel, onAction });
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const handleToggleTask = () => {
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      let list: any[] = [];
      if (raw) {
        try {
          list = JSON.parse(raw) || [];
        } catch {
          list = [];
        }
      }

      const taskId = `task-event-${event.id}`;
      const exists = list.some((t: any) => t.id === taskId || t.eventId === event.id);

      if (exists) {
        list = list.filter((t: any) => t.id !== taskId && t.eventId !== event.id);
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(list));
        setIsTaskAdded(false);
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(
          new CustomEvent('ptit_tasks_updated', { detail: { eventId: event.id, action: 'removed' } })
        );
        showToast(`Đã gỡ sự kiện "${event.title}" khỏi My Tasks`);
      } else {
        const isUserLoggedIn = Boolean(auth?.isLoggedIn || loadAuthSession()?.isLoggedIn);
        if (!isUserLoggedIn) {
          if (onRequireLogin) {
            onRequireLogin('Vui lòng đăng nhập để thêm sự kiện vào danh sách nhiệm vụ');
          } else {
            showToast('⚠️ Vui lòng đăng nhập để thêm task');
          }
          return;
        }

        const monthClean = event.month ? event.month.replace(/[^0-9]/g, '') : '10';
        const safeMonth = (monthClean || '10').padStart(2, '0');
        const safeDay = String(event.day || '25').padStart(2, '0');
        const isoDate = `2026-${safeMonth}-${safeDay}`;

        const newTask = {
          id: taskId,
          eventId: event.id,
          title: `Tham gia: ${event.title}`,
          description: `${event.time} • ${event.location} • Đơn vị: ${event.organizer}`,
          category: 'learning',
          priority: event.eventType === 'Career' ? 'high' : 'medium',
          dueDate: event.date || `${event.day}/${safeMonth}/2026`,
          startDate: isoDate,
          externalLink: event.registrationUrl || 'https://careerhub.ptit.edu.vn',
          completed: false,
          linkedView: 'events',
          actionText: 'Xem Sự kiện',
        };

        list = [newTask, ...list];
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(list));
        setIsTaskAdded(true);
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(
          new CustomEvent('ptit_tasks_updated', { detail: { eventId: event.id, action: 'added' } })
        );

        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } catch {}

        showToast(
          'Đã thêm sự kiện vào danh sách My Tasks!',
          'Xem My Tasks',
          () => onNavigate('my-tasks')
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSave = () => {
    if (onToggleSaveEvent) {
      onToggleSaveEvent(event.id);
    }
    showToast(
      event.isSaved
        ? `Đã bỏ lưu sự kiện "${event.title}"`
        : `Đã lưu sự kiện "${event.title}" vào mục đã lưu!`
    );
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Đã sao chép liên kết sự kiện vào bộ nhớ tạm!');
  };

  const handleAddToCalendar = () => {
    // Generate Google Calendar Link
    const startTimeFormatted = '20261025T123000Z';
    const endTimeFormatted = '20261025T143000Z';
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${startTimeFormatted}/${endTimeFormatted}&details=${encodeURIComponent(
      event.description
    )}&location=${encodeURIComponent(event.location)}`;
    window.open(calUrl, '_blank');
  };

  // Related events
  const relatedEvents = allEvents
    .filter(
      (ev) =>
        ev.id !== event.id &&
        (ev.eventType === event.eventType ||
          ev.relatedCareers.some((c) => event.relatedCareers.includes(c)))
    )
    .slice(0, 3);

  const fillPercentage =
    event.maxSlots && event.registeredCount
      ? Math.min(100, Math.round((event.registeredCount / event.maxSlots) * 100))
      : 75;

  return (
    <div className="max-w-[1150px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 bg-[#131B2E] text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="max-w-xs">{toastMessage.text}</span>
          {toastMessage.actionLabel && (
            <button
              onClick={() => {
                if (toastMessage.onAction) toastMessage.onAction();
                setToastMessage(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#B90013] hover:bg-[#A30010] text-white text-[11px] font-bold cursor-pointer transition-colors shrink-0"
            >
              {toastMessage.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#B90013] transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-red-200 group-hover:bg-red-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-[#B90013]" />
          </div>
          <span>Quay lại danh sách sự kiện</span>
        </button>

        {/* Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span
            onClick={() => onNavigate('home')}
            className="hover:text-slate-700 cursor-pointer"
          >
            Trang chủ
          </span>
          <span>/</span>
          <span
            onClick={() => onNavigate('events')}
            className="hover:text-slate-700 cursor-pointer"
          >
            Sự kiện
          </span>
          <span>/</span>
          <span className="text-[#131B2E] font-bold truncate max-w-[200px]">
            {event.title}
          </span>
        </div>
      </div>

      {/* Hero Event Banner Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_24px_rgba(15,23,42,0.05)] relative overflow-hidden">
        {/* Subtle Decorative Gradient Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-100/40 via-purple-50/30 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 space-y-6">
          {/* Event Header & Organizer */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#131B2E] leading-tight">
              {event.title}
            </h1>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-base shrink-0">
                {event.organizerLogo || '🏛️'}
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Đơn vị chủ trì & tổ chức:</span>
                <span className="font-bold text-[#131B2E]">{event.organizer}</span>
              </div>
            </div>
          </div>

          {/* Khối 3 Ô xám Thông tin Tổng quan (Đã xóa Số lượng tham gia) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                <Calendar className="w-4 h-4 text-[#B90013]" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Ngày diễn ra</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-[#131B2E]">{event.date}</p>
            </div>

            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                <Clock className="w-4 h-4 text-[#712AE2]" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Khung giờ</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-[#131B2E]">{event.time}</p>
            </div>

            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Địa điểm</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-[#131B2E] truncate" title={event.location}>
                {event.location}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={event.registrationUrl || event.sourceUrl || 'https://ptit.edu.vn'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#B90013] hover:bg-[#A30010] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Đến trang chính của sự kiện</span>
              </a>

              {/* Thanh thêm vào My Tasks */}
              <button
                id={`btn-detail-add-task-${event.id}`}
                onClick={handleToggleTask}
                className={`px-4 py-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                  isTaskAdded
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-gradient-to-r from-red-50 to-white hover:bg-[#B90013] text-[#B90013] hover:text-white border-red-200 hover:border-[#B90013]'
                }`}
                title={isTaskAdded ? 'Nhấn để gỡ khỏi My Tasks' : 'Thêm sự kiện này vào My Tasks'}
              >
                {isTaskAdded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đã thêm vào My Tasks</span>
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4 shrink-0" />
                    <span>Thêm vào My Tasks</span>
                  </>
                )}
              </button>

              <button
                onClick={handleToggleSave}
                className={`p-3 rounded-2xl border transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer ${
                  event.isSaved
                    ? 'bg-red-50 border-red-200 text-[#B90013]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${event.isSaved ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{event.isSaved ? 'Đã lưu' : 'Lưu sự kiện'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToCalendar}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Thêm vào Google Calendar"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Google Calendar</span>
              </button>

              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Chia sẻ sự kiện"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className={relatedEvents.length > 0 ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : "max-w-4xl mx-auto"}>
        {/* Left Column: Detailed Content */}
        <div className={relatedEvents.length > 0 ? "lg:col-span-2 space-y-6" : "space-y-6"}>
          {/* Section 1: Overview Description */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#B90013]" />
              <span>Tổng quan & Ý nghĩa chương trình</span>
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <p>{event.detailedContent || event.description}</p>
              {event.detailedContent && event.description && event.detailedContent !== event.description && (
                <p>{event.description}</p>
              )}
            </div>
          </div>

          {/* Section: Speakers & Mentors (Tùy chọn - Tự động ẩn nếu không có diễn giả) */}
          {event.speakers &&
            event.speakers.length > 0 &&
            event.speakers.some((sp) => sp.name && sp.name.trim().length > 0) && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
                <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Diễn giả & Khách mời chuyên gia</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {event.speakers
                    .filter((sp) => sp.name && sp.name.trim().length > 0)
                    .map((sp, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/90 flex items-start gap-3.5"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#B90013] font-black text-lg flex items-center justify-center shrink-0 border border-red-200">
                          {sp.name.charAt(0)}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#131B2E] truncate">
                            {sp.name}
                          </h4>
                          <p className="text-[11px] font-bold text-[#B90013]">{sp.role}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{sp.company}</p>
                          {sp.bio && (
                            <p className="text-[11px] text-slate-600 leading-snug pt-1">
                              {sp.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}


          {/* Section 5: Target Audience */}
          {event.targetAudience && event.targetAudience.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>Đối tượng & Yêu cầu tham dự</span>
              </h2>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                {event.targetAudience.map((aud, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <span>{aud}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 6: Related Skills & Fields */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E]">
              Kỹ năng & Lĩnh vực thu nhận được
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-2">KỸ NĂNG TRỌNG TÂM:</span>
                <div className="flex flex-wrap gap-2">
                  {event.relatedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#712AE2] text-xs font-bold border border-purple-100"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-400 block mb-2">NGÀNH NGHỀ LIÊN QUAN:</span>
                <div className="flex flex-wrap gap-2">
                  {event.relatedCareers.map((car) => (
                    <span
                      key={car}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      {car}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Related Events Widget (if any) */}
        {relatedEvents.length > 0 && (
          <div className="space-y-6">
            {/* Related Events Widget */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4 sticky top-20">
              <h3 className="text-sm font-extrabold text-[#131B2E]">
                Sự kiện tương tự cùng chủ đề
              </h3>
              <div className="space-y-3">
                {relatedEvents.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => {
                      if (onSelectEventDetail) {
                        onSelectEventDetail(rel);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50/40 border border-slate-100 hover:border-red-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                      <span className="font-bold text-[#B90013]">{rel.date}</span>
                      <span>•</span>
                      <span>{rel.eventType}</span>
                    </div>
                    <h4 className="text-xs font-bold text-[#131B2E] group-hover:text-[#B90013] transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">{rel.organizer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

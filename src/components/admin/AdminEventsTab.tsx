import React, { useState, useEffect, useRef } from 'react';
import { FirestoreEvent, CareerEvent } from '../../types';
import {
  loadAllEventsFromStorage,
  adminSaveEvent,
  adminDeleteEvent,
  adminToggleEventStatus,
  adminVerifyEvent,
  seedVerifiedEventsToFirestore,
  convertToCareerEvent,
  extractEventDateParts,
  subscribeToEvents,
} from '../../services/events/eventService';
import {
  Calendar,
  Search,
  Building2,
  ExternalLink,
  Edit2,
  Trash2,
  Award,
  Sparkles,
  AlertCircle,
  X,
  Plus,
  Clock,
  MapPin,
  Users,
  FileText,
  UserCheck,
  Upload,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminEventsTabProps {
  events?: FirestoreEvent[];
  onRefreshEvents?: () => Promise<void> | void;
  showToast?: (msg: string) => void;
  onEventsUpdated?: (events: CareerEvent[]) => void;
}

const EVENTS_STORAGE_KEY = 'ptit_career_hub_admin_events_v1';

const PTIT_ORGANIZERS = [
  'Phòng Công tác Sinh viên (CTSV) PTIT',
  'Đoàn Thanh niên - Hội Sinh viên PTIT',
  'CLB Kế toán - Kiểm toán trẻ PTIT',
  'CLB Marketing PTIT (PMC)',
  'CLB Thương mại điện tử PTIT (PEC)',
  'Viện Công nghệ Thông tin & Truyền thông CDIT',
  'Doanh nghiệp Đối tác PTIT',
];

export const AdminEventsTab: React.FC<AdminEventsTabProps> = ({
  showToast,
  onRefreshEvents,
  onEventsUpdated,
}) => {
  const [eventsList, setEventsList] = useState<FirestoreEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTargetEvent, setDeleteTargetEvent] = useState<FirestoreEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Exact 11/12 Form fields requested (Capacity removed completely):
  const [eventTitle, setEventTitle] = useState('');
  const [organizer, setOrganizer] = useState(PTIT_ORGANIZERS[0]);
  const [organizerLogo, setOrganizerLogo] = useState('🏛️');
  const [eventDate, setEventDate] = useState('2026-11-18');
  const [eventTime, setEventTime] = useState('14:00 - 17:00');
  const [location, setLocation] = useState('Hội trường A2, PTIT Cơ sở Hà Đông');
  const [detailLink, setDetailLink] = useState('');
  const [trainingPoints, setTrainingPoints] = useState<string>('3');
  const [speakers, setSpeakers] = useState('');
  const [targetAudience, setTargetAudience] = useState('Sinh viên PTIT mọi khóa');
  const [skillsGained, setSkillsGained] = useState('');
  const [description, setDescription] = useState('');

  // Live Firestore Real-Time Subscription
  useEffect(() => {
    // 1. Initial load from Firestore
    loadAllEventsFromStorage()
      .then((all) => {
        setEventsList(all);
        if (onRefreshEvents) onRefreshEvents();
      })
      .catch((err) => {
        console.warn('Initial events fetch failed:', err);
      });

    // 2. Real-time onSnapshot listener for instant updates across all browsers
    const unsubscribe = subscribeToEvents(
      (liveEvents) => {
        setEventsList(liveEvents);
        if (onRefreshEvents) onRefreshEvents();
        if (onEventsUpdated) {
          const activeCareerEvents = liveEvents
            .filter((e) => e.status === 'active' && e.verified)
            .map(convertToCareerEvent);
          onEventsUpdated(activeCareerEvents);
        }
      },
      (error) => {
        console.warn('Firestore events subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    if (showToast) {
      showToast(msg);
    }
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    } catch {}
  };

  // Reset form
  const handleResetForm = () => {
    setEditingEventId(null);
    setEventTitle('');
    setOrganizer(PTIT_ORGANIZERS[0]);
    setOrganizerLogo('🏛️');
    setEventDate('2026-11-18');
    setEventTime('14:00 - 17:00');
    setLocation('Hội trường A2, PTIT Cơ sở Hà Đông');
    setDetailLink('');
    setTrainingPoints('3');
    setSpeakers('');
    setTargetAudience('Sinh viên PTIT mọi khóa');
    setSkillsGained('');
    setDescription('');
    setFormError(null);
  };

  // Edit event
  const handleEditEvent = (event: FirestoreEvent) => {
    setEditingEventId(event.id);
    setEventTitle(event.title || '');
    setOrganizer(event.organizer || PTIT_ORGANIZERS[0]);
    setOrganizerLogo(event.organizerLogo || '🏛️');
    
    // Normalize date to YYYY-MM-DD
    let dateStr = event.date || '2026-11-18';
    if (dateStr.includes('/')) {
      const p = dateStr.split('/');
      if (p.length === 3) {
        dateStr = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
    }
    setEventDate(dateStr);
    setEventTime(event.time || '14:00 - 17:00');
    setLocation(event.location || 'Hội trường A2, PTIT Cơ sở Hà Đông');
    setDetailLink(event.registrationUrl || event.sourceUrl || '');

    // Training points (optional)
    if (event.trainingPoints !== undefined) {
      setTrainingPoints(String(event.trainingPoints));
    } else {
      const pointsMatch = (event.benefits || []).find((b) => b.toLowerCase().includes('điểm rèn luyện'));
      if (pointsMatch) {
        const num = parseInt(pointsMatch.replace(/\D/g, ''), 10);
        setTrainingPoints(!isNaN(num) ? String(num) : '');
      } else {
        setTrainingPoints('');
      }
    }

    // Speakers (optional)
    if (event.speakers && event.speakers.length > 0) {
      const spText = event.speakers
        .map((s) => `${s.name}${s.role ? ' - ' + s.role : ''}${s.company ? ' - ' + s.company : ''}`)
        .join('\n');
      setSpeakers(spText);
    } else {
      setSpeakers('');
    }

    setTargetAudience(event.targetAudience || 'Sinh viên PTIT mọi khóa');

    // Extract skills
    if (event.skillsGained && event.skillsGained.length > 0) {
      setSkillsGained(event.skillsGained.join(', '));
    } else if (event.benefits) {
      const skillsList = event.benefits.filter(
        (b) => !b.toLowerCase().includes('điểm rèn luyện') && !b.toLowerCase().includes('chứng nhận')
      );
      setSkillsGained(skillsList.join(', '));
    } else {
      setSkillsGained('');
    }

    setDescription(event.description || '');
    setFormError(null);

    // Scroll smoothly to form
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Quick helper to suggest skills
  const handleQuickSuggestSkills = () => {
    const suggestions = [
      'Kỹ năng viết CV chuẩn ATS',
      'AI Prompting & Ứng dụng Gemini',
      'Kỹ năng phỏng vấn chuyên nghiệp',
      'Xây dựng Portfolio thực chiến',
      'Networking & Kết nối Doanh nghiệp',
    ];
    setSkillsGained(suggestions.join(', '));
    triggerToast('✨ Đã điền các kỹ năng rèn luyện trọng tâm!');
  };

  // Submit Form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!eventTitle.trim()) {
      setFormError('Vui lòng nhập tên sự kiện / workshop.');
      return;
    }
    if (!organizer.trim()) {
      setFormError('Vui lòng nhập đơn vị tổ chức sự kiện.');
      return;
    }
    if (!eventDate.trim()) {
      setFormError('Vui lòng chọn ngày diễn ra sự kiện.');
      return;
    }
    if (!eventTime.trim()) {
      setFormError('Vui lòng nhập khung giờ diễn ra (VD: 14:00 - 17:00).');
      return;
    }
    if (!location.trim()) {
      setFormError('Vui lòng nhập địa điểm tổ chức sự kiện.');
      return;
    }
    if (!detailLink.trim()) {
      setFormError('Vui lòng nhập link đăng ký tham gia.');
      return;
    }

    // Validate URL
    let formattedDetailLink = detailLink.trim();
    if (!formattedDetailLink.startsWith('http://') && !formattedDetailLink.startsWith('https://')) {
      formattedDetailLink = `https://${formattedDetailLink}`;
    }

    try {
      new URL(formattedDetailLink);
    } catch {
      setFormError('Link đăng ký không đúng định dạng URL (VD: https://ptit.edu.vn/events/workshop).');
      return;
    }

    const parsedSkills = skillsGained
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Optional training points
    const pointsNum = trainingPoints.trim() ? parseInt(trainingPoints.trim(), 10) : undefined;
    const finalPoints = pointsNum !== undefined && !isNaN(pointsNum) && pointsNum > 0 ? pointsNum : undefined;

    // Optional speakers parsing
    const parsedSpeakers = speakers.trim()
      ? speakers
          .split(/[\n]+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const parts = line.split('-').map((p) => p.trim());
            return {
              name: parts[0] || line,
              role: parts[1] || 'Diễn giả khách mời',
              company: parts[2] || organizer.trim(),
            };
          })
      : [];

    const benefits = [
      ...parsedSkills,
      ...(finalPoints ? [`+${finalPoints} Điểm rèn luyện`] : []),
      'Cấp Giấy chứng nhận tham gia sự kiện',
    ];

    const finalId = editingEventId || `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const existingEvent = eventsList.find((ev) => ev.id === finalId);
    const nowIso = new Date().toISOString();
    const eventPayload: FirestoreEvent = {
      id: finalId,
      title: eventTitle.trim(),
      organizer: organizer.trim(),
      organizerLogo: organizerLogo.trim() || '🏛️',
      date: eventDate.trim(),
      time: eventTime.trim(),
      location: location.trim(),
      locationType: location.toLowerCase().includes('online') || location.toLowerCase().includes('zoom') ? 'online' : 'offline',
      category: 'workshop',
      description: description.trim() || `Sự kiện "${eventTitle.trim()}" do ${organizer.trim()} tổ chức nhằm nâng cao năng lực thực chiến, kỹ năng nghề nghiệp và kết nối việc làm cho sinh viên PTIT.`,
      speakers: parsedSpeakers.length > 0 ? parsedSpeakers : undefined,
      targetAudience: targetAudience.trim() || 'Sinh viên PTIT mọi khóa',
      skillsGained: parsedSkills,
      benefits,
      trainingPoints: finalPoints,
      registrationUrl: formattedDetailLink,
      sourceUrl: formattedDetailLink,
      publishedAt: existingEvent?.publishedAt || nowIso.split('T')[0],
      expiresAt: eventDate.trim(),
      status: existingEvent?.status || 'active',
      verified: true,
      createdAt: existingEvent?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    setIsSubmitting(true);
    try {
      // 1. Direct write to Firestore collection /events as single source of truth
      const saveRes = await adminSaveEvent(eventPayload);
      if (!saveRes.success) {
        setFormError(saveRes.error || 'Lỗi khi lưu sự kiện lên Firestore.');
        setIsSubmitting(false);
        return;
      }

      if (editingEventId) {
        triggerToast(`Đã cập nhật sự kiện "${eventTitle}" lên Firestore thành công!`);
      } else {
        triggerToast(`Đã đăng sự kiện mới "${eventTitle}" lên Firestore thành công!`);
      }

      // 2. Reset form
      handleResetForm();
    } catch (err: any) {
      console.error('Error saving event to Firestore:', err);
      setFormError(err?.message ? `Lỗi Firestore: ${err.message}` : 'Không thể lưu sự kiện lên Firestore. Vui lòng kiểm tra quyền quản trị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Event Status directly in Firestore (Bật / Tắt / Ẩn)
  const handleToggleEventStatus = async (event: FirestoreEvent) => {
    const nextStatus = event.status === 'active' ? 'hidden' : 'active';
    try {
      await adminToggleEventStatus(event.id, nextStatus);
      triggerToast(`Đã ${nextStatus === 'active' ? 'bật hiển thị' : 'tắt / ẩn'} sự kiện "${event.title}" trên Firestore.`);
    } catch (err: any) {
      triggerToast(`Lỗi cập nhật Firestore: ${err?.message || 'Không thể đổi trạng thái sự kiện'}`);
    }
  };

  // Delete Event directly in Firestore
  const confirmDeleteEvent = async () => {
    if (!deleteTargetEvent) return;

    setIsDeleting(true);
    try {
      // 1. Delete directly from Firestore collection /events
      await adminDeleteEvent(deleteTargetEvent.id);
      triggerToast(`Đã xóa sự kiện "${deleteTargetEvent.title}" khỏi Firestore thành công.`);
      setDeleteTargetEvent(null);

      if (editingEventId === deleteTargetEvent.id) {
        handleResetForm();
      }
    } catch (err: any) {
      console.error('Failed to delete event from Firestore:', err);
      triggerToast(`Lỗi xóa Firestore: ${err?.message || 'Không thể xóa sự kiện trên Firestore'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Seed sample PTIT events to Firestore if Firestore is empty
  const handleSeedEvents = async () => {
    setIsSeeding(true);
    try {
      const res = await seedVerifiedEventsToFirestore();
      if (res.error) {
        triggerToast(`Lỗi khởi tạo sự kiện: ${res.error}`);
      } else {
        triggerToast(`Đã khởi tạo thành công ${res.count} sự kiện chuẩn lên Firestore!`);
      }
    } catch (err: any) {
      triggerToast(`Lỗi khởi tạo: ${err?.message || 'Thất bại'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Filter events
  const filteredEvents = eventsList.filter((e) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      e.organizer.toLowerCase().includes(q) ||
      (e.benefits || []).some((b) => b.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. FORM ĐĂNG / CHỈNH SỬA SỰ KIỆN & WORKSHOP */}
      <div
        ref={formRef}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-extrabold text-[#131B2E]">
                {editingEventId ? 'Chỉnh sửa Sự kiện & Workshop' : 'Đăng tuyển Sự kiện & Workshop Mới'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Đăng tải workshop, talkshow định hướng và sự kiện kết nối doanh nghiệp dành riêng cho sinh viên PTIT.
            </p>
          </div>

          {editingEventId && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Đang sửa sự kiện
              </span>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Hủy sửa
              </button>
            </div>
          )}
        </div>

        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-[#B90013] flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Field 1: Tên Sự kiện (Event Title) * */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>1. Tên sự kiện / Workshop (Event Title)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="VD: Workshop Kỹ năng Tạo CV bằng AI, Talkshow Chinh phục HR..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 2: Đơn vị chủ trì & tổ chức (Organizer) * */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>2. Đơn vị chủ trì & tổ chức (Organizer)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                list="admin-ptit-organizers-list"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="VD: Phòng Công tác Sinh viên (CTSV) PTIT..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
              <datalist id="admin-ptit-organizers-list">
                {PTIT_ORGANIZERS.map((org) => (
                  <option key={org} value={org} />
                ))}
              </datalist>
            </div>

            {/* Field 3: Logo Đơn vị (Organizer Logo) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>3. Logo / Biểu tượng Đơn vị (Organizer Logo)</span>
                </label>
                <div className="flex items-center gap-1">
                  {['🏛️', '🏢', '🤖', '🎓', '💡'].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setOrganizerLogo(icon)}
                      className="px-1.5 py-0.5 rounded text-xs hover:bg-slate-100 cursor-pointer"
                      title={`Chọn ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                  {organizerLogo.startsWith('http') ? (
                    <img src={organizerLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span>{organizerLogo || '🏛️'}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={organizerLogo}
                  onChange={(e) => setOrganizerLogo(e.target.value)}
                  placeholder="Nhập biểu tượng (🏛️, 🏢) hoặc URL ảnh logo"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
                />
              </div>
            </div>

            {/* Field 4: Ngày diễn ra (Event Date - type="date") * */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>4. Ngày diễn ra (Event Date)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Hệ thống tự động bóc tách Ngày & Tháng hiển thị Khối Lịch to (THG / NGÀY)
              </p>
            </div>

            {/* Field 5: Khung giờ (Time) * */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>5. Khung giờ (Time)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="VD: 14:00 - 17:00 (hoặc 08:30 - 11:30)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 6: Địa điểm (Location) * */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>6. Địa điểm (Location)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="VD: Hội trường A2, PTIT Cơ sở Hà Đông (hoặc Trực tuyến qua Zoom)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 7: Link Đăng ký / Trang chính sự kiện (Registration Link) * */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>7. Link Đăng ký / Trang chính sự kiện (Registration Link)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={detailLink}
                onChange={(e) => setDetailLink(e.target.value)}
                placeholder="https://ptit.edu.vn/events/workshop-cv-ai"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 8: Điểm rèn luyện cộng thêm (Training Points) - [KHÔNG BẮT BUỘC / OPTIONAL] */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>8. Điểm rèn luyện cộng thêm (Training Points)</span>
                  <span className="text-slate-400 font-normal lowercase">(Tùy chọn)</span>
                </label>
                <div className="flex items-center gap-1">
                  {['3', '5', '8'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTrainingPoints(val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        trainingPoints === val
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{val} điểm
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTrainingPoints('')}
                    className="px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Bỏ trống
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                max="25"
                value={trainingPoints}
                onChange={(e) => setTrainingPoints(e.target.value)}
                placeholder="VD: 3, 5, 8... (Để trống nếu không cộng điểm rèn luyện)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 10: Đối tượng tham dự (Target Audience) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>10. Đối tượng tham dự (Target Audience)</span>
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="VD: Sinh viên PTIT mọi khóa (hoặc Sinh viên năm 3, 4 ngành CNTT)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 9: Danh sách Diễn giả / Khách mời (Speakers) - [KHÔNG BẮT BUỘC / OPTIONAL] */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>9. Danh sách Diễn giả / Khách mời (Speakers)</span>
                  <span className="text-slate-400 font-normal lowercase">(Tùy chọn - không bắt buộc)</span>
                </label>
                {speakers && (
                  <button
                    type="button"
                    onClick={() => setSpeakers('')}
                    className="text-[11px] text-slate-400 hover:text-red-600 underline cursor-pointer"
                  >
                    Xóa diễn giả (ẩn khối diễn giả)
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value)}
                placeholder={`Nhập mỗi diễn giả 1 dòng theo định dạng: Tên - Chức vụ - Doanh nghiệp\nVD: ThS. Nguyễn Hoàng Lan - Talent Acquisition Lead - VNG Corporation\nTrần Đức Toàn - Senior Product Manager - FPT Software\n(Nếu bỏ trống, hệ thống sẽ tự động ẩn khối Diễn giả ở trang chi tiết sinh viên)`}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                💡 Lưu ý: Nếu Admin bỏ trống trường này, khối "Diễn giả & Khách mời" sẽ tự động ẩn trên trang chi tiết sự kiện của sinh viên.
              </p>
            </div>

            {/* Field 11: Kỹ năng & Lĩnh vực (Skills/Tags) */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>11. Kỹ năng & Lĩnh vực thu nhận được (Skills/Tags)</span>
                </label>
                <button
                  type="button"
                  onClick={handleQuickSuggestSkills}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Gợi ý kỹ năng mẫu</span>
                </button>
              </div>
              <input
                type="text"
                value={skillsGained}
                onChange={(e) => setSkillsGained(e.target.value)}
                placeholder="VD: Kỹ năng tạo CV, AI Prompting, Phỏng vấn xin việc, Đàm phán lương (phân tách bằng dấu phẩy)..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 12: Tổng quan & Nội dung chi tiết (Description/Agenda) */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>12. Tổng quan & Nội dung chi tiết sự kiện (Description/Agenda)</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả mục tiêu, ý nghĩa chương trình, nội dung chi tiết và quyền lợi khi sinh viên tham dự sự kiện..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {editingEventId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {editingEventId ? (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span>Cập nhật Sự kiện</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Đăng Sự kiện Mới</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. BẢNG DANH SÁCH SỰ KIỆN & WORKSHOP ĐÃ ĐĂNG */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-extrabold text-[#131B2E]">
                Danh sách Sự kiện & Workshop ({filteredEvents.length}/{eventsList.length})
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Database className="w-3 h-3 text-emerald-600" />
                Firestore Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Toàn bộ sự kiện được đồng bộ trực tiếp từ Firestore sang trang Sự kiện (`/events`) và Lộ trình (`/career-map`).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSeeding}
              onClick={handleSeedEvents}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              title="Khởi tạo sự kiện và workshop chuẩn PTIT lên Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Đang đồng bộ...' : 'Đồng bộ sự kiện mẫu lên Firestore'}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm sự kiện, đơn vị..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#B90013] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Tên sự kiện & Đơn vị tổ chức</th>
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4 min-w-[200px]">Kỹ năng tích lũy</th>
                <th className="py-3.5 px-4 text-center">Điểm rèn luyện</th>
                <th className="py-3.5 px-4 text-center">Link đăng ký</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold">Không tìm thấy sự kiện nào.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const isEditingThis = editingEventId === ev.id;
                  const pointsMatch = (ev.benefits || []).find((b) => b.toLowerCase().includes('điểm rèn luyện'));
                  const pointsNumber =
                    ev.trainingPoints !== undefined && ev.trainingPoints !== null
                      ? ev.trainingPoints
                      : pointsMatch
                      ? parseInt(pointsMatch.replace(/\D/g, ''), 10) || undefined
                      : undefined;

                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isEditingThis ? 'bg-red-50/40' : ''
                      }`}
                    >
                      {/* Tên sự kiện & Đơn vị */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-[#131B2E]">
                          {ev.title}
                        </div>
                        <div className="text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ev.organizer}</span>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ev.date}</span>
                        </div>
                        {ev.time && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{ev.time}</span>
                          </div>
                        )}
                      </td>

                      {/* Kỹ năng tích lũy */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(ev.benefits || [])
                            .filter((b) => !b.toLowerCase().includes('điểm rèn luyện'))
                            .slice(0, 3)
                            .map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md text-[10px] font-medium"
                              >
                                {sk}
                              </span>
                            ))}
                        </div>
                      </td>

                      {/* Điểm rèn luyện */}
                      <td className="py-3.5 px-4 text-center">
                        {pointsNumber ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-xs">
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+{pointsNumber} điểm</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Link đăng ký */}
                      <td className="py-3.5 px-4 text-center">
                        {ev.registrationUrl ? (
                          <a
                            href={ev.registrationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#B90013] hover:underline font-bold text-xs"
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Thao tác: [Bật/Tắt] [✏️ Sửa] và [🗑️ Xóa] */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Nút Bật/Tắt Hiển thị */}
                          <button
                            type="button"
                            onClick={() => handleToggleEventStatus(ev)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                              ev.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={ev.status === 'active' ? 'Đang bật hiển thị - Bấm để tắt/ẩn' : 'Đang tắt/ẩn - Bấm để bật hiển thị'}
                          >
                            {ev.status === 'active' ? (
                              <>
                                <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Bật</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                                <span>Ẩn</span>
                              </>
                            )}
                          </button>

                          {/* Nút Sửa */}
                          <button
                            type="button"
                            onClick={() => handleEditEvent(ev)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Chỉnh sửa sự kiện này"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>

                          {/* Nút Xóa */}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetEvent(ev)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Xóa sự kiện này"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#B90013] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base sm:text-lg font-extrabold text-[#131B2E]">
                Xác nhận xóa sự kiện?
              </h4>
              <p className="text-xs text-slate-500">
                Bạn có chắc chắn muốn xóa sự kiện{' '}
                <strong className="text-slate-800">"{deleteTargetEvent.title}"</strong> do{' '}
                <strong className="text-slate-800">{deleteTargetEvent.organizer}</strong> tổ chức?
                Sự kiện này sẽ được gỡ bỏ ngay lập tức khỏi trang Sự kiện và Lộ trình Career Map.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

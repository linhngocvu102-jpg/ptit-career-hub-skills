import React, { useState, useEffect } from 'react';
import {
  AdminSystemLetter,
  ScreenView,
  PTIT_MAJORS,
  FirestoreNotification,
  FirestoreNews,
} from '../../types';
import {
  loadAllLettersFromStorage,
  loadAllLettersFromFirestore,
  adminSaveLetter,
  adminDeleteLetter,
  seedInitialLettersToFirestore,
  ADMIN_LETTER_TEMPLATES,
} from '../../services/letters/systemLetterService';
import {
  subscribeToSystemLetters,
  subscribeToFirestoreNotifications,
  subscribeToNews,
  saveNotificationToFirestore,
  deleteNotificationFromFirestore,
  saveNewsToFirestore,
  deleteNewsFromFirestore,
} from '../../services/firebase';
import { SystemLetterModal } from '../SystemLetterModal';
import { showToast as triggerGlobalToast } from '../../utils/toast';
import {
  Mail,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Send,
  Sparkles,
  AlertCircle,
  X,
  FileText,
  User,
  Calendar,
  Building2,
  Layers,
  ArrowRight,
  Filter,
  Check,
  Bell,
  Newspaper,
  RotateCcw,
  Tag,
  ExternalLink,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminLettersTabProps {
  showToast?: (msg: string) => void;
  onNavigate?: (view: ScreenView) => void;
}

export const AdminLettersTab: React.FC<AdminLettersTabProps> = ({
  showToast,
  onNavigate = (_view: ScreenView) => {},
}) => {
  const triggerToast = (msg: string) => {
    if (showToast) showToast(msg);
    triggerGlobalToast(msg);
  };

  // Section Selector: 'letters' | 'notifications' | 'news'
  const [subSection, setSubSection] = useState<'letters' | 'notifications' | 'news'>('letters');

  // =========================================================================
  // 1. SYSTEM LETTERS STATE & SUBSCRIBER
  // =========================================================================
  const [lettersList, setLettersList] = useState<AdminSystemLetter[]>([]);
  const [letterSearchTerm, setLetterSearchTerm] = useState('');
  const [letterFilterStatus, setLetterFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [letterFilterMajor, setLetterFilterMajor] = useState<string>('all');
  const [isLetterFormOpen, setIsLetterFormOpen] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [previewLetter, setPreviewLetter] = useState<AdminSystemLetter | null>(null);
  const [isSubmittingLetter, setIsSubmittingLetter] = useState(false);
  const [isDeletingLetterId, setIsDeletingLetterId] = useState<string | null>(null);
  const [isSeedingLetters, setIsSeedingLetters] = useState(false);

  // Letter Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('ThS. Trần Hoàng Nam');
  const [senderRole, setSenderRole] = useState('Giám đốc Trung tâm Hỗ trợ Sinh viên & Khởi nghiệp Học viện (PTIT)');
  const [sentDate, setSentDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [targetMajor, setTargetMajor] = useState('all');
  const [targetYear, setTargetYear] = useState('all');
  const [greeting, setGreeting] = useState('Thân gửi các bạn sinh viên PTIT,');
  const [contentParagraphs, setContentParagraphs] = useState<string[]>([
    'Thay mặt Ban Quản trị Học viện PTIT, Thầy gửi đến các em thông báo hướng nghiệp chính thức.',
  ]);
  const [recommendations, setRecommendations] = useState<string[]>([
    'Chủ động cập nhật hồ sơ và kỹ năng trên hệ thống',
  ]);
  const [ctaLabel, setCtaLabel] = useState('Khám phá Lộ trình 3 Cột mốc ngay');
  const [ctaView, setCtaView] = useState<ScreenView>('roadmap');
  const [letterStatus, setLetterStatus] = useState<'published' | 'draft'>('published');
  const [letterFormError, setLetterFormError] = useState<string | null>(null);

  // =========================================================================
  // 2. NOTIFICATIONS STATE & SUBSCRIBER
  // =========================================================================
  const [notificationsList, setNotificationsList] = useState<FirestoreNotification[]>([]);
  const [notifSearchTerm, setNotifSearchTerm] = useState('');
  const [notifFilterType, setNotifFilterType] = useState<string>('all');
  const [isNotifFormOpen, setIsNotifFormOpen] = useState(false);
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);
  const [isSubmittingNotif, setIsSubmittingNotif] = useState(false);
  const [notifFormError, setNotifFormError] = useState<string | null>(null);

  // Notif Form Fields
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'system' | 'job' | 'event' | 'alert'>('system');
  const [notifLinkView, setNotifLinkView] = useState<ScreenView>('home');
  const [notifTargetMajor, setNotifTargetMajor] = useState('all');
  const [notifStatus, setNotifStatus] = useState<'active' | 'inactive'>('active');

  // =========================================================================
  // 3. NEWS STATE & SUBSCRIBER
  // =========================================================================
  const [newsList, setNewsList] = useState<FirestoreNews[]>([]);
  const [newsSearchTerm, setNewsSearchTerm] = useState('');
  const [newsFilterCategory, setNewsFilterCategory] = useState<string>('all');
  const [isNewsFormOpen, setIsNewsFormOpen] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [newsFormError, setNewsFormError] = useState<string | null>(null);

  // News Form Fields
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsCategory, setNewsCategory] = useState<'tin_tuc' | 'su_kien' | 'tuyen_dung' | 'hoc_bong'>('tin_tuc');
  const [newsAuthor, setNewsAuthor] = useState('Ban Quản Trị PTIT Career Hub');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsStatus, setNewsStatus] = useState<'published' | 'draft'>('published');

  // =========================================================================
  // REAL-TIME FIRESTORE SUBSCRIPTIONS
  // =========================================================================
  useEffect(() => {
    // 1. Subscribe to Firestore /system_letters
    const unsubLetters = subscribeToSystemLetters((letters) => {
      if (letters) {
        setLettersList(letters);
      }
    });

    // 2. Subscribe to Firestore /notifications
    const unsubNotifs = subscribeToFirestoreNotifications((notifs) => {
      if (notifs) {
        setNotificationsList(notifs);
      }
    });

    // 3. Subscribe to Firestore /news
    const unsubNews = subscribeToNews((items) => {
      if (items) {
        setNewsList(items);
      }
    });

    // Initial fallback load if offline
    loadAllLettersFromFirestore().then((initial) => {
      if (initial && initial.length > 0) setLettersList(initial);
    });

    return () => {
      unsubLetters();
      unsubNotifs();
      unsubNews();
    };
  }, []);

  // =========================================================================
  // LETTER ACTIONS (DIRECT FIRESTORE)
  // =========================================================================
  const handleOpenCreateLetter = () => {
    setEditingLetterId(null);
    setTitle('');
    setSubject('');
    setSender('ThS. Trần Hoàng Nam');
    setSenderRole('Giám đốc Trung tâm Hỗ trợ Sinh viên & Khởi nghiệp Học viện (PTIT)');
    setSentDate(new Date().toLocaleDateString('vi-VN'));
    setTargetMajor('all');
    setTargetYear('all');
    setGreeting('Thân gửi các bạn sinh viên PTIT,');
    setContentParagraphs([
      'Thay mặt Ban Quản trị Học viện PTIT, Thầy gửi đến các em thông báo chính thức về định hướng và phát triển nghề nghiệp.',
      'Hệ thống đã phân tích các yêu cầu thực tế từ hơn 200+ doanh nghiệp đối tác hàng đầu trong mạng lưới của Học viện để đề xuất lộ trình và cơ hội phù hợp nhất.',
    ]);
    setRecommendations([
      'Lựa chọn 1 vị trí mục tiêu cụ thể tại mục "Việc làm" để kích hoạt Cột mốc 3',
      'Tải CV định dạng PDF để hệ thống đánh giá mức độ tương thích ATS',
    ]);
    setCtaLabel('Khám phá Lộ trình 3 Cột mốc ngay');
    setCtaView('roadmap');
    setLetterStatus('published');
    setLetterFormError(null);
    setIsLetterFormOpen(true);
  };

  const handleApplyTemplate = (templateIdx: number) => {
    const t = ADMIN_LETTER_TEMPLATES[templateIdx];
    if (!t) return;
    setEditingLetterId(null);
    setTitle(t.title);
    setSubject(t.subject);
    setSender(t.sender);
    setSenderRole(t.senderRole);
    setSentDate(new Date().toLocaleDateString('vi-VN'));
    setTargetMajor(t.targetMajor);
    setTargetYear(t.targetYear || 'all');
    setGreeting(t.greeting || 'Thân gửi các bạn sinh viên PTIT,');
    setContentParagraphs([...t.content]);
    setRecommendations([...t.recommendations]);
    setCtaLabel(t.ctaLabel || 'Xem ngay');
    setCtaView(t.ctaView || 'jobs');
    setLetterStatus(t.status);
    setLetterFormError(null);
    setIsLetterFormOpen(true);
    triggerToast(`Đã áp dụng mẫu thư: "${t.title}"`);
  };

  const handleEditLetter = (letter: AdminSystemLetter) => {
    setEditingLetterId(letter.id);
    setTitle(letter.title);
    setSubject(letter.subject);
    setSender(letter.sender);
    setSenderRole(letter.senderRole);
    setSentDate(letter.sentDate);
    setTargetMajor(letter.targetMajor);
    setTargetYear(letter.targetYear || 'all');
    setGreeting(letter.greeting || '');
    setContentParagraphs(letter.content.length > 0 ? [...letter.content] : ['']);
    setRecommendations(letter.recommendations?.length > 0 ? [...letter.recommendations] : []);
    setCtaLabel(letter.ctaLabel || '');
    setCtaView(letter.ctaView || 'roadmap');
    setLetterStatus(letter.status);
    setLetterFormError(null);
    setIsLetterFormOpen(true);
  };

  const handleSubmitLetterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setLetterFormError('Vui lòng nhập Tiêu đề thư thông báo.');
      return;
    }
    if (!subject.trim()) {
      setLetterFormError('Vui lòng nhập Trích yếu (V/v).');
      return;
    }
    const cleanParagraphs = contentParagraphs.map((p) => p.trim()).filter(Boolean);
    if (cleanParagraphs.length === 0) {
      setLetterFormError('Vui lòng nhập ít nhất một đoạn nội dung thư.');
      return;
    }

    const payload: Partial<AdminSystemLetter> = {
      ...(editingLetterId ? { id: editingLetterId } : {}),
      title: title.trim(),
      subject: subject.trim(),
      sender: sender.trim() || 'Trung tâm Hướng nghiệp PTIT',
      senderRole: senderRole.trim() || 'Học viện Công nghệ Bưu chính Viễn thông',
      sentDate: sentDate.trim() || new Date().toLocaleDateString('vi-VN'),
      targetMajor,
      targetYear,
      greeting: greeting.trim(),
      content: cleanParagraphs,
      recommendations: recommendations.map((r) => r.trim()).filter(Boolean),
      ctaLabel: ctaLabel.trim() || undefined,
      ctaView: ctaLabel.trim() ? ctaView : undefined,
      status: letterStatus,
    };

    setIsSubmittingLetter(true);
    try {
      const saved = await adminSaveLetter(payload);
      setIsLetterFormOpen(false);

      if (saved.status === 'published') {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        triggerToast(`✨ Đã lưu và phát hành thư lên Firestore thành công!`);
      } else {
        triggerToast(`Đã lưu bản nháp thư thông báo lên Firestore.`);
      }
    } catch (err: any) {
      console.error('Error saving letter to Firestore:', err);
      setLetterFormError(err?.message ? `Lỗi Firestore: ${err.message}` : 'Không thể lưu thư thông báo lên Firestore.');
    } finally {
      setIsSubmittingLetter(false);
    }
  };

  const handleDeleteLetter = async (id: string, letterTitle: string) => {
    try {
      await adminDeleteLetter(id);
      setIsDeletingLetterId(null);
      triggerToast(`Đã xóa thư "${letterTitle}" khỏi Firestore.`);
    } catch (err: any) {
      triggerToast(`Lỗi xóa Firestore: ${err?.message || 'Không thể xóa'}`);
    }
  };

  const handleToggleLetterStatus = async (letter: AdminSystemLetter) => {
    const nextStatus = letter.status === 'published' ? 'draft' : 'published';
    try {
      await adminSaveLetter({ ...letter, status: nextStatus });
      triggerToast(
        nextStatus === 'published'
          ? `Đã kích hoạt phát hành thư trên Firestore!`
          : `Đã thu hồi thư về trạng thái Bản nháp trên Firestore.`
      );
    } catch (err: any) {
      triggerToast(`Lỗi cập nhật Firestore: ${err?.message || 'Thất bại'}`);
    }
  };

  const handleSeedLetters = async () => {
    setIsSeedingLetters(true);
    try {
      const res = await seedInitialLettersToFirestore();
      if (res.error) {
        triggerToast(`Lỗi khởi tạo: ${res.error}`);
      } else {
        triggerToast(`Đã khởi tạo ${res.count} thư chuẩn lên Firestore thành công!`);
      }
    } catch (err: any) {
      triggerToast(`Lỗi khởi tạo: ${err?.message || 'Thất bại'}`);
    } finally {
      setIsSeedingLetters(false);
    }
  };

  // =========================================================================
  // NOTIFICATION ACTIONS (DIRECT FIRESTORE)
  // =========================================================================
  const handleOpenCreateNotif = () => {
    setEditingNotifId(null);
    setNotifTitle('');
    setNotifMessage('');
    setNotifType('system');
    setNotifLinkView('home');
    setNotifTargetMajor('all');
    setNotifStatus('active');
    setNotifFormError(null);
    setIsNotifFormOpen(true);
  };

  const handleEditNotif = (notif: FirestoreNotification) => {
    setEditingNotifId(notif.id);
    setNotifTitle(notif.title);
    setNotifMessage(notif.message);
    setNotifType(notif.type || 'system');
    setNotifLinkView(notif.linkView || 'home');
    setNotifTargetMajor(notif.targetMajor || 'all');
    setNotifStatus(notif.status || 'active');
    setNotifFormError(null);
    setIsNotifFormOpen(true);
  };

  const handleSubmitNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim()) {
      setNotifFormError('Vui lòng nhập tiêu đề thông báo.');
      return;
    }
    if (!notifMessage.trim()) {
      setNotifFormError('Vui lòng nhập nội dung thông báo.');
      return;
    }

    const finalId = editingNotifId || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const payload: FirestoreNotification = {
      id: finalId,
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      type: notifType,
      linkView: notifLinkView,
      targetMajor: notifTargetMajor,
      status: notifStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: 'PTIT Admin',
    };

    setIsSubmittingNotif(true);
    try {
      const ok = await saveNotificationToFirestore(payload);
      if (!ok) throw new Error('Không thể ghi dữ liệu lên Firestore');
      setIsNotifFormOpen(false);
      triggerToast(editingNotifId ? 'Đã cập nhật thông báo lên Firestore!' : 'Đã tạo thông báo mới trên Firestore!');
    } catch (err: any) {
      setNotifFormError(err?.message ? `Lỗi Firestore: ${err.message}` : 'Lưu thất bại.');
    } finally {
      setIsSubmittingNotif(false);
    }
  };

  const handleDeleteNotif = async (id: string, notifTitle: string) => {
    try {
      await deleteNotificationFromFirestore(id);
      triggerToast(`Đã xóa thông báo "${notifTitle}" khỏi Firestore.`);
    } catch (err: any) {
      triggerToast(`Lỗi xóa: ${err?.message || 'Không thể xóa'}`);
    }
  };

  const handleToggleNotifStatus = async (notif: FirestoreNotification) => {
    const nextStatus = notif.status === 'active' ? 'inactive' : 'active';
    try {
      await saveNotificationToFirestore({ ...notif, status: nextStatus });
      triggerToast(`Đã ${nextStatus === 'active' ? 'bật' : 'tắt'} thông báo trên Firestore.`);
    } catch (err: any) {
      triggerToast(`Lỗi đổi trạng thái: ${err?.message || 'Thất bại'}`);
    }
  };

  // =========================================================================
  // NEWS ACTIONS (DIRECT FIRESTORE)
  // =========================================================================
  const handleOpenCreateNews = () => {
    setEditingNewsId(null);
    setNewsTitle('');
    setNewsSummary('');
    setNewsContent('');
    setNewsCategory('tin_tuc');
    setNewsAuthor('Ban Quản Trị PTIT Career Hub');
    setNewsImageUrl('https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80');
    setNewsStatus('published');
    setNewsFormError(null);
    setIsNewsFormOpen(true);
  };

  const handleEditNews = (item: FirestoreNews) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsSummary(item.summary);
    setNewsContent(item.content);
    setNewsCategory(item.category || 'tin_tuc');
    setNewsAuthor(item.author || 'Ban Quản Trị PTIT Career Hub');
    setNewsImageUrl(item.imageUrl || '');
    setNewsStatus(item.status || 'published');
    setNewsFormError(null);
    setIsNewsFormOpen(true);
  };

  const handleSubmitNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim()) {
      setNewsFormError('Vui lòng nhập tiêu đề bản tin.');
      return;
    }
    if (!newsSummary.trim()) {
      setNewsFormError('Vui lòng nhập tóm tắt bản tin.');
      return;
    }

    const finalId = editingNewsId || `news_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const payload: FirestoreNews = {
      id: finalId,
      title: newsTitle.trim(),
      summary: newsSummary.trim(),
      content: newsContent.trim() || newsSummary.trim(),
      category: newsCategory,
      author: newsAuthor.trim() || 'Ban Quản Trị PTIT',
      imageUrl: newsImageUrl.trim() || undefined,
      publishedAt: new Date().toISOString().split('T')[0],
      status: newsStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: 'PTIT Admin',
    };

    setIsSubmittingNews(true);
    try {
      const ok = await saveNewsToFirestore(payload);
      if (!ok) throw new Error('Không thể ghi dữ liệu lên Firestore');
      setIsNewsFormOpen(false);
      triggerToast(editingNewsId ? 'Đã cập nhật bản tin lên Firestore!' : 'Đã đăng bản tin mới lên Firestore!');
    } catch (err: any) {
      setNewsFormError(err?.message ? `Lỗi Firestore: ${err.message}` : 'Lưu thất bại.');
    } finally {
      setIsSubmittingNews(false);
    }
  };

  const handleDeleteNews = async (id: string, itemTitle: string) => {
    try {
      await deleteNewsFromFirestore(id);
      triggerToast(`Đã xóa bản tin "${itemTitle}" khỏi Firestore.`);
    } catch (err: any) {
      triggerToast(`Lỗi xóa: ${err?.message || 'Không thể xóa'}`);
    }
  };

  const handleToggleNewsStatus = async (item: FirestoreNews) => {
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      await saveNewsToFirestore({ ...item, status: nextStatus });
      triggerToast(`Đã ${nextStatus === 'published' ? 'phát hành' : 'chuyển sang bản nháp'} bản tin trên Firestore.`);
    } catch (err: any) {
      triggerToast(`Lỗi đổi trạng thái: ${err?.message || 'Thất bại'}`);
    }
  };

  // =========================================================================
  // FILTERED LISTS
  // =========================================================================
  const filteredLetters = lettersList.filter((letter) => {
    const q = letterSearchTerm.toLowerCase();
    const matchSearch =
      letter.title.toLowerCase().includes(q) ||
      letter.subject.toLowerCase().includes(q) ||
      letter.sender.toLowerCase().includes(q);
    const matchStatus = letterFilterStatus === 'all' || letter.status === letterFilterStatus;
    const matchMajor = letterFilterMajor === 'all' || letter.targetMajor === letterFilterMajor || letter.targetMajor === 'all';
    return matchSearch && matchStatus && matchMajor;
  });

  const filteredNotifs = notificationsList.filter((n) => {
    const q = notifSearchTerm.toLowerCase();
    const matchSearch = n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    const matchType = notifFilterType === 'all' || n.type === notifFilterType;
    return matchSearch && matchType;
  });

  const filteredNews = newsList.filter((nw) => {
    const q = newsSearchTerm.toLowerCase();
    const matchSearch = nw.title.toLowerCase().includes(q) || nw.summary.toLowerCase().includes(q);
    const matchCat = newsFilterCategory === 'all' || nw.category === newsFilterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* SECTION NAV TABS (Letters / Notifications / News) */}
      <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setSubSection('letters')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subSection === 'letters'
              ? 'bg-white text-[#B90013] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Thư Thông Báo Chính Thức ({lettersList.length})</span>
        </button>

        <button
          onClick={() => setSubSection('notifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subSection === 'notifications'
              ? 'bg-white text-[#B90013] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Thông Báo Nhanh / Alerts ({notificationsList.length})</span>
        </button>

        <button
          onClick={() => setSubSection('news')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subSection === 'news'
              ? 'bg-white text-[#B90013] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Bản Tin & Tin Tức ({newsList.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUB-SECTION: SYSTEM LETTERS (/system_letters) */}
      {/* ========================================================================= */}
      {subSection === 'letters' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#B90013] text-white flex items-center justify-center shadow-sm">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#131B2E]">
                    Quản lý Thư Thông Báo Sinh Viên (Firestore: /system_letters)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tất cả thư được lưu vào Firestore và đồng bộ trực tiếp tới thanh thông báo của mọi sinh viên.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Seed button */}
                <button
                  type="button"
                  onClick={handleSeedLetters}
                  disabled={isSeedingLetters}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSeedingLetters ? 'animate-spin' : ''}`} />
                  <span>Khởi tạo thư mẫu lên Firestore</span>
                </button>

                {/* Quick Templates Dropdown */}
                <div className="relative group">
                  <button
                    type="button"
                    className="px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Nạp mẫu nhanh</span>
                  </button>
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-30 hidden group-hover:block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block py-1">
                      Chọn mẫu thư có sẵn:
                    </span>
                    {ADMIN_LETTER_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTemplate(idx)}
                        className="w-full text-left p-2 rounded-xl hover:bg-purple-50 text-xs cursor-pointer"
                      >
                        <p className="font-bold text-[#131B2E] truncate">{tmpl.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{tmpl.subject}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create Button */}
                <button
                  onClick={handleOpenCreateLetter}
                  className="px-4 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Soạn thư mới</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tiêu đề, trích yếu, người gửi..."
                  value={letterSearchTerm}
                  onChange={(e) => setLetterSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013]"
                />
              </div>

              <select
                value={letterFilterStatus}
                onChange={(e) => setLetterFilterStatus(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="published">Đang phát hành (Published)</option>
                <option value="draft">Bản nháp (Draft)</option>
              </select>

              <select
                value={letterFilterMajor}
                onChange={(e) => setLetterFilterMajor(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013]"
              >
                <option value="all">Tất cả ngành học (All Majors)</option>
                {PTIT_MAJORS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Letters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLetters.map((letter) => (
              <div
                key={letter.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        letter.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {letter.status === 'published' ? '● Đang phát hành' : '○ Bản nháp'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{letter.sentDate}</span>
                  </div>

                  <h3 className="text-sm font-bold text-[#131B2E] line-clamp-1">{letter.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{letter.subject}</p>

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <p>
                      <strong className="text-slate-700">Người gửi:</strong> {letter.sender} ({letter.senderRole})
                    </p>
                    <p>
                      <strong className="text-slate-700">Đối tượng:</strong>{' '}
                      {letter.targetMajor === 'all' ? 'Toàn bộ sinh viên' : letter.targetMajor}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleLetterStatus(letter)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        letter.status === 'published'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {letter.status === 'published' ? 'Thu hồi' : 'Phát hành'}
                    </button>
                    <button
                      onClick={() => handleEditLetter(letter)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Sửa thư"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLetter(letter.id, letter.title)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Xóa thư"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setPreviewLetter(letter)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem trước</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredLetters.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Chưa có thư thông báo nào</p>
                <p className="text-xs text-slate-500 mt-1">Bấm "Soạn thư mới" hoặc "Khởi tạo thư mẫu" để bắt đầu.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-SECTION: NOTIFICATIONS (/notifications) */}
      {/* ========================================================================= */}
      {subSection === 'notifications' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#131B2E]">
                    Quản lý Thông Báo Nhanh (Firestore: /notifications)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tạo và phát các cảnh báo, nhắc nhở hoặc tin nhắn quan trọng tới toàn bộ sinh viên trên Firestore.
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenCreateNotif}
                className="px-4 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo thông báo mới</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm thông báo..."
                  value={notifSearchTerm}
                  onChange={(e) => setNotifSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013]"
                />
              </div>

              <select
                value={notifFilterType}
                onChange={(e) => setNotifFilterType(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013]"
              >
                <option value="all">Tất cả loại thông báo</option>
                <option value="system">Hệ thống (System)</option>
                <option value="job">Việc làm (Job)</option>
                <option value="event">Sự kiện (Event)</option>
                <option value="alert">Cảnh báo (Alert)</option>
              </select>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        notif.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {notif.status === 'active' ? 'Đang bật' : 'Đang tắt'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold uppercase">
                      {notif.type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(notif.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                  <p className="text-xs text-slate-600">{notif.message}</p>
                  <p className="text-[11px] text-slate-400">
                    Ngành đích: <strong className="text-slate-600">{notif.targetMajor || 'Tất cả'}</strong> | Chuyển trang: <strong className="text-slate-600">{notif.linkView || 'Trang chủ'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleNotifStatus(notif)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      notif.status === 'active'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {notif.status === 'active' ? 'Tắt' : 'Bật'}
                  </button>
                  <button
                    onClick={() => handleEditNotif(notif)}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteNotif(notif.id, notif.title)}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredNotifs.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Chưa có thông báo nào trong Firestore</p>
                <p className="text-xs text-slate-500 mt-1">Bấm "Tạo thông báo mới" để gửi tin nhắn đến sinh viên.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-SECTION: NEWS & ARTICLES (/news) */}
      {/* ========================================================================= */}
      {subSection === 'news' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Newspaper className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#131B2E]">
                    Quản lý Bản Tin & Tin Tức Tuyển Dụng (Firestore: /news)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đăng tải bản tin nghề nghiệp, học bổng và câu chuyện việc làm dành cho sinh viên PTIT.
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenCreateNews}
                className="px-4 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Đăng bản tin mới</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bản tin..."
                  value={newsSearchTerm}
                  onChange={(e) => setNewsSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013]"
                />
              </div>

              <select
                value={newsFilterCategory}
                onChange={(e) => setNewsFilterCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013]"
              >
                <option value="all">Tất cả danh mục</option>
                <option value="tin_tuc">Tin tức chung</option>
                <option value="tuyen_dung">Tuyển dụng & Việc làm</option>
                <option value="su_kien">Sự kiện & Hội thảo</option>
                <option value="hoc_bong">Học bổng & Tài trợ</option>
              </select>
            </div>
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNews.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-36 object-cover rounded-xl border border-slate-100"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status === 'published' ? 'Đã phát hành' : 'Bản nháp'}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.publishedAt}</span>
                  </div>

                  <h3 className="text-sm font-bold text-[#131B2E] line-clamp-2">{item.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-3">{item.summary}</p>
                  <p className="text-[11px] text-slate-400">
                    Tác giả: <strong className="text-slate-600">{item.author || 'PTIT Admin'}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleNewsStatus(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      item.status === 'published'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {item.status === 'published' ? 'Về nháp' : 'Phát hành'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditNews(item)}
                      className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Sửa bài"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNews(item.id, item.title)}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Xóa bài"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredNews.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
                <Newspaper className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Chưa có bài viết bản tin nào trên Firestore</p>
                <p className="text-xs text-slate-500 mt-1">Bấm "Đăng bản tin mới" để tạo bài viết đầu tiên.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT SYSTEM LETTER FORM */}
      {/* ========================================================================= */}
      {isLetterFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B90013] flex items-center justify-center font-bold">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#131B2E]">
                    {editingLetterId ? 'Chỉnh sửa Thư Thông Báo' : 'Soạn Thư Thông Báo Mới (Lưu Firestore)'}
                  </h3>
                  <p className="text-xs text-slate-500">Cập nhật trực tiếp vào Firestore collection /system_letters</p>
                </div>
              </div>
              <button
                onClick={() => setIsLetterFormOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLetterForm} className="p-6 space-y-5">
              {letterFormError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{letterFormError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu đề thư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Thư thông báo đợt tuyển dụng đối tác chiến lược PTIT"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trích yếu (V/v) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="VD: V/v Cơ hội thực tập và làm việc khối ngành Kinh tế PTIT"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#B90013] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Người ký gửi</label>
                    <input
                      type="text"
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      placeholder="VD: ThS. Trần Hoàng Nam"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chức danh / Đơn vị</label>
                    <input
                      type="text"
                      value={senderRole}
                      onChange={(e) => setSenderRole(e.target.value)}
                      placeholder="VD: Giám đốc Trung tâm Hỗ trợ Sinh viên & Khởi nghiệp"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chuyên ngành đích</label>
                    <select
                      value={targetMajor}
                      onChange={(e) => setTargetMajor(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none"
                    >
                      <option value="all">Toàn bộ chuyên ngành PTIT</option>
                      {PTIT_MAJORS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Khóa / Năm học đích</label>
                    <select
                      value={targetYear}
                      onChange={(e) => setTargetYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none"
                    >
                      <option value="all">Mọi năm học</option>
                      <option value="Năm 1">Sinh viên Năm 1</option>
                      <option value="Năm 2">Sinh viên Năm 2</option>
                      <option value="Năm 3">Sinh viên Năm 3</option>
                      <option value="Năm 4">Sinh viên Năm 4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái phát hành</label>
                    <select
                      value={letterStatus}
                      onChange={(e) => setLetterStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none font-bold"
                    >
                      <option value="published">Phát hành ngay (Published)</option>
                      <option value="draft">Lưu bản nháp (Draft)</option>
                    </select>
                  </div>
                </div>

                {/* Content Paragraphs */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Các đoạn nội dung thư:</label>
                    <button
                      type="button"
                      onClick={() => setContentParagraphs([...contentParagraphs, ''])}
                      className="text-xs font-bold text-[#B90013] hover:underline cursor-pointer"
                    >
                      + Thêm đoạn
                    </button>
                  </div>
                  {contentParagraphs.map((para, idx) => (
                    <div key={idx} className="flex gap-2">
                      <textarea
                        rows={2}
                        value={para}
                        onChange={(e) => {
                          const next = [...contentParagraphs];
                          next[idx] = e.target.value;
                          setContentParagraphs(next);
                        }}
                        placeholder={`Đoạn ${idx + 1}...`}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none"
                      />
                      {contentParagraphs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setContentParagraphs(contentParagraphs.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-2 cursor-pointer self-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLetterFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLetter}
                  className="px-5 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingLetter ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{editingLetterId ? 'Lưu thay đổi Firestore' : 'Đăng thư lên Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT NOTIFICATION FORM */}
      {/* ========================================================================= */}
      {isNotifFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#131B2E]">
                    {editingNotifId ? 'Sửa Thông Báo Nhanh' : 'Tạo Thông Báo Mới (Lưu Firestore)'}
                  </h3>
                  <p className="text-xs text-slate-500">Lưu vào Firestore collection /notifications</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifFormOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNotif} className="p-6 space-y-4">
              {notifFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {notifFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề thông báo *</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="VD: 🎯 Nhắc nhở: Hạn nộp hồ sơ Thực tập VNPT sắp kết thúc"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung thông báo *</label>
                <textarea
                  rows={3}
                  required
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Nhập nội dung ngắn gọn gửi đến sinh viên..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại thông báo</label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  >
                    <option value="system">Hệ thống</option>
                    <option value="job">Việc làm</option>
                    <option value="event">Sự kiện</option>
                    <option value="alert">Cảnh báo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chuyển hướng (Click view)</label>
                  <select
                    value={notifLinkView}
                    onChange={(e) => setNotifLinkView(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  >
                    <option value="home">Trang chủ</option>
                    <option value="jobs">Việc làm</option>
                    <option value="events">Sự kiện</option>
                    <option value="roadmap">Lộ trình</option>
                    <option value="cv-builder">Tạo CV</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chuyên ngành đích</label>
                  <select
                    value={notifTargetMajor}
                    onChange={(e) => setNotifTargetMajor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  >
                    <option value="all">Tất cả ngành</option>
                    {PTIT_MAJORS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={notifStatus}
                    onChange={(e) => setNotifStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none font-bold"
                  >
                    <option value="active">Bật hiển thị (Active)</option>
                    <option value="inactive">Tắt (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNotifFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNotif}
                  className="px-5 py-2 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNotif ? 'Đang lưu Firestore...' : editingNotifId ? 'Cập nhật Firestore' : 'Tạo thông báo Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT NEWS FORM */}
      {/* ========================================================================= */}
      {isNewsFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#131B2E]">
                    {editingNewsId ? 'Chỉnh Sửa Bản Tin' : 'Đăng Bản Tin Mới (Lưu Firestore)'}
                  </h3>
                  <p className="text-xs text-slate-500">Lưu vào Firestore collection /news</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewsFormOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNews} className="p-6 space-y-4">
              {newsFormError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {newsFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề bản tin *</label>
                <input
                  type="text"
                  required
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  placeholder="VD: PTIT Khởi động Tuần lễ Việc làm & Kết nối Doanh nghiệp 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tóm tắt ngắn *</label>
                <textarea
                  rows={2}
                  required
                  value={newsSummary}
                  onChange={(e) => setNewsSummary(e.target.value)}
                  placeholder="Tóm tắt ngắn 1-2 câu về nội dung bản tin..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={4}
                  value={newsContent}
                  onChange={(e) => setNewsContent(e.target.value)}
                  placeholder="Nội dung bài viết đầy đủ..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Danh mục</label>
                  <select
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  >
                    <option value="tin_tuc">Tin tức chung</option>
                    <option value="tuyen_dung">Tuyển dụng & Việc làm</option>
                    <option value="su_kien">Sự kiện & Workshop</option>
                    <option value="hoc_bong">Học bổng & Tài trợ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tác giả</label>
                  <input
                    type="text"
                    value={newsAuthor}
                    onChange={(e) => setNewsAuthor(e.target.value)}
                    placeholder="VD: Ban Quản Trị PTIT Career Hub"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Hình ảnh</label>
                <input
                  type="text"
                  value={newsImageUrl}
                  onChange={(e) => setNewsImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái phát hành</label>
                <select
                  value={newsStatus}
                  onChange={(e) => setNewsStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none font-bold"
                >
                  <option value="published">Phát hành ngay (Published)</option>
                  <option value="draft">Bản nháp (Draft)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNews}
                  className="px-5 py-2 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNews ? 'Đang lưu Firestore...' : editingNewsId ? 'Cập nhật Firestore' : 'Đăng bản tin Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PREVIEW MODAL */}
      {previewLetter && (
        <SystemLetterModal
          letter={{
            id: previewLetter.id,
            title: previewLetter.title,
            sender: previewLetter.sender,
            senderRole: previewLetter.senderRole,
            sentDate: previewLetter.sentDate,
            recipientName: 'Sinh viên Nguyễn Văn A (Xem trước)',
            recipientMajor: previewLetter.targetMajor === 'all' ? 'Tất cả chuyên ngành PTIT' : previewLetter.targetMajor,
            recipientYear: previewLetter.targetYear === 'all' ? 'Đại học' : (previewLetter.targetYear || 'Đại học'),
            subject: previewLetter.subject,
            greeting: previewLetter.greeting || 'Thân gửi các bạn sinh viên,',
            content: previewLetter.content,
            recommendations: previewLetter.recommendations,
            ctaLabel: previewLetter.ctaLabel,
            ctaView: previewLetter.ctaView,
          }}
          onClose={() => setPreviewLetter(null)}
          onNavigate={(view) => {
            setPreviewLetter(null);
            onNavigate(view);
          }}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ScreenView, UserProfileState } from '../../types';
import {
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Briefcase,
  MapPin,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  FileText,
  Upload,
  ChevronRight,
  Sparkles,
  Info,
  ShieldAlert,
  Search,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FeedbackViewProps {
  onNavigate: (view: ScreenView) => void;
  userProfile?: UserProfileState;
}

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'jobs'
  | 'roadmap'
  | 'general';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface FeedbackRecord {
  id: string;
  category: FeedbackCategory;
  categoryLabel: string;
  priority: FeedbackPriority;
  featureArea: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  senderName: string;
  senderEmail: string;
  studentId?: string;
  createdAt: string;
  status: 'received' | 'in_progress' | 'resolved';
  adminReply?: string;
}

const INITIAL_FEEDBACK_HISTORY: FeedbackRecord[] = [
  {
    id: 'fb-demo-1',
    category: 'roadmap',
    categoryLabel: 'Lộ trình nghề nghiệp',
    priority: 'medium',
    featureArea: 'Bản đồ lộ trình nghề nghiệp PTIT',
    title: 'Bổ sung môn Đồ án Chuyên ngành Marketing số vào lộ trình năm 3',
    description: 'Năm học 2024-2025 khoa Marketing PTIT có cập nhật môn học thực tế mới, mong ban biên tập cập nhật vào danh sách môn chuyên ngành tương ứng.',
    senderName: 'Nguyễn Văn Minh',
    senderEmail: 'minh.ptit@student.ptit.edu.vn',
    studentId: 'B22DCMK120',
    createdAt: '22/09/2026, 14:30',
    status: 'resolved',
    adminReply: 'Cảm ơn bạn! Ban Học vụ Career Hub đã đối chiếu đề cương 2024 của Học viện và bổ sung môn học vào Bản đồ Lộ trình ngành Marketing số.',
  },
  {
    id: 'fb-demo-2',
    category: 'feature',
    categoryLabel: 'Đề xuất tính năng',
    priority: 'low',
    featureArea: 'Tối ưu hóa CV với AI',
    title: 'Gợi ý thêm tính năng xuất CV đã chỉnh sửa ra định dạng PDF',
    description: 'Sau khi nhận gợi ý từ AI, nếu có sẵn tính năng tải file PDF xuất bản hoàn chỉnh thì sinh viên sẽ ứng tuyển thuận tiện hơn.',
    senderName: 'Nguyễn Văn Minh',
    senderEmail: 'minh.ptit@student.ptit.edu.vn',
    studentId: 'B22DCMK120',
    createdAt: '25/09/2026, 09:15',
    status: 'in_progress',
    adminReply: 'Tính năng Export PDF đã được lên kế hoạch triển khai vào phiên bản cập nhật tháng 10/2026.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Tại sao file PDF của tôi không thể phân tích được?',
    answer: 'Hệ thống Gemini hỗ trợ định dạng PDF tiêu chuẩn có dung lượng dưới 10MB. Nếu file PDF được xuất từ ảnh scan có chất lượng quá mờ hoặc có mật khẩu bảo vệ, AI có thể gặp khó khăn khi trích xuất. Bạn nên xuất file trực tiếp từ Canva, Microsoft Word hoặc Google Docs ở dạng "PDF tiêu chuẩn".',
    category: 'CV AI',
  },
  {
    question: 'Tôi có thể sửa đổi dữ liệu sau khi AI đọc CV không?',
    answer: 'Có. Sau khi AI đọc CV, hệ thống hiển thị bảng tóm tắt và cung cấp nút "Kiểm tra / Chỉnh sửa thông tin CV". Mọi thông tin do bạn chỉnh sửa sẽ được hệ thống gắn nhãn rõ ràng (source = user_verified) để đảm bảo tính khách quan.',
  },
  {
    question: 'Điểm rèn luyện khi tham gia Sự kiện Hướng nghiệp được cộng thế nào?',
    answer: 'Sinh viên tham gia đầy đủ các sự kiện Doanh nghiệp hoặc Workshop hướng nghiệp do Học viện tổ chức (đăng ký qua PTIT Career Hub và điểm danh QR tại hội trường) sẽ được phòng CTSV tổng hợp và cộng +3 đến +5 điểm rèn luyện theo quy chế học kỳ hiện tại.',
    category: 'Sự kiện & CTSV',
  },
  {
    question: 'Thông tin cá nhân và file CV của tôi có bị chia sẻ công khai không?',
    answer: 'Tuyệt đối không. File CV và dữ liệu học tập của bạn chỉ được lưu trong phiên làm việc cá nhân của bạn và không bao giờ được chia sẻ cho bên thứ ba khi bạn chưa chủ động gửi hồ sơ ứng tuyển.',
    category: 'Bảo mật',
  },
];

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  onNavigate,
  userProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'faq'>('form');

  // Form State
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [featureArea, setFeatureArea] = useState<string>('cv-builder');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [stepsToReproduce, setStepsToReproduce] = useState<string>('');
  const [senderName, setSenderName] = useState<string>(
    userProfile?.displayName || ''
  );
  const [senderEmail, setSenderEmail] = useState<string>(
    userProfile?.email || ''
  );
  const [studentId, setStudentId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // History State
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>(() => {
    try {
      const stored = localStorage.getItem('ptit_feedbacks');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return INITIAL_FEEDBACK_HISTORY;
  });

  // FAQ Search
  const [faqSearch, setFaqSearch] = useState('');

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const getCategoryLabel = (cat: FeedbackCategory): string => {
    switch (cat) {
      case 'bug':
        return 'Báo lỗi kỹ thuật';
      case 'feature':
        return 'Đề xuất tính năng';
      case 'jobs':
        return 'Góp ý tin Việc làm';
      case 'roadmap':
        return 'Lộ trình nghề nghiệp';
      case 'general':
        return 'Ý kiến chung';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung phản hồi.');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const newRecord: FeedbackRecord = {
        id: `fb-${Date.now()}`,
        category,
        categoryLabel: getCategoryLabel(category),
        priority,
        featureArea,
        title: title.trim(),
        description: description.trim(),
        stepsToReproduce: stepsToReproduce.trim() || undefined,
        senderName: senderName.trim() || 'Sinh viên PTIT',
        senderEmail: senderEmail.trim() || 'sinhvien@ptit.edu.vn',
        studentId: studentId.trim() || undefined,
        createdAt:
          new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }) +
          ', ' +
          new Date().toLocaleDateString('vi-VN'),
        status: 'received',
        adminReply:
          'Hệ thống đã tiếp nhận ý kiến đóng góp của bạn. Ban Phát triển Career Hub PTIT sẽ xem xét và phản hồi trong thời gian sớm nhất!',
      };

      const updated = [newRecord, ...feedbacks];
      setFeedbacks(updated);
      try {
        localStorage.setItem('ptit_feedbacks', JSON.stringify(updated));
      } catch {}

      setSubmitSuccess(true);
      setTitle('');
      setDescription('');
      setStepsToReproduce('');

      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
      } catch {}

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch {
      alert('Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-3 py-1 bg-red-50 text-[#B90013] text-xs font-bold rounded-full border border-red-100 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#B90013]" />
            PTIT Career Hub • Hỗ trợ & Tiếp nhận Ý kiến
          </span>
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
            Kênh phản ánh chính thức dành cho sinh viên PTIT
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#131B2E] tracking-tight">
          Đóng góp ý kiến & Báo lỗi
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Mỗi đóng góp của bạn đều giúp hoàn thiện nền tảng định hướng nghề nghiệp và việc làm của Học viện. Chúng tôi cam kết phản hồi và xử lý nhanh chóng.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('form')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'form'
              ? 'bg-white text-[#B90013] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4 text-[#B90013]" />
          <span>Gửi phản hồi / Báo lỗi</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-[#B90013] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-purple-600" />
          <span>Lịch sử đóng góp của bạn ({feedbacks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-white text-[#B90013] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>Câu hỏi thường gặp & Khắc phục nhanh</span>
        </button>
      </div>

      {/* TAB 1: FORM GỬI PHẢN HỒI */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Form (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
            {submitSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-extrabold text-sm text-emerald-900">
                    Gửi phản hồi thành công!
                  </h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Cảm ơn bạn đã đóng góp ý kiến. Thông tin đã được lưu vào mục "Lịch sử đóng góp". Đội ngũ kỹ thuật & Cố vấn Career Hub sẽ xem xét sớm nhất!
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category selector */}
              <div>
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block mb-2">
                  1. Loại phản hồi / Nội dung đóng góp *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCategory('bug')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all flex items-center gap-2 cursor-pointer ${
                      category === 'bug'
                        ? 'border-red-500 bg-red-50 text-red-800 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Báo lỗi kỹ thuật</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('feature')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all flex items-center gap-2 cursor-pointer ${
                      category === 'feature'
                        ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Đề xuất tính năng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('jobs')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all flex items-center gap-2 cursor-pointer ${
                      category === 'jobs'
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Việc làm & Công ty</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('roadmap')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all flex items-center gap-2 cursor-pointer ${
                      category === 'roadmap'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Lộ trình & Kỹ năng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('general')}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all flex items-center gap-2 cursor-pointer ${
                      category === 'general'
                        ? 'border-slate-700 bg-slate-100 text-slate-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Ý kiến chung</span>
                  </button>
                </div>
              </div>

              {/* Area & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Khu vực / Tính năng liên quan *
                  </label>
                  <select
                    value={featureArea}
                    onChange={(e) => setFeatureArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#B90013] outline-hidden cursor-pointer"
                  >
                    <option value="cv-builder">Tối ưu hóa CV với AI (Gemini)</option>
                    <option value="roadmap">Bản đồ lộ trình nghề nghiệp (Career Map)</option>
                    <option value="jobs">Tìm kiếm & Ứng tuyển Việc làm</option>
                    <option value="events">Sự kiện & Điểm rèn luyện CTSV</option>
                    <option value="account">Tài khoản & Hồ sơ cá nhân</option>
                    <option value="other">Khu vực khác / Giao diện tổng quan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Mức độ ưu tiên / Mức độ ảnh hưởng
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#B90013] outline-hidden cursor-pointer"
                  >
                    <option value="low">Thấp - Góp ý nhỏ, giao diện hiển thị</option>
                    <option value="medium">Trung bình - Hoạt động chậm, khó dùng</option>
                    <option value="high">Cao - Tính năng không phản hồi hoặc sai kết quả</option>
                    <option value="urgent">Khẩn cấp - Không thể tiếp tục thao tác</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tiêu đề phản hồi *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Lỗi khi tải file CV PDF dung lượng 2MB hoặc Đề xuất thêm bộ lọc theo mức lương"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-[#B90013] outline-hidden"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Mô tả chi tiết vấn đề hoặc ý tưởng của bạn *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Hãy mô tả cụ thể trải nghiệm của bạn, kết quả bạn mong muốn hoặc giải pháp đề xuất..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:border-[#B90013] outline-hidden leading-relaxed"
                  required
                />
              </div>

              {/* If bug: Steps to reproduce */}
              {category === 'bug' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>Các bước để tái hiện lỗi (nếu có):</span>
                  </label>
                  <textarea
                    rows={2}
                    value={stepsToReproduce}
                    onChange={(e) => setStepsToReproduce(e.target.value)}
                    placeholder="Ví dụ: Bước 1: Vào trang Tối ưu hóa CV -> Bước 2: Bấm chọn file PDF -> Bước 3: Màn hình báo lỗi..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:border-[#B90013] outline-hidden"
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Thông tin phản hồi được bảo mật theo Chính sách PTIT Career Hub.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar Guidelines (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-red-50/60 via-white to-orange-50/40 border border-red-100/80 space-y-3">
              <h3 className="font-extrabold text-sm text-[#131B2E] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B90013]" />
                <span>Quy trình xử lý phản hồi</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mỗi báo lỗi và ý kiến đóng góp được phân loại tự động và chuyển thẳng tới bộ phận phụ trách:
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-[#B90013] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span><strong>Tiếp nhận:</strong> Hệ thống lưu trữ và gửi thông báo xác nhận ngay lập tức.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-[#B90013] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span><strong>Xác minh:</strong> Đội ngũ kỹ thuật kiểm tra và tái hiện lỗi trong vòng 24 giờ.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-[#B90013] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span><strong>Khắc phục & Phản hồi:</strong> Cập nhật trạng thái trực tiếp trong mục Lịch sử phản hồi.</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Liên kết tham khảo nhanh
              </h4>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => onNavigate('privacy')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between transition-colors cursor-pointer border border-slate-100"
                >
                  <span>Chính sách bảo mật dữ liệu</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigate('terms')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between transition-colors cursor-pointer border border-slate-100"
                >
                  <span>Quy định sử dụng nền tảng</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LỊCH SỬ PHẢN HỒI CỦA BẠN */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg">
                Danh sách phản hồi & Đóng góp của bạn
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi tiến độ xử lý và phản hồi từ Ban Quản trị Career Hub PTIT
              </p>
            </div>
            <button
              onClick={() => setActiveTab('form')}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 text-[#B90013] text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors"
            >
              + Gửi phản hồi mới
            </button>
          </div>

          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-5 rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all space-y-3 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                        fb.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : fb.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {fb.status === 'resolved'
                        ? 'Đã xử lý / Phản hồi'
                        : fb.status === 'in_progress'
                        ? 'Đang kiểm tra'
                        : 'Đã tiếp nhận'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                      {fb.categoryLabel}
                    </span>
                    <span className="text-xs text-slate-400">
                      Vị trí: <strong>{fb.featureArea}</strong>
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">{fb.createdAt}</span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-[#131B2E]">
                    {fb.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {fb.description}
                  </p>
                </div>

                {fb.stepsToReproduce && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <span className="font-bold text-slate-700 block mb-0.5">
                      Các bước tái hiện:
                    </span>
                    <p className="italic">{fb.stepsToReproduce}</p>
                  </div>
                )}

                {/* Admin Reply */}
                {fb.adminReply && (
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100/90 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-900 font-extrabold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                      <span>Phản hồi từ Ban Quản trị Career Hub PTIT:</span>
                    </div>
                    <p className="text-purple-950 font-medium leading-relaxed">
                      {fb.adminReply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FAQ */}
      {activeTab === 'faq' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg">
                Câu hỏi thường gặp & Hướng dẫn xử lý sự cố
              </h3>
              <p className="text-xs text-slate-500">
                Tìm nhanh lời giải cho các vấn đề phổ biến khi sử dụng nền tảng
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Tìm câu hỏi..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#B90013] outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-[#131B2E] leading-snug">
                    {faq.question}
                  </h4>
                  {faq.category && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-600 shrink-0">
                      {faq.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-[#B90013] shrink-0" />
              <span className="text-slate-800">
                Vấn đề của bạn chưa được giải đáp trong danh sách trên?
              </span>
            </div>
            <button
              onClick={() => setActiveTab('form')}
              className="px-4 py-2 bg-[#B90013] text-white font-bold rounded-xl text-xs hover:bg-[#A30010] transition-colors self-start sm:self-auto cursor-pointer"
            >
              Gửi biểu mẫu hỗ trợ ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

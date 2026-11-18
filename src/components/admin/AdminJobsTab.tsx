import React, { useState, useEffect, useRef } from 'react';
import { FirestoreJob, TargetJob, PTIT_MAJORS } from '../../types';
import {
  loadAllJobsFromStorage,
  saveJobsToStorage,
  adaptFirestoreJobToTargetJob,
  getActiveJobs,
  getAllJobsFromFirestore,
  subscribeToJobs,
  adminSaveJob,
  adminDeleteJob,
  adminToggleJobStatus,
  adminVerifyJob,
  seedVerifiedJobsToFirestore,
} from '../../services/jobs/jobService';
import {
  Briefcase,
  Search,
  Building2,
  ExternalLink,
  Edit2,
  Trash2,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  RotateCcw,
  Calendar,
  Clock,
  Image as ImageIcon,
  Upload,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Check,
  ToggleLeft,
  ToggleRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminJobsTabProps {
  showToast?: (message: string) => void;
  onRefreshStats?: () => void;
  onJobsUpdated?: (jobs: TargetJob[]) => void;
}

const JOB_TYPES = [
  { id: 'Intern', label: 'Thực tập sinh (Intern)', category: 'Internship' as const },
  { id: 'Trainee', label: 'Trainee / Học việc', category: 'Trainee' as const },
  { id: 'Fresher/Official', label: 'Chính thức / Fresher', category: 'Full-time' as const },
  { id: 'CTV / Part-time', label: 'CTV / Part-time', category: 'Part-time' as const },
];

export const AdminJobsTab: React.FC<AdminJobsTabProps> = ({
  showToast,
  onRefreshStats,
  onJobsUpdated,
}) => {
  const [jobs, setJobs] = useState<FirestoreJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [majorFilter, setMajorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Edit / Form state
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Exact 11 Form fields requested:
  const [companyLogo, setCompanyLogo] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [companyOverview, setCompanyOverview] = useState('');
  const [salary, setSalary] = useState('5.000.000 – 7.000.000 VNĐ/tháng');
  const [selectedMajors, setSelectedMajors] = useState<string[]>(['Marketing']);
  const [isMajorDropdownOpen, setIsMajorDropdownOpen] = useState(false);
  const majorDropdownRef = useRef<HTMLDivElement>(null);
  const [jobType, setJobType] = useState<'Intern' | 'Trainee' | 'Fresher/Official' | 'CTV / Part-time'>('Intern');
  const [location, setLocation] = useState('Hà Nội');
  const [deadline, setDeadline] = useState('2026-12-31');
  const [skills, setSkills] = useState('');
  const [description, setDescription] = useState('');
  const [applyLink, setApplyLink] = useState('');

  // Delete modal confirmation state
  const [deleteTargetJob, setDeleteTargetJob] = useState<FirestoreJob | null>(null);

  // Live Firestore Real-time Subscription (Source of Truth)
  useEffect(() => {
    // 1. Initial load from Firestore
    getAllJobsFromFirestore()
      .then((list) => {
        setJobs(list);
        if (onRefreshStats) onRefreshStats();
      })
      .catch((err) => {
        console.warn('Initial jobs fetch from Firestore failed:', err);
      });

    // 2. Real-time onSnapshot listener for instant updates across all browsers
    const unsubscribe = subscribeToJobs(
      (liveJobs) => {
        setJobs(liveJobs);
        if (onRefreshStats) onRefreshStats();
        if (onJobsUpdated) {
          const activeTargetJobs = liveJobs
            .filter((j) => j.status === 'active' && j.verified)
            .map((j) => adaptFirestoreJobToTargetJob(j));
          onJobsUpdated(activeTargetJobs);
        }
      },
      (error) => {
        console.warn('Firestore subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    if (showToast) {
      showToast(msg);
    }
    try {
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.6 } });
    } catch {}
  };

  // Reset form to blank create mode
  const handleResetForm = () => {
    setEditingJobId(null);
    setCompanyLogo('');
    setTitle('');
    setCompany('');
    setCompanyOverview('');
    setSalary('5.000.000 – 7.000.000 VNĐ/tháng');
    setSelectedMajors([]);
    setIsMajorDropdownOpen(false);
    setJobType('Intern');
    setLocation('Hà Nội');
    setDeadline('2026-12-31');
    setSkills('');
    setDescription('');
    setApplyLink('');
    setFormError(null);
  };

  // Click outside to close major dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (majorDropdownRef.current && !majorDropdownRef.current.contains(event.target as Node)) {
        setIsMajorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleMajor = (m: string) => {
    setSelectedMajors((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  const handleSelectAllMajors = () => {
    if (selectedMajors.length === PTIT_MAJORS.length) {
      setSelectedMajors([]);
    } else {
      setSelectedMajors([...PTIT_MAJORS]);
    }
  };

  // Fill form for editing
  const handleEditJob = (job: FirestoreJob) => {
    setEditingJobId(job.id);
    setCompanyLogo(job.companyLogo || '');
    setTitle(job.title || '');
    setCompany(job.companyName || '');
    setCompanyOverview(job.companyOverview || (job as any).companyDescription || '');
    setSalary(job.salaryText || '5.000.000 – 7.000.000 VNĐ/tháng');
    
    const majorsFromJob =
      Array.isArray(job.majorTags) && job.majorTags.length > 0
        ? job.majorTags
        : (job as any).targetMajors && Array.isArray((job as any).targetMajors)
        ? (job as any).targetMajors
        : job.majorTags?.[0]
        ? [job.majorTags[0]]
        : [];
    setSelectedMajors(majorsFromJob);
    setIsMajorDropdownOpen(false);
    
    // Map employmentType back to jobType
    if (job.employmentType === 'Full-time') {
      setJobType('Fresher/Official');
    } else if (job.employmentType === 'Trainee') {
      setJobType('Trainee');
    } else if (job.employmentType === 'Part-time') {
      setJobType('CTV / Part-time');
    } else {
      setJobType('Intern');
    }

    setLocation(job.location || 'Hà Nội');
    setDeadline(job.expiresAt || (job as any).deadline || '2026-12-31');
    setSkills(Array.isArray(job.skillTags) ? job.skillTags.join(', ') : '');
    setDescription(job.description || '');
    setApplyLink(job.applyUrl || job.sourceUrl || '');
    setFormError(null);

    // Scroll smoothly to form
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Smart AI assistant to suggest skills from description
  const handleAutoExtractSkills = () => {
    if (!description.trim()) {
      setFormError('Vui lòng nhập mô tả công việc (JD) trước để trích xuất kỹ năng.');
      return;
    }

    const text = `${title} ${description}`.toLowerCase();
    const commonSkills = [
      { name: 'Content SEO', keywords: ['seo', 'content', 'bài viết', 'từ khóa'] },
      { name: 'Google Analytics 4', keywords: ['ga4', 'google analytics', 'analytics', 'đo lường'] },
      { name: 'Thiết kế Canva', keywords: ['canva', 'banner', 'hình ảnh', 'photoshop'] },
      { name: 'Performance Ads', keywords: ['ads', 'quảng cáo', 'facebook ads', 'tiktok ads', 'google ads'] },
      { name: 'Kỹ năng Cold Calling & Email B2B', keywords: ['b2b', 'telesales', 'cold email', 'outreach', 'gọi điện'] },
      { name: 'Phần mềm CRM', keywords: ['crm', 'hubspot', 'salesforce'] },
      { name: 'Excel & Data Analysis', keywords: ['excel', 'data', 'phân tích', 'pivot', 'vlookup'] },
      { name: 'Power BI', keywords: ['power bi', 'dashboard', 'báo cáo'] },
      { name: 'SQL', keywords: ['sql', 'cơ sở dữ liệu', 'query'] },
      { name: 'Vận hành Sàn Shopee / TikTok Shop', keywords: ['shopee', 'tiktok shop', 'sàn', 'tmđt', 'e-commerce'] },
      { name: 'Quản trị Fanpage & Social Media', keywords: ['fanpage', 'social media', 'facebook', 'tiktok'] },
      { name: 'Chăm sóc khách hàng', keywords: ['cskh', 'chăm sóc', 'khách hàng', 'tư vấn'] },
      { name: 'Nghiên cứu thị trường', keywords: ['thị trường', 'nghiên cứu', 'khảo sát', 'đối thủ'] },
      { name: 'Giao tiếp & Đàm phán', keywords: ['giao tiếp', 'đàm phán', 'thuyết trình'] },
    ];

    const matched = commonSkills
      .filter((s) => s.keywords.some((kw) => text.includes(kw)))
      .map((s) => s.name);

    if (matched.length > 0) {
      const existing = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const combined = Array.from(new Set([...existing, ...matched]));
      setSkills(combined.join(', '));
      setFormError(null);
      triggerToast(`✨ Đã tự động nhận diện ${matched.length} kỹ năng phù hợp từ JD!`);
    } else {
      setFormError('Chưa nhận diện được từ khóa kỹ năng tự động. Vui lòng nhập kỹ năng phân tách bằng dấu phẩy.');
    }
  };

  // Submit Form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!title.trim()) {
      setFormError('Vui lòng nhập tên vị trí tuyển dụng.');
      return;
    }
    if (!company.trim()) {
      setFormError('Vui lòng nhập tên doanh nghiệp tuyển dụng.');
      return;
    }
    if (!description.trim()) {
      setFormError('Vui lòng nhập mô tả chi tiết công việc.');
      return;
    }
    if (selectedMajors.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 ngành học liên quan (major).');
      return;
    }
    if (!applyLink.trim()) {
      setFormError('Vui lòng nhập link ứng tuyển thực tế.');
      return;
    }
    if (!deadline.trim()) {
      setFormError('Vui lòng chọn hoặc nhập hạn nộp hồ sơ (Deadline).');
      return;
    }

    // Validate URL
    let formattedApplyLink = applyLink.trim();
    if (!formattedApplyLink.startsWith('http://') && !formattedApplyLink.startsWith('https://')) {
      formattedApplyLink = `https://${formattedApplyLink}`;
    }

    try {
      new URL(formattedApplyLink);
    } catch {
      setFormError('Link ứng tuyển không đúng định dạng URL (VD: https://tuyendung.company.com).');
      return;
    }

    // Parse skills list
    const parsedSkills = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parsedSkills.length === 0) {
      setFormError('Vui lòng nhập ít nhất 1 kỹ năng yêu cầu (phân tách bằng dấu phẩy). Kỹ năng này sẽ được AI Gemini dùng để phân tích Gap Analysis.');
      return;
    }

    // Map jobType to employmentType
    const employmentTypeMap: Record<string, 'Internship' | 'Trainee' | 'Full-time' | 'Part-time'> = {
      'Intern': 'Internship',
      'Trainee': 'Trainee',
      'Fresher/Official': 'Full-time',
      'CTV / Part-time': 'Part-time',
    };

    const nowIso = new Date().toISOString();
    const finalId = editingJobId || `job_ptit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const defaultLogo = 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&auto=format&fit=crop&q=80';
    const existingJob = jobs.find((j) => j.id === finalId);
    const finalLogo = companyLogo.trim() || (existingJob?.companyLogo ? existingJob.companyLogo : defaultLogo);
    const finalSalary = salary.trim() || 'Thỏa thuận';

    const jobPayload: FirestoreJob = {
      id: finalId,
      title: title.trim(),
      companyName: company.trim(),
      companyLogo: finalLogo,
      companyOverview: companyOverview.trim() || undefined,
      companyDescription: companyOverview.trim() || undefined,
      location: location.trim(),
      employmentType: employmentTypeMap[jobType] || 'Internship',
      salaryText: finalSalary,
      description: description.trim(),
      requirements: parsedSkills.map((sk) => `Thành thạo hoặc có kinh nghiệm với ${sk}`),
      benefits: [
        'Hỗ trợ dấu mộc thực tập tốt nghiệp chuẩn PTIT',
        'Môi trường làm việc thực chiến, được hướng dẫn bởi Senior',
        'Cơ hội xem xét tuyển dụng chính thức sau kỳ thực tập',
      ],
      majorTags: selectedMajors,
      skillTags: parsedSkills,
      careerTendencies: ['CR', 'AN'],
      suitableAcademicYears: ['Năm 2', 'Năm 3', 'Năm 4', 'Đã tốt nghiệp'],
      careerCategory: selectedMajors.some((m) => m.includes('Marketing'))
        ? 'Marketing'
        : selectedMajors.some((m) => m.includes('Kế toán'))
        ? 'Kế toán'
        : selectedMajors.some((m) => m.includes('Thương mại'))
        ? 'E-commerce'
        : selectedMajors.some((m) => m.includes('Logistics'))
        ? 'Logistics'
        : 'Kinh doanh',
      publishedAt: existingJob?.publishedAt || new Date().toISOString().split('T')[0],
      expiresAt: deadline.trim() || '2026-12-31',
      sourceName: company.trim(),
      sourceUrl: formattedApplyLink,
      applyUrl: formattedApplyLink,
      verified: true,
      status: existingJob?.status || 'active',
      isDemo: false,
      createdAt: existingJob?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    setIsSubmitting(true);
    try {
      // 1. Direct write to Firestore as single source of truth
      const saveRes = await adminSaveJob(jobPayload);
      if (!saveRes.success) {
        setFormError(saveRes.error || 'Lỗi khi lưu việc làm lên Firestore.');
        setIsSubmitting(false);
        return;
      }

      if (editingJobId) {
        triggerToast(`Đã cập nhật việc làm "${title}" lên Firestore thành công!`);
      } else {
        triggerToast(`Đã đăng tuyển mới việc làm "${title}" lên Firestore thành công!`);
      }

      // 2. Reset form
      handleResetForm();
    } catch (err: any) {
      console.error('Error submitting job to Firestore:', err);
      setFormError(err?.message ? `Lỗi Firestore: ${err.message}` : 'Không thể lưu việc làm lên Firestore. Vui lòng kiểm tra quyền quản trị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Job Status directly in Firestore (Bật / Tắt / Ẩn)
  const handleToggleJobStatus = async (job: FirestoreJob) => {
    const nextStatus = job.status === 'active' ? 'hidden' : 'active';
    try {
      await adminToggleJobStatus(job.id, nextStatus);
      triggerToast(`Đã ${nextStatus === 'active' ? 'bật hiển thị' : 'tắt / ẩn'} việc làm "${job.title}" trên Firestore.`);
    } catch (err: any) {
      triggerToast(`Lỗi cập nhật Firestore: ${err?.message || 'Không thể đổi trạng thái'}`);
    }
  };

  // Delete Job directly in Firestore
  const confirmDeleteJob = async () => {
    if (!deleteTargetJob) return;

    setIsDeleting(true);
    try {
      // 1. Delete directly from Firestore collection /jobs
      await adminDeleteJob(deleteTargetJob.id);
      triggerToast(`Đã xóa việc làm "${deleteTargetJob.title}" khỏi Firestore thành công.`);
      setDeleteTargetJob(null);

      // If editing job was deleted, reset form
      if (editingJobId === deleteTargetJob.id) {
        handleResetForm();
      }
    } catch (err: any) {
      console.error('Failed to delete job from Firestore:', err);
      triggerToast(`Lỗi xóa Firestore: ${err?.message || 'Không thể xóa việc làm trên Firestore'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Seed sample PTIT jobs to Firestore if Firestore is empty
  const handleSeedJobs = async () => {
    setIsSeeding(true);
    try {
      const res = await seedVerifiedJobsToFirestore();
      if (res.error) {
        triggerToast(`Lỗi khởi tạo: ${res.error}`);
      } else {
        triggerToast(`Đã khởi tạo thành công ${res.count} việc làm lên Firestore!`);
      }
    } catch (err: any) {
      triggerToast(`Lỗi khởi tạo: ${err?.message || 'Thất bại'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Filter jobs for display in table
  const filteredJobs = jobs.filter((j) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.companyName.toLowerCase().includes(q) ||
      (j.skillTags || []).some((s) => s.toLowerCase().includes(q));

    const matchesMajor =
      majorFilter === 'all' || (j.majorTags || []).some((m) => m === majorFilter);

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'Intern' && j.employmentType === 'Internship') ||
      (typeFilter === 'CTV / Part-time' && j.employmentType === 'Part-time') ||
      (typeFilter === 'Fresher/Official' && j.employmentType === 'Full-time');

    return matchesSearch && matchesMajor && matchesType;
  });

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. FORM ĐĂNG / CHỈNH SỬA VIỆC LÀM (JD MANAGEMENT FORM) */}
      <div
        ref={formRef}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-red-50 text-[#B90013] rounded-xl">
                <Briefcase className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-extrabold text-[#131B2E]">
                {editingJobId ? 'Chỉnh sửa Việc làm (JD)' : 'Đăng tuyển Việc làm Mới (JD)'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Nhập thông tin thực tế. Danh sách kỹ năng yêu cầu sẽ được truyền trực tiếp cho AI Gemini phân tích khoảng trống năng lực (Gap Analysis) trên trang Career Map.
            </p>
          </div>

          {editingJobId && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Đang sửa bài đăng
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
            {/* Field 1: companyLogo */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#B90013]" />
                  <span>1. Logo Doanh nghiệp (Company Logo)</span>
                  <span className="text-slate-400 font-normal lowercase">(tùy chọn)</span>
                </label>
                <span className="text-[11px] text-slate-400">Nếu bỏ trống, hệ thống tự động dùng logo mặc định</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128&auto=format&fit=crop&q=80';
                      }}
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={companyLogo}
                    onChange={(e) => setCompanyLogo(e.target.value)}
                    placeholder="Nhập URL ảnh logo (VD: https://company.com/logo.png)..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
                  />
                  <label className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            setFormError('Dung lượng ảnh không được vượt quá 2MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (uploadEvt) => {
                            const res = uploadEvt.target?.result as string;
                            if (res) setCompanyLogo(res);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Field 2: title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>2. Tên vị trí tuyển dụng (Title)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Thực tập sinh Digital Marketing, CTV B2B..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 3: company */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>3. Tên doanh nghiệp (Company Name)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="VD: Viettel Telecom, FPT Telecom, VCCorp, VNPT..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field: companyOverview (Optional - Không bắt buộc nhập) */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#B90013]" />
                <span>Giới thiệu Công ty (Company Description)</span>
                <span className="text-slate-400 font-normal lowercase">(Tùy chọn - không bắt buộc)</span>
              </label>
              <textarea
                rows={2}
                value={companyOverview}
                onChange={(e) => setCompanyOverview(e.target.value)}
                placeholder="Nhập thông tin giới thiệu ngắn về công ty, quy mô, môi trường làm việc... (Nếu để trống, hệ thống sẽ ẩn dòng mô tả trên trang chi tiết JD)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium resize-y"
              />
            </div>

            {/* Field 4: salary */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#B90013]" />
                <span>4. Mức lương (Salary)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="VD: 5.000.000 – 7.000.000 VNĐ/tháng"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 5: location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>5. Địa điểm làm việc (Location)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="VD: Hà Nội (Cầu Giấy), TP. Hồ Chí Minh, Hybrid, Remote..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>

            {/* Field 6: major (Multi-select) */}
            <div className="space-y-1.5" ref={majorDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>6. Ngành học liên quan (Major)</span>
                  <span className="text-red-500">*</span>
                  <span className="text-[11px] font-semibold text-slate-400 lowercase">
                    (chọn nhiều ngành)
                  </span>
                </label>
                {selectedMajors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMajors([])}
                    className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Xóa tất cả ({selectedMajors.length})
                  </button>
                )}
              </div>

              {/* Multi-select Dropdown Trigger */}
              <div className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsMajorDropdownOpen((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsMajorDropdownOpen((prev) => !prev);
                    }
                  }}
                  className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border text-sm transition-all font-medium cursor-pointer flex items-center justify-between gap-2 ${
                    isMajorDropdownOpen
                      ? 'border-[#B90013] bg-white ring-2 ring-[#B90013]/10 shadow-xs'
                      : selectedMajors.length > 0
                      ? 'border-slate-300 bg-white hover:border-[#B90013]/60'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 text-slate-400'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
                    {selectedMajors.length === 0 ? (
                      <span className="text-slate-400 text-sm">
                        Chọn một hoặc nhiều ngành phù hợp với vị trí...
                      </span>
                    ) : (
                      selectedMajors.map((m) => (
                        <span
                          key={m}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMajor(m);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-[#B90013] border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors shadow-2xs group"
                          title="Nhấn để bỏ chọn ngành này"
                        >
                          <span>{m}</span>
                          <X className="w-3 h-3 text-[#B90013] group-hover:scale-110 transition-transform" />
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    {selectedMajors.length > 0 && (
                      <span className="text-[11px] font-bold text-[#B90013] bg-red-50 px-2 py-0.5 rounded-full border border-red-100 mr-1">
                        {selectedMajors.length} ngành
                      </span>
                    )}
                    {isMajorDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>

                {/* Dropdown Menu */}
                {isMajorDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                    <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 text-xs">
                      <span className="font-extrabold text-slate-700">
                        Danh sách các ngành đào tạo PTIT
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllMajors}
                        className="text-xs font-bold text-[#B90013] hover:underline cursor-pointer"
                      >
                        {selectedMajors.length === PTIT_MAJORS.length
                          ? 'Bỏ chọn tất cả'
                          : 'Chọn tất cả ngành'}
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {PTIT_MAJORS.map((m) => {
                        const isSelected = selectedMajors.includes(m);
                        return (
                          <div
                            key={m}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleToggleMajor(m)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggleMajor(m);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors text-left ${
                              isSelected
                                ? 'bg-red-50 text-[#B90013]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-[#B90013] border-[#B90013] text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span>{m}</span>
                            </div>

                            {isSelected && (
                              <span className="text-[10px] font-bold text-[#B90013] bg-white px-2 py-0.5 rounded border border-red-200">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick interactive chip buttons for all majors */}
              <div className="pt-1">
                <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Gợi ý chọn nhanh ngành:</span>
                  <span className="text-[10px] text-slate-400">
                    Bấm trực tiếp để thêm/bớt ngành
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PTIT_MAJORS.map((m) => {
                    const isSelected = selectedMajors.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleToggleMajor(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-red-50 text-[#B90013] border-red-200 shadow-2xs font-bold'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 text-[#B90013] stroke-[3]" />
                        ) : (
                          <Plus className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Field 7: jobType */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>7. Loại hình công việc (Job Type)</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium cursor-pointer"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 8: deadline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#B90013]" />
                <span>8. Hạn nộp hồ sơ (Deadline)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium cursor-pointer"
              />
            </div>

            {/* Field 9: applyLink */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>9. Link ứng tuyển thực tế (Apply Link)</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={applyLink}
                onChange={(e) => setApplyLink(e.target.value)}
                placeholder="https://tuyendung.viettel.vn/job/digital-marketing"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
              />
            </div>
          </div>

          {/* Field 10: skills (Critical for Gemini Gap Analysis) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <span>10. Kỹ năng yêu cầu (Skills - phân tách bằng dấu phẩy)</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAutoExtractSkills}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Tự động nhận diện kỹ năng từ nội dung mô tả công việc"
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>AI Gợi ý kỹ năng từ Mô tả</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="VD: Content SEO, CapCut, Excel, Google Analytics 4, Canva..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium"
            />
            <p className="text-[11px] text-slate-500 italic">
              💡 Lưu ý: Các kỹ năng này sẽ được AI Gemini sử dụng trực tiếp để phân tích khoảng trống năng lực (Gap Analysis) và đề xuất nhiệm vụ học tập trên trang Lộ trình (Career Map).
            </p>
          </div>

          {/* Field 11: description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <span>11. Mô tả chi tiết công việc (Description - Trách nhiệm & Quyền lợi)</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập chi tiết trách nhiệm, nội dung công việc và quyền lợi dành cho sinh viên..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 text-sm focus:outline-none focus:border-[#B90013] focus:bg-white focus:ring-2 focus:ring-[#B90013]/10 transition-all font-medium resize-y"
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {editingJobId && (
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
              {editingJobId ? (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span>Cập nhật Việc làm</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Đăng tuyển Việc làm</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. BẢNG DANH SÁCH VIỆC LÀM ĐÃ ĐĂNG (TABLE ACTIONS) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-extrabold text-[#131B2E]">
                  Danh sách Việc làm đã đăng ({filteredJobs.length}/{jobs.length})
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database className="w-3 h-3 text-emerald-600" />
                  Firestore Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Toàn bộ bài đăng được đồng bộ trực tiếp từ Firestore sang trang Việc làm (`/jobs`) và Lộ trình (`/career-map`).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSeeding}
                onClick={handleSeedJobs}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                title="Khởi tạo hoặc cập nhật các việc làm mẫu chuẩn PTIT lên Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                <span>{isSeeding ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu mẫu lên Firestore'}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm vị trí, công ty..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#B90013] focus:bg-white transition-all"
              />
            </div>

            <select
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#B90013] cursor-pointer"
            >
              <option value="all">Tất cả ngành học</option>
              {PTIT_MAJORS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-[#B90013] cursor-pointer"
            >
              <option value="all">Tất cả loại hình</option>
              <option value="Intern">Thực tập sinh (Intern)</option>
              <option value="CTV / Part-time">CTV / Part-time</option>
              <option value="Fresher/Official">Fresher / Chính thức</option>
            </select>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Vị trí & Doanh nghiệp</th>
                <th className="py-3.5 px-4">Ngành học & Loại hình</th>
                <th className="py-3.5 px-4">Địa điểm</th>
                <th className="py-3.5 px-4 min-w-[200px]">Kỹ năng yêu cầu (Gap Analysis)</th>
                <th className="py-3.5 px-4 text-center">Link ứng tuyển</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold">Không tìm thấy việc làm phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isEditingThis = editingJobId === job.id;
                  return (
                    <tr
                      key={job.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isEditingThis ? 'bg-red-50/40' : ''
                      }`}
                    >
                      {/* Vị trí & Doanh nghiệp */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-[#131B2E]">
                          {job.title}
                        </div>
                        <div className="text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{job.companyName}</span>
                        </div>
                      </td>

                      {/* Ngành học & Loại hình */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {(job.majorTags && job.majorTags.length > 0 ? job.majorTags : ['Marketing']).map((m) => (
                              <span
                                key={m}
                                className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                job.employmentType === 'Internship'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : job.employmentType === 'Part-time'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {job.employmentType === 'Internship'
                                ? 'Intern'
                                : job.employmentType === 'Part-time'
                                ? 'CTV / Part-time'
                                : 'Fresher / Official'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Địa điểm & Hạn nộp */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{job.location || 'Hà Nội'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Hạn: {job.expiresAt || (job as any).deadline || 'Không giới hạn'}</span>
                        </div>
                      </td>

                      {/* Kỹ năng yêu cầu */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(job.skillTags || []).slice(0, 4).map((sk) => (
                            <span
                              key={sk}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium"
                            >
                              {sk}
                            </span>
                          ))}
                          {(job.skillTags || []).length > 4 && (
                            <span className="text-[10px] text-slate-400 font-bold self-center">
                              +{job.skillTags.length - 4}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Link ứng tuyển */}
                      <td className="py-3.5 px-4 text-center">
                        {job.applyUrl ? (
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#B90013] hover:underline font-bold text-xs"
                            title={job.applyUrl}
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Thao tác: [✏️ Sửa] và [🗑️ Xóa] */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Nút Bật/Tắt Hiển thị */}
                          <button
                            type="button"
                            onClick={() => handleToggleJobStatus(job)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                              job.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={job.status === 'active' ? 'Đang bật hiển thị - Bấm để tắt/ẩn' : 'Đang tắt/ẩn - Bấm để bật hiển thị'}
                          >
                            {job.status === 'active' ? (
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
                            onClick={() => handleEditJob(job)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Chỉnh sửa việc làm này"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>

                          {/* Nút Xóa */}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetJob(job)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Xóa việc làm này"
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
      {deleteTargetJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#B90013] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base sm:text-lg font-extrabold text-[#131B2E]">
                Xác nhận xóa việc làm?
              </h4>
              <p className="text-xs text-slate-500">
                Bạn có chắc chắn muốn xóa việc làm{' '}
                <strong className="text-slate-800">"{deleteTargetJob.title}"</strong> của{' '}
                <strong className="text-slate-800">{deleteTargetJob.companyName}</strong>?
                Hành động này sẽ cập nhật ngay lập tức sang trang Việc làm và Lộ trình Career Map.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteJob}
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

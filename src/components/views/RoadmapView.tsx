import React, { useState, useEffect, useMemo } from 'react';
import { ScreenView, UserProfileState, TargetJob, CareerEvent, PTIT_MAJORS, UserAuth } from '../../types';
import { TARGET_JOBS, CAREER_EVENTS } from '../../data/mockData';
import { trackEvent } from '../../utils/analytics';
import {
  Compass,
  CheckCircle2,
  Circle,
  Briefcase,
  Layers,
  Sparkles,
  Calendar,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  Target,
  ArrowRight,
  GraduationCap,
  Award,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Building2,
  MapPin,
  DollarSign,
  TrendingUp,
  Cpu,
  Info,
  Clock,
  ListTodo,
  X,
  FileText,
  User,
  CheckSquare,
  Edit3,
  Sliders,
  RefreshCw,
  Zap,
  HelpCircle,
  Settings2,
  UploadCloud,
  Lock,
  FileLock2,
  FolderArchive,
  Rocket,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseCVFromPDF, saveCVSession, deleteCVSession, getStoredCVSessions, CVSessionState } from '../../services/geminiService';
import { loadAuthSession } from '../../services/userService';

export interface CareerOrientationOption {
  id: 'practical' | 'deep' | 'accelerated';
  title: string;
  badge: string;
  tag: string;
  description: string;
  aiMethod: string;
  goal: string;
  borderActive: string;
  badgeBg: string;
}

export const CAREER_ORIENTATION_OPTIONS: CareerOrientationOption[] = [
  {
    id: 'practical',
    title: 'Thực chiến',
    badge: 'Lựa chọn 1',
    tag: '⚡ Ưu tiên thực hành & dự án thực tế',
    description: 'Ưu tiên thực hành, dự án thực tế, công cụ đang được doanh nghiệp sử dụng và kỹ năng có thể áp dụng ngay vào công việc.',
    aiMethod: 'Tập trung vào các kỹ năng thực hành, bài tập dự án, sản phẩm Portfolio, kinh nghiệm thực tế, yêu cầu tuyển dụng và cơ hội thực tập phù hợp.',
    goal: 'Giúp bạn nhanh chóng hình thành năng lực thực tế và sẵn sàng ứng tuyển.',
    borderActive: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40',
    badgeBg: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'deep',
    title: 'Chuyên sâu',
    badge: 'Lựa chọn 2',
    tag: '📚 Kiến thức nền tảng & học thuật bài bản',
    description: 'Ưu tiên kiến thức nền tảng, tài liệu chuyên ngành, lý thuyết và học tập có hệ thống.',
    aiMethod: 'Sắp xếp nội dung từ cơ bản đến nâng cao, giải thích kiến thức cốt lõi, đề xuất tài liệu học tập đáng tin cậy và các hoạt động giúp phát triển chuyên môn.',
    goal: 'Giúp bạn xây dựng nền tảng vững chắc và phát triển năng lực chuyên môn lâu dài.',
    borderActive: 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'accelerated',
    title: 'Tăng tốc',
    badge: 'Lựa chọn 3',
    tag: '🚀 Tối ưu thời gian & đi làm sớm',
    description: 'Ưu tiên những kỹ năng quan trọng nhất để đạt mục tiêu nghề nghiệp trong thời gian ngắn và tối ưu nguồn lực học tập.',
    aiMethod: 'Xác định khoảng cách giữa năng lực hiện tại và yêu cầu của vị trí mục tiêu; ưu tiên kỹ năng thiết yếu, loại bỏ nội dung ít liên quan, tận dụng công cụ AI và xây dựng kế hoạch học tập theo từng giai đoạn.',
    goal: 'Giúp bạn tập trung vào những việc quan trọng nhất để đạt mục tiêu trong thời gian ngắn nhất.',
    borderActive: 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40',
    badgeBg: 'bg-emerald-100 text-emerald-800',
  },
];

interface RoadmapViewProps {
  onNavigate: (view: ScreenView) => void;
  selectedCareerTitle?: string;
  onOpenOrientationModal?: () => void;
  onEditProfile?: () => void;
  userProfile?: UserProfileState;
  onUpdateUserProfile?: (updated: Partial<UserProfileState>) => void;
  onSelectJobDetail?: (job: TargetJob) => void;
  allJobs?: TargetJob[];
  events?: CareerEvent[];
  onSelectEventDetail?: (event: CareerEvent) => void;
  auth?: UserAuth;
  onRequireLogin?: (reason?: string) => void;
}

export interface PracticalTask {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  isCompleted?: boolean;
  priority?: 'high' | 'medium' | 'normal';
  isCustom?: boolean;
  milestoneNumber?: number;
}

export interface RoadmapMilestoneData {
  milestoneNumber: number;
  milestoneTitle: string;
  milestoneSubtitle: string;
  badgeLabel: string;
  roleTitle: string;
  roleType: string;
  roleDescription: string;
  practicalTasks: PracticalTask[];
  requiredSkills: { name: string; isCore?: boolean; isGapSkill?: boolean }[];
  recommendedEventIds: string[];
  recommendedJobIds?: string[];
  hypotheticalItems?: {
    type: 'event' | 'job' | 'project' | 'cert';
    title: string;
    organizer?: string;
    company?: string;
    note?: string;
  }[];
  isCustomMilestone?: boolean;
}

const TASKS_STORAGE_KEY = 'ptit_career_hub_tasks_v2';
const COMPLETED_TASKS_KEY = 'ptit_career_map_completed_tasks_v2';
const CUSTOM_TASKS_KEY = 'ptit_custom_roadmap_tasks_v3';
const CUSTOM_MILESTONES_OVERRIDE_KEY = 'ptit_custom_milestones_override_v1';
const DELETED_TASK_IDS_KEY = 'ptit_deleted_task_ids_v1';

export const cleanTaskTitle = (title: string): string => {
  if (!title) return '';
  return title.replace(/^\[Gợi ý Gemini theo JD\]\s*/i, '').trim();
};

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  onNavigate,
  selectedCareerTitle = 'Digital Marketing',
  onOpenOrientationModal,
  onEditProfile,
  userProfile,
  onUpdateUserProfile,
  onSelectJobDetail,
  allJobs = TARGET_JOBS,
  events = CAREER_EVENTS,
  onSelectEventDetail,
  auth,
  onRequireLogin,
}) => {
  // Check user authentication status
  const isUserLoggedIn = useMemo(() => {
    return Boolean(auth?.isLoggedIn || loadAuthSession()?.isLoggedIn);
  }, [auth?.isLoggedIn]);
  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Target Job detection & State A / State B handling
  const targetJob: TargetJob | null = useMemo(() => {
    try {
      if (localStorage.getItem('ptit_target_job_cleared') === 'true') {
        return null;
      }
    } catch {}

    if (userProfile?.targetJobId) {
      const found = allJobs.find((j) => j.id === userProfile.targetJobId);
      if (found) return found;
    }

    if (userProfile?.targetJobTitle && userProfile.targetJobTitle.trim() !== '') {
      const foundByTitle = allJobs.find(
        (j) =>
          j.title.toLowerCase().includes(userProfile.targetJobTitle!.toLowerCase()) ||
          userProfile.targetJobTitle!.toLowerCase().includes(j.title.toLowerCase())
      );
      if (foundByTitle) return foundByTitle;

      return {
        id: userProfile.targetJobId || 'custom-target-job',
        title: userProfile.targetJobTitle,
        company: userProfile.targetJobCompany || 'Doanh nghiệp đối tác PTIT',
        location: userProfile.targetJobLocation || 'Hà Nội',
        salaryDisplay: userProfile.targetJobSalary || 'Hỗ trợ 4.000.000 – 7.000.000 VNĐ/tháng',
        description:
          userProfile.targetJobDescription ||
          'Mục tiêu nghề nghiệp đã lựa chọn từ danh sách việc làm đối tác PTIT.',
        requiredSkills: userProfile.targetJobRequiredSkills || [
          'Kỹ năng chuyên môn',
          'Kỹ năng giao tiếp',
          'Tư duy số liệu',
        ],
        responsibilities: [],
        benefits: [],
        targetMajors: userProfile.major ? [userProfile.major] : ['Khối ngành Kinh tế PTIT'],
        level: 'Thực tập sinh',
        jobType: 'Thực tập',
        matchPercentage: 90,
        isSaved: false,
      };
    }

    return null;
  }, [
    userProfile?.targetJobId,
    userProfile?.targetJobTitle,
    userProfile?.targetJobCompany,
    userProfile?.targetJobSalary,
    userProfile?.targetJobLocation,
    userProfile?.targetJobRequiredSkills,
    userProfile?.targetJobDescription,
    allJobs,
  ]);

  // Handle Remove / Reset Target Goal (State B -> State A)
  const handleRemoveTargetGoal = () => {
    try {
      localStorage.setItem('ptit_target_job_cleared', 'true');
      localStorage.removeItem('ptit_selected_target_job_id');
    } catch {}

    if (onUpdateUserProfile) {
      onUpdateUserProfile({
        targetJobTitle: '',
        targetJobId: '',
        targetJobCompany: '',
        targetJobSalary: '',
        targetJobLocation: '',
        targetJobRequiredSkills: [],
        targetJobDescription: '',
      });
    }

    showToast('Đã xóa công việc mục tiêu. Chuyển về Lộ trình khung chuẩn theo ngành!');
  };

  // Check if user has an active career map or target job
  const hasActiveCareerMap = useMemo(() => {
    if (targetJob) return true;
    const direction = userProfile?.careerDirection?.trim();
    if (direction && direction !== '' && direction !== 'Chưa có' && direction !== 'Chưa định hướng') {
      return true;
    }
    return Boolean(userProfile?.careerCheckCompleted);
  }, [targetJob, userProfile?.careerDirection, userProfile?.careerCheckCompleted]);

  const handleActivateMajorRoadmap = () => {
    if (!userProfile?.major) {
      showToast('⚠️ Vui lòng chọn chuyên ngành học trước khi kích hoạt lộ trình!');
      return;
    }
    if (onUpdateUserProfile) {
      onUpdateUserProfile({
        careerDirection: displayMajor,
      });
    }
    showToast(`Đã kích hoạt Lộ trình nghề nghiệp ngành ${displayMajor}!`);
    try {
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
    } catch {}
  };

  const handleResetCareerDirection = () => {
    if (onUpdateUserProfile) {
      onUpdateUserProfile({
        careerDirection: '',
        targetJobTitle: '',
        targetJobId: '',
        targetJobCompany: '',
        skillGap: null,
      });
    }
    try {
      localStorage.setItem('ptit_target_job_cleared', 'true');
      localStorage.removeItem('ptit_selected_target_job_id');
    } catch {}
    showToast('Đã đặt lại định hướng. Bạn có thể chọn cách kích hoạt mới!');
  };

  // 2. Flexible Starting Point (Starting Milestone based on userProfile)
  const suggestedStartingMilestone = useMemo<number>(() => {
    const year = (userProfile?.academicYear || '').toLowerCase();
    const goal = (userProfile?.careerGoal || '').toLowerCase();

    // Priority 1: Check academic year selected by user
    if (year.includes('4') || year.includes('fresher') || year.includes('tốt nghiệp') || year.includes('đi làm')) {
      return 3;
    }
    if (year.includes('3')) {
      return 2;
    }
    if (year.includes('1') || year.includes('2') || year.includes('tân sinh viên')) {
      return 1;
    }

    // Priority 2: Fallback to careerGoal if academicYear not set or inconclusive
    if (
      goal.includes('fresher') ||
      goal.includes('chuyên viên') ||
      goal.includes('chuẩn bị đi làm') ||
      goal.includes('đã có nghề mục tiêu')
    ) {
      return 3;
    }
    if (goal.includes('intern') || goal.includes('thực tập')) {
      return 2;
    }

    return 1;
  }, [userProfile?.academicYear, userProfile?.careerGoal]);

  // Active Milestone Tab
  const [activeMilestone, setActiveMilestone] = useState<number>(suggestedStartingMilestone);

  useEffect(() => {
    setActiveMilestone(suggestedStartingMilestone);
  }, [suggestedStartingMilestone]);

  // Completed practical tasks set in localStorage
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(COMPLETED_TASKS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleTaskCompleted = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const isDone = prev.includes(taskId);
      const next = isDone ? prev.filter((id) => id !== taskId) : [...prev, taskId];
      try {
        localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(next));
      } catch {}

      if (!isDone) {
        try {
          confetti({ particleCount: 22, spread: 50, origin: { y: 0.75 } });
        } catch {}
      }
      return next;
    });
  };

  // Custom User Tasks added directly from this view
  const [customTasks, setCustomTasks] = useState<PracticalTask[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_TASKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((t: PracticalTask) => ({
            ...t,
            title: cleanTaskTitle(t.title),
          }));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Track deleted system task IDs so user can delete any task
  const [deletedTaskIds, setDeletedTaskIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(DELETED_TASK_IDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Milestone customizations (renaming, editing roleTitle, etc.)
  const [milestoneOverrides, setMilestoneOverrides] = useState<Record<number, Partial<RoadmapMilestoneData>>>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_MILESTONES_OVERRIDE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Edited standard tasks (user edited title/deadline/description)
  const [editedTasksMap, setEditedTasksMap] = useState<Record<string, Partial<PracticalTask>>>(() => {
    try {
      const stored = localStorage.getItem('ptit_edited_tasks_map_v1');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // 3. Extract Uploaded CV Data (Sync with CV uploaded in AI CV or Profile)
  const [cvUploadTrigger, setCvUploadTrigger] = useState(0);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [isCvRemovedByChoice, setIsCvRemovedByChoice] = useState(false);
  const [isChangeCvModalOpen, setIsChangeCvModalOpen] = useState(false);

  // Lắng nghe sự kiện cập nhật/xóa/chọn CV từ trang AI CV
  useEffect(() => {
    const handleCvSync = (e: any) => {
      if (e?.detail?.action === 'deleted_all') {
        setIsCvRemovedByChoice(true);
        setAiGapData(null);
      } else {
        setIsCvRemovedByChoice(false);
      }
      setCvUploadTrigger((prev) => prev + 1);
    };
    window.addEventListener('ptit_cv_updated', handleCvSync);
    window.addEventListener('storage', handleCvSync);
    return () => {
      window.removeEventListener('ptit_cv_updated', handleCvSync);
      window.removeEventListener('storage', handleCvSync);
    };
  }, []);

  // Stored CVs list from AI CV archive
  const availableStoredCvs = useMemo(() => {
    return getStoredCVSessions();
  }, [cvUploadTrigger]);

  const uploadedCvInfo = useMemo(() => {
    if (isCvRemovedByChoice) {
      return {
        hasCv: false,
        fileName: null,
        uploadedAt: null,
        skills: [],
        experiencesCount: 0,
        experiences: [],
        fullName: null,
        cvRawData: null,
      };
    }

    const storedList = getStoredCVSessions();
    const lastSessionId = localStorage.getItem('ptit_last_cv_session_id');

    // QUY TẮC ĐỒNG BỘ: Nếu trong hệ thống không còn file CV nào, buộc return hasCv: false
    // và tuyệt đối không hiển thị dữ liệu CV phantom/rác
    if (storedList.length === 0 && !lastSessionId) {
      return {
        hasCv: false,
        fileName: null,
        uploadedAt: null,
        skills: [],
        experiencesCount: 0,
        experiences: [],
        fullName: null,
        cvRawData: null,
      };
    }

    try {
      if (lastSessionId) {
        const stored = localStorage.getItem(`ptit_cv_session_${lastSessionId}`);
        if (stored) {
          const session = JSON.parse(stored);
          const cv: any = session.verifiedCV || session.extractedCV;
          if (cv) {
            const skillsList = [
              ...(Array.isArray(cv.skills) ? cv.skills.map((s: any) => s?.name || s) : []),
              ...(Array.isArray(cv.skills?.hardSkills) ? cv.skills.hardSkills : []),
              ...(Array.isArray(cv.skills?.softSkills) ? cv.skills.softSkills : []),
            ].filter(Boolean);

            const experiencesList = Array.isArray(cv.experiences)
              ? cv.experiences
              : Array.isArray(cv.workExperience)
              ? cv.workExperience
              : [];

            return {
              hasCv: true,
              fileName: session.fileName || 'CV_SinhVien_PTIT.pdf',
              uploadedAt: session.uploadedAt || 'Gần đây',
              skills: skillsList,
              experiencesCount: experiencesList.length,
              experiences: experiencesList,
              fullName: cv.candidate?.fullName || userProfile?.displayName,
              cvRawData: cv,
            };
          }
        }
      }

      // Check if there are pre-uploaded CV sessions in the archive
      if (storedList.length > 0) {
        const latest = storedList[0];
        const cv: any = latest.verifiedCV || latest.extractedCV;
        if (cv) {
          const skillsList = [
            ...(Array.isArray(cv.skills) ? cv.skills.map((s: any) => s?.name || s) : []),
            ...(Array.isArray(cv.skills?.hardSkills) ? cv.skills.hardSkills : []),
            ...(Array.isArray(cv.skills?.softSkills) ? cv.skills.softSkills : []),
          ].filter(Boolean);

          const experiencesList = Array.isArray(cv.experiences)
            ? cv.experiences
            : Array.isArray(cv.workExperience)
            ? cv.workExperience
            : [];

          return {
            hasCv: true,
            fileName: latest.fileName || 'CV_SinhVien_PTIT.pdf',
            uploadedAt: latest.uploadedAt || 'Gần đây',
            skills: skillsList,
            experiencesCount: experiencesList.length,
            experiences: experiencesList,
            fullName: cv.candidate?.fullName || userProfile?.displayName,
            cvRawData: cv,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading stored CV in RoadmapView:', e);
    }

    return {
      hasCv: false,
      fileName: null,
      uploadedAt: null,
      skills: [],
      experiencesCount: 0,
      experiences: [],
      fullName: null,
      cvRawData: null,
    };
  }, [userProfile?.cvFileName, userProfile?.cvUploadedAt, userProfile?.displayName, userProfile?.cvExtractedText, cvUploadTrigger, isCvRemovedByChoice]);

  // Handler to select an already-uploaded CV from the AI CV archive
  const handleSelectStoredCvForRoadmap = (session: CVSessionState) => {
    localStorage.setItem('ptit_last_cv_session_id', session.id);
    setIsCvRemovedByChoice(false);

    const cv: any = session.verifiedCV || session.extractedCV;
    const skillsList = [
      ...(Array.isArray(cv?.skills) ? cv.skills.map((s: any) => s?.name || s) : []),
      ...(Array.isArray(cv?.skills?.hardSkills) ? cv.skills.hardSkills : []),
      ...(Array.isArray(cv?.skills?.softSkills) ? cv.skills.softSkills : []),
    ].filter(Boolean);

    const expsList = Array.isArray(cv?.experiences)
      ? cv.experiences
      : Array.isArray(cv?.workExperience)
      ? cv.workExperience
      : [];

    if (onUpdateUserProfile && session.fileName) {
      onUpdateUserProfile({
        cvFileName: session.fileName,
        cvFileSize: session.fileSize,
        cvUploadedAt: session.uploadedAt,
        cvSkills: skillsList,
        cvExperiencesCount: expsList.length,
        cvExperiences: expsList,
        cvExtractedText: cv?.candidate?.fullName
          ? `Ứng viên: ${cv.candidate.fullName}\nMục tiêu: ${cv.careerObjective || '—'}`
          : `Đã nạp file CV: ${session.fileName}`,
      });
    }

    setCvUploadTrigger((prev) => prev + 1);
    setIsChangeCvModalOpen(false);

    window.dispatchEvent(
      new CustomEvent('ptit_cv_updated', {
        detail: { action: 'selected', session },
      })
    );

    showToast(`✨ Đã chọn file CV: "${session.fileName}" để phân tích!`);
  };

  // Direct CV Upload Handlers
  const handleDirectCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCvUploadError('Tệp vượt quá dung lượng 10MB. Vui lòng chọn tệp nhỏ hơn.');
      return;
    }

    setIsUploadingCv(true);
    setCvUploadError(null);

    try {
      let extractedCV: any = null;

      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          extractedCV = await parseCVFromPDF(file, file.name);
        } catch (pdfErr) {
          console.warn('Direct PDF parsing fallback:', pdfErr);
        }
      }

      if (!extractedCV || !extractedCV.skills || extractedCV.skills.length === 0) {
        extractedCV = {
          candidate: {
            fullName: userProfile?.displayName || 'Sinh viên PTIT',
            email: userProfile?.email || 'sinhvien@ptit.edu.vn',
          },
          skills: [
            { name: 'Kỹ năng giao tiếp' },
            { name: 'Tin học văn phòng' },
            { name: 'Làm việc nhóm' },
            { name: userProfile?.major ? `Chuyên môn ${userProfile.major}` : 'Phân tích dữ liệu' },
          ],
          experiences: [
            {
              role: 'Dự án thực tế / Hoạt động sinh viên',
              company: 'Học viện PTIT',
              duration: '2024 - 2026',
              description: 'Thực hiện các đồ án môn học, bài tập lớn và hoạt động nghiên cứu.',
            },
          ],
          summary: `CV ứng viên ${userProfile?.displayName || ''} tải lên tệp ${file.name}`,
        };
      }

      const sessionId = crypto.randomUUID();
      const uploadedAt =
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        new Date().toLocaleDateString('vi-VN');

      const newSession = {
        id: sessionId,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt,
        status: 'cv_parsed',
        extractedCV,
        verifiedCV: extractedCV,
        targetJobId: targetJob?.id,
        targetJobTitle: targetJob?.title,
        targetCompany: targetJob?.company,
      };

      try {
        localStorage.setItem(`ptit_cv_session_${sessionId}`, JSON.stringify(newSession));
        localStorage.setItem('ptit_last_cv_session_id', sessionId);
        saveCVSession(userProfile?.uid || 'guest', newSession as any);
      } catch {}

      if (onUpdateUserProfile) {
        onUpdateUserProfile({
          cvFileName: file.name,
          cvFileSize: file.size,
          cvUploadedAt: uploadedAt,
          cvExtractedText: `Đã nạp file CV: ${file.name}`,
        });
      }

      setCvUploadTrigger((prev) => prev + 1);
      showToast(`📄 Đã tải lên và đọc dữ liệu từ file "${file.name}"!`);
    } catch (err: any) {
      console.error('Lỗi khi nạp CV:', err);
      setCvUploadError(err?.message || 'Có lỗi xảy ra khi đọc tệp CV.');
    } finally {
      setIsUploadingCv(false);
    }
  };

  const handleLoadSampleCv = (sampleName: string = 'CV_Marketing_Intern_PTIT.pdf') => {
    const sessionId = crypto.randomUUID();
    const uploadedAt =
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ', ' +
      new Date().toLocaleDateString('vi-VN');

    const sampleCV = {
      candidate: {
        fullName: userProfile?.displayName || 'Nguyễn Văn A',
        email: userProfile?.email || 'sinhvien@ptit.edu.vn',
      },
      skills: [
        { name: 'Content Marketing' },
        { name: 'Canva Design' },
        { name: 'Social Media Management' },
        { name: 'Kỹ năng giao tiếp' },
        { name: 'Phân tích dữ liệu cơ bản' },
      ],
      experiences: [
        {
          role: 'Cộng tác viên Truyền thông',
          company: 'CLB Kỹ năng PTIT',
          duration: '09/2024 - 05/2025',
          description: 'Sáng tạo nội dung fanpage, thiết kế ấn phẩm truyền thông bằng Canva và theo dõi tương tác bài viết.',
        },
      ],
      summary: 'Sinh viên năm 3 PTIT nhiệt huyết, có kinh nghiệm quản trị fanpage và sáng tạo nội dung truyền thông đa kênh.',
    };

    const newSession = {
      id: sessionId,
      fileName: sampleName,
      fileSize: 245000,
      uploadedAt,
      status: 'cv_parsed',
      extractedCV: sampleCV,
      verifiedCV: sampleCV,
      targetJobId: targetJob?.id,
      targetJobTitle: targetJob?.title,
      targetCompany: targetJob?.company,
    };

    try {
      localStorage.setItem(`ptit_cv_session_${sessionId}`, JSON.stringify(newSession));
      localStorage.setItem('ptit_last_cv_session_id', sessionId);
      saveCVSession(userProfile?.uid || 'guest', newSession as any);
    } catch {}

    if (onUpdateUserProfile) {
      onUpdateUserProfile({
        cvFileName: sampleName,
        cvFileSize: 245000,
        cvUploadedAt: uploadedAt,
        cvExtractedText: `Đã nạp file CV mẫu: ${sampleName}`,
      });
    }

    setCvUploadTrigger((prev) => prev + 1);
    showToast(`✨ Đã nạp file CV mẫu "${sampleName}" để phân tích!`);
  };

  const handleRemoveCv = () => {
    try {
      const lastSessionId = localStorage.getItem('ptit_last_cv_session_id');
      if (lastSessionId) {
        localStorage.removeItem(`ptit_cv_session_${lastSessionId}`);
        deleteCVSession(userProfile?.uid || 'guest', lastSessionId);
      }
      localStorage.removeItem('ptit_last_cv_session_id');
    } catch {}

    if (onUpdateUserProfile) {
      onUpdateUserProfile({
        cvFileName: undefined,
        cvFileSize: undefined,
        cvUploadedAt: undefined,
        cvExtractedText: undefined,
        cvSkills: undefined,
        cvExperiencesCount: undefined,
        cvExperiences: undefined,
      });
    }

    setIsCvRemovedByChoice(true);
    setAiGapData(null);
    setCvUploadTrigger((prev) => prev + 1);

    window.dispatchEvent(
      new CustomEvent('ptit_cv_updated', {
        detail: { action: 'removed' },
      })
    );

    showToast('Đã gỡ bỏ file CV và làm sạch dữ liệu khỏi hệ thống.');
  };

  // Alternate AI Roadmap state (Persisted in localStorage)
  const [aiGeneratedMilestones, setAiGeneratedMilestones] = useState<RoadmapMilestoneData[] | null>(() => {
    try {
      const stored = localStorage.getItem('ptit_custom_ai_roadmap_milestones_v1');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeRegenFocusName, setActiveRegenFocusName] = useState<string>(() => {
    try {
      return localStorage.getItem('ptit_active_regen_focus_name') || '';
    } catch {
      return '';
    }
  });

  // Modal State for Regenerate Roadmap
  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [selectedRegenFocus, setSelectedRegenFocus] = useState<'practical' | 'deep' | 'accelerated'>('practical');
  const [selectedRegenMajor, setSelectedRegenMajor] = useState<string>(() => {
    return userProfile?.careerDirection || userProfile?.major || 'Quản trị kinh doanh';
  });
  const [regenOrientationType, setRegenOrientationType] = useState<'major' | 'target_job'>(() => {
    return targetJob ? 'target_job' : 'major';
  });
  const [regenCustomNote, setRegenCustomNote] = useState<string>('');

  // Modal State for Pre-Creation Orientation Selection
  const [isInitialOrientationModalOpen, setIsInitialOrientationModalOpen] = useState(false);
  const [selectedInitialFocus, setSelectedInitialFocus] = useState<'practical' | 'deep' | 'accelerated'>('practical');
  const [initialCustomNote, setInitialCustomNote] = useState<string>('');

  // AI Gemini Gap Analysis State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiGapData, setAiGapData] = useState<{
    matchScore: number;
    analysisSummary: string;
    missingSkills: string[];
    gapSkills: string[];
    acquiredSkillsFromCv?: string[];
    customTasks?: { title: string; priority: 'high' | 'medium' | 'normal'; deadline?: string; description?: string }[];
    suggestedMilestones?: any[];
    recommendedEventIds?: string[];
    recommendedJobIds?: string[];
    coreAdvice: string;
  } | null>(null);

  // Trigger Gemini Gap Analysis (Supports both Target Job and Major-based orientation)
  const runGeminiAnalysis = async (
    isRegenerate: boolean = false,
    focusLabel?: string,
    forcedMajor?: string,
    optionalNote?: string
  ) => {
    setIsAiLoading(true);

    const chosenMajor =
      forcedMajor ||
      selectedRegenMajor ||
      userProfile?.careerDirection ||
      userProfile?.major ||
      'Quản trị kinh doanh';

    const chosenFocus =
      focusLabel ||
      (selectedRegenFocus === 'deep'
        ? 'Chuyên sâu'
        : selectedRegenFocus === 'accelerated'
        ? 'Tăng tốc'
        : 'Thực chiến');

    // Only attach targetJob if user explicitly chose target_job mode or targetJob exists
    const effectiveTargetJob =
      regenOrientationType === 'target_job' && targetJob ? targetJob : null;

    try {
      const res = await fetch('/api/gemini/career-gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          targetJob: effectiveTargetJob
            ? {
                title: effectiveTargetJob.title,
                company: effectiveTargetJob.company,
                requiredSkills: effectiveTargetJob.requiredSkills || effectiveTargetJob.skillTags || [],
                description: effectiveTargetJob.description || '',
                location: effectiveTargetJob.location,
                salaryDisplay: effectiveTargetJob.salaryDisplay,
              }
            : null,
          majorDirection: chosenMajor,
          cvData: uploadedCvInfo.hasCv ? uploadedCvInfo.cvRawData : null,
          events,
          jobs: allJobs,
          isRegenerate,
          regenerationFocus: chosenFocus,
          customNote: optionalNote !== undefined ? optionalNote : regenCustomNote,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setAiGapData(json.data);

          // If AI suggested brand new milestones, apply them!
          if (json.data.suggestedMilestones && json.data.suggestedMilestones.length === 3) {
            const parsedMilestones: RoadmapMilestoneData[] = json.data.suggestedMilestones.map(
              (sm: any, idx: number) => ({
                milestoneNumber: (idx + 1) as 1 | 2 | 3,
                milestoneTitle: `Cột mốc ${idx + 1}: ${sm.roleTitle || 'Năng lực mục tiêu'}`,
                milestoneSubtitle:
                  sm.keyFocus || 'Trọng tâm phát triển giai đoạn này theo phân tích CV & Ngành',
                badgeLabel:
                  sm.badgeLabel ||
                  (idx === 0
                    ? 'Entry-Level • CTV / Dự án'
                    : idx === 1
                    ? 'Core Execution • Intern'
                    : 'Junior / Official • Chuyên viên'),
                roleTitle: sm.roleTitle || `Vị trí mục tiêu Cột mốc ${idx + 1}`,
                roleType:
                  idx === 0
                    ? 'Cộng tác viên / Dự án'
                    : idx === 1
                    ? 'Thực tập sinh'
                    : 'Chuyên viên chính thức',
                roleDescription:
                  sm.keyFocus || 'Nhiệm vụ và kỹ năng được AI Gemini cá nhân hóa dựa trên CV đã tải lên.',
                practicalTasks: Array.isArray(sm.practicalTasks)
                  ? sm.practicalTasks.map((t: any, tidx: number) => ({
                      id: `ai-gen-m${idx + 1}-t${tidx + 1}-${Date.now()}`,
                      title: t.title,
                      deadline: t.deadline || 'Hạn: 3 tuần',
                      priority: t.priority || 'high',
                      description: `Nhiệm vụ thực tế được AI đề xuất cho ${userProfile?.displayName || 'bạn'}`,
                    }))
                  : [
                      {
                        id: `ai-gen-m${idx + 1}-t1-${Date.now()}`,
                        title: `Thực hiện dự án mô phỏng cho vị trí ${sm.roleTitle}`,
                        deadline: 'Hạn: 1 tháng',
                        priority: 'high',
                      },
                    ],
                requiredSkills: Array.isArray(sm.requiredSkills)
                  ? sm.requiredSkills.map((sk: string) => ({ name: sk, isCore: true, isGapSkill: true }))
                  : [{ name: 'Kỹ năng chuyên môn', isCore: true }],
                recommendedEventIds:
                  sm.recommendedEventIds || json.data.suggestedEvents || ['event-1', 'event-2'],
                recommendedJobIds: sm.recommendedJobIds || json.data.suggestedJobIds || [],
                hypotheticalItems: sm.hypotheticalItems || [],
                isCustomMilestone: true,
              })
            );

            setAiGeneratedMilestones(parsedMilestones);
            setActiveRegenFocusName(chosenFocus);
            try {
              localStorage.setItem(
                'ptit_custom_ai_roadmap_milestones_v1',
                JSON.stringify(parsedMilestones)
              );
              localStorage.setItem('ptit_active_regen_focus_name', chosenFocus);
            } catch {}

            // Activate career direction if not already active
            if (
              onUpdateUserProfile &&
              (!userProfile?.careerDirection || userProfile.careerDirection.trim() === '')
            ) {
              onUpdateUserProfile({
                careerDirection: chosenMajor,
              });
            }
          }

          setIsAiLoading(false);
          setIsRegenModalOpen(false);

          if (isRegenerate) {
            showToast('✨ Đã làm mới lộ trình với AI thành công!');
            try {
              confetti({ particleCount: 35, spread: 65, origin: { y: 0.7 } });
            } catch {}
          } else {
            showToast(`✨ Đã kích hoạt lộ trình AI theo ngành ${chosenMajor}!`);
          }
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Local Fallback: calculate from uploadedCvInfo and selected major / job
    const cvSkills = uploadedCvInfo.skills || [];
    const majorStandards: Record<string, string[]> = {
      'Quản trị kinh doanh': ['Quản trị dự án', 'Phân tích dữ liệu kinh doanh', 'Kỹ năng đàm phán', 'Tư duy chiến lược', 'Marketing căn bản'],
      'Marketing': ['Digital Marketing', 'Content & SEO', 'Quản lý chiến dịch', 'Phân tích thị trường', 'Google Analytics'],
      'Thương mại điện tử': ['Vận hành sàn TMĐT', 'Tối ưu tỷ lệ chuyển đổi', 'Phân tích hành vi người dùng', 'Digital Ads', 'Quản lý đơn hàng'],
      'Kế toán': ['Kế toán tài chính', 'Thuế doanh nghiệp', 'Phần mềm kế toán MISA', 'Phân tích báo cáo tài chính', 'Kiểm toán nội bộ'],
      'Công nghệ tài chính (Fintech)': ['Phân tích tài chính', 'Thanh toán số', 'Công nghệ Blockchain', 'Quản trị rủi ro', 'Python cho tài chính'],
      'Logistics và Quản trị chuỗi cung ứng': ['Quản trị kho vận', 'Tối ưu tuyến đường', 'Hệ thống ERP/WMS', 'Thủ tục hải quan', 'Quản lý chuỗi cung ứng'],
      'Quan hệ công chúng (PR)': ['Viết thông cáo báo chí', 'Quản trị khủng hoảng truyền thông', 'Tổ chức sự kiện', 'Xây dựng thương hiệu', 'Quan hệ báo chí'],
      'Công nghệ thông tin': ['Lập trình cơ bản', 'Cấu trúc dữ liệu & Thuật toán', 'Cơ sở dữ liệu SQL', 'Git/GitHub', 'RESTful API'],
    };

    const standardSkills = majorStandards[chosenMajor] || [
      'Kỹ năng chuyên môn',
      'Phân tích dữ liệu',
      'Làm việc nhóm',
      'Tư duy phản biện',
      'Giao tiếp thuyết phục',
    ];

    const required = effectiveTargetJob
      ? (effectiveTargetJob.requiredSkills || effectiveTargetJob.skillTags || standardSkills)
      : standardSkills;

    const matched = required.filter((reqSkill) =>
      cvSkills.some(
        (cvSk) =>
          cvSk.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(cvSk.toLowerCase())
      )
    );

    const missing = required.filter(
      (reqSkill) =>
        !cvSkills.some(
          (cvSk) =>
            cvSk.toLowerCase().includes(reqSkill.toLowerCase()) ||
            reqSkill.toLowerCase().includes(cvSk.toLowerCase())
        )
    );

    const skillRatio = required.length > 0 ? matched.length / required.length : 0.6;
    const expBonus = Math.min((uploadedCvInfo.experiencesCount || 0) * 8, 20);
    const score = isRegenerate ? 88 : Math.min(95, Math.max(35, Math.round(skillRatio * 70 + expBonus + 10)));
    const targetTitle = effectiveTargetJob
      ? effectiveTargetJob.title
      : `Chuyên viên ${chosenMajor}`;
    const targetCompany = effectiveTargetJob ? effectiveTargetJob.company : 'Doanh nghiệp đối tác PTIT';
    const topMissing = missing.length > 0 ? missing : required.slice(0, 3);

    const fallbackMilestones: RoadmapMilestoneData[] = [
      {
        milestoneNumber: 1,
        milestoneTitle: `Cột mốc 1: Cộng tác viên & Nền tảng chuyên môn ngành ${chosenMajor}`,
        milestoneSubtitle: `Khắc phục khoảng trống kỹ năng nền tảng cho ngành ${chosenMajor}`,
        badgeLabel: 'Entry-Level • CTV / Dự án thử nghiệm',
        roleTitle: `Cộng tác viên Nhập môn & Nền tảng ngành ${chosenMajor}`,
        roleType: 'Cộng tác viên / Dự án',
        roleDescription: `Rèn luyện kỹ năng cốt lõi và bổ sung khoảng trống kỹ năng ${topMissing[0] || 'chuyên ngành'}.`,
        practicalTasks: [
          {
            id: `fb-m1-t1-${Date.now()}`,
            title: `Thực hành xây dựng bài tập lớn/case study bổ sung kỹ năng ${topMissing[0] || 'cốt lõi'}`,
            deadline: '2 tuần',
            priority: 'high',
          },
          {
            id: `fb-m1-t2-${Date.now()}`,
            title: `Nghiên cứu bộ công cụ căn bản và chuẩn hóa quy trình làm việc ngành ${chosenMajor}`,
            deadline: '3 tuần',
            priority: 'medium',
          },
        ],
        requiredSkills: topMissing.slice(0, 2).map((sk) => ({ name: sk, isCore: true, isGapSkill: true })),
        recommendedEventIds: ['event-1', 'event-2'],
        hypotheticalItems: [
          {
            type: 'event',
            title: `Workshop: Chinh phục kỹ năng ${topMissing[0] || 'thực chiến'} cho sinh viên ${chosenMajor}`,
            organizer: 'CLB Học thuật & Doanh nghiệp PTIT',
            note: 'Đề xuất giả định phù hợp để bù đắp khoảng trống kỹ năng',
          },
        ],
        isCustomMilestone: true,
      },
      {
        milestoneNumber: 2,
        milestoneTitle: `Cột mốc 2: Thực tập sinh Thực chiến ngành ${chosenMajor}`,
        milestoneSubtitle: 'Tham gia dự án thực tế cọ xát nghiệp vụ doanh nghiệp',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: `Thực tập sinh Chuyên môn ngành ${chosenMajor}`,
        roleType: 'Thực tập sinh',
        roleDescription: 'Cọ xát thực tế, giải quyết bài toán nghiệp vụ và xây dựng Portfolio sản phẩm.',
        practicalTasks: [
          {
            id: `fb-m2-t1-${Date.now()}`,
            title: `Tham gia trực tiếp quy trình triển khai công việc thực tế tại doanh nghiệp đối tác`,
            deadline: '1 tháng',
            priority: 'high',
          },
          {
            id: `fb-m2-t2-${Date.now()}`,
            title: `Đo lường hiệu quả công việc và lập báo cáo tiến độ định kỳ`,
            deadline: '6 tuần',
            priority: 'high',
          },
        ],
        requiredSkills: topMissing.slice(1, 3).map((sk) => ({ name: sk, isCore: true, isGapSkill: true })),
        recommendedEventIds: ['event-1', 'event-2'],
        hypotheticalItems: [
          {
            type: 'job',
            title: `Thực tập sinh ${chosenMajor} - Dự án Chuyển đổi số`,
            company: 'Tập đoàn Công nghệ & Viễn thông Đối tác PTIT',
            note: 'Cơ hội thực tập mô phỏng tích lũy kinh nghiệm thực tế',
          },
        ],
        isCustomMilestone: true,
      },
      {
        milestoneNumber: 3,
        milestoneTitle: `Cột mốc 3: ${targetTitle}`,
        milestoneSubtitle: effectiveTargetJob
          ? `Đích đến mục tiêu tại ${targetCompany}`
          : `Đạt chuẩn năng lực Chuyên viên chính thức ngành ${chosenMajor}`,
        badgeLabel: effectiveTargetJob
          ? `🎯 JD Mục tiêu • ${targetCompany}`
          : `🎯 Đích đến Chuyên viên • Ngành ${chosenMajor}`,
        roleTitle: targetTitle,
        roleType: 'Chuyên viên chính thức',
        roleDescription: `Vị trí chính thức bạn tự tin đảm nhiệm sau khi hoàn thành lộ trình rèn luyện.`,
        practicalTasks: [
          {
            id: `fb-m3-t1-${Date.now()}`,
            title: `Hoàn thiện hồ sơ CV & Portfolio làm nổi bật các dự án khớp với tiêu chuẩn vị trí ${targetTitle}`,
            deadline: '3 tháng',
            priority: 'high',
          },
          {
            id: `fb-m3-t2-${Date.now()}`,
            title: 'Luyện tập phỏng vấn tình huống nghiệp vụ và văn hóa tuyển dụng chuyên nghiệp',
            deadline: '4 tháng',
            priority: 'high',
          },
        ],
        requiredSkills: required.slice(0, 4).map((sk) => ({ name: sk, isCore: true })),
        recommendedEventIds: ['event-1', 'event-2'],
        isCustomMilestone: true,
      },
    ];

    setAiGeneratedMilestones(fallbackMilestones);
    setActiveRegenFocusName(chosenFocus);
    try {
      localStorage.setItem('ptit_custom_ai_roadmap_milestones_v1', JSON.stringify(fallbackMilestones));
      localStorage.setItem('ptit_active_regen_focus_name', chosenFocus);
    } catch {}

    if (
      onUpdateUserProfile &&
      (!userProfile?.careerDirection || userProfile.careerDirection.trim() === '')
    ) {
      onUpdateUserProfile({
        careerDirection: chosenMajor,
      });
    }

    setAiGapData({
      matchScore: score,
      analysisSummary: uploadedCvInfo.hasCv
        ? `Dựa trên kỹ năng và kinh nghiệm trong file CV "${uploadedCvInfo.fileName}" (${cvSkills.length} kỹ năng, ${uploadedCvInfo.experiencesCount} kinh nghiệm/dự án), bạn đã đáp ứng khoảng ${score}% tiêu chuẩn ngành ${chosenMajor}. Lộ trình 3 Cột mốc đã được điều chỉnh để giải quyết các khoảng trống kỹ năng ${topMissing.slice(0, 2).join(', ')}.`
        : `Dựa trên hồ sơ ngành ${chosenMajor} (${userProfile?.academicYear || 'Năm 3'}), AI đã xây dựng lộ trình 3 Cột mốc hoàn chỉnh giúp bạn tự tin đạt chuẩn năng lực Chuyên viên chính thức.`,
      missingSkills: topMissing,
      gapSkills: topMissing,
      acquiredSkillsFromCv: matched.length > 0 ? matched : cvSkills.slice(0, 3),
      customTasks: [
        {
          title: `Xây dựng dự án hoặc bài tập lớn bổ sung kỹ năng ${topMissing[0] || 'thực chiến'}`,
          priority: 'high',
          deadline: 'Trong 2 tuần',
          description: `Giải quyết khoảng trống kỹ năng so với yêu cầu chuẩn ngành ${chosenMajor}`,
        },
        {
          title: `Tối ưu hóa các con số định lượng trong CV theo chuẩn ATS`,
          priority: 'high',
          deadline: 'Tháng này',
          description: 'Nổi bật các từ khóa kỹ năng phù hợp tiêu chí tuyển dụng',
        },
      ],
      recommendedEventIds: ['event-1', 'event-2'],
      coreAdvice: `Hoàn thiện 2 dự án thực tế mô phỏng và tham gia các Workshop chuyên ngành ${chosenMajor} để được ưu tiên xét hồ sơ.`,
    });

    setIsAiLoading(false);
    setIsRegenModalOpen(false);

    if (isRegenerate) {
      showToast(`✨ Đã làm mới lộ trình theo hướng: "${chosenFocus}"!`);
    } else {
      showToast(`✨ Đã kích hoạt lộ trình AI theo ngành ${chosenMajor}!`);
    }
  };

  // Reset to default standard roadmap
  const handleResetToDefaultRoadmap = () => {
    setAiGeneratedMilestones(null);
    setActiveRegenFocusName('');
    try {
      localStorage.removeItem('ptit_custom_ai_roadmap_milestones_v1');
      localStorage.removeItem('ptit_active_regen_focus_name');
    } catch {}
    showToast('Đã khôi phục lộ trình chuẩn hóa theo ngành học!');
  };

  // Auto-trigger on targetJob or CV change (ONLY if CV is uploaded)
  useEffect(() => {
    if (targetJob && uploadedCvInfo.hasCv) {
      runGeminiAnalysis(false);
    } else {
      setAiGapData(null);
    }
  }, [targetJob?.id, targetJob?.title, userProfile?.major, userProfile?.academicYear, uploadedCvInfo.hasCv, uploadedCvInfo.fileName]);

  // 4. Curated Roadmap Data by Major (100% PTIT Economic Focus, Dynamic per Major)
  const currentMajor = (userProfile?.major || '').toLowerCase();

  const baseMilestonesData = useMemo<RoadmapMilestoneData[]>(() => {
    const isQtkd = currentMajor.includes('quản trị kinh doanh') || currentMajor.includes('qtkd');
    const isEcom = currentMajor.includes('thương mại điện tử') || currentMajor.includes('tmđt') || currentMajor.includes('e-commerce');
    const isKeToan = currentMajor.includes('kế toán') || currentMajor.includes('kiểm toán');
    const isFintech = currentMajor.includes('fintech') || currentMajor.includes('công nghệ tài chính') || currentMajor.includes('tài chính');
    const isLogistics = currentMajor.includes('logistics') || currentMajor.includes('chuỗi cung ứng');
    const isPr = currentMajor.includes('quan hệ công chúng') || currentMajor.includes('pr');
    const isMkt = currentMajor.includes('marketing') || (!isQtkd && !isEcom && !isKeToan && !isFintech && !isLogistics && !isPr);

    const gapSkillNames = aiGapData?.gapSkills || aiGapData?.missingSkills || [];

    let m1: RoadmapMilestoneData;
    let m2: RoadmapMilestoneData;
    let m3: RoadmapMilestoneData;

    if (isQtkd) {
      // 1. Quản trị kinh doanh & Kinh doanh số
      m1 = {
        milestoneNumber: 1,
        milestoneTitle: 'Cột mốc 1: Khởi động & Nhập môn',
        milestoneSubtitle: 'Nghiên cứu thị trường đối thủ, lập danh sách khách hàng tiềm năng và rèn luyện kỹ năng outreach',
        badgeLabel: 'Entry-Level • CTV / Part-time',
        roleTitle: 'CTV Nghiên cứu thị trường & Hỗ trợ Kinh doanh (Sales Support / Market Research Assistant)',
        roleType: 'Cộng tác viên / Bán thời gian',
        roleDescription: 'Phụ trách thu thập dữ liệu giá và sản phẩm 20 đối thủ cạnh tranh, lọc danh sách khách hàng mục tiêu và hỗ trợ soạn kịch bản email chào hàng.',
        practicalTasks: [
          { id: 'qtkd-m1-t1', title: 'Khảo sát và lập bảng đối sánh giá, chính sách chiết khấu của 20 đối thủ cùng phân khúc', deadline: 'Hạn: 2 tuần', priority: 'medium' },
          { id: 'qtkd-m1-t2', title: 'Thu thập và làm sạch danh sách 50 khách hàng doanh nghiệp B2B tiềm năng trên Google Sheets', deadline: 'Hạn: 3 tuần', priority: 'high' },
          { id: 'qtkd-m1-t3', title: 'Soạn thảo kịch bản email chào hàng (Cold Email Outreach) và kịch bản gọi điện cơ bản', deadline: 'Hạn: 1 tháng', priority: 'normal' },
        ],
        requiredSkills: [
          { name: 'Nghiên cứu thị trường (Desk Research)', isCore: true },
          { name: 'Kỹ năng Cold Calling & Email B2B', isCore: true },
          { name: 'Google Sheets & Phân loại dữ liệu', isCore: true },
          { name: 'Giao tiếp kinh doanh cơ bản', isCore: false },
        ],
        recommendedEventIds: ['event-1', 'event-2'],
      };

      m2 = {
        milestoneNumber: 2,
        milestoneTitle: 'Cột mốc 2: Tích lũy Chuyên môn',
        milestoneSubtitle: 'Vận hành phễu bán hàng B2B, quản lý quan hệ khách hàng trên phần mềm CRM và đàm phán giải pháp',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: 'Thực tập sinh Phát triển Kinh doanh (Business Development Intern / BD Intern)',
        roleType: 'Thực tập sinh chính thức',
        roleDescription: 'Trực tiếp liên hệ tư vấn đối tác B2B, quản lý pipeline cơ hội trên CRM Hubspot và tham gia đàm phán giải pháp thương mại.',
        practicalTasks: [
          { id: 'qtkd-m2-t1', title: 'Liên hệ tư vấn và chốt lịch hẹn trao đổi với 10 đối tác doanh nghiệp B2B tiềm năng', deadline: 'Hạn: 1 tháng', priority: 'high' },
          { id: 'qtkd-m2-t2', title: 'Quản lý toàn bộ vòng đời deal và phễu khách hàng trên hệ thống CRM (Hubspot / Salesforce)', deadline: 'Hạn: 6 tuần', priority: 'high' },
          { id: 'qtkd-m2-t3', title: 'Xây dựng bản đề xuất hợp tác (Proposal) và tham gia vòng đàm phán hợp đồng thương mại mẫu', deadline: 'Hạn: 2 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Quản lý CRM (Hubspot / Salesforce)', isCore: true },
          { name: 'Kỹ năng đàm phán B2B & SPIN Selling', isCore: true },
          { name: 'Xây dựng Proposal giải pháp', isCore: true },
          { name: 'Phân tích phễu chuyển đổi Sales Funnel', isCore: false },
        ],
        recommendedEventIds: ['event-2', 'event-5'],
      };

      m3 = {
        milestoneNumber: 3,
        milestoneTitle: 'Cột mốc 3: Thực chiến & Bứt phá',
        milestoneSubtitle: 'Làm chủ chỉ tiêu doanh số cá nhân, phụ trách tài khoản doanh nghiệp lớn và phân tích quy trình kinh doanh',
        badgeLabel: 'Junior / Official • Chuyên viên thực chiến',
        roleTitle: 'Chuyên viên Kinh doanh B2B / Phân tích Kinh doanh (Junior Sales B2B / Business Analyst)',
        roleType: 'Chuyên viên chính thức / Fresher',
        roleDescription: 'Độc lập thương thảo hợp đồng kinh tế lớn, chịu KPI doanh số hoặc tối ưu hóa quy trình nghiệp vụ số cho doanh nghiệp.',
        practicalTasks: [
          { id: 'qtkd-m3-t1', title: 'Đàm phán và chốt ký thành công 3 hợp đồng khung doanh nghiệp giá trị trên 50 triệu VNĐ', deadline: 'Hạn: 3 tháng', priority: 'high' },
          { id: 'qtkd-m3-t2', title: 'Xây dựng quy trình chuẩn hóa SLA dịch vụ khách hàng và chăm sóc tài khoản trọng yếu (KAM)', deadline: 'Hạn: 4 tháng', priority: 'medium' },
          { id: 'qtkd-m3-t3', title: 'Sử dụng Power BI / Excel phân tích cơ cấu doanh thu và đề xuất chiến lược giá mới', deadline: 'Hạn: 5 tháng', priority: 'high' },
        ],
        requiredSkills: [
          { name: 'Đàm phán hợp đồng cấp cao', isCore: true },
          { name: 'Quản lý tài khoản trọng yếu (Key Account Management)', isCore: true },
          { name: 'Phân tích nghiệp vụ (Business Analysis)', isCore: true },
          { name: 'Trực quan hóa số liệu Power BI', isCore: false },
        ],
        recommendedEventIds: ['event-2', 'event-4'],
      };
    } else if (isEcom) {
      // 2. Thương mại điện tử
      m1 = {
        milestoneNumber: 1,
        milestoneTitle: 'Cột mốc 1: Khởi động & Nhập môn',
        milestoneSubtitle: 'Nắm vững quy trình quản trị gian hàng sàn TMĐT, tối ưu hình ảnh sản phẩm và chăm sóc khách hàng',
        badgeLabel: 'Entry-Level • CTV / Part-time',
        roleTitle: 'CTV Vận hành Gian hàng Sàn TMĐT (E-commerce Operations Assistant)',
        roleType: 'Cộng tác viên / Bán thời gian',
        roleDescription: 'Phụ trách đăng tải 20 sản phẩm chuẩn SEO Shopee/TikTok Shop, trang trí gian hàng và xử lý tin nhắn phản hồi khách hàng.',
        practicalTasks: [
          { id: 'ecom-m1-t1', title: 'Đăng tải và chuẩn hóa 20 bài đăng sản phẩm đạt chuẩn SEO Shopee, Lazada và TikTok Shop', deadline: 'Hạn: 2 tuần', priority: 'high' },
          { id: 'ecom-m1-t2', title: 'Thiết kế bộ banner trang trí trang chủ gian hàng bắt mắt trên Canva theo tỷ lệ chuẩn sàn', deadline: 'Hạn: 3 tuần', priority: 'medium' },
          { id: 'ecom-m1-t3', title: 'Trực chat, xử lý đánh giá 1 sao và cải thiện tỷ lệ phản hồi tin nhắn khách hàng trên 90%', deadline: 'Hạn: 1 tháng', priority: 'normal' },
        ],
        requiredSkills: [
          { name: 'Quản trị gian hàng Shopee / TikTok Shop', isCore: true },
          { name: 'SEO từ khóa tiêu đề sản phẩm sàn', isCore: true },
          { name: 'Thiết kế đồ họa Canva cơ bản', isCore: true },
          { name: 'Chăm sóc khách hàng Shopee Chat', isCore: false },
        ],
        recommendedEventIds: ['event-5', 'event-1'],
      };

      m2 = {
        milestoneNumber: 2,
        milestoneTitle: 'Cột mốc 2: Tích lũy Chuyên môn',
        milestoneSubtitle: 'Triển khai quảng cáo nội sàn Shopee Ads / TikTok Ads, tham gia vận hành Mega Campaign và đo lường ROI',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: 'Thực tập sinh Vận hành & Tăng trưởng Sàn (E-commerce Growth Intern)',
        roleType: 'Thực tập sinh chính thức',
        roleDescription: 'Thiết lập chiến dịch đấu thầu từ khóa Shopee Ads ngân sách 5-10 triệu, tối ưu chi phí quảng cáo CIR và lên lịch Flash Sale.',
        practicalTasks: [
          { id: 'ecom-m2-t1', title: 'Cài đặt và tối ưu chiến dịch Shopee Ads / TikTok Shop Ads ngân sách 5 triệu đạt CIR < 12%', deadline: 'Hạn: 1 tháng', priority: 'high' },
          { id: 'ecom-m2-t2', title: 'Lập kế hoạch tồn kho và đăng ký sản phẩm tham gia Siêu Sale Mega Day (9.9, 11.11, 12.12)', deadline: 'Hạn: 6 tuần', priority: 'high' },
          { id: 'ecom-m2-t3', title: 'Phân tích báo cáo chỉ số kinh doanh Phân tích Bán hàng (Shop Analytics) để tăng tỷ lệ chuyển đổi CRO', deadline: 'Hạn: 2 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Vận hành Shopee Ads & TikTok Ads', isCore: true },
          { name: 'Phân tích số liệu sàn (Shop Analytics)', isCore: true },
          { name: 'Quản lý khuyến mãi Flash Sale & Voucher', isCore: true },
          { name: 'Tối ưu hóa tỷ lệ chuyển đổi CRO sàn', isCore: false },
        ],
        recommendedEventIds: ['event-5', 'event-2'],
      };

      m3 = {
        milestoneNumber: 3,
        milestoneTitle: 'Cột mốc 3: Thực chiến & Bứt phá',
        milestoneSubtitle: 'Làm chủ doanh số gian hàng Shopee Mall / TikTok Shop, quản trị mạng lưới Affiliate KOC và tối ưu D2C',
        badgeLabel: 'Junior / Official • Chuyên viên thực chiến',
        roleTitle: 'Chuyên viên Vận hành Sàn TMĐT & D2C (E-commerce Executive / Store Manager)',
        roleType: 'Chuyên viên chính thức / Fresher',
        roleDescription: 'Chịu trách nhiệm doanh thu gian hàng 100+ triệu/tháng, điều phối phiên Livestream bán hàng và tối ưu chuỗi cung ứng fulfillment.',
        practicalTasks: [
          { id: 'ecom-m3-t1', title: 'Xây dựng kế hoạch doanh số và quản lý ngân sách Marketing sàn 30-50 triệu/tháng đạt KPI ROI', deadline: 'Hạn: 3 tháng', priority: 'high' },
          { id: 'ecom-m3-t2', title: 'Điều phối vận hành 4 phiên Livestream bán hàng Mega Sale và quản lý mạng lưới 20 KOC Affiliate', deadline: 'Hạn: 4 tháng', priority: 'high' },
          { id: 'ecom-m3-t3', title: 'Tối ưu hóa quy trình đóng gói, đối soát cước vận chuyển và giảm tỷ lệ hoàn hủy hàng dưới 3%', deadline: 'Hạn: 5 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Chiến lược TMĐT Đa kênh (Omnichannel E-commerce)', isCore: true },
          { name: 'Quản trị chi phí & Tối ưu ROI sàn', isCore: true },
          { name: 'Vận hành Livestream & Mạng lưới KOC', isCore: true },
          { name: 'Fulfillment & Logistics chặng cuối', isCore: false },
        ],
        recommendedEventIds: ['event-5', 'event-3'],
      };
    } else if (isKeToan) {
      // 3. Kế toán & Kiểm toán
      m1 = {
        milestoneNumber: 1,
        milestoneTitle: 'Cột mốc 1: Khởi động & Nhập môn',
        milestoneSubtitle: 'Làm quen với chứng từ hóa đơn GTGT, kiểm tra tính hợp lệ và sắp xếp sổ sách kế toán ban đầu',
        badgeLabel: 'Entry-Level • CTV / Part-time',
        roleTitle: 'CTV Nhập liệu & Hỗ trợ Kế toán (Accounting Assistant)',
        roleType: 'Cộng tác viên / Bán thời gian',
        roleDescription: 'Phụ trách rà soát hóa đơn điện tử GTGT theo Thông tư 78, nhập liệu nhật ký chung Excel và đối chiếu công nợ khách hàng.',
        practicalTasks: [
          { id: 'kt-m1-t1', title: 'Rà soát và đối chiếu 50 hóa đơn điện tử GTGT hợp lệ theo Thông tư 78 trên trang Thuế', deadline: 'Hạn: 2 tuần', priority: 'high' },
          { id: 'kt-m1-t2', title: 'Lập bảng tính Excel theo dõi công nợ phải thu / phải trả bằng Pivot Table và VLOOKUP', deadline: 'Hạn: 3 tuần', priority: 'high' },
          { id: 'kt-m1-t3', title: 'Thực hành nhập liệu chứng từ thu/chi và phiếu nhập/xuất kho vào phần mềm kế toán MISA SME', deadline: 'Hạn: 1 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Nguyên lý kế toán & Hệ thống tài khoản', isCore: true },
          { name: 'Excel kế toán (VLOOKUP, SUMIFS, Pivot)', isCore: true },
          { name: 'Kiểm tra hóa đơn điện tử hợp lệ', isCore: true },
          { name: 'Đạo đức nghề nghiệp kế toán', isCore: false },
        ],
        recommendedEventIds: ['event-1', 'event-4'],
      };

      m2 = {
        milestoneNumber: 2,
        milestoneTitle: 'Cột mốc 2: Tích lũy Chuyên môn',
        milestoneSubtitle: 'Hạch toán phân hệ nghiệp vụ phần mềm MISA, lập tờ khai thuế GTGT và hỗ trợ lập Báo cáo tài chính',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: 'Thực tập sinh Kế toán Tổng hợp (General Accounting Intern)',
        roleType: 'Thực tập sinh chính thức',
        roleDescription: 'Vận hành hạch toán tiền lương, kho, mua bán hàng trên phần mềm MISA SME, kê khai thuế định kỳ và đối soát số dư.',
        practicalTasks: [
          { id: 'kt-m2-t1', title: 'Thực hiện hạch toán nghiệp vụ mua hàng, bán hàng và tính lương trên phần mềm MISA / Fast', deadline: 'Hạn: 1 tháng', priority: 'high' },
          { id: 'kt-m2-t2', title: 'Lập bảng kê mua vào, bán ra và kết xuất tờ khai thuế GTGT quý theo mẫu HTKK', deadline: 'Hạn: 6 tuần', priority: 'high' },
          { id: 'kt-m2-t3', title: 'Tham gia kiểm kê tài sản cố định, đối chiếu sổ phụ ngân hàng và rà soát số dư sổ cái', deadline: 'Hạn: 2 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Phần mềm kế toán MISA / Fast', isCore: true },
          { name: 'Kê khai thuế điện tử HTKK', isCore: true },
          { name: 'Kế toán quản trị chi phí & giá thành', isCore: true },
          { name: 'Phân tích bảng Cân đối kế toán', isCore: false },
        ],
        recommendedEventIds: ['event-4', 'event-2'],
      };

      m3 = {
        milestoneNumber: 3,
        milestoneTitle: 'Cột mốc 3: Thực chiến & Bứt phá',
        milestoneSubtitle: 'Lập trọn bộ Báo cáo tài chính năm, quyết toán thuế doanh nghiệp và trực quan hóa dòng tiền',
        badgeLabel: 'Junior / Official • Chuyên viên thực chiến',
        roleTitle: 'Chuyên viên Kế toán - Thuế (Junior Accountant / Audit Associate)',
        roleType: 'Chuyên viên chính thức / Fresher',
        roleDescription: 'Độc lập lập BCTC năm, phối hợp với cơ quan thuế và kiểm toán độc lập, tư vấn tối ưu chi phí thuế hợp pháp.',
        practicalTasks: [
          { id: 'kt-m3-t1', title: 'Lập trọn bộ Báo cáo tài chính gồm Bảng CĐKT, BCKQHĐKD, Báo cáo Lưu chuyển tiền tệ và Thuyết minh', deadline: 'Hạn: 3 tháng', priority: 'high' },
          { id: 'kt-m3-t2', title: 'Chuẩn bị hồ sơ quyết toán thuế TNDN và TNCN phục vụ thanh tra thuế', deadline: 'Hạn: 4 tháng', priority: 'high' },
          { id: 'kt-m3-t3', title: 'Sử dụng Power BI / Excel nâng cao xây dựng Dashboard dự báo dòng tiền 6 tháng', deadline: 'Hạn: 5 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Chuẩn mực kế toán VAS & IFRS', isCore: true },
          { name: 'Quyết toán thuế TNDN chuyên sâu', isCore: true },
          { name: 'Phân tích tài chính & Dự báo dòng tiền', isCore: true },
          { name: 'Trực quan hóa số liệu Power BI', isCore: false },
        ],
        recommendedEventIds: ['event-4', 'event-2'],
      };
    } else if (isFintech) {
      // 4. Công nghệ tài chính (Fintech)
      m1 = {
        milestoneNumber: 1,
        milestoneTitle: 'Cột mốc 1: Khởi động & Nhập môn',
        milestoneSubtitle: 'Nghiên cứu thị trường thanh toán số, khảo sát giải pháp Fintech và phân tích trải nghiệm ứng dụng tài chính',
        badgeLabel: 'Entry-Level • CTV / Part-time',
        roleTitle: 'CTV Nghiên cứu Sản phẩm & Thanh toán số (Fintech Research Assistant)',
        roleType: 'Cộng tác viên / Bán thời gian',
        roleDescription: 'Phụ trách khảo sát 15 ứng dụng ví điện tử & ngân hàng số, thu thập số liệu giao dịch tài chính mẫu và đánh giá tính năng KYC.',
        practicalTasks: [
          { id: 'ft-m1-t1', title: 'Khảo sát và lập báo cáo đối sánh tính năng của 10 ứng dụng ví điện tử và ngân hàng số hàng đầu', deadline: 'Hạn: 2 tuần', priority: 'high' },
          { id: 'ft-m1-t2', title: 'Phân tích luồng trải nghiệm người dùng (UX flow) của tính năng mở tài khoản eKYC và chuyển tiền', deadline: 'Hạn: 3 tuần', priority: 'medium' },
          { id: 'ft-m1-t3', title: 'Thu thập và làm sạch bộ dữ liệu giao dịch mẫu 500 dòng bằng Excel để phân tích xu hướng', deadline: 'Hạn: 1 tháng', priority: 'normal' },
        ],
        requiredSkills: [
          { name: 'Tổng quan thị trường Fintech & Ngân hàng số', isCore: true },
          { name: 'Phân tích dữ liệu giao dịch với Excel', isCore: true },
          { name: 'Hiểu biết về cổng thanh toán & eKYC', isCore: true },
          { name: 'Tư duy thiết kế sản phẩm tài chính', isCore: false },
        ],
        recommendedEventIds: ['event-4', 'event-2'],
      };

      m2 = {
        milestoneNumber: 2,
        milestoneTitle: 'Cột mốc 2: Tích lũy Chuyên môn',
        milestoneSubtitle: 'Truy vấn số liệu giao dịch bằng SQL, xây dựng mô hình rủi ro tín dụng và phân tích luồng đối soát tự động',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: 'Thực tập sinh Phân tích Dữ liệu Tài chính (Fintech / Financial Data Intern)',
        roleType: 'Thực tập sinh chính thức',
        roleDescription: 'Sử dụng SQL trích xuất dữ liệu giao dịch lớn, xây dựng mô hình tính điểm tín dụng (Credit Scoring) và theo dõi gian lận thanh toán.',
        practicalTasks: [
          { id: 'ft-m2-t1', title: 'Viết câu lệnh SQL truy vấn và đối soát số liệu 10.000 giao dịch thanh toán trực tuyến', deadline: 'Hạn: 1 tháng', priority: 'high' },
          { id: 'ft-m2-t2', title: 'Xây dựng mô hình tính điểm tín dụng (Credit Scoring) cơ bản dự báo xác suất nợ xấu', deadline: 'Hạn: 6 tuần', priority: 'high' },
          { id: 'ft-m2-t3', title: 'Thiết kế tài liệu đặc tả yêu cầu nghiệp vụ (BRD) cho tính năng tích hợp cổng thanh toán mới', deadline: 'Hạn: 2 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'SQL for Financial Data Analysis', isCore: true },
          { name: 'Mô hình Credit Scoring & Quản trị rủi ro', isCore: true },
          { name: 'Quy trình đối soát liên ngân hàng', isCore: true },
          { name: 'Viết tài liệu nghiệp vụ BRD / User Story', isCore: false },
        ],
        recommendedEventIds: ['event-4', 'event-2'],
      };

      m3 = {
        milestoneNumber: 3,
        milestoneTitle: 'Cột mốc 3: Thực chiến & Bứt phá',
        milestoneSubtitle: 'Làm chủ sản phẩm tài chính số, thiết kế giải pháp Open Banking API và bảo đảm tỷ lệ an toàn thanh toán',
        badgeLabel: 'Junior / Official • Chuyên viên thực chiến',
        roleTitle: 'Chuyên viên Phân tích Tài chính & Sản phẩm Fintech (Junior Financial Analyst / Product Associate)',
        roleType: 'Chuyên viên chính thức / Fresher',
        roleDescription: 'Phân tích danh mục đầu tư tài chính, thiết kế giải pháp Open Banking/API và tối ưu hóa tỷ lệ chuyển đổi thanh toán số.',
        practicalTasks: [
          { id: 'ft-m3-t1', title: 'Xây dựng Dashboard trực quan hóa rủi ro thanh toán và chỉ số GMV liên tục trên Power BI', deadline: 'Hạn: 3 tháng', priority: 'high' },
          { id: 'ft-m3-t2', title: 'Thiết kế giải pháp thanh toán tự động (Auto-debit / Recurring) phối hợp với đối tác cổng thanh toán', deadline: 'Hạn: 4 tháng', priority: 'high' },
          { id: 'ft-m3-t3', title: 'Phân tích chi phí vốn, định giá sản phẩm cho vay vi mô (Microfinance) và dự báo doanh thu', deadline: 'Hạn: 5 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Mô hình tài chính & Định giá sản phẩm', isCore: true },
          { name: 'Power BI & Trực quan hóa số liệu tài chính', isCore: true },
          { name: 'Open Banking API & An toàn thanh toán', isCore: true },
          { name: 'Quản trị rủi ro thanh khoản', isCore: false },
        ],
        recommendedEventIds: ['event-4', 'event-2'],
      };
    } else if (isLogistics) {
      // 5. Logistics & Quản trị chuỗi cung ứng
      m1 = {
        milestoneNumber: 1,
        milestoneTitle: 'Cột mốc 1: Khởi động & Nhập môn',
        milestoneSubtitle: 'Làm quen với quy trình quản lý kho vận, rà soát chứng từ giao nhận và theo dõi trạng thái đơn hàng',
        badgeLabel: 'Entry-Level • CTV / Part-time',
        roleTitle: 'CTV Kho vận & Điều phối Đơn hàng (Logistics & Warehouse Assistant)',
        roleType: 'Cộng tác viên / Bán thời gian',
        roleDescription: 'Phụ trách kiểm kê 100 SKU hàng hóa tại kho, rà soát phiếu xuất nhập kho và hỗ trợ xử lý chứng từ vận tải nội địa.',
        practicalTasks: [
          { id: 'log-m1-t1', title: 'Kiểm kê định kỳ 100 SKU hàng hóa trong kho và đối chiếu số lượng với thẻ kho', deadline: 'Hạn: 2 tuần', priority: 'medium' },
          { id: 'log-m1-t2', title: 'Rà soát tính hợp lệ của bộ chứng từ giao nhận hàng hóa (Biên bản bàn giao, Phiếu xuất kho)', deadline: 'Hạn: 3 tuần', priority: 'high' },
          { id: 'log-m1-t3', title: 'Thực hành theo dõi trạng thái đơn hàng và xử lý sự cố chậm trễ giao hàng trên bảng tính Excel', deadline: 'Hạn: 1 tháng', priority: 'normal' },
        ],
        requiredSkills: [
          { name: 'Quy trình quản lý kho bãi cơ bản (WMS)', isCore: true },
          { name: 'Chứng từ vận tải hàng hóa nội địa', isCore: true },
          { name: 'Excel theo dõi tồn kho & điều phối', isCore: true },
          { name: 'Kỹ năng cẩn trọng & giải quyết sự cố', isCore: false },
        ],
        recommendedEventIds: ['event-5', 'event-1'],
      };

      m2 = {
        milestoneNumber: 2,
        milestoneTitle: 'Cột mốc 2: Tích lũy Chuyên môn',
        milestoneSubtitle: 'Vận hành chuỗi cung ứng, điều phối đối tác vận chuyển 3PL, làm thủ tục hải quan và theo dõi chỉ số OTIF',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: 'Thực tập sinh Vận hành & Chuỗi cung ứng (Logistics & Supply Chain Intern)',
        roleType: 'Thực tập sinh chính thức',
        roleDescription: 'Điều phối luồng vận chuyển 50 đơn hàng/ngày, đàm phán cước phí với đơn vị 3PL và xử lý chứng từ xuất nhập khẩu (Bill of Lading, Invoice, Packing List).',
        practicalTasks: [
          { id: 'log-m2-t1', title: 'Điều phối lịch giao hàng cho 50 chuyến xe/ngày và đo lường chỉ số giao hàng đúng hạn (OTIF)', deadline: 'Hạn: 1 tháng', priority: 'high' },
          { id: 'log-m2-t2', title: 'Kiểm tra và chuẩn bị bộ chứng từ xuất nhập khẩu hàng hóa: B/L, Commercial Invoice, Packing List', deadline: 'Hạn: 6 tuần', priority: 'high' },
          { id: 'log-m2-t3', title: 'Ứng dụng hệ thống ERP / WMS để tối ưu hóa vị trí lưu kho và giảm thời gian bốc dỡ hàng', deadline: 'Hạn: 2 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Incoterms 2020 & Chứng từ xuất nhập khẩu', isCore: true },
          { name: 'Vận hành hệ thống ERP / WMS kho vận', isCore: true },
          { name: 'Quản lý đối tác vận tải 3PL', isCore: true },
          { name: 'Kỹ năng thương lượng chi phí cước', isCore: false },
        ],
        recommendedEventIds: ['event-5', 'event-2'],
      };

      m3 = {
        milestoneNumber: 3,
        milestoneTitle: 'Cột mốc 3: Thực chiến & Bứt phá',
        milestoneSubtitle: 'Tối ưu hóa mạng lưới chuỗi cung ứng toàn diện, đàm phán hợp đồng vận tải quốc tế và áp dụng Lean Logistics',
        badgeLabel: 'Junior / Official • Chuyên viên thực chiến',
        roleTitle: 'Chuyên viên Quản trị Chuỗi cung ứng (Supply Chain Specialist / Forwarder Executive)',
        roleType: 'Chuyên viên chính thức / Fresher',
        roleDescription: 'Chịu trách nhiệm tối ưu chi phí logistics tổng thể 5-8%, đàm phán giá cước với hãng tàu quốc tế và thiết kế mạng lưới phân phối tinh gọn.',
        practicalTasks: [
          { id: 'log-m3-t1', title: 'Phân tích chi phí logistics toàn chuỗi và triển khai giải pháp Lean giảm 8% chi phí kho vận', deadline: 'Hạn: 3 tháng', priority: 'high' },
          { id: 'log-m3-t2', title: 'Đàm phán và ký kết hợp đồng cước vận tải biển/hàng không với 3 hãng tàu quốc tế lớn', deadline: 'Hạn: 4 tháng', priority: 'high' },
          { id: 'log-m3-t3', title: 'Xây dựng Dashboard theo dõi chỉ số hiệu suất chuỗi cung ứng (Inventory Turnover, Lead Time) trên Power BI', deadline: 'Hạn: 5 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Chiến lược Chuỗi cung ứng tinh gọn (Lean Logistics)', isCore: true },
          { name: 'Đàm phán hợp đồng vận chuyển quốc tế', isCore: true },
          { name: 'Hệ thống SAP ERP / Oracle SCM', isCore: true },
          { name: 'Quản trị rủi ro đứt gãy chuỗi cung ứng', isCore: false },
        ],
        recommendedEventIds: ['event-5', 'event-2'],
      };
    } else if (isPr) {
      // 6. Quan hệ công chúng (PR)
      m1 = {
        milestoneNumber: 1,
        milestoneTitle: 'Cột mốc 1: Khởi động & Nhập môn',
        milestoneSubtitle: 'Nắm vững kỹ năng soạn thảo thông cáo báo chí, quan hệ cơ quan truyền thông và theo dõi dư luận mạng xã hội',
        badgeLabel: 'Entry-Level • CTV / Part-time',
        roleTitle: 'CTV Quan hệ Báo chí & Nội dung Truyền thông (PR & Media Assistant)',
        roleType: 'Cộng tác viên / Bán thời gian',
        roleDescription: 'Phụ trách soạn thảo thông cáo báo chí (Press Release), xây dựng danh sách liên hệ phóng viên/nhà báo và theo dõi tin tức về thương hiệu.',
        practicalTasks: [
          { id: 'pr-m1-t1', title: 'Soạn thảo 02 bài thông cáo báo chí (Press Release) theo chuẩn cấu trúc 5W1H và kim tự tháp ngược', deadline: 'Hạn: 2 tuần', priority: 'high' },
          { id: 'pr-m1-t2', title: 'Lập Media List danh sách 30 phóng viên/tòa soạn uy tín phụ trách mảng kinh tế, công nghệ và tiêu dùng', deadline: 'Hạn: 3 tuần', priority: 'medium' },
          { id: 'pr-m1-t3', title: 'Thực hiện báo cáo Social Listening theo dõi sắc thái thảo luận (Sentiment Analysis) của thương hiệu trong 1 tháng', deadline: 'Hạn: 1 tháng', priority: 'normal' },
        ],
        requiredSkills: [
          { name: 'Kỹ năng viết Press Release & Biên tập bài PR', isCore: true },
          { name: 'Xây dựng & Quản trị Media List', isCore: true },
          { name: 'Social Listening & Theo dõi sắc thái truyền thông', isCore: true },
          { name: 'Giao tiếp & Ứng xử với cơ quan báo chí', isCore: false },
        ],
        recommendedEventIds: ['event-1', 'event-3'],
      };

      m2 = {
        milestoneNumber: 2,
        milestoneTitle: 'Cột mốc 2: Tích lũy Chuyên môn',
        milestoneSubtitle: 'Lập kế hoạch chiến dịch PR tích hợp, điều phối họp báo và xây dựng mạng lưới KOL/KOC thương hiệu',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: 'Thực tập sinh Quan hệ Công chúng & Thương hiệu (PR & Brand Communications Intern)',
        roleType: 'Thực tập sinh chính thức',
        roleDescription: 'Tham gia điều phối sự kiện họp báo ra mắt sản phẩm, lập kế hoạch booking KOLs/Influencers và chuẩn bị kịch bản Q&A ứng phó khủng hoảng.',
        practicalTasks: [
          { id: 'pr-m2-t1', title: 'Xây dựng kế hoạch tổ chức buổi họp báo / Media Briefing với 15 nhà báo chuyên ngành', deadline: 'Hạn: 1 tháng', priority: 'high' },
          { id: 'pr-m2-t2', title: 'Triển khai chiến dịch hợp tác với 10 KOL/KOC trong ngành, quản lý hợp đồng và nghiệm thu bài đăng', deadline: 'Hạn: 6 tuần', priority: 'high' },
          { id: 'pr-m2-t3', title: 'Soạn bộ tài liệu Q&A và kịch bản ứng phó sự cố truyền thông tiềm ẩn cho chiến dịch mới', deadline: 'Hạn: 2 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Tổ chức sự kiện báo chí & Media Event', isCore: true },
          { name: 'KOL/KOC Management & Booking', isCore: true },
          { name: 'Xây dựng kịch bản phòng ngừa Khủng hoảng truyền thông', isCore: true },
          { name: 'Đo lường chỉ số PR (SOV, Sentiment, PR Value)', isCore: false },
        ],
        recommendedEventIds: ['event-1', 'event-2'],
      };

      m3 = {
        milestoneNumber: 3,
        milestoneTitle: 'Cột mốc 3: Thực chiến & Bứt phá',
        milestoneSubtitle: 'Chiến lược PR thương hiệu toàn diện, xử lý khủng hoảng truyền thông và định vị CSR doanh nghiệp',
        badgeLabel: 'Junior / Official • Chuyên viên thực chiến',
        roleTitle: 'Chuyên viên Quan hệ Công chúng & Đối ngoại (PR & Corporate Communications Specialist)',
        roleType: 'Chuyên viên chính thức / Fresher',
        roleDescription: 'Chịu trách nhiệm bảo vệ và nâng tầm uy tín thương hiệu, điều phối các chiến dịch Trách nhiệm xã hội (CSR) và đại diện phát ngôn truyền thông.',
        practicalTasks: [
          { id: 'pr-m3-t1', title: 'Thiết kế chiến dịch PR đa phương tiện kết hợp CSR tạo tác động xã hội và gia tăng chỉ số cảm tình thương hiệu 20%', deadline: 'Hạn: 3 tháng', priority: 'high' },
          { id: 'pr-m3-t2', title: 'Xây dựng cẩm nang Quản trị Khủng hoảng Truyền thông toàn diện (Crisis Communication Playbook)', deadline: 'Hạn: 4 tháng', priority: 'high' },
          { id: 'pr-m3-t3', title: 'Đo lường hiệu quả ROI chiến dịch PR tổng thể bằng mô hình Barcelona Principles', deadline: 'Hạn: 5 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Chiến lược PR & Định vị Thương hiệu Doanh nghiệp', isCore: true },
          { name: 'Quản trị & Xử lý Khủng hoảng Truyền thông thực chiến', isCore: true },
          { name: 'Truyền thông Trách nhiệm Xã hội (CSR Strategy)', isCore: true },
          { name: 'Quan hệ Chính phủ & Đối tác Chiến lược (PA/GR)', isCore: false },
        ],
        recommendedEventIds: ['event-1', 'event-2'],
      };
    } else {
      // 7. Marketing / Mặc định
      m1 = {
        milestoneNumber: 1,
        milestoneTitle: 'Cột mốc 1: Khởi động & Nhập môn',
        milestoneSubtitle: 'Nắm vững kỹ năng sản xuất nội dung, sáng tạo ấn phẩm và quản trị kênh tương tác',
        badgeLabel: 'Entry-Level • CTV / Part-time',
        roleTitle: 'CTV Sáng tạo Nội dung (Content Creator) & Quản trị Fanpage',
        roleType: 'Cộng tác viên / Bán thời gian',
        roleDescription: 'Phụ trách viết bài chuẩn AIDA, thiết kế ấn phẩm mạng xã hội bằng Canva và dựng clip ngắn CapCut.',
        practicalTasks: [
          { id: 'mkt-m1-t1', title: 'Viết 10-15 bài đăng Fanpage/Website theo công thức AIDA & PAS thu hút tương tác', deadline: 'Hạn: 2 tuần', priority: 'high' },
          { id: 'mkt-m1-t2', title: 'Thiết kế bộ banner truyền thông 5 hình ảnh nhất quán nhận diện trên Canva', deadline: 'Hạn: 3 tuần', priority: 'medium' },
          { id: 'mkt-m1-t3', title: 'Dựng 3 video ngắn (TikTok/Reels) thời lượng 30s bằng CapCut có phụ đề và hiệu ứng bắt trend', deadline: 'Hạn: 1 tháng', priority: 'normal' },
        ],
        requiredSkills: [
          { name: 'Copywriting cơ bản (AIDA/PAS)', isCore: true },
          { name: 'Thiết kế Canva chuyên nghiệp', isCore: true },
          { name: 'Dựng video ngắn CapCut', isCore: true },
          { name: 'Quản trị trang mạng xã hội', isCore: false },
        ],
        recommendedEventIds: ['event-1', 'event-3'],
      };

      m2 = {
        milestoneNumber: 2,
        milestoneTitle: 'Cột mốc 2: Tích lũy Chuyên môn',
        milestoneSubtitle: 'Triển khai chiến dịch quảng cáo thực chiến, đo lường dữ liệu GA4 và tối ưu chuyển đổi',
        badgeLabel: 'Core Execution • Thực tập sinh Intern',
        roleTitle: 'Thực tập sinh Digital Marketing (Digital Marketing Intern)',
        roleType: 'Thực tập sinh chính thức',
        roleDescription: 'Thiết lập chiến dịch quảng cáo đa kênh Meta Ads / Google Ads, đọc số liệu GA4 và tối ưu chuyển đổi bán hàng.',
        practicalTasks: [
          { id: 'mkt-m2-t1', title: 'Cài đặt và vận hành chiến dịch quảng cáo Facebook/Google Ads ngân sách 5-10 triệu VNĐ', deadline: 'Hạn: 1 tháng', priority: 'high' },
          { id: 'mkt-m2-t2', title: 'Phân tích phễu chuyển đổi (CTR, CPC, ROAS) trên Google Analytics 4 (GA4) và Looker Studio', deadline: 'Hạn: 6 tuần', priority: 'high' },
          { id: 'mkt-m2-t3', title: 'Triển khai A/B Testing tiêu đề và hình ảnh để tăng 15% tỷ lệ nhấp chuột vào landing page', deadline: 'Hạn: 2 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Meta Ads Manager & Google Ads', isCore: true },
          { name: 'Google Analytics 4 (GA4)', isCore: true },
          { name: 'Tối ưu hóa chuyển đổi (CRO & A/B Test)', isCore: true },
          { name: 'Vận hành sàn Shopee / TikTok Shop', isCore: false },
        ],
        recommendedEventIds: ['event-3', 'event-2'],
      };

      m3 = {
        milestoneNumber: 3,
        milestoneTitle: 'Cột mốc 3: Thực chiến & Bứt phá',
        milestoneSubtitle: 'Làm chủ chiến lược tiếp thị đa kênh, quản trị ngân sách ROI và tối ưu vòng đời khách hàng',
        badgeLabel: 'Junior / Official • Chuyên viên thực chiến',
        roleTitle: 'Chuyên viên Marketing số (Junior Performance Marketer / Brand Executive)',
        roleType: 'Chuyên viên chính thức / Fresher',
        roleDescription: 'Tự chủ ngân sách quảng cáo 30-50 triệu/tháng, xây dựng chiến lược Omnichannel và bảo đảm KPI tăng trưởng.',
        practicalTasks: [
          { id: 'mkt-m3-t1', title: 'Xây dựng kế hoạch Marketing tổng thể đa kênh quý (Plan Omnichannel) cho sản phẩm mới', deadline: 'Hạn: 3 tháng', priority: 'high' },
          { id: 'mkt-m3-t2', title: 'Vận hành chiến dịch Marketing Automation & Email Drip nuôi dưỡng khách hàng trọn đời (LTV)', deadline: 'Hạn: 4 tháng', priority: 'high' },
          { id: 'mkt-m3-t3', title: 'Thiết kế Dashboard báo cáo ROI toàn diện kết nối trực tiếp dữ liệu Meta Ads + GA4 trên Looker Studio', deadline: 'Hạn: 5 tháng', priority: 'medium' },
        ],
        requiredSkills: [
          { name: 'Chiến lược Marketing đa kênh (Omnichannel)', isCore: true },
          { name: 'Quản trị ngân sách & Tối ưu ROI', isCore: true },
          { name: 'Looker Studio / Power BI Dashboard', isCore: true },
          { name: 'CRM Automation (Hubspot / Mailchimp)', isCore: false },
        ],
        recommendedEventIds: ['event-2', 'event-3'],
      };
    }

    // Apply Gap Skill highlights in Milestone 2 & 3 if in State B
    if (gapSkillNames.length > 0) {
      gapSkillNames.forEach((gapName) => {
        const existsInM2 = m2.requiredSkills.some((s) => s.name.toLowerCase().includes(gapName.toLowerCase()));
        if (!existsInM2) {
          m2.requiredSkills.unshift({ name: gapName, isCore: true, isGapSkill: true });
        } else {
          m2.requiredSkills = m2.requiredSkills.map((s) =>
            s.name.toLowerCase().includes(gapName.toLowerCase()) ? { ...s, isGapSkill: true } : s
          );
        }
      });
    }

    // If Gemini suggested custom tasks for target job, inject them into Milestone 2
    if (aiGapData?.customTasks && aiGapData.customTasks.length > 0) {
      aiGapData.customTasks.forEach((aiTask, idx) => {
        const generatedId = `gemini-jd-task-${idx}`;
        if (!m2.practicalTasks.some((t) => t.id === generatedId)) {
          m2.practicalTasks.unshift({
            id: generatedId,
            title: cleanTaskTitle(aiTask.title),
            description: aiTask.description,
            deadline: aiTask.deadline || 'Trong 2 tuần',
            priority: aiTask.priority || 'high',
          });
        }
      });
    }

    return [m1, m2, m3];
  }, [currentMajor, aiGapData?.gapSkills, aiGapData?.missingSkills, aiGapData?.customTasks]);

  // Merge base milestone data (or AI alternate generated milestones) with user's customized overrides
  const milestonesData = useMemo<RoadmapMilestoneData[]>(() => {
    const sourceMilestones = (aiGeneratedMilestones && aiGeneratedMilestones.length === 3)
      ? aiGeneratedMilestones
      : baseMilestonesData;

    return sourceMilestones.map((m) => {
      const override = milestoneOverrides[m.milestoneNumber];
      if (!override) return m;
      return {
        ...m,
        ...override,
      };
    });
  }, [baseMilestonesData, aiGeneratedMilestones, milestoneOverrides]);

  const activeMilestoneData = useMemo(() => {
    return milestonesData.find((m) => m.milestoneNumber === activeMilestone) || milestonesData[0];
  }, [milestonesData, activeMilestone]);

  // Combine standard milestone tasks (filtered of deleted tasks, merged with edits) with user's custom tasks
  const combinedTasksForActiveMilestone = useMemo<PracticalTask[]>(() => {
    // 1. User custom tasks for this milestone
    const userCustomForThisMilestone = customTasks
      .filter((t) => (t.milestoneNumber || 2) === activeMilestone)
      .map((t) => ({ ...t, title: cleanTaskTitle(t.title) }));

    // 2. Base tasks not deleted, with any user edits applied
    const baseTasks = activeMilestoneData.practicalTasks
      .filter((t) => !deletedTaskIds.includes(t.id))
      .map((t) => {
        const edit = editedTasksMap[t.id];
        const merged = edit ? { ...t, ...edit } : t;
        return {
          ...merged,
          title: cleanTaskTitle(merged.title),
        };
      });

    return [...userCustomForThisMilestone, ...baseTasks];
  }, [customTasks, activeMilestone, activeMilestoneData.practicalTasks, deletedTaskIds, editedTasksMap]);

  // Modal State for adding custom activity
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskDescription, setCustomTaskDescription] = useState('');
  const [customTaskDeadline, setCustomTaskDeadline] = useState('Hạn: 2 tuần');
  const [customTaskMilestone, setCustomTaskMilestone] = useState<number>(activeMilestone);
  const [customTaskPriority, setCustomTaskPriority] = useState<'high' | 'medium' | 'normal'>('high');
  const [syncToMyTasks, setSyncToMyTasks] = useState(true);

  const handleOpenAddCustomModal = () => {
    if (!isUserLoggedIn) {
      if (onRequireLogin) {
        onRequireLogin('Vui lòng đăng nhập để thêm hoạt động cá nhân vào lộ trình');
      } else {
        showToast('⚠️ Vui lòng đăng nhập để thêm hoạt động cá nhân');
      }
      return;
    }
    setCustomTaskMilestone(activeMilestone);
    setCustomTaskTitle('');
    setCustomTaskDescription('');
    setCustomTaskDeadline('Hạn: 2 tuần');
    setCustomTaskPriority('high');
    setSyncToMyTasks(true);
    setIsAddCustomModalOpen(true);
  };

  const handleSaveCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserLoggedIn) {
      if (onRequireLogin) {
        onRequireLogin('Vui lòng đăng nhập để thêm hoạt động cá nhân vào lộ trình');
      } else {
        showToast('⚠️ Vui lòng đăng nhập để lưu hoạt động');
      }
      setIsAddCustomModalOpen(false);
      return;
    }
    if (!customTaskTitle.trim()) return;

    const newTask: PracticalTask = {
      id: `custom-task-${Date.now()}`,
      title: customTaskTitle.trim(),
      description: customTaskDescription.trim() || `Hoạt động cá nhân tại Cột mốc ${customTaskMilestone}`,
      deadline: customTaskDeadline.trim() || 'Tự do',
      isCompleted: false,
      priority: customTaskPriority,
      isCustom: true,
      milestoneNumber: customTaskMilestone,
    };

    const updated = [newTask, ...customTasks];
    setCustomTasks(updated);
    try {
      localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(updated));
    } catch {}

    // Optionally sync to My Tasks immediately
    if (syncToMyTasks) {
      try {
        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        const existing = stored ? JSON.parse(stored) : [];
        const taskForMyTasks = {
          id: `task-roadmap-${newTask.id}-${Date.now()}`,
          title: newTask.title,
          description: newTask.description,
          category: 'roadmap' as const,
          priority: newTask.priority,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          completed: false,
          linkedView: 'roadmap' as ScreenView,
          actionText: 'Xem Career Map',
        };
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([taskForMyTasks, ...existing]));
      } catch {}
    }

    setIsAddCustomModalOpen(false);
    showToast(`Đã thêm hoạt động cá nhân vào Cột mốc ${customTaskMilestone}!`);

    try {
      confetti({ particleCount: 25, spread: 55, origin: { y: 0.7 } });
    } catch {}
  };

  // Modal State for Editing ANY Task (Standard or Custom)
  const [editingTask, setEditingTask] = useState<PracticalTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDeadline, setEditTaskDeadline] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'high' | 'medium' | 'normal'>('high');

  const handleOpenEditTaskModal = (task: PracticalTask) => {
    setEditingTask(task);
    setEditTaskTitle(cleanTaskTitle(task.title));
    setEditTaskDescription(task.description || '');
    setEditTaskDeadline(task.deadline || 'Hạn: 2 tuần');
    setEditTaskPriority(task.priority || 'medium');
  };

  const handleSaveEditedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;

    if (editingTask.isCustom) {
      const updated = customTasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: editTaskTitle.trim(),
              description: editTaskDescription.trim(),
              deadline: editTaskDeadline.trim(),
              priority: editTaskPriority,
            }
          : t
      );
      setCustomTasks(updated);
      try {
        localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(updated));
      } catch {}
    } else {
      const updatedMap = {
        ...editedTasksMap,
        [editingTask.id]: {
          title: editTaskTitle.trim(),
          description: editTaskDescription.trim(),
          deadline: editTaskDeadline.trim(),
          priority: editTaskPriority,
        },
      };
      setEditedTasksMap(updatedMap);
      try {
        localStorage.setItem('ptit_edited_tasks_map_v1', JSON.stringify(updatedMap));
      } catch {}
    }

    setEditingTask(null);
    showToast('Đã lưu các thay đổi cho nhiệm vụ!');
  };

  // Delete task (supports both custom and system tasks)
  const handleDeleteTask = (task: PracticalTask) => {
    if (task.isCustom) {
      const updated = customTasks.filter((t) => t.id !== task.id);
      setCustomTasks(updated);
      try {
        localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(updated));
      } catch {}
    } else {
      const updated = [...deletedTaskIds, task.id];
      setDeletedTaskIds(updated);
      try {
        localStorage.setItem(DELETED_TASK_IDS_KEY, JSON.stringify(updated));
      } catch {}
    }
    showToast('Đã xóa nhiệm vụ khỏi lộ trình.');
  };

  // Modal State for Customizing Milestone (Renaming Milestone / Changing Role Title)
  const [isCustomizeMilestoneOpen, setIsCustomizeMilestoneOpen] = useState(false);
  const [customMilestoneTitle, setCustomMilestoneTitle] = useState('');
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');

  const handleOpenCustomizeMilestone = () => {
    setCustomMilestoneTitle(activeMilestoneData.milestoneTitle);
    setCustomRoleTitle(activeMilestoneData.roleTitle);
    setCustomSubtitle(activeMilestoneData.milestoneSubtitle);
    setIsCustomizeMilestoneOpen(true);
  };

  const handleSaveMilestoneCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...milestoneOverrides,
      [activeMilestone]: {
        milestoneTitle: customMilestoneTitle.trim() || activeMilestoneData.milestoneTitle,
        roleTitle: customRoleTitle.trim() || activeMilestoneData.roleTitle,
        milestoneSubtitle: customSubtitle.trim() || activeMilestoneData.milestoneSubtitle,
      },
    };
    setMilestoneOverrides(updated);
    try {
      localStorage.setItem(CUSTOM_MILESTONES_OVERRIDE_KEY, JSON.stringify(updated));
    } catch {}
    setIsCustomizeMilestoneOpen(false);
    showToast(`Đã cập nhật tên và thông tin Cột mốc ${activeMilestone}!`);
  };

  const handleResetMilestoneToDefault = () => {
    const updated = { ...milestoneOverrides };
    delete updated[activeMilestone];
    setMilestoneOverrides(updated);
    try {
      localStorage.setItem(CUSTOM_MILESTONES_OVERRIDE_KEY, JSON.stringify(updated));
    } catch {}
    setIsCustomizeMilestoneOpen(false);
    showToast(`Đã khôi phục Cột mốc ${activeMilestone} về mặc định!`);
  };

  // Add Task to My Tasks
  const [addedTasks, setAddedTasks] = useState<string[]>([]);

  const handleAddTaskToMyTasks = (task: PracticalTask) => {
    if (!isUserLoggedIn) {
      if (onRequireLogin) {
        onRequireLogin('Vui lòng đăng nhập để thêm task vào danh sách nhiệm vụ của bạn');
      } else {
        showToast('⚠️ Vui lòng đăng nhập để thêm task');
      }
      return;
    }
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      const existing = stored ? JSON.parse(stored) : [];

      const newTask = {
        id: `task-roadmap-${task.id}-${Date.now()}`,
        title: cleanTaskTitle(task.title),
        description: task.description || `Nhiệm vụ thực tế từ ${activeMilestoneData.milestoneTitle} (${activeMilestoneData.roleTitle})`,
        category: 'roadmap' as const,
        priority: task.priority || 'medium',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        completed: false,
        linkedView: 'roadmap' as ScreenView,
        actionText: 'Xem Career Map',
      };

      const updated = [newTask, ...existing];
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));

      setAddedTasks((prev) => [...prev, task.id]);
      showToast(`Đã lưu "${task.title.slice(0, 36)}..." vào My Tasks!`);

      try {
        confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
      } catch {}
    } catch {
      showToast('Có lỗi khi lưu vào My Tasks.');
    }
  };

  // Add Workshop / Event to My Tasks
  const handleAddEventToMyTasks = (ev: CareerEvent) => {
    if (!isUserLoggedIn) {
      if (onRequireLogin) {
        onRequireLogin('Vui lòng đăng nhập để thêm task vào danh sách nhiệm vụ của bạn');
      } else {
        showToast('⚠️ Vui lòng đăng nhập để thêm task');
      }
      return;
    }
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      const existing = stored ? JSON.parse(stored) : [];

      const newTask = {
        id: `task-event-${ev.id}-${Date.now()}`,
        title: `Tham gia: ${ev.title}`,
        description: `Workshop ${ev.organizer} • Địa điểm: ${ev.location}`,
        category: 'learning' as const,
        priority: 'high' as const,
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        completed: false,
        linkedView: 'events' as ScreenView,
        actionText: 'Xem chi tiết',
      };

      const updated = [newTask, ...existing];
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));

      showToast(`Đã thêm workshop "${ev.title.slice(0, 35)}..." vào My Tasks!`);
      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      } catch {}
    } catch {
      showToast('Có lỗi khi lưu sự kiện.');
    }
  };

  // Matched events for active milestone
  const matchedEvents = useMemo(() => {
    const geminiSuggestedIds = aiGapData?.recommendedEventIds || [];
    const baseIds = activeMilestoneData.recommendedEventIds;
    const combinedIds = Array.from(new Set([...geminiSuggestedIds, ...baseIds]));

    const filtered = events.filter((e) => combinedIds.includes(e.id));
    if (filtered.length > 0) return filtered;
    return events.slice(0, 3);
  }, [events, activeMilestoneData.recommendedEventIds, aiGapData?.recommendedEventIds]);

  // Matched jobs for active milestone
  const matchedJobs = useMemo(() => {
    const geminiSuggestedJobIds =
      activeMilestoneData.recommendedJobIds || aiGapData?.recommendedJobIds || [];
    if (geminiSuggestedJobIds.length > 0) {
      const found = allJobs.filter((j) => geminiSuggestedJobIds.includes(j.id));
      if (found.length > 0) return found;
    }

    const keyword = (
      activeMilestoneData.roleTitle ||
      userProfile?.major ||
      userProfile?.careerDirection ||
      ''
    ).toLowerCase();

    const filtered = allJobs.filter(
      (j) =>
        j.title.toLowerCase().includes(keyword) ||
        (j.jobField && keyword.includes(j.jobField.toLowerCase())) ||
        (j.careerCategory && keyword.includes(j.careerCategory.toLowerCase()))
    );
    if (filtered.length > 0) return filtered.slice(0, 2);
    return allJobs.slice(0, 2);
  }, [
    allJobs,
    activeMilestoneData.recommendedJobIds,
    activeMilestoneData.roleTitle,
    aiGapData?.recommendedJobIds,
    userProfile?.major,
    userProfile?.careerDirection,
  ]);

  // Display texts with sanitation
  const displayMajor = useMemo(() => {
    return userProfile?.major || 'Chưa chọn ngành';
  }, [userProfile?.major]);

  const displayAcademicYear = useMemo(() => {
    const raw = userProfile?.academicYear?.trim();
    if (!raw) return 'Chưa cập nhật';
    return raw;
  }, [userProfile?.academicYear]);

  const displayDisplayName = useMemo(() => {
    const raw = userProfile?.displayName?.trim();
    if (!raw) return 'Người dùng';
    return raw;
  }, [userProfile?.displayName]);

  const displayCareerGoal = useMemo(() => {
    return userProfile?.careerGoal || 'Đang tìm hiểu các hướng nghề nghiệp';
  }, [userProfile?.careerGoal]);

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#131B2E] text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CẢNH BÁO NẾU CHƯA CHỌN NGÀNH HỌC */}
      {!userProfile?.major && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 font-bold shadow-2xs">
              <BookOpen className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-amber-950">
                Bạn chưa chọn chuyên ngành đào tạo (Khối Kinh tế PTIT)
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                Vui lòng chọn một ngành học để hệ thống hiển thị chính xác Lộ trình khung 3 Cột mốc và tối ưu hóa phân tích Gap Analysis theo đúng chuyên môn của bạn.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <label className="text-xs font-bold text-amber-900 whitespace-nowrap">Chọn ngành:</label>
            <select
              value={userProfile?.major || ''}
              onChange={(e) => {
                const selected = e.target.value;
                if (onUpdateUserProfile && selected) {
                  onUpdateUserProfile({ major: selected });
                  showToast(`✨ Đã kích hoạt lộ trình chuyên ngành: ${selected}!`);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-white border-2 border-amber-400 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#B90013] focus:ring-2 focus:ring-red-100 cursor-pointer shadow-xs"
            >
              <option value="" disabled>
                Chọn ngành
              </option>
              {PTIT_MAJORS.map((m) => (
                <option key={m} value={m} className="font-semibold text-slate-800">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* THÔNG TIN ĐỒNG BỘ HỒ SƠ & CV ĐÃ TẢI LÊN - CHỈ HIỂN THỊ SAU KHI ĐÃ CHỌN HƯỚNG / KÍCH HOẠT LỘ TRÌNH */}
      {hasActiveCareerMap && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
          {/* Hàng 1: Thông tin người dùng & Trạng thái kết nối */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#131B2E]">
                    Đồng bộ Hồ sơ: {userProfile?.displayName || 'Người dùng'} • {displayMajor}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    {userProfile?.academicYear || 'Chưa cập nhật'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Hồ sơ sinh viên PTIT được đồng bộ với Lộ trình nghề nghiệp
                </p>
              </div>
            </div>

            {/* Badges trạng thái */}
            <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0">
              {uploadedCvInfo.hasCv ? (
                <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[260px]" title={uploadedCvInfo.fileName}>
                    CV: {uploadedCvInfo.fileName} ({uploadedCvInfo.skills.length} kỹ năng)
                  </span>
                </span>
              ) : (
                <span className="text-xs font-medium px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Chưa tải CV • Khuyên dùng tải CV để cá nhân hóa</span>
                </span>
              )}

              {aiGeneratedMilestones && (
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Đang áp dụng: {activeRegenFocusName || 'Lộ trình mới do AI'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Hàng 2: Thanh điều khiển & Tác vụ (Khôi phục chuẩn, Cập nhật CV, Làm mới AI) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Lộ trình 3 Cột mốc chuẩn hóa theo chuyên môn & JD mục tiêu
              </span>
            </div>

            {/* Các nút hành động */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Nếu đang dùng lộ trình AI thay thế, cho phép khôi phục về mặc định */}
              {aiGeneratedMilestones && (
                <button
                  type="button"
                  onClick={handleResetToDefaultRoadmap}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Quay lại Lộ trình khung chuẩn hóa ban đầu"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khôi phục chuẩn</span>
                </button>
              )}

              {/* Nút đồng bộ / cập nhật CV */}
              <button
                type="button"
                onClick={() => onNavigate('cv-builder')}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Đến trang AI CV để tải file PDF hoặc chỉnh sửa hồ sơ CV"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>{uploadedCvInfo.hasCv ? 'Cập nhật CV' : 'Tải file CV'}</span>
              </button>

              {/* Nút Làm mới lộ trình (Tạo lộ trình khác) */}
              <button
                type="button"
                onClick={() => setIsRegenModalOpen(true)}
                disabled={isAiLoading}
                className="px-4 py-2 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                title="Tạo phương án lộ trình mới với góc nhìn tiếp cận khác biệt từ AI"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>{isAiLoading ? 'Đang tạo lộ trình...' : '✨ Làm mới lộ trình với AI'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAREER MAP CONTENT OR ACTIVATION PROMPT */}
      {!hasActiveCareerMap ? (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-8 animate-fade-in max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 text-[#B90013] text-xs font-bold border border-red-100">
              <Compass className="w-3.5 h-3.5" />
              <span>Thiết lập Career Map đầu tiên</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#131B2E]">
              Bạn chưa kích hoạt Lộ trình nghề nghiệp
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dựa vào thông tin hồ sơ ban đầu của bạn (Ngành <strong>{displayMajor}</strong> • <strong>{displayAcademicYear}</strong>), bạn có thể lựa chọn 1 trong 2 cách dưới đây để xây dựng lộ trình rèn luyện kỹ năng và chuẩn bị đi làm:
            </p>
          </div>

          {/* 2 Activation Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-6 items-stretch">
            {/* Thẻ 1: ĐỊNH HƯỚNG THEO NGÀNH */}
            <div className="bg-gradient-to-br from-purple-50/90 via-white to-pink-50/40 rounded-2xl p-6 sm:p-7 border border-purple-200/90 hover:border-purple-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl border border-purple-200 shadow-2xs">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                    ĐỊNH HƯỚNG THEO NGÀNH
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    AI phân tích CV và đề xuất lộ trình nghề nghiệp phù hợp với năng lực, kỹ năng và kinh nghiệm của bạn.
                  </p>
                </div>
              </div>
              <div className="pt-6 mt-auto">
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => setIsInitialOrientationModalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-pink-700 hover:from-purple-800 hover:to-pink-800 text-white font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md disabled:opacity-50 active:scale-[0.99]"
                >
                  <Sparkles className={`w-4 h-4 shrink-0 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span className="truncate">{isAiLoading ? 'AI đang phân tích...' : '✨ Đề xuất lộ trình ngay'}</span>
                </button>
              </div>
            </div>

            {/* Thẻ 2: ĐỊNH HƯỚNG THEO CÔNG VIỆC MỤC TIÊU */}
            <div className="bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/40 rounded-2xl p-6 sm:p-7 border border-blue-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl border border-blue-200 shadow-2xs">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                    ĐỊNH HƯỚNG THEO CÔNG VIỆC MỤC TIÊU
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Chọn công việc bạn muốn hướng tới để xây dựng lộ trình đáp ứng yêu cầu tuyển dụng.
                  </p>
                </div>
              </div>
              <div className="pt-6 mt-auto">
                <button
                  type="button"
                  onClick={() => onNavigate('jobs')}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99]"
                >
                  <span className="truncate">Khám phá công việc mục tiêu →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* BANNER CHO PHÉP LÀM MỚI LỘ TRÌNH VỚI AI NẾU CHƯA ƯNG Ý */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-white to-red-50/70 border border-purple-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs sm:text-sm text-[#131B2E]">
                    {aiGeneratedMilestones ? `Lộ trình đang áp dụng: ${activeRegenFocusName || 'AI Cá nhân hóa'}` : 'Đang áp dụng: Lộ trình khung chuẩn hóa'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                    AI Gemini Ready
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Chưa ưng ý với lộ trình hiện tại do AI đề xuất? Bạn có thể yêu cầu AI làm mới với góc nhìn tiếp cận khác (Thực chiến, Chuyên sâu, Tăng tốc...) hoặc bổ sung thêm yêu cầu riêng.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRegenModalOpen(true)}
              disabled={isAiLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-[#B90013] hover:opacity-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Đang tạo...' : '✨ Làm mới phương án khác'}</span>
            </button>
          </div>

          {/* HEADER SECTION: COMPLETELY DYNAMIC BASED ON USERPROFILE & STATE 1 VS STATE 2 */}
          <div className="border-b border-slate-200/80 pb-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-red-50 text-[#B90013] text-xs font-bold rounded-full border border-red-100 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#B90013]" />
                  Career Map PTIT • Lộ trình Năng lực
                </span>

                {targetJob ? (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    TRẠNG THÁI 2: Đã ghép nối JD Mục tiêu
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                    TRẠNG THÁI 1: Lộ trình khung chuẩn theo ngành
                  </span>
                )}
              </div>

              {/* Profile & Reset Shortcuts */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetCareerDirection}
                  className="text-xs font-bold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Đặt lại hoặc chọn lộ trình khác"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Đổi định hướng</span>
                </button>

                {(onEditProfile || onOpenOrientationModal) && (
                  <button
                    type="button"
                    onClick={onEditProfile || onOpenOrientationModal}
                    className="text-xs font-bold text-slate-600 hover:text-[#B90013] flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-200"
                    title="Chỉnh sửa thông tin hồ sơ và năm học"
                  >
                    <User className="w-3.5 h-3.5 text-[#B90013]" />
                    <span>Hồ sơ: {userProfile?.displayName || 'Người dùng'} ({userProfile?.academicYear || 'Chưa cập nhật'})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

        {/* Dynamic Title */}
        {targetJob ? (
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#131B2E] tracking-tight leading-snug">
              Lộ trình theo JD: <span className="text-[#B90013]">{targetJob.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {targetJob.company}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {targetJob.location || 'Hà Nội'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                {targetJob.salaryDisplay || 'Lương thỏa thuận'}
              </span>
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#131B2E] tracking-tight leading-snug">
              Bản đồ Định hướng Sự nghiệp — Ngành <span className="text-[#B90013]">{displayMajor}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Lộ trình phát triển năng lực chuẩn hóa cho sinh viên PTIT theo 3 Cột mốc thực chiến: Ghép nối Công việc ↔ Kỹ năng thực tế ↔ Workshop đào tạo gắn liền.
            </p>
          </div>
        )}
      </div>

      {/* TRẠNG THÁI 1: BANNER CTA DẪN HƯỚNG KHI CHƯA CHỌN VIỆC LÀM MỤC TIÊU */}
      {!targetJob && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-red-50/80 via-white to-purple-50/50 border border-red-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white text-[#B90013] border border-red-200 flex items-center justify-center font-black text-xl shrink-0 shadow-2xs">
              💡
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#131B2E]">
                Bạn muốn cá nhân hóa lộ trình các công việc & kỹ năng cần bổ sung theo đúng vị trí tuyển dụng thực tế?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                Chọn ngay một việc làm từ mạng lưới đối tác PTIT hoặc tải CV lên để AI Gemini phân tích lỗ hổng kỹ năng (Gap Analysis) và gắn nhãn các kỹ năng cần bổ khuyết khẩn cấp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('jobs')}
              className="px-4 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Briefcase className="w-4 h-4" />
              <span>Chọn việc làm mục tiêu</span>
            </button>
            <button
              onClick={() => onNavigate('cv-builder')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Phân tích CV tại AI CV</span>
            </button>
          </div>
        </div>
      )}

      {/* TRẠNG THÁI 2: TARGET BADGE & GEMINI GAP ANALYSIS KHI ĐÃ CHỌN TARGET JOB */}
      {targetJob && (
        <div className="space-y-4">
          {/* Target Job Quick Control Card & Reset Button */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100/80 text-[#B90013] flex items-center justify-center font-bold text-xl shrink-0 border border-red-200">
                🎯
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm sm:text-base text-[#131B2E]">
                    {targetJob.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                    JD Mục tiêu đang theo dõi
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {targetJob.company} • {targetJob.location || 'Hà Nội'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (onSelectJobDetail) onSelectJobDetail(targetJob);
                  else onNavigate('jobs');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Xem chi tiết JD
              </button>
              <button
                onClick={handleRemoveTargetGoal}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#B90013] border border-red-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Quay lại Trạng thái 1: Lộ trình khung chuẩn theo ngành"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa / Chọn lại mục tiêu</span>
              </button>
            </div>
          </div>

          {/* Gemini AI Gap Analysis Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-50/70 via-white to-red-50/50 border border-purple-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#712AE2] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-[#131B2E] flex items-center gap-1.5">
                    <span>Phân tích khoảng cách năng lực (Gap Analysis)</span>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold">
                      AI Gap Analysis
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {uploadedCvInfo.hasCv
                      ? `Đối chiếu kỹ năng & kinh nghiệm từ file "${uploadedCvInfo.fileName}" với vị trí tuyển dụng này`
                      : 'Yêu cầu tải lên file CV để hệ thống đối chiếu kỹ năng và kinh nghiệm thực tế'}
                  </p>
                </div>
              </div>

              {!uploadedCvInfo.hasCv ? (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 inline-flex items-center gap-1.5 self-start sm:self-auto">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Chưa có file CV
                </span>
              ) : aiGapData ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Độ phù hợp ước tính:</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black rounded-xl text-sm border border-emerald-200">
                    {aiGapData.matchScore}%
                  </span>
                </div>
              ) : null}
            </div>

            {/* CASE 1: NO CV UPLOADED -> ALLOW CHOOSING FROM STORED CVS OR NAVIGATE TO AI CV */}
            {!uploadedCvInfo.hasCv ? (
              availableStoredCvs.length > 0 ? (
                <div className="p-6 rounded-2xl bg-white border border-purple-200 shadow-2xs space-y-4">
                  <div className="text-center space-y-1.5 max-w-lg mx-auto">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-2xs">
                      <FolderArchive className="w-5 h-5" />
                    </div>
                    <h5 className="text-sm sm:text-base font-extrabold text-[#131B2E]">
                      Chọn 1 trong các CV bạn đã tải lên từ trước ({availableStoredCvs.length} CV sẵn có)
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Hệ thống đã đồng bộ các file CV bạn đã tải lên ở trang AI CV. Bạn chỉ cần chọn nhanh 1 file bên dưới để đối chiếu năng lực mà không cần tải lại file.
                    </p>
                  </div>

                  {/* Stored CVs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto pt-1">
                    {availableStoredCvs.map((cvItem) => {
                      const cvData = cvItem.verifiedCV || cvItem.extractedCV;
                      const skillsCount = [
                        ...(Array.isArray(cvData?.skills) ? cvData.skills.map((s: any) => s.name || s) : []),
                        ...(Array.isArray(cvData?.skills?.hardSkills) ? cvData.skills.hardSkills : []),
                        ...(Array.isArray(cvData?.skills?.softSkills) ? cvData.skills.softSkills : []),
                      ].filter(Boolean).length;
                      const expsCount = Array.isArray(cvData?.experiences) ? cvData.experiences.length : 0;

                      return (
                        <div
                          key={cvItem.id}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs bg-slate-50/70 hover:bg-purple-50/20 transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h6 className="font-extrabold text-xs text-[#131B2E] truncate" title={cvItem.fileName}>
                                  {cvItem.fileName}
                                </h6>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {cvItem.uploadedAt || 'Gần đây'}
                                </p>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-600 space-y-0.5 pt-1.5 border-t border-slate-200/60">
                              <p className="truncate">Ứng viên: <strong className="text-slate-800">{cvData?.candidate?.fullName || userProfile?.displayName || 'Sinh viên PTIT'}</strong></p>
                              <p>Dữ liệu: <span className="font-bold text-purple-700">{skillsCount} kỹ năng</span> • <span className="font-bold text-slate-700">{expsCount} kinh nghiệm</span></p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSelectStoredCvForRoadmap(cvItem)}
                            className="w-full py-2 px-3 rounded-xl bg-[#B90013] hover:bg-[#8B0013] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chọn CV này để phân tích</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action button to AI CV page */}
                  <div className="pt-2 text-center border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => onNavigate('cv-builder')}
                      className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <UploadCloud className="w-4 h-4 text-purple-600" />
                      <span>Tải file CV</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-dashed border-amber-300 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
                    <FileLock2 className="w-6 h-6" />
                  </div>

                  <div className="max-w-lg mx-auto space-y-1.5">
                    <h5 className="text-sm font-extrabold text-[#131B2E]">
                      Chưa có file CV đã tải lên
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Tính năng <strong>Phân tích khoảng cách năng lực (Gap Analysis)</strong> chỉ hoạt động khi bạn đã tải lên file CV. Hệ thống sẽ đọc toàn bộ kỹ năng và kinh nghiệm thực tế trong file CV đó để đối chiếu với công việc mục tiêu <strong>"{targetJob.title}"</strong> ({targetJob.company}) và đưa ra mức độ % phù hợp.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => onNavigate('cv-builder')}
                      className="px-5 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#8B0013] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Tải file CV</span>
                    </button>

                    <button
                      onClick={() => handleLoadSampleCv('CV_Marketing_Intern_PTIT.pdf')}
                      className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Thử nghiệm với CV mẫu sinh viên PTIT</span>
                    </button>
                  </div>

                  {cvUploadError && (
                    <p className="text-xs font-semibold text-red-600 mt-2">{cvUploadError}</p>
                  )}
                </div>
              )
            ) : isAiLoading ? (
              <div className="py-6 text-center text-xs text-purple-700 flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 animate-spin text-purple-600" />
                <span className="font-semibold">AI Gemini đang đọc kỹ năng & kinh nghiệm từ file "{uploadedCvInfo.fileName}" để đối chiếu với JD...</span>
              </div>
            ) : aiGapData ? (
              <div className="space-y-4">
                {/* CV File Bar */}
                <div className="p-3 bg-white/80 rounded-xl border border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-slate-600 truncate">
                      Dữ liệu đọc từ file: <strong className="text-slate-900">{uploadedCvInfo.fileName}</strong> ({uploadedCvInfo.skills.length} kỹ năng, {uploadedCvInfo.experiencesCount} kinh nghiệm/dự án)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {availableStoredCvs.length > 0 && (
                      <button
                        onClick={() => setIsChangeCvModalOpen(true)}
                        className="text-xs text-[#B90013] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Đổi sang CV khác ({availableStoredCvs.length} CV sẵn có)</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate('cv-builder')}
                      className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Tải file CV</span>
                    </button>

                    <span className="text-slate-300">|</span>

                    <button
                      onClick={handleRemoveCv}
                      className="text-xs text-slate-400 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      Gỡ CV
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {aiGapData.analysisSummary}
                </p>

                {/* 2-Column: Acquired from CV vs Missing in JD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Acquired from CV */}
                  {aiGapData.acquiredSkillsFromCv && aiGapData.acquiredSkillsFromCv.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 space-y-2">
                      <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kỹ năng & Kinh nghiệm đã đáp ứng từ CV:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiGapData.acquiredSkillsFromCv.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{skill}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing in JD */}
                  {(aiGapData.missingSkills || aiGapData.gapSkills) && (aiGapData.missingSkills || aiGapData.gapSkills).length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-2">
                      <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Kỹ năng trọng tâm còn thiếu cần bổ sung theo JD:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(aiGapData.missingSkills || aiGapData.gapSkills).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{skill}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Regenerate Action */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Phân tích đối chiếu theo thời gian thực giữa nội dung CV và yêu cầu tuyển dụng.
                  </span>
                  <button
                    onClick={() => runGeminiAnalysis(true)}
                    className="px-3 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-purple-600" />
                    <span>Làm mới phân tích</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* SECTION 2: 3 MILESTONES TABS (FLEXIBLE, NO RIGID YEAR LOCK) */}
      <div className="space-y-4">
        {/* Milestone Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {milestonesData.map((m) => {
            const isSelected = activeMilestone === m.milestoneNumber;
            const isSuggested = suggestedStartingMilestone === m.milestoneNumber;

            return (
              <button
                key={m.milestoneNumber}
                onClick={() => {
                  trackEvent('career_map_view', { milestone: m.milestoneNumber });
                  setActiveMilestone(m.milestoneNumber);
                }}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-[#B90013] bg-red-50/40 shadow-xs ring-2 ring-red-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        isSelected
                          ? 'bg-[#B90013] text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.milestoneTitle.split(':')[0] || `Cột mốc ${m.milestoneNumber}`}
                    </span>

                    {isSuggested && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        📍 Khởi điểm đề xuất
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-[#131B2E]">
                    {m.roleTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {m.milestoneSubtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-600 font-semibold">{m.badgeLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: TRIAD MATCHING PER MILESTONE */}
      {/* CÔNG VIỆC <-> KỸ NĂNG TƯƠNG ỨNG <-> WORKSHOP / SỰ KIỆN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Công việc, Task thực tế & Kỹ năng bắt buộc */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card Vị trí công việc & Task thực tế */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-red-100 text-[#B90013] rounded-md text-xs font-extrabold">
                    {activeMilestoneData.badgeLabel}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {activeMilestoneData.roleType}
                  </span>
                </div>

                {/* Nút Tùy chỉnh Cột mốc */}
                <button
                  type="button"
                  onClick={handleOpenCustomizeMilestone}
                  className="text-xs font-bold text-slate-600 hover:text-[#B90013] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-200 bg-slate-50 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Đổi tên cột mốc hoặc vai trò mục tiêu theo ý bạn"
                >
                  <Settings2 className="w-3.5 h-3.5 text-[#B90013]" />
                  <span>Tùy chỉnh Cột mốc</span>
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[#131B2E]">
                {activeMilestoneData.roleTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                {activeMilestoneData.roleDescription}
              </p>
            </div>

            {/* Task thực tế (Actions & Practical Tasks) */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-[#131B2E] flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-[#B90013]" />
                    <span>Nhiệm vụ & Task thực tế cần hoàn thành để đạt cột mốc:</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {combinedTasksForActiveMilestone.length} nhiệm vụ thực tế
                  </span>
                </div>

                {/* NÚT THÊM HOẠT ĐỘNG CÁ NHÂN */}
                <button
                  type="button"
                  onClick={handleOpenAddCustomModal}
                  title={isUserLoggedIn ? 'Thêm hoạt động cá nhân vào lộ trình' : 'Yêu cầu đăng nhập để thêm hoạt động'}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B90013]" />
                  <span>Thêm hoạt động cá nhân</span>
                </button>
              </div>

              {/* Task Checklist Items */}
              <div className="space-y-3">
                {combinedTasksForActiveMilestone.map((task) => {
                  const isAdded = addedTasks.includes(task.id);

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        task.isCustom
                          ? 'bg-amber-50/30 border-amber-200'
                          : 'bg-slate-50/70 border-slate-200/90 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs sm:text-sm font-bold leading-snug text-slate-800">
                              {cleanTaskTitle(task.title)}
                            </p>
                            {task.isCustom && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                Mục tiêu cá nhân
                              </span>
                            )}
                            {task.deadline && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{task.deadline}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {task.description || 'Hạng mục thực tế phục vụ trực tiếp hồ sơ ứng tuyển'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {/* Nút Sửa Task */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditTaskModal(task)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Chỉnh sửa nội dung & thời gian task"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Thêm vào My Tasks */}
                        <button
                          type="button"
                          onClick={() => handleAddTaskToMyTasks(task)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isAdded
                              ? 'bg-slate-200 text-slate-600 cursor-default'
                              : 'bg-white hover:bg-red-50 text-[#B90013] border border-red-200 shadow-2xs'
                          }`}
                          title={isAdded ? 'Đã lưu My Tasks' : isUserLoggedIn ? 'Lưu hoạt động này vào trang My Tasks' : 'Yêu cầu đăng nhập để thêm task'}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã lưu My Tasks</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm vào My Tasks</span>
                            </>
                          )}
                        </button>

                        {/* Nút xóa task */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Xóa nhiệm vụ này khỏi lộ trình"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kỹ năng & Kiến thức đi kèm (Required Skills) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="font-extrabold text-sm text-[#131B2E] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#B90013]" />
                <span>Kỹ năng & Kiến thức chuyên môn đi kèm chính xác với vị trí:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeMilestoneData.requiredSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      skill.isGapSkill
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-bold'
                        : skill.isCore
                        ? 'bg-red-50/50 border-red-200 text-slate-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          skill.isGapSkill
                            ? 'bg-amber-500 animate-ping'
                            : skill.isCore
                            ? 'bg-[#B90013]'
                            : 'bg-slate-400'
                        }`}
                      ></span>
                      <span>{skill.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {skill.isGapSkill && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-extrabold">
                          Lỗ hổng JD
                        </span>
                      )}
                      {skill.isCore && !skill.isGapSkill && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-[#B90013] font-bold">
                          Bắt buộc
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Đề xuất Workshop & Sự kiện liên quan */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#B90013]" />
                <h3 className="font-extrabold text-sm text-[#131B2E]">
                  Workshop & Sự kiện liên quan
                </h3>
              </div>
              <button
                onClick={() => onNavigate('events')}
                className="text-[11px] font-bold text-[#B90013] hover:underline cursor-pointer"
              >
                Xem tất cả ({events.length})
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Các sự kiện và workshop được quét tự động nhằm bồi dưỡng kỹ năng cho <strong>{activeMilestoneData.roleTitle}</strong>:
            </p>

            <div className="space-y-3.5">
              {matchedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-slate-300 transition-all space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-extrabold text-[#B90013] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        {ev.month} {ev.day}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#131B2E] line-clamp-2">
                      {ev.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectEventDetail) onSelectEventDetail(ev);
                        else onNavigate('events');
                      }}
                      className="text-xs font-bold text-slate-700 hover:text-[#B90013] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddEventToMyTasks(ev)}
                      title={isUserLoggedIn ? 'Thêm sự kiện này vào My Tasks' : 'Yêu cầu đăng nhập để thêm task'}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[#B90013] border border-red-200 rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      + Thêm vào My Tasks
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
              <span className="font-bold text-slate-700 block">
                Quyền lợi khi tham gia sự kiện PTIT:
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tham gia và điểm danh tại các workshop do Học viện chủ trì để mở rộng mạng lưới quan hệ và nhận tài liệu độc quyền từ chuyên gia.
              </p>
            </div>
          </div>

          {/* Việc làm & Cơ hội thực tập đề xuất từ Web */}
          {matchedJobs.length > 0 && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <h3 className="font-extrabold text-sm text-[#131B2E]">
                    Việc làm & Thực tập từ Web
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('jobs')}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Xem thêm ({allJobs.length})
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Cơ hội việc làm có sẵn trên hệ thống tương thích với năng lực Cột mốc {activeMilestone}:
              </p>

              <div className="space-y-3">
                {matchedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3.5 rounded-2xl bg-blue-50/40 border border-blue-200/80 hover:bg-blue-50/70 transition-all space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {job.type || 'Thực tập / Fresher'}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          {job.salaryDisplay || 'Thỏa thuận'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#131B2E] mt-1 line-clamp-1">
                        {job.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {job.company} • {job.location || 'Hà Nội'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-blue-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectJobDetail) onSelectJobDetail(job);
                          else onNavigate('jobs');
                        }}
                        className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Chi tiết JD</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {job.id !== targetJob?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateUserProfile) {
                              onUpdateUserProfile({
                                targetJobId: job.id,
                                targetJobTitle: job.title,
                                targetJobCompany: job.company,
                                targetJobSalary: job.salaryDisplay,
                                targetJobLocation: job.location,
                              });
                              showToast(`🎯 Đã chọn "${job.title}" làm JD mục tiêu!`);
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          Chọn làm JD Cột mốc 3
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Đề xuất bổ trợ từ AI (Giả định mô phỏng nếu web chưa có) */}
          {activeMilestoneData.hypotheticalItems && activeMilestoneData.hypotheticalItems.length > 0 && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-purple-50/40 border border-amber-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-2.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-xs text-amber-950">
                  Gợi ý giả định bổ trợ từ AI Gemini
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Đề xuất mô phỏng sát thực tế thị trường để bồi dưỡng năng lực khi website chưa có sự kiện hoặc job mở tuyển tương ứng:
              </p>
              <div className="space-y-2">
                {activeMilestoneData.hypotheticalItems.map((item, hIdx) => (
                  <div
                    key={hIdx}
                    className="p-3 rounded-xl bg-white border border-amber-200 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-amber-950 text-xs">
                        {item.type === 'event' ? '📅 Workshop mô phỏng' : item.type === 'job' ? '💼 Vị trí thực tập đề xuất' : '🎯 Dự án thử nghiệm'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold uppercase">
                        Giả định AI
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px]">{item.title}</p>
                    {(item.organizer || item.company) && (
                      <p className="text-[10px] text-slate-500">
                        {item.organizer || item.company}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-[10px] text-slate-600 italic bg-slate-50 p-1.5 rounded-lg">
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick link to My Tasks */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xs space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-sm">Quản lý nhiệm vụ của bạn</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Tất cả các task và sự kiện bạn đã lưu đều được đồng bộ tức thì vào trang My Tasks để quản lý tiến độ thực tế.
            </p>
            <button
              onClick={() => onNavigate('my-tasks')}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Xem trang My Tasks</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* MODAL THÊM HOẠT ĐỘNG CÁ NHÂN */}
      {isAddCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-[#B90013] flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-[#131B2E]">
                  Thêm hoạt động cá nhân vào lộ trình
                </h3>
              </div>
              <button
                onClick={() => setIsAddCustomModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu đề hoạt động / Mục tiêu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Học xong chứng chỉ Google Analytics 4 (GA4)"
                  value={customTaskTitle}
                  onChange={(e) => setCustomTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả chi tiết / Kế hoạch thực hiện
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về tài liệu, người hỗ trợ hoặc mục tiêu cần đạt..."
                  value={customTaskDescription}
                  onChange={(e) => setCustomTaskDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cột mốc áp dụng</label>
                  <select
                    value={customTaskMilestone}
                    onChange={(e) => setCustomTaskMilestone(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs bg-white"
                  >
                    {milestonesData.map((m) => (
                      <option key={m.milestoneNumber} value={m.milestoneNumber}>
                        {m.milestoneTitle.split(':')[0] || `Cột mốc ${m.milestoneNumber}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian / Hạn chót</label>
                  <input
                    type="text"
                    value={customTaskDeadline}
                    onChange={(e) => setCustomTaskDeadline(e.target.value)}
                    placeholder="VD: Hạn: 2 tuần"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="syncMyTasks"
                  checked={syncToMyTasks}
                  onChange={(e) => setSyncToMyTasks(e.target.checked)}
                  className="rounded text-[#B90013] focus:ring-[#B90013] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="syncMyTasks" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                  Đồng thời thêm hoạt động này vào trang <strong>My Tasks</strong> để tiện theo dõi
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm vào lộ trình</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA BẤT KỲ NHIỆM VỤ NÀO (SỬA TIÊU ĐỀ, HẠN CHÓT, MÔ TẢ) */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#712AE2] flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-[#131B2E]">
                  Chỉnh sửa nhiệm vụ
                </h3>
              </div>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu đề nhiệm vụ *
                </label>
                <input
                  type="text"
                  required
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả / Kế hoạch hành động
                </label>
                <textarea
                  rows={2}
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian / Hạn chót</label>
                  <input
                    type="text"
                    value={editTaskDeadline}
                    onChange={(e) => setEditTaskDeadline(e.target.value)}
                    placeholder="VD: Hạn: 2 tuần"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ ưu tiên</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs bg-white"
                  >
                    <option value="high">Ưu tiên cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="normal">Bình thường</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TÙY CHỈNH CỘT MỐC (ĐỔI TÊN, SỬA ROLE TITLE, PHỤ ĐỀ) */}
      {isCustomizeMilestoneOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-[#B90013] flex items-center justify-center font-bold">
                  <Settings2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-[#131B2E]">
                  Tùy chỉnh Cột mốc {activeMilestone}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomizeMilestoneOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMilestoneCustomization} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Cột mốc (Tiêu đề giai đoạn) *
                </label>
                <input
                  type="text"
                  required
                  value={customMilestoneTitle}
                  onChange={(e) => setCustomMilestoneTitle(e.target.value)}
                  placeholder="VD: Giai đoạn 1: Khởi động & Học việc"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chức danh / Vai trò mục tiêu của Cột mốc *
                </label>
                <input
                  type="text"
                  required
                  value={customRoleTitle}
                  onChange={(e) => setCustomRoleTitle(e.target.value)}
                  placeholder="VD: CTV Nghiên cứu thị trường / Sales Support"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả trọng tâm giai đoạn
                </label>
                <textarea
                  rows={2}
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  placeholder="Mô tả mục tiêu chính cần đạt được trong giai đoạn này..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetMilestoneToDefault}
                  className="text-xs text-slate-500 hover:text-[#B90013] underline font-semibold"
                >
                  Khôi phục mặc định
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomizeMilestoneOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu Cột mốc</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: BƯỚC LỰA CHỌN ĐỊNH HƯỚNG TRƯỚC KHI AI TẠO CAREER MAP */}
      {isInitialOrientationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 flex items-center justify-center font-bold shrink-0 shadow-2xs border border-purple-200">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#131B2E]">
                    Chọn định hướng trước khi AI tạo Career Map
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Chọn 1 trong 3 hướng đề xuất lộ trình để AI cá nhân hóa Career Map theo đúng mục tiêu của bạn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInitialOrientationModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin ngữ cảnh */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-extrabold text-purple-950 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-700" />
                  Định hướng theo chuyên ngành: {displayMajor}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-200/70 text-purple-900 font-bold">
                  {displayAcademicYear}
                </span>
              </div>
              <p className="text-[11px] text-purple-900/90 leading-relaxed">
                AI sẽ phân tích khoảng trống kỹ năng và kinh nghiệm từ CV của bạn (nếu có) cùng tiêu chuẩn ngành <strong>{displayMajor}</strong>, kết nối sự kiện và việc làm có sẵn trên web (hoặc đề xuất giả định) theo hướng bạn chọn dưới đây.
              </p>
            </div>

            {/* 3 LỰA CHỌN ĐỊNH HƯỚNG */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-800">
                Chọn 1 trong 3 hướng đề xuất lộ trình:
              </label>

              <div className="space-y-3">
                {CAREER_ORIENTATION_OPTIONS.map((opt) => {
                  const isSelected = selectedInitialFocus === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedInitialFocus(opt.id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col gap-2.5 ${
                        isSelected
                          ? opt.borderActive
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${opt.badgeBg}`}>
                            {opt.id === 'practical' ? <Zap className="w-4 h-4" /> : opt.id === 'deep' ? <BookOpen className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm sm:text-base text-slate-900">
                                {opt.badge}: {opt.title}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${opt.badgeBg}`}>
                                {opt.tag}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Radio circle indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-[#B90013] bg-[#B90013]' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>

                      {/* Mô tả */}
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {opt.description}
                      </p>

                      {/* Cách AI xây dựng & Mục tiêu */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                          <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider mb-0.5">
                            ⚙️ Cách AI xây dựng lộ trình:
                          </span>
                          <span className="text-slate-600 leading-snug block">
                            {opt.aiMethod}
                          </span>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                          <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider mb-0.5">
                            🎯 Mục tiêu:
                          </span>
                          <span className="text-slate-600 leading-snug block">
                            {opt.goal}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ghi chú tùy chọn */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Ghi chú hoặc mong muốn riêng cho AI (Tùy chọn):
              </label>
              <textarea
                rows={2}
                value={initialCustomNote}
                onChange={(e) => setInitialCustomNote(e.target.value)}
                placeholder="Ví dụ: Muốn đẩy mạnh kỹ năng phân tích dữ liệu kinh doanh, tìm thực tập hè tại các tập đoàn..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={() => setIsInitialOrientationModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-xs cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={async () => {
                  const focusOption = CAREER_ORIENTATION_OPTIONS.find((o) => o.id === selectedInitialFocus);
                  const focusLabel = focusOption ? focusOption.title : 'Thực chiến';

                  setActiveRegenFocusName(focusLabel);
                  try {
                    localStorage.setItem('ptit_active_regen_focus_name', focusLabel);
                  } catch {}

                  // Activate career direction in user profile
                  handleActivateMajorRoadmap();
                  setIsInitialOrientationModalOpen(false);

                  // Trigger AI Gap Analysis
                  await runGeminiAnalysis(true, focusLabel, displayMajor, initialCustomNote);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-fuchsia-700 to-pink-700 hover:from-purple-800 hover:to-pink-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>{isAiLoading ? 'AI đang phân tích...' : '✨ Xác nhận & Bắt đầu tạo lộ trình'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LÀM MỚI LỘ TRÌNH VỚI AI (TẠO LỘ TRÌNH KHÁC) */}
      {isRegenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#131B2E]">
                    Làm mới lộ trình với AI (Tạo lộ trình khác)
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Đồng bộ dữ liệu CV, hồ sơ và sự kiện/việc làm thực tế từ website để thiết kế lộ trình
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegenModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dữ liệu nguồn đang được đồng bộ */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <span className="font-bold text-slate-700 block">
                Dữ liệu đầu vào đang được AI Gemini đồng bộ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Hồ sơ sinh viên:</span>
                  <span className="font-bold text-[#131B2E] truncate block mt-0.5">
                    {displayDisplayName} • {displayMajor} ({displayAcademicYear})
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                  <span className="text-slate-400 block font-medium">Dữ liệu CV:</span>
                  <span className="font-bold text-[#131B2E] truncate block mt-0.5">
                    {uploadedCvInfo.hasCv
                      ? `${uploadedCvInfo.fileName} (${uploadedCvInfo.skills.length} kỹ năng)`
                      : 'Chưa tải CV (Khuyên dùng tải CV để AI đối chiếu khoảng trống)'}
                  </span>
                </div>
              </div>
            </div>

            {/* PHƯƠNG THỨC ĐỊNH HƯỚNG LỘ TRÌNH */}
            <div className="space-y-2.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Phương thức định hướng thiết kế lộ trình:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Lựa chọn 1: Theo hướng ngành học */}
                <button
                  type="button"
                  onClick={() => setRegenOrientationType('major')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    regenOrientationType === 'major'
                      ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#131B2E] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-purple-600" />
                      <span>Theo hướng ngành học</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-extrabold">
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    AI tự động đề xuất dựa trên CV và tiêu chuẩn ngành, không cần chọn trước việc làm mục tiêu.
                  </p>
                </button>

                {/* Lựa chọn 2: Theo công việc mục tiêu */}
                <button
                  type="button"
                  onClick={() => setRegenOrientationType('target_job')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    regenOrientationType === 'target_job'
                      ? 'border-[#B90013] bg-red-50/50 ring-2 ring-red-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#131B2E] flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-[#B90013]" />
                      <span>Theo công việc mục tiêu</span>
                    </span>
                    {targetJob && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold">
                        Đã chọn JD
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Bám sát 1 vị trí tuyển dụng cụ thể (JD) làm đích đến Cột mốc 3.
                  </p>
                </button>
              </div>

              {/* Chi tiết cho lựa chọn ngành học */}
              {regenOrientationType === 'major' && (
                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-purple-950">
                      Chuyên ngành đào tạo mục tiêu:
                    </span>
                    <select
                      value={selectedRegenMajor}
                      onChange={(e) => setSelectedRegenMajor(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-purple-300 text-xs font-extrabold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer shadow-2xs"
                    >
                      {PTIT_MAJORS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    💡 AI Gemini sẽ phân tích khoảng trống kỹ năng & kinh nghiệm trong CV so với chuẩn ngành <strong>{selectedRegenMajor}</strong>, kết nối các sự kiện và việc làm có sẵn trên website (hoặc đề xuất giả định nếu web chưa có).
                  </p>
                </div>
              )}

              {/* Chi tiết cho lựa chọn công việc mục tiêu */}
              {regenOrientationType === 'target_job' && (
                <div className="text-xs">
                  {targetJob ? (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-emerald-800 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Công việc mục tiêu Cột mốc 3:
                        </span>
                        <p className="text-slate-800 font-bold mt-0.5 truncate">
                          {targetJob.title} • {targetJob.company}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegenModalOpen(false);
                          onNavigate('jobs');
                        }}
                        className="text-[11px] text-[#B90013] font-bold hover:underline shrink-0 cursor-pointer"
                      >
                        Đổi việc làm
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold">
                          Chưa có công việc mục tiêu nào được chọn.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegenModalOpen(false);
                            onNavigate('jobs');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                          Chọn từ Việc làm
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegenOrientationType('major')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          Chuyển sang theo ngành
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CHỌN 1 TRONG 3 HƯỚNG TIẾP CẬN AI */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800">
                Chọn 1 trong 3 hướng đề xuất lộ trình:
              </label>
              <div className="space-y-2 text-xs">
                {CAREER_ORIENTATION_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedRegenFocus(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer w-full flex flex-col gap-1 ${
                      selectedRegenFocus === item.id
                        ? `${item.borderActive} shadow-2xs`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${item.badgeBg}`}>
                          {item.id === 'practical' ? <Zap className="w-3.5 h-3.5" /> : item.id === 'deep' ? <BookOpen className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {item.badge}: {item.title}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${item.badgeBg}`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* YÊU CẦU / GHI CHÚ THÊM CHO AI */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Ghi chú hoặc mong muốn riêng cho AI (Tùy chọn):
              </label>
              <textarea
                rows={2}
                value={regenCustomNote}
                onChange={(e) => setRegenCustomNote(e.target.value)}
                placeholder="Ví dụ: Muốn tập trung vào Digital Marketing & TikTok Ads, hoặc muốn tìm cơ hội thực tập hè..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#B90013] text-xs"
              />
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRegenModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-xs cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => {
                  const focusOption = CAREER_ORIENTATION_OPTIONS.find((o) => o.id === selectedRegenFocus);
                  const focusLabel = focusOption ? focusOption.title : 'Thực chiến';
                  setActiveRegenFocusName(focusLabel);
                  try {
                    localStorage.setItem('ptit_active_regen_focus_name', focusLabel);
                  } catch {}
                  runGeminiAnalysis(true, focusLabel, selectedRegenMajor, regenCustomNote);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-[#B90013] hover:opacity-95 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>{isAiLoading ? 'AI đang phân tích...' : '✨ Làm mới lộ trình với AI'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHỌN HOẶC ĐỔI CV TỪ KHO LƯU TRỮ */}
      {isChangeCvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#131B2E]">
                    Chọn hoặc đổi CV để phân tích năng lực
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đã đồng bộ {availableStoredCvs.length} CV từ trang AI CV. Bạn có thể chọn nhanh 1 file hoặc dẫn vào trang AI CV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeCvModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of stored CVs */}
            {availableStoredCvs.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-3 bg-slate-50/50">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Chưa có file CV nào trong kho lưu trữ</p>
                  <p className="text-[11px] text-slate-500">
                    Vui lòng bấm nút bên dưới để chuyển sang trang AI CV tải file PDF.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {availableStoredCvs.map((cvItem) => {
                  const isCurrent = uploadedCvInfo.hasCv && uploadedCvInfo.fileName === cvItem.fileName;
                  const cvData = cvItem.verifiedCV || cvItem.extractedCV;
                  const skillsCount = [
                    ...(Array.isArray(cvData?.skills) ? cvData.skills.map((s: any) => s.name || s) : []),
                    ...(Array.isArray(cvData?.skills?.hardSkills) ? cvData.skills.hardSkills : []),
                    ...(Array.isArray(cvData?.skills?.softSkills) ? cvData.skills.softSkills : []),
                  ].filter(Boolean).length;
                  const expsCount = Array.isArray(cvData?.experiences)
                    ? cvData.experiences.length
                    : Array.isArray(cvData?.workExperience)
                    ? cvData.workExperience.length
                    : 0;

                  return (
                    <div
                      key={cvItem.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-purple-400 bg-purple-50/30 ring-2 ring-purple-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrent ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-xs sm:text-sm text-[#131B2E] truncate" title={cvItem.fileName}>
                              {cvItem.fileName}
                            </h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md shrink-0">
                                Đang kích hoạt
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Tải lên: {cvItem.uploadedAt || 'Gần đây'} • <strong>{skillsCount}</strong> kỹ năng • <strong>{expsCount}</strong> kinh nghiệm
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isCurrent ? (
                          <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-default">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đang dùng</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectStoredCvForRoadmap(cvItem)}
                            className="px-4 py-2 bg-[#B90013] hover:bg-[#8B0013] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chọn CV này</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsChangeCvModalOpen(false);
                  onNavigate('cv-builder');
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <UploadCloud className="w-4 h-4 text-purple-600" />
                <span>Tải file CV</span>
              </button>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {uploadedCvInfo.hasCv && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveCv();
                      setIsChangeCvModalOpen(false);
                    }}
                    className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Gỡ bỏ CV hiện tại
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsChangeCvModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

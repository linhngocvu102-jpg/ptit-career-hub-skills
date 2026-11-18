import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ScreenView, TargetJob, UserProfileState } from '../../types';
import { TARGET_JOBS } from '../../data/mockData';
import {
  initializeGemini,
  parseCVFromPDF,
  parseJobDescription,
  analyzeCVMatch,
  generateCVSuggestions,
  analyzeGeneralCV,
  saveCVSession,
  getStoredCVSessions,
  deleteCVSession,
  ExtractedCVData,
  ParsedJDData,
  MatchResultData,
  CVSuggestionsData,
  GeneralCVReviewData,
  CVSessionState,
} from '../../services/geminiService';
import {
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  Trash2,
  Eye,
  ArrowRight,
  XCircle,
  HelpCircle,
  Layers,
  Edit3,
  X,
  ExternalLink,
  FolderArchive,
  History,
  Clock,
  Bookmark,
  Calendar,
  User,
  Briefcase,
  GraduationCap,
  Target,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CVBuilderViewProps {
  onNavigate: (view: ScreenView) => void;
  targetJobForCv?: TargetJob | null;
  userProfile?: UserProfileState;
  onUpdateUserProfile?: (partial: Partial<UserProfileState>) => void;
  allJobs?: TargetJob[];
  onSelectJobForCv?: (job: TargetJob) => void;
  onEditProfile?: () => void;
}

export const CVBuilderView: React.FC<CVBuilderViewProps> = ({
  onNavigate,
  targetJobForCv,
  userProfile,
  onUpdateUserProfile,
  allJobs = TARGET_JOBS,
  onSelectJobForCv,
  onEditProfile,
}) => {
  const jobsList = allJobs && allJobs.length > 0 ? allJobs : TARGET_JOBS;

  const [targetJobTrigger, setTargetJobTrigger] = useState(0);

  useEffect(() => {
    const handleTargetJobSync = () => {
      setTargetJobTrigger((prev) => prev + 1);
    };
    window.addEventListener('storage', handleTargetJobSync);
    window.addEventListener('ptit_target_job_updated', handleTargetJobSync);
    return () => {
      window.removeEventListener('storage', handleTargetJobSync);
      window.removeEventListener('ptit_target_job_updated', handleTargetJobSync);
    };
  }, []);

  const currentTargetJob = useMemo<TargetJob | null>(() => {
    try {
      if (localStorage.getItem('ptit_target_job_cleared') === 'true') {
        return null;
      }
    } catch {}

    if (targetJobForCv) return targetJobForCv;

    const storedId = (() => {
      try {
        return localStorage.getItem('ptit_selected_target_job_id');
      } catch {
        return null;
      }
    })();

    const activeId = userProfile?.targetJobId || storedId;
    if (activeId && activeId !== '') {
      const found = jobsList.find((j) => j.id === activeId);
      if (found) return found;
    }

    if (userProfile?.targetJobTitle && userProfile.targetJobTitle.trim() !== '') {
      const foundByTitle = jobsList.find((j) =>
        j.title.toLowerCase().includes(userProfile.targetJobTitle!.toLowerCase())
      );
      if (foundByTitle) return foundByTitle;

      return {
        ...jobsList[0],
        id: userProfile.targetJobId || 'custom-target-job',
        title: userProfile.targetJobTitle,
        company: userProfile.targetJobCompany || 'Doanh nghiệp đối tác PTIT',
        location: userProfile.targetJobLocation || 'Hà Nội',
        salaryDisplay: userProfile.targetJobSalary || 'Hỗ trợ 4.000.000 – 7.000.000 VNĐ/tháng',
        description: userProfile.targetJobDescription || 'Mục tiêu nghề nghiệp đã lựa chọn.',
        requiredSkills: userProfile.targetJobRequiredSkills || ['Marketing số', 'Kỹ năng giao tiếp', 'Tư duy số liệu'],
      };
    }

    return null;
  }, [targetJobForCv, userProfile, jobsList, targetJobTrigger]);

  // CV Session state (Section III & XVIII)
  const [currentSession, setCurrentSession] = useState<CVSessionState | null>(null);
  const [extractedCV, setExtractedCV] = useState<ExtractedCVData | null>(null);
  const [verifiedCV, setVerifiedCV] = useState<ExtractedCVData | null>(null);
  const [parsedJD, setParsedJD] = useState<ParsedJDData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResultData | null>(null);
  const [suggestions, setSuggestions] = useState<CVSuggestionsData | null>(null);
  const [generalReview, setGeneralReview] = useState<GeneralCVReviewData | null>(null);

  // Status & Loading states (Section XXI)
  const [loadingStepText, setLoadingStepText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [isRealCvMode, setIsRealCvMode] = useState(false);

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [activeTab, setActiveTab] = useState<'match' | 'suggestions' | 'missing' | 'strengths'>('match');
  const [generalActiveTab, setGeneralActiveTab] = useState<'relevance' | 'layout' | 'recommendations' | 'extracted'>('relevance');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Edit form states for Verification Modal (Section VIII)
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editMajor, setEditMajor] = useState('');
  const [editSkillsText, setEditSkillsText] = useState('');

  // Archive state (Mục lưu trữ thông tin CV đã tải lên)
  const [storedSessions, setStoredSessions] = useState<CVSessionState[]>([]);
  const [previewSession, setPreviewSession] = useState<CVSessionState | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<CVSessionState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to refresh stored CV sessions list
  const refreshStoredSessions = useCallback(() => {
    const list = getStoredCVSessions();
    setStoredSessions(list);
  }, []);

  // 🔄 1. Reset toàn bộ trạng thái kết quả phân tích AI và session hiện tại
  const handleResetSession = useCallback(() => {
    setCurrentSession(null);
    setExtractedCV(null);
    setVerifiedCV(null);
    setParsedJD(null);
    setMatchResult(null);
    setSuggestions(null);
    setGeneralReview(null);
    setGeminiError(null);
    setIsRealCvMode(false);
    setIsUploading(false);
  }, []);

  // 🗑️ Xóa CV hiện tại và làm sạch toàn bộ kết quả phân tích AI trước đó (Reset State on Change)
  const handleClearActiveCV = useCallback(() => {
    handleResetSession();
    try {
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

    window.dispatchEvent(
      new CustomEvent('ptit_cv_updated', {
        detail: { action: 'cleared_active' },
      })
    );
  }, [handleResetSession, onUpdateUserProfile]);

  // 🔄 ĐỒNG BỘ KHI THAY ĐỔI HOẶC CHỌN THÊM JD MỤC TIÊU
  const prevTargetJobIdRef = useRef<string | null>(currentTargetJob?.id || null);

  useEffect(() => {
    const currentId = currentTargetJob?.id || null;
    if (prevTargetJobIdRef.current !== currentId) {
      console.log('[AI CV] Target Job changed from', prevTargetJobIdRef.current, 'to', currentId);
      prevTargetJobIdRef.current = currentId;

      // Khi thay đổi JD mục tiêu: giữ nguyên file CV, chỉ reset kết quả so sánh JD cũ
      setParsedJD(null);
      setMatchResult(null);
      setSuggestions(null);

      if (currentId && currentSession) {
        setCurrentSession((prev) =>
          prev
            ? {
                ...prev,
                targetJobId: currentTargetJob?.id || null,
                targetJobTitle: currentTargetJob?.title || null,
                targetCompany: currentTargetJob?.company || null,
              }
            : null
        );
      }
    }
  }, [currentTargetJob, currentSession]);

  // On mount: refresh archive & restore last active session if valid
  useEffect(() => {
    refreshStoredSessions();

    const handleCvSync = () => {
      refreshStoredSessions();
      const allStored = getStoredCVSessions();
      if (allStored.length === 0) {
        handleResetSession();
        localStorage.removeItem('ptit_last_cv_session_id');
      }
    };
    window.addEventListener('ptit_cv_updated', handleCvSync);
    window.addEventListener('storage', handleCvSync);

    const allStored = getStoredCVSessions();
    const lastSessionId = localStorage.getItem('ptit_last_cv_session_id');

    if (allStored.length === 0) {
      handleResetSession();
      localStorage.removeItem('ptit_last_cv_session_id');
    } else if (lastSessionId && !currentSession) {
      const raw = localStorage.getItem(`ptit_cv_session_${lastSessionId}`);
      if (raw) {
        try {
          const session: CVSessionState = JSON.parse(raw);
          if (session && session.id) {
            setCurrentSession(session);
            setExtractedCV(session.extractedCV || null);
            setVerifiedCV(session.verifiedCV || session.extractedCV || null);
            setIsRealCvMode(Boolean(session.fileName && !session.fileName.startsWith('CV_Mau_')));

            if (currentTargetJob) {
              const isTargetJobMatched = Boolean(
                session.targetJobId && session.targetJobId === currentTargetJob.id
              );
              if (isTargetJobMatched) {
                setParsedJD(session.parsedJD || null);
                setMatchResult(session.matchResult || null);
                setSuggestions(session.suggestions || null);
              } else {
                setParsedJD(null);
                setMatchResult(null);
                setSuggestions(null);
              }
            } else {
              if (session.generalReview) {
                setGeneralReview(session.generalReview);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to restore initial CV session:', e);
        }
      }
    }

    return () => {
      window.removeEventListener('ptit_cv_updated', handleCvSync);
      window.removeEventListener('storage', handleCvSync);
    };
  }, [currentTargetJob, currentSession, handleResetSession, refreshStoredSessions]);

  // Developer console debugging (logs without polluting the user-facing UI)
  useEffect(() => {
    if (currentSession) {
      console.log('[AI DEBUG] Current CV Session:', {
        sessionId: currentSession.id,
        fileName: currentSession.fileName,
        status: currentSession.status,
        candidate: verifiedCV?.candidate?.fullName || extractedCV?.candidate?.fullName,
        targetJob: currentTargetJob?.title || 'Chưa chọn',
        overallMatch: matchResult ? `${matchResult.overallMatch}%` : 'Not matched yet',
        skills: extractedCV?.skills?.map((s) => s.name),
      });
    }
  }, [currentSession, verifiedCV, extractedCV, matchResult, currentTargetJob]);

  // Copy toast notification
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(`Đã sao chép ${label} vào bộ nhớ tạm!`);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const showToast = (text: string) => {
    setCopiedNotification(text);
    setTimeout(() => setCopiedNotification(null), 3500);
  };

  // Re-select a stored CV from the archive
  const handleSelectStoredCv = async (session: CVSessionState) => {
    const isDifferentTarget = Boolean(
      currentTargetJob && session.targetJobId && session.targetJobId !== currentTargetJob.id
    );

    const activeSession: CVSessionState = {
      ...session,
      targetJobId: currentTargetJob?.id || null,
      targetJobTitle: currentTargetJob?.title || null,
      targetCompany: currentTargetJob?.company || null,
    };

    setCurrentSession(activeSession);
    const cvData: any = session.verifiedCV || session.extractedCV;
    setExtractedCV(session.extractedCV || null);
    setVerifiedCV(session.verifiedCV || session.extractedCV || null);
    setGeminiError(null);
    setIsRealCvMode(Boolean(session.fileName && !session.fileName.startsWith('CV_Mau_')));
    localStorage.setItem('ptit_last_cv_session_id', session.id);

    if (currentTargetJob) {
      setParsedJD(isDifferentTarget ? null : (session.parsedJD || null));
      setMatchResult(isDifferentTarget ? null : (session.matchResult || null));
      setSuggestions(isDifferentTarget ? null : (session.suggestions || null));
    } else {
      if (session.generalReview) {
        setGeneralReview(session.generalReview);
      } else if (cvData) {
        // Tự động phân tích tổng quan nếu session cũ chưa có
        try {
          setIsProcessing(true);
          setLoadingStepText('Đang thẩm định tổng quan bố cục và thông tin CV...');
          const genReview = await analyzeGeneralCV(cvData);
          setGeneralReview(genReview);
          const updatedWithGen = { ...activeSession, generalReview: genReview };
          setCurrentSession(updatedWithGen);
          saveCVSession(userProfile?.uid || 'guest', updatedWithGen);
        } catch (e) {
          console.warn('Lỗi phân tích tổng quan khi chọn lại CV:', e);
        } finally {
          setIsProcessing(false);
          setLoadingStepText('');
        }
      }
    }

    const skillsList = [
      ...(Array.isArray(cvData?.skills) ? cvData.skills.map((s: any) => s?.name || s) : []),
      ...(Array.isArray(cvData?.skills?.hardSkills) ? cvData.skills.hardSkills : []),
      ...(Array.isArray(cvData?.skills?.softSkills) ? cvData.skills.softSkills : []),
    ].filter(Boolean);

    const expsList = Array.isArray(cvData?.experiences)
      ? cvData.experiences
      : Array.isArray(cvData?.workExperience)
      ? cvData.workExperience
      : [];

    if (onUpdateUserProfile && session.fileName) {
      onUpdateUserProfile({
        cvFileName: session.fileName,
        cvFileSize: session.fileSize,
        cvUploadedAt: session.uploadedAt,
        cvSkills: skillsList,
        cvExperiencesCount: expsList.length,
        cvExperiences: expsList,
        cvExtractedText: cvData?.candidate?.fullName
          ? `Ứng viên: ${cvData.candidate.fullName}\n${currentTargetJob ? `Mục tiêu: ${currentTargetJob.title}` : 'Đánh giá: Thẩm định tổng quan bố cục & thông tin'}`
          : `Đã nạp file CV: ${session.fileName}`,
      });
    }

    // Đồng bộ lập tức sang Career Map
    window.dispatchEvent(
      new CustomEvent('ptit_cv_updated', {
        detail: { action: 'selected', session: activeSession },
      })
    );

    showToast(`✨ Đã kích hoạt file CV "${session.fileName}"!`);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Remove/Delete a stored CV from archive
  const handleConfirmDeleteCv = async (session: CVSessionState) => {
    await deleteCVSession(userProfile?.uid || 'guest', session.id);

    // Tính danh sách các CV còn lại sau khi xóa
    const remaining = storedSessions.filter((s) => s.id !== session.id);

    if (remaining.length === 0) {
      // ĐÃ XÓA HẾT VÀ KHÔNG CÒN FILE CV NÀO:
      handleClearActiveCV();
    } else {
      // VẪN CÒN >= 1 FILE CV TRONG KHO:
      if (currentSession?.id === session.id) {
        // Đang xóa đúng file CV đang phân tích -> Reset sạch kết quả AI và quay về màn hình chờ upload
        handleClearActiveCV();
      } else {
        window.dispatchEvent(
          new CustomEvent('ptit_cv_updated', {
            detail: { action: 'deleted', remainingCount: remaining.length },
          })
        );
      }
    }

    refreshStoredSessions();
    setSessionToDelete(null);
    showToast(`🗑️ Đã xóa file CV "${session.fileName}" và làm sạch dữ liệu khỏi hệ thống!`);
  };

  // ==================== PIPELINE 1: USER UPLOAD PDF -> GEMINI PARSER ====================
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check MIME type: strictly PDF
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setGeminiError('Vui lòng tải lên CV định dạng PDF.');
      return;
    }

    // Check file size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setGeminiError('Tệp PDF vượt quá dung lượng cho phép (tối đa 10MB).');
      return;
    }

    // 1. Tạo CV session mới & xóa sạch state cũ
    const sessionId = crypto.randomUUID();
    const uploadedAt =
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ', ' +
      new Date().toLocaleDateString('vi-VN');

    const newSession: CVSessionState = {
      id: sessionId,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt,
      status: 'parsing_cv',
      extractedCV: null,
      targetJobId: currentTargetJob?.id || null,
      targetJobTitle: currentTargetJob?.title || null,
      targetCompany: currentTargetJob?.company || null,
    };

    setCurrentSession(newSession);
    setExtractedCV(null);
    setVerifiedCV(null);
    setParsedJD(null);
    setMatchResult(null);
    setSuggestions(null);
    setGeneralReview(null);
    setGeminiError(null);
    setIsRealCvMode(true);
    setIsUploading(true);
    setIsProcessing(true);

    try {
      // Step 1: Upload & Read PDF
      setLoadingStepText('Đang tải tệp PDF lên hệ thống...');
      await new Promise((r) => setTimeout(r, 350));
      setLoadingStepText('Đang đọc và giải mã nội dung file PDF...');

      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Step 2: Extract CV with Gemini
      setLoadingStepText('Đang trích xuất thông tin ứng viên bằng AI...');
      const cvJson = await parseCVFromPDF(base64Data, file.name);

      setExtractedCV(cvJson);
      setVerifiedCV(JSON.parse(JSON.stringify(cvJson))); // clone for verification

      // Pre-fill verification form
      setEditFullName(cvJson.candidate?.fullName || '');
      setEditEmail(cvJson.candidate?.email || '');
      setEditPhone(cvJson.candidate?.phone || '');
      setEditSchool(cvJson.education?.[0]?.school || '');
      setEditMajor(cvJson.education?.[0]?.major || '');
      setEditSkillsText(cvJson.skills?.map((s) => s.name).join(', ') || '');

      let updatedSession: CVSessionState;

      if (currentTargetJob) {
        // Phân tích đối chiếu theo JD mục tiêu
        setLoadingStepText(`Đang đọc yêu cầu tuyển dụng: ${currentTargetJob.title}...`);
        const jdData = await parseJobDescription(currentTargetJob);
        setParsedJD(jdData);

        setLoadingStepText(`Đang đối chiếu CV với JD "${currentTargetJob.title}"...`);
        const matchRes = await analyzeCVMatch(cvJson, jdData);
        setMatchResult(matchRes);

        setLoadingStepText('Đang tạo gợi ý tối ưu hóa CV theo JD...');
        const suggRes = await generateCVSuggestions(cvJson, jdData, matchRes);
        setSuggestions(suggRes);

        setLoadingStepText('Đang hoàn thiện nhận xét...');
        await new Promise((r) => setTimeout(r, 250));

        updatedSession = {
          ...newSession,
          status: 'completed',
          extractedCV: cvJson,
          parsedJD: jdData,
          matchResult: matchRes,
          suggestions: suggRes,
        };
      } else {
        // Phân tích tổng quan khi chưa chọn JD mục tiêu: Đánh giá bố cục & tính cần thiết của thông tin
        setLoadingStepText('AI đang thẩm định tổng quan về bố cục và tính cần thiết của các thông tin trong CV...');
        const genReview = await analyzeGeneralCV(cvJson);
        setGeneralReview(genReview);

        setLoadingStepText('Đang hoàn thiện nhận xét...');
        await new Promise((r) => setTimeout(r, 250));

        updatedSession = {
          ...newSession,
          status: 'completed',
          extractedCV: cvJson,
          generalReview: genReview,
        };
      }

      setCurrentSession(updatedSession);
      saveCVSession(userProfile?.uid || 'guest', updatedSession);
      refreshStoredSessions();

      if (onUpdateUserProfile) {
        onUpdateUserProfile({
          cvFileName: file.name,
          cvFileSize: file.size,
          cvUploadedAt: uploadedAt,
          cvExtractedText: `Ứng viên: ${cvJson.candidate?.fullName || 'Chưa nhận diện'}\n${currentTargetJob ? `Mục tiêu: ${currentTargetJob.title}` : 'Đánh giá: Thẩm định tổng quan bố cục & thông tin'}`,
        });
      }

      try {
        confetti({ particleCount: 45, spread: 65, origin: { y: 0.65 } });
      } catch {}
      showToast('✨ Tải lên và phân tích CV thành công!');
    } catch (err: any) {
      console.error('Lỗi khi đọc file CV PDF:', err);
      setGeminiError(
        err?.message || 'Không thể đọc nội dung CV. Vui lòng kiểm tra lại file PDF.'
      );
      if (currentSession) {
        setCurrentSession({ ...currentSession, status: 'error', errorMessage: err?.message });
      }
    } finally {
      setIsProcessing(false);
      setIsUploading(false);
      setLoadingStepText('');
    }
  };

  // ==================== PIPELINE 2: JD PARSER & MATCHING ====================
  const handleRunMatching = async () => {
    if (!currentTargetJob) {
      showToast('⚠️ Vui lòng chọn một công việc mục tiêu trước khi phân tích.');
      onNavigate('jobs');
      return;
    }
    const cvToAnalyze = verifiedCV || extractedCV;
    if (!cvToAnalyze) return;

    setIsProcessing(true);
    setGeminiError(null);

    try {
      // Loading State for JD & Matching (Section XXI)
      setLoadingStepText('Đang đọc yêu cầu tuyển dụng (JD Parser)...');
      const jdData = await parseJobDescription(currentTargetJob);
      setParsedJD(jdData);

      setLoadingStepText('Đang đối chiếu từng yêu cầu CV với JD (CV-JD Matching)...');
      const matchRes = await analyzeCVMatch(cvToAnalyze, jdData);
      setMatchResult(matchRes);

      setLoadingStepText('Đang tạo gợi ý cải thiện CV (AI Optimization)...');
      const suggRes = await generateCVSuggestions(cvToAnalyze, jdData, matchRes);
      setSuggestions(suggRes);

      setLoadingStepText('Hoàn tất.');
      await new Promise((r) => setTimeout(r, 400));

      if (currentSession) {
        const completedSession: CVSessionState = {
          ...currentSession,
          status: 'completed',
          parsedJD: jdData,
          matchResult: matchRes,
          suggestions: suggRes,
        };
        setCurrentSession(completedSession);
        saveCVSession(userProfile?.uid || 'guest', completedSession);
        refreshStoredSessions();
      }

      try {
        confetti({ particleCount: 45, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      console.error('Lỗi phân tích đối chiếu CV - JD:', err);
      setGeminiError(
        err?.message || 'Không thể hoàn thành đối chiếu CV với JD bằng AI.'
      );
    } finally {
      setIsProcessing(false);
      setLoadingStepText('');
    }
  };

  // ==================== PIPELINE 3: CV VERIFICATION SAVE ====================
  const handleSaveVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedCV) return;

    const newSkills = editSkillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((skillName) => ({
        name: skillName,
        category: 'Chuyên môn',
        evidence: 'Người dùng xác nhận bổ sung',
        source: 'user_verified' as const,
      }));

    const updated: ExtractedCVData = {
      ...verifiedCV,
      candidate: {
        ...verifiedCV.candidate,
        fullName: editFullName.trim() || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
      },
      education: [
        {
          school: editSchool.trim() || (verifiedCV.education?.[0]?.school || ''),
          major: editMajor.trim() || null,
          degree: verifiedCV.education?.[0]?.degree || null,
          startDate: verifiedCV.education?.[0]?.startDate || null,
          endDate: verifiedCV.education?.[0]?.endDate || null,
          description: verifiedCV.education?.[0]?.description || null,
          source: 'user_verified',
        },
      ],
      skills: newSkills.length > 0 ? newSkills : verifiedCV.skills,
    };

    setVerifiedCV(updated);
    setIsVerificationModalOpen(false);

    if (currentSession) {
      const updatedSession: CVSessionState = {
        ...currentSession,
        status: 'user_verified',
        verifiedCV: updated,
      };
      setCurrentSession(updatedSession);
      saveCVSession(userProfile?.uid || 'guest', updatedSession);
      refreshStoredSessions();
    }

    setCopiedNotification('Đã cập nhật dữ liệu xác thực (source = user_verified)!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Demo Mode (Sample PTIT CV)
  const handleUseSampleCv = () => {
    setIsRealCvMode(false);
    setGeminiError(null);
    const availableName = userProfile?.displayName?.trim() || 'Người dùng';
    const fileName = `CV_Mau_${availableName.replace(/\s+/g, '_')}.pdf`;
    const uploadedAt = 'Vừa cập nhật';

    const sampleCV: ExtractedCVData = {
      candidate: {
        fullName: availableName,
        email: '',
        phone: '',
        location: '',
        linkedin: null,
        portfolio: null,
      },
      careerObjective: '',
      education: [],
      workExperience: [],
      internships: [],
      projects: [],
      activities: [],
      skills: [],
      certifications: [],
      languages: [],
      achievements: [],
      extractedKeywords: [],
      confidence: {
        overall: 1.0,
        candidateName: 1.0,
        education: 0,
        experience: 0,
        skills: 0,
      },
      missingInformation: [
        'Chưa có thông tin học vấn',
        'Chưa có kinh nghiệm làm việc hoặc hoạt động',
        'Chưa liệt kê kỹ năng chuyên môn',
      ],
    };

    setExtractedCV(sampleCV);
    setVerifiedCV(sampleCV);
    setEditFullName(availableName);
    setEditEmail('');
    setEditPhone('');
    setEditSchool('');
    setEditMajor('');
    setEditSkillsText('');

    const newSession: CVSessionState = {
      id: crypto.randomUUID(),
      fileName,
      fileSize: 154000,
      uploadedAt,
      status: 'cv_parsed',
      extractedCV: sampleCV,
      targetJobId: currentTargetJob?.id || 'target-job',
      targetJobTitle: currentTargetJob?.title || 'Công việc mục tiêu',
      targetCompany: currentTargetJob?.company || 'Doanh nghiệp đối tác PTIT',
    };

    setCurrentSession(newSession);
    saveCVSession(userProfile?.uid || 'guest', newSession);
    refreshStoredSessions();
  };

  // Grouped Match Items (Section XIII & XVII)
  const matchedSkills = useMemo(() => {
    return matchResult?.matchItems.filter((i) => i.status === 'matched') || [];
  }, [matchResult]);

  const partialSkills = useMemo(() => {
    return (
      matchResult?.matchItems.filter(
        (i) => i.status === 'partial' || i.status === 'uncertain'
      ) || []
    );
  }, [matchResult]);

  const notFoundSkills = useMemo(() => {
    return matchResult?.matchItems.filter((i) => i.status === 'not_found') || [];
  }, [matchResult]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#131B2E] tracking-tight">
            Phân tích & Tối ưu hóa CV với AI
          </h1>
        </div>

      </div>

      {/* AI Error Alert Banner (Section XX: Báo lỗi trung thực) */}
      {geminiError && (
        <div className="p-5 rounded-2xl bg-red-50/90 border border-red-200 text-red-900 flex items-start gap-3.5 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-red-900">
              Không thể phân tích CV bằng AI
            </h4>
            <p className="text-xs text-red-700 leading-relaxed font-medium">
              {geminiError}
            </p>
            <p className="text-[11px] text-red-500 pt-0.5">
              Hệ thống tuyệt đối không dùng dữ liệu giả lập (mock data) khi tải CV thật. Vui lòng kiểm tra lại file PDF hoặc kết nối mạng.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: KHU VỰC TẢI FILE CV LÊN (FILE UPLOAD AREA) */}
      <div className="space-y-6">
        {/* BANNER THÔNG TIN JD MỤC TIÊU HOẶC CHẾ ĐỘ THẨM ĐỊNH TỔNG QUAN */}
        {currentTargetJob ? (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ĐÃ KÍCH HOẠT JD MỤC TIÊU
                </span>
                <span className="text-xs text-purple-200 hidden md:inline">
                  Dữ liệu tuyển dụng sẽ được nạp trực tiếp vào AI để đối chiếu 1:1
                </span>
              </div>

              <button
                onClick={() => {
                  onNavigate('jobs');
                }}
                className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                title="Chọn vị trí công việc khác làm mục tiêu"
              >
                <span>🎯 Đổi công việc mục tiêu</span>
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>{currentTargetJob?.title || 'Công việc mục tiêu'}</span>
                </h3>
                <p className="text-xs text-purple-200 font-medium flex flex-wrap items-center gap-2">
                  <span>{currentTargetJob?.company || currentTargetJob?.companyName || 'Doanh nghiệp'}</span>
                  <span>•</span>
                  <span>{currentTargetJob?.location || 'Hà Nội'}</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-300">{currentTargetJob?.salaryDisplay || 'Thỏa thuận'}</span>
                </p>
              </div>
            </div>

            {/* Required skills tags */}
            {((currentTargetJob?.requiredSkills && currentTargetJob.requiredSkills.length > 0) || (currentTargetJob?.skillTags && currentTargetJob.skillTags.length > 0)) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {((currentTargetJob?.requiredSkills || currentTargetJob?.skillTags) || []).slice(0, 6).map((sk, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[11px] font-medium border border-white/10">
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-rose-50/40 border border-purple-200/90 text-[#131B2E] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-purple-600 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  CHẾ ĐỘ THẨM ĐỊNH TỔNG QUAN CV
                </span>
                <span className="text-xs text-purple-950 font-bold hidden sm:inline">
                  Chưa chọn việc mục tiêu cụ thể
                </span>
              </div>

              <button
                onClick={() => onNavigate('jobs')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                <Target className="w-3.5 h-3.5" />
                <span>🎯 Chọn công việc mục tiêu (Đối chiếu 1:1 theo JD)</span>
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              💡 <strong>Bạn có thể thoải mái tải CV lên để AI phân tích ngay:</strong> AI sẽ đánh giá theo cái nhìn tổng quan nhất về cả <strong>bố cục trình bày</strong>, độ trực quan và phân tích chi tiết xem <strong>các thông tin được đưa vào có thực sự cần thiết hay đang bị dư thừa</strong>.
            </p>
          </div>
        )}

        {/* KHUNG TẢI FILE CV LÊN (MỞ KHÓA BÌNH THƯỜNG) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#131B2E] flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-purple-600" />
                  <span>Tải file CV lên</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hỗ trợ định dạng <strong>PDF</strong> (MIME: application/pdf, tối đa 10MB) • Đối chiếu 1:1 với <strong>{currentTargetJob?.title || 'Công việc mục tiêu'}</strong>
                </p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept="application/pdf,.pdf"
              className="hidden"
            />

        {isUploading ? (
          <div className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-purple-400 bg-purple-50/50 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in pointer-events-none select-none">
            <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-lg text-purple-950 flex items-center justify-center gap-2">
                <span>Đang tải CV lên...</span>
              </h3>
              <p className="text-xs sm:text-sm text-purple-800 font-medium max-w-md mx-auto">
                {loadingStepText || 'Đang xử lý nội dung file PDF và phân tích bằng AI...'}
              </p>
            </div>
            <div className="w-full max-w-xs h-2 bg-purple-200/80 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Vui lòng giữ nguyên trang đến khi hệ thống hoàn tất tải và phân tích dữ liệu...
            </p>
          </div>
        ) : currentSession ? (
          /* Active CV Session Card */
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-50/50 via-slate-50 to-indigo-50/30 border border-purple-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-[#131B2E] text-sm sm:text-base break-all">
                      {currentSession.fileName}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                        currentSession.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentSession.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {currentSession.status === 'completed'
                        ? 'Đã đối chiếu JD'
                        : currentSession.status === 'cv_parsed'
                        ? 'Đã đọc CV'
                        : currentSession.status === 'user_verified'
                        ? 'Đã xác nhận'
                        : 'Đang xử lý'}
                    </span>
                    {isRealCvMode && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md">
                        REAL_CV_MODE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tải lên lúc: {currentSession.uploadedAt} • Session: {currentSession.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Tải CV mới</span>
                </button>

                <button
                  onClick={() => {
                    handleClearActiveCV();
                    showToast('🗑️ Đã xóa CV và làm sạch toàn bộ kết quả phân tích AI trước đó.');
                  }}
                  title="Xóa CV này và xóa sạch toàn bộ kết quả phân tích AI"
                  className="px-3 py-2 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa CV</span>
                </button>
              </div>
            </div>

            {/* SECTION VII: HIỂN THỊ DỮ LIỆU CV ĐÃ ĐỌC (Trích xuất nguyên bản, không bịa đặt) */}
            {extractedCV && (
              <div className="pt-4 border-t border-purple-200/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-purple-950">
                      AI đã đọc CV thành công
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const targetCV = verifiedCV || extractedCV;
                        setEditFullName(targetCV?.candidate?.fullName || userProfile?.displayName || '');
                        setEditEmail(targetCV?.candidate?.email || '');
                        setEditPhone(targetCV?.candidate?.phone || '');
                        setEditSchool(targetCV?.education?.[0]?.school || '');
                        setEditMajor(targetCV?.education?.[0]?.major || '');
                        setEditSkillsText(targetCV?.skills?.map((s) => s.name).join(', ') || '');
                        setIsVerificationModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Kiểm tra / Chỉnh sửa thông tin CV</span>
                    </button>

                    {!matchResult && (
                      <button
                        onClick={handleRunMatching}
                        disabled={isProcessing}
                        className="px-4 py-1.5 bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Tiếp tục phân tích JD</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 8 Field Summary Grid (Section VII) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Họ tên:</span>
                    <span className="font-extrabold text-[#131B2E] truncate block">
                      {verifiedCV?.candidate?.fullName || extractedCV.candidate?.fullName || (
                        <span className="text-slate-400 italic">Chưa điền</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Email:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {verifiedCV?.candidate?.email || extractedCV.candidate?.email || (
                        <span className="text-slate-400 italic">Chưa điền</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Trường đại học:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {verifiedCV?.education?.[0]?.school || extractedCV.education?.[0]?.school || (
                        <span className="text-slate-400 italic">Chưa điền</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ngành học:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {verifiedCV?.education?.[0]?.major || extractedCV.education?.[0]?.major || (
                        <span className="text-slate-400 italic">Chưa điền</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Kinh nghiệm:</span>
                    <span className="font-bold text-purple-700">
                      {extractedCV.workExperience?.length || 0} mục
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Dự án:</span>
                    <span className="font-bold text-purple-700">
                      {extractedCV.projects?.length || 0} mục
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Kỹ năng:</span>
                    <span className="font-bold text-purple-700">
                      {verifiedCV?.skills?.length || extractedCV.skills?.length || 0} kỹ năng
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Chứng chỉ:</span>
                    <span className="font-bold text-purple-700">
                      {extractedCV.certifications?.length || 0} chứng chỉ
                    </span>
                  </div>
                </div>

                {/* Skill Pills */}
                {extractedCV.skills && extractedCV.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Kỹ năng trích xuất:</span>
                    {extractedCV.skills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded-md transition-colors"
                        title={sk.evidence}
                      >
                        {sk.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dropzone Placeholder */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-purple-400 bg-slate-50/50 hover:bg-purple-50/20'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 shadow-sm">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#131B2E]">
                Kéo thả file CV PDF vào đây, hoặc <span className="text-purple-600 underline">chọn tệp từ máy tính</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Chỉ chấp nhận file định dạng PDF (Dung lượng tối đa 10MB)
              </p>
            </div>

            {/* Quick Pick from Pre-uploaded CVs (Sync with Archive) */}
            {storedSessions.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 rounded-2xl border border-purple-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-extrabold text-[#131B2E]">
                      Chọn nhanh CV của bạn ({storedSessions.length} tệp)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    Nhấp vào file để chọn hoặc bấm biểu tượng thùng rác để xóa
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {storedSessions.slice(0, 6).map((s) => {
                    const cvData = s.verifiedCV || s.extractedCV;
                    const skillsList = [
                      ...(Array.isArray(cvData?.skills) ? cvData.skills.map((sk: any) => sk.name || sk) : []),
                      ...(Array.isArray(cvData?.skills?.hardSkills) ? cvData.skills.hardSkills : []),
                      ...(Array.isArray(cvData?.skills?.softSkills) ? cvData.skills.softSkills : []),
                    ].filter(Boolean);

                    return (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-white hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 transition-all flex items-center justify-between gap-2 group shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectStoredCv(s)}
                          className="min-w-0 flex-1 flex items-center gap-2.5 text-left cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#131B2E] truncate group-hover:text-purple-900" title={s.fileName}>
                              {s.fileName}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {s.uploadedAt || 'Gần đây'} • {skillsList.length} kỹ năng
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(s);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                          title={`Xóa file CV "${s.fileName}" khỏi hệ thống`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* SECTION: KHO LƯU TRỮ THÔNG TIN CV ĐÃ TẢI LÊN (STORED CV ARCHIVE) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                <FolderArchive className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#131B2E] flex items-center gap-2">
                <span>Kho lưu trữ thông tin CV đã tải lên</span>
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                  {storedSessions.length} tệp
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Xem lại các file CV đã xử lý để chọn lại phân tích hoặc gỡ bỏ khỏi hệ thống bất cứ lúc nào.
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Tải thêm CV mới</span>
          </button>
        </div>

        {storedSessions.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-3 bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">Chưa có tệp CV nào trong kho lưu trữ</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Tải lên file CV (PDF) ở khung phía trên để AI tự động lưu trữ thông tin và phân tích.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storedSessions.map((session) => {
              const isActive = currentSession?.id === session.id;
              const cvData = session.verifiedCV || session.extractedCV;
              const skillsList = [
                ...(Array.isArray(cvData?.skills) ? cvData.skills.map((s: any) => s.name || s) : []),
                ...(Array.isArray(cvData?.skills?.hardSkills) ? cvData.skills.hardSkills : []),
                ...(Array.isArray(cvData?.skills?.softSkills) ? cvData.skills.softSkills : []),
              ].filter(Boolean);

              const experiencesCount = Array.isArray(cvData?.experiences)
                ? cvData.experiences.length
                : Array.isArray(cvData?.workExperience)
                ? cvData.workExperience.length
                : 0;

              const candidateName =
                cvData?.candidate?.fullName ||
                cvData?.candidateInfo?.fullName ||
                userProfile?.displayName ||
                'Chưa nhận diện';

              return (
                <div
                  key={session.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 flex flex-col justify-between ${
                    isActive
                      ? 'border-purple-400 bg-purple-50/25 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header: File info + Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            isActive ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs sm:text-sm text-[#131B2E] truncate" title={session.fileName}>
                            {session.fileName}
                          </h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{session.uploadedAt || 'Gần đây'}</span>
                            {session.fileSize && (
                              <span className="text-slate-400">
                                • {(session.fileSize / 1024).toFixed(0)} KB
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isActive ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md flex items-center gap-1 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đang kích hoạt</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                            Đã lưu trữ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extracted Details Summary */}
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 text-[11px]">Ứng viên:</span>
                        <span className="font-bold text-[#131B2E] truncate max-w-[180px]">{candidateName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 text-[11px]">Dữ liệu đã đọc:</span>
                        <span className="font-medium text-slate-700">
                          <strong>{skillsList.length}</strong> kỹ năng • <strong>{experiencesCount}</strong> kinh nghiệm
                        </span>
                      </div>
                      {session.matchResult?.overallMatch && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                          <span className="text-purple-700 font-bold text-[11px]">Độ khớp với JD:</span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-black rounded-md text-[11px]">
                            {session.matchResult.overallMatch}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Skill tags preview */}
                    {skillsList.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {skillsList.slice(0, 4).map((sk, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-700"
                          >
                            {sk}
                          </span>
                        ))}
                        {skillsList.length > 4 && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                            +{skillsList.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isActive ? (
                      <button
                        disabled
                        className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 opacity-90 cursor-default"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Đang sử dụng</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSelectStoredCv(session)}
                          className="px-3 py-1.5 bg-[#B90013] hover:bg-[#8B0013] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Chọn lại CV này</span>
                        </button>
                        {!currentTargetJob && (
                          <button
                            onClick={() => onNavigate('jobs')}
                            title="Chọn công việc mục tiêu để đối chiếu"
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Target className="w-3 h-3 text-[#B90013]" />
                            <span className="hidden sm:inline">Ghép JD</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewSession(session)}
                        title="Xem thông tin chi tiết CV"
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </button>

                      <button
                        onClick={() => setSessionToDelete(session)}
                        title="Gỡ bỏ CV này"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LOADING STATE INDICATOR (Section XXI) */}
      {isProcessing && (
        <div className="bg-white rounded-3xl p-8 border border-purple-200/80 shadow-sm text-center space-y-3 animate-fade-in">
          <div className="inline-flex p-3 rounded-2xl bg-purple-50 text-purple-700 animate-spin">
            <RefreshCw className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#131B2E]">
            {loadingStepText || 'AI đang xử lý...'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hệ thống đang đọc văn bản thực tế từ file PDF và chuẩn hóa dữ liệu theo cấu trúc bằng AI.
          </p>
        </div>
      )}

      {/* SECTION 2: MATCH RESULT & SUGGESTIONS (Section XI, XVI, XVII) */}
      {Boolean(currentTargetJob && currentSession && matchResult) && (
        <div className="space-y-6">
          {/* HERO SCORE CARD - NO 45% -> 88% PREDICTION (Section XVI) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Score breakdown (5 cols) */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 border border-purple-100 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 block">
                  ĐỘ KHỚP HIỆN TẠI (CV vs JD)
                </span>

                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-purple-800">
                    {matchResult.overallMatch}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    trên thang điểm 100%
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Có thể cải thiện mức độ thể hiện phù hợp bằng cách làm rõ các kinh nghiệm và kỹ năng đã có.
                </p>

                {/* Weighted Breakdown Bars (Section XI) */}
                <div className="pt-2 border-t border-purple-100 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Điểm thành phần theo trọng số chuẩn:
                  </span>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Kỹ năng bắt buộc (40%):</span>
                      <span className="font-bold text-purple-700">
                        {matchResult.breakdown.requiredSkills}/40 đ
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Kinh nghiệm thực tế (25%):</span>
                      <span className="font-bold text-purple-700">
                        {matchResult.breakdown.experience}/25 đ
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Sự phù hợp trách nhiệm (15%):</span>
                      <span className="font-bold text-purple-700">
                        {matchResult.breakdown.responsibilities}/15 đ
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Học vấn & Chuyên ngành (10%):</span>
                      <span className="font-bold text-purple-700">
                        {matchResult.breakdown.education}/10 đ
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Kỹ năng ưu tiên & Công cụ (10%):</span>
                      <span className="font-bold text-purple-700">
                        {matchResult.breakdown.preferredSkills + matchResult.breakdown.keywordsAndTools}/10 đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary & Principles (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-md">
                    Nhận xét
                  </span>
                  <span className="text-xs text-slate-500">
                    Đối chiếu: <strong>{currentTargetJob?.title || currentSession?.targetJobTitle || 'Công việc mục tiêu'}</strong> ({currentTargetJob?.company || currentTargetJob?.companyName || currentSession?.targetCompany || 'Doanh nghiệp'})
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {matchResult.summary}
                </p>
              </div>
            </div>
          </div>

          {/* TAB SELECTOR */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('match')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'match'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Đối chiếu Kỹ năng CV vs JD ({matchResult.matchItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'suggestions'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gợi ý viết lại trung thực ({suggestions?.bulletImprovements?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('missing')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'missing'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Chưa thể hiện rõ & Cần bổ sung ({notFoundSkills.length + partialSkills.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('strengths')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'strengths'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Điểm mạnh đã có ({suggestions?.strengths?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: MATCH COMPARISON DETAILS (Section XII, XIII, XVII) */}
          {activeTab === 'match' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg">
                  Bảng đối chiếu yêu cầu tuyển dụng với bằng chứng trong CV
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân loại theo 4 trạng thái: <strong>matched</strong> (có bằng chứng rõ ràng), <strong>partial</strong> (đáp ứng một phần), <strong>not_found</strong> (không tìm thấy trong CV).
                </p>
              </div>

              {/* 1. KỸ NĂNG PHÙ HỢP (matched) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kỹ năng phù hợp ({matchedSkills.length})</span>
                </div>

                {matchedSkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {matchedSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-[#131B2E]">
                            ✓ {item.requirement}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                            matched
                          </span>
                        </div>
                        {item.evidence ? (
                          <p className="text-xs text-emerald-950 bg-white/90 p-2.5 rounded-xl border border-emerald-100 italic">
                            Bằng chứng trong CV: "{item.evidence}"
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500">Được đề cập trong nội dung CV</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Không tìm thấy yêu cầu khớp hoàn toàn.</p>
                )}
              </div>

              {/* 2. CHƯA THỂ HIỆN RÕ (partial / uncertain) */}
              {partialSkills.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Chưa thể hiện rõ ({partialSkills.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {partialSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#131B2E]">
                            △ {item.requirement}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">
                            {item.status}
                          </span>
                        </div>
                        {item.evidence && (
                          <p className="text-xs text-amber-950 bg-white/90 p-2 rounded-lg italic">
                            "{item.evidence}"
                          </p>
                        )}
                        <p className="text-[11px] text-amber-700">
                          CV có thông tin liên quan nhưng cần làm rõ thêm để đáp ứng đầy đủ yêu cầu JD.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. CHƯA TÌM THẤY (not_found) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-red-800 uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Chưa tìm thấy trong CV ({notFoundSkills.length})</span>
                </div>

                {notFoundSkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {notFoundSkills.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-red-50/30 border border-red-200/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#131B2E]">
                            × {item.requirement}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800">
                            not_found
                          </span>
                        </div>
                        <p className="text-[11px] text-red-700">
                          Không tìm thấy bằng chứng trong file PDF. AI không tự ý suy đoán ứng viên có kỹ năng này.
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-bold">Tất cả các tiêu chí cốt lõi đều được tìm thấy trong CV.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI REWRITE SUGGESTIONS (Section XIV & XV: Không bịa đặt số liệu) */}
          {activeTab === 'suggestions' && suggestions && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg">
                  Gợi ý viết lại câu dựa trên thông tin thực tế đã có trong CV
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tập trung cải thiện động từ hành động và cách trình bày. <strong>Tuyệt đối không tự bịa đặt số liệu, KPI hay thành tích mới.</strong>
                </p>
              </div>

              <div className="space-y-4">
                {suggestions.bulletImprovements.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 bg-red-50/40 rounded-xl border border-red-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
                          Câu trích xuất từ CV:
                        </span>
                        <p className="text-slate-700 line-through">"{b.original}"</p>
                      </div>

                      <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                          AI đề xuất viết lại (Trung thực, không bịa KPI):
                        </span>
                        <p className="text-slate-900 font-bold">"{b.improved}"</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 text-[11px] italic">
                        {b.reason}
                      </span>
                      <button
                        onClick={() => handleCopyText(b.improved, 'câu viết lại')}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Sao chép câu</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MISSING & TO ACQUIRE (Section XIV) */}
          {activeTab === 'missing' && suggestions && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg">
                  Kỹ năng JD yêu cầu nhưng CV chưa thể hiện
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đây là các tiêu chí JD yêu cầu nhưng chưa tìm thấy bằng chứng trong CV. Không được biến thành kỹ năng hiện tại nếu bạn chưa thực hành.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.skillsToAcquire.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2"
                  >
                    <span className="font-extrabold text-sm text-[#131B2E] block">
                      {item.skill}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>

              {suggestions.missingElements && suggestions.missingElements.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Nội dung đang thiếu và lời khuyên bổ sung:
                  </h4>
                  <div className="space-y-2 text-xs">
                    {suggestions.missingElements.map((m, idx) => (
                      <div key={idx} className="p-3 bg-red-50/40 rounded-xl border border-red-100">
                        <strong className="text-red-900 block">{m.requirement}</strong>
                        <p className="text-slate-600 mt-0.5">{m.advice}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STRENGTHS (Section XIV) */}
          {activeTab === 'strengths' && suggestions && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg">
                  Điểm mạnh đã được ghi nhận trong CV
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chỉ sử dụng thông tin thực tế xuất hiện trong file CV PDF đã tải lên.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.strengths.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-2"
                  >
                    <h4 className="font-extrabold text-sm text-purple-950">{s.title}</h4>
                    {s.evidence && (
                      <p className="text-xs text-purple-900 bg-white/90 p-2 rounded-lg italic">
                        Dẫn chứng: "{s.evidence}"
                      </p>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed">{s.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2B: THẨM ĐỊNH TỔNG QUAN CV (KHI CHƯA CHỌN CÔNG VIỆC MỤC TIÊU) */}
      {Boolean(!currentTargetJob && currentSession && (generalReview || currentSession?.generalReview)) && (() => {
        const activeGen = generalReview || currentSession?.generalReview;
        if (!activeGen) return null;

        return (
          <div className="space-y-6 animate-fade-in">
            {/* HERO SCORE CARD - THẨM ĐỊNH TỔNG QUAN */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Score breakdown (5 cols) */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 border border-purple-100 space-y-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 block">
                    ĐIỂM THẨM ĐỊNH CHẤT LƯỢNG CV TỔNG QUAN
                  </span>

                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-purple-800">
                      {activeGen.overallScore}%
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      trên thang điểm 100%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Đánh giá toàn diện dựa trên tiêu chuẩn tuyển dụng: Bố cục trực quan, tính cần thiết và mức độ chắt lọc thông tin.
                  </p>

                  {/* 4 Score Breakdown Bars */}
                  <div className="pt-2 border-t border-purple-100 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Điểm thành phần theo 4 tiêu chí cốt lõi:
                    </span>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Bố cục & Trình bày:</span>
                        <span className="font-bold text-purple-700">
                          {activeGen.breakdown.layout}/25 đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Chất lượng & Chi tiết nội dung:</span>
                        <span className="font-bold text-purple-700">
                          {activeGen.breakdown.contentQuality}/25 đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Tính cần thiết & Chắt lọc thông tin:</span>
                        <span className="font-bold text-purple-700">
                          {activeGen.breakdown.relevance}/25 đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Thành tựu & Bằng chứng thực tế:</span>
                        <span className="font-bold text-purple-700">
                          {activeGen.breakdown.impact}/25 đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary & Recommendations (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-md">
                      Nhận xét
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Thẩm định tổng quan về bố cục và tính cần thiết của thông tin
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {activeGen.summary}
                  </p>

                  {/* CTA Card to Connect with a Job */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#B90013]" />
                        <span>Muốn kiểm tra tỷ lệ khớp với vị trí cụ thể?</span>
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Chọn một công việc mục tiêu để AI đối chiếu từng từ khóa 1:1 theo bản mô tả JD.
                      </p>
                    </div>

                    <button
                      onClick={() => onNavigate('jobs')}
                      className="px-3.5 py-2 bg-[#B90013] hover:bg-[#A30010] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>🎯 Chọn việc mục tiêu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR FOR GENERAL REVIEW */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setGeneralActiveTab('relevance')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  generalActiveTab === 'relevance'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  Tính cần thiết của thông tin ({activeGen.informationAudit.redundantOrUnnecessaryInfo.length + activeGen.informationAudit.valuableInfo.length})
                </span>
              </button>

              <button
                onClick={() => setGeneralActiveTab('layout')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  generalActiveTab === 'layout'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Đánh giá Bố cục & Trình bày</span>
              </button>

              <button
                onClick={() => setGeneralActiveTab('recommendations')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  generalActiveTab === 'recommendations'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gợi ý hoàn thiện ({activeGen.keyRecommendations.length})</span>
              </button>

              <button
                onClick={() => setGeneralActiveTab('extracted')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  generalActiveTab === 'extracted'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Dữ liệu CV đã trích xuất</span>
              </button>
            </div>

            {/* TAB 1: TÍNH CẦN THIẾT CỦA THÔNG TIN (CORE REQUEST) */}
            {generalActiveTab === 'relevance' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                <div>
                  <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    <span>Thẩm định tính cần thiết của từng phần thông tin đưa vào CV</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    AI phân loại chi tiết các thông tin dư thừa nên lược bỏ, các thông tin giá trị cần giữ lại, và những nội dung quan trọng đang bị thiếu.
                  </p>
                </div>

                {/* 1. THÔNG TIN KHÔNG CẦN THIẾT / DƯ THỪA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-red-800 uppercase tracking-wider">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Thông tin không cần thiết / Dư thừa (Nên cắt bỏ hoặc rút gọn) ({activeGen.informationAudit.redundantOrUnnecessaryInfo.length})</span>
                  </div>

                  {activeGen.informationAudit.redundantOrUnnecessaryInfo.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {activeGen.informationAudit.redundantOrUnnecessaryInfo.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-red-50/40 border border-red-200/90 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800">
                              Mục: {item.section}
                            </span>
                            <span className="text-[10px] font-bold text-red-600 uppercase">
                              Dư thừa / Làm loãng CV
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-red-950">
                            "{item.item}"
                          </h4>

                          <p className="text-xs text-slate-700 leading-relaxed bg-white/90 p-2.5 rounded-xl border border-red-100">
                            <strong className="text-red-900 block mb-0.5">Lý do không cần thiết:</strong>
                            {item.reason}
                          </p>

                          <div className="text-xs text-slate-800 bg-white/90 p-2.5 rounded-xl border border-red-100">
                            <strong className="text-emerald-800 block mb-0.5">Đề xuất xử lý:</strong>
                            {item.suggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-bold">Không phát hiện thông tin dư thừa rõ rệt trong CV.</p>
                  )}
                </div>

                {/* 2. THÔNG TIN CẦN THIẾT & ĐẮT GIÁ */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Thông tin cần thiết & Đắt giá (Nên giữ lại và phát huy) ({activeGen.informationAudit.valuableInfo.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeGen.informationAudit.valuableInfo.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200/90 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                            Mục: {item.section}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                            Giá trị cao
                          </span>
                        </div>

                        <h4 className="font-extrabold text-sm text-emerald-950">
                          {item.item}
                        </h4>

                        <p className="text-xs text-slate-700 leading-relaxed bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                          <strong className="text-emerald-900 block mb-0.5">Tại sao quan trọng:</strong>
                          {item.whyImportant}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. THÔNG TIN QUAN TRỌNG ĐANG BỊ THIẾU */}
                {activeGen.informationAudit.missingCrucialInfo.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span>Thông tin quan trọng đang thiếu (Nên bổ sung ngay) ({activeGen.informationAudit.missingCrucialInfo.length})</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {activeGen.informationAudit.missingCrucialInfo.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/90 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">
                              Mục: {item.section}
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 uppercase">
                              Cần bổ sung
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-amber-950">
                            {item.item}
                          </h4>

                          <p className="text-xs text-slate-700 leading-relaxed bg-white/90 p-2.5 rounded-xl border border-amber-100">
                            <strong className="text-amber-900 block mb-0.5">Vì sao nhà tuyển dụng cần thấy:</strong>
                            {item.whyNeeded}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ĐÁNH GIÁ BỐ CỤC & TRÌNH BÀY */}
            {generalActiveTab === 'layout' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                <div>
                  <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <span>Nhận xét chi tiết về Bố cục & Trình bày</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đánh giá cấu trúc phân mục, tính trực quan, độ thoáng mắt và khả năng tương thích hệ thống quét hồ sơ tự động ATS.
                  </p>
                </div>

                {/* Tổng quan bố cục */}
                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 block">
                    Đánh giá tổng quan cấu trúc:
                  </span>
                  <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed font-medium">
                    {activeGen.layoutReview.assessment}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Điểm mạnh về trình bày */}
                  <div className="p-5 rounded-2xl bg-emerald-50/30 border border-emerald-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Điểm cộng về trình bày ({activeGen.layoutReview.strengths.length})</span>
                    </div>

                    <div className="space-y-2">
                      {activeGen.layoutReview.strengths.map((str, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Điểm cần sửa về bố cục */}
                  <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Điểm cần khắc phục về bố cục ({activeGen.layoutReview.improvements.length})</span>
                    </div>

                    <div className="space-y-2">
                      {activeGen.layoutReview.improvements.map((imp, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white/90 p-2.5 rounded-xl border border-amber-100">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: GỢI Ý HOÀN THIỆN HÀNH ĐỘNG */}
            {generalActiveTab === 'recommendations' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                <div>
                  <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span>Các bước hành động cụ thể để nâng cấp CV</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thực hiện theo các gợi ý dưới đây sẽ giúp CV của bạn trở nên chuyên nghiệp, sắc nét và thu hút nhà tuyển dụng hơn.
                  </p>
                </div>

                <div className="space-y-3">
                  {activeGen.keyRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/40 via-white to-slate-50 border border-purple-100 flex items-start gap-3.5 shadow-2xs"
                    >
                      <div className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed pt-0.5">
                        {rec}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: DỮ LIỆU CV ĐÃ TRÍCH XUẤT */}
            {generalActiveTab === 'extracted' && extractedCV && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                <div>
                  <h3 className="font-extrabold text-[#131B2E] text-base sm:text-lg flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-blue-600" />
                    <span>Dữ liệu thông tin đã trích xuất từ CV</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bản trích xuất có cấu trúc từ tệp PDF gốc của bạn.
                  </p>
                </div>

                {/* Candidate Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Ứng viên:</span>
                    <span className="font-extrabold text-[#131B2E] truncate block">
                      {verifiedCV?.candidate?.fullName || extractedCV.candidate?.fullName || 'Chưa nhận diện'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Email:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {verifiedCV?.candidate?.email || extractedCV.candidate?.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Học vấn:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {verifiedCV?.education?.[0]?.school || extractedCV.education?.[0]?.school || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Chuyên ngành:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {verifiedCV?.education?.[0]?.major || extractedCV.education?.[0]?.major || '—'}
                    </span>
                  </div>
                </div>

                {/* Skills list */}
                {extractedCV.skills && extractedCV.skills.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">Kỹ năng tìm thấy ({extractedCV.skills.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedCV.skills.map((sk, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-purple-50 text-purple-800 text-xs font-semibold rounded-lg border border-purple-200">
                          {sk.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* SECTION VIII: MODAL CV VERIFICATION */}
      {isVerificationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#131B2E]">
                  Kiểm tra & Xác nhận thông tin CV
                </h3>
                <p className="text-xs text-slate-500">
                  Dữ liệu do bạn chỉnh sửa sẽ được đánh dấu <strong>source = "user_verified"</strong>.
                </p>
              </div>
              <button
                onClick={() => setIsVerificationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVerification} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên ứng viên:</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nhập họ và tên của bạn..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 outline-hidden font-medium text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email:</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="email@student.ptit.edu.vn"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0987.xxx.xxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trường đại học:</label>
                  <input
                    type="text"
                    value={editSchool}
                    onChange={(e) => setEditSchool(e.target.value)}
                    placeholder="Học viện Công nghệ Bưu chính Viễn thông"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chuyên ngành đào tạo:</label>
                  <input
                    type="text"
                    value={editMajor}
                    onChange={(e) => setEditMajor(e.target.value)}
                    placeholder="Marketing"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Danh sách kỹ năng (phân tách bởi dấu phẩy):
                </label>
                <textarea
                  rows={3}
                  value={editSkillsText}
                  onChange={(e) => setEditSkillsText(e.target.value)}
                  placeholder="Canva, Content Writing, Google Analytics..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 outline-hidden font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu xác nhận (user_verified)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM CHI TIẾT THÔNG TIN CV ĐÃ LƯU TRỮ */}
      {previewSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#131B2E] break-all">
                    {previewSession.fileName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tải lên lúc: {previewSession.uploadedAt || 'Gần đây'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Info */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ứng viên:</span>
                  <span className="font-extrabold text-slate-900 block truncate">
                    {previewSession.extractedCV?.candidate?.fullName || 'Chưa nhận diện'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Email:</span>
                  <span className="font-medium text-slate-700 block truncate">
                    {previewSession.extractedCV?.candidate?.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Số điện thoại:</span>
                  <span className="font-medium text-slate-700 block truncate">
                    {previewSession.extractedCV?.candidate?.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Trường / Ngành:</span>
                  <span className="font-medium text-slate-700 block truncate">
                    {previewSession.extractedCV?.education?.[0]?.major || userProfile?.major || 'Học viện PTIT'}
                  </span>
                </div>
              </div>

              {/* Career Objective */}
              {previewSession.extractedCV?.careerObjective && (
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
                  <span className="font-bold text-purple-900 uppercase text-[10px] block">Mục tiêu nghề nghiệp:</span>
                  <p className="text-slate-700 text-xs leading-relaxed">{previewSession.extractedCV.careerObjective}</p>
                </div>
              )}

              {/* Skills */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 uppercase text-[11px] block">
                  Kỹ năng trích xuất:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {((previewSession.extractedCV?.skills || []) as any[]).map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold"
                    >
                      {sk.name || sk}
                    </span>
                  ))}
                  {(!previewSession.extractedCV?.skills || previewSession.extractedCV.skills.length === 0) && (
                    <span className="text-slate-400 italic">Chưa có danh sách kỹ năng cụ thể.</span>
                  )}
                </div>
              </div>

              {/* Work Experience */}
              {Array.isArray(previewSession.extractedCV?.experiences) && previewSession.extractedCV.experiences.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 uppercase text-[11px] block">
                    Kinh nghiệm & Dự án:
                  </span>
                  <div className="space-y-2">
                    {previewSession.extractedCV.experiences.map((exp: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-[#131B2E]">
                          <span>{exp.role || exp.position || 'Thực tập sinh'}</span>
                          <span className="text-[11px] text-slate-400">{exp.duration || ''}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{exp.company || 'Doanh nghiệp'}</p>
                        {exp.description && (
                          <p className="text-slate-500 text-[11px] mt-1">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewSession(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 text-xs cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSelectStoredCv(previewSession);
                  setPreviewSession(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#B90013] hover:bg-[#8B0013] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Kích hoạt CV này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN GỠ BỎ CV */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-base text-[#131B2E]">
                Xác nhận gỡ bỏ file CV?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn gỡ bỏ file <strong>"{sessionToDelete.fileName}"</strong> khỏi kho lưu trữ? Dữ liệu trích xuất của file này sẽ bị xóa khỏi bộ nhớ.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDeleteCv(sessionToDelete)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận gỡ bỏ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

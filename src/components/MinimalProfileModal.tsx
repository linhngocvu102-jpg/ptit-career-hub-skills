import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserProfileState, CareerGoalOption, PTIT_MAJORS, sanitizePtitMajor } from '../types';
import { Logo } from './Logo';
import { trackEvent } from '../utils/analytics';
import {
  Sparkles,
  GraduationCap,
  Target,
  ArrowRight,
  Check,
  User,
  BookOpen,
  Calendar,
  AlertCircle,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MinimalProfileModalProps {
  isOpen: boolean;
  initialProfile?: UserProfileState;
  userProfile?: UserProfileState;
  onComplete?: (updated: Partial<UserProfileState>) => void;
  onSave?: (updated: Partial<UserProfileState>) => void;
  onSkip?: () => void;
  onClose?: () => void;
  isForced?: boolean;
}

// Range 2000 - 2010 as requested
const MIN_YEAR = 2000;
const MAX_YEAR = 2010;

// All years from 2000 to 2010
const ALL_YEARS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, idx) => MIN_YEAR + idx
);

const cleanDisplayName = (name?: string | null): string => {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === 'nguyễn văn minh' ||
    lower === 'sinh viên ptit' ||
    lower === 'minh' ||
    lower === 'nguyễn văn a' ||
    lower === 'thu hà'
  ) {
    return '';
  }
  return trimmed;
};

const sanitizeBirthYear = (year?: string | null): string => {
  if (!year) return '';
  const num = parseInt(year, 10);
  if (!isNaN(num) && num >= MIN_YEAR && num <= MAX_YEAR) {
    return String(num);
  }
  return '';
};

const ACADEMIC_YEARS = ['Năm 1', 'Năm 2', 'Năm 3', 'Năm 4'] as const;

export const sanitizeAcademicYear = (year?: string | null): string => {
  if (!year) return '';
  const trimmed = year.trim();
  if (trimmed.startsWith('Năm 1')) return 'Năm 1';
  if (trimmed.startsWith('Năm 2')) return 'Năm 2';
  if (trimmed.startsWith('Năm 3')) return 'Năm 3';
  if (trimmed.startsWith('Năm 4')) return 'Năm 4';
  return '';
};

const CAREER_GOALS: { id: CareerGoalOption; label: string; desc: string }[] = [
  {
    id: 'Chưa biết mình phù hợp nghề gì',
    label: 'Chưa biết mình phù hợp nghề gì',
    desc: 'Cần trắc nghiệm để tìm ra điểm mạnh & định hướng tự nhiên',
  },
  {
    id: 'Đang tìm hiểu các hướng nghề nghiệp',
    label: 'Đang tìm hiểu các hướng nghề nghiệp',
    desc: 'Muốn khám phá các vị trí công việc và lộ trình ngành học',
  },
  {
    id: 'Đã có nghề mục tiêu',
    label: 'Đã có nghề mục tiêu',
    desc: 'Đã xác định vị trí mong muốn, cần lộ trình trau dồi kỹ năng',
  },
  {
    id: 'Đang tìm internship',
    label: 'Đang tìm internship',
    desc: 'Ưu tiên kết nối việc làm thực tập sinh và tạo CV chuẩn',
  },
  {
    id: 'Đang chuẩn bị đi làm',
    label: 'Đang chuẩn bị đi làm',
    desc: 'Chuẩn bị phỏng vấn Fresher/Full-time và hoàn thiện hồ sơ',
  },
];

export const MinimalProfileModal: React.FC<MinimalProfileModalProps> = ({
  isOpen,
  initialProfile,
  userProfile,
  onComplete,
  onSave,
  onSkip,
  onClose,
  isForced: propIsForced,
}) => {
  const profile = userProfile || initialProfile;

  // Determine whether this is a mandatory initial onboarding
  const isForced = useMemo(() => {
    if (typeof propIsForced === 'boolean') return propIsForced;
    if (!profile?.onboardingCompleted) return true;
    if (!profile?.displayName || profile.displayName.trim().length < 2) return true;
    if (!profile?.birthYear) return true;
    if (!profile?.major) return true;
    if (!profile?.academicYear) return true;
    if (!profile?.careerGoal) return true;
    return false;
  }, [propIsForced, profile]);

  const [displayName, setDisplayName] = useState(cleanDisplayName(profile?.displayName));
  const [birthYear, setBirthYear] = useState(sanitizeBirthYear(profile?.birthYear));
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [major, setMajor] = useState(profile?.major ? sanitizePtitMajor(profile?.major) : '');
  const [academicYear, setAcademicYear] = useState(sanitizeAcademicYear(profile?.academicYear));
  const [careerGoal, setCareerGoal] = useState<CareerGoalOption | ''>(
    (profile?.careerGoal as CareerGoalOption) || ''
  );

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);
  const yearPickerContainerRef = useRef<HTMLDivElement>(null);

  // Close year picker popover on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isYearPickerOpen &&
        yearPickerContainerRef.current &&
        !yearPickerContainerRef.current.contains(e.target as Node)
      ) {
        setIsYearPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isYearPickerOpen]);

  useEffect(() => {
    if (isOpen && profile) {
      setDisplayName(cleanDisplayName(profile.displayName));
      const initialBirth = sanitizeBirthYear(profile.birthYear);
      setBirthYear(initialBirth);
      setMajor(profile.major ? sanitizePtitMajor(profile.major) : '');
      setAcademicYear(sanitizeAcademicYear(profile.academicYear));
      setCareerGoal((profile.careerGoal as CareerGoalOption) || '');
      setHasAttemptedSubmit(false);
      setIsYearPickerOpen(false);
    }
  }, [isOpen, profile]);

  // Auto-scroll year list to center on current year when opened
  useEffect(() => {
    if (isYearPickerOpen && scrollContainerRef.current) {
      const timer = setTimeout(() => {
        if (selectedYearRef.current) {
          selectedYearRef.current.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
        } else {
          // If no year selected yet, center view near student college age (e.g. 2005) for easy drag without selecting
          const anchorEl = scrollContainerRef.current?.querySelector('[data-year="2005"]');
          if (anchorEl) {
            anchorEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isYearPickerOpen]);

  // Handle Birth Year change - UNLINKED from Academic Year & Auto-closes on 1-click
  const handleBirthYearChange = (newYear: string) => {
    setBirthYear(newYear);
    setIsYearPickerOpen(false);
  };

  // Validation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!displayName.trim()) {
      errs.displayName = 'Vui lòng nhập họ và tên của bạn';
    } else if (displayName.trim().length < 2) {
      errs.displayName = 'Họ và tên tối thiểu 2 ký tự';
    }

    if (!birthYear) {
      errs.birthYear = 'Vui lòng chọn năm sinh của bạn';
    }

    if (!major) {
      errs.major = 'Vui lòng chọn ngành học của bạn';
    }

    if (!academicYear) {
      errs.academicYear = 'Vui lòng chọn năm học của bạn';
    }

    if (!careerGoal) {
      errs.careerGoal = 'Vui lòng chọn 1 câu trả lời định hướng phía dưới';
    }

    return errs;
  }, [displayName, birthYear, major, academicYear, careerGoal]);

  const isFormValid = Object.keys(errors).length === 0;

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (onClose) onClose();
    else if (onSkip) onSkip();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!isFormValid) {
      return;
    }

    const updated: Partial<UserProfileState> = {
      displayName: displayName.trim(),
      birthYear: birthYear,
      major,
      academicYear: academicYear,
      careerGoal: careerGoal as CareerGoalOption,
      onboardingCompleted: true,
    };

    trackEvent('onboarding_complete', {
      displayName: updated.displayName,
      birthYear: updated.birthYear,
      major: updated.major,
      academicYear: updated.academicYear,
      careerGoal: updated.careerGoal,
    });

    try {
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.6 },
      });
    } catch {
      // silent
    }

    if (onComplete) onComplete(updated);
    if (onSave) onSave(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={handleDismiss}
    >
      <div
        className="bg-white rounded-3xl p-5 sm:p-7 lg:p-8 max-w-xl w-full shadow-2xl border border-slate-100 max-h-[94vh] overflow-y-auto space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Always active to dismiss modal */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Đóng modal"
          aria-label="Đóng modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with PTIT logo & context */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <Logo variant="full" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#131B2E] tracking-tight">
            {isForced ? 'Chào mừng bạn! Hãy hoàn thiện thông tin hồ sơ' : 'Chỉnh sửa thông tin hồ sơ'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Cập nhật tên hoặc nickname, ngành học, năm học và mục tiêu nghề nghiệp của bạn
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* TÊN HOẶC NICKNAME CỦA BẠN */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-800">
              <User className="w-4 h-4 text-[#B90013]" />
              <span>TÊN HOẶC NICKNAME CỦA BẠN</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nhập tên của bạn..."
              className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl border text-sm sm:text-base font-semibold transition-all focus:outline-none bg-white ${
                hasAttemptedSubmit && errors.displayName
                  ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                  : 'border-slate-200 text-slate-800 focus:border-[#B90013] focus:ring-1 focus:ring-[#B90013]'
              }`}
            />
            {hasAttemptedSubmit && errors.displayName && (
              <p className="text-[11px] font-bold text-[#B90013] flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.displayName}</span>
              </p>
            )}
          </div>

          {/* NGÀNH HỌC (KHỐI NGÀNH KINH TẾ PTIT) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-800">
              <BookOpen className="w-4 h-4 text-[#B90013]" />
              <span>NGÀNH HỌC (KHỐI NGÀNH KINH TẾ PTIT)</span>
            </label>
            <div className="relative">
              <select
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className={`w-full px-4 py-3 sm:py-3.5 pr-10 rounded-2xl border text-sm sm:text-base font-semibold transition-all focus:outline-none cursor-pointer appearance-none bg-white ${
                  !major ? 'text-slate-400' : 'text-slate-800'
                } ${
                  hasAttemptedSubmit && errors.major
                    ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                    : 'border-slate-200 focus:border-[#B90013] focus:ring-1 focus:ring-[#B90013]'
                }`}
              >
                <option value="" disabled>
                  Chọn ngành
                </option>
                {PTIT_MAJORS.map((m) => (
                  <option key={m} value={m} className="text-slate-800 font-medium">
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {hasAttemptedSubmit && errors.major && (
              <p className="text-[11px] font-bold text-[#B90013] flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.major}</span>
              </p>
            )}
          </div>

          {/* NĂM SINH & NĂM HỌC HIỆN TẠI (Tối giản 2 cột) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* NĂM SINH */}
            <div className="space-y-1.5 relative" ref={yearPickerContainerRef}>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-800">
                <Calendar className="w-4 h-4 text-[#B90013]" />
                <span>NĂM SINH</span>
              </label>

              <button
                type="button"
                onClick={() => setIsYearPickerOpen((prev) => !prev)}
                className={`w-full px-4 py-3 sm:py-3.5 rounded-2xl border text-sm sm:text-base font-semibold transition-all flex items-center justify-between cursor-pointer bg-white ${
                  hasAttemptedSubmit && errors.birthYear
                    ? 'border-red-400 bg-red-50/20 text-red-900'
                    : isYearPickerOpen
                    ? 'border-[#B90013] ring-1 ring-[#B90013]'
                    : 'border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className={!birthYear ? 'text-slate-400 font-medium' : 'text-slate-800 font-bold truncate'}>
                  {birthYear || 'Chọn năm sinh'}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ml-1 ${
                    isYearPickerOpen ? 'rotate-180 text-[#B90013]' : ''
                  }`}
                />
              </button>

              {/* Panel cuộn năm sinh */}
              {isYearPickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-2.5 z-30 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1.5 border-b border-slate-100">
                    <span>Chọn năm sinh (2000 – 2010)</span>
                    {birthYear && (
                      <span className="text-[11px] font-black text-[#B90013] bg-red-50 px-2 py-0.5 rounded-md">
                        {birthYear}
                      </span>
                    )}
                  </div>
                  <div
                    ref={scrollContainerRef}
                    className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-1.5 no-scrollbar scroll-smooth"
                  >
                    {ALL_YEARS.map((yearNum) => {
                      const yStr = String(yearNum);
                      const isSelected = yStr === birthYear;
                      return (
                        <button
                          type="button"
                          key={yStr}
                          data-year={yStr}
                          ref={isSelected ? selectedYearRef : null}
                          onClick={() => {
                            handleBirthYearChange(yStr);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#B90013] text-white shadow-xs'
                              : 'text-slate-700 hover:bg-white hover:text-[#B90013]'
                          }`}
                        >
                          <span className="text-sm font-bold">{yStr}</span>
                          {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasAttemptedSubmit && errors.birthYear && (
                <p className="text-[11px] font-bold text-[#B90013] flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.birthYear}</span>
                </p>
              )}
            </div>

            {/* NĂM HỌC HIỆN TẠI */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-800">
                <GraduationCap className="w-4 h-4 text-[#B90013]" />
                <span>NĂM HỌC HIỆN TẠI</span>
              </label>
              <div className="relative">
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className={`w-full px-4 py-3 sm:py-3.5 pr-10 rounded-2xl border text-sm sm:text-base font-semibold transition-all focus:outline-none cursor-pointer appearance-none bg-white ${
                    !academicYear ? 'text-slate-400' : 'text-slate-800'
                  } ${
                    hasAttemptedSubmit && errors.academicYear
                      ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                      : 'border-slate-200 focus:border-[#B90013] focus:ring-1 focus:ring-[#B90013]'
                  }`}
                >
                  <option value="" disabled>
                    Chọn năm học
                  </option>
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y} value={y} className="text-slate-800 font-medium">
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {hasAttemptedSubmit && errors.academicYear && (
                <p className="text-[11px] font-bold text-[#B90013] flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.academicYear}</span>
                </p>
              )}
            </div>
          </div>

          {/* MỤC TIÊU HIỆN TẠI CỦA BẠN */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-800">
              <Target className="w-4 h-4 text-[#B90013]" />
              <span>MỤC TIÊU HIỆN TẠI CỦA BẠN</span>
            </label>

            <div className="space-y-2.5">
              {CAREER_GOALS.map((g) => {
                const isSelected = careerGoal === g.id;
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setCareerGoal(g.id)}
                    className={`w-full text-left p-4 sm:p-4.5 rounded-2xl transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#B90013] bg-white shadow-xs'
                        : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#B90013] text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {g.label}
                      </p>
                      <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 leading-relaxed">
                        {g.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {hasAttemptedSubmit && errors.careerGoal && (
              <p className="text-[11px] font-bold text-[#B90013] flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.careerGoal}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 space-y-2.5">
            <button
              type="submit"
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-[#B90013] hover:bg-[#A30010] active:scale-[0.99] text-white font-bold text-sm sm:text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isForced ? 'Bắt đầu trải nghiệm' : 'Lưu thay đổi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Only show skip if NOT forced */}
            {!isForced && (onSkip || onClose) && (
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors text-center cursor-pointer"
              >
                Hủy thay đổi
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { ScreenView, StudentProfile, UserProfileState, TargetJob } from '../../types';
import { TARGET_JOBS } from '../../data/mockData';
import {
  Compass,
  TrendingUp,
  FileText,
  Bookmark,
  CheckCircle2,
  CircleDot,
  Circle,
  Plus,
  Sparkles,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentDashboardViewProps {
  onNavigate: (view: ScreenView) => void;
  profile?: StudentProfile;
  userProfile?: UserProfileState;
  onEditProfile?: () => void;
  onSelectJobDetail?: (job: TargetJob) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  onNavigate,
  profile: propProfile,
  userProfile,
  onEditProfile,
  onSelectJobDetail,
}) => {
  const hasCareerMap = Boolean(
    userProfile?.careerDirection ||
    userProfile?.targetJobTitle ||
    userProfile?.careerCheckCompleted
  );

  const hasCv = Boolean(userProfile?.cvFileName);

  const profile: StudentProfile = {
    name: userProfile?.displayName || propProfile?.name || 'Người dùng',
    careerGoal: hasCareerMap
      ? userProfile?.careerDirection || userProfile?.targetJobTitle || 'Đang xác định'
      : 'Chưa thiết lập',
    currentLevel: userProfile?.academicYear || propProfile?.currentLevel || 'Chưa cập nhật',
    roadmapProgress: hasCareerMap ? (userProfile?.careerCheckCompleted ? 65 : 30) : 0,
    cvMatchScore: hasCv ? (userProfile?.skillGap?.matchScore || 80) : 0,
    topStrengths: userProfile?.skillGap?.strengths || propProfile?.topStrengths || [
      'Tinh thần học hỏi',
      'Kỹ năng số',
    ],
    growthAreas: userProfile?.skillGap?.missingSkills || propProfile?.growthAreas || [],
    nextSteps: propProfile?.nextSteps || [],
    resumeCount: hasCv ? 1 : 0,
    maxResumes: 3,
  };

  const [portfolioStarted, setPortfolioStarted] = useState(false);
  const [savedJobs, setSavedJobs] = useState<TargetJob[]>(() => TARGET_JOBS.filter((j) => j.isSaved));

  // Dynamically personalize recommended jobs based on user profile
  const recommendedJobsList = useMemo(() => {
    const list = [...TARGET_JOBS];
    const userMajor = userProfile?.major?.toLowerCase() || '';
    const userGoal = (userProfile?.careerDirection || userProfile?.careerGoal || '').toLowerCase();

    list.sort((a, b) => {
      let scoreA = 50;
      let scoreB = 50;
      const textA = (a.title + ' ' + (a.jobField || '') + ' ' + (a.description || '')).toLowerCase();
      const textB = (b.title + ' ' + (b.jobField || '') + ' ' + (b.description || '')).toLowerCase();

      if (userMajor) {
        const majorTokens = userMajor.split('&').map((t) => t.trim());
        if (majorTokens.some((t) => t && textA.includes(t))) scoreA += 40;
        if (majorTokens.some((t) => t && textB.includes(t))) scoreB += 40;
      }
      if (userGoal && !userGoal.includes('đang tìm hiểu')) {
        if (textA.includes(userGoal)) scoreA += 30;
        if (textB.includes(userGoal)) scoreB += 30;
      }
      return scoreB - scoreA;
    });

    return list.slice(0, 2);
  }, [userProfile]);

  const handleStartProject = () => {
    setPortfolioStarted(true);
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch (e) {
      // silent
    }
  };

  const handleToggleSave = (jobId: string) => {
    setSavedJobs((prev) => {
      const exists = prev.find((j) => j.id === jobId);
      if (exists) {
        return prev.filter((j) => j.id !== jobId);
      } else {
        const found = TARGET_JOBS.find((j) => j.id === jobId);
        return found ? [...prev, { ...found, isSaved: true }] : prev;
      }
    });
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#131B2E] tracking-tight flex items-center gap-2">
          Chào, {profile.name}! 👋 <span className="font-bold">Tiến độ sự nghiệp</span>
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Dưới đây là tổng quan nhanh về trạng thái hồ sơ và tiến độ sự nghiệp thực tế của bạn.
        </p>
      </div>

      {/* 4 Bento Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Định hướng nghề nghiệp */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
            <span>Định hướng nghề nghiệp</span>
            <div className="w-7 h-7 rounded-full bg-red-50 text-[#B90013] flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#131B2E] truncate" title={profile.careerGoal}>
            {profile.careerGoal}
          </h3>
          <p className="text-[11px] text-slate-400 mt-2">
            {hasCareerMap ? 'Đã kích hoạt lộ trình' : 'Chưa chọn lộ trình cụ thể'}
          </p>
        </div>

        {/* Card 2: Cấp độ hiện tại */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
            <span>Năm học / Cấp độ</span>
            <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0079BB] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#131B2E]">
            {profile.currentLevel}
          </h3>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {userProfile?.major ? userProfile.major : (
              <button
                type="button"
                onClick={onEditProfile}
                className="text-[#B90013] font-bold hover:underline cursor-pointer"
              >
                + Chọn ngành học
              </button>
            )}
          </p>
        </div>

        {/* Card 3: Tiến độ lộ trình */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
            <span>Tiến độ lộ trình</span>
            <span className="font-extrabold text-slate-700">{profile.roadmapProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#B90013] rounded-full transition-all duration-500"
              style={{ width: `${profile.roadmapProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {hasCareerMap ? 'Đang thực hiện các cột mốc' : '0% • Chưa kích hoạt'}
          </p>
        </div>

        {/* Card 4: Điểm khớp CV */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Điểm khớp CV
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-emerald-600">
              {hasCv ? `${profile.cvMatchScore}%` : '—'}
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {hasCv ? (userProfile?.skillGap?.matchScore ? 'Đã đối chiếu' : 'Đã tải lên') : 'Chưa tải CV'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {hasCv ? userProfile?.cvFileName : 'Tải CV để AI chấm điểm ATS'}
          </p>
        </div>
      </div>

      {/* Main Action Grid: Lộ trình của tôi & CV của tôi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lộ trình của tôi (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📖</span>
              <h2 className="text-xl font-bold text-[#131B2E]">Lộ trình của tôi</h2>
            </div>
            <button
              onClick={() => onNavigate('roadmap')}
              className="text-xs sm:text-sm font-bold text-slate-600 hover:text-[#B90013] transition-colors cursor-pointer"
            >
              {hasCareerMap ? 'Xem toàn bộ kế hoạch' : 'Khám phá Career Map'}
            </button>
          </div>

          {!hasCareerMap ? (
            <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 text-center border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#B90013] flex items-center justify-center mx-auto font-bold">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">
                Bạn chưa kích hoạt Lộ trình nghề nghiệp
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Dựa trên thông tin ban đầu (Ngành <strong>{userProfile?.major || 'Chưa chọn ngành'}</strong> • <strong>{userProfile?.academicYear || 'Chưa cập nhật'}</strong>), hãy chọn việc làm mục tiêu hoặc kích hoạt lộ trình chuyên ngành để tạo lộ trình phát triển.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('roadmap')}
                  className="px-4 py-2.5 rounded-xl bg-[#B90013] hover:bg-[#A30010] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Kích hoạt Career Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('jobs')}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Chọn việc làm mục tiêu</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 relative pl-6 border-l-2 border-slate-200 ml-2">
              {/* Item 1 */}
              <div className="relative space-y-1">
                <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-[#B90013] text-white flex items-center justify-center ring-4 ring-white shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-sm text-[#131B2E]">Giai đoạn 1: Nền tảng & Kỹ năng cốt lõi</h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  {userProfile?.careerDirection
                    ? `Hoàn thiện kiến thức nền tảng cho định hướng ${userProfile.careerDirection}.`
                    : 'Nắm vững các công cụ và kỹ năng cơ sở của ngành học.'}
                </p>
              </div>

              {/* Item 2 */}
              <div className="relative space-y-2">
                <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-red-100 text-[#B90013] flex items-center justify-center ring-4 ring-white">
                  <CircleDot className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-[#131B2E]">Giai đoạn 2: Dự án thực tế & Thực tập</h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  Xây dựng portfolio và tham gia các hoạt động cọ xát doanh nghiệp đối tác PTIT.
                </p>
                <button
                  onClick={handleStartProject}
                  className="bg-white border border-slate-300 hover:border-[#B90013] text-slate-700 hover:text-[#B90013] font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  {portfolioStarted ? '✓ Đang thực hiện kế hoạch' : 'Bắt đầu dự án thực tế'}
                </button>
              </div>

              {/* Item 3 */}
              <div className="relative space-y-1">
                <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center ring-4 ring-white">
                  <Circle className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-bold text-sm text-slate-500">Giai đoạn 3: Bứt phá & Ứng tuyển chính thức</h4>
                <p className="text-xs sm:text-sm text-slate-400">
                  Mục tiêu đạt vị trí chính thức tại doanh nghiệp đối tác PTIT.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CV của tôi (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <h2 className="text-xl font-bold text-[#131B2E]">CV của tôi</h2>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Số lượng CV</span>
              <span>{profile.resumeCount}/{profile.maxResumes}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${(profile.resumeCount / profile.maxResumes) * 100}%` }}
              />
            </div>
          </div>

          {/* Resumes list */}
          <div className="space-y-2.5">
            {hasCv ? (
              <div
                onClick={() => onNavigate('cv-builder')}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/20 transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-200">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 truncate group-hover:text-purple-700">
                      {userProfile?.cvFileName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {userProfile?.cvUploadedAt
                        ? `Cập nhật ${new Date(userProfile.cvUploadedAt).toLocaleDateString('vi-VN')}`
                        : 'Mới cập nhật'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Đã tải
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center space-y-1.5 bg-slate-50/60">
                <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Chưa có CV nào được tải lên</p>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Tải CV định dạng PDF để AI Gemini phân tích và chấm điểm ATS.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('cv-builder')}
            className="w-full py-3 px-4 rounded-xl border border-[#B90013] text-[#B90013] hover:bg-red-50 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {hasCv ? 'Tải / Cập nhật lại CV' : 'Tải lên hoặc Tạo CV mới'}
          </button>
        </div>
      </div>

      {/* Bottom Grid: Việc làm đề xuất (Cá nhân hóa theo Hồ sơ ban đầu) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#712AE2]" />
            <div>
              <h2 className="text-xl font-bold text-[#131B2E]">Việc làm đề xuất cho bạn</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Được ưu tiên theo thông tin ban đầu: Ngành <strong>{userProfile?.major || 'Chưa chọn ngành'}</strong> • <strong>{userProfile?.academicYear || 'Chưa cập nhật'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('jobs')}
            className="text-xs sm:text-sm font-bold text-slate-600 hover:text-[#B90013] transition-colors cursor-pointer"
          >
            Xem tất cả việc làm →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recommendedJobsList.map((job) => (
            <div
              key={job.id}
              onClick={() => {
                if (onSelectJobDetail) onSelectJobDetail(job);
                else onNavigate('jobs');
              }}
              className="p-5 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer space-y-3 relative group bg-white"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSave(job.id);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-[#B90013] cursor-pointer"
              >
                <Bookmark className={`w-4 h-4 ${job.isSaved ? 'fill-[#B90013] text-[#B90013]' : ''}`} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B90013] font-extrabold flex items-center justify-center text-base border border-red-100">
                {job.company[0] || 'P'}
              </div>
              <div>
                <h4 className="font-bold text-base text-[#131B2E] group-hover:text-[#B90013] transition-colors">
                  {job.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">{job.company} • {job.location}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                  {job.matchReason || 'Ưu tiên ngành học'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {job.type}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {job.salaryDisplay}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

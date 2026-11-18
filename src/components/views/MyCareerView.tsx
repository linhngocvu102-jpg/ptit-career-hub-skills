import React from 'react';
import { ScreenView, UserAuth, TargetJob, CareerEvent, UserProfileState } from '../../types';
import { TARGET_JOBS, CAREER_EVENTS } from '../../data/mockData';
import {
  Compass,
  FileText,
  Bookmark,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Plus,
  Edit3,
} from 'lucide-react';

interface MyCareerViewProps {
  onNavigate: (view: ScreenView) => void;
  auth: UserAuth;
  jobs?: TargetJob[];
  events?: CareerEvent[];
  userProfile?: UserProfileState;
  onSelectJobDetail?: (job: TargetJob) => void;
  onSelectEventDetail?: (event: CareerEvent) => void;
  onEditProfile?: () => void;
}

export const MyCareerView: React.FC<MyCareerViewProps> = ({
  onNavigate,
  auth,
  jobs = TARGET_JOBS,
  events = CAREER_EVENTS,
  userProfile,
  onSelectJobDetail,
  onSelectEventDetail,
  onEditProfile,
}) => {
  const hasCareerMap = Boolean(
    userProfile?.careerDirection ||
    userProfile?.targetJobTitle ||
    userProfile?.careerCheckCompleted
  );

  const hasCv = Boolean(userProfile?.cvFileName);

  const savedJobs = jobs.filter((j) => j.isSaved);
  const savedEvents = events.filter((e) => e.isSaved);

  const displayCareerGoal = hasCareerMap
    ? userProfile?.careerDirection || userProfile?.targetJobTitle || 'Đang xác định'
    : 'Chưa thiết lập';

  const displayAcademicYear = userProfile?.academicYear || auth.year || 'Chưa cập nhật';

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-10 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Banner with Student Greeting */}
      <div className="bg-gradient-to-r from-red-900 via-[#B90013] to-red-800 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full backdrop-blur-xs">
              Góc Phát Triển Nghề Nghiệp Sinh Viên PTIT
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Xin chào, {userProfile?.displayName || auth.name || 'Bạn'} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-white/80 text-xs sm:text-sm max-w-xl leading-relaxed">
            <span>
              Dựa trên thông tin ban đầu: Ngành <strong>{userProfile?.major || auth.major || 'Chưa chọn ngành'}</strong> • <strong>{displayAcademicYear}</strong>. Theo dõi tiến độ kỹ năng và quản lý cơ hội thực tập, việc làm.
            </span>
            {onEditProfile && (
              <button
                type="button"
                onClick={onEditProfile}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-all cursor-pointer border border-white/20 shadow-2xs"
                title="Chỉnh sửa thông tin ban đầu"
              >
                <Edit3 className="w-3 h-3" />
                <span>Chỉnh sửa</span>
              </button>
            )}
          </div>
        </div>

        <div className="z-10 flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('roadmap')}
            className="bg-white hover:bg-slate-100 text-[#B90013] font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>{hasCareerMap ? 'Tiếp tục lộ trình' : 'Kích hoạt Career Map'}</span>
          </button>
          <button
            onClick={() => onNavigate('cv-builder')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{hasCv ? 'Xem & Tối ưu CV' : 'Tải CV lên AI'}</span>
          </button>
        </div>
      </div>

      {/* 6 Essential Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Định hướng
          </span>
          <p className="text-sm font-extrabold text-[#131B2E] truncate" title={displayCareerGoal}>
            {displayCareerGoal}
          </p>
          <span className="text-[10px] text-purple-600 font-semibold">
            {hasCareerMap ? 'Đã kích hoạt' : 'Chưa chọn'}
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Cấp độ hiện tại
          </span>
          <p className="text-sm font-extrabold text-[#131B2E] truncate" title={displayAcademicYear}>
            {displayAcademicYear}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold truncate block">
            {userProfile?.major || 'Chưa chọn ngành'}
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Tiến độ lộ trình
          </span>
          <p className="text-xl font-black text-[#B90013]">
            {hasCareerMap ? '35%' : '0%'}
          </p>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className="bg-[#B90013] h-full transition-all duration-500"
              style={{ width: hasCareerMap ? '35%' : '0%' }}
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Điểm khớp CV
          </span>
          <p className="text-xl font-black text-[#712AE2]">
            {hasCv ? (userProfile?.skillGap?.matchScore ? `${userProfile.skillGap.matchScore}%` : 'Đã tải') : '—'}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">
            {hasCv ? 'Sẵn sàng ứng tuyển' : 'Chưa có file CV'}
          </span>
        </div>

        {/* Metric 5 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Việc làm đã lưu
          </span>
          <p className="text-xl font-extrabold text-slate-800">
            {savedJobs.length}
          </p>
          <button
            onClick={() => onNavigate('saved-jobs')}
            className="text-[10px] text-[#B90013] font-bold hover:underline cursor-pointer"
          >
            Xem trang đã lưu →
          </button>
        </div>

        {/* Metric 6 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Sự kiện đã lưu
          </span>
          <p className="text-xl font-extrabold text-slate-800">
            {savedEvents.length}
          </p>
          <button
            onClick={() => onNavigate('saved-events')}
            className="text-[10px] text-[#B90013] font-bold hover:underline cursor-pointer"
          >
            Xem sự kiện đã lưu →
          </button>
        </div>
      </div>

      {/* Main Grid: My CVs + Saved Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: CV của tôi (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#131B2E]">CV của tôi</h2>
              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100">
                {hasCv ? '1 / 3 bản CV' : '0 / 3 bản CV'}
              </span>
            </div>
            <button
              onClick={() => onNavigate('cv-builder')}
              className="text-xs font-bold text-[#B90013] hover:underline cursor-pointer"
            >
              + Tải / Tạo CV mới
            </button>
          </div>

          <div className="space-y-3">
            {hasCv ? (
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#131B2E] truncate">
                      {userProfile?.cvFileName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {userProfile?.cvUploadedAt
                        ? `Cập nhật: ${new Date(userProfile.cvUploadedAt).toLocaleDateString('vi-VN')} • Định dạng PDF`
                        : 'Mới cập nhật • Định dạng PDF'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-extrabold text-[#712AE2] bg-purple-50 px-2.5 py-1 rounded-full">
                    {userProfile?.skillGap?.matchScore ? `${userProfile.skillGap.matchScore}% Match` : 'Đã phân tích'}
                  </span>
                  <button
                    onClick={() => onNavigate('cv-builder')}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 cursor-pointer"
                  >
                    Xem / Tối ưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[#131B2E]">Chưa có file CV nào sẵn có</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tải CV PDF của bạn lên hoặc tạo CV mới để AI Gemini phân tích mức độ tương thích với các việc làm mục tiêu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('cv-builder')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo hoặc Tải CV tại AI CV</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Việc làm đã lưu (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#131B2E]">Việc làm đã lưu ({savedJobs.length})</h2>
            <button
              onClick={() => onNavigate('saved-jobs')}
              className="text-xs font-bold text-[#B90013] hover:underline cursor-pointer"
            >
              Mở trang việc làm đã lưu →
            </button>
          </div>

          <div className="space-y-3">
            {savedJobs.length > 0 ? (
              savedJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => {
                    if (onSelectJobDetail) {
                      onSelectJobDetail(job);
                    } else {
                      onNavigate('saved-jobs');
                    }
                  }}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-[#B90013] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#131B2E] group-hover:text-[#B90013] transition-colors truncate">
                      {job.title}
                    </h4>
                    <p className="text-xs text-slate-500">{job.company} • {job.location}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {job.salaryDisplay}
                      </span>
                      <span className="text-[10px] text-slate-400">Hạn: {job.deadline}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-[#712AE2] bg-purple-50 px-2.5 py-1 rounded-full block mb-1">
                      {job.matchPercentage}%
                    </span>
                    <span className="text-[10px] font-bold text-[#B90013]">Xem chi tiết →</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-2 shadow-2xs">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Chưa có việc làm nào được lưu</p>
                <button
                  onClick={() => onNavigate('jobs')}
                  className="text-xs text-[#B90013] font-bold hover:underline cursor-pointer"
                >
                  Khám phá danh sách việc làm phù hợp →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Events Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#131B2E]">Sự kiện bạn quan tâm ({savedEvents.length})</h2>
          <button
            onClick={() => onNavigate('saved-events')}
            className="text-xs font-bold text-[#B90013] hover:underline cursor-pointer"
          >
            Mở trang sự kiện đã lưu →
          </button>
        </div>

        {savedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  if (onSelectEventDetail) {
                    onSelectEventDetail(event);
                  } else {
                    onNavigate('saved-events');
                  }
                }}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:border-[#B90013] transition-all cursor-pointer flex items-start gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-red-50 text-[#B90013] flex flex-col items-center justify-center shrink-0 border border-red-100 group-hover:bg-[#B90013] group-hover:text-white transition-colors">
                  <span className="text-[9px] font-black uppercase">{event.month}</span>
                  <span className="text-base font-black">{event.day}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-sm font-bold text-[#131B2E] group-hover:text-[#B90013] transition-colors truncate">
                    {event.title}
                  </h4>
                  <p className="text-xs text-slate-500">{event.time} • {event.location}</p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B90013] group-hover:underline inline-flex items-center gap-1 whitespace-nowrap">
                      <span>Xem chi tiết</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-2 shadow-2xs">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Chưa có sự kiện nào được lưu</p>
            <button
              onClick={() => onNavigate('events')}
              className="text-xs text-[#B90013] font-bold hover:underline cursor-pointer"
            >
              Khám phá các hội thảo & workshop sắp diễn ra →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

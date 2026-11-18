import React, { useEffect } from 'react';
import { ScreenView, UserProfileState } from '../../types';
import { trackEvent } from '../../utils/analytics';
import {
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  BrainCircuit,
  Compass,
  Zap,
  Target,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface AssessmentIntroViewProps {
  onNavigate: (view: ScreenView) => void;
  userProfile?: UserProfileState;
  onOpenOrientationModal?: () => void;
}

export const AssessmentIntroView: React.FC<AssessmentIntroViewProps> = ({
  onNavigate,
  userProfile,
  onOpenOrientationModal,
}) => {
  useEffect(() => {
    trackEvent('career_check_view');
  }, []);

  const handleStart = () => {
    trackEvent('career_check_start', { is_retake: !!userProfile?.careerCheckCompleted });
    onNavigate('assessment-quiz');
  };

  const isCompleted = Boolean(userProfile?.careerCheckCompleted);
  const completedDateFormatted = userProfile?.completedAt
    ? new Date(userProfile.completedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Gần đây';

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-3xl mx-auto space-y-8 text-center">
        {/* Saved Result Status Banner if Completed */}
        {isCompleted && (
          <div className="p-5 rounded-3xl bg-emerald-50/90 border border-emerald-200 shadow-xs text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">
                    Đã hoàn thành & Lưu kết quả
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Ngày làm: {completedDateFormatted}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 pt-0.5">
                  Định hướng mục tiêu: <span className="text-emerald-800 font-extrabold">{userProfile?.careerDirection || 'Digital Marketing'}</span>
                </h3>
                <p className="text-xs text-slate-600">
                  Kết quả trước đó của bạn đã được lưu đầy đủ. Bạn có thể xem lại ngay hoặc làm lại bất cứ lúc nào.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0">
              <button
                onClick={() => onNavigate('assessment-result')}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B90013]" />
                <span>Xem kết quả</span>
              </button>
              <button
                onClick={handleStart}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Làm lại test</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-3.5 py-1 bg-red-50 text-[#B90013] rounded-full text-xs font-bold border border-red-100 flex items-center gap-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            Career Check • PTIT Career Hub
          </span>
          <span className="px-3.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200 flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            10 câu hỏi tình huống • ~3 phút
          </span>
          {isCompleted && (
            <span className="px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Đã lưu bài làm
            </span>
          )}
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#131B2E] tracking-tight leading-tight">
            Career Check
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-[#B90013]">
            {isCompleted ? 'Cập nhật lại xu hướng nghề nghiệp của bạn' : 'Khám phá xu hướng nghề nghiệp phù hợp với bạn'}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            10 câu hỏi tình huống giúp bạn nhận diện những hoạt động, môi trường và vai trò công việc phù hợp với xu hướng của mình. Kết quả được lưu tự động và có thể làm lại không giới hạn.
          </p>
        </div>

        {/* 4 Broad Career Tendencies Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left pt-2">
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5 shadow-2xs">
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-[#712AE2] font-black text-[11px] inline-block">
              CR
            </span>
            <h3 className="font-extrabold text-sm text-slate-900">Sáng tạo & Đổi mới</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Idea generation, nội dung sáng tạo, sản phẩm mới, chiến dịch truyền thông.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-1.5 shadow-2xs">
            <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-black text-[11px] inline-block">
              AN
            </span>
            <h3 className="font-extrabold text-sm text-slate-900">Phân tích & Tối ưu</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dữ liệu, tư duy logic, nghiên cứu thị trường, đo lường và tối ưu hiệu quả.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5 shadow-2xs">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[11px] inline-block">
              OP
            </span>
            <h3 className="font-extrabold text-sm text-slate-900">Lập kế hoạch & Vận hành</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tổ chức quy trình, phân chia đầu việc, quản lý tiến độ và nguồn lực thực thi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 space-y-1.5 shadow-2xs">
            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-black text-[11px] inline-block">
              CO
            </span>
            <h3 className="font-extrabold text-sm text-slate-900">Giao tiếp & Kinh doanh</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Đàm phán, kết nối mạng lưới, thuyết phục khách hàng và phát triển quan hệ.
            </p>
          </div>
        </div>

        {/* Additional Note / Disclaimer */}
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Lưu ý quan trọng:</p>
            <p className="text-amber-800 leading-relaxed">
              Kết quả mang tính định hướng năng lực, không phải đánh giá tâm lý hay kết luận nghề nghiệp cố định. Bạn có thể làm lại bài kiểm tra bất kỳ khi nào để cập nhật mục tiêu mới.
            </p>
          </div>
        </div>

        {/* Start / Retake CTA */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isCompleted ? (
            <>
              <button
                onClick={() => onNavigate('assessment-result')}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 font-bold text-base px-8 py-4 rounded-2xl border border-slate-300 shadow-sm transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-[#B90013]" />
                <span>Xem kết quả đã lưu</span>
              </button>
              <button
                onClick={handleStart}
                className="w-full sm:w-auto bg-[#B90013] hover:bg-[#A30010] text-white font-bold text-base sm:text-lg px-9 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-3 group cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 group-hover:-rotate-90 transition-transform" />
                <span>Làm lại bài test</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              className="w-full sm:w-auto bg-[#B90013] hover:bg-[#A30010] text-white font-bold text-base sm:text-lg px-9 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-3 group cursor-pointer"
            >
              <span>Bắt đầu Career Check</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ScreenView, UserProfileState } from '../../types';
import { trackEvent } from '../../utils/analytics';
import {
  Search,
  MapPin,
  Sparkles,
  Map,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  Building2,
  Compass,
  CheckCircle2,
  Briefcase,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: ScreenView) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenOrientationModal?: () => void;
  userProfile?: UserProfileState;
  onStartCareerCheck?: () => void;
  onSkipCareerCheck?: () => void;
  onEditProfile?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  searchTerm,
  onSearchChange,
  onOpenOrientationModal,
  userProfile,
  onEditProfile,
}) => {
  const [selectedLocation, setSelectedLocation] = useState('Hà Nội');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('job_view', { search: searchTerm, location: selectedLocation });
    onNavigate('jobs');
  };

  const handleTrendingClick = (keyword: string) => {
    onSearchChange(keyword);
    trackEvent('job_view', { search: keyword, location: selectedLocation, source: 'home_trending_keyword' });
    onNavigate('jobs');
  };

  const trendingKeywords = [
    'Thực tập sinh Marketing',
    'Business Analyst',
    'Thực tập E-Commerce',
    'Data Analyst',
    'Truyền thông & Content',
    'Quản trị kinh doanh',
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full space-y-14">
        {/* ========================================================= */}
        {/* 1. ƯU TIÊN HIỂN THỊ TÌM KIẾM VỊ TRÍ CÔNG VIỆC BẠN MUỐN TRƯỚC */}
        {/* ========================================================= */}
        <section className="text-center max-w-4xl mx-auto space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAEDFF] border border-[#DAE2FD] text-xs font-semibold text-[#004A75] shadow-2xs animate-fade-in">
            <span>Cổng phát triển sự nghiệp sinh viên</span>
            <span className="font-bold text-[#B90013]">PTIT Career Hub</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#131B2E] tracking-tight leading-[1.2]">
            Tìm kiếm vị trí công việc <br className="hidden sm:inline" />
            <span className="text-[#B90013]">bạn mong muốn</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Khám phá hàng trăm cơ hội thực tập và việc làm chất lượng cao kết nối trực tiếp với mạng lưới doanh nghiệp đối tác hàng đầu của PTIT.
          </p>

          {/* Big Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 bg-white p-2.5 sm:p-3 rounded-2xl shadow-[0_10px_35px_rgba(15,23,42,0.08)] border border-slate-200/80 max-w-3xl mx-auto flex flex-col md:flex-row items-stretch gap-2.5 transition-all focus-within:shadow-[0_12px_40px_rgba(185,0,19,0.12)]"
          >
            {/* Keyword Input */}
            <div className="flex-1 flex items-center px-3 py-2 bg-slate-50/70 rounded-xl border border-slate-200/70 focus-within:border-[#B90013] focus-within:bg-white transition-all">
              <Search className="w-5 h-5 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Chức danh, kỹ năng, công ty tuyển dụng..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Location Input */}
            <div className="flex items-center px-3 py-2 bg-slate-50/70 rounded-xl border border-slate-200/70 min-w-[160px]">
              <MapPin className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-transparent text-sm sm:text-base text-slate-800 focus:outline-none cursor-pointer font-medium"
              >
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. HCM">TP. HCM</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="bg-[#B90013] hover:bg-[#A30010] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow text-sm sm:text-base shrink-0 cursor-pointer"
            >
              Tìm Kiếm
            </button>
          </form>

          {/* Quick Trending Searches */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Gợi ý tìm kiếm:</span>
            {trendingKeywords.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => handleTrendingClick(kw)}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-red-50 hover:text-[#B90013] text-slate-700 font-medium transition-colors border border-slate-200/70 cursor-pointer"
              >
                {kw}
              </button>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. HIỂN THỊ HỆ SINH THÁI VIỆC LÀM TRƯỚC */}
        {/* ========================================================= */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center lg:text-left">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FFDAD6] block">
                Hệ sinh thái việc làm dành cho khối ngành Kinh tế
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold">
                Đa dạng Doanh nghiệp và Tập đoàn đồng hành
              </h3>
              <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
                Cơ hội thực tập và việc làm trực tiếp từ các đối tác chiến lược của Học viện Công nghệ Bưu chính Viễn thông dành cho sinh viên Marketing, Thương mại điện tử, Công nghệ tài chính (Fintech) & Quản trị kinh doanh.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 sm:gap-3 max-w-xl">
              {[
                'Shopee',
                'Viettel',
                'Techcombank',
                'FPT Telecom',
                'VNPT',
                'VNPAY',
                'Tiki',
                'VCCorp',
                'VNG',
                'MoMo',
                'Masan',
                'Dentsu',
              ].map((company) => (
                <span
                  key={company}
                  className="px-3.5 py-2 rounded-xl bg-white/10 text-white font-semibold text-xs sm:text-sm border border-white/15 cursor-default select-none shadow-2xs"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. KHÁM PHÁ NGHỀ NGHIỆP */}
        {/* ========================================================= */}
        <section className="space-y-6 pt-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#131B2E]">
              Khám Phá Nghề Nghiệp
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-1">
              Trang bị hành trang ứng tuyển với AI CV và bản đồ lộ trình sự nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Bản đồ nghề nghiệp (Đặt bên trái) */}
            <div
              onClick={() => {
                trackEvent('career_map_view', { source: 'home_feature_card_career_map' });
                onNavigate('roadmap');
              }}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#B90013] text-xs font-semibold mb-4 border border-red-100">
                  <Map className="w-3.5 h-3.5" />
                  <span>Định hướng sự nghiệp</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#131B2E] mb-3 group-hover:text-[#B90013] transition-colors">
                  Bản đồ nghề nghiệp
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                  Khám phá các nấc thang thăng tiến và lộ trình phát triển sự nghiệp chi tiết dành cho sinh viên khối ngành Kinh tế PTIT (Marketing, Quản trị kinh doanh, Kế toán, Thương mại điện tử, Logistics & Fintech).
                </p>
              </div>

              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    trackEvent('career_map_view', { source: 'home_feature_card_career_map_btn' });
                    onNavigate('roadmap');
                  }}
                  className="bg-[#B90013] hover:bg-[#A30010] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow flex items-center gap-2 text-xs sm:text-sm group-hover:gap-2.5 cursor-pointer"
                >
                  <span>Xem lộ trình sự nghiệp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Phân tích & Tối ưu hóa CV với AI (Đặt bên phải) */}
            <div
              onClick={() => {
                trackEvent('cv_analysis_start', { source: 'home_feature_card_ai_cv' });
                onNavigate('cv-builder');
              }}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-4 border border-purple-100">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI CV Intelligence</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#131B2E] mb-3 group-hover:text-purple-700 transition-colors">
                  Phân tích & Tối ưu hóa CV với AI
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                  Tự động đọc file PDF, trích xuất dữ liệu JSON, phân tích độ tương thích giữa CV và JD tuyển dụng, tính điểm trọng số và gợi ý cải thiện kỹ năng thông minh.
                </p>
              </div>

              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    trackEvent('cv_analysis_start', { source: 'home_feature_card_ai_cv_btn' });
                    onNavigate('cv-builder');
                  }}
                  className="bg-[#712AE2] hover:bg-[#5A00C6] text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow flex items-center gap-2 text-xs sm:text-sm group-hover:gap-2.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Phân tích CV ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

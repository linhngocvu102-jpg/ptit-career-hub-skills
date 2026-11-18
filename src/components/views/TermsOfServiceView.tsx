import React, { useState } from 'react';
import { ScreenView } from '../../types';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Users,
  Shield,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface TermsOfServiceViewProps {
  onNavigate: (view: ScreenView) => void;
}

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({ onNavigate }) => {
  const [activeArticle, setActiveArticle] = useState<string>('dieu-1');

  const scrollToArticle = (id: string) => {
    setActiveArticle(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-3 py-1 bg-red-50 text-[#B90013] text-xs font-bold rounded-full border border-red-100 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-[#B90013]" />
            Quy chế Nền tảng Hướng nghiệp & Việc làm
          </span>
          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
            Ban hành theo Nghị quyết Hướng nghiệp PTIT 2026
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#131B2E] tracking-tight">
          Quy định sử dụng nền tảng
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Văn bản quy định chuẩn mực ứng xử, quyền lợi và nghĩa vụ của sinh viên, học viên và các doanh nghiệp đối tác khi tham gia hệ sinh thái PTIT Career Hub.
        </p>
      </div>

      {/* Quick TL;DR Cards for Students */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-50/80 via-white to-orange-50/60 border border-red-100 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B90013]" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            Tóm tắt 4 nguyên tắc cốt lõi dành cho sinh viên PTIT (TL;DR)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white border border-red-100/80 space-y-1.5 shadow-2xs">
            <span className="font-extrabold text-[#B90013] block">1. Trung thực về hồ sơ</span>
            <p className="text-slate-600 leading-relaxed">
              Thông tin học vấn (GPA, chuyên ngành), kinh nghiệm và kỹ năng trong CV phải phản ánh đúng thực tế của bạn.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-red-100/80 space-y-1.5 shadow-2xs">
            <span className="font-extrabold text-[#B90013] block">2. Đạo đức ứng tuyển</span>
            <p className="text-slate-600 leading-relaxed">
              Tôn trọng lịch phỏng vấn và phản hồi chuyên nghiệp với các doanh nghiệp đối tác tuyển dụng liên kết.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-red-100/80 space-y-1.5 shadow-2xs">
            <span className="font-extrabold text-[#B90013] block">3. Trách nhiệm điểm danh</span>
            <p className="text-slate-600 leading-relaxed">
              Đăng ký sự kiện hướng nghiệp phải tham gia và quét mã QR điểm danh thực tế để được tính điểm rèn luyện.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-red-100/80 space-y-1.5 shadow-2xs">
            <span className="font-extrabold text-[#B90013] block">4. AI là công cụ hỗ trợ</span>
            <p className="text-slate-600 leading-relaxed">
              Các gợi ý từ Gemini mang tính chất cố vấn, bạn là người đưa ra quyết định cuối cùng cho hồ sơ của mình.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
              Danh mục các điều khoản
            </h4>

            <nav className="space-y-1 text-xs font-semibold">
              {[
                { id: 'dieu-1', label: 'Điều 1: Phạm vi và Đối tượng áp dụng' },
                { id: 'dieu-2', label: 'Điều 2: Tiêu chuẩn trung thực trong CV' },
                { id: 'dieu-3', label: 'Điều 3: Quy định Sự kiện & Điểm rèn luyện' },
                { id: 'dieu-4', label: 'Điều 4: Sử dụng công cụ AI & Trách nhiệm' },
                { id: 'dieu-5', label: 'Điều 5: Quyền sở hữu trí tuệ học liệu' },
                { id: 'dieu-6', label: 'Điều 6: Các hành vi bị nghiêm cấm' },
                { id: 'dieu-7', label: 'Điều 7: Xử lý vi phạm & Khóa tài khoản' },
                { id: 'dieu-8', label: 'Điều 8: Điều khoản thi hành' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToArticle(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                    activeArticle === item.id
                      ? 'bg-red-50 text-[#B90013] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>
              ))}
            </nav>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-500">
              Hỗ trợ sinh viên
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Bạn phát hiện tin tuyển dụng có dấu hiệu thu phí hoặc thông tin không chính xác?
            </p>
            <button
              onClick={() => onNavigate('feedback')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Báo cáo tin vi phạm</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Detailed Articles (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-2xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Article 1 */}
          <section id="dieu-1" className="space-y-3 pt-2">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] border-b border-slate-100 pb-2">
              Điều 1: Phạm vi và Đối tượng áp dụng
            </h2>
            <p>
              1. Quy định này áp dụng đối với toàn thể sinh viên hệ chính quy, liên thông, văn bằng 2, học viên sau đại học của Học viện Công nghệ Bưu chính Viễn thông khi truy cập và sử dụng dịch vụ trên nền tảng PTIT Career Hub.
            </p>
            <p>
              2. Bằng việc đăng nhập tài khoản sinh viên hoặc tiếp tục sử dụng các tính năng trên website, sinh viên được xem là đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản trong văn bản này.
            </p>
          </section>

          {/* Article 2 */}
          <section id="dieu-2" className="space-y-3 pt-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] border-b border-slate-100 pb-2">
              Điều 2: Tiêu chuẩn trung thực trong Hồ sơ CV & Ứng tuyển
            </h2>
            <p>
              1. <strong>Tính xác thực của hồ sơ:</strong> Sinh viên cam kết các thông tin về điểm tích lũy (GPA), chuyên ngành đào tạo, chứng chỉ ngoại ngữ/tin học và kinh nghiệm tham gia dự án được thể hiện trong CV là đúng sự thật.
            </p>
            <p>
              2. <strong>Hành vi gian lận hồ sơ:</strong> Việc tự ý khai man bằng cấp, sao chép toàn bộ dự án của người khác để nhận làm của mình hoặc cung cấp thông tin sai lệch cho nhà tuyển dụng sẽ bị xử lý theo Quy chế học vụ và Khen thưởng - Kỷ luật sinh viên của Học viện.
            </p>
            <p>
              3. <strong>Văn hóa ứng tuyển văn minh:</strong> Sinh viên khi đã xác nhận lịch hẹn phỏng vấn hoặc đồng ý nhận việc (Offer Letter) từ doanh nghiệp đối tác có trách nhiệm thông báo lịch sự tối thiểu 48 giờ nếu có lý do bất khả kháng không thể tham dự.
            </p>
          </section>

          {/* Article 3 */}
          <section id="dieu-3" className="space-y-3 pt-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] border-b border-slate-100 pb-2">
              Điều 3: Quy định Sự kiện Hướng nghiệp & Điểm rèn luyện
            </h2>
            <p>
              1. <strong>Quyền lợi điểm rèn luyện:</strong> Sinh viên đăng ký tham gia các sự kiện, tọa đàm hướng nghiệp và hội chợ việc làm (Job Fair) được tổ chức bởi Học viện sẽ được cộng điểm rèn luyện vào Tiêu chí 3 (Ý thức tham gia hoạt động chính trị - xã hội) theo thông báo cụ thể của từng sự kiện.
            </p>
            <p>
              2. <strong>Điều kiện ghi nhận:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Đăng ký trước qua nền tảng PTIT Career Hub.</li>
              <li>Tham gia đúng giờ, trang phục lịch sự phù hợp với văn hóa học đường.</li>
              <li>Thực hiện quét mã QR điểm danh đầu giờ và cuối giờ theo hướng dẫn của Ban tổ chức.</li>
            </ul>
            <p>
              3. Sinh viên đăng ký nhưng vắng mặt không lý do quá 2 lần trong một học kỳ sẽ bị tạm khóa quyền đăng ký trước các sự kiện tiếp theo.
            </p>
          </section>

          {/* Article 4 */}
          <section id="dieu-4" className="space-y-3 pt-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] border-b border-slate-100 pb-2">
              Điều 4: Sử dụng công cụ AI (Gemini) và Trách nhiệm nội dung
            </h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-[#B90013]" />
                <span>Giới hạn trách nhiệm của Công cụ AI</span>
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Công cụ tối ưu hóa CV sử dụng mô hình Gemini 3.8 Flash nhằm hỗ trợ sinh viên nhận diện từ khóa ATS còn thiếu, cải thiện cách diễn đạt câu định lượng và đối chiếu với yêu cầu thực tế của vị trí tuyển dụng.
              </p>
            </div>
            <p>
              1. <strong>Vai trò cố vấn:</strong> Điểm số đối chiếu (Match Score) và các gợi ý viết lại chỉ mang tính chất tham khảo, tư vấn kỹ năng và không cấu thành cam kết trúng tuyển 100% với bất kỳ nhà tuyển dụng nào.
            </p>
            <p>
              2. <strong>Trách nhiệm của sinh viên:</strong> Sinh viên có trách nhiệm rà soát, kiểm tra lại nội dung gợi ý trước khi gửi CV đến nhà tuyển dụng.
            </p>
          </section>

          {/* Article 5 */}
          <section id="dieu-5" className="space-y-3 pt-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] border-b border-slate-100 pb-2">
              Điều 5: Quyền sở hữu trí tuệ đối với học liệu và bài trắc nghiệm
            </h2>
            <p>
              1. Toàn bộ nội dung bản đồ lộ trình đào tạo (Career Map), tài liệu học tập tham khảo, bộ câu hỏi trắc nghiệm nghề nghiệp được xây dựng dựa trên chương trình đào tạo của Học viện Công nghệ Bưu chính Viễn thông và thuộc quyền sở hữu của Ban Quản trị Nền tảng.
            </p>
            <p>
              2. Nghiêm cấm hành vi sao chép thương mại, tự ý phát tán hoặc kinh doanh lại các bộ đề và dữ liệu phân tích hướng nghiệp mà không có sự đồng ý bằng văn bản của Học viện.
            </p>
          </section>

          {/* Article 6 */}
          <section id="dieu-6" className="space-y-3 pt-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] border-b border-slate-100 pb-2">
              Điều 6: Các hành vi bị nghiêm cấm trên nền tảng
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Tải lên các tệp tin chứa mã độc, virus hoặc cố tình khai thác lỗ hổng kỹ thuật của hệ thống.</li>
              <li>Sử dụng thông tin tài khoản của sinh viên khác khi chưa được cho phép.</li>
              <li>Đăng tải các thông tin tuyển dụng lừa đảo, đa cấp bất hợp pháp hoặc thu phí ứng viên dưới mọi hình thức.</li>
              <li>Sử dụng các công cụ tự động (bot/crawler) làm gián đoạn hoặc gây nghẽn dịch vụ của nền tảng.</li>
            </ul>
          </section>

          {/* Article 7 */}
          <section id="dieu-7" className="space-y-3 pt-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E] border-b border-slate-100 pb-2">
              Điều 7: Cơ chế xử lý vi phạm & Khóa tài khoản
            </h2>
            <p>
              Các trường hợp vi phạm quy định sử dụng tùy theo mức độ sẽ bị xử lý theo một hoặc nhiều hình thức sau:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <strong>Mức 1 (Nhắc nhở):</strong> Cảnh cáo qua email sinh viên và yêu cầu gỡ bỏ nội dung không phù hợp.
              </div>
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-900">
                <strong>Mức 2 (Đình chỉ có thời hạn):</strong> Khóa quyền truy cập hệ thống từ 1 đến 3 tháng, hủy quyền tham gia sự kiện.
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
                <strong>Mức 3 (Kỷ luật học vụ):</strong> Khóa vĩnh viễn tài khoản và chuyển hồ sơ về Phòng CTSV & Hội đồng Kỷ luật Học viện xem xét xử lý.
              </div>
            </div>
          </section>

          {/* Article 8 */}
          <section id="dieu-8" className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-base sm:text-lg font-extrabold text-[#131B2E]">
              Điều 8: Điều khoản thi hành & Sửa đổi bổ sung
            </h2>
            <p>
              1. Quy định này có hiệu lực kể từ ngày công bố chính thức trên cổng thông tin PTIT Career Hub.
            </p>
            <p>
              2. Ban Quản trị Nền tảng có quyền điều chỉnh, bổ sung các điều khoản cho phù hợp với sự phát triển của công nghệ và các quy định pháp luật hiện hành. Nội dung sửa đổi sẽ được thông báo công khai tới sinh viên trên trang chủ.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

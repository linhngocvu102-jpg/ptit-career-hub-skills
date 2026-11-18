import React, { useState, useEffect } from 'react';
import {
  loadAllUsersForAdmin,
  computeUserAggregates,
  UserAggregateReport,
} from '../../services/userService';
import {
  Users,
  Award,
  GraduationCap,
  Target,
  Compass,
  PieChart,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Sparkles,
  BookOpen,
  Calendar,
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const [report, setReport] = useState<UserAggregateReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const users = await loadAllUsersForAdmin();
      const aggregates = computeUserAggregates(users);
      setReport(aggregates);
    } catch (err) {
      console.warn('Failed to load users for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600" />
        <p className="text-xs font-bold text-slate-500">Đang tải và tổng hợp dữ liệu sinh viên từ Firestore...</p>
      </div>
    );
  }

  const hasData = report && report.hasData && report.totalUsers > 0;
  const cc = report?.careerCheckAnalytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Quản Lý Hồ Sơ Sinh Viên PTIT</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Báo cáo tổng hợp số liệu thực tế về cơ cấu sinh viên PTIT, phân bổ chuyên ngành, niên khóa và mục tiêu nghề nghiệp.
          </p>
        </div>

        <button
          onClick={fetchUserData}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Chưa có dữ liệu</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hệ thống chưa ghi nhận hồ sơ sinh viên nào trong cơ sở dữ liệu.
          </p>
        </div>
      ) : (
        <>
          {/* Top 4 Aggregate Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng người dùng (Users)</span>
              <p className="text-2xl font-black text-slate-900">{report.totalUsers}</p>
              <span className="text-[11px] text-slate-500">Hồ sơ đã đăng ký tài khoản</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mục tiêu đã thiết lập</span>
              <p className="text-2xl font-black text-purple-600">{report.totalUsers}</p>
              <span className="text-[11px] text-purple-700 font-semibold">
                Đã kết nối lộ trình nghề nghiệp
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngành đông nhất</span>
              <p className="text-sm font-black text-slate-900 truncate">
                {report.majorDistribution[0]?.major || 'Chưa có dữ liệu'}
              </p>
              <span className="text-[11px] text-slate-500">
                {report.majorDistribution[0] ? `${report.majorDistribution[0].count} sinh viên (${report.majorDistribution[0].percentage}%)` : ''}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Niên khóa chủ đạo</span>
              <p className="text-sm font-black text-slate-900 truncate">
                {report.academicYearDistribution[0]?.year || 'Chưa có dữ liệu'}
              </p>
              <span className="text-[11px] text-slate-500">
                {report.academicYearDistribution[0] ? `${report.academicYearDistribution[0].count} sinh viên (${report.academicYearDistribution[0].percentage}%)` : ''}
              </span>
            </div>
          </div>

          {/* User Distributions: Major, Academic Year, Career Goal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Major Distribution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Phân bổ theo Chuyên ngành (Major)</span>
                </h3>
              </div>
              <div className="space-y-3">
                {report.majorDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]">
                        {item.major}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Academic Year Distribution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Phân bổ theo Niên khóa (Year)</span>
                </h3>
              </div>
              <div className="space-y-3">
                {report.academicYearDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium">{item.year}</span>
                      <span className="font-bold text-slate-900">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Career Goal Distribution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-600" />
                  <span>Mục tiêu nghề nghiệp (Career Goal)</span>
                </h3>
              </div>
              <div className="space-y-3">
                {report.careerGoalDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium truncate max-w-[200px]">
                        {item.goal}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#B90013] h-2 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

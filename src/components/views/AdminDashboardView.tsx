import React, { useState, useEffect } from 'react';
import { ScreenView, TargetJob, CareerEvent } from '../../types';
import { Logo } from '../Logo';
import { AdminJobsTab } from '../admin/AdminJobsTab';
import { AdminEventsTab } from '../admin/AdminEventsTab';
import { AdminLettersTab } from '../admin/AdminLettersTab';
import { AdminAccessTab } from '../admin/AdminAccessTab';
import { AdminAnalyticsTab } from '../admin/AdminAnalyticsTab';
import { AdminUsersTab } from '../admin/AdminUsersTab';
import {
  isAuthorizedAdminEmail,
  PRIMARY_SUPER_ADMIN_EMAIL,
  validateAdminGoogleLogin,
  checkAutoLoginGoogleAdmin,
} from '../../services/admin/adminAuthService';
import { loginWithGooglePopup } from '../../services/firebase';
import { saveUserProfile } from '../../services/userService';
import {
  Briefcase,
  Calendar,
  BarChart3,
  Mail,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  UserCheck,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminDashboardViewProps {
  onNavigate: (view: ScreenView) => void;
  initialTab?: 'jobs' | 'events' | 'letters' | 'analytics' | 'access' | string;
  isAdminAuthenticated?: boolean;
  onAdminLoginSuccess?: () => void;
  onLogoutAdmin?: () => void;
  onUpdateJobs?: (jobs: TargetJob[]) => void;
  onUpdateEvents?: (events: CareerEvent[]) => void;
}

const ADMIN_SESSION_STORAGE_KEY = 'ptit_admin_authenticated';
const DEFAULT_ADMIN_PASSWORD = 'ptitcareerhubvlk212';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigate,
  initialTab = 'jobs',
  isAdminAuthenticated,
  onAdminLoginSuccess,
  onLogoutAdmin,
  onUpdateJobs,
  onUpdateEvents,
}) => {
  // Session-based authentication check
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const sessionAuth = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
        if (sessionAuth === 'true') return true;
      }
      return !!isAdminAuthenticated;
    } catch {
      return false;
    }
  });

  // Password Login Form state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (isAdminAuthenticated) {
      setIsAuthenticated(true);
    }
  }, [isAdminAuthenticated]);

  // Primary Tabs:
  // - Tab 1: 'jobs' (Quản lý Việc làm - JD Management)
  // - Tab 2: 'events' (Quản lý Sự kiện & Workshop - Events Management)
  // - Tab 3: 'analytics' (Thống kê & Báo cáo - Analytics Dashboard)
  // - Tab 4: 'letters' (Quản lý Thư thông báo & Bản tin - System Letters)
  // - Tab 5: 'users' (Quản lý Người dùng - Users Management)
  // - Tab 6: 'access' (Quản lý Cấp quyền Quản trị - Admin Access)
  const [activeTab, setActiveTab] = useState<'jobs' | 'events' | 'letters' | 'analytics' | 'access' | 'users'>(() => {
    if (initialTab === 'events') return 'events';
    if (initialTab === 'analytics') return 'analytics';
    if (initialTab === 'letters') return 'letters';
    if (initialTab === 'users' || initialTab === 'admin-users') return 'users';
    if (initialTab === 'access') return 'access';
    return 'jobs';
  });

  useEffect(() => {
    if (initialTab === 'events' || initialTab === 'admin-events') {
      setActiveTab('events');
    } else if (initialTab === 'analytics' || initialTab === 'admin-analytics') {
      setActiveTab('analytics');
    } else if (initialTab === 'letters' || initialTab === 'admin-letters') {
      setActiveTab('letters');
    } else if (initialTab === 'users' || initialTab === 'admin-users') {
      setActiveTab('users');
    } else if (initialTab === 'access' || initialTab === 'admin-access') {
      setActiveTab('access');
    } else if (initialTab === 'jobs' || initialTab === 'admin-jobs' || initialTab === 'overview') {
      setActiveTab('jobs');
    }
  }, [initialTab]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
    try {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 } });
    } catch {}
  };

  const handleTabChange = (tabId: 'jobs' | 'events' | 'letters' | 'analytics' | 'access' | 'users') => {
    setActiveTab(tabId);
    if (tabId === 'jobs') onNavigate('admin-jobs');
    else if (tabId === 'events') onNavigate('admin-events');
    else if (tabId === 'analytics') onNavigate('admin-analytics');
    else if (tabId === 'users') onNavigate('admin-users');
  };

  // Handle Password Login Verification
  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const entered = passwordInput.trim();

    if (entered && entered === DEFAULT_ADMIN_PASSWORD) {
      // Correct password
      try {
        sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
      } catch {}
      setIsAuthenticated(true);
      setPasswordInput('');
      setLoginError(null);
      if (onAdminLoginSuccess) {
        onAdminLoginSuccess();
      }
      showToast('Đăng nhập Quản trị thành công! Chào mừng bạn đến trang Admin.');
    } else {
      // Incorrect or empty password - exact required error: "Mật khẩu quản trị không chính xác!"
      setLoginError('Mật khẩu quản trị không chính xác!');
    }
    setIsSubmitting(false);
  };

  // Handle Logout
  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {}
    setIsAuthenticated(false);
    setPasswordInput('');
    setLoginError(null);
    if (onLogoutAdmin) {
      onLogoutAdmin();
    } else {
      onNavigate('home');
    }
  };

  // ==========================================
  // 1. MÀN HÌNH YÊU CẦU ĐĂNG NHẬP ADMIN (NẾU CHƯA XÁC THỰC)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-[0_15px_40px_rgba(15,23,42,0.08)] space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo variant="full" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#B90013] text-xs font-black rounded-full border border-red-100 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B90013]" />
              <span>Admin Portal • Cổng Quản trị</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-[#131B2E] tracking-tight">
                Màn hình khóa Quản trị viên
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
                Khu vực giới hạn. Bắt buộc nhập mật khẩu quản trị để truy cập Bảng điều khiển quản trị hệ thống.
              </p>
            </div>
          </div>

          {/* Error Message Box */}
          {loginError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-[#B90013] flex items-center gap-2.5 animate-shake shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#B90013]" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#B90013]" />
                <span>Mật khẩu Quản trị</span>
                <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Nhập mật khẩu quản trị..."
                  className={`w-full pl-4 pr-11 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:bg-white ${
                    loginError
                      ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400/20'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[#B90013] focus:ring-2 focus:ring-[#B90013]/10'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#B90013] hover:bg-[#A30010] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Đăng nhập Quản trị</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay về trang chủ sinh viên</span>
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Trạng thái đăng nhập được lưu an toàn trong phiên làm việc (sessionStorage).
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. GIAO DIỆN QUẢN TRỊ ADMIN (ĐÃ XÁC THỰC MẬT KHẨU)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Admin Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Logo variant="compact" />
            <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>
            <span className="px-2.5 py-0.5 bg-red-100 text-[#B90013] text-[11px] font-black rounded-md tracking-wider uppercase">
              Admin Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-98"
              title="Đăng xuất quyền quản trị và kết thúc phiên làm việc"
            >
              <LogOut className="w-4 h-4 text-red-600 shrink-0" />
              <span>Đăng xuất Admin</span>
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về trang sinh viên</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast feedback */}
        {toastMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Real-time System Banner */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Quản trị Thực chiến PTIT Career Hub:</strong> Dữ liệu việc làm và sự kiện lưu trực tiếp vào LocalStorage & truyền ngay lập tức sang trang <strong>/jobs</strong>, <strong>/events</strong> và <strong>/career-map</strong>.
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Đồng bộ Real-time</span>
          </span>
        </div>

        {/* 3 Main Management Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-1 border-b border-slate-200">
          {/* Tab 1: Quản lý Việc làm */}
          <button
            onClick={() => handleTabChange('jobs')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'jobs'
                ? 'bg-[#B90013] text-white shadow-sm ring-2 ring-red-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Tab 1: Quản lý Việc làm (JD Management)</span>
          </button>

          {/* Tab 2: Quản lý Sự kiện & Workshop */}
          <button
            onClick={() => handleTabChange('events')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-[#B90013] text-white shadow-sm ring-2 ring-red-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tab 2: Quản lý Sự kiện & Workshop (Events Management)</span>
          </button>

          {/* Tab 3: Thống kê & Báo cáo */}
          <button
            onClick={() => handleTabChange('analytics')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#B90013] text-white shadow-sm ring-2 ring-red-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Tab 3: Thống kê & Báo cáo (Analytics Dashboard)</span>
          </button>

          {/* Tab 4: Thư thông báo & Bản tin sinh viên */}
          <button
            onClick={() => handleTabChange('letters')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'letters'
                ? 'bg-[#B90013] text-white shadow-sm ring-2 ring-red-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Tab 4: Thư thông báo & Bản tin (System Letters)</span>
          </button>

          {/* Tab 5: Quản lý Người dùng & Sinh viên */}
          <button
            onClick={() => handleTabChange('users')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#B90013] text-white shadow-sm ring-2 ring-red-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tab 5: Quản lý Người dùng (Users Management)</span>
          </button>

          {/* Tab 6: Cấp quyền Quản trị Google */}
          <button
            onClick={() => handleTabChange('access')}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'access'
                ? 'bg-[#B90013] text-white shadow-sm ring-2 ring-red-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Tab 6: Cấp quyền Quản trị (Admin Access)</span>
          </button>
        </div>

        {/* TAB 1: QUẢN LÝ VIỆC LÀM (JD MANAGEMENT) */}
        {activeTab === 'jobs' && (
          <AdminJobsTab
            showToast={showToast}
            onJobsUpdated={onUpdateJobs}
          />
        )}

        {/* TAB 2: QUẢN LÝ SỰ KIỆN & WORKSHOP (EVENTS MANAGEMENT) */}
        {activeTab === 'events' && (
          <AdminEventsTab
            showToast={showToast}
            onEventsUpdated={onUpdateEvents}
          />
        )}

        {/* TAB 3: THỐNG KÊ & BÁO CÁO (ANALYTICS DASHBOARD) */}
        {activeTab === 'analytics' && <AdminAnalyticsTab />}

        {/* TAB 4: THƯ THÔNG BÁO & BẢN TIN (SYSTEM LETTERS) */}
        {activeTab === 'letters' && (
          <AdminLettersTab
            showToast={showToast}
            onNavigate={onNavigate}
          />
        )}

        {/* TAB 5: QUẢN LÝ NGƯỜI DÙNG & SINH VIÊN */}
        {activeTab === 'users' && <AdminUsersTab />}

        {/* TAB 6: CẤP QUYỀN QUẢN TRỊ (ADMIN ACCESS) */}
        {activeTab === 'access' && (
          <AdminAccessTab showToast={showToast} />
        )}
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { ScreenView } from '../types';
import { Logo } from './Logo';
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminLoginViewProps {
  onNavigate: (view: ScreenView) => void;
  onAdminLoginSuccess: () => void;
}

const ADMIN_PASSCODE = 'ptitcareerhubvlk212';
const ADMIN_SESSION_STORAGE_KEY = 'ptit_admin_authenticated';

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onNavigate,
  onAdminLoginSuccess,
}) => {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const entered = password.trim();

    setTimeout(() => {
      setLoading(false);
      if (entered && entered === ADMIN_PASSCODE) {
        try {
          sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
        } catch {}
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        } catch {}
        onAdminLoginSuccess();
        onNavigate('admin-dashboard');
      } else {
        // Exact error message as requested by prompt
        setError('Mật khẩu quản trị không chính xác!');
      }
    }, 250);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 font-['Plus_Jakarta_Sans',sans-serif] bg-slate-50/50">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-[0_15px_45px_rgba(15,23,42,0.08)] space-y-6 animate-scale-in">
        {/* Back link to Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ sinh viên</span>
        </button>

        {/* Header & Lock Icon */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <Logo variant="full" />
          </div>

          <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#B90013] mx-auto flex items-center justify-center border border-red-100 shadow-2xs">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#B90013] text-xs font-black rounded-full border border-red-100 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B90013]" />
            <span>Màn hình khóa Quản trị viên</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#131B2E] tracking-tight">
              Admin Passcode Lock
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
              Khu vực giới hạn. Bắt buộc nhập mật khẩu quản trị để truy cập Bảng điều khiển quản trị hệ thống.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-[#B90013] text-xs font-bold flex items-center gap-2.5 animate-shake shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-[#B90013] shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form Nhập Mật Khẩu Admin */}
        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#B90013]" />
              <span>Mật khẩu Quản trị</span>
              <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập mật khẩu quản trị..."
                className={`w-full pl-4 pr-11 py-3 text-sm bg-slate-50 border rounded-xl transition-all focus:outline-none focus:bg-white font-medium ${
                  error
                    ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400/20'
                    : 'border-slate-200 text-slate-900 focus:border-[#B90013] focus:ring-2 focus:ring-[#B90013]/10'
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

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-[#B90013] hover:bg-[#A30010] text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50 cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Đang xác thực...' : 'Mở khóa Quản trị'}</span>
          </button>
        </form>

        {/* Security Notice */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Trạng thái quản trị được lưu an toàn trong sessionStorage và tự động khóa khi đóng trình duyệt hoặc khi bấm Đăng xuất.
          </p>
        </div>
      </div>
    </div>
  );
};

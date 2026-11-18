import React, { useState } from 'react';
import { Logo } from './Logo';
import { UserAuth } from '../types';
import { X, ShieldCheck, AlertCircle, CheckCircle2, Lock, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { loginWithGooglePopup } from '../services/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (auth: UserAuth) => void;
  onNavigateAdmin?: () => void;
  reasonMessage?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onNavigateAdmin,
  reasonMessage,
}) => {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Tiếp tục với Google (Firebase Auth signInWithPopup)
  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setAuthError(null);

    try {
      const firebaseUser = await loginWithGooglePopup();
      if (firebaseUser) {
        const authUser: UserAuth = {
          isLoggedIn: true,
          name: firebaseUser.name || '',
          email: firebaseUser.email || '',
          avatarLetter: (firebaseUser.name || firebaseUser.email || 'G')[0]?.toUpperCase() || 'G',
          studentId: '',
          major: '',
          year: '',
          birthYear: '',
          provider: 'google',
        };
        onLoginSuccess(authUser);
        onClose();
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch {}
        return;
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setLoadingGoogle(false);
        return;
      }
      console.warn('Firebase Google Auth popup error:', err);
      setAuthError(err?.message || 'Đăng nhập Google không thành công. Vui lòng thử lại.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative space-y-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Guest can dismiss anytime to continue exploring */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="Đóng"
          aria-label="Đóng modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <Logo variant="full" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-50 text-[#B90013] text-[11px] font-black uppercase tracking-wider border border-red-100">
            <span>Cổng Sinh viên PTIT</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#131B2E] tracking-tight">
            Đăng nhập tài khoản
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
            Đăng nhập tài khoản để đồng bộ lộ trình nghề nghiệp, kết quả định hướng và CV AI của bạn.
          </p>
        </div>

        {/* Reason Message Banner (khi người dùng thao tác vào tính năng yêu cầu tài khoản) */}
        {reasonMessage && (
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs font-semibold text-amber-900 flex items-center gap-2.5 animate-fade-in shadow-2xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{reasonMessage}</span>
          </div>
        )}

        {/* Benefits list */}
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đồng bộ lộ trình học tập theo năm sinh viên PTIT</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Quản lý nhiệm vụ và tiến độ My Tasks theo mục tiêu</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tối ưu CV với AI & kết nối việc làm tuyển dụng</span>
          </div>
        </div>

        {authError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-start gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{authError}</span>
          </div>
        )}

        {/* Auth Action Buttons - Chỉ duy nhất 1 phương thức: Tiếp tục với Google */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl border-2 border-slate-200 hover:border-[#B90013] bg-white hover:bg-red-50/20 font-bold text-slate-800 text-sm transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loadingGoogle ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}</span>
          </button>
        </div>

        {/* Security Info & Admin Link */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Bảo mật Học viện PTIT
          </span>

          {onNavigateAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateAdmin();
              }}
              className="text-slate-500 hover:text-[#B90013] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Lock className="w-3 h-3 text-[#B90013]" />
              <span>Dành cho Quản trị viên</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

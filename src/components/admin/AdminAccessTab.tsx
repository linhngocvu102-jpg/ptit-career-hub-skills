import React, { useState, useEffect } from 'react';
import {
  AuthorizedAdminUser,
  PRIMARY_SUPER_ADMIN_EMAIL,
  loadAuthorizedAdmins,
  grantAdminAccess,
  revokeAdminAccess,
} from '../../services/admin/adminAuthService';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Lock,
  Mail,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { showToast as triggerGlobalToast } from '../../utils/toast';

interface AdminAccessTabProps {
  showToast?: (msg: string) => void;
}

export const AdminAccessTab: React.FC<AdminAccessTabProps> = ({
  showToast,
}) => {
  const triggerToast = (msg: string) => {
    if (showToast) showToast(msg);
    triggerGlobalToast(msg);
  };
  const [adminList, setAdminList] = useState<AuthorizedAdminUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const refreshList = () => {
    setAdminList(loadAuthorizedAdmins());
  };

  useEffect(() => {
    refreshList();
    const handleSync = () => refreshList();
    window.addEventListener('ptit_admin_list_updated', handleSync);
    return () => window.removeEventListener('ptit_admin_list_updated', handleSync);
  }, []);

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailTrim = newEmail.trim().toLowerCase();
    if (!emailTrim || !emailTrim.includes('@')) {
      setFormError('Vui lòng nhập địa chỉ email Google hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await grantAdminAccess(
        emailTrim,
        newName.trim() || undefined,
        newNote.trim() || undefined,
        PRIMARY_SUPER_ADMIN_EMAIL
      );

      if (res.success) {
        setNewEmail('');
        setNewName('');
        setNewNote('');
        refreshList();
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
        triggerToast(`Đã cấp quyền quản trị thành công cho tài khoản: ${emailTrim}`);
      } else {
        setFormError(res.error || 'Không thể cấp quyền cho tài khoản này.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu trữ dữ liệu cấp quyền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeConfirm = async (email: string) => {
    try {
      const res = await revokeAdminAccess(email);
      if (res.success) {
        refreshList();
        setRevokingEmail(null);
        triggerToast(`Đã thu hồi quyền quản trị của tài khoản: ${email}`);
      } else {
        triggerToast(res.error || 'Không thể thu hồi quyền.');
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Lỗi khi thu hồi quyền.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#B90013] to-red-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#131B2E]">
                Quản lý Cấp quyền Ban Quản trị Website
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ cho phép tài khoản Google Admin tối cao ({PRIMARY_SUPER_ADMIN_EMAIL}) và các tài khoản Google được cấp quyền đăng nhập khu vực này.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-red-50 text-[#B90013] border border-red-200 text-xs font-black flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#B90013]" />
              <span>Admin tối cao: {PRIMARY_SUPER_ADMIN_EMAIL}</span>
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Dữ liệu phân quyền được lưu trữ bền vững tại <strong>Firebase Firestore</strong> (bộ sưu tập <code>authorized_admins</code>) và đồng bộ real-time. Tài khoản được cấp quyền có thể đăng nhập trực tiếp bằng Google Sign-In hoặc Email Google được ủy quyền.
          </p>
        </div>
      </div>

      {/* Grant Form & List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form to Grant Access */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-4 h-4 text-[#B90013]" />
            <h3 className="font-extrabold text-sm text-[#131B2E]">
              Cấp quyền cho tài khoản Google mới
            </h3>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleGrantSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Email tài khoản Google *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="canbo.ptit@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#B90013] focus:bg-white text-xs font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Họ tên / Chức danh người nhận quyền
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Cán bộ Hướng nghiệp / Ban CTSV"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#B90013] focus:bg-white text-xs font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                Ghi chú / Mục đích cấp quyền
              </label>
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="VD: Phụ trách quản lý việc làm & duyệt sự kiện tuyển dụng..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#B90013] focus:bg-white text-xs font-medium leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#B90013] hover:bg-[#A30010] text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu trữ...' : 'Cấp quyền Quản trị ngay'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Authorized Accounts List */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-[#131B2E]">
                Danh sách Tài khoản Google có quyền Quản trị ({adminList.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              Lưu trữ Firestore & LocalStorage
            </span>
          </div>

          <div className="space-y-2.5">
            {adminList.map((user) => {
              const isSuper = user.email.toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase();

              return (
                <div
                  key={user.email}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSuper
                      ? 'bg-red-50/40 border-red-200 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-[#131B2E] font-mono">
                          {user.email}
                        </span>

                        {isSuper ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#B90013] text-[10px] font-black border border-red-200 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-[#B90013]" />
                            <span>Quản trị viên tối cao Website</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                            ● Đã cấp quyền Admin
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        <strong>{user.name || 'Cán bộ Quản trị'}</strong>
                        {user.note ? ` • ${user.note}` : ''}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                        <span>Ngày cấp: {new Date(user.addedAt).toLocaleDateString('vi-VN')}</span>
                        <span>Người cấp: {user.addedBy}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      {isSuper ? (
                        <span className="text-[11px] font-bold text-slate-400 italic">
                          Tài khoản gốc (Bảo vệ)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRevokingEmail(user.email)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Thu hồi quyền</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Revoke confirmation box */}
                  {revokingEmail === user.email && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                      <span className="text-red-800 font-bold">
                        Xác nhận thu hồi quyền quản trị của <strong>{user.email}</strong>?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRevokeConfirm(user.email)}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer"
                        >
                          Xác nhận thu hồi
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokingEmail(null)}
                          className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-white cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

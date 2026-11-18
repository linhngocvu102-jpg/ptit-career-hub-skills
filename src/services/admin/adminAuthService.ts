import {
  getDb,
  getFirebaseAuth,
  saveAuthorizedAdminToFirestore,
  deleteAuthorizedAdminFromFirestore,
  fetchAuthorizedAdminsFromFirestore,
  subscribeToAuthorizedAdmins,
} from '../firebase';
import { AuthorizedAdminUser } from '../../types';

export { subscribeToAuthorizedAdmins };
export type { AuthorizedAdminUser };

export const PRIMARY_SUPER_ADMIN_EMAIL = 'Linhngocvu102@gmail.com';
export const DEVELOPER_ADMIN_EMAIL = 'dulieu.obdhanoi@gmail.com';
export const CURRENT_PROJECT_ADMIN_EMAIL = 'enzu2703@gmail.com';

const ADMIN_STORAGE_KEY = 'ptit_authorized_admins_v2';

const DEFAULT_AUTHORIZED_ADMINS: AuthorizedAdminUser[] = [
  {
    email: CURRENT_PROJECT_ADMIN_EMAIL,
    name: 'Quản trị viên Dự án Website',
    role: 'super_admin',
    note: 'Tài khoản Google Admin hiện tại của dự án',
    addedAt: '2026-10-01T00:00:00.000Z',
    addedBy: 'Hệ thống Quản trị Website',
    status: 'active',
  },
  {
    email: PRIMARY_SUPER_ADMIN_EMAIL,
    name: 'Quản trị viên tối cao Website',
    role: 'super_admin',
    note: 'Tài khoản Google Admin tối cao Website (Không thể thu hồi)',
    addedAt: '2026-10-01T00:00:00.000Z',
    addedBy: 'Hệ thống Quản trị Website',
    status: 'active',
  },
  {
    email: DEVELOPER_ADMIN_EMAIL,
    name: 'Nhà phát triển Hệ thống',
    role: 'super_admin',
    note: 'Tài khoản kỹ thuật & phát triển ứng dụng',
    addedAt: '2026-10-01T00:00:00.000Z',
    addedBy: 'Hệ thống Quản trị Website',
    status: 'active',
  },
  {
    email: 'nplinh715@gmail.com',
    name: 'Quản trị viên Dự án',
    role: 'super_admin',
    note: 'Tài khoản Quản trị viên Google Workspace dự án',
    addedAt: '2026-10-01T00:00:00.000Z',
    addedBy: 'Hệ thống Quản trị Website',
    status: 'active',
  },
];

/**
 * Load all authorized admin accounts from localStorage and Firestore
 */
export function loadAuthorizedAdmins(): AuthorizedAdminUser[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure primary super admin is always present and active
        const hasPrimary = parsed.some(
          (u: AuthorizedAdminUser) =>
            u.email.toLowerCase() === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()
        );
        if (!hasPrimary) {
          parsed.unshift(DEFAULT_AUTHORIZED_ADMINS[0]);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading authorized admins from storage:', err);
  }

  // Fallback to default list
  saveAuthorizedAdminsToStorage(DEFAULT_AUTHORIZED_ADMINS);
  return DEFAULT_AUTHORIZED_ADMINS;
}

/**
 * Save authorized admin list to localStorage
 */
function saveAuthorizedAdminsToStorage(list: AuthorizedAdminUser[]) {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving authorized admins to storage:', err);
  }
}

/**
 * Check if a given email is authorized for admin portal access
 */
export function isAuthorizedAdminEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // Primary super admin is always authorized
  if (normalized === CURRENT_PROJECT_ADMIN_EMAIL.toLowerCase()) return true;
  if (normalized === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  if (normalized === DEVELOPER_ADMIN_EMAIL.toLowerCase()) return true;
  if (normalized === 'nplinh715@gmail.com') return true;

  const list = loadAuthorizedAdmins();
  return list.some(
    (u) => u.email.trim().toLowerCase() === normalized && u.status === 'active'
  );
}

/**
 * Validate Google email for admin access
 */
export function validateAdminGoogleLogin(email: string): { success: boolean; error?: string } {
  if (!email || !email.trim()) {
    return {
      success: false,
      error: 'Vui lòng nhập email tài khoản Google quản trị.',
    };
  }

  const normalized = email.trim().toLowerCase();
  const authorized = isAuthorizedAdminEmail(normalized);

  if (!authorized) {
    return {
      success: false,
      error: `Tài khoản Google "${email}" không thuộc Ban quản trị Website. Chỉ cho phép tài khoản Google quản trị (${PRIMARY_SUPER_ADMIN_EMAIL}) hoặc các tài khoản đã được cấp quyền truy cập.`,
    };
  }

  return { success: true };
}

/**
 * Grant admin access to a new Google account
 */
export async function grantAdminAccess(
  newEmail: string,
  name?: string,
  note?: string,
  addedBy: string = PRIMARY_SUPER_ADMIN_EMAIL
): Promise<{ success: boolean; user?: AuthorizedAdminUser; error?: string }> {
  const normalized = newEmail.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return { success: false, error: 'Địa chỉ email Google không hợp lệ.' };
  }

  const list = loadAuthorizedAdmins();
  const existingIdx = list.findIndex((u) => u.email.trim().toLowerCase() === normalized);

  let newUser: AuthorizedAdminUser;

  if (existingIdx >= 0) {
    // Reactivate or update
    list[existingIdx] = {
      ...list[existingIdx],
      name: name?.trim() || list[existingIdx].name || 'Quản trị viên',
      note: note?.trim() || list[existingIdx].note || 'Được cấp quyền bởi Ban quản trị',
      status: 'active',
      addedAt: new Date().toISOString(),
      addedBy,
    };
    newUser = list[existingIdx];
  } else {
    newUser = {
      email: newEmail.trim(),
      name: name?.trim() || 'Quản trị viên Google',
      role: 'admin',
      note: note?.trim() || 'Được cấp quyền bởi Ban quản trị Website',
      addedAt: new Date().toISOString(),
      addedBy,
      status: 'active',
    };
    list.push(newUser);
  }

  saveAuthorizedAdminsToStorage(list);

  // Sync to Firestore collection 'authorized_admins'
  try {
    await saveAuthorizedAdminToFirestore(newUser);
  } catch (err) {
    console.warn('Firestore sync failed for authorized_admin:', err);
  }

  // Broadcast event for UI update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ptit_admin_list_updated', {
        detail: { user: newUser, action: 'grant' },
      })
    );
  }

  return { success: true, user: newUser };
}

/**
 * Revoke admin access for an account
 */
export async function revokeAdminAccess(
  targetEmail: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = targetEmail.trim().toLowerCase();

  // Protect primary super admin from revocation
  if (normalized === PRIMARY_SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: `Không thể thu hồi quyền của Quản trị viên tối cao Website (${PRIMARY_SUPER_ADMIN_EMAIL}).`,
    };
  }

  const list = loadAuthorizedAdmins();
  const filtered = list.filter((u) => u.email.trim().toLowerCase() !== normalized);

  if (filtered.length === list.length) {
    return { success: false, error: 'Không tìm thấy tài khoản cần thu hồi.' };
  }

  saveAuthorizedAdminsToStorage(filtered);

  // Delete from Firestore directly
  try {
    await deleteAuthorizedAdminFromFirestore(normalized);
  } catch (err) {
    console.warn('Firestore delete failed for authorized_admin:', err);
  }

  // Broadcast event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ptit_admin_list_updated', {
        detail: { email: targetEmail, action: 'revoke' },
      })
    );
  }

  return { success: true };
}

/**
 * Admin Passcode Lock is strictly enforced via sessionStorage; auto-login bypass is disabled.
 */
export function checkAutoLoginGoogleAdmin(
  _onSuccess: (email: string, displayName?: string) => void
): () => void {
  return () => {};
}

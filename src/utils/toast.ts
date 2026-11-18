export type ToastType = 'success' | 'info' | 'warning';

export interface ToastDetail {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Dispatch a global toast notification event.
 * Listened by the root App toast container.
 */
export function showToast(
  message: string,
  type: ToastType = 'success',
  duration = 3500
): void {
  if (typeof window === 'undefined') return;
  const detail: ToastDetail = {
    id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    message,
    type,
    duration,
  };
  window.dispatchEvent(new CustomEvent('ptit_show_toast', { detail }));
}

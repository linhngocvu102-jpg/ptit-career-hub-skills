import { NotificationItem, SystemLetterData, TargetJob, CareerEvent, UserProfileState, AdminSystemLetter } from '../types';
import { getPublishedLettersForStudent } from './letters/systemLetterService';

const NOTIFICATIONS_STORAGE_KEY = 'ptit_notifications_state_v2';
const NOTIFICATIONS_READ_KEY = 'ptit_notifications_read_ids_v2';

/**
 * Helper to get list of read notification IDs from localStorage
 */
function getReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_READ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Helper to save read notification IDs to localStorage
 */
function saveReadNotificationIds(ids: string[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(ids));
  } catch {}
}

/**
 * Generates personalized notifications based on the student's profile, major, academic year, and available jobs/events
 */
export function generatePersonalizedNotifications(
  userProfile: UserProfileState | null,
  jobs: TargetJob[] = [],
  events: CareerEvent[] = [],
  systemLetters?: AdminSystemLetter[]
): NotificationItem[] {
  const readIds = getReadNotificationIds();
  const studentName = userProfile?.displayName?.trim() || 'Sinh viên';
  const major = userProfile?.major?.trim() || 'Khối ngành Kinh tế PTIT';
  const academicYear = userProfile?.academicYear?.trim() || 'Đại học';
  const hasTargetJob = Boolean(userProfile?.targetJobId || userProfile?.targetJobTitle);
  const hasCv = Boolean(userProfile?.cvFileName);

  const notifications: NotificationItem[] = [];

  // ==================== 1. THƯ THÔNG BÁO TỪ BAN QUẢN TRỊ ADMIN (ADMIN SYSTEM LETTERS) ====================
  // Chỉ hiển thị các thư do Admin trực tiếp soạn thảo và phát hành, KHÔNG tự động gửi thông báo ngẫu nhiên.
  const publishedLetters = getPublishedLettersForStudent(userProfile?.major, userProfile?.academicYear, systemLetters);

  publishedLetters.forEach((letter) => {
    const notifId = `notif-letter-${letter.id}`;
    notifications.push({
      id: notifId,
      title: `✉️ ${letter.title}`,
      message: `${letter.subject}. ${letter.content?.[0] ? letter.content[0].slice(0, 95) + '...' : ''}`,
      type: 'system',
      timeAgo: letter.sentDate || 'Vừa xong',
      read: readIds.includes(notifId),
      systemLetter: {
        id: letter.id,
        title: letter.title,
        sender: letter.sender,
        senderRole: letter.senderRole,
        sentDate: letter.sentDate,
        recipientName: studentName,
        recipientMajor: major,
        recipientYear: academicYear,
        subject: letter.subject,
        greeting: letter.greeting || `Thân gửi bạn ${studentName},`,
        content: letter.content,
        recommendations: letter.recommendations,
        ctaLabel: letter.ctaLabel,
        ctaView: letter.ctaView,
      },
    });
  });

  // ==================== 2. GỢI Ý VIỆC LÀM PHÙ HỢP CÁ NHÂN HÓA (JOB NOTIFICATIONS) ====================
  // Tìm kiếm các công việc có liên quan đến chuyên ngành của sinh viên
  const normalizedMajor = major.toLowerCase();
  const matchedJobs = jobs.filter((j) => {
    const titleLower = j.title.toLowerCase();
    const descLower = (j.description || '').toLowerCase();
    const skillsLower = (j.requiredSkills || []).map((s) => s.toLowerCase()).join(' ');

    if (normalizedMajor.includes('marketing')) {
      return titleLower.includes('marketing') || titleLower.includes('content') || titleLower.includes('seo') || titleLower.includes('social') || titleLower.includes('truyền thông');
    }
    if (normalizedMajor.includes('tài chính') || normalizedMajor.includes('fintech')) {
      return titleLower.includes('fintech') || titleLower.includes('tài chính') || titleLower.includes('phân tích') || titleLower.includes('analyst') || titleLower.includes('ngân hàng');
    }
    if (normalizedMajor.includes('thương mại') || normalizedMajor.includes('e-commerce') || normalizedMajor.includes('tmđt')) {
      return titleLower.includes('thương mại') || titleLower.includes('e-commerce') || titleLower.includes('sàn') || titleLower.includes('vận hành') || titleLower.includes('shopee');
    }
    if (normalizedMajor.includes('logistics') || normalizedMajor.includes('chuỗi cung ứng')) {
      return titleLower.includes('logistics') || titleLower.includes('chuỗi cung ứng') || titleLower.includes('supply') || titleLower.includes('kho') || titleLower.includes('vận chuyển');
    }
    if (normalizedMajor.includes('quản trị') || normalizedMajor.includes('kinh doanh')) {
      return titleLower.includes('kinh doanh') || titleLower.includes('quản trị') || titleLower.includes('project') || titleLower.includes('business') || titleLower.includes('trợ lý');
    }
    if (normalizedMajor.includes('kế toán') || normalizedMajor.includes('kiểm toán')) {
      return titleLower.includes('kế toán') || titleLower.includes('kiểm toán') || titleLower.includes('thuế') || titleLower.includes('audit');
    }
    return true;
  });

  // Lấy ra 2 công việc phù hợp nhất để gửi thông báo
  const displayJobs = (matchedJobs.length > 0 ? matchedJobs : jobs).slice(0, 2);

  displayJobs.forEach((job, idx) => {
    const notifId = `notif-job-match-${job.id}`;
    notifications.push({
      id: notifId,
      title: `🎯 Gợi ý việc làm: ${job.title}`,
      message: `Doanh nghiệp ${job.company} đang tuyển dụng. Rất phù hợp với sinh viên ngành ${major} (${job.salaryDisplay || job.salaryText || 'Lương hấp dẫn'}).`,
      type: 'job',
      timeAgo: idx === 0 ? '30 phút trước' : '2 giờ trước',
      read: readIds.includes(notifId),
      linkView: 'job-detail',
      jobId: job.id,
    });
  });

  // ==================== 3. SỰ KIỆN & WORKSHOP PHÙ HỢP CÁ NHÂN HÓA (EVENT NOTIFICATIONS) ====================
  // Tìm các sự kiện phù hợp nhất theo chuyên ngành hoặc sự kiện mới nhất
  const matchedEvents = events.filter((e) => {
    const titleLower = e.title.toLowerCase();
    const descLower = (e.description || '').toLowerCase();
    return titleLower.includes(normalizedMajor.split(' ')[0]) || descLower.includes(normalizedMajor.split(' ')[0]) || titleLower.includes('job fair') || titleLower.includes('career');
  });

  const displayEvents = (matchedEvents.length > 0 ? matchedEvents : events).slice(0, 2);

  displayEvents.forEach((event, idx) => {
    const notifId = `notif-event-${event.id}`;
    notifications.push({
      id: notifId,
      title: `🎪 Sự kiện mới: ${event.title}`,
      message: `Được tổ chức bởi ${event.organizer} vào ${event.date || 'sắp tới'}. Nhấp để xem thông tin chi tiết và đăng ký tham gia.`,
      type: 'event',
      timeAgo: idx === 0 ? '3 giờ trước' : '1 ngày trước',
      read: readIds.includes(notifId),
      linkView: 'event-detail',
      eventId: event.id,
    });
  });

  // ==================== 4. THÔNG BÁO NHẮC NHỞ HỒ SƠ & LỘ TRÌNH (ROADMAP ALERTS) ====================
  if (!hasTargetJob) {
    const notifId = 'notif-alert-target-job';
    notifications.push({
      id: notifId,
      title: '🎯 Cần chọn công việc mục tiêu để hoàn tất Lộ trình 3 Cột mốc',
      message: 'Lộ trình phát triển của bạn đang thiếu vị trí mục tiêu làm đích đến (Cột mốc 3). Khám phá danh sách JD để chọn ngay.',
      type: 'roadmap',
      timeAgo: 'Hôm nay',
      read: readIds.includes(notifId),
      linkView: 'jobs',
    });
  }

  if (!hasCv) {
    const notifId = 'notif-alert-upload-cv';
    notifications.push({
      id: notifId,
      title: '📄 Tải file CV để kích hoạt chấm điểm ATS & Gap Analysis',
      message: 'Bạn chưa kết nối file CV. Tải lên tệp PDF để AI tự động trích xuất kỹ năng và đối soát chuẩn xác với JD mục tiêu.',
      type: 'cv',
      timeAgo: 'Hôm nay',
      read: readIds.includes(notifId),
      linkView: 'cv-builder',
    });
  }

  return notifications;
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(id: string) {
  const readIds = getReadNotificationIds();
  if (!readIds.includes(id)) {
    readIds.push(id);
    saveReadNotificationIds(readIds);
  }
}

/**
 * Mark all given notifications as read
 */
export function markAllNotificationsAsRead(notifications: NotificationItem[]) {
  const readIds = getReadNotificationIds();
  notifications.forEach((n) => {
    if (!readIds.includes(n.id)) {
      readIds.push(n.id);
    }
  });
  saveReadNotificationIds(readIds);
}

import { AdminSystemLetter, ScreenView } from '../../types';
import {
  fetchSystemLettersFromFirestore,
  saveSystemLetterToFirestore,
  deleteSystemLetterFromFirestore,
  subscribeToSystemLetters,
} from '../firebase';

export { subscribeToSystemLetters };

export const SYSTEM_LETTERS_STORAGE_KEY = 'ptit_admin_system_letters_v1';

// Pre-configured letter templates that Admin can pick to quickly compose official letters
export const ADMIN_LETTER_TEMPLATES: Omit<AdminSystemLetter, 'id' | 'createdAt'>[] = [
  {
    title: 'Thư thông báo từ Trung tâm Hướng nghiệp PTIT',
    subject: 'Thư chào mừng & định hướng lộ trình nghề nghiệp gửi riêng cho sinh viên',
    sender: 'ThS. Trần Hoàng Nam',
    senderRole: 'Giám đốc Trung tâm Hỗ trợ Sinh viên & Khởi nghiệp Học viện (PTIT)',
    sentDate: new Date().toLocaleDateString('vi-VN'),
    targetMajor: 'all',
    targetYear: 'all',
    greeting: 'Thân gửi các bạn sinh viên PTIT,',
    content: [
      'Thay mặt Trung tâm Hỗ trợ Sinh viên & Hướng nghiệp Học viện Công nghệ Bưu chính Viễn thông (PTIT), Thầy rất vui mừng chào đón em đến với nền tảng định hướng nghề nghiệp và kết nối việc làm chuyên sâu của Học viện.',
      'Qua thông tin hồ sơ của em, hệ thống đã bước đầu phân tích khung chương trình đào tạo chuẩn và các yêu cầu tuyển dụng thực tế từ hơn 200+ doanh nghiệp đối tác hàng đầu trong mạng lưới của PTIT.',
      'Để giúp em chuẩn bị hành trang vững chắc nhất, Trung tâm khuyến nghị em thực hiện 3 bước quan trọng: (1) Chọn 1 công việc mục tiêu (JD) làm đích đến; (2) Tải lên file CV để AI phân tích khoảng cách kỹ năng (Gap Analysis); và (3) Từng bước hoàn thành các nhiệm vụ thực chiến trong Lộ trình 3 Cột mốc.',
      'Chúc em có một hành trình học tập, rèn luyện tràn đầy hứng khởi và sớm đạt được công việc mơ ước tại các tập đoàn công nghệ & kinh tế hàng đầu!'
    ],
    recommendations: [
      'Lựa chọn 1 vị trí mục tiêu cụ thể tại mục "Việc làm" để kích hoạt Cột mốc 3 của lộ trình',
      'Tải CV định dạng PDF để hệ thống đánh giá mức độ tương thích ATS và gợi ý từ khóa chuẩn',
      'Tham gia các Workshop và Tọa đàm do doanh nghiệp đối tác PTIT tổ chức để tích lũy chứng nhận'
    ],
    ctaLabel: 'Khám phá Lộ trình 3 Cột mốc ngay',
    ctaView: 'roadmap',
    status: 'published',
  },
  {
    title: 'Thông báo đợt tuyển dụng đối tác chiến lược PTIT',
    subject: 'Cơ hội thực tập và làm việc dành riêng cho sinh viên khối ngành Kinh tế PTIT',
    sender: 'Ban Hợp tác Doanh nghiệp PTIT',
    senderRole: 'Phòng Đào tạo & Hợp tác Doanh nghiệp Học viện PTIT',
    sentDate: new Date().toLocaleDateString('vi-VN'),
    targetMajor: 'all',
    targetYear: 'all',
    greeting: 'Kính gửi các bạn sinh viên,',
    content: [
      'Học viện PTIT phối hợp cùng mạng lưới đối tác (VNPT, Viettel, FPT, MoMo, Shopee, Techcombank, VPBank, One Mount...) chính thức mở cổng ưu tiên tiếp nhận hồ sơ thực tập và ứng tuyển sớm.',
      'Các vị trí tuyển dụng ưu tiên tuyển dụng sinh viên khối ngành Kinh tế PTIT với chế độ hỗ trợ thực tập hấp dẫn, lộ trình đào tạo bài bản và cơ hội chuyển tiếp lên nhân viên chính thức ngay sau khi tốt nghiệp.',
      'Hồ sơ của em đã được đánh dấu tiềm năng. Hãy nhanh chóng rà soát lại thông tin CV và ứng tuyển trực tiếp vào các JD mục tiêu phù hợp trên hệ thống.'
    ],
    recommendations: [
      'Kiểm tra kỹ các yêu cầu kỹ năng trong JD trước khi gửi CV',
      'Tối ưu hóa điểm ATS của CV đạt từ 70% trở lên bằng công cụ AI CV',
      'Đăng ký tham dự Ngày hội Việc làm PTIT Job Fair sắp tới'
    ],
    ctaLabel: 'Xem danh sách việc làm phù hợp',
    ctaView: 'jobs',
    status: 'published',
  },
  {
    title: 'Thông báo Học bổng Thực tập Doanh nghiệp & Workshop Chuyên đề',
    subject: 'Chương trình tài trợ học bổng kỹ năng số & tiếp nhận thực tập sinh tiềm năng',
    sender: 'Hội đồng Khoa học & Hướng nghiệp PTIT',
    senderRole: 'Trung tâm Phát triển Nguồn nhân lực Công nghệ số PTIT',
    sentDate: new Date().toLocaleDateString('vi-VN'),
    targetMajor: 'all',
    targetYear: 'all',
    greeting: 'Chào các bạn sinh viên năng động của PTIT,',
    content: [
      'Nhằm hỗ trợ sinh viên nhanh chóng tiếp cận thực tiễn chuyển đổi số và công nghệ tài chính, Học viện phối hợp cùng các quỹ đầu tư và tập đoàn công nghệ trao tặng 50 suất học bổng trải nghiệm thực tế.',
      'Sinh viên tham gia sẽ được đào tạo trực tiếp 1:1 cùng các chuyên gia hàng đầu, tham gia xử lý các bài toán nghiệp vụ thực tế và được cấp chứng chỉ chuẩn doanh nghiệp.',
      'Hãy theo dõi mục Sự kiện và nộp hồ sơ đăng ký tham dự sớm trước thời hạn quy định.'
    ],
    recommendations: [
      'Cập nhật hồ sơ năng lực cá nhân trên cổng PTIT Career Hub',
      'Chuẩn bị CV với các dự án thực tế và kỹ năng mềm nổi bật',
      'Tham gia đầy đủ các buổi định hướng và phỏng vấn trực tiếp'
    ],
    ctaLabel: 'Xem danh sách sự kiện & Workshop',
    ctaView: 'events',
    status: 'published',
  },
];

/**
 * Load all letters directly from Firestore (source of truth)
 */
export async function loadAllLettersFromFirestore(): Promise<AdminSystemLetter[]> {
  try {
    const remote = await fetchSystemLettersFromFirestore();
    if (remote !== null) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SYSTEM_LETTERS_STORAGE_KEY, JSON.stringify(remote));
      }
      return remote;
    }
  } catch (err) {
    console.warn('Failed to fetch letters from Firestore:', err);
  }
  return loadAllLettersFromStorage();
}

/**
 * Seed initial official letters to Firestore if collection /system_letters is empty
 */
export async function seedInitialLettersToFirestore(): Promise<{ count: number; error?: string }> {
  try {
    const current = await fetchSystemLettersFromFirestore();
    if (current && current.length > 0) {
      return { count: current.length };
    }
    let added = 0;
    for (let i = 0; i < ADMIN_LETTER_TEMPLATES.length; i++) {
      const template = ADMIN_LETTER_TEMPLATES[i];
      const now = new Date().toISOString();
      await saveSystemLetterToFirestore({
        ...template,
        id: `letter-template-${i + 1}`,
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }
    return { count: added };
  } catch (err: any) {
    console.error('Failed to seed initial letters to Firestore:', err);
    return { count: 0, error: err?.message || String(err) };
  }
}

/**
 * Load all letters stored by Admin from localStorage cache
 */
export function loadAllLettersFromStorage(): AdminSystemLetter[] {
  try {
    const raw = localStorage.getItem(SYSTEM_LETTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return [];
  } catch (e) {
    console.error('Error loading admin letters from storage:', e);
    return [];
  }
}

/**
 * Get published letters targeted to a student's profile
 */
export function getPublishedLettersForStudent(
  major?: string,
  academicYear?: string,
  lettersList?: AdminSystemLetter[]
): AdminSystemLetter[] {
  const letters = lettersList || loadAllLettersFromStorage();
  const normalizedMajor = (major || '').toLowerCase().trim();
  const normalizedYear = (academicYear || '').toLowerCase().trim();

  return letters.filter((letter) => {
    if (letter.status !== 'published') return false;

    // Check target major
    if (letter.targetMajor && letter.targetMajor !== 'all') {
      const targetM = letter.targetMajor.toLowerCase().trim();
      if (!normalizedMajor.includes(targetM) && !targetM.includes(normalizedMajor)) {
        return false;
      }
    }

    // Check target academic year
    if (letter.targetYear && letter.targetYear !== 'all') {
      const targetY = letter.targetYear.toLowerCase().trim();
      if (normalizedYear && !normalizedYear.includes(targetY) && !targetY.includes(normalizedYear)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Admin creates or updates a letter directly in Firestore
 */
export async function adminSaveLetter(letterData: Partial<AdminSystemLetter>): Promise<AdminSystemLetter> {
  const current = loadAllLettersFromStorage();
  const now = new Date().toISOString();
  let savedLetter: AdminSystemLetter;

  if (letterData.id) {
    const index = current.findIndex((l) => l.id === letterData.id);
    if (index >= 0) {
      savedLetter = {
        ...current[index],
        ...letterData,
        updatedAt: now,
      } as AdminSystemLetter;
      current[index] = savedLetter;
    } else {
      savedLetter = {
        id: letterData.id,
        title: letterData.title || 'Thông báo mới từ PTIT',
        subject: letterData.subject || 'Thông báo nội bộ dành cho sinh viên',
        sender: letterData.sender || 'Trung tâm Hướng nghiệp PTIT',
        senderRole: letterData.senderRole || 'Học viện Công nghệ Bưu chính Viễn thông',
        sentDate: letterData.sentDate || new Date().toLocaleDateString('vi-VN'),
        targetMajor: letterData.targetMajor || 'all',
        targetYear: letterData.targetYear || 'all',
        greeting: letterData.greeting || 'Thân gửi các bạn sinh viên,',
        content: letterData.content || ['Nội dung thông báo từ ban quản trị.'],
        recommendations: letterData.recommendations || [],
        ctaLabel: letterData.ctaLabel,
        ctaView: letterData.ctaView,
        status: letterData.status || 'published',
        createdAt: now,
        updatedAt: now,
      };
      current.unshift(savedLetter);
    }
  } else {
    const newId = `letter-admin-${Date.now()}`;
    savedLetter = {
      id: newId,
      title: letterData.title || 'Thông báo mới từ PTIT',
      subject: letterData.subject || 'Thông báo nội bộ dành cho sinh viên',
      sender: letterData.sender || 'Trung tâm Hướng nghiệp PTIT',
      senderRole: letterData.senderRole || 'Học viện Công nghệ Bưu chính Viễn thông',
      sentDate: letterData.sentDate || new Date().toLocaleDateString('vi-VN'),
      targetMajor: letterData.targetMajor || 'all',
      targetYear: letterData.targetYear || 'all',
      greeting: letterData.greeting || 'Thân gửi các bạn sinh viên,',
      content: letterData.content || ['Nội dung thông báo từ ban quản trị.'],
      recommendations: letterData.recommendations || [],
      ctaLabel: letterData.ctaLabel,
      ctaView: letterData.ctaView,
      status: letterData.status || 'published',
      createdAt: now,
      updatedAt: now,
    };
    current.unshift(savedLetter);
  }

  // 1. MUST save directly to Firestore as source of truth
  try {
    await saveSystemLetterToFirestore(savedLetter);
  } catch (err) {
    console.error('Failed to save system letter to Firestore:', err);
    throw err;
  }

  // 2. Update local cache
  try {
    localStorage.setItem(SYSTEM_LETTERS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving letter to localStorage cache:', e);
  }

  // 3. Dispatch event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ptit_system_letters_updated', {
        detail: { letter: savedLetter, action: 'save' },
      })
    );
  }

  return savedLetter;
}

/**
 * Admin deletes a letter directly in Firestore
 */
export async function adminDeleteLetter(id: string): Promise<void> {
  // 1. Delete from Firestore directly
  try {
    await deleteSystemLetterFromFirestore(id);
  } catch (err) {
    console.error('Failed to delete system letter from Firestore:', err);
    throw err;
  }

  // 2. Update local cache
  const current = loadAllLettersFromStorage();
  const updated = current.filter((l) => l.id !== id);
  try {
    localStorage.setItem(SYSTEM_LETTERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting letter from localStorage cache:', e);
  }

  // 3. Dispatch event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ptit_system_letters_updated', {
        detail: { id, action: 'delete' },
      })
    );
  }
}

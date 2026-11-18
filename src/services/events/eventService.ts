import { FirestoreEvent, CareerEvent } from '../../types';
import { CAREER_EVENTS } from '../../data/mockData';
import {
  fetchEventsFromFirestore,
  saveEventToFirestore,
  updateEventInFirestore,
  deleteEventFromFirestore,
  subscribeToEvents,
  isFirestoreActive,
} from '../firebase';

export { subscribeToEvents };

const EVENTS_STORAGE_KEY = 'ptit_career_hub_admin_events_v1';

/**
 * Check if a date string is in the past
 */
export function isEventExpired(event: FirestoreEvent | CareerEvent): boolean {
  if ('status' in event && event.status === 'expired') return true;

  // Handle format DD/MM/YYYY or YYYY-MM-DD
  const rawDate = event.date;
  if (!rawDate) return false;

  try {
    let eventDate: Date;
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        eventDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 23, 59, 59);
      } else {
        eventDate = new Date(rawDate);
      }
    } else {
      eventDate = new Date(rawDate);
      eventDate.setHours(23, 59, 59, 999);
    }

    if (isNaN(eventDate.getTime())) return false;
    return new Date().getTime() > eventDate.getTime();
  } catch {
    return false;
  }
}

/**
 * Convert initial CareerEvent to FirestoreEvent structure
 */
function convertToFirestoreEvent(event: CareerEvent): FirestoreEvent {
  // Convert DD/MM/YYYY to YYYY-MM-DD for form standardization if possible
  let dateFormatted = event.date;
  if (event.date && event.date.includes('/')) {
    const p = event.date.split('/');
    if (p.length === 3) {
      dateFormatted = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
  }

  return {
    id: event.id,
    title: event.title,
    organizer: event.organizer,
    organizerLogo: event.organizerLogo,
    date: dateFormatted,
    time: event.time || '09:00 - 11:30',
    location: event.location || 'Hà Nội',
    locationType: event.isOnline ? 'online' : (event.format === 'Hybrid' ? 'hybrid' : 'offline'),
    category: event.eventType.toLowerCase(),
    description: event.description || '',
    agenda: event.agenda ? event.agenda.map((a) => `${a.time}: ${a.activity}`) : [],
    speakers: event.speakers ? event.speakers.map((s) => ({ name: s.name, role: s.role, company: s.company, avatar: s.avatar })) : [],
    targetAudience: event.targetAudience ? event.targetAudience.join(', ') : 'Sinh viên PTIT',
    benefits: event.benefits || [],
    registrationUrl: event.registrationUrl || 'https://ptit.edu.vn/events',
    sourceUrl: event.sourceUrl || 'https://ptit.edu.vn',
    publishedAt: '2026-03-01',
    expiresAt: dateFormatted,
    status: 'active',
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Extract Month, Day and Full Date from standard date format (YYYY-MM-DD or DD/MM/YYYY)
 */
export function extractEventDateParts(dateStr: string): { month: string; day: string; fullDate: string } {
  if (!dateStr) return { month: 'THG --', day: '--', fullDate: '' };
  
  const clean = dateStr.trim().split(' ')[0] || '';
  // If format YYYY-MM-DD
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 3) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const dayNum = parseInt(parts[2], 10);
      return {
        month: `THG ${String(monthNum).padStart(2, '0')}`,
        day: String(dayNum).padStart(2, '0'),
        fullDate: `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`,
      };
    }
  }

  // If format DD/MM/YYYY
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 3) {
      const dayNum = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10);
      const year = parts[2];
      return {
        month: `THG ${String(monthNum).padStart(2, '0')}`,
        day: String(dayNum).padStart(2, '0'),
        fullDate: `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`,
      };
    }
  }

  return { month: 'THG 12', day: '12', fullDate: clean };
}

/**
 * Convert FirestoreEvent back to UI CareerEvent
 */
export function convertToCareerEvent(fEvent: FirestoreEvent): CareerEvent {
  const dateParts = extractEventDateParts(fEvent.date);

  // Extract training points from benefits if not explicitly defined
  let points = fEvent.trainingPoints;
  if (points === undefined && fEvent.benefits) {
    const pointsMatch = fEvent.benefits.find((b) => b.toLowerCase().includes('điểm rèn luyện'));
    if (pointsMatch) {
      const num = parseInt(pointsMatch.replace(/\D/g, ''), 10);
      if (!isNaN(num)) points = num;
    }
  }

  // Extract valid speakers (only if array has items with name)
  const speakers = Array.isArray(fEvent.speakers)
    ? fEvent.speakers.filter((s) => s.name && s.name.trim().length > 0)
    : undefined;

  return {
    id: fEvent.id,
    title: fEvent.title,
    organizer: fEvent.organizer,
    organizerLogo: fEvent.organizerLogo || '🏢',
    eventType: (fEvent.category.charAt(0).toUpperCase() + fEvent.category.slice(1)) as any,
    format: fEvent.locationType === 'online' ? 'Trực tuyến' : fEvent.locationType === 'hybrid' ? 'Hybrid' : 'Trực tiếp',
    date: dateParts.fullDate,
    time: fEvent.time,
    month: dateParts.month,
    day: dateParts.day,
    location: fEvent.location,
    isOnline: fEvent.locationType === 'online',
    description: fEvent.description,
    detailedContent: fEvent.description,
    relatedSkills: fEvent.skillsGained && fEvent.skillsGained.length > 0 ? fEvent.skillsGained : ['Networking', 'Kỹ năng mềm'],
    relatedCareers: ['Marketing', 'Công nghệ', 'Kinh doanh'],
    registrationUrl: fEvent.registrationUrl,
    registrationDeadline: fEvent.expiresAt ? `${fEvent.expiresAt} (23:59)` : undefined,
    source: fEvent.organizer,
    sourceUrl: fEvent.sourceUrl,
    updatedDate: fEvent.updatedAt ? fEvent.updatedAt.split('T')[0] : '2026-03-15',
    isSaved: false,
    trainingPoints: points,
    hasCertificate: true,
    speakers: speakers && speakers.length > 0 ? speakers : undefined,
    benefits: fEvent.benefits,
    targetAudience: fEvent.targetAudience ? [fEvent.targetAudience] : undefined,
  };
}

/**
 * Validate URL
 */
function isValidUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate event before publishing
 */
export function validateEventForPublish(event: Partial<FirestoreEvent>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.title || !event.title.trim()) {
    errors.push('Tên sự kiện không được để trống.');
  }
  if (!event.organizer || !event.organizer.trim()) {
    errors.push('Đơn vị tổ chức không được để trống.');
  }
  if (!event.location || !event.location.trim()) {
    errors.push('Địa điểm tổ chức không được để trống.');
  }
  if (!event.description || !event.description.trim()) {
    errors.push('Mô tả sự kiện không được để trống.');
  }
  if (!event.date || !event.date.trim()) {
    errors.push('Ngày diễn ra sự kiện không được để trống.');
  }
  if (!event.registrationUrl || !isValidUrl(event.registrationUrl)) {
    errors.push('Link đăng ký tham gia (registrationUrl) phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://).');
  }
  if (event.sourceUrl && !isValidUrl(event.sourceUrl)) {
    errors.push('Link nguồn thông tin (sourceUrl) phải là URL hợp lệ.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Load all events from Firestore (source of truth), with local cache fallback
 */
export async function loadAllEventsFromStorage(): Promise<FirestoreEvent[]> {
  try {
    const remote = await fetchEventsFromFirestore();
    if (remote !== null) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(remote));
      }
      return remote;
    }
  } catch (err) {
    console.warn('Failed to fetch events from Firestore:', err);
  }

  // Local Storage cache fallback (offline mode only)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
  }

  // Initial Seed from CAREER_EVENTS
  const initial = CAREER_EVENTS.map(convertToFirestoreEvent);
  return initial;
}

/**
 * Seed verified career events to Firestore if Firestore /events collection is currently empty
 */
export async function seedVerifiedEventsToFirestore(): Promise<{ count: number; error?: string }> {
  try {
    const current = await fetchEventsFromFirestore();
    if (current && current.length > 0) {
      return { count: current.length };
    }
    const initialEvents = CAREER_EVENTS.map(convertToFirestoreEvent);
    let added = 0;
    for (const ev of initialEvents) {
      await saveEventToFirestore(ev);
      added++;
    }
    return { count: added };
  } catch (err: any) {
    console.error('Failed to seed initial events to Firestore:', err);
    return { count: 0, error: err?.message || String(err) };
  }
}

/**
 * Get active, verified and unexpired events for public student view directly from Firestore
 */
export async function getActiveEvents(useCache = true): Promise<CareerEvent[]> {
  const all = await loadAllEventsFromStorage();
  const activeFirestore = all.filter((e) => {
    if (e.status !== 'active') return false;
    if (!e.verified) return false;
    if (isEventExpired(e)) return false;
    return true;
  });

  return activeFirestore.map(convertToCareerEvent);
}

/**
 * Save / Update Event (Admin) directly in Firestore
 */
export async function adminSaveEvent(
  eventData: Omit<FirestoreEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<{ success: boolean; event?: FirestoreEvent; error?: string }> {
  const validation = validateEventForPublish(eventData);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(' ') };
  }

  const existingList = await loadAllEventsFromStorage();
  const isEditing = !!eventData.id;
  const eventId = isEditing ? eventData.id! : `event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  const finalEvent: FirestoreEvent = {
    ...eventData,
    id: eventId,
    createdAt: isEditing
      ? existingList.find((e) => e.id === eventId)?.createdAt || nowIso
      : nowIso,
    updatedAt: nowIso,
  };

  // 1. Save directly to Firestore as source of truth
  try {
    const ok = await saveEventToFirestore(finalEvent);
    if (!ok) {
      return { success: false, error: 'Không thể lưu sự kiện lên Firestore. Vui lòng kiểm tra quyền quản trị.' };
    }
  } catch (err: any) {
    console.error('Error saving event to Firestore:', err);
    return { success: false, error: err?.message ? `Lỗi Firestore: ${err.message}` : 'Lưu sự kiện lên Firestore thất bại.' };
  }

  // 2. Update local cache
  const updatedList = isEditing
    ? existingList.map((e) => (e.id === eventId ? finalEvent : e))
    : [finalEvent, ...existingList];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.warn('Failed to save to local storage cache:', err);
    }
  }

  return { success: true, event: finalEvent };
}

/**
 * Toggle Event Status (Admin) directly in Firestore
 */
export async function adminToggleEventStatus(
  eventId: string,
  newStatus: 'active' | 'hidden' | 'expired'
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    await updateEventInFirestore(eventId, { status: newStatus, updatedAt: nowIso });
  } catch (err) {
    console.warn('Failed to update event status in Firestore:', err);
  }

  const events = await loadAllEventsFromStorage();
  const target = events.find((e) => e.id === eventId);
  if (target) {
    target.status = newStatus;
    target.updatedAt = nowIso;
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    }
  }
  return true;
}

/**
 * Verify Event (Admin) directly in Firestore
 */
export async function adminVerifyEvent(eventId: string, verified: boolean): Promise<boolean> {
  const nowIso = new Date().toISOString();
  try {
    await updateEventInFirestore(eventId, { verified, updatedAt: nowIso });
  } catch (err) {
    console.warn('Failed to verify event in Firestore:', err);
  }

  const events = await loadAllEventsFromStorage();
  const target = events.find((e) => e.id === eventId);
  if (target) {
    target.verified = verified;
    target.updatedAt = nowIso;
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    }
  }
  return true;
}

/**
 * Delete Event (Admin) directly in Firestore
 */
export async function adminDeleteEvent(eventId: string): Promise<boolean> {
  try {
    await deleteEventFromFirestore(eventId);
  } catch (err) {
    console.error('Failed to delete event from Firestore:', err);
    throw err;
  }

  const events = await loadAllEventsFromStorage();
  const updated = events.filter((e) => e.id !== eventId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
  }
  return true;
}

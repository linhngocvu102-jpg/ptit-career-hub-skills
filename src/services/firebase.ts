import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import { FirestoreJob, FirestoreEvent, UserProfileState, AdminSystemLetter, AuthorizedAdminUser, sanitizePtitMajor, FirestoreNotification, FirestoreNews } from '../types';
import firebaseAppletConfig from '../../firebase-applet-config.json';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let isFirebaseConfigured = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Lazy, resilient Firebase initialization.
 * Automatically inspects firebase-applet-config.json and environment variables.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (firebaseApp) return firebaseApp;

  try {
    const config = firebaseAppletConfig?.apiKey ? firebaseAppletConfig : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    if (!config.apiKey || !config.projectId) {
      return null;
    }

    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    isFirebaseConfigured = true;
    return firebaseApp;
  } catch (error) {
    console.warn('Firebase initialization skipped or failed:', error);
    return null;
  }
}

export function getDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    const databaseId = (firebaseAppletConfig as any)?.firestoreDatabaseId;
    firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    return firestoreDb;
  } catch (error) {
    console.warn('Firestore initialization failed:', error);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (firebaseAuth) return firebaseAuth;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    firebaseAuth = getAuth(app);
    return firebaseAuth;
  } catch (error) {
    console.warn('Firebase Auth initialization failed:', error);
    return null;
  }
}

// Test connection on boot
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const db = getDb();
    if (db) {
      getDocFromServer(doc(db, 'test', 'connection')).catch((err) => {
        if (err instanceof Error && err.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      });
    }
  }, 100);
}

/**
 * Authenticate with Google via Firebase Auth
 */
export async function loginWithGooglePopup(): Promise<{ name: string; email: string; uid: string } | null> {
  const auth = getFirebaseAuth();
  if (auth) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return {
      name: result.user.displayName || '',
      email: result.user.email || '',
      uid: result.user.uid,
    };
  }
  return null;
}

/**
 * Authenticate with Outlook / Microsoft PTIT via Firebase Auth
 */
export async function loginWithOutlookPopup(): Promise<{ name: string; email: string; uid: string } | null> {
  const auth = getFirebaseAuth();
  if (auth) {
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({
      prompt: 'select_account',
      tenant: 'common',
    });
    const result = await signInWithPopup(auth, provider);
    return {
      name: result.user.displayName || '',
      email: result.user.email || '',
      uid: result.user.uid,
    };
  }
  return null;
}

/**
 * Sign out current Firebase Auth user
 */
export async function signOutStudent(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Check if live Firestore is actively connected
 */
export function isFirestoreActive(): boolean {
  return getDb() !== null && isFirebaseConfigured;
}

/**
 * Real-time subscription to jobs collection via onSnapshot
 */
export function subscribeToJobs(
  callback: (jobs: FirestoreJob[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const path = 'jobs';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: FirestoreJob[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || '',
          companyName: data.companyName || '',
          companyLogo: data.companyLogo || undefined,
          location: data.location || 'Hà Nội',
          employmentType: data.employmentType || 'Internship',
          salaryText: data.salaryText || 'Thỏa thuận',
          description: data.description || '',
          requirements: Array.isArray(data.requirements) ? data.requirements : [],
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          majorTags: Array.isArray(data.majorTags) ? data.majorTags : [],
          skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
          careerTendencies: Array.isArray(data.careerTendencies) ? data.careerTendencies : ['CR', 'AN'],
          suitableAcademicYears: Array.isArray(data.suitableAcademicYears) ? data.suitableAcademicYears : ['Năm 3', 'Năm 4'],
          careerCategory: data.careerCategory || 'Marketing',
          publishedAt: data.publishedAt || new Date().toISOString().split('T')[0],
          expiresAt: data.expiresAt || '2026-12-31',
          sourceName: data.sourceName || data.companyName || '',
          sourceUrl: data.sourceUrl || '',
          applyUrl: data.applyUrl || '',
          verified: typeof data.verified === 'boolean' ? data.verified : true,
          status: data.status || 'active',
          isDemo: !!data.isDemo,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot error on /jobs:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Fetch all jobs from Firestore collection `jobs`
 */
export async function fetchJobsFromFirestore(): Promise<FirestoreJob[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const jobsCol = collection(db, 'jobs');
    const snapshot = await getDocs(jobsCol);
    if (snapshot.empty) {
      return [];
    }

    const items: FirestoreJob[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        title: data.title || '',
        companyName: data.companyName || '',
        companyLogo: data.companyLogo || undefined,
        location: data.location || 'Hà Nội',
        employmentType: data.employmentType || 'Internship',
        salaryText: data.salaryText || 'Thỏa thuận',
        description: data.description || '',
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        benefits: Array.isArray(data.benefits) ? data.benefits : [],
        majorTags: Array.isArray(data.majorTags) ? data.majorTags : [],
        skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
        careerTendencies: Array.isArray(data.careerTendencies) ? data.careerTendencies : ['CR', 'AN'],
        suitableAcademicYears: Array.isArray(data.suitableAcademicYears) ? data.suitableAcademicYears : ['Năm 3', 'Năm 4'],
        careerCategory: data.careerCategory || 'Marketing',
        publishedAt: data.publishedAt || new Date().toISOString().split('T')[0],
        expiresAt: data.expiresAt || '2026-12-31',
        sourceName: data.sourceName || data.companyName || '',
        sourceUrl: data.sourceUrl || '',
        applyUrl: data.applyUrl || '',
        verified: typeof data.verified === 'boolean' ? data.verified : true,
        status: data.status || 'active',
        isDemo: !!data.isDemo,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    return items;
  } catch (err) {
    console.warn('Firestore fetch failed for /jobs:', err);
    handleFirestoreError(err, OperationType.LIST, 'jobs');
    return null;
  }
}

/**
 * Save job to Firestore collection `jobs` with full required schema
 */
export async function saveJobToFirestore(job: FirestoreJob): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const jobRef = doc(db, 'jobs', job.id);
    await setDoc(jobRef, {
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      companyLogo: job.companyLogo || null,
      location: job.location,
      employmentType: job.employmentType,
      salaryText: job.salaryText,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
      majorTags: job.majorTags,
      skillTags: job.skillTags,
      careerTendencies: job.careerTendencies,
      suitableAcademicYears: job.suitableAcademicYears,
      careerCategory: job.careerCategory,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      sourceName: job.sourceName,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      verified: job.verified,
      status: job.status,
      isDemo: !!job.isDemo,
      createdAt: job.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `jobs/${job.id}`);
    return false;
  }
}

/**
 * Update partial job fields directly in Firestore
 */
export async function updateJobInFirestore(jobId: string, partial: Partial<FirestoreJob>): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const jobRef = doc(db, 'jobs', jobId);
    await setDoc(jobRef, {
      ...partial,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `jobs/${jobId}`);
    return false;
  }
}

/**
 * Delete job from Firestore collection `jobs`
 */
export async function deleteJobFromFirestore(jobId: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const jobRef = doc(db, 'jobs', jobId);
    await deleteDoc(jobRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `jobs/${jobId}`);
    return false;
  }
}

/**
 * Real-time subscription to events collection via onSnapshot
 */
export function subscribeToEvents(
  callback: (events: FirestoreEvent[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const path = 'events';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: FirestoreEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || '',
          organizer: data.organizer || '',
          organizerLogo: data.organizerLogo || undefined,
          date: data.date || '',
          time: data.time || '',
          location: data.location || '',
          locationType: data.locationType || 'offline',
          category: data.category || 'workshop',
          description: data.description || '',
          agenda: Array.isArray(data.agenda) ? data.agenda : [],
          speakers: Array.isArray(data.speakers) ? data.speakers : [],
          targetAudience: data.targetAudience || '',
          benefits: Array.isArray(data.benefits) ? data.benefits : [],
          registrationUrl: data.registrationUrl || '',
          sourceUrl: data.sourceUrl || '',
          publishedAt: data.publishedAt || new Date().toISOString().split('T')[0],
          expiresAt: data.expiresAt || '',
          status: data.status || 'active',
          verified: typeof data.verified === 'boolean' ? data.verified : true,
          trainingPoints: typeof data.trainingPoints === 'number' ? data.trainingPoints : undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot error on /events:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Fetch all events from Firestore collection `events`
 */
export async function fetchEventsFromFirestore(): Promise<FirestoreEvent[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const eventsCol = collection(db, 'events');
    const snapshot = await getDocs(eventsCol);
    if (snapshot.empty) return [];

    const items: FirestoreEvent[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        title: data.title || '',
        organizer: data.organizer || '',
        organizerLogo: data.organizerLogo || undefined,
        date: data.date || '',
        time: data.time || '',
        location: data.location || '',
        locationType: data.locationType || 'offline',
        category: data.category || 'workshop',
        description: data.description || '',
        agenda: Array.isArray(data.agenda) ? data.agenda : [],
        speakers: Array.isArray(data.speakers) ? data.speakers : [],
        targetAudience: data.targetAudience || '',
        benefits: Array.isArray(data.benefits) ? data.benefits : [],
        registrationUrl: data.registrationUrl || '',
        sourceUrl: data.sourceUrl || '',
        publishedAt: data.publishedAt || new Date().toISOString().split('T')[0],
        expiresAt: data.expiresAt || '',
        status: data.status || 'active',
        verified: typeof data.verified === 'boolean' ? data.verified : true,
        trainingPoints: typeof data.trainingPoints === 'number' ? data.trainingPoints : undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });
    return items;
  } catch (err) {
    console.warn('Failed to fetch events from Firestore:', err);
    handleFirestoreError(err, OperationType.LIST, 'events');
    return null;
  }
}

/**
 * Save event to Firestore collection `events`
 */
export async function saveEventToFirestore(event: FirestoreEvent): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const eventRef = doc(db, 'events', event.id);
    const payload: Record<string, any> = {
      id: event.id,
      title: event.title,
      organizer: event.organizer,
      organizerLogo: event.organizerLogo || null,
      date: event.date,
      time: event.time,
      location: event.location,
      locationType: event.locationType,
      category: event.category,
      description: event.description,
      agenda: event.agenda || [],
      speakers: event.speakers || [],
      targetAudience: event.targetAudience || null,
      benefits: event.benefits || [],
      registrationUrl: event.registrationUrl,
      sourceUrl: event.sourceUrl || null,
      publishedAt: event.publishedAt || new Date().toISOString().split('T')[0],
      expiresAt: event.expiresAt || null,
      status: event.status,
      verified: event.verified,
      trainingPoints: event.trainingPoints || null,
      createdAt: event.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    await setDoc(eventRef, payload);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `events/${event.id}`);
    return false;
  }
}

/**
 * Update partial event in Firestore
 */
export async function updateEventInFirestore(eventId: string, partial: Partial<FirestoreEvent>): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const eventRef = doc(db, 'events', eventId);
    await setDoc(eventRef, {
      ...partial,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
    return false;
  }
}

/**
 * Delete event from Firestore collection `events`
 */
export async function deleteEventFromFirestore(eventId: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const eventRef = doc(db, 'events', eventId);
    await deleteDoc(eventRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
    return false;
  }
}

/**
 * Real-time subscription to system_letters collection via onSnapshot
 */
export function subscribeToSystemLetters(
  callback: (letters: AdminSystemLetter[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const path = 'system_letters';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: AdminSystemLetter[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || '',
          subject: data.subject || '',
          sender: data.sender || 'Trung tâm Hướng nghiệp PTIT',
          senderRole: data.senderRole || '',
          sentDate: data.sentDate || '',
          targetMajor: data.targetMajor || 'all',
          targetYear: data.targetYear || 'all',
          greeting: data.greeting || '',
          content: Array.isArray(data.content) ? data.content : [],
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          ctaLabel: data.ctaLabel,
          ctaView: data.ctaView,
          status: data.status || 'published',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        });
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot error on /system_letters:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Fetch all system letters from Firestore collection `system_letters`
 */
export async function fetchSystemLettersFromFirestore(): Promise<AdminSystemLetter[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const col = collection(db, 'system_letters');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];

    const items: AdminSystemLetter[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        title: data.title || '',
        subject: data.subject || '',
        sender: data.sender || 'Trung tâm Hướng nghiệp PTIT',
        senderRole: data.senderRole || '',
        sentDate: data.sentDate || '',
        targetMajor: data.targetMajor || 'all',
        targetYear: data.targetYear || 'all',
        greeting: data.greeting || '',
        content: Array.isArray(data.content) ? data.content : [],
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        ctaLabel: data.ctaLabel,
        ctaView: data.ctaView,
        status: data.status || 'published',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });
    return items;
  } catch (err) {
    console.warn('Failed to fetch system letters from Firestore:', err);
    handleFirestoreError(err, OperationType.LIST, 'system_letters');
    return null;
  }
}

/**
 * Save system letter to Firestore collection `system_letters`
 */
export async function saveSystemLetterToFirestore(letter: AdminSystemLetter): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const letterRef = doc(db, 'system_letters', letter.id);
    const payload: Record<string, any> = {
      ...letter,
      updatedAt: new Date().toISOString(),
    };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });
    await setDoc(letterRef, payload);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `system_letters/${letter.id}`);
    return false;
  }
}

/**
 * Delete system letter from Firestore collection `system_letters`
 */
export async function deleteSystemLetterFromFirestore(letterId: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const letterRef = doc(db, 'system_letters', letterId);
    await deleteDoc(letterRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `system_letters/${letterId}`);
    return false;
  }
}

/**
 * Real-time subscription to authorized_admins collection via onSnapshot
 */
export function subscribeToAuthorizedAdmins(
  callback: (admins: AuthorizedAdminUser[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const path = 'authorized_admins';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: AuthorizedAdminUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          email: docSnap.id,
          name: data.name,
          role: data.role || 'admin',
          note: data.note,
          addedAt: data.addedAt || new Date().toISOString(),
          addedBy: data.addedBy || 'System',
          status: data.status || 'active',
        });
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot error on /authorized_admins:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Fetch all authorized admins from Firestore collection `authorized_admins`
 */
export async function fetchAuthorizedAdminsFromFirestore(): Promise<AuthorizedAdminUser[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const col = collection(db, 'authorized_admins');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];

    const items: AuthorizedAdminUser[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        email: docSnap.id,
        name: data.name,
        role: data.role || 'admin',
        note: data.note,
        addedAt: data.addedAt || new Date().toISOString(),
        addedBy: data.addedBy || 'System',
        status: data.status || 'active',
      });
    });
    return items;
  } catch (err) {
    console.warn('Failed to fetch authorized admins from Firestore:', err);
    handleFirestoreError(err, OperationType.LIST, 'authorized_admins');
    return null;
  }
}

/**
 * Save authorized admin to Firestore collection `authorized_admins`
 */
export async function saveAuthorizedAdminToFirestore(admin: AuthorizedAdminUser): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const normalizedEmail = admin.email.trim().toLowerCase();
    const adminRef = doc(db, 'authorized_admins', normalizedEmail);
    await setDoc(adminRef, {
      ...admin,
      email: normalizedEmail,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `authorized_admins/${admin.email}`);
    return false;
  }
}

/**
 * Delete authorized admin from Firestore collection `authorized_admins`
 */
export async function deleteAuthorizedAdminFromFirestore(email: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const adminRef = doc(db, 'authorized_admins', normalizedEmail);
    await deleteDoc(adminRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `authorized_admins/${email}`);
    return false;
  }
}

/**
 * Fetch users from Firestore collection `users` for Admin User Management
 */
export async function fetchUsersFromFirestore(): Promise<UserProfileState[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    if (snapshot.empty) return [];

    const items: UserProfileState[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        userId: docSnap.id,
        displayName: data.displayName || 'Sinh viên PTIT',
        email: data.email || '',
        role: data.role || 'student',
        major: data.major ? sanitizePtitMajor(data.major) : '',
        academicYear: data.academicYear || 'Chưa cập nhật',
        careerGoal: data.careerGoal || 'Chưa có',
        careerCheckCompleted: !!data.careerCheckCompleted,
        careerDirection: data.careerDirection,
        careerInterestScores: data.careerInterestScores,
        topCareerTendencies: data.topCareerTendencies,
        completedAt: data.completedAt,
        skillGap: data.skillGap || null,
        onboardingCompleted: !!data.onboardingCompleted,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    return items;
  } catch (err) {
    console.warn('Failed to fetch users from Firestore:', err);
    return null;
  }
}

/**
 * Save or update user in Firestore collection `users`
 */
export async function saveUserToFirestore(user: UserProfileState): Promise<boolean> {
  const db = getDb();
  if (!db || !user.userId) return false;

  try {
    const userRef = doc(db, 'users', user.userId);
    await setDoc(userRef, {
      ...user,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save user to Firestore:', err);
    return false;
  }
}

/**
 * Log user interaction event to Firestore collection `interactions`
 */
export async function logInteractionToFirestore(
  type: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const interactionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const interactionRef = doc(db, 'interactions', interactionId);
    await setDoc(interactionRef, {
      id: interactionId,
      type,
      meta: meta || {},
      timestamp: new Date().toISOString(),
    });
  } catch {
    // safe fallback
  }
}

/**
 * Fetch interaction logs from Firestore collection `interactions`
 */
export async function fetchInteractionsFromFirestore(): Promise<Array<{ id: string; type: string; meta: any; timestamp: string }> | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const col = collection(db, 'interactions');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];
    const logs: any[] = [];
    snapshot.forEach((d) => logs.push(d.data()));
    return logs;
  } catch (err) {
    console.warn('Failed to fetch interactions from Firestore:', err);
    return null;
  }
}

/**
 * Real-time subscription to notifications collection via onSnapshot
 */
export function subscribeToFirestoreNotifications(
  callback: (notifications: FirestoreNotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const path = 'notifications';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: FirestoreNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || '',
          message: data.message || '',
          type: data.type || 'system',
          linkView: data.linkView,
          targetMajor: data.targetMajor || 'all',
          targetYear: data.targetYear || 'all',
          status: data.status || 'active',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          createdBy: data.createdBy,
        });
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot error on /notifications:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Fetch all notifications from Firestore collection `notifications`
 */
export async function fetchNotificationsFromFirestore(): Promise<FirestoreNotification[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const col = collection(db, 'notifications');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];

    const items: FirestoreNotification[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        title: data.title || '',
        message: data.message || '',
        type: data.type || 'system',
        linkView: data.linkView,
        targetMajor: data.targetMajor || 'all',
        targetYear: data.targetYear || 'all',
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
      });
    });
    return items;
  } catch (err) {
    console.warn('Failed to fetch notifications from Firestore:', err);
    handleFirestoreError(err, OperationType.LIST, 'notifications');
    return null;
  }
}

/**
 * Save notification to Firestore collection `notifications`
 */
export async function saveNotificationToFirestore(notif: FirestoreNotification): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const ref = doc(db, 'notifications', notif.id);
    const payload = {
      ...notif,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, payload);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `notifications/${notif.id}`);
    return false;
  }
}

/**
 * Delete notification from Firestore collection `notifications`
 */
export async function deleteNotificationFromFirestore(notifId: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const ref = doc(db, 'notifications', notifId);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notifications/${notifId}`);
    return false;
  }
}

/**
 * Real-time subscription to news collection via onSnapshot
 */
export function subscribeToNews(
  callback: (news: FirestoreNews[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDb();
  if (!db) return () => {};

  const path = 'news';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: FirestoreNews[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || '',
          summary: data.summary || '',
          content: data.content || '',
          category: data.category || 'tin_tuc',
          imageUrl: data.imageUrl,
          author: data.author,
          publishedAt: data.publishedAt || new Date().toISOString().split('T')[0],
          status: data.status || 'published',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          createdBy: data.createdBy,
        });
      });
      callback(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot error on /news:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Fetch all news from Firestore collection `news`
 */
export async function fetchNewsFromFirestore(): Promise<FirestoreNews[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const col = collection(db, 'news');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];

    const items: FirestoreNews[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        title: data.title || '',
        summary: data.summary || '',
        content: data.content || '',
        category: data.category || 'tin_tuc',
        imageUrl: data.imageUrl,
        author: data.author,
        publishedAt: data.publishedAt || new Date().toISOString().split('T')[0],
        status: data.status || 'published',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
      });
    });
    return items;
  } catch (err) {
    console.warn('Failed to fetch news from Firestore:', err);
    handleFirestoreError(err, OperationType.LIST, 'news');
    return null;
  }
}

/**
 * Save news article to Firestore collection `news`
 */
export async function saveNewsToFirestore(item: FirestoreNews): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const ref = doc(db, 'news', item.id);
    const payload = {
      ...item,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, payload);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `news/${item.id}`);
    return false;
  }
}

/**
 * Delete news article from Firestore collection `news`
 */
export async function deleteNewsFromFirestore(newsId: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const ref = doc(db, 'news', newsId);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `news/${newsId}`);
    return false;
  }
}



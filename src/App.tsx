import React, { useState, useEffect } from 'react';
import { ScreenView, UserAuth, NotificationItem, TargetJob, CareerEvent, UserProfileState, SystemLetterData, CareerCheckResult, AdminSystemLetter } from './types';
import { TARGET_JOBS, CAREER_EVENTS } from './data/mockData';
import {
  loadUserProfile,
  saveUserProfile,
  loadAuthSession,
  saveAuthSession,
  clearAuthSession,
  isProfileOnboardingComplete,
} from './services/userService';
import { getFirebaseAuth, signOutStudent, subscribeToJobs, subscribeToEvents, subscribeToSystemLetters } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { generatePersonalizedNotifications, markNotificationAsRead } from './services/notificationService';
import { getActiveJobs, seedVerifiedJobsToFirestore, adaptFirestoreJobToTargetJob } from './services/jobs/jobService';
import { getActiveEvents, seedVerifiedEventsToFirestore, convertToCareerEvent } from './services/events/eventService';
import { seedInitialLettersToFirestore } from './services/letters/systemLetterService';
import { trackEvent } from './utils/analytics';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { OrientationModal } from './components/OrientationModal';
import { MinimalProfileModal } from './components/MinimalProfileModal';
import { SystemLetterModal } from './components/SystemLetterModal';
import { AdminLoginView } from './components/AdminLoginView';
import { HomeView } from './components/views/HomeView';
import { RoadmapView } from './components/views/RoadmapView';
import { JobsView } from './components/views/JobsView';
import { JobDetailView } from './components/views/JobDetailView';
import { EventsView } from './components/views/EventsView';
import { EventDetailView } from './components/views/EventDetailView';
import { CVBuilderView } from './components/views/CVBuilderView';
import { MyCareerView } from './components/views/MyCareerView';
import { MyTasksView } from './components/views/MyTasksView';
import { StudentDashboardView } from './components/views/StudentDashboardView';
import { SavedItemsView } from './components/views/SavedItemsView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { FeedbackView } from './components/views/FeedbackView';
import { PrivacyPolicyView } from './components/views/PrivacyPolicyView';
import { TermsOfServiceView } from './components/views/TermsOfServiceView';
import { ToastContainer } from './components/ToastContainer';
import { showToast } from './utils/toast';

export function App() {
  const [currentView, setCurrentView] = useState<ScreenView>('home');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCareerTitle, setSelectedCareerTitle] = useState<string>('Digital Marketing');
  const [selectedJobForCv, setSelectedJobForCv] = useState<TargetJob | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<TargetJob | null>(TARGET_JOBS[0]);
  const [selectedEventDetail, setSelectedEventDetail] = useState<CareerEvent | null>(CAREER_EVENTS[0]);

  // Centralized User Profile State with persistence
  const [userProfile, setUserProfile] = useState<UserProfileState>(() => loadUserProfile());

  // Authentication State with localStorage session persistence
  const [auth, setAuth] = useState<UserAuth>(() => {
    const saved = loadAuthSession();
    if (saved && saved.isLoggedIn) {
      const profile = loadUserProfile();
      return {
        ...saved,
        name: profile?.displayName || saved.name || '',
        email: profile?.email || saved.email || '',
        major: profile?.major || saved.major || '',
        year: profile?.academicYear || saved.year || 'Chưa cập nhật',
        birthYear: profile?.birthYear || saved.birthYear || '',
      };
    }
    // Visitor: Not logged in
    return {
      isLoggedIn: false,
      name: '',
      email: '',
      avatarLetter: 'P',
      studentId: '',
      major: '',
      year: '',
      birthYear: '',
    };
  });

  // Modal Yêu cầu Đăng nhập (Mặc định không tự động bật popup để sinh viên duyệt web tự do)
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [loginModalReason, setLoginModalReason] = useState<string | null>(null);

  const [showProfileSetupModal, setShowProfileSetupModal] = useState<boolean>(() => {
    try {
      const savedAuth = loadAuthSession();
      const initial = loadUserProfile();
      return Boolean(savedAuth?.isLoggedIn && !isProfileOnboardingComplete(initial));
    } catch {
      return false;
    }
  });

  // Admin authentication state: Tách biệt độc lập trong sessionStorage (Mặc định: false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('ptit_admin_authenticated') === 'true';
      }
      return false;
    } catch {
      return false;
    }
  });

  // Shared Jobs & Events state with persistence across views
  const [jobs, setJobs] = useState<TargetJob[]>(TARGET_JOBS);
  const [events, setEvents] = useState<CareerEvent[]>(CAREER_EVENTS);
  const [systemLetters, setSystemLetters] = useState<AdminSystemLetter[]>([]);

  // Path routing helpers
  const viewToPath = (view: ScreenView): string => {
    switch (view) {
      case 'home':
        return '/';
      case 'assessment-intro':
      case 'assessment-quiz':
      case 'assessment-result':
      case 'roadmap':
        return '/career-map';
      case 'jobs':
        return '/jobs';
      case 'job-detail':
        return selectedJobDetail ? `/jobs/${selectedJobDetail.id}` : '/jobs';
      case 'events':
        return '/events';
      case 'cv-builder':
        return '/ai-cv';
      case 'my-tasks':
        return '/todo';
      case 'admin':
      case 'admin-dashboard':
        return '/admin/dashboard';
      case 'admin-jobs':
        return '/admin/jobs';
      case 'admin-events':
        return '/admin/events';
      case 'admin-users':
        return '/admin/users';
      case 'admin-analytics':
        return '/admin/analytics';
      case 'admin-login':
        return '/admin-login';
      case 'feedback':
        return '/feedback';
      case 'privacy':
        return '/privacy';
      case 'terms':
        return '/terms';
      default:
        return '/';
    }
  };

  const pathToView = (path: string): ScreenView => {
    const clean = (path || '/').toLowerCase().replace(/\/$/, '') || '/';
    if (clean === '/' || clean === '') return 'home';
    if (clean === '/career-check' || clean === '/skill-gap' || clean === '/career-direction') return 'roadmap';
    if (clean === '/career-map') return 'roadmap';
    if (clean.startsWith('/jobs/')) return 'job-detail';
    if (clean === '/jobs') return 'jobs';
    if (clean === '/events') return 'events';
    if (clean === '/ai-cv' || clean === '/cv-analysis') return 'cv-builder';
    if (clean === '/todo') return 'my-tasks';
    if (clean === '/feedback') return 'feedback';
    if (clean === '/privacy') return 'privacy';
    if (clean === '/terms') return 'terms';
    if (clean === '/admin' || clean === '/admin/dashboard') return 'admin-dashboard';
    if (clean === '/admin/jobs') return 'admin-jobs';
    if (clean === '/admin/events') return 'admin-events';
    if (clean === '/admin/users') return 'admin-users';
    if (clean === '/admin/analytics') return 'admin-analytics';
    if (clean === '/admin-login') return 'admin-login';
    return 'home';
  };

  const isAdminView = (view: ScreenView): boolean => {
    return [
      'admin',
      'admin-dashboard',
      'admin-jobs',
      'admin-events',
      'admin-users',
      'admin-analytics',
      'admin-login',
    ].includes(view);
  };

  // Safe router navigation với chế độ Khách (Guest / Preview mode)
  const handleNavigate = (view: ScreenView) => {
    // Các tính năng yêu cầu tài khoản
    const isProtectedStudentView = [
      'cv-builder',
      'my-tasks',
      'student-dashboard',
      'my-career',
      'saved-jobs',
      'saved-events',
      'saved-items',
    ].includes(view);

    if (isProtectedStudentView && !auth.isLoggedIn) {
      setLoginModalReason('Vui lòng đăng nhập để sử dụng tính năng này');
      setLoginModalOpen(true);
      return;
    }

    setCurrentView(view);
    const targetPath = viewToPath(view);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initialize and listen to URL popstate events
  useEffect(() => {
    const initialView = pathToView(window.location.pathname);
    const isProtectedStudentView = [
      'cv-builder',
      'my-tasks',
      'student-dashboard',
      'my-career',
      'saved-jobs',
      'saved-events',
      'saved-items',
    ].includes(initialView);

    if (isProtectedStudentView && !auth.isLoggedIn) {
      setCurrentView('home');
      window.history.replaceState(null, '', '/');
      setLoginModalReason('Vui lòng đăng nhập để sử dụng tính năng này');
      setLoginModalOpen(true);
    } else {
      if (initialView === 'job-detail') {
        const jobId = window.location.pathname.replace('/jobs/', '').replace(/\/$/, '');
        if (jobId) {
          const found = jobs.find((j) => j.id.toLowerCase() === jobId.toLowerCase()) || TARGET_JOBS.find((j) => j.id.toLowerCase() === jobId.toLowerCase());
          if (found) {
            setSelectedJobDetail(found);
          }
        }
      }
      setCurrentView(initialView);
    }

    const handlePopState = () => {
      const popView = pathToView(window.location.pathname);
      const isProtected = [
        'cv-builder',
        'my-tasks',
        'student-dashboard',
        'my-career',
        'saved-jobs',
        'saved-events',
        'saved-items',
      ].includes(popView);

      if (isProtected && !auth.isLoggedIn) {
        setLoginModalReason('Vui lòng đăng nhập để sử dụng tính năng này');
        setLoginModalOpen(true);
        setCurrentView('home');
        window.history.replaceState(null, '', '/');
        return;
      }

      if (popView === 'job-detail') {
        const jobId = window.location.pathname.replace('/jobs/', '').replace(/\/$/, '');
        if (jobId) {
          const found = jobs.find((j) => j.id.toLowerCase() === jobId.toLowerCase()) || TARGET_JOBS.find((j) => j.id.toLowerCase() === jobId.toLowerCase());
          if (found) {
            setSelectedJobDetail(found);
          }
        }
      }

      setCurrentView(popView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [auth.isLoggedIn]);

  // Firebase Auth State Listener (Bắt buộc kiểm tra trạng thái xác thực cho Sinh viên)
  useEffect(() => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) return;

    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
      if (firebaseUser) {
        const authUser: UserAuth = {
          isLoggedIn: true,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          avatarLetter: (firebaseUser.displayName || firebaseUser.email || 'S')[0]?.toUpperCase() || 'S',
          studentId: '',
          major: '',
          year: '',
          birthYear: '',
          provider: 'google',
        };
        setAuth(authUser);
        saveAuthSession(authUser);
        setLoginModalOpen(false);
        setLoginModalReason(null);

        // Kiểm tra thông tin hồ sơ trong localStorage (hoặc Firebase)
        const currentProfile = loadUserProfile();
        const isComplete = isProfileOnboardingComplete(currentProfile);

        if (!isComplete) {
          const userUniqueId = firebaseUser.email
            ? `user_${firebaseUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
            : firebaseUser.uid;
          const updated = saveUserProfile({
            userId: userUniqueId,
            email: firebaseUser.email || currentProfile.email,
            displayName: currentProfile.displayName || firebaseUser.displayName || '',
          });
          setUserProfile(updated);
          setShowProfileSetupModal(true);
        } else {
          setShowProfileSetupModal(false);
        }
      } else {
        // Sinh viên CHƯA đăng nhập -> chế độ Khách (Guest / Preview mode), KHÔNG tự động bật popup
        clearAuthSession();
        setAuth({
          isLoggedIn: false,
          name: '',
          email: '',
          avatarLetter: 'P',
          studentId: '',
          major: '',
          year: '',
          birthYear: '',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time synchronization with Firestore (Source of Truth for all devices and users)
  useEffect(() => {
    // Initial bootstrap if Firestore collections are completely empty
    seedVerifiedJobsToFirestore().catch(() => {});
    seedVerifiedEventsToFirestore().catch(() => {});
    seedInitialLettersToFirestore().catch(() => {});

    // 1. Subscribe to Firestore /jobs collection
    const unsubJobs = subscribeToJobs((firestoreJobs) => {
      if (firestoreJobs && firestoreJobs.length > 0) {
        const mappedJobs: TargetJob[] = firestoreJobs
          .filter((fj) => fj.status === 'active' && fj.verified !== false)
          .map((fj) => adaptFirestoreJobToTargetJob(fj));
        if (mappedJobs.length > 0) {
          setJobs(mappedJobs);
        }
      }
    });

    // 2. Subscribe to Firestore /events collection
    const unsubEvents = subscribeToEvents((firestoreEvents) => {
      if (firestoreEvents && firestoreEvents.length > 0) {
        const mappedEvents: CareerEvent[] = firestoreEvents
          .filter((fe) => fe.status === 'active' && fe.verified !== false)
          .map(convertToCareerEvent);
        if (mappedEvents.length > 0) {
          setEvents(mappedEvents);
        }
      }
    });

    // 3. Subscribe to Firestore /system_letters collection
    const unsubLetters = subscribeToSystemLetters((letters) => {
      if (letters) {
        setSystemLetters(letters);
      }
    });

    return () => {
      unsubJobs();
      unsubEvents();
      unsubLetters();
    };
  }, []);

  const handleToggleSaveJob = (jobId: string) => {
    if (!auth.isLoggedIn) {
      setLoginModalReason('Vui lòng đăng nhập để sử dụng tính năng này');
      setLoginModalOpen(true);
      return;
    }
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isSaved: !j.isSaved } : j))
    );
    setSelectedJobDetail((prev) =>
      prev && prev.id === jobId ? { ...prev, isSaved: !prev.isSaved } : prev
    );
  };

  const handleSelectJobDetail = (job: TargetJob) => {
    trackEvent('job_view', { jobId: job.id, title: job.title, company: job.company });
    setSelectedJobDetail(job);
    setCurrentView('job-detail');
    const targetPath = `/jobs/${job.id}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSaveEvent = (eventId: string) => {
    if (!auth.isLoggedIn) {
      setLoginModalReason('Vui lòng đăng nhập để sử dụng tính năng này');
      setLoginModalOpen(true);
      return;
    }
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, isSaved: !e.isSaved } : e))
    );
    setSelectedEventDetail((prev) =>
      prev && prev.id === eventId ? { ...prev, isSaved: !prev.isSaved } : prev
    );
  };

  const handleSelectEventDetail = (event: CareerEvent) => {
    trackEvent('event_view', { eventId: event.id, title: event.title, organizer: event.organizer });
    setSelectedEventDetail(event);
    setCurrentView('event-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [orientationModalOpen, setOrientationModalOpen] = useState(false);

  // Authentication Handlers
  const handleLoginSuccess = (authUser: UserAuth) => {
    setAuth(authUser);
    saveAuthSession(authUser);
    setLoginModalOpen(false);

    // Sync auth info with profile
    const currentProfile = loadUserProfile();
    const userUniqueId = authUser.email
      ? `user_${authUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : currentProfile.userId;
    const updatedProfile = saveUserProfile({
      userId: userUniqueId,
      displayName: currentProfile.displayName || authUser.name,
      email: authUser.email || currentProfile.email,
    });
    setUserProfile(updatedProfile);

    // Bắt buộc hiển thị Modal Onboarding nếu tài khoản chưa hoàn tất thông tin hồ sơ
    const isComplete = isProfileOnboardingComplete(updatedProfile);
    if (!isComplete) {
      setShowProfileSetupModal(true);
    } else {
      setShowProfileSetupModal(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutStudent();
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
    clearAuthSession();
    setAuth({
      isLoggedIn: false,
      name: '',
      email: '',
      avatarLetter: 'P',
      studentId: '',
      major: '',
      year: '',
      birthYear: '',
    });
    setLoginModalReason(null);
    setLoginModalOpen(false);
  };

  // Notifications State with dynamic personalization based on profile, major, target job & CV
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return generatePersonalizedNotifications(loadUserProfile(), TARGET_JOBS, CAREER_EVENTS);
  });
  const [selectedSystemLetter, setSelectedSystemLetter] = useState<SystemLetterData | null>(null);

  // Automatically synchronize and personalize notifications whenever profile, target job, CV, or database jobs/events change
  useEffect(() => {
    const updateNotifs = () => {
      const personalized = generatePersonalizedNotifications(userProfile, jobs, events, systemLetters);
      setNotifications(personalized);
    };

    updateNotifs();

    window.addEventListener('ptit_system_letters_updated', updateNotifs);
    window.addEventListener('storage', updateNotifs);
    return () => {
      window.removeEventListener('ptit_system_letters_updated', updateNotifs);
      window.removeEventListener('storage', updateNotifs);
    };
  }, [
    userProfile?.major,
    userProfile?.academicYear,
    userProfile?.targetJobId,
    userProfile?.targetJobTitle,
    userProfile?.cvFileName,
    userProfile?.displayName,
    jobs,
    events,
    systemLetters,
  ]);

  const handleMarkNotificationRead = (id: string) => {
    markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleSelectCareer = (careerId: string) => {
    if (careerId === 'cm-1') setSelectedCareerTitle('Digital Marketing');
    else if (careerId === 'cm-2') setSelectedCareerTitle('Brand Marketing');
    else if (careerId === 'cm-3') setSelectedCareerTitle('Marketing Analytics');
    else setSelectedCareerTitle('Digital Marketing');
  };

  // User Profile handlers
  const handleSaveProfile = (updated: Partial<UserProfileState>) => {
    const merged = saveUserProfile(updated);
    setUserProfile(merged);
    setShowProfileSetupModal(false);
    const displayName = merged?.displayName || 'Người dùng';
    const updatedAuth: UserAuth = {
      ...auth,
      isLoggedIn: true,
      name: displayName,
      major: merged?.major || auth.major,
      year: merged?.academicYear || auth.year,
      birthYear: merged?.birthYear || auth.birthYear,
      avatarLetter: displayName[0]?.toUpperCase() || 'P',
    };
    setAuth(updatedAuth);
    saveAuthSession(updatedAuth);
    showToast('Đã lưu thành công hồ sơ cá nhân!', 'success');
    trackEvent('onboarding_complete', {
      displayName: merged.displayName,
      birthYear: merged.birthYear,
      major: merged.major,
      academicYear: merged.academicYear,
      careerGoal: merged.careerGoal,
    });
  };

  const handleUpdateUserProfile = (partial: Partial<UserProfileState>) => {
    const updated = saveUserProfile(partial);
    setUserProfile(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF9] text-[#131B2E] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Universal Header (Hidden in standalone Quiz and Admin Dashboard) */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        auth={auth}
        onOpenLogin={() => {
          setLoginModalReason(null);
          setLoginModalOpen(true);
        }}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenOrientationModal={() => setOrientationModalOpen(true)}
        userProfile={userProfile}
        onEditProfile={() => setShowProfileSetupModal(true)}
        onSelectJobById={(jobId) => {
          const found = jobs.find((j) => j.id === jobId);
          if (found) {
            setSelectedJobDetail(found);
            setCurrentView('job-detail');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setCurrentView('jobs');
          }
        }}
        onSelectEventById={(eventId) => {
          const found = events.find((e) => e.id === eventId);
          if (found) {
            setSelectedEventDetail(found);
            setCurrentView('event-detail');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setCurrentView('events');
          }
        }}
        onOpenSystemLetter={(letter) => setSelectedSystemLetter(letter)}
      />

      {/* Main Screen Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onOpenOrientationModal={() => setOrientationModalOpen(true)}
            userProfile={userProfile}
            onEditProfile={() => setShowProfileSetupModal(true)}
          />
        )}

        {currentView === 'roadmap' && (
          <RoadmapView
            onNavigate={handleNavigate}
            selectedCareerTitle={userProfile.careerDirection || selectedCareerTitle}
            onOpenOrientationModal={() => setShowProfileSetupModal(true)}
            onEditProfile={() => setShowProfileSetupModal(true)}
            userProfile={userProfile}
            onUpdateUserProfile={handleUpdateUserProfile}
            onSelectJobDetail={handleSelectJobDetail}
            allJobs={jobs}
            events={events}
            onSelectEventDetail={handleSelectEventDetail}
            auth={auth}
            onRequireLogin={(reason) => {
              setLoginModalReason(reason || 'Vui lòng đăng nhập để thêm task vào danh sách nhiệm vụ');
              setLoginModalOpen(true);
            }}
          />
        )}

        {currentView === 'jobs' && (
          <JobsView
            onNavigate={handleNavigate}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelectJobDetail={handleSelectJobDetail}
            jobs={jobs}
            onToggleSaveJob={handleToggleSaveJob}
            userProfile={userProfile}
            onUpdateUserProfile={handleUpdateUserProfile}
          />
        )}

        {currentView === 'job-detail' && (
          <JobDetailView
            job={
              jobs.find((j) => j.id === selectedJobDetail?.id) ||
              selectedJobDetail ||
              jobs[0]
            }
            allJobs={jobs}
            onBack={() => handleNavigate('jobs')}
            onNavigate={handleNavigate}
            onSelectJobForCv={(job) => setSelectedJobForCv(job)}
            onSelectJobDetail={handleSelectJobDetail}
            onToggleSaveJob={handleToggleSaveJob}
            userProfile={userProfile}
            onUpdateUserProfile={handleUpdateUserProfile}
          />
        )}

        {currentView === 'events' && (
          <EventsView
            onNavigate={handleNavigate}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelectEventDetail={handleSelectEventDetail}
            events={events}
            onToggleSaveEvent={handleToggleSaveEvent}
            userProfile={userProfile}
            auth={auth}
            onRequireLogin={(reason) => {
              setLoginModalReason(reason || 'Vui lòng đăng nhập để thêm task vào danh sách nhiệm vụ');
              setLoginModalOpen(true);
            }}
          />
        )}

        {currentView === 'event-detail' && (
          <EventDetailView
            event={
              events.find((e) => e.id === selectedEventDetail?.id) ||
              selectedEventDetail ||
              events[0]
            }
            allEvents={events}
            onBack={() => handleNavigate('events')}
            onNavigate={handleNavigate}
            onSelectEventDetail={handleSelectEventDetail}
            onToggleSaveEvent={handleToggleSaveEvent}
            auth={auth}
            onRequireLogin={(reason) => {
              setLoginModalReason(reason || 'Vui lòng đăng nhập để thêm task vào danh sách nhiệm vụ');
              setLoginModalOpen(true);
            }}
          />
        )}

        {currentView === 'cv-builder' && (
          <CVBuilderView
            onNavigate={handleNavigate}
            targetJobForCv={selectedJobForCv}
            userProfile={userProfile}
            onUpdateUserProfile={handleUpdateUserProfile}
            allJobs={jobs}
            onSelectJobForCv={(job) => {
              setSelectedJobForCv(job);
              handleUpdateUserProfile({
                targetJobId: job.id,
                targetJobTitle: job.title,
                targetJobCompany: job.company,
                targetJobSalary: job.salaryDisplay,
                targetJobLocation: job.location,
                targetJobRequiredSkills: job.requiredSkills || job.skillTags || [],
                targetJobDescription: job.description,
              });
            }}
            onEditProfile={() => setShowProfileSetupModal(true)}
          />
        )}

        {currentView === 'my-tasks' && (
          <MyTasksView
            onNavigate={handleNavigate}
            userProfile={userProfile}
            onUpdateUserProfile={handleUpdateUserProfile}
            auth={auth}
            onRequireLogin={(reason) => {
              setLoginModalReason(reason || 'Vui lòng đăng nhập để thêm task vào danh sách nhiệm vụ');
              setLoginModalOpen(true);
            }}
          />
        )}

        {currentView === 'student-dashboard' && (
          <StudentDashboardView
            onNavigate={handleNavigate}
            userProfile={userProfile}
            onEditProfile={() => setShowProfileSetupModal(true)}
          />
        )}

        {currentView === 'my-career' && (
          <MyCareerView
            onNavigate={handleNavigate}
            auth={auth}
            jobs={jobs}
            events={events}
            userProfile={userProfile}
            onSelectJobDetail={handleSelectJobDetail}
            onSelectEventDetail={handleSelectEventDetail}
            onEditProfile={() => setShowProfileSetupModal(true)}
          />
        )}

        {(currentView === 'saved-jobs' ||
          currentView === 'saved-events' ||
          currentView === 'saved-items') && (
          <SavedItemsView
            onNavigate={handleNavigate}
            initialTab={currentView === 'saved-events' ? 'events' : 'jobs'}
            jobs={jobs}
            onToggleSaveJob={handleToggleSaveJob}
            events={events}
            onToggleSaveEvent={handleToggleSaveEvent}
            onSelectJobForCv={(job) => setSelectedJobForCv(job)}
            onSelectJobDetail={handleSelectJobDetail}
            onSelectEventDetail={handleSelectEventDetail}
          />
        )}

        {currentView === 'feedback' && (
          <FeedbackView
            onNavigate={handleNavigate}
            userProfile={userProfile}
          />
        )}

        {currentView === 'privacy' && (
          <PrivacyPolicyView
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'terms' && (
          <TermsOfServiceView
            onNavigate={handleNavigate}
          />
        )}

        {isAdminView(currentView) && (
          !isAdminAuthenticated ? (
            <AdminLoginView
              onNavigate={handleNavigate}
              onAdminLoginSuccess={() => {
                setIsAdminAuthenticated(true);
                setCurrentView('admin-dashboard');
              }}
            />
          ) : (
            <AdminDashboardView
              onNavigate={handleNavigate}
              initialTab={
                currentView === 'admin-events'
                  ? 'events'
                  : currentView === 'admin-analytics'
                  ? 'analytics'
                  : currentView === 'admin-letters'
                  ? 'letters'
                  : currentView === 'admin-users'
                  ? 'users'
                  : currentView === 'admin-access'
                  ? 'access'
                  : 'jobs'
              }
              isAdminAuthenticated={true}
              onLogoutAdmin={() => {
                try {
                  sessionStorage.removeItem('ptit_admin_authenticated');
                } catch {}
                setIsAdminAuthenticated(false);
                setCurrentView('admin');
              }}
              onUpdateJobs={(updatedJobs) => setJobs(updatedJobs)}
              onUpdateEvents={(updatedEvents) => setEvents(updatedEvents)}
            />
          )
        )}
      </main>

      {/* Universal Footer (Contains the only authorized entry to Admin Login) */}
      {!isAdminView(currentView) && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Minimal Profile Setup Modal (New User Onboarding or Edit Profile) */}
      <MinimalProfileModal
        isOpen={showProfileSetupModal}
        userProfile={userProfile}
        initialProfile={userProfile}
        onSave={handleSaveProfile}
        onComplete={handleSaveProfile}
        onClose={() => setShowProfileSetupModal(false)}
        onSkip={() => setShowProfileSetupModal(false)}
        isForced={!isProfileOnboardingComplete(userProfile)}
      />

      {/* Student Login Modal - Only active on student views when not authenticated */}
      {!isAdminView(currentView) && (
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => {
            setLoginModalOpen(false);
            setLoginModalReason(null);
          }}
          onLoginSuccess={handleLoginSuccess}
          onNavigateAdmin={() => handleNavigate('admin')}
          reasonMessage={loginModalReason}
        />
      )}

      {/* 4-Step Orientation Onboarding Modal for PTIT Students */}
      <OrientationModal
        isOpen={orientationModalOpen}
        onClose={() => setOrientationModalOpen(false)}
        onNavigate={setCurrentView}
        onSaveProfile={(profileData) => {
          if (profileData.careerGoal) {
            setSelectedCareerTitle(profileData.careerGoal);
          }
          const updated = saveUserProfile({
            careerGoal: profileData.careerGoal,
            ...(profileData.major ? { major: profileData.major } : {}),
            ...((profileData as any).academicYear ? { academicYear: (profileData as any).academicYear } : {}),
          });
          setUserProfile(updated);
          if (profileData.currentLevel && auth.isLoggedIn) {
            setAuth((prev) => ({
              ...prev,
              year: (profileData as any).academicYear || profileData.currentLevel || prev.year,
            }));
          }
        }}
      />

      {/* Official PTIT Direct System Letter / Announcement Modal */}
      <SystemLetterModal
        letter={selectedSystemLetter}
        onClose={() => setSelectedSystemLetter(null)}
        onNavigate={handleNavigate}
      />

      {/* Global Toast Notifications Container */}
      <ToastContainer />
    </div>
  );
}

export default App;


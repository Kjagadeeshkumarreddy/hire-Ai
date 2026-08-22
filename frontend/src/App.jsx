import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import CandidateDashboard from './pages/CandidateDashboard';
import JDBuilderPage from './pages/JDBuilderPage';
import CandidateUploadPage from './pages/CandidateUploadPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import ComparisonPage from './pages/ComparisonPage';
import ShortlistPage from './pages/ShortlistPage';
import InterviewQuestionsPage from './pages/InterviewQuestionsPage';
import OfferLetterPage from './pages/OfferLetterPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import StudentDashboard from './pages/StudentDashboard';
import StyleTransformerPage from './pages/StyleTransformerPage';
import StudentHistoryPage from './pages/StudentHistoryPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SignOfferPage from './pages/SignOfferPage';
import OfferTrackingPage from './pages/OfferTrackingPage';
import TechRecruiterDashboard from './pages/TechRecruiterDashboard';
import TechRecruiterForgePage from './pages/TechRecruiterForgePage';
import { useAuthStore } from './stores/authStore';

const queryClient = new QueryClient();

// Authenticated wrapper resolving strict JWT bindings globally
const ProtectedRoute = ({ children }) => {
  const token = useAuthStore(state => state.token);
  // Re-enabled strict authentication locks mapping directly to Token verifications.
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

import ShortlistedCandidatesPage from './pages/ShortlistedCandidatesPage';
import TechRecruitersPage from './pages/TechRecruitersPage';
import CampaignPage from './pages/CampaignPage';
import ScheduleMeetingPage from './pages/ScheduleMeetingPage';

const RoleRedirect = () => {
  const user = useAuthStore(state => state.user);
  if (user?.role === 'student') return <Navigate to="/student" replace />;
  if (user?.role === 'tech_recruiter') return <Navigate to="/tech-recruiter" replace />;
  return <DashboardPage />;
};

const App = () => {
  const initializeAuth = useAuthStore(state => state.initializeAuth);
  const isInitializing = useAuthStore(state => state.isInitializing);

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin"></div>
          <p className="text-text-muted text-sm font-medium animate-pulse">Establishing secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Path */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Public E-Signature Path (no auth required) */}
          <Route path="/sign/:token" element={<SignOfferPage />} />

          {/* Secure Administrative Dashboard Shell mappings */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            <Route index element={
              <RoleRedirect />
            } />
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/transformer" element={<Navigate to="gallery" replace />} />
            <Route path="student/transformer/gallery" element={<StyleTransformerPage defaultTab="gallery" />} />
            <Route path="student/transformer/custom" element={<StyleTransformerPage defaultTab="custom" />} />
            <Route path="student/history" element={<StudentHistoryPage />} />
            <Route path="jd" element={<JDBuilderPage />} />
            <Route path="candidates" element={<CandidateDashboard />} />
            <Route path="candidates/:id" element={<CandidateDetailPage />} />
            <Route path="shortlisted" element={<ShortlistedCandidatesPage />} />
            <Route path="campaign" element={<CampaignPage />} />
            <Route path="campaign/:jobId" element={<CampaignPage />} />
            <Route path="schedule" element={<ScheduleMeetingPage />} />
            <Route path="schedule/:jobId" element={<ScheduleMeetingPage />} />
            <Route path="compare" element={<ComparisonPage />} />
            <Route path="upload" element={<CandidateUploadPage />} />
            <Route path="shortlist" element={<ShortlistPage />} />
            <Route path="questions" element={<InterviewQuestionsPage />} />
            <Route path="offer-letter" element={<OfferLetterPage />} />
            <Route path="tech-recruiters" element={<TechRecruitersPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="esign-status" element={<OfferTrackingPage />} />
            <Route path="admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="tech-recruiter" element={<TechRecruiterDashboard />} />
            <Route path="tech-recruiter/:candidateId" element={<TechRecruiterForgePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

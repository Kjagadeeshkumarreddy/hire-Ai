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
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
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

import CampaignPage from './pages/CampaignPage';

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Path */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Secure Administrative Dashboard Shell mappings */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="jd" element={<JDBuilderPage />} />
            <Route path="candidates" element={<CandidateDashboard />} />
            <Route path="candidates/:id" element={<CandidateDetailPage />} />
            <Route path="shortlisted" element={<ShortlistedCandidatesPage />} />
            <Route path="campaign" element={<CampaignPage />} />
            <Route path="campaign/:jobId" element={<CampaignPage />} />
            <Route path="compare" element={<ComparisonPage />} />
            <Route path="upload" element={<CandidateUploadPage />} />
            <Route path="shortlist" element={<ShortlistPage />} />
            <Route path="questions" element={<InterviewQuestionsPage />} />
            <Route path="offer-letter" element={<OfferLetterPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;

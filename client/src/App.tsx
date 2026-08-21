import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from './store/appStore';
import { useAuthStore } from './lib/authStore';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { CommandPalette } from './components/shared/CommandPalette';
import { Dashboard } from './pages/Dashboard';
import { StudentsPage } from './pages/Students';
import { CompaniesPage } from './pages/Companies';
import { DrivesPage } from './pages/Drives';
import { AllocationPage } from './pages/Allocation';
import { SelectionStudio } from './pages/SelectionStudio';
import { Simulation } from './pages/Simulation';
import { Crawler } from './pages/Crawler';
import { YearlyReports } from './pages/YearlyReports';
import { SchedulerPage } from './pages/Scheduler';
import { AssessmentsPage } from './pages/Assessments';
import { CandidateAssessment } from './pages/CandidateAssessment';
import { AnomalyCenterPage } from './pages/AnomalyCenter';
import { AnalyticsPage } from './pages/Analytics';
import { ReportsPage } from './pages/Reports';
import { AuditPage } from './pages/AuditLogs';
import { SettingsPage } from './pages/Settings';
import { LoginPage } from './pages/Login';
import { StudentPortalPage } from './pages/StudentPortal';

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div {...pageTransition}>{children}</motion.div>
);

function AppLayout() {
  const { sidebarCollapsed } = useAppStore();
  const { role } = useAuthStore();

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <CommandPalette />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
      >
        <Topbar />
        <main className="min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route
              path="/"
              element={
                role === 'student' ? (
                  <Navigate to="/student-portal" replace />
                ) : (
                  <PageWrapper><Dashboard /></PageWrapper>
                )
              }
            />
            <Route path="/student-portal" element={<PageWrapper><StudentPortalPage /></PageWrapper>} />
            <Route path="/students" element={<PageWrapper><StudentsPage /></PageWrapper>} />
            <Route path="/companies" element={<PageWrapper><CompaniesPage /></PageWrapper>} />
            <Route path="/drives" element={<PageWrapper><DrivesPage /></PageWrapper>} />
            <Route path="/allocation" element={<PageWrapper><AllocationPage /></PageWrapper>} />
            <Route path="/selection-studio" element={<PageWrapper><SelectionStudio /></PageWrapper>} />
            <Route path="/simulation" element={<PageWrapper><Simulation /></PageWrapper>} />
            <Route path="/crawler" element={<PageWrapper><Crawler /></PageWrapper>} />
            <Route path="/yearly-reports" element={<PageWrapper><YearlyReports /></PageWrapper>} />
            <Route path="/scheduler" element={<PageWrapper><SchedulerPage /></PageWrapper>} />
            <Route path="/assessments" element={<PageWrapper><AssessmentsPage /></PageWrapper>} />
            <Route path="/candidate-sandbox" element={<PageWrapper><CandidateAssessment /></PageWrapper>} />
            <Route path="/anomalies" element={<PageWrapper><AnomalyCenterPage /></PageWrapper>} />
            <Route path="/analytics" element={<PageWrapper><AnalyticsPage /></PageWrapper>} />
            <Route path="/reports" element={<PageWrapper><ReportsPage /></PageWrapper>} />
            <Route path="/audit" element={<PageWrapper><AuditPage /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
            <Route path="*" element={
              <PageWrapper>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Page Not Found</h2>
                  <p className="text-surface-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
                  <a href="/" className="btn-primary">Go to Dashboard</a>
                </div>
              </PageWrapper>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

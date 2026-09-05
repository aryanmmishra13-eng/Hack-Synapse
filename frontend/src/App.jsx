import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Cursor } from './components/Cursor';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

// Student Pages
import { StudentHome } from './pages/StudentHome';
import { SportsPage } from './pages/SportsPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';
import { BookingsPage } from './pages/BookingsPage';
import { PlayNowPage } from './pages/PlayNowPage';
import { FindPlayersPage } from './pages/FindPlayersPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { EquipmentPage } from './pages/EquipmentPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { TrainingPage } from './pages/TrainingPage';
import { PerformancePage } from './pages/PerformancePage';
import { AwardsPage } from './pages/AwardsPage';
import { MyStatsPage } from './pages/MyStatsPage';
import { InjuryRiskPage } from './pages/InjuryRiskPage';

// Coach Pages
import { CoachDashboardPage } from './pages/CoachDashboardPage';
import { CoachStudentsPage } from './pages/CoachStudentsPage';
import { CoachTrainingPage } from './pages/CoachTrainingPage';
import { CoachAssessmentsPage } from './pages/CoachAssessmentsPage';
import { CoachTournamentsPage } from './pages/CoachTournamentsPage';

// Admin Pages
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminOccupancyPage } from './pages/AdminOccupancyPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { AdminSimulatorPage } from './pages/AdminSimulatorPage';
import { AdminAllocationPage } from './pages/AdminAllocationPage';
import { AdminMaintenancePage } from './pages/AdminMaintenancePage';
import { AdminEquipmentPage } from './pages/AdminEquipmentPage';
import { AdminTournamentsPage } from './pages/AdminTournamentsPage';
import { AdminCoachesPage } from './pages/AdminCoachesPage';
import { AdminStudentReportsPage } from './pages/AdminStudentReportsPage';
import { AdminSportsOverviewPage } from './pages/AdminSportsOverviewPage';
import { AdminQRScannerPage } from './pages/AdminQRScannerPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-[#888880]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#FF4D00] border-t-transparent animate-spin"></div>
          <span className="font-mono text-[10px] tracking-widest text-[#888880] uppercase">VERIFYING CREDENTIALS...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dest = user.role === 'ADMIN' ? '/admin' : user.role === 'COACH' ? '/coach' : '/app';
    return <Navigate to={dest} replace />;
  }

  return children;
};

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EB] flex flex-col selection:bg-[#FF4D00] selection:text-black">
      <Navbar />
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default function App() {
  return (
    <>
      <Cursor />
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Student Portal Routes */}
        <Route
          path="/app/*"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <MainLayout>
                <Routes>
                  <Route path="" element={<StudentHome />} />
                  <Route path="sports" element={<SportsPage />} />
                  <Route path="sports/:sportId" element={<FacilityDetailPage />} />
                  <Route path="equipment" element={<EquipmentPage />} />
                  <Route path="tournaments" element={<TournamentsPage />} />
                  <Route path="tournaments/:id" element={<TournamentDetailPage />} />
                  <Route path="training" element={<TrainingPage />} />
                  <Route path="my-stats" element={<MyStatsPage />} />
                  <Route path="performance" element={<PerformancePage />} />
                  <Route path="awards" element={<AwardsPage />} />
                  <Route path="play-now" element={<PlayNowPage />} />
                  <Route path="find-players" element={<FindPlayersPage />} />
                  <Route path="my-bookings" element={<BookingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="injury-risk" element={<InjuryRiskPage />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Coach Portal Routes */}
        <Route
          path="/coach/*"
          element={
            <ProtectedRoute allowedRoles={['COACH']}>
              <MainLayout>
                <Routes>
                  <Route path="" element={<CoachDashboardPage />} />
                  <Route path="students" element={<CoachStudentsPage />} />
                  <Route path="training" element={<CoachTrainingPage />} />
                  <Route path="assessments" element={<CoachAssessmentsPage />} />
                  <Route path="tournaments" element={<CoachTournamentsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Console Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MainLayout>
                <Routes>
                  <Route path="" element={<AdminDashboardPage />} />
                  <Route path="equipment" element={<AdminEquipmentPage />} />
                  <Route path="tournaments" element={<AdminTournamentsPage />} />
                  <Route path="coaches" element={<AdminCoachesPage />} />
                  <Route path="students" element={<AdminStudentReportsPage />} />
                  <Route path="sports-overview" element={<AdminSportsOverviewPage />} />
                  <Route path="occupancy" element={<AdminOccupancyPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="simulator" element={<AdminSimulatorPage />} />
                  <Route path="qr-scanner" element={<AdminQRScannerPage />} />
                  <Route path="allocation" element={<AdminAllocationPage />} />
                  <Route path="maintenance" element={<AdminMaintenancePage />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

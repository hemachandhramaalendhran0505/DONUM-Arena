import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppLayout } from '@/layouts/AppLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LandingPage } from '@/pages/LandingPage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { LogoMark } from '@/components/common/Logo';
import type { UserRole } from '@/types';

// Dashboards & feature pages are code-split so first paint stays fast.
const DonorDashboard = lazy(() => import('@/pages/donor/DonorDashboard').then((m) => ({ default: m.DonorDashboard })));
const AddDonationPage = lazy(() => import('@/pages/donor/AddDonationPage').then((m) => ({ default: m.AddDonationPage })));
const DonationsListPage = lazy(() => import('@/pages/donor/DonationsListPage').then((m) => ({ default: m.DonationsListPage })));
const DonationDetailPage = lazy(() => import('@/pages/shared/DonationDetailPage').then((m) => ({ default: m.DonationDetailPage })));
const NgoDashboard = lazy(() => import('@/pages/ngo/NgoDashboard').then((m) => ({ default: m.NgoDashboard })));
const BrowseDonationsPage = lazy(() => import('@/pages/ngo/BrowseDonationsPage').then((m) => ({ default: m.BrowseDonationsPage })));
const RequestsListPage = lazy(() => import('@/pages/requests/RequestsListPage').then((m) => ({ default: m.RequestsListPage })));
const CreateRequestPage = lazy(() => import('@/pages/requests/CreateRequestPage').then((m) => ({ default: m.CreateRequestPage })));
const RequestDetailPage = lazy(() => import('@/pages/requests/RequestDetailPage').then((m) => ({ default: m.RequestDetailPage })));
const VolunteerDashboard = lazy(() => import('@/pages/volunteer/VolunteerDashboard').then((m) => ({ default: m.VolunteerDashboard })));
const TasksPage = lazy(() => import('@/pages/volunteer/TasksPage').then((m) => ({ default: m.TasksPage })));
const TaskDetailPage = lazy(() => import('@/pages/volunteer/TaskDetailPage').then((m) => ({ default: m.TaskDetailPage })));
const RequestorDashboard = lazy(() => import('@/pages/requestor/RequestorDashboard').then((m) => ({ default: m.RequestorDashboard })));
const ImpactPage = lazy(() => import('@/pages/shared/ImpactPage').then((m) => ({ default: m.ImpactPage })));
const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage').then((m) => ({ default: m.ProfilePage })));

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-12 w-12 animate-float" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-ink/8">
          <div className="h-full w-1/3 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <LogoMark className="h-9 w-9 animate-pulse" />
    </div>
  );
}

/** Blocks unauthenticated access and routes users to the right onboarding step. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />;
  if (!user.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** Restricts a route to specific roles. */
function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** The dashboard shown at /app depends entirely on the signed-in role. */
function RoleDashboard() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'ngo':
      return <NgoDashboard />;
    case 'volunteer':
      return <VolunteerDashboard />;
    case 'requestor':
      return <RequestorDashboard />;
    default:
      return <DonorDashboard />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/onboarding/profile" element={<OnboardingPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <RoleDashboard />
            </Suspense>
          }
        />

        {/* Donations */}
        <Route
          path="donations"
          element={
            <Suspense fallback={<PageLoader />}>
              <DonationsListPage />
            </Suspense>
          }
        />
        <Route
          path="donations/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <RequireRole roles={['donor', 'ngo']}>
                <AddDonationPage />
              </RequireRole>
            </Suspense>
          }
        />
        <Route
          path="donations/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <DonationDetailPage />
            </Suspense>
          }
        />

        {/* NGO */}
        <Route
          path="browse"
          element={
            <Suspense fallback={<PageLoader />}>
              <RequireRole roles={['ngo', 'requestor']}>
                <BrowseDonationsPage />
              </RequireRole>
            </Suspense>
          }
        />

        {/* Requests */}
        <Route
          path="requests"
          element={
            <Suspense fallback={<PageLoader />}>
              <RequestsListPage />
            </Suspense>
          }
        />
        <Route
          path="requests/new"
          element={
            <Suspense fallback={<PageLoader />}>
              <RequireRole roles={['ngo', 'requestor']}>
                <CreateRequestPage />
              </RequireRole>
            </Suspense>
          }
        />
        <Route
          path="requests/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <RequestDetailPage />
            </Suspense>
          }
        />

        {/* Volunteer */}
        <Route
          path="tasks"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksPage />
            </Suspense>
          }
        />
        <Route
          path="tasks/history"
          element={
            <Suspense fallback={<PageLoader />}>
              <TasksPage defaultTab="completed" />
            </Suspense>
          }
        />
        <Route
          path="tasks/:id"
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskDetailPage />
            </Suspense>
          }
        />

        {/* Shared */}
        <Route
          path="impact"
          element={
            <Suspense fallback={<PageLoader />}>
              <ImpactPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

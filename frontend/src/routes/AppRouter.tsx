import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';

// Lazy load pages
const HomePage = React.lazy(() => import('@/pages/HomePage'));
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'));
const BrowseListingsPage = React.lazy(() => import('@/pages/BrowseListingsPage'));
const BrowseServicesPage = React.lazy(() => import('@/pages/BrowseServicesPage'));
const ListingDetailPage = React.lazy(() => import('@/pages/ListingDetailPage'));
const ServiceDetailPage = React.lazy(() => import('@/pages/ServiceDetailPage'));

// Dashboard pages
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const MyListingsPage = React.lazy(() => import('@/pages/dashboard/MyListingsPage'));
const CreateListingPage = React.lazy(() => import('@/pages/dashboard/CreateListingPage'));
const MyOrdersPage = React.lazy(() => import('@/pages/dashboard/MyOrdersPage'));
const MyServicesPage = React.lazy(() => import('@/pages/dashboard/MyServicesPage'));
const ProfilePage = React.lazy(() => import('@/pages/dashboard/ProfilePage'));
const NotificationsPage = React.lazy(() => import('@/pages/dashboard/NotificationsPage'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  </div>
);

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <HomePage />
          </React.Suspense>
        ),
      },
      {
        path: '/login',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <LoginPage />
          </React.Suspense>
        ),
      },
      {
        path: '/register',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <RegisterPage />
          </React.Suspense>
        ),
      },
      {
        path: '/listings',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <BrowseListingsPage />
          </React.Suspense>
        ),
      },
      {
        path: '/listings/:id',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <ListingDetailPage />
          </React.Suspense>
        ),
      },
      {
        path: '/services',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <BrowseServicesPage />
          </React.Suspense>
        ),
      },
      {
        path: '/services/:id',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <ServiceDetailPage />
          </React.Suspense>
        ),
      },
      // Dashboard routes (protected)
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/listings',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <MyListingsPage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/listings/new',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <CreateListingPage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/orders',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <MyOrdersPage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/services',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <MyServicesPage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/profile',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/notifications',
        element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <NotificationsPage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;

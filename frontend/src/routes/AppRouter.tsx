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
const AdminLoginPage = React.lazy(() => import('@/pages/admin/AdminLoginPage'));

// Admin pages
const AdminLayout = React.lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboardPage = React.lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminProductsPage = React.lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminServicesPage = React.lazy(() => import('@/pages/admin/AdminServicesPage'));
const AdminBookingsPage = React.lazy(() => import('@/pages/admin/AdminBookingsPage'));
const AdminOrdersPage = React.lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminPaymentsPage = React.lazy(() => import('@/pages/admin/AdminPaymentsPage'));
const AdminCategoriesPage = React.lazy(() => import('@/pages/admin/AdminCategoriesPage'));

// Dashboard pages
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const MyListingsPage = React.lazy(() => import('@/pages/dashboard/MyListingsPage'));
const CreateListingPage = React.lazy(() => import('@/pages/dashboard/CreateListingPage'));
const MyOrdersPage = React.lazy(() => import('@/pages/dashboard/MyOrdersPage'));
const MyServicesPage = React.lazy(() => import('@/pages/dashboard/MyServicesPage'));
const CreateServicePage = React.lazy(() => import('@/pages/dashboard/CreateServicePage'));
const MyPostedServicesPage = React.lazy(() => import('@/pages/dashboard/MyPostedServicesPage'));
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
    path: '/admin/login',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <AdminLoginPage />
      </React.Suspense>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <React.Suspense fallback={<PageLoader />}>
          <AdminLayout />
        </React.Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminDashboardPage />
          </React.Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminUsersPage />
          </React.Suspense>
        ),
      },
      {
        path: 'products',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminProductsPage />
          </React.Suspense>
        ),
      },
      {
        path: 'services',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminServicesPage />
          </React.Suspense>
        ),
      },
      {
        path: 'bookings',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminBookingsPage />
          </React.Suspense>
        ),
      },
      {
        path: 'orders',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminOrdersPage />
          </React.Suspense>
        ),
      },
      {
        path: 'payments',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminPaymentsPage />
          </React.Suspense>
        ),
      },
      {
        path: 'categories',
        element: (
          <React.Suspense fallback={<PageLoader />}>
            <AdminCategoriesPage />
          </React.Suspense>
        ),
      },
    ],
  },
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
          <ProtectedRoute requiredRole="user">
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
          <ProtectedRoute requiredRole="user">
            <React.Suspense fallback={<PageLoader />}>
              <MyServicesPage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/services/new',
        element: (
          <ProtectedRoute requiredRole="user">
            <React.Suspense fallback={<PageLoader />}>
              <CreateServicePage />
            </React.Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/services/posted',
        element: (
          <ProtectedRoute requiredRole="user">
            <React.Suspense fallback={<PageLoader />}>
              <MyPostedServicesPage />
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

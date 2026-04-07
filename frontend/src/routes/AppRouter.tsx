import React from 'react';
import { Outlet, createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import FullPageLoader from '@/components/ui/FullPageLoader';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from '@/pages/NotFoundPage';
import ServerErrorPage from '@/pages/ServerErrorPage';

// Lazy load pages
const HomePage = React.lazy(() => import('@/pages/HomePage'));
const LoginPage = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'));
const BrowseListingsPage = React.lazy(() => import('@/pages/BrowseListingsPage'));
const BrowseServicesPage = React.lazy(() => import('@/pages/BrowseServicesPage'));
const ListingDetailPage = React.lazy(() => import('@/pages/ListingDetailPage'));
const ServiceDetailPage = React.lazy(() => import('@/pages/ServiceDetailPage'));
const SafetyTipsPage = React.lazy(() => import('@/pages/SafetyTipsPage'));
const TermsOfServicePage = React.lazy(() => import('@/pages/TermsOfServicePage'));
const PrivacyPolicyPage = React.lazy(() => import('@/pages/PrivacyPolicyPage'));
const CommunityGuidelinesPage = React.lazy(() => import('@/pages/CommunityGuidelinesPage'));
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
const AdminContactsPage = React.lazy(() => import('@/pages/admin/AdminContactsPage'));
const AdminReportsPage = React.lazy(() => import('@/pages/admin/AdminReportsPage'));
const AdminReviewsPage = React.lazy(() => import('@/pages/admin/AdminReviewsPage'));

// Dashboard pages
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const MyListingsPage = React.lazy(() => import('@/pages/dashboard/MyListingsPage'));
const CreateListingPage = React.lazy(() => import('@/pages/dashboard/CreateListingPage'));
const MyOrdersPage = React.lazy(() => import('@/pages/dashboard/MyOrdersPage'));
const WishlistPage = React.lazy(() => import('@/pages/dashboard/WishlistPage'));
const MyServicesPage = React.lazy(() => import('@/pages/dashboard/MyServicesPage'));
const MyPaymentsPage = React.lazy(() => import('@/pages/dashboard/MyPaymentsPage'));
const MyServiceRequestsPage = React.lazy(() => import('@/pages/dashboard/MyServiceRequestsPage'));
const ServiceBookingPaymentPage = React.lazy(() => import('@/pages/dashboard/ServiceBookingPaymentPage'));
const CreateServicePage = React.lazy(() => import('@/pages/dashboard/CreateServicePage'));
const MyPostedServicesPage = React.lazy(() => import('@/pages/dashboard/MyPostedServicesPage'));
const InsightsPage = React.lazy(() => import('@/pages/dashboard/InsightsPage'));
const ProfilePage = React.lazy(() => import('@/pages/dashboard/ProfilePage'));
const NotificationsPage = React.lazy(() => import('@/pages/dashboard/NotificationsPage'));
const StripeConnectCallbackPage = React.lazy(() => import('@/pages/dashboard/StripeConnectCallbackPage'));
const StripeConnectRefreshPage = React.lazy(() => import('@/pages/dashboard/StripeConnectRefreshPage'));

// Loading fallback
const PageLoader = () => <FullPageLoader label="Loading page..." />;

const ScrollToTopLayout: React.FC = () => {
  const { pathname, search } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return <Outlet />;
};

const router = createBrowserRouter([
  {
    element: <ScrollToTopLayout />,
    errorElement: <ServerErrorPage />,
    children: [
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
          {
            path: 'contacts',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <AdminContactsPage />
              </React.Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <AdminReportsPage />
              </React.Suspense>
            ),
          },
          {
            path: 'reviews',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <AdminReviewsPage />
              </React.Suspense>
            ),
          },
          {
            path: 'notifications',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <NotificationsPage />
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
          {
            path: '/safety-tips',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <SafetyTipsPage />
              </React.Suspense>
            ),
          },
          {
            path: '/terms-of-service',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <TermsOfServicePage />
              </React.Suspense>
            ),
          },
          {
            path: '/privacy-policy',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <PrivacyPolicyPage />
              </React.Suspense>
            ),
          },
          {
            path: '/community-guidelines',
            element: (
              <React.Suspense fallback={<PageLoader />}>
                <CommunityGuidelinesPage />
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
            path: '/dashboard/wishlist',
            element: (
              <ProtectedRoute>
                <React.Suspense fallback={<PageLoader />}>
                  <WishlistPage />
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
            path: '/dashboard/payments',
            element: (
              <ProtectedRoute>
                <React.Suspense fallback={<PageLoader />}>
                  <MyPaymentsPage />
                </React.Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/insights',
            element: (
              <ProtectedRoute requiredRole="user">
                <React.Suspense fallback={<PageLoader />}>
                  <InsightsPage />
                </React.Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/service-requests',
            element: (
              <ProtectedRoute requiredRole="user">
                <React.Suspense fallback={<PageLoader />}>
                  <MyServiceRequestsPage />
                </React.Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/service-requests/:bookingId/payment',
            element: (
              <ProtectedRoute requiredRole="user">
                <React.Suspense fallback={<PageLoader />}>
                  <ServiceBookingPaymentPage />
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
          {
            path: '/dashboard/payouts/connect-callback',
            element: (
              <ProtectedRoute>
                <React.Suspense fallback={<PageLoader />}>
                  <StripeConnectCallbackPage />
                </React.Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/dashboard/payouts/connect-refresh',
            element: (
              <ProtectedRoute>
                <React.Suspense fallback={<PageLoader />}>
                  <StripeConnectRefreshPage />
                </React.Suspense>
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
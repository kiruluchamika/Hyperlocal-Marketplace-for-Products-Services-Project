import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';

const AdminLayout: React.FC = () => {
  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  React.useEffect(() => {
    if (typeof document === 'undefined' || isDesktop) return;

    document.body.style.overflow = isMobileSidebarOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isDesktop, isMobileSidebarOpen]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setIsSidebarExpanded((current) => !current);
      return;
    }

    setIsMobileSidebarOpen((current) => !current);
  };

  const desktopOffsetClass = isSidebarExpanded ? 'lg:ml-[240px]' : 'lg:ml-[68px]';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <AdminSidebar
        isDesktop={isDesktop}
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {!isDesktop && isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className={`flex min-h-screen flex-col transition-[margin-left] duration-300 ease-in-out ${desktopOffsetClass}`}>
        <AdminTopBar
          isDesktop={isDesktop}
          isSidebarExpanded={isDesktop ? isSidebarExpanded : isMobileSidebarOpen}
          onSidebarToggle={handleSidebarToggle}
        />
        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

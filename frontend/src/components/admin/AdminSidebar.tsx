import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiGrid,
  FiHome,
  FiUsers,
  FiPackage,
  FiBriefcase,
  FiShoppingCart,
  FiCreditCard,
  FiCalendar,
  FiLayers,
  FiExternalLink,
  FiLogOut,
  FiMessageSquare,
  FiAlertCircle,
  FiStar,
  FiSettings,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import LogoutConfirmModal from '@/components/modals/LogoutConfirmModal';
import logo from '@/assets/logo.png';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

interface AdminSidebarProps {
  isDesktop: boolean;
  isExpanded: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems: NavItem[] = [
  { to: '/admin',            icon: <FiGrid size={20} />,          label: 'Dashboard' },
  { to: '/admin/users',      icon: <FiUsers size={20} />,         label: 'Users' },
  { to: '/admin/products',   icon: <FiPackage size={20} />,       label: 'Products' },
  { to: '/admin/services',   icon: <FiBriefcase size={20} />,     label: 'Services' },
  { to: '/admin/bookings',   icon: <FiCalendar size={20} />,      label: 'Bookings' },
  { to: '/admin/orders',     icon: <FiShoppingCart size={20} />,  label: 'Orders' },
  { to: '/admin/payments',   icon: <FiCreditCard size={20} />,    label: 'Payments' },
  { to: '/admin/categories', icon: <FiLayers size={20} />,        label: 'Categories' },
  { to: '/admin/contacts',   icon: <FiMessageSquare size={20} />, label: 'Contacts' },
  { to: '/admin/reports',    icon: <FiAlertCircle size={20} />,   label: 'Reports' },
  { to: '/admin/reviews',    icon: <FiStar size={20} />,          label: 'Reviews' },
  { to: '/admin/settings',   icon: <FiSettings size={20} />,      label: 'Settings' },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isDesktop,
  isExpanded,
  isMobileOpen,
  onCloseMobile,
}) => {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false);

  const sidebarWidthClass = isExpanded ? 'w-[240px]' : 'w-[68px]';
  const mobileStateClass = isMobileOpen ? 'translate-x-0' : '-translate-x-full';
  const showText = isDesktop ? isExpanded : true;

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogoutAction = () => {
    setIsLogoutConfirmOpen(false);
    logout();
    navigate('/admin/login');
    onCloseMobile();
  };

  const handleOpenUserView = () => {
    navigate('/');
    onCloseMobile();
  };

  const handleOpenMarketplace = () => {
    navigate('/listings');
    onCloseMobile();
  };

  const handleNavClick = () => {
    if (!isDesktop) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out ${
        isDesktop ? `${sidebarWidthClass} translate-x-0` : `w-[240px] ${mobileStateClass} lg:translate-x-0`
      }`}
    >
      {/* Logo area */}
      <div className={`flex h-16 items-center border-b border-slate-200 ${showText ? 'justify-start px-3' : 'justify-center px-2'}`}>
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-indigo-100">
            <img src={logo} alt="Bazzoro" className="h-full w-full object-cover" />
          </div>
          {showText && (
            <div>
              <p className="whitespace-nowrap text-base font-bold text-slate-900">Bazzoro</p>
              <p className="whitespace-nowrap text-[11px] font-medium text-slate-400">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            onClick={handleNavClick}
            title={!showText ? item.label : undefined}
            className={({ isActive }) =>
              `group/item flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/10 text-blue-600 shadow-sm shadow-blue-500/10'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              } ${showText ? 'justify-start' : 'justify-center'} `
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {showText && <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="border-t border-slate-200 px-3 py-3">
        <button
          onClick={handleOpenUserView}
          title={!showText ? 'User View' : undefined}
          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700 ${
            showText ? 'justify-start' : 'justify-center'
          }`}
        >
          <span className="shrink-0">
            <FiHome size={20} />
          </span>
          {showText && <span className="whitespace-nowrap text-sm font-medium">User View</span>}
        </button>

        <button
          onClick={handleOpenMarketplace}
          title={!showText ? 'Monitor Marketplace' : undefined}
          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700 ${
            showText ? 'justify-start' : 'justify-center'
          }`}
        >
          <span className="shrink-0">
            <FiExternalLink size={20} />
          </span>
          {showText && <span className="whitespace-nowrap text-sm font-medium">Monitor Marketplace</span>}
        </button>

        <button
          onClick={handleLogout}
          title={!showText ? 'Logout' : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 ${
            showText ? 'justify-start' : 'justify-center'
          }`}
        >
          <span className="shrink-0">
            <FiLogOut size={20} />
          </span>
          {showText && <span className="whitespace-nowrap text-sm font-medium">Logout</span>}
        </button>

        <LogoutConfirmModal
          isOpen={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          onConfirm={confirmLogoutAction}
          title="Exit admin panel?"
          message="Logging out will close your admin session and return you to the admin sign-in page."
          confirmLabel="Yes, log out"
        />
      </div>
    </aside>
  );
};

export default AdminSidebar;
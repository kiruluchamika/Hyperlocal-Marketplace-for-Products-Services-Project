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
  FiAlertCircle,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/admin',           icon: <FiGrid size={20} />,         label: 'Dashboard' },
  { to: '/admin/users',     icon: <FiUsers size={20} />,        label: 'Users' },
  { to: '/admin/products',  icon: <FiPackage size={20} />,      label: 'Products' },
  { to: '/admin/services',  icon: <FiBriefcase size={20} />,    label: 'Services' },
  { to: '/admin/bookings',  icon: <FiCalendar size={20} />,     label: 'Bookings' },
  { to: '/admin/orders',    icon: <FiShoppingCart size={20} />,  label: 'Orders' },
  { to: '/admin/payments',  icon: <FiCreditCard size={20} />,   label: 'Payments' },
  { to: '/admin/categories',icon: <FiLayers size={20} />,       label: 'Categories' },
  { to: '/admin/reports',   icon: <FiAlertCircle size={20} />,  label: 'Reports' },
];

const AdminSidebar: React.FC = () => {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleOpenUserView = () => {
    navigate('/');
  };

  const handleOpenMarketplace = () => {
    navigate('/listings');
  };

  return (
    <aside
      className="group/sidebar fixed left-0 top-0 z-40 flex h-screen w-[68px] flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out hover:w-[240px]"
    >
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-indigo-100">
          <img src="/fav.png" alt="Bazzoro" className="h-full w-full object-contain" />
        </div>
        <div className="opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          <p className="whitespace-nowrap text-base font-bold text-slate-900">Bazzoro</p>
          <p className="whitespace-nowrap text-[11px] font-medium text-slate-400">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              `group/item flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/10 text-blue-600 shadow-sm shadow-blue-500/10'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-200 px-3 py-3">
        <button
          onClick={handleOpenUserView}
          className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700"
          title="Open user-side home for monitoring"
        >
          <span className="shrink-0"><FiHome size={20} /></span>
          <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            User View
          </span>
        </button>

        <button
          onClick={handleOpenMarketplace}
          className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700"
          title="Open marketplace listing feed"
        >
          <span className="shrink-0"><FiExternalLink size={20} /></span>
          <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            Monitor Marketplace
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <span className="shrink-0"><FiLogOut size={20} /></span>
          <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;

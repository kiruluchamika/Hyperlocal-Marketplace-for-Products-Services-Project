import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiMenu,
  FiX,
  FiBell,
  FiUser,
  FiLogOut,
  FiPackage,
  FiGrid,
  FiShoppingBag,
  FiSettings,
  FiChevronDown,
  FiPlusCircle,
  FiBookOpen,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Avatar } from '@/components/ui';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu, searchQuery, setSearchQuery } =
    useUIStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
      closeMobileMenu();
    }
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-nav border-b border-slate-100'
          : 'bg-white/70 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0" onClick={closeMobileMenu}>
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">
              Bazaaro
            </span>
          </Link>

          {/* Search Bar — Desktop */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center flex-1 max-w-lg mx-8"
          >
            <div className="relative w-full">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search products & services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50
                           focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20
                           outline-none transition-all duration-200 text-sm"
              />
            </div>
          </form>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Nav links — Desktop */}
            <div className="hidden lg:flex items-center gap-1">
              <Link
                to="/listings"
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Products
              </Link>
              <Link
                to="/services"
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Services
              </Link>
            </div>

            {isAuthenticated && user ? (
              <>
                {/* Create Listing */}
                <Link
                  to="/dashboard/listings/new"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white
                             bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl
                             hover:from-primary-700 hover:to-indigo-700 transition-all shadow-md shadow-primary-500/20"
                >
                  <FiPlusCircle className="h-4 w-4" />
                  <span>Sell</span>
                </Link>

                {/* Notifications */}
                <Link
                  to="/dashboard/notifications"
                  className="relative p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <FiBell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
                </Link>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Avatar name={user.name} src={user.profileImage} size="sm" />
                    <span className="hidden lg:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <FiChevronDown className="hidden lg:block h-4 w-4 text-slate-400" />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-slate-100 py-2 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>

                        <div className="py-1">
                          <DropdownLink to="/dashboard" icon={<FiGrid />} label="Dashboard" onClick={() => setIsProfileOpen(false)} />
                          <DropdownLink to="/dashboard/listings" icon={<FiPackage />} label="My Listings" onClick={() => setIsProfileOpen(false)} />
                          <DropdownLink to="/dashboard/services" icon={<FiBookOpen />} label="My Services" onClick={() => setIsProfileOpen(false)} />
                          <DropdownLink to="/dashboard/orders" icon={<FiShoppingBag />} label="My Orders" onClick={() => setIsProfileOpen(false)} />
                          <DropdownLink to="/dashboard/profile" icon={<FiUser />} label="Profile" onClick={() => setIsProfileOpen(false)} />
                          {user.role === 'admin' && (
                            <DropdownLink to="/admin" icon={<FiSettings />} label="Admin Panel" onClick={() => setIsProfileOpen(false)} />
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <FiLogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl
                             hover:from-primary-700 hover:to-indigo-700 transition-all shadow-md shadow-primary-500/20"
                >
                  Join Bazaaro
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-slate-100 bg-white"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Mobile Search */}
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search products & services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50
                               focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20
                               outline-none transition-all text-sm"
                  />
                </div>
              </form>

              <div className="space-y-1">
                <MobileLink to="/listings" label="Products" onClick={closeMobileMenu} />
                <MobileLink to="/services" label="Services" onClick={closeMobileMenu} />
                {isAuthenticated && (
                  <>
                    <MobileLink to="/dashboard" label="Dashboard" onClick={closeMobileMenu} />
                    <MobileLink to="/dashboard/listings/new" label="Sell Something" onClick={closeMobileMenu} />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// Helper components
const DropdownLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ to, icon, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
  >
    <span className="h-4 w-4">{icon}</span>
    {label}
  </Link>
);

const MobileLink: React.FC<{
  to: string;
  label: string;
  onClick: () => void;
}> = ({ to, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors"
  >
    {label}
  </Link>
);

export default Navbar;

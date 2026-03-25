import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  FiBookOpen,
  FiPlus,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Avatar } from '@/components/ui';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'text-indigo-700' : 'text-slate-600 hover:text-indigo-700'
  }`;

const activeUnderline = 'after:absolute after:left-3 after:right-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-indigo-700';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu, searchQuery, setSearchQuery } =
    useUIStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isUser = isAuthenticated && user?.role === 'user';

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

      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
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

  const isAddActive =
    location.pathname.startsWith('/dashboard/listings/new') ||
    location.pathname.startsWith('/dashboard/services/new');

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-[1200] transition-all duration-300 ${
        isScrolled
          ? 'border-b border-indigo-100/80 bg-white/85 shadow-nav backdrop-blur-2xl'
          : 'bg-white/70 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-[72px]">
          <Link to="/" className="flex flex-shrink-0 items-center gap-2" onClick={closeMobileMenu}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 via-indigo-600 to-slate-900 shadow-lg shadow-indigo-500/20">
              <span className="text-lg font-bold text-white">B</span>
            </div>
            <span className="hidden text-xl font-bold gradient-text sm:block">Bazaaro</span>
          </Link>

          <form onSubmit={handleSearch} className="mx-8 hidden max-w-lg flex-1 items-center md:flex">
            <div className="relative w-full">
              <FiSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products & services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white/95 py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 lg:flex">
              <NavLink to="/listings" className={(props) => `${navLinkClass(props)} ${props.isActive ? activeUnderline : ''}`}>
                Products
              </NavLink>
              <NavLink to="/services" className={(props) => `${navLinkClass(props)} ${props.isActive ? activeUnderline : ''}`}>
                Services
              </NavLink>

              {isUser && (
                <div className="relative" ref={addMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAddMenuOpen((prev) => !prev)}
                    className={`relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      isAddActive ? `text-indigo-700 ${activeUnderline}` : 'text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FiPlus className="h-4 w-4" />
                      Post an Ad
                      <FiChevronDown className={`h-4 w-4 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  <AnimatePresence>
                    {isAddMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 py-2 shadow-lg backdrop-blur-xl"
                      >
                        <AddMenuLink to="/dashboard/services/new" label="Post Service" onClick={() => setIsAddMenuOpen(false)} />
                        <AddMenuLink to="/dashboard/listings/new" label="Sell Product" onClick={() => setIsAddMenuOpen(false)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/dashboard/notifications"
                  className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <FiBell className="h-5 w-5" />
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                </Link>

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-500 px-2.5 py-1.5 text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg"
                  >
                    <div className="rounded-full ring-2 ring-white/20">
                      <Avatar name={user.name} src={user.profileImage} size="sm" />
                    </div>
                    <span className="hidden max-w-[100px] truncate text-sm font-medium lg:block">{user.name}</span>
                    <FiChevronDown className="hidden h-4 w-4 text-white/80 lg:block" />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 py-2 shadow-lg backdrop-blur-xl"
                      >
                        <div className="border-b border-slate-100 px-4 py-3">
                          <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                          <p className="truncate text-xs text-slate-400">{user.email}</p>
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
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
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
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary px-5 py-2.5 text-sm">
                  Join Bazaaro
                </Link>
              </div>
            )}

            <button
              onClick={toggleMobileMenu}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700 lg:hidden"
            >
              {isMobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-100 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <div className="space-y-3 px-4 py-4">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products & services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </form>

              <div className="space-y-1">
                <MobileLink to="/listings" label="Products" onClick={closeMobileMenu} />
                <MobileLink to="/services" label="Services" onClick={closeMobileMenu} />
                {isUser && (
                  <>
                    <MobileLink to="/dashboard/listings/new" label="Sell Product" onClick={closeMobileMenu} />
                    <MobileLink to="/dashboard/services/new" label="Post Service" onClick={closeMobileMenu} />
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

const DropdownLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ to, icon, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
  >
    <span className="h-4 w-4">{icon}</span>
    {label}
  </Link>
);

const AddMenuLink: React.FC<{ to: string; label: string; onClick: () => void }> = ({ to, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
  >
    {label}
  </Link>
);

const MobileLink: React.FC<{ to: string; label: string; onClick: () => void }> = ({ to, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
  >
    {label}
  </Link>
);

export default Navbar;

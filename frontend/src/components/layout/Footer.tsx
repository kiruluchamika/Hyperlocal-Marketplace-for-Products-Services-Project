import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiFacebook,
  FiTwitter,
  FiInstagram,
  FiYoutube,
  FiMail,
  FiMapPin,
  FiPhone,
} from 'react-icons/fi';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-300">
      {/* Newsletter section */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Stay in the loop
              </h3>
              <p className="text-slate-400 text-sm">
                Get the latest deals, new listings, and marketplace tips delivered to your inbox.
              </p>
            </div>
            <form className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-72 rounded-xl border border-white/70 bg-white px-4 py-3
                           text-slate-800 placeholder:text-slate-400 focus:border-indigo-300
                           focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-semibold text-white
                           transition-all shadow-sm hover:bg-indigo-800 hover:shadow-md"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 via-indigo-600 to-slate-900 shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-white">Bazaaro</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Sri Lanka's hyperlocal marketplace connecting buyers and sellers in your neighborhood.
              Find products and services near you.
            </p>
            <div className="flex items-center gap-3">
              <SocialIcon icon={<FiFacebook />} href="#" />
              <SocialIcon icon={<FiTwitter />} href="#" />
              <SocialIcon icon={<FiInstagram />} href="#" />
              <SocialIcon icon={<FiYoutube />} href="#" />
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-white font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-3">
              <FooterLink to="/listings" label="Browse Products" />
              <FooterLink to="/services" label="Browse Services" />
              <FooterLink to="/dashboard/listings/new" label="Sell a Product" />
              <FooterLink to="/dashboard/services/new" label="Offer a Service" />
              <FooterLink to="/listings?sort=-createdAt" label="Latest Deals" />
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              <FooterLink to="#" label="Help Center" />
              <FooterLink to="#" label="Safety Tips" />
              <FooterLink to="#" label="Terms of Service" />
              <FooterLink to="#" label="Privacy Policy" />
              <FooterLink to="#" label="Community Guidelines" />
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <FiMapPin className="h-4 w-4 text-primary-400 flex-shrink-0" />
                Colombo, Sri Lanka
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <FiMail className="h-4 w-4 text-primary-400 flex-shrink-0" />
                hello@bazaaro.lk
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <FiPhone className="h-4 w-4 text-primary-400 flex-shrink-0" />
                +94 11 234 5678
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Bazaaro. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link to="#" className="hover:text-primary-400 transition-colors">Terms</Link>
              <Link to="#" className="hover:text-primary-400 transition-colors">Privacy</Link>
              <Link to="#" className="hover:text-primary-400 transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialIcon: React.FC<{ icon: React.ReactNode; href: string }> = ({ icon, href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center
               text-slate-400 hover:bg-primary-600 hover:text-white transition-all duration-200"
  >
    {icon}
  </a>
);

const FooterLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <li>
    <Link
      to={to}
      className="text-sm text-slate-400 hover:text-primary-400 transition-colors duration-200"
    >
      {label}
    </Link>
  </li>
);

export default Footer;

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiMapPin,
  FiShield,
  FiTrendingUp,
  FiStar,
  FiArrowRight,
  FiPackage,
  FiTool,
  FiUsers,
  FiZap,
  FiHeart,
  FiEye,
  FiChevronRight,
} from 'react-icons/fi';
import { useCategoryStore } from '@/store/categoryStore';
import { useUIStore } from '@/store/uiStore';
import { Card, Badge } from '@/components/ui';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

const HomePage: React.FC = () => {
  const { categories, productCategories, serviceCategories, fetchCategories } = useCategoryStore();
  const { searchQuery, setSearchQuery } = useUIStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');

  useEffect(() => {
    if (categories.length === 0) fetchCategories();
  }, [categories.length, fetchCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="overflow-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-hero overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — Text Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-primary-200 text-sm font-medium">
                  <FiZap className="h-3.5 w-3.5 text-accent-400" />
                  Sri Lanka's #1 Local Marketplace
                </span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
              >
                Find Products &{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-300 via-violet-300 to-accent-400">
                  Services
                </span>{' '}
                Near You
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-300 mb-8 max-w-lg leading-relaxed"
              >
                Discover, buy, sell, and book locally. From handmade crafts to professional services —
                everything your neighborhood has to offer.
              </motion.p>

              {/* Search Bar */}
              <motion.form
                variants={fadeInUp}
                onSubmit={handleSearch}
                className="flex flex-col sm:flex-row gap-3 max-w-xl"
              >
                <div className="relative flex-1">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="What are you looking for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 backdrop-blur-sm
                               text-slate-800 placeholder:text-slate-400
                               focus:ring-4 focus:ring-primary-500/30 outline-none
                               shadow-xl shadow-black/10 text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-accent-400 to-accent-500
                             text-slate-900 rounded-2xl font-bold text-base
                             hover:from-accent-500 hover:to-accent-600
                             shadow-xl shadow-accent-500/30 transition-all
                             active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <FiSearch className="h-5 w-5" />
                  Search
                </button>
              </motion.form>

              {/* Quick stats */}
              <motion.div
                variants={fadeInUp}
                className="flex items-center gap-8 mt-10"
              >
                <StatItem value="10K+" label="Products" />
                <StatItem value="5K+" label="Services" />
                <StatItem value="50+" label="Cities" />
              </motion.div>
            </motion.div>

            {/* Right — Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block relative"
            >
              <div className="relative w-full h-[500px]">
                {/* Card 1 */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-0 right-0 w-72"
                >
                  <div className="bg-white rounded-2xl shadow-2xl p-4 border border-slate-100">
                    <div className="h-36 bg-gradient-to-br from-primary-100 to-indigo-100 rounded-xl mb-3 flex items-center justify-center">
                      <FiPackage className="h-12 w-12 text-primary-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">Handmade Wooden Crafts</h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary-600 font-bold">LKR 2,500</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <FiMapPin className="h-3 w-3" /> Kandy
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Card 2 */}
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute top-32 left-0 w-64"
                >
                  <div className="bg-white rounded-2xl shadow-2xl p-4 border border-slate-100">
                    <div className="h-28 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl mb-3 flex items-center justify-center">
                      <FiTool className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">Plumbing Service</h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-emerald-600 font-bold">LKR 1,500/hr</span>
                      <Badge variant="success" size="sm">Available</Badge>
                    </div>
                  </div>
                </motion.div>

                {/* Card 3 */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute bottom-10 right-12 w-60"
                >
                  <div className="bg-white rounded-2xl shadow-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                        <FiStar className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Rating</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <FiStar key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          ))}
                          <span className="text-xs font-semibold text-slate-700 ml-1">4.9</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Notification popup */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                  className="absolute top-64 right-4 w-56"
                >
                  <div className="bg-white rounded-xl shadow-lg p-3 border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FiTrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700">New order received!</p>
                      <p className="text-[11px] text-slate-400">just now</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L80 105C160 90 320 60 480 45C640 30 800 30 960 37.5C1120 45 1280 60 1360 67.5L1440 75V120H1360C1280 120 1120 120 960 120C800 120 640 120 480 120C320 120 160 120 80 120H0Z"
              fill="#f8fafc"
            />
          </svg>
        </div>
      </section>

      {/* ===== CATEGORIES SECTION ===== */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4"
            >
              Explore by <span className="gradient-text">Category</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-500 max-w-2xl mx-auto">
              Browse through our popular categories to find exactly what you need in your area.
            </motion.p>
          </motion.div>

          {/* Category tabs */}
          <div className="flex justify-center gap-2 mb-10">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'products'
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FiPackage className="inline-block h-4 w-4 mr-2 -mt-0.5" />
              Products
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'services'
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FiTool className="inline-block h-4 w-4 mr-2 -mt-0.5" />
              Services
            </button>
          </div>

          {/* Category grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
          >
            {(activeTab === 'products' ? productCategories : serviceCategories).length > 0 ? (
              (activeTab === 'products' ? productCategories : serviceCategories).slice(0, 12).map((category, index) => (
                <motion.div key={category._id} variants={scaleIn}>
                  <Link
                    to={`/${activeTab === 'products' ? 'listings' : 'services'}?category=${category._id}`}
                    className="block"
                  >
                    <Card className="p-5 text-center group hover:border-primary-200 border border-transparent">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <CategoryIcon index={index} />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {category.name}
                      </h3>
                    </Card>
                  </Link>
                </motion.div>
              ))
            ) : (
              // Show placeholder categories when API hasn't loaded
              placeholderCategories.map((cat, index) => (
                <motion.div key={cat} variants={scaleIn}>
                  <Card className="p-5 text-center group hover:border-primary-200 border border-transparent">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <CategoryIcon index={index} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">
                      {cat}
                    </h3>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4"
            >
              How <span className="gradient-text">Bazaaro</span> Works
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-500 max-w-2xl mx-auto">
              Getting started is simple. Three easy steps to buy, sell, or book in your local area.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {howItWorksSteps.map((step, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <div className="relative text-center group">
                  {/* Step number */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary-600 text-white text-sm font-bold rounded-full flex items-center justify-center z-10">
                    {i + 1}
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-primary-50/30 rounded-3xl p-8 pt-10 border border-slate-100 group-hover:border-primary-200 transition-colors">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-100 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                  </div>
                  {/* Connector line */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-primary-200" />
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURED SECTION ===== */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <div className="flex items-center justify-between mb-10">
              <motion.div variants={fadeInUp}>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
                  Popular <span className="gradient-text">Listings</span>
                </h2>
                <p className="text-slate-500">Check out what's trending in your area</p>
              </motion.div>
              <motion.div variants={fadeInUp}>
                <Link
                  to="/listings"
                  className="hidden sm:flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  View All <FiArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {mockListings.map((listing, i) => (
              <motion.div key={i} variants={scaleIn}>
                <Card className="group">
                  <div className="relative overflow-hidden">
                    <div className={`h-48 ${listing.bgColor} flex items-center justify-center`}>
                      {listing.icon}
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge variant={listing.condition === 'NEW' ? 'success' : 'info'} size="sm">
                        {listing.condition}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm">
                        <FiHeart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                      <FiMapPin className="h-3 w-3" />
                      {listing.location}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary-600">{listing.price}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <FiEye className="h-3 w-3" />
                        {listing.views}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-8 sm:hidden">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              View All Listings <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SERVICES SHOWCASE ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <div className="flex items-center justify-between mb-10">
              <motion.div variants={fadeInUp}>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
                  Top <span className="gradient-text">Services</span>
                </h2>
                <p className="text-slate-500">Professional services available near you</p>
              </motion.div>
              <motion.div variants={fadeInUp}>
                <Link
                  to="/services"
                  className="hidden sm:flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  View All <FiArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {mockServices.map((service, i) => (
              <motion.div key={i} variants={scaleIn}>
                <Card className="p-6 group border border-transparent hover:border-primary-100">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${service.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {service.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-primary-600 transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{service.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-primary-600 font-bold text-sm">{service.price}</span>
                        <Badge variant={service.pricingType === 'HOURLY' ? 'warning' : 'primary'} size="sm">
                          {service.pricingType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6"
            >
              Ready to Start{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-300 to-accent-500">
                Selling?
              </span>
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto"
            >
              Join thousands of local sellers and service providers. List your products or services
              for free and reach customers in your neighborhood.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/register"
                className="px-8 py-4 bg-gradient-to-r from-accent-400 to-accent-500 text-slate-900
                           rounded-2xl font-bold text-base hover:from-accent-500 hover:to-accent-600
                           shadow-xl shadow-accent-500/30 transition-all inline-flex items-center gap-2"
              >
                Get Started Free <FiChevronRight className="h-5 w-5" />
              </Link>
              <Link
                to="/listings"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20
                           rounded-2xl font-semibold text-base hover:bg-white/20 transition-all"
              >
                Browse Marketplace
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {trustItems.map((item, i) => (
              <motion.div key={i} variants={fadeInUp} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 mb-1">{item.value}</h3>
                <p className="text-sm text-slate-500">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// Helper components
const StatItem: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div>
    <p className="text-2xl font-extrabold text-white">{value}</p>
    <p className="text-sm text-slate-400">{label}</p>
  </div>
);

const categoryIcons = [
  <FiPackage className="h-6 w-6 text-primary-500" />,
  <FiTool className="h-6 w-6 text-emerald-500" />,
  <FiStar className="h-6 w-6 text-amber-500" />,
  <FiUsers className="h-6 w-6 text-blue-500" />,
  <FiShield className="h-6 w-6 text-violet-500" />,
  <FiTrendingUp className="h-6 w-6 text-rose-500" />,
  <FiZap className="h-6 w-6 text-orange-500" />,
  <FiHeart className="h-6 w-6 text-pink-500" />,
  <FiMapPin className="h-6 w-6 text-teal-500" />,
  <FiSearch className="h-6 w-6 text-indigo-500" />,
  <FiPackage className="h-6 w-6 text-cyan-500" />,
  <FiStar className="h-6 w-6 text-lime-500" />,
];

const CategoryIcon: React.FC<{ index: number }> = ({ index }) => {
  return categoryIcons[index % categoryIcons.length];
};

const placeholderCategories = [
  'Electronics', 'Vehicles', 'Home & Garden', 'Fashion', 'Tutoring', 'Repair Services',
  'Photography', 'Cleaning', 'Beauty', 'Sports', 'Books', 'Food',
];

const howItWorksSteps = [
  {
    icon: <FiSearch className="h-7 w-7 text-primary-600" />,
    title: 'Discover Locally',
    description: 'Browse thousands of products and services available right in your neighborhood. Filter by category, price, and distance.',
  },
  {
    icon: <FiUsers className="h-7 w-7 text-primary-600" />,
    title: 'Connect & Book',
    description: 'Connect directly with sellers and service providers. Book services or place orders with just a few clicks.',
  },
  {
    icon: <FiShield className="h-7 w-7 text-primary-600" />,
    title: 'Pay Securely',
    description: 'Our secure payment system with escrow protection ensures safe transactions. Money is released only when you\'re satisfied.',
  },
];

const mockListings = [
  {
    title: 'iPhone 15 Pro Max — 256GB',
    price: 'LKR 485,000',
    location: 'Colombo 7',
    condition: 'NEW',
    views: '1.2K',
    bgColor: 'bg-gradient-to-br from-slate-100 to-slate-200',
    icon: <FiPackage className="h-16 w-16 text-slate-300" />,
  },
  {
    title: 'Handcrafted Teak Dining Table',
    price: 'LKR 75,000',
    location: 'Kandy',
    condition: 'NEW',
    views: '856',
    bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100',
    icon: <FiPackage className="h-16 w-16 text-amber-200" />,
  },
  {
    title: 'Mountain Bike — 21 Speed',
    price: 'LKR 45,000',
    location: 'Galle',
    condition: 'USED',
    views: '654',
    bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    icon: <FiPackage className="h-16 w-16 text-emerald-200" />,
  },
  {
    title: 'Sony WH-1000XM5 Headphones',
    price: 'LKR 68,500',
    location: 'Negombo',
    condition: 'NEW',
    views: '1.5K',
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
    icon: <FiPackage className="h-16 w-16 text-blue-200" />,
  },
];

const mockServices = [
  {
    title: 'Home Plumbing Repair',
    description: 'Professional plumbing services for your home. Leak fixing, pipe replacement, and more.',
    price: 'LKR 1,500/hr',
    pricingType: 'HOURLY' as const,
    iconBg: 'bg-blue-50',
    icon: <FiTool className="h-7 w-7 text-blue-500" />,
  },
  {
    title: 'Photography & Videography',
    description: 'Capture your special moments with professional photography and video services.',
    price: 'LKR 25,000',
    pricingType: 'FIXED' as const,
    iconBg: 'bg-purple-50',
    icon: <FiStar className="h-7 w-7 text-purple-500" />,
  },
  {
    title: 'Home Tutoring — Mathematics',
    description: 'Experienced tutor for O/L and A/L mathematics. Personalized one-on-one sessions.',
    price: 'LKR 2,000/hr',
    pricingType: 'HOURLY' as const,
    iconBg: 'bg-emerald-50',
    icon: <FiUsers className="h-7 w-7 text-emerald-500" />,
  },
];

const trustItems = [
  { icon: <FiPackage className="h-7 w-7 text-primary-600" />, value: '10,000+', label: 'Active Listings' },
  { icon: <FiUsers className="h-7 w-7 text-primary-600" />, value: '5,000+', label: 'Happy Users' },
  { icon: <FiMapPin className="h-7 w-7 text-primary-600" />, value: '50+', label: 'Cities Covered' },
  { icon: <FiShield className="h-7 w-7 text-primary-600" />, value: '100%', label: 'Secure Payments' },
];

export default HomePage;

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
  FiClock,
  FiCreditCard,
  FiCheckCircle
} from 'react-icons/fi';
import { useCategoryStore } from '@/store/categoryStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { websiteReviewsApi } from '@/api/services';
import { IReviewSummary, IWebsiteReview, ReviewSort } from '@/types/review';
import ReviewModal from '@/components/reviews/ReviewModal';
import StarRating from '@/components/reviews/StarRating';
import Button from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui';
import { listingsApi } from '@/api/listings';
import { servicesApi } from '@/api/services';
import type { IProductListing, IServiceSelling } from '@/types';
import heroImageOne from '@/assets/hero/1.jpg';
import heroImageTwo from '@/assets/hero/2.jpg';
import heroImageThree from '@/assets/hero/3.jpeg';

// Animation variants
import { Variants } from 'framer-motion';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const floatAnim: Variants = {
  hidden: { y: 0 },
  visible: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

const heroSlides = [
  {
    image: heroImageOne,
    title: 'The Local Market, Evolved.',
    subtitle: 'Discover top-tier products from trusted sellers in your neighborhood. Fast, reliable, and secure.',
    badge: 'Sri Lanka\'s Premier Marketplace',
  },
  {
    image: heroImageTwo,
    title: 'Connect with Experts Instantly.',
    subtitle: 'Book professional services nearby with a few clicks. Plumbers, tutors, photographers, and more.',
    badge: 'Verified Professionals',
  },
  {
    image: heroImageThree,
    title: 'Grow Your Local Business.',
    subtitle: 'Create beautiful listings, reach thousands of buyers daily, and scale faster than ever.',
    badge: 'Empowering Communities',
  },
];

const formatCurrency = (value: number, currency = 'LKR') => {
  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
};

const formatViews = (viewsCount: number) => {
  if (!Number.isFinite(viewsCount) || viewsCount < 0) return '0';
  if (viewsCount >= 1000) return `${(viewsCount / 1000).toFixed(1)}K`;
  return String(viewsCount);
};

const getConditionLabel = (condition: IProductListing['condition']) => {
  if (condition === 'NEW') return 'NEW';
  return 'USED';
};

const getServicePriceLabel = (service: IServiceSelling) => {
  const base = formatCurrency(service.price);
  return service.pricingType === 'HOURLY' ? `${base}/hr` : base;
};

const HomePage: React.FC = () => {
  const { categories, productCategories, serviceCategories, fetchCategories } = useCategoryStore();
  const { searchQuery, setSearchQuery } = useUIStore();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  // feature-review state
  const [websiteReviews, setWebsiteReviews] = useState<IWebsiteReview[]>([]);
  const [websiteSort, setWebsiteSort] = useState<ReviewSort>('latest');
  const [websiteSummary, setWebsiteSummary] = useState<IReviewSummary>({
    averageRating: 0,
    reviewCount: 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [myWebsiteReview, setMyWebsiteReview] = useState<IWebsiteReview | null>(null);
  const [websiteReviewModalOpen, setWebsiteReviewModalOpen] = useState(false);
  const [websiteSubmitting, setWebsiteSubmitting] = useState(false);
  const [votedReviewIds, setVotedReviewIds] = useState<Record<string, boolean>>({});

  // dev state
  const [trendingListings, setTrendingListings] = useState<IProductListing[]>([]);
  const [premiumServices, setPremiumServices] = useState<IServiceSelling[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState(true);
  const [isServicesLoading, setIsServicesLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length === 0) fetchCategories();
  }, [categories.length, fetchCategories]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  const loadWebsiteReviews = React.useCallback(async () => {
    try {
      const [listRes, summaryRes] = await Promise.all([
        websiteReviewsApi.list({ sortBy: websiteSort, limit: 6 }),
        websiteReviewsApi.getSummary(),
      ]);

      setWebsiteReviews(listRes.data.data || []);
      setWebsiteSummary(summaryRes.data.data || {
        averageRating: 0,
        reviewCount: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      if (isAuthenticated) {
        const myRes = await websiteReviewsApi.getMine();
        setMyWebsiteReview(myRes.data.data || null);
      } else {
        setMyWebsiteReview(null);
      }
    } catch {
      setWebsiteReviews([]);
    }
  }, [isAuthenticated, websiteSort]);

  useEffect(() => {
    void loadWebsiteReviews();
  }, [loadWebsiteReviews]);

  useEffect(() => {
    const fetchTrendingListings = async () => {
      setIsListingsLoading(true);
      setListingsError(null);

      try {
        const { data } = await listingsApi.getAll({ page: 1, limit: 4 });
        setTrendingListings(data.data || []);
      } catch {
        setListingsError('Unable to load listings right now.');
      } finally {
        setIsListingsLoading(false);
      }
    };

    const fetchPremiumServices = async () => {
      setIsServicesLoading(true);
      setServicesError(null);

      try {
        const { data } = await servicesApi.getAll({ page: 1, limit: 3 });
        const activeServices = (data.data || []).filter(
          (service) => service.status === 'ACTIVE' && service.isActive !== false
        );
        setPremiumServices(activeServices.slice(0, 3));
      } catch {
        setServicesError('Unable to load services right now.');
      } finally {
        setIsServicesLoading(false);
      }
    };

    void Promise.all([fetchTrendingListings(), fetchPremiumServices()]);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleWebsiteReviewSubmit = async (payload: { rating: number; title?: string; content: string }) => {
    if (!isAuthenticated) {
      toast.error('Please log in to leave a website review');
      return;
    }

    setWebsiteSubmitting(true);
    try {
      if (myWebsiteReview?._id) {
        await websiteReviewsApi.update(myWebsiteReview._id, payload);
        toast.success('Website review updated');
      } else {
        await websiteReviewsApi.create(payload);
        toast.success('Website review published');
      }
      setWebsiteReviewModalOpen(false);
      await loadWebsiteReviews();
    } finally {
      setWebsiteSubmitting(false);
    }
  };

  const handleWebsiteReviewDelete = async () => {
    if (!myWebsiteReview?._id) return;

    try {
      await websiteReviewsApi.delete(myWebsiteReview._id);
      toast.success('Website review deleted');
      await loadWebsiteReviews();
    } catch {
      // handled globally
    }
  };

  const handleWebsiteHelpfulVote = async (review: IWebsiteReview) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote as helpful');
      return;
    }

    try {
      const { data } = await websiteReviewsApi.voteHelpful(review._id);
      const voted = data.data?.voted;
      const helpfulCount = data.data?.helpfulCount ?? review.helpfulCount ?? 0;

      setVotedReviewIds((prev) => ({ ...prev, [review._id]: voted }));
      setWebsiteReviews((prev) =>
        prev.map((item) => (item._id === review._id ? { ...item, helpfulCount } : item))
      );
    } catch {
      // handled globally
    }
  };

  return (
    <div className="overflow-hidden bg-[#f8fafc]">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Slider */}
        <div className="absolute inset-0 z-0 bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeHeroIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.6, scale: 1 }}
              exit={{ opacity: 0, zIndex: -1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroSlides[activeHeroIndex].image})` }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[10%] bg-gradient-to-t from-slate-950/30 to-transparent z-10 pointer-events-none" />
          
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary-600/30 blur-[120px] rounded-full animate-pulse-slow mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
        </div>

        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-0 py-10 lg:py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} className="mb-4 inline-block">
               <motion.div 
                 className="relative group cursor-default"
                 whileHover={{ scale: 1.05 }}
               >
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-accent-400 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500"></div>
                 <div className="relative flex items-center gap-2 px-5 py-2 bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 text-white shadow-xl">
                   <FiZap className="h-4 w-4 text-accent-400" />
                   <span className="text-sm font-semibold tracking-wide">
                     {heroSlides[activeHeroIndex].badge}
                   </span>
                 </div>
               </motion.div>
            </motion.div>

            <motion.h1
               key={`title-${activeHeroIndex}`}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, ease: "easeOut" }}
               className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-3 sm:mb-5 drop-shadow-2xl"
            >
              {heroSlides[activeHeroIndex].title.split('.')[0]}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-indigo-300 to-accent-300">.</span>
            </motion.h1>

            <motion.p 
               key={`sub-${activeHeroIndex}`}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 1, delay: 0.2 }}
               className="text-base sm:text-lg lg:text-xl text-slate-300 mb-5 sm:mb-8 max-w-2xl leading-relaxed font-medium drop-shadow-md"
            >
              {heroSlides[activeHeroIndex].subtitle}
            </motion.p>

            <motion.form
              variants={fadeUp}
              onSubmit={handleSearch}
              className="relative group max-w-2xl flex flex-col sm:flex-row gap-3 p-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl hover:bg-white/15 transition-all duration-300"
            >
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-5 p-2 bg-white/10 rounded-full">
                  <FiSearch className="h-5 w-5 text-white" />
                </div>
                <input
                  type="text"
                  placeholder="What are you looking for today?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-6 py-4 bg-transparent text-white placeholder:text-slate-300/80 text-lg focus:outline-none font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-lg hover:bg-slate-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 m-1"
              >
                Search <FiArrowRight className="h-5 w-5" />
              </button>
            </motion.form>

            <motion.div variants={fadeUp} className="mt-6 sm:mt-8 flex items-center gap-3">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveHeroIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    activeHeroIndex === index ? 'w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-3 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Show hero slide ${index + 1}`}
                />
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-6 sm:gap-10">
              <StatItem value="10K+" label="Active Listings" delay={0.1} />
              <div className="h-10 w-px bg-white/20 hidden sm:block"></div>
              <StatItem value="5K+" label="Verified Sellers" delay={0.2} />
              <div className="h-10 w-px bg-white/20 hidden sm:block"></div>
              <StatItem value="50+" label="Supported Cities" delay={0.3} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== CATEGORIES SECTION ===== */}
      <section className="py-24 relative z-20 -mt-10 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="flex flex-col items-center mb-16"
          >
            <motion.div variants={fadeUp} className="inline-block px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-bold tracking-wide mb-4">
              DISCOVER
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 text-center tracking-tight">
              Explore by <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">Category</span>
            </motion.h2>

            <motion.div variants={fadeUp} className="flex p-1.5 bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'products'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <FiPackage className="h-5 w-5" /> Products
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'services'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <FiTool className="h-5 w-5" /> Services
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            key={activeTab}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
          >
            {(activeTab === 'products' ? productCategories : serviceCategories).length > 0 ? (
              (activeTab === 'products' ? productCategories : serviceCategories).slice(0, 12).map((category, index) => (
                <motion.div key={category._id} variants={scaleIn} whileHover={{ y: -8 }}>
                  <Link to={`/${activeTab === 'products' ? 'listings' : 'services'}?category=${category._id}`} className="block h-full">
                    <div className="h-full bg-white rounded-3xl p-6 text-center border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(124,58,237,0.1)] hover:border-primary-100 transition-all duration-300 group flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                        <CategoryIcon index={index} active={false} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700 group-hover:text-primary-600 transition-colors">
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              placeholderCategories.map((cat, index) => (
                <motion.div key={cat} variants={scaleIn} whileHover={{ y: -8 }}>
                  <div className="h-full bg-white/80 backdrop-blur-sm rounded-3xl p-6 text-center border border-slate-100 shadow-sm transition-all duration-300 group">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CategoryIcon index={index} active={false} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-600 group-hover:text-primary-600">{cat}</h3>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS - BENTO GRID ===== */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
             <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                  Seamless <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-orange-400">Experience</span>
                </h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
                  We've streamlined the process. Three elegant steps to buy, sell, or book in your community.
                </p>
             </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid lg:grid-cols-3 gap-8"
          >
            {howItWorksSteps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className={`relative z-10 ${i === 1 ? 'lg:translate-y-8' : ''}`}>
                <div className="h-full bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] transition-all duration-500 overflow-hidden group">
                   <div className={`absolute -top-24 -right-24 w-48 h-48 ${step.colorCode} rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0`}></div>
                   
                   <div className="relative z-10">
                     <div className="flex items-center justify-between mb-8">
                       <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                         {step.icon}
                       </div>
                       <span className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b ${step.textGradient} opacity-20 group-hover:opacity-40 transition-opacity`}>0{i + 1}</span>
                     </div>
                     <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">{step.title}</h3>
                     <p className="text-slate-500 leading-relaxed font-medium">{step.description}</p>
                   </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURED SECTION ===== */}
      <section className="py-24 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-xs font-bold mb-3">
                <FiTrendingUp className="h-3 w-3" /> HOT RIGHT NOW
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                Trending <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400">Listings</span>
              </h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Link
                to="/listings"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-800 font-bold border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-95 group"
              >
                View Directory <FiArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {isListingsLoading && (
              <div className="col-span-full text-center py-10 text-slate-500 font-medium">Loading listings...</div>
            )}

            {!isListingsLoading && listingsError && (
              <div className="col-span-full text-center py-10 text-rose-500 font-semibold">{listingsError}</div>
            )}

            {!isListingsLoading && !listingsError && trendingListings.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500 font-medium">No listings available yet.</div>
            )}

            {!isListingsLoading && !listingsError && trendingListings.map((listing) => (
              <motion.div key={listing._id} variants={fadeUp} whileHover={{ y: -10 }}>
                <Card className="h-full bg-white rounded-3xl overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 group">
                  <div className="relative">
                    <div className="h-56 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center transition-colors duration-500">
                      {listing.images?.[0] ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <motion.div whileHover={{ scale: 1.1 }}>
                          <FiPackage className="h-20 w-20 text-slate-300 drop-shadow-xl" />
                        </motion.div>
                      )}
                    </div>
                    <div className="absolute top-4 left-4">
                      <div className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-md text-white shadow-sm ${listing.condition === 'NEW' ? 'bg-emerald-500/90' : 'bg-slate-800/90'}`}>
                        {getConditionLabel(listing.condition)}
                      </div>
                    </div>
                    <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white shadow-sm transition-all active:scale-90">
                      <FiHeart className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                      <FiMapPin className="h-3.5 w-3.5 text-primary-500" />
                      {listing.location?.city || 'Sri Lanka'}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">
                      {listing.title}
                    </h3>
                    <div className="flex items-end justify-between mt-auto">
                      <div>
                        <p className="text-xs text-slate-400 mb-1 font-medium">Asking Price</p>
                        <span className="text-xl font-black text-slate-900">{formatCurrency(listing.price, listing.currency)}</span>
                      </div>
                      <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <FiEye className="h-3 w-3" /> {formatViews(listing.viewsCount)}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== SERVICES SHOWCASE ===== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold mb-3">
                <FiStar className="h-3 w-3" /> TOP RATED
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Services</span>
              </h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Link
                 to="/services"
                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-800 font-bold border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-95 group"
              >
                 Browse Providers <FiArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {isServicesLoading && (
              <div className="col-span-full text-center py-10 text-slate-500 font-medium">Loading services...</div>
            )}

            {!isServicesLoading && servicesError && (
              <div className="col-span-full text-center py-10 text-rose-500 font-semibold">{servicesError}</div>
            )}

            {!isServicesLoading && !servicesError && premiumServices.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500 font-medium">No services available yet.</div>
            )}

            {!isServicesLoading && !servicesError && premiumServices.map((service) => (
              <motion.div key={service._id} variants={fadeUp} whileHover={{ y: -6 }}>
                <div className="h-full bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)] hover:border-emerald-100 transition-all duration-300 group">
                  <div className="mb-6 h-40 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
                    {service.images?.[0] ? (
                      <img
                        src={service.images[0]}
                        alt={service.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : service.pricingType === 'HOURLY' ? (
                      <FiZap className="h-12 w-12 text-amber-500" />
                    ) : (
                      <FiTool className="h-12 w-12 text-indigo-500" />
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-16 h-16 rounded-2xl ${service.pricingType === 'HOURLY' ? 'bg-amber-100' : 'bg-indigo-100'} flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm`}>
                      {service.pricingType === 'HOURLY' ? (
                        <FiZap className="h-8 w-8 text-amber-600" />
                      ) : (
                        <FiTool className="h-8 w-8 text-indigo-600" />
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${service.pricingType === 'HOURLY' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {service.pricingType}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                    {service.location?.city || service.locationText}
                  </p>
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">Starting at</p>
                      <span className="text-2xl font-black text-slate-900">{getServicePriceLabel(service)}</span>
                    </div>
                    <button className="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
                      <FiArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== PLATFORM REVIEWS ===== */}
      <section className="py-24 bg-[#f1f5f9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                <FiUsers className="h-3 w-3" /> COMMUNITY FEEDBACK
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                What Users Say About the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Marketplace</span>
              </h2>
              <p className="mt-3 text-slate-600">
                These are platform-level reviews about overall trust, speed, support, and experience.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={websiteSort}
                onChange={(e) => setWebsiteSort(e.target.value as ReviewSort)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
              >
                <option value="latest">Latest</option>
                <option value="helpful">Most Helpful</option>
                <option value="ratingHigh">Highest Rating</option>
                <option value="ratingLow">Lowest Rating</option>
              </select>
              {isAuthenticated ? (
                <Button type="button" size="sm" onClick={() => setWebsiteReviewModalOpen(true)}>
                  {myWebsiteReview ? 'Edit My Review' : 'Write a Review'}
                </Button>
              ) : (
                <Link
                  to="/login"
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Login to Review
                </Link>
              )}
              {myWebsiteReview ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void handleWebsiteReviewDelete()}>
                  Delete My Review
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_2fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Community Rating</p>
              <div className="mt-3 flex items-center gap-3">
                <p className="text-5xl font-black text-slate-900">{websiteSummary.averageRating.toFixed(1)}</p>
                <div>
                  <StarRating rating={websiteSummary.averageRating} size="md" />
                  <p className="mt-1 text-sm text-slate-500">{websiteSummary.reviewCount} review{websiteSummary.reviewCount === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = websiteSummary.ratingBreakdown?.[star] || 0;
                  const max = Math.max(1, ...Object.values(websiteSummary.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }));
                  const width = Math.max(0, Math.min(100, (count / max) * 100));
                  return (
                    <div key={star} className="flex items-center gap-3 text-sm">
                      <span className="w-4 text-slate-600">{star}</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-amber-400" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-8 text-right text-slate-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {websiteReviews.length > 0 ? (
                websiteReviews.map((review) => {
                  const reviewerName = typeof review.reviewerId === 'string' ? 'User' : review.reviewerId?.name || 'User';
                  const canVote = isAuthenticated && user?._id && (typeof review.reviewerId !== 'string' ? review.reviewerId?._id !== user._id : true);
                  const isVoted = !!votedReviewIds[review._id];

                  return (
                    <div key={review._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">{reviewerName}</p>
                        <span className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <StarRating rating={review.rating} size="sm" />
                      {review.title ? <p className="mt-3 text-sm font-semibold text-slate-900">{review.title}</p> : null}
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-4">{review.content}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={!canVote}
                          onClick={() => void handleWebsiteHelpfulVote(review)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            isVoted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          Helpful ({review.helpfulCount || 0})
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-500">
                  No website reviews yet. Be the first to share your experience.
                </div>
              )}
            </div>
          </div>
        </div>

        <ReviewModal
          isOpen={websiteReviewModalOpen}
          onClose={() => setWebsiteReviewModalOpen(false)}
          onSubmit={handleWebsiteReviewSubmit}
          initialValue={
            myWebsiteReview
              ? {
                  rating: myWebsiteReview.rating,
                  title: myWebsiteReview.title || '',
                  content: myWebsiteReview.content,
                }
              : undefined
          }
          isSubmitting={websiteSubmitting}
          mode={myWebsiteReview ? 'edit' : 'create'}
        />
      </section>

      {/* ===== IMMERSIVE CTA SECTION ===== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900 z-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          <motion.div variants={floatAnim} initial="hidden" animate="visible" className="absolute -top-[30%] -right-[10%] w-[700px] h-[700px] bg-primary-600/40 rounded-full blur-[120px]" />
          <motion.div variants={floatAnim} initial="hidden" animate="visible" style={{ animationDelay: '2s' }} className="absolute -bottom-[30%] -left-[10%] w-[600px] h-[600px] bg-indigo-600/40 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center bg-white/5 backdrop-blur-2xl rounded-[3rem] p-12 sm:p-20 border border-white/10 shadow-2xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
              Ready to Expand Your <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 via-primary-300 to-indigo-300 drop-shadow-lg">
                Local Presence?
              </span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Join the fastest growing hyper-local marketplace. List your first product or service today for absolutely free.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to="/register"
                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Sign Up Now <FiArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/listings"
                className="w-full sm:w-auto px-10 py-5 bg-white/10 text-white rounded-2xl font-bold text-lg border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Explore Marketplace
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <section className="py-12 bg-slate-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/10">
            {trustItems.map((item, i) => (
              <div key={i} className="text-center px-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center text-primary-400 border border-white/10">
                  {item.icon}
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight mb-1">{item.value}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Helper components & Data

const StatItem: React.FC<{ value: string; label: string; delay?: number }> = ({ value, label, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className="flex flex-col"
  >
    <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-md tracking-tight">{value}</span>
    <span className="text-sm sm:text-base font-bold text-primary-200 mt-1 uppercase tracking-wider">{label}</span>
  </motion.div>
);

const iconMap = [
  { icon: FiPackage, color: 'text-indigo-500' },
  { icon: FiTool, color: 'text-emerald-500' },
  { icon: FiStar, color: 'text-amber-500' },
  { icon: FiUsers, color: 'text-blue-500' },
  { icon: FiShield, color: 'text-violet-500' },
  { icon: FiTrendingUp, color: 'text-rose-500' },
  { icon: FiZap, color: 'text-orange-500' },
  { icon: FiHeart, color: 'text-pink-500' },
];

const CategoryIcon: React.FC<{ index: number; active?: boolean }> = ({ index }) => {
  const IconProps = iconMap[index % iconMap.length];
  const IconComponent = IconProps.icon;
  return <IconComponent className={`h-7 w-7 ${IconProps.color} drop-shadow-sm`} />;
};

const placeholderCategories = [
  'Electronics', 'Vehicles', 'Real Estate', 'Fashion', 'Tutors', 'Repairs'
];

const howItWorksSteps = [
  {
    icon: <FiSearch className="h-7 w-7 text-indigo-500" />,
    title: 'Search Local',
    description: 'Find instantly what you need using our powerful location-based matching engine.',
    colorCode: 'bg-indigo-500/10',
    textGradient: 'from-slate-200 to-slate-50'
  },
  {
    icon: <FiCheckCircle className="h-7 w-7 text-emerald-500" />,
    title: 'Match & Verify',
    description: 'Review verified seller profiles, detailed ratings, and transparent pricing.',
    colorCode: 'bg-emerald-500/10',
    textGradient: 'from-slate-200 to-slate-50'
  },
  {
    icon: <FiCreditCard className="h-7 w-7 text-rose-500" />,
    title: 'Secure Exchange',
    description: 'Transact with total confidence using our escrow-protected payment gateway.',
    colorCode: 'bg-rose-500/10',
    textGradient: 'from-slate-200 to-slate-50'
  },
];

const trustItems = [
  { icon: <FiPackage className="h-5 w-5" />, value: '25K+', label: 'Listings' },
  { icon: <FiUsers className="h-5 w-5" />, value: '12K+', label: 'Members' },
  { icon: <FiMapPin className="h-5 w-5" />, value: '150+', label: 'Locations' },
  { icon: <FiShield className="h-5 w-5" />, value: '100%', label: 'Secure' },
];

export default HomePage;
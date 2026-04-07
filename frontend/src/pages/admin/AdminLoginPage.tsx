import React from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiLock, FiMail, FiShield, FiArrowLeft, FiMonitor } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';

const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid admin email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

const AdminLoginPage: React.FC = () => {
  const { adminLogin, isLoading, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    try {
      await adminLogin(data);
      navigate('/admin', { replace: true });
    } catch {
      // Error toast handled by interceptors/store
    }
  };

  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">
      
      {/* ===== LEFT BRANDING PANEL (HIDDEN ON MOBILE) ===== */}
      <div className="hidden lg:flex relative w-1/2 bg-slate-950 pt-16 pb-12 px-12 flex-col justify-between overflow-hidden">
        {/* Abstract Glowing Background */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <motion.div 
          animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }} 
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] bg-primary-600/30 rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ y: [20, -20, 20], x: [10, -10, 10] }} 
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[100px]" 
        />
        
        {/* Top Branding */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center font-bold text-xl shadow-lg">B</div>
            <span className="text-2xl font-black tracking-tight">Bazaaro</span>
          </div>
        </motion.div>

        {/* Center Content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-primary-300 text-sm font-bold tracking-wide mb-6">
            <FiShield className="h-4 w-4" /> HIGHLY SECURE
          </div>
          <h1 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight drop-shadow-lg">
            Command Center <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-300">
              Access.
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed font-medium">
            Manage overall platform operations, oversee active marketplaces, review flagged users, and ensure secure transactions within Bazaaro's community.
          </p>
        </motion.div>

        {/* Bottom Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-10 flex items-center gap-4 border-t border-white/10 pt-6"
        >
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          <span className="text-sm font-bold text-slate-300 tracking-wider">SYSTEM ONLINE & SECURE</span>
        </motion.div>
      </div>

      {/* ===== RIGHT LOGIN PANEL ===== */}
      <div className="w-full lg:w-1/2 flex flex-col pt-8 pb-12 px-6 sm:px-12 xl:px-24 justify-center relative bg-slate-50 lg:bg-white">
        
        {/* Mobile Logo (Only visible on small screens) */}
        <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg">B</div>
           <span className="text-2xl font-black text-slate-900 tracking-tight">Bazaaro</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="max-w-md w-full mx-auto"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors mb-8 group">
            <FiArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
            Back to Marketplace
          </Link>

          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-6 shadow-xl shadow-slate-900/20">
              <FiMonitor className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Admin Portal</h2>
            <p className="text-slate-500 font-medium">Secure access requires administrative privileges.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white sm:p-8 sm:rounded-[2rem] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-slate-100">
            <Input
              label="Administrative Email"
              type="email"
              placeholder="admin@bazaaro.lk"
              leftIcon={<FiMail className="h-5 w-5 text-slate-400" />}
              error={errors.email?.message}
              {...register('email')}
              className="bg-slate-50 border-slate-200 focus:bg-white focus:border-primary-500"
            />
            <Input
              label="Master Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<FiLock className="h-5 w-5 text-slate-400" />}
              error={errors.password?.message}
              {...register('password')}
              className="bg-slate-50 border-slate-200 focus:bg-white focus:border-primary-500"
            />
            
            <div className="pt-2">
              <Button type="submit" fullWidth isLoading={isLoading} className="h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all">
                Authenticate
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-slate-500">
            Looking for regular user access?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-bold underline decoration-primary-600/30 underline-offset-4">
              Go to public login
            </Link>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default AdminLoginPage;

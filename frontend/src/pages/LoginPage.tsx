import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Button, Input } from '@/components/ui';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login, socialLogin, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const navigateAfterAuth = () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser && !currentUser.isProfileComplete) {
      toast('Please complete your profile to continue.');
      navigate('/dashboard/profile', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      navigateAfterAuth();
    } catch {
      // Error handled by store/interceptor
    }
  };

  const onGoogleLogin = async (idToken: string) => {
    await socialLogin(idToken);
    navigateAfterAuth();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold gradient-text">Bazaaro</span>
          </Link>

          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome back</h1>
          <p className="text-slate-500 mb-8">
            Sign in to your account to continue buying and selling locally.
          </p>

          {/* Google Sign In */}
          <div className="mb-6">
            <GoogleSignInButton onCredential={onGoogleLogin} text="signin_with" />
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-4 text-sm text-slate-400">or sign in with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<FiMail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                leftIcon={<FiLock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-primary-600 transition-colors"
                  >
                    {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end mt-2">
                <Link
                  to="#"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              fullWidth
              size="lg"
              rightIcon={<FiArrowRight className="h-4 w-4" />}
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Join Bazaaro
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right panel — Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-hero relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative text-center px-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="w-20 h-20 mx-auto mb-8 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/10">
              <span className="text-4xl font-bold text-white">B</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Your Local Marketplace
            </h2>
            <p className="text-slate-300 text-lg max-w-sm mx-auto leading-relaxed">
              Buy, sell, and book services in your neighborhood. It's fast, secure, and free to get started.
            </p>

            {/* Floating testimonial */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-12 inline-block"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-left max-w-xs">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-accent-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed mb-3">
                  "Bazaaro helped me find amazing deals in my area. Sold my old furniture within a day!"
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                    KP
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Kasun P.</p>
                    <p className="text-[11px] text-slate-400">Colombo</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

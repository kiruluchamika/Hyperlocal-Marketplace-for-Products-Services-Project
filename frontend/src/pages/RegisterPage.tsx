import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiArrowLeft,
  FiUser,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiCheck,
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuthStore } from '@/store/authStore';
import { Button, Input } from '@/components/ui';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  phone: z.string().min(9, 'Please enter a valid phone number'),
  age: z.number().min(18, 'Must be at least 18').max(120, 'Invalid age'),
  city: z.string().min(2, 'City is required'),
  street: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      age: undefined,
      city: '',
      street: '',
    },
  });

  const goToNextStep = async () => {
    const fieldsToValidate: (keyof RegisterFormData)[] =
      step === 1
        ? ['name', 'email', 'password', 'confirmPassword']
        : ['phone', 'age', 'city'];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        age: data.age,
        address: {
          city: data.city,
          street: data.street || undefined,
          country: 'Sri Lanka',
        },
      });
      navigate('/');
    } catch {
      // Error handled by store/interceptor
    }
  };

  const steps = [
    { number: 1, title: 'Account' },
    { number: 2, title: 'Personal' },
    { number: 3, title: 'Review' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Decorative */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-hero relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-32 left-10 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-32 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
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
            transition={{ duration: 0.8 }}
          >
            <div className="w-20 h-20 mx-auto mb-8 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/10">
              <span className="text-4xl font-bold text-white">B</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Join the Community
            </h2>
            <p className="text-slate-300 text-lg max-w-sm mx-auto leading-relaxed mb-12">
              Create your free account and start buying, selling, and booking services in your local area.
            </p>

            {/* Benefits */}
            <div className="space-y-4 text-left max-w-xs mx-auto">
              {[
                'Free to list products & services',
                'Secure escrow payment system',
                'Connect with local buyers & sellers',
                'Real-time notifications',
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-400/20 flex items-center justify-center flex-shrink-0">
                    <FiCheck className="h-3.5 w-3.5 text-accent-400" />
                  </div>
                  <span className="text-sm text-slate-200">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold gradient-text">Bazaaro</span>
          </Link>

          <h1 className="text-3xl font-bold text-slate-800 mb-2">Create your account</h1>
          <p className="text-slate-500 mb-8">
            Start your journey on Sri Lanka's #1 local marketplace.
          </p>

          {/* Step Indicator */}
          <div className="flex items-center gap-3 mb-8">
            {steps.map((s, i) => (
              <React.Fragment key={s.number}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step >= s.number
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step > s.number ? <FiCheck className="h-4 w-4" /> : s.number}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      step >= s.number ? 'text-primary-600' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all ${
                      step > s.number ? 'bg-primary-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Google Sign Up (only on step 1) */}
          {step === 1 && (
            <>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5
                           bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold
                           text-slate-700 hover:bg-slate-50 hover:border-slate-300
                           transition-all duration-200 mb-6"
              >
                <FcGoogle className="h-5 w-5" />
                Sign up with Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-50 px-4 text-sm text-slate-400">or register with email</span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {/* Step 1: Account Details */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    leftIcon={<FiUser className="h-4 w-4" />}
                    error={errors.name?.message}
                    {...register('name')}
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    leftIcon={<FiMail className="h-4 w-4" />}
                    error={errors.email?.message}
                    {...register('email')}
                  />

                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
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

                  <Input
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    leftIcon={<FiLock className="h-4 w-4" />}
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />

                  <Button
                    type="button"
                    onClick={goToNextStep}
                    fullWidth
                    size="lg"
                    rightIcon={<FiArrowRight className="h-4 w-4" />}
                  >
                    Continue
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Personal Details */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+94 7X XXX XXXX"
                    leftIcon={<FiPhone className="h-4 w-4" />}
                    error={errors.phone?.message}
                    {...register('phone')}
                  />

                  <Input
                    label="Age"
                    type="number"
                    placeholder="Your age"
                    leftIcon={<FiCalendar className="h-4 w-4" />}
                    error={errors.age?.message}
                    {...register('age', { valueAsNumber: true })}
                  />

                  <Input
                    label="City"
                    type="text"
                    placeholder="e.g., Colombo"
                    leftIcon={<FiMapPin className="h-4 w-4" />}
                    error={errors.city?.message}
                    {...register('city')}
                  />

                  <Input
                    label="Street Address (Optional)"
                    type="text"
                    placeholder="e.g., 123 Main Street"
                    leftIcon={<FiMapPin className="h-4 w-4" />}
                    error={errors.street?.message}
                    {...register('street')}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      size="lg"
                      leftIcon={<FiArrowLeft className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={goToNextStep}
                      size="lg"
                      rightIcon={<FiArrowRight className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review & Submit */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="bg-primary-50/50 rounded-2xl p-6 border border-primary-100">
                    <h3 className="text-sm font-semibold text-primary-700 mb-4">Review Your Details</h3>
                    <div className="space-y-3">
                      <ReviewItem label="Name" icon={<FiUser />} />
                      <ReviewItem label="Email" icon={<FiMail />} />
                      <ReviewItem label="Phone" icon={<FiPhone />} />
                      <ReviewItem label="City" icon={<FiMapPin />} />
                    </div>
                    <p className="text-xs text-slate-400 mt-4">
                      You can update these details in your profile settings after signing up.
                    </p>
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-500">
                      By creating an account, you agree to Bazaaro's{' '}
                      <Link to="#" className="text-primary-600 hover:underline">Terms of Service</Link>{' '}
                      and{' '}
                      <Link to="#" className="text-primary-600 hover:underline">Privacy Policy</Link>.
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      size="lg"
                      leftIcon={<FiArrowLeft className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isLoading}
                      size="lg"
                      rightIcon={<FiCheck className="h-4 w-4" />}
                      className="flex-1"
                    >
                      Create Account
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const ReviewItem: React.FC<{ label: string; icon: React.ReactNode }> = ({
  label,
  icon,
}) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
      {icon}
    </div>
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700">Provided ✓</p>
    </div>
  </div>
);

export default RegisterPage;

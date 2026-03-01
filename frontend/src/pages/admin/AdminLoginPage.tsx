import React from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiLock, FiMail, FiShield } from 'react-icons/fi';
import { Button, Card, Input } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

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
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-md">
        <Card hover={false} className="p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
              <FiShield className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to access the administration panel.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Admin Email"
              type="email"
              leftIcon={<FiMail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              leftIcon={<FiLock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth isLoading={isLoading}>
              Sign In as Admin
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            Looking for customer login?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Go to user login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminLoginPage;

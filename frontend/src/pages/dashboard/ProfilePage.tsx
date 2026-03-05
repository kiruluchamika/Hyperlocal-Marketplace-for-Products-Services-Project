import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiCheckCircle, FiClock, FiShield, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Avatar, Badge, Button, Card, Input, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { usersApi, UpdateProfilePayload } from '@/api/users';
import apiClient from '@/api/client';
import { KycStatus } from '@/types';

const optionalProfileImage = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === '' ||
      /^https?:\/\/.+/i.test(value) ||
      /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(value),
    'Invalid image format'
  )
  .optional();

const MAX_PROFILE_IMAGE_MB = 3;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  age: z.number().min(18, 'Must be at least 18').max(120, 'Invalid age'),
  profileImage: optionalProfileImage,
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  street: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  businessName: z.string().optional(),
  serviceArea: z.string().optional(),
  sellerDescription: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  marketingEmails: z.boolean()
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password')
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const kycBadgeVariant: Record<KycStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  UNSUBMITTED: 'neutral',
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger'
};

const ProfilePage: React.FC = () => {
  const { user, setUser, fetchUser } = useAuthStore();
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [serviceStats, setServiceStats] = useState({
    myServices: 0,
    activeServices: 0,
    providerBookings: 0,
    buyerBookings: 0
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      age: 18,
      profileImage: '',
      bio: '',
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Sri Lanka',
      businessName: '',
      serviceArea: '',
      sellerDescription: '',
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (!user) {
          await fetchUser();
        }
      } finally {
        setIsBootLoading(false);
      }
    };

    void bootstrap();
  }, [fetchUser, user]);

  useEffect(() => {
    if (!user) return;
    reset({
      name: user.name,
      phone: user.phone,
      age: user.age,
      profileImage: user.profileImage || '',
      bio: user.bio || '',
      street: user.address?.street || '',
      city: user.address?.city || '',
      province: user.address?.province || '',
      postalCode: user.address?.postalCode || '',
      country: user.address?.country || 'Sri Lanka',
      businessName: user.sellerProfile?.businessName || '',
      serviceArea: user.sellerProfile?.serviceArea || '',
      sellerDescription: user.sellerProfile?.description || '',
      emailNotifications: user.preferences?.emailNotifications ?? true,
      pushNotifications: user.preferences?.pushNotifications ?? true,
      marketingEmails: user.preferences?.marketingEmails ?? false
    });
  }, [reset, user]);

  const profileImageValue = watch('profileImage');

  const handlePickImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, or WEBP image');
      event.target.value = '';
      return;
    }

    const maxBytes = MAX_PROFILE_IMAGE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Image must be ${MAX_PROFILE_IMAGE_MB}MB or smaller`);
      event.target.value = '';
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

    setIsUpdatingPhoto(true);
    try {
      const { data: response } = await usersApi.updateProfile({ profileImage: base64 });
      setUser(response.user);
      setValue('profileImage', response.user.profileImage || '', { shouldValidate: true, shouldDirty: true });
      toast.success('Profile picture updated');
    } finally {
      setIsUpdatingPhoto(false);
      event.target.value = '';
    }
  };

  const handleRemovePicture = async () => {
    setIsUpdatingPhoto(true);
    try {
      const { data: response } = await usersApi.updateProfile({ profileImage: null });
      setUser(response.user);
      setValue('profileImage', '', { shouldValidate: true, shouldDirty: true });
      toast.success('Profile picture removed');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      if (!user) {
        setStatsLoading(false);
        return;
      }

      try {
        const [servicesRes, providerRes, buyerRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: Array<{ status: string }> }>('/serviceselling/me'),
          apiClient.get<{ success: boolean; data: Array<unknown> }>('/servicebookings/provider/me'),
          apiClient.get<{ success: boolean; data: Array<unknown> }>('/servicebookings/me')
        ]);

        const myServices = servicesRes.data.data || [];
        setServiceStats({
          myServices: myServices.length,
          activeServices: myServices.filter((service) => service.status === 'ACTIVE').length,
          providerBookings: (providerRes.data.data || []).length,
          buyerBookings: (buyerRes.data.data || []).length
        });
      } catch {
        setServiceStats({ myServices: 0, activeServices: 0, providerBookings: 0, buyerBookings: 0 });
      } finally {
        setStatsLoading(false);
      }
    };

    void loadStats();
  }, [user]);

  const onProfileSave = async (data: ProfileFormData) => {
    setIsSavingProfile(true);
    try {
      const payload: UpdateProfilePayload = {
        name: data.name,
        phone: data.phone,
        age: data.age,
        profileImage: data.profileImage === '' ? null : data.profileImage,
        bio: data.bio || undefined,
        address: {
          street: data.street || undefined,
          city: data.city,
          province: data.province || undefined,
          postalCode: data.postalCode || undefined,
          country: data.country
        },
        sellerProfile: {
          businessName: data.businessName || undefined,
          serviceArea: data.serviceArea || undefined,
          description: data.sellerDescription || undefined
        },
        preferences: {
          emailNotifications: data.emailNotifications,
          pushNotifications: data.pushNotifications,
          marketingEmails: data.marketingEmails
        }
      };

      const { data: response } = await usersApi.updateProfile(payload);
      setUser(response.user);
      toast.success('Profile updated successfully');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onPasswordChange = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await usersApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      resetPassword();
      toast.success('Password changed successfully');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isBootLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-slate-500">Unable to load profile details.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account details, preferences, and security.</p>
      </div>

      <Card hover={false} className="p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={profileImageValue || user.profileImage} size="xl" />
          <div>
            <p className="text-xl font-semibold text-slate-800">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="info" size="sm">{user.role.toUpperCase()}</Badge>
              <Badge variant={user.emailVerified ? 'success' : 'warning'} size="sm">
                {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onProfileSave)} className="space-y-6">
        <Card hover={false} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Profile Picture</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleImageSelected}
          />
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Avatar name={user.name} src={profileImageValue || user.profileImage} size="xl" />
            <div className="flex-1 space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handlePickImageClick}
                  isLoading={isUpdatingPhoto}
                >
                  Choose Picture
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePicture}
                  isLoading={isUpdatingPhoto}
                >
                  Remove Picture
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Use a JPG, PNG, or WEBP image up to {MAX_PROFILE_IMAGE_MB}MB.
              </p>
              {errors.profileImage?.message && <p className="text-sm text-red-500">{errors.profileImage.message}</p>}
            </div>
          </div>
        </Card>

        <Card hover={false} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" error={errors.name?.message} {...register('name')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
            <Input label="Age" type="number" error={errors.age?.message} {...register('age', { valueAsNumber: true })} />
            <div className="md:col-span-2">
              <Input label="Street" error={errors.street?.message} {...register('street')} />
            </div>
            <Input label="City" error={errors.city?.message} {...register('city')} />
            <Input label="Province" error={errors.province?.message} {...register('province')} />
            <Input label="Postal Code" error={errors.postalCode?.message} {...register('postalCode')} />
            <Input label="Country" error={errors.country?.message} {...register('country')} />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                {...register('bio')}
              />
              {errors.bio?.message && <p className="mt-1.5 text-sm text-red-500">{errors.bio.message}</p>}
            </div>
          </div>
        </Card>

        <Card hover={false} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Seller / Provider Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Business Name" error={errors.businessName?.message} {...register('businessName')} />
            <Input label="Service Area" error={errors.serviceArea?.message} {...register('serviceArea')} />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Description</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                {...register('sellerDescription')}
              />
              {errors.sellerDescription?.message && (
                <p className="mt-1.5 text-sm text-red-500">{errors.sellerDescription.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="My Services" value={serviceStats.myServices} loading={statsLoading} />
            <StatBox label="Active Services" value={serviceStats.activeServices} loading={statsLoading} />
            <StatBox label="Provider Bookings" value={serviceStats.providerBookings} loading={statsLoading} />
            <StatBox label="My Bookings" value={serviceStats.buyerBookings} loading={statsLoading} />
          </div>
        </Card>

        <Card hover={false} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Preferences</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" {...register('emailNotifications')} />
              Email notifications
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" {...register('pushNotifications')} />
              Push notifications
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4" {...register('marketingEmails')} />
              Marketing emails
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSavingProfile}>Save Profile</Button>
        </div>
      </form>

      <Card hover={false} className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Verification & Profile Status</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={kycBadgeVariant[user.verification?.kycStatus || 'UNSUBMITTED']} size="sm">
            KYC: {user.verification?.kycStatus || 'UNSUBMITTED'}
          </Badge>
          <Badge variant={user.isProfileComplete ? 'success' : 'warning'} size="sm">
            {user.isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <StatusItem
            icon={<FiUser className="h-4 w-4" />}
            title="Profile"
            value={user.isProfileComplete ? 'Completed' : 'Needs updates'}
          />
          <StatusItem
            icon={<FiCheckCircle className="h-4 w-4" />}
            title="Email"
            value={user.emailVerified ? 'Verified' : 'Not verified'}
          />
          <StatusItem
            icon={<FiShield className="h-4 w-4" />}
            title="KYC"
            value={user.verification?.kycStatus || 'UNSUBMITTED'}
          />
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <FiClock className="h-3.5 w-3.5" />
          KYC status is currently read-only in profile. Contact support to submit or review KYC documents.
        </p>
      </Card>

      <Card hover={false} className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSubmit(onPasswordChange)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <Input
            label="Current Password"
            type="password"
            error={passwordErrors.currentPassword?.message}
            {...registerPassword('currentPassword')}
          />
          <Input
            label="New Password"
            type="password"
            error={passwordErrors.newPassword?.message}
            {...registerPassword('newPassword')}
          />
          <Input
            label="Confirm New Password"
            type="password"
            error={passwordErrors.confirmPassword?.message}
            {...registerPassword('confirmPassword')}
          />
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" variant="outline" isLoading={isChangingPassword}>Update Password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; loading: boolean }> = ({ label, value, loading }) => (
  <div className="rounded-xl border border-slate-200 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-lg font-semibold text-slate-800 mt-1">{loading ? '...' : value}</p>
  </div>
);

const StatusItem: React.FC<{ icon: React.ReactNode; title: string; value: string }> = ({ icon, title, value }) => (
  <div className="rounded-xl border border-slate-200 p-3">
    <p className="text-xs text-slate-500 flex items-center gap-1.5">{icon}{title}</p>
    <p className="text-sm font-medium text-slate-800 mt-1">{value}</p>
  </div>
);

export default ProfilePage;

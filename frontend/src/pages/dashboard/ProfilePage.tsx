
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiMapPin,
  FiSettings,
  FiShield,
  FiUser
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Avatar, Badge, Button, Card, Input, Spinner } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { usersApi, UpdateProfilePayload } from '@/api/users';
import apiClient from '@/api/client';
import { KycStatus, IUser } from '@/types';

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
type EditableSection = 'picture' | 'basic' | 'address' | 'bio' | 'seller' | 'preferences' | 'password';
type ProfileFieldName = keyof ProfileFormData;

const profileSectionFields: Record<Exclude<EditableSection, 'picture' | 'password'>, ProfileFieldName[]> = {
  basic: ['name', 'phone', 'age'],
  address: ['street', 'city', 'province', 'postalCode', 'country'],
  bio: ['bio'],
  seller: ['businessName', 'serviceArea', 'sellerDescription'],
  preferences: ['emailNotifications', 'pushNotifications', 'marketingEmails']
};

const kycBadgeVariant: Record<KycStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  UNSUBMITTED: 'neutral',
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger'
};

const getProfileDefaults = (user: IUser): ProfileFormData => ({
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

const ProfilePage: React.FC = () => {
  const { user, setUser, fetchUser } = useAuthStore();
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<EditableSection | null>(null);
  const [savingSection, setSavingSection] = useState<Exclude<EditableSection, 'picture' | 'password'> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [serviceStats, setServiceStats] = useState({
    myServices: 0,
    activeServices: 0,
    providerBookings: 0,
    buyerBookings: 0
  });

  const {
    register,
    reset,
    getValues,
    trigger,
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
    reset(getProfileDefaults(user));
  }, [reset, user]);

  const profileImageValue = watch('profileImage');
  const defaults = user ? getProfileDefaults(user) : null;

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
      reset(getProfileDefaults(response.user));
      setEditingSection(null);
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
      reset(getProfileDefaults(response.user));
      setEditingSection(null);
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

  const isSectionDirty = (section: EditableSection) => {
    if (!defaults) return false;
    if (section === 'picture' || section === 'password') return false;

    return profileSectionFields[section].some((field) => getValues(field) !== defaults[field]);
  };

  const resetProfileFormToUser = () => {
    if (!defaults) return;
    reset(defaults);
  };

  const closeActiveSection = () => {
    resetProfileFormToUser();
    resetPassword();
    setEditingSection(null);
  };

  const openSection = (nextSection: EditableSection) => {
    if (editingSection === nextSection) return;

    if (editingSection && isSectionDirty(editingSection)) {
      const shouldDiscard = window.confirm('You have unsaved changes in the current section. Discard them and continue?');
      if (!shouldDiscard) return;
      resetProfileFormToUser();
    }

    if (editingSection === 'password') {
      resetPassword();
    }

    setEditingSection(nextSection);
  };

  const saveSection = async (section: Exclude<EditableSection, 'picture' | 'password'>) => {
    const isValid = await trigger(profileSectionFields[section]);
    if (!isValid) return;

    const values = getValues();
    let payload: UpdateProfilePayload;

    switch (section) {
      case 'basic':
        payload = {
          name: values.name,
          phone: values.phone,
          age: values.age
        };
        break;
      case 'address':
        payload = {
          address: {
            street: values.street || undefined,
            city: values.city,
            province: values.province || undefined,
            postalCode: values.postalCode || undefined,
            country: values.country
          }
        };
        break;
      case 'bio':
        payload = {
          bio: values.bio || undefined
        };
        break;
      case 'seller':
        payload = {
          sellerProfile: {
            businessName: values.businessName || undefined,
            serviceArea: values.serviceArea || undefined,
            description: values.sellerDescription || undefined
          }
        };
        break;
      case 'preferences':
        payload = {
          preferences: {
            emailNotifications: values.emailNotifications,
            pushNotifications: values.pushNotifications,
            marketingEmails: values.marketingEmails
          }
        };
        break;
    }

    setSavingSection(section);
    try {
      const { data: response } = await usersApi.updateProfile(payload);
      setUser(response.user);
      reset(getProfileDefaults(response.user));
      setEditingSection(null);
      toast.success('Profile updated successfully');
    } finally {
      setSavingSection(null);
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
      setEditingSection(null);
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Account Settings</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Review your account details and update one section at a time.
        </p>
      </div>

      <Card hover={false} className="overflow-hidden border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-6 sm:px-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4 sm:gap-5">
              <Avatar
                name={user.name}
                src={profileImageValue || user.profileImage}
                size="xl"
                className="h-20 w-20 text-xl ring-4 ring-white shadow-sm"
              />
              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Profile Summary</p>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{user.name}</h2>
                  <p className="truncate text-sm text-slate-500 sm:text-base">{user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info" size="md" className="rounded-full px-3 py-1 font-semibold">
                    {user.role.toUpperCase()}
                  </Badge>
                  <Badge
                    variant={user.emailVerified ? 'success' : 'warning'}
                    size="md"
                    className="rounded-full px-3 py-1 font-semibold"
                  >
                    {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                <HeaderMetaCard
                  label="Profile"
                  value={user.isProfileComplete ? 'Complete' : 'Incomplete'}
                  tone={user.isProfileComplete ? 'success' : 'warning'}
                />
                <HeaderMetaCard
                  label="KYC"
                  value={user.verification?.kycStatus || 'UNSUBMITTED'}
                  tone={kycBadgeVariant[user.verification?.kycStatus || 'UNSUBMITTED']}
                />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 xl:grid-cols-4">
            <ReadonlyField label="Full Name" value={user.name} />
            <ReadonlyField label="Phone" value={user.phone} />
            <ReadonlyField label="Age" value={String(user.age)} />
            <ReadonlyField label="Address" value={formatAddress(user.address)} placeholder="Not provided" />
          </div>
        </div>
      </Card>

      <EditableCard
        title="Profile Picture"
        description="Keep your picture up to date for a polished profile."
        isEditing={editingSection === 'picture'}
        onEdit={() => openSection('picture')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleImageSelected}
        />

        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={user.name}
              src={profileImageValue || user.profileImage}
              size="xl"
              className="h-20 w-20 text-xl ring-4 ring-white"
            />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-900">Current photo</p>
              <p className="max-w-md text-sm leading-6 text-slate-500">
                {user.profileImage
                  ? `Use a JPG, PNG, or WEBP image up to ${MAX_PROFILE_IMAGE_MB}MB.`
                  : 'No profile picture uploaded yet.'}
              </p>
            </div>
          </div>

          {editingSection === 'picture' ? (
            <div className="space-y-3 md:text-right">
              <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handlePickImageClick}
                  isLoading={isUpdatingPhoto}
                  className="shadow-sm"
                >
                  Choose Picture
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePicture}
                  isLoading={isUpdatingPhoto}
                  className="border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100/80"
                >
                  Remove Picture
                </Button>
              </div>
              <p className="text-xs text-slate-400">Picture changes save immediately when you choose or remove an image.</p>
              {errors.profileImage?.message && <p className="text-sm text-red-500">{errors.profileImage.message}</p>}
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Upload or remove your profile image when needed.
            </div>
          )}
        </div>
      </EditableCard>

      <EditableCard
        title="Basic Information"
        description="Core profile details shown across your account."
        isEditing={editingSection === 'basic'}
        onEdit={() => openSection('basic')}
      >
        {editingSection === 'basic' ? (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Full Name"
                error={errors.name?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('name')}
              />
              <Input
                label="Phone"
                error={errors.phone?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('phone')}
              />
              <Input
                label="Age"
                type="number"
                error={errors.age?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm md:max-w-sm"
                {...register('age', { valueAsNumber: true })}
              />
            </div>
            <SectionFooterActions
              onCancel={closeActiveSection}
              onSave={() => void saveSection('basic')}
              isSaving={savingSection === 'basic'}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ReadonlyField label="Full Name" value={user.name} />
            <ReadonlyField label="Phone" value={user.phone} />
            <ReadonlyField label="Age" value={String(user.age)} />
          </div>
        )}
      </EditableCard>

      <EditableCard
        title="Address / Location"
        description="Location details used for your profile and local activity."
        icon={<FiMapPin className="h-4 w-4" />}
        isEditing={editingSection === 'address'}
        onEdit={() => openSection('address')}
      >
        {editingSection === 'address' ? (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Street"
                  error={errors.street?.message}
                  className="min-h-[3.25rem] border-slate-300 shadow-sm"
                  {...register('street')}
                />
              </div>
              <Input
                label="City"
                error={errors.city?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('city')}
              />
              <Input
                label="Province"
                error={errors.province?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('province')}
              />
              <Input
                label="Postal Code"
                error={errors.postalCode?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('postalCode')}
              />
              <Input
                label="Country"
                error={errors.country?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('country')}
              />
            </div>
            <SectionFooterActions
              onCancel={closeActiveSection}
              onSave={() => void saveSection('address')}
              isSaving={savingSection === 'address'}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadonlyField label="Street" value={user.address?.street} placeholder="Not provided" className="md:col-span-2" />
            <ReadonlyField label="City" value={user.address?.city} placeholder="Not set" />
            <ReadonlyField label="Province" value={user.address?.province} placeholder="Not provided" />
            <ReadonlyField label="Postal Code" value={user.address?.postalCode} placeholder="Not provided" />
            <ReadonlyField label="Country" value={user.address?.country} placeholder="Not set" />
          </div>
        )}
      </EditableCard>

      <EditableCard
        title="Bio"
        description="A short description that helps others understand who you are."
        isEditing={editingSection === 'bio'}
        onEdit={() => openSection('bio')}
      >
        {editingSection === 'bio' ? (
          <>
            <FormTextarea label="Bio" rows={5} error={errors.bio?.message} {...register('bio')} />
            <SectionFooterActions
              onCancel={closeActiveSection}
              onSave={() => void saveSection('bio')}
              isSaving={savingSection === 'bio'}
            />
          </>
        ) : (
          <ReadonlyField label="Bio" value={user.bio} placeholder="No bio added" multiline />
        )}
      </EditableCard>

      <EditableCard
        title="Seller / Provider Details"
        description="Business-facing information and service activity at a glance."
        icon={<FiBriefcase className="h-4 w-4" />}
        isEditing={editingSection === 'seller'}
        onEdit={() => openSection('seller')}
      >
        {editingSection === 'seller' ? (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Business Name"
                error={errors.businessName?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('businessName')}
              />
              <Input
                label="Service Area"
                error={errors.serviceArea?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...register('serviceArea')}
              />
              <div className="md:col-span-2">
                <FormTextarea
                  label="Business Description"
                  rows={4}
                  error={errors.sellerDescription?.message}
                  {...register('sellerDescription')}
                />
              </div>
            </div>
            <SectionFooterActions
              onCancel={closeActiveSection}
              onSave={() => void saveSection('seller')}
              isSaving={savingSection === 'seller'}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadonlyField label="Business Name" value={user.sellerProfile?.businessName} placeholder="Not provided" />
            <ReadonlyField label="Service Area" value={user.sellerProfile?.serviceArea} placeholder="Not provided" />
            <ReadonlyField
              label="Business Description"
              value={user.sellerProfile?.description}
              placeholder="Not provided"
              className="md:col-span-2"
              multiline
            />
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBox label="My Services" value={serviceStats.myServices} loading={statsLoading} />
          <StatBox label="Active Services" value={serviceStats.activeServices} loading={statsLoading} />
          <StatBox label="Provider Bookings" value={serviceStats.providerBookings} loading={statsLoading} />
          <StatBox label="My Bookings" value={serviceStats.buyerBookings} loading={statsLoading} />
        </div>
      </EditableCard>

      <EditableCard
        title="Preferences"
        description="Control how you receive important account and marketplace updates."
        icon={<FiSettings className="h-4 w-4" />}
        isEditing={editingSection === 'preferences'}
        onEdit={() => openSection('preferences')}
      >
        {editingSection === 'preferences' ? (
          <>
            <div className="grid grid-cols-1 gap-3">
              <PreferenceRow
                label="Email notifications"
                description="Receive important account and activity updates by email."
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500/30"
                  {...register('emailNotifications')}
                />
              </PreferenceRow>
              <PreferenceRow
                label="Push notifications"
                description="Get timely updates for account activity and service actions."
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500/30"
                  {...register('pushNotifications')}
                />
              </PreferenceRow>
              <PreferenceRow
                label="Marketing emails"
                description="Allow occasional promotional emails and marketplace announcements."
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500/30"
                  {...register('marketingEmails')}
                />
              </PreferenceRow>
            </div>
            <SectionFooterActions
              onCancel={closeActiveSection}
              onSave={() => void saveSection('preferences')}
              isSaving={savingSection === 'preferences'}
            />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <PreferenceSummary
              label="Email notifications"
              description="Receive important account and activity updates by email."
              enabled={user.preferences?.emailNotifications ?? true}
            />
            <PreferenceSummary
              label="Push notifications"
              description="Get timely updates for account activity and service actions."
              enabled={user.preferences?.pushNotifications ?? true}
            />
            <PreferenceSummary
              label="Marketing emails"
              description="Allow occasional promotional emails and marketplace announcements."
              enabled={user.preferences?.marketingEmails ?? false}
            />
          </div>
        )}
      </EditableCard>

      <Card hover={false} className="border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
        <SectionHeader
          title="Verification & Profile Status"
          description="A quick status overview for account completeness and verification."
        />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge
            variant={kycBadgeVariant[user.verification?.kycStatus || 'UNSUBMITTED']}
            size="md"
            className="rounded-full px-3 py-1 font-semibold"
          >
            KYC: {user.verification?.kycStatus || 'UNSUBMITTED'}
          </Badge>
          <Badge
            variant={user.isProfileComplete ? 'success' : 'warning'}
            size="md"
            className="rounded-full px-3 py-1 font-semibold"
          >
            {user.isProfileComplete ? 'Profile Complete' : 'Profile Incomplete'}
          </Badge>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
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
        <p className="mt-5 flex items-center gap-1.5 text-xs text-slate-400">
          <FiClock className="h-3.5 w-3.5" />
          KYC status is currently read-only in profile. Contact support to submit or review KYC documents.
        </p>
      </Card>

      <EditableCard
        title="Change Password"
        description="Update your password with the existing security flow."
        isEditing={editingSection === 'password'}
        onEdit={() => openSection('password')}
      >
        {editingSection === 'password' ? (
          <form onSubmit={handlePasswordSubmit(onPasswordChange)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <Input
                label="Current Password"
                type="password"
                error={passwordErrors.currentPassword?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...registerPassword('currentPassword')}
              />
              <Input
                label="New Password"
                type="password"
                error={passwordErrors.newPassword?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...registerPassword('newPassword')}
              />
              <Input
                label="Confirm New Password"
                type="password"
                error={passwordErrors.confirmPassword?.message}
                className="min-h-[3.25rem] border-slate-300 shadow-sm"
                {...registerPassword('confirmPassword')}
              />
            </div>
            <SectionFooterActions
              onCancel={() => {
                resetPassword();
                setEditingSection(null);
              }}
              submitLabel="Update Password"
              isSaving={isChangingPassword}
              submitType="submit"
            />
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
            Passwords are hidden for security. Open this section to update your current password.
          </div>
        )}
      </EditableCard>
    </div>
  );
};

const EditableCard: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}> = ({ title, description, icon, isEditing, onEdit, children }) => (
  <Card hover={false} className="border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
    <SectionHeader
      title={title}
      description={description}
      icon={icon}
      action={
        !isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            leftIcon={<FiEdit2 className="h-4 w-4" />}
            className="border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            Edit
          </Button>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Editing
          </span>
        )
      }
    />
    <div className="mt-6">{children}</div>
  </Card>
);

const SectionHeader: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-900">
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">{icon}</span>}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const SectionFooterActions: React.FC<{
  onCancel: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  submitLabel?: string;
  submitType?: 'button' | 'submit';
}> = ({ onCancel, onSave, isSaving = false, submitLabel = 'Save Changes', submitType = 'button' }) => (
  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
      Cancel
    </Button>
    <Button
      type={submitType}
      variant="primary"
      size="sm"
      isLoading={isSaving}
      onClick={submitType === 'button' ? onSave : undefined}
      className="shadow-sm"
    >
      {submitLabel}
    </Button>
  </div>
);

const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }
>(({ label, error, className = '', ...props }, ref) => (
  <div className="w-full">
    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
    <textarea
      ref={ref}
      className={`
        w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200
        placeholder:text-slate-400
        ${error ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'}
        ${className}
      `}
      {...props}
    />
    {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
  </div>
));

FormTextarea.displayName = 'FormTextarea';

const ReadonlyField: React.FC<{
  label: string;
  value?: string;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}> = ({ label, value, placeholder = 'Not provided', className = '', multiline = false }) => (
  <div className={`rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 shadow-sm ${className}`}>
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className={`mt-2 text-sm text-slate-800 ${multiline ? 'whitespace-pre-wrap leading-6' : 'font-medium'}`}>
      {value && value.trim() !== '' ? value : <span className="text-slate-400">{placeholder}</span>}
    </p>
  </div>
);

const PreferenceRow: React.FC<{ label: string; description: string; children: React.ReactNode }> = ({
  label,
  description,
  children
}) => (
  <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 transition-colors hover:bg-slate-50">
    <span className="space-y-1">
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      <span className="block text-sm leading-6 text-slate-500">{description}</span>
    </span>
    <span className="mt-0.5 shrink-0">{children}</span>
  </label>
);

const PreferenceSummary: React.FC<{ label: string; description: string; enabled: boolean }> = ({
  label,
  description,
  enabled
}) => (
  <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 shadow-sm">
    <span className="space-y-1">
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      <span className="block text-sm leading-6 text-slate-500">{description}</span>
    </span>
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
      }`}
    >
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  </div>
);

const HeaderMetaCard: React.FC<{ label: string; value: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }> = ({
  label,
  value,
  tone
}) => {
  const toneClasses: Record<'warning' | 'success' | 'danger' | 'neutral', string> = {
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700'
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; loading: boolean }> = ({ label, value, loading }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{loading ? '...' : value}</p>
  </div>
);

const StatusItem: React.FC<{ icon: React.ReactNode; title: string; value: string }> = ({ icon, title, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
      {icon}
      {title}
    </p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);

const formatAddress = (address?: IUser['address']) => {
  if (!address) return '';

  return [address.street, address.city, address.province, address.postalCode, address.country].filter(Boolean).join(', ');
};

export default ProfilePage;

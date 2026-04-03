import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMail, FiMessageCircle, FiPhone, FiSend, FiUser, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { contactApi } from '@/api/contact';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().email('Please enter a valid email'),
  phone: z.string().trim().max(30).optional(),
  whatsappNumber: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(3, 'Subject is too short').max(200),
  message: z.string().trim().min(10, 'Please describe your request').max(5000),
});

type ContactFormData = z.infer<typeof contactSchema>;

const FloatingContactWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  const defaultValues = useMemo<ContactFormData>(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    whatsappNumber: user?.phone || '',
    subject: '',
    message: '',
  }), [user]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = async (data: ContactFormData) => {
    try {
      await contactApi.submit({
        name: data.name,
        email: data.email,
        phone: data.phone,
        whatsappNumber: data.whatsappNumber,
        subject: data.subject,
        message: data.message,
      });

      toast.success('Your request has been sent to the admin team.');

      reset({
        ...defaultValues,
        subject: '',
        message: '',
      });

      setOpen(false);
    } catch {
      // Handled by global API interceptor
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open contact form"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl ring-1 ring-white/40 transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        <span className="sr-only">Contact us</span>
        <FiMessageCircle className="mx-auto h-7 w-7" />
      </button>

      {open && (
        <>
          <div className="pointer-events-none fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px]" />

          <section className="fixed bottom-24 right-4 z-[60] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Contact Us</h3>
                <p className="text-xs text-slate-500">
                  {isAuthenticated
                    ? 'Send your request directly to the admin team.'
                    : 'Share details and our admin team will reply by email.'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close contact form"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <FiX className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 px-4 py-4">
              <Input
                label="Your Name"
                placeholder="Enter your full name"
                leftIcon={<FiUser className="h-4 w-4" />}
                error={errors.name?.message}
                {...register('name')}
              />

              <Input
                label="Email"
                placeholder="you@example.com"
                leftIcon={<FiMail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Phone"
                  placeholder="Optional"
                  leftIcon={<FiPhone className="h-4 w-4" />}
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <Input
                  label="WhatsApp"
                  placeholder="Optional"
                  leftIcon={<FiMessageCircle className="h-4 w-4" />}
                  error={errors.whatsappNumber?.message}
                  {...register('whatsappNumber')}
                />
              </div>

              <Input
                label="Subject"
                placeholder="How can we help you?"
                error={errors.subject?.message}
                {...register('subject')}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
                <textarea
                  rows={4}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 ${
                    errors.message
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                  }`}
                  placeholder="Describe your issue or request"
                  {...register('message')}
                />
                {errors.message?.message && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.message.message}</p>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Admin status flow: Pending, Reviewed without reply, Replied by email.
              </p>

              <Button type="submit" isLoading={isSubmitting} fullWidth rightIcon={<FiSend className="h-4 w-4" />}>
                Send Message
              </Button>
            </form>
          </section>
        </>
      )}
    </>
  );
};

export default FloatingContactWidget;

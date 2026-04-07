import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMail, FiMessageCircle, FiPhone, FiSend, FiShield, FiStar, FiUser, FiX } from 'react-icons/fi';
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

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
        className={`fixed bottom-6 right-6 z-[1190] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600 text-white shadow-[0_18px_40px_rgba(16,185,129,0.35)] ring-1 ring-white/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_22px_48px_rgba(16,185,129,0.42)] active:scale-95 ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      >
        <span className="sr-only">Contact us</span>
        <FiMessageCircle className="h-7 w-7" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[1300] bg-slate-950/78 backdrop-blur-3xl"
            onClick={() => setOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            className="fixed inset-0 z-[1310] flex items-center justify-center p-4 sm:p-8 lg:p-12"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative h-[min(900px,calc(100vh-48px))] w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_36px_110px_rgba(15,23,42,0.4)] md:h-[min(900px,calc(100vh-64px))]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50/90 via-white to-emerald-50/80 pointer-events-none" />

              <div className="relative grid h-full lg:grid-cols-[1.08fr_1fr]">
                <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-10 xl:p-12 text-white">
                  <div className="space-y-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md">
                      <FiStar className="h-4 w-4 text-emerald-300" />
                      Fast support for buyers and sellers
                    </div>
                    <div>
                      <h3 id="contact-modal-title" className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                        Connect with the team instantly.
                      </h3>
                      <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
                        Send a request to the admin team. We will review it, keep it in the request queue, and reply by email.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {[
                        'Pending request tracking',
                        'Email response from admin',
                        'Optional WhatsApp follow-up info',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
                            <FiShield className="h-4 w-4" />
                          </div>
                          <span className="text-sm text-slate-100">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-md">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Need urgent help?</p>
                    <p className="mt-2 text-sm text-slate-200">
                      Add your WhatsApp number and the admin can continue the conversation manually.
                    </p>
                  </div>
                </aside>

                <div className="relative flex min-h-0 flex-col overflow-hidden bg-white/80 px-5 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-7 lg:px-8 lg:pb-8 lg:pt-8">
                  <div className="mb-5 flex shrink-0 items-start justify-between gap-5 border-b border-slate-100/80 pb-5 sm:mb-6 sm:pb-6">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        Contact Support
                      </div>
                      <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.15rem]">
                        Tell us what you need
                      </h3>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                        {isAuthenticated
                          ? 'Your account details are filled in automatically. Just add the request and send.'
                          : 'Add your details, then send a message to the admin team.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label="Close contact form"
                      onClick={() => setOpen(false)}
                      className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <div className="contact-scroll min-h-0 flex-1 overflow-y-scroll overscroll-contain pr-3 sm:pr-4">
                      <div className="flex flex-col gap-5 pb-6">
                        <div className="rounded-2xl border border-slate-100 bg-white/85 p-4 sm:p-5">
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white/85 p-4 sm:p-5">
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white/85 p-4 sm:p-5">
                          <Input
                            label="Subject"
                            placeholder="How can we help you?"
                            error={errors.subject?.message}
                            {...register('subject')}
                          />
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white/85 p-4 sm:p-5">
                          <label className="mb-2 block text-sm font-medium text-slate-700">Message</label>
                          <textarea
                            rows={7}
                            className={`w-full rounded-2xl border bg-white px-4 py-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 ${
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
                      </div>
                    </div>

                    <div className="mt-4 flex shrink-0 justify-end rounded-2xl border border-slate-200/85 bg-white/90 px-4 py-4 sm:px-5">
                      <Button type="submit" isLoading={isSubmitting} size="lg" rightIcon={<FiSend className="h-4 w-4" />}>
                        Send Message
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
};

export default FloatingContactWidget;

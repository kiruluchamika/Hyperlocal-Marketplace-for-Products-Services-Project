import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { reportsApi } from '@/api/reports';

const reportSchema = z.object({
  reason: z.enum(['SPAM', 'FRAUD', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'DUPLICATE', 'OTHER']),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'LISTING' | 'SERVICE' | 'USER';
  targetId: string;
  targetName?: string;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam or scam' },
  { value: 'FRAUD', label: 'Fraudulent activity' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'DUPLICATE', label: 'Duplicate listing' },
  { value: 'OTHER', label: 'Other' },
];

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName = 'this item',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit = async (data: ReportFormData) => {
    try {
      setIsSubmitting(true);
      await reportsApi.submitReport({
        targetType,
        targetId,
        reason: data.reason,
        description: data.description,
      });
      toast.success('Report submitted successfully. Our team will review it shortly.');
      reset();
      onClose();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Failed to submit report';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FiAlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Report {targetType.toLowerCase()}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <p className="text-sm text-slate-600">
              Help us keep Bazaaro safe by reporting {targetName}. Your report will be reviewed by our team.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Report reason *
                </label>
                <select
                  {...register('reason')}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white text-slate-900"
                >
                  <option value="">Select a reason</option>
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                {errors.reason && (
                  <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (10-1000 characters) *
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Provide details about why you're reporting this item..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-24 text-sm"
                />
                {errors.description && (
                  <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  Submit Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ReportModal;

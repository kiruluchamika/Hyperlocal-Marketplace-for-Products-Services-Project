import React from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import StarRating from './StarRating';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  content: z.string().min(10, 'Write at least 10 characters').max(2000),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReviewFormData) => Promise<void>;
  initialValue?: Partial<ReviewFormData>;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
  isSubmitting = false,
  mode = 'create',
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: initialValue?.rating || 5,
      title: initialValue?.title || '',
      content: initialValue?.content || '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        rating: initialValue?.rating || 5,
        title: initialValue?.title || '',
        content: initialValue?.content || '',
      });
    }
  }, [isOpen, initialValue, reset]);

  if (!isOpen) return null;

  const rating = watch('rating');

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">{mode === 'edit' ? 'Edit Review' : 'Leave a Review'}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
              <FiX size={18} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit(async (values) => {
              await onSubmit(values);
            })}
            className="space-y-4 p-5"
          >
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Rating</p>
              <StarRating
                rating={rating || 0}
                interactive
                size="lg"
                onChange={(value) => setValue('rating', value, { shouldValidate: true })}
              />
              {errors.rating && <p className="mt-1 text-xs text-rose-600">{errors.rating.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Title (optional)</label>
              <input
                type="text"
                className="input-field py-2"
                placeholder="Summarize your experience"
                {...register('title')}
              />
              {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Your Review</label>
              <textarea
                rows={5}
                className="input-field py-2"
                placeholder="What was good, what can improve, and would you recommend this service?"
                {...register('content')}
              />
              {errors.content && <p className="mt-1 text-xs text-rose-600">{errors.content.message}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" fullWidth isLoading={isSubmitting}>
                {mode === 'edit' ? 'Save Changes' : 'Publish Review'}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
};

export default ReviewModal;

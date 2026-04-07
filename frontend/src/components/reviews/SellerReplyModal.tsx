import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiX } from 'react-icons/fi';
import Button from '@/components/ui/Button';

interface SellerReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
}

const SellerReplyModal: React.FC<SellerReplyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [content, setContent] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setContent('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = content.trim();
    if (trimmed.length < 10) {
      setError('Reply should be at least 10 characters.');
      return;
    }

    if (trimmed.length > 1000) {
      setError('Reply should be at most 1000 characters.');
      return;
    }

    setError('');
    await onSubmit(trimmed);
  };

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
            <div>
              <h2 className="text-lg font-bold text-slate-900">Reply to Review</h2>
              <p className="mt-1 text-xs text-slate-500">Keep it professional and policy-safe.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
              <FiX size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              <p className="inline-flex items-center gap-1 font-semibold">
                <FiShield size={12} /> Moderation Guidance
              </p>
              <p className="mt-1">
                Explain your side clearly, avoid personal attacks, and avoid sharing personal contact details.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Public Reply</label>
              <textarea
                rows={5}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="input-field py-2"
                placeholder="Thank the user, clarify details, and provide a constructive response..."
              />
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" fullWidth isLoading={isSubmitting}>
                Publish Reply
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
};

export default SellerReplyModal;

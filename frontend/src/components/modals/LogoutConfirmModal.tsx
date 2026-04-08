import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertTriangle, FiLogOut, FiX } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm logout',
  message = 'Are you sure you want to log out? You will need to sign in again to continue.',
  confirmLabel = 'Yes, log me out',
}) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center px-4 py-6"
        >
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.45)]"
          >
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300" />
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-rose-500/15 blur-3xl" />
            <div className="absolute -left-20 top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative px-6 pb-6 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/25">
                    <FiAlertTriangle size={26} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Session action</p>
                    <h3 id="logout-confirm-title" className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                      {title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close logout confirmation"
                >
                  <FiX size={20} />
                </button>
              </div>

              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-600">{message}</p>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm ring-1 ring-slate-200">
                    <FiLogOut size={18} />
                  </span>
                  <span>Any unsaved changes will be lost when you leave this session.</span>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onClose} className="sm:min-w-[120px]">
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={onConfirm}
                  className="sm:min-w-[160px]"
                  leftIcon={<FiLogOut />}
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LogoutConfirmModal;
'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevice } from '@/lib/hooks/use-device';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  headerIcon?: ReactNode;
  headerAction?: ReactNode;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full m-2 sm:m-4',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'lg',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  headerIcon,
  headerAction,
}: ModalProps) {
  const { isMobile, isTouch } = useDevice();
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Keyboard escape key support
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden overscroll-contain"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            ref={modalContentRef}
            initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`relative w-full ${maxWidthMap[maxWidth]} bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-t-[2.25rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10`}
          >
            {/* Mobile Drag Indicator Bar */}
            {isMobile && (
              <div className="w-full pt-3 pb-1 flex justify-center items-center bg-gray-50/50 dark:bg-zinc-800/30">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 dark:border-zinc-800/70 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-800/30 shrink-0">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {headerIcon && (
                    <div className="shrink-0">{headerIcon}</div>
                  )}
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-zinc-50 tracking-tight truncate">
                    {title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {headerAction}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-w-[40px] min-h-[40px] p-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-gray-500 dark:text-zinc-400 transition-colors flex items-center justify-center cursor-pointer border-none"
                      aria-label="Close dialog"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 md:p-8">
              {children}
            </div>

            {/* Footer Area */}
            {footer && (
              <div className="px-5 sm:px-8 py-4 sm:py-5 border-t border-gray-100 dark:border-zinc-800/70 bg-gray-50/50 dark:bg-zinc-800/30 shrink-0 pb-safe">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 min-h-[48px] px-6 py-3.5 rounded-2xl font-black text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all uppercase tracking-wider cursor-pointer border-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full sm:flex-[2] min-h-[48px] px-6 py-3.5 rounded-2xl font-black text-sm text-white transition-all uppercase tracking-wider shadow-lg cursor-pointer border-none flex items-center justify-center ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none'
                : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 dark:shadow-none'
            }`}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-gray-600 dark:text-zinc-300 font-medium leading-relaxed text-sm sm:text-base">
        {message}
      </p>
    </Modal>
  );
}


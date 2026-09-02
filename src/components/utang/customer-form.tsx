'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/lib/db/idb';
import { X, Save, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevice } from '@/lib/hooks/use-device';

interface CustomerFormProps {
  customer?: Customer | null;
  onSave: (customer: any) => Promise<void>;
  onClose: () => void;
}

export function CustomerForm({ customer, onSave, onClose }: CustomerFormProps) {
  const { isMobile } = useDevice();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        contact: customer.contact,
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Please enter the customer name.');
      return;
    }

    setIsSaving(true);
    try {
      if (customer?.id) {
        await onSave({ ...customer, ...formData, name: formData.name.trim() });
      } else {
        await onSave({ ...formData, name: formData.name.trim() });
      }
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to save customer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden overscroll-contain">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
      />

      <motion.div
        initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative bg-white w-full max-w-md rounded-t-[2.25rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10"
      >
        {isMobile && (
          <div className="w-full pt-3 pb-1 flex justify-center items-center bg-gray-50/50">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 sm:p-2.5 rounded-xl text-white">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              {customer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] p-2 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5 sm:space-y-6 flex-1 overflow-y-auto overscroll-contain">
          {error && (
            <div className="p-3.5 sm:p-4 bg-red-50 text-red-600 rounded-xl text-xs sm:text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Contact Number
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="e.g. 0912 345 6789"
                className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row gap-3 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 min-h-[48px] px-6 py-3.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all cursor-pointer border-none bg-transparent text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:flex-[2] min-h-[48px] bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all cursor-pointer border-none text-xs uppercase tracking-wider"
            >
              {isSaving ? (
                <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {customer ? 'Update Customer' : 'Save Customer'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


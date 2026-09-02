'use client';

import { useState, useEffect } from 'react';
import { Supplier } from '@/lib/db/idb';
import { X, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevice } from '@/lib/hooks/use-device';

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function SupplierForm({ supplier, onSave, onDelete, onClose }: SupplierFormProps) {
  const { isMobile } = useDevice();
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || ''
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden overscroll-contain">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
      />

      <motion.div
        initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative bg-white rounded-t-[2.25rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10"
      >
        {isMobile && (
          <div className="w-full pt-3 pb-1 flex justify-center items-center bg-gray-50/50">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div>
            <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
              {supplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Enter supplier contact details</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] p-2 hover:bg-white rounded-xl transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5 sm:space-y-6 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Supplier Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-4 text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[44px]"
                placeholder="e.g. Coca-Cola Philippines"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-4 text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[44px]"
                placeholder="Name of your contact"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-4 text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[44px]"
                  placeholder="0917..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-4 text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[44px]"
                  placeholder="supplier@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-4 text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm min-h-[70px]"
                rows={2}
                placeholder="Supplier office address"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 pb-safe">
            {supplier && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(supplier.id)}
                className="w-full sm:flex-1 min-h-[48px] bg-red-50 text-red-600 font-black py-3.5 px-6 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer border-none text-xs uppercase tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="submit"
              className="w-full sm:flex-[2] min-h-[48px] bg-indigo-600 text-white font-black py-3.5 px-6 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer border-none text-xs uppercase tracking-wider"
            >
              <Save className="w-4 h-4" />
              {supplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


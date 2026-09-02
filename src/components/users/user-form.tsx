'use client';

import { useState, useEffect } from 'react';
import { User, Branch } from '@/lib/db/idb';
import { X, Save, Mail, Lock, User as UserIcon, Shield, MapPin, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBranches } from '@/lib/hooks/use-branches';
import { useDevice } from '@/lib/hooks/use-device';

interface UserFormProps {
  userData?: Omit<User, 'passwordHash'> | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export function UserForm({ userData, onSave, onClose }: UserFormProps) {
  const { isMobile } = useDevice();
  const { branches, allBranches } = useBranches();
  const branchList = (allBranches && allBranches.length > 0) ? allBranches : branches;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier' as 'admin' | 'cashier',
    assignedBranchIds: [] as string[],
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
    if (userData) {
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '', // Don't show password hash
        role: userData.role,
        assignedBranchIds: userData.assignedBranchIds && userData.assignedBranchIds.length > 0 
          ? userData.assignedBranchIds 
          : branchList.map(b => b.id),
      });
    } else if (branchList.length > 0) {
      setFormData(prev => ({
        ...prev,
        assignedBranchIds: branchList.map(b => b.id)
      }));
    }
  }, [userData, branchList]);

  const toggleBranch = (branchId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedBranchIds: prev.assignedBranchIds.includes(branchId)
        ? prev.assignedBranchIds.filter(id => id !== branchId)
        : [...prev.assignedBranchIds, branchId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!userData && !formData.password) {
      setError('Password is required for new users.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      console.error('Save failed:', error);
      setError(error.message || 'Failed to save user. Please try again.');
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
        className="relative bg-white w-full max-w-xl rounded-t-[2.25rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10"
      >
        {isMobile && (
          <div className="w-full pt-3 pb-1 flex justify-center items-center bg-gray-50/50">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl text-white">
              <UserIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              {userData ? 'Edit User' : 'Add New User'}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6 overscroll-contain">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 sm:py-3.5 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm min-h-[44px]"
                  placeholder="Juan Dela Cruz"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 sm:py-3.5 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm min-h-[44px]"
                  placeholder="juan@store.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">
                {userData ? 'New Password (Optional)' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                <input
                  type="password"
                  required={!userData}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 sm:py-3.5 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-sm min-h-[44px]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'cashier' })}
                  className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all cursor-pointer min-h-[44px] ${
                    formData.role === 'cashier'
                      ? 'bg-orange-50 border-orange-600 text-orange-600'
                      : 'bg-white border-gray-100 text-gray-400'
                  }`}
                >
                  Cashier
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                  className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all cursor-pointer min-h-[44px] ${
                    formData.role === 'admin'
                      ? 'bg-blue-50 border-blue-600 text-blue-600'
                      : 'bg-white border-gray-100 text-gray-400'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Assigned Branches
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {branchList.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => toggleBranch(branch.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer min-h-[48px] ${
                    formData.assignedBranchIds.includes(branch.id)
                      ? 'bg-blue-50 border-blue-600 text-blue-600'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <span className="font-bold text-xs">{branch.name}</span>
                  {formData.assignedBranchIds.includes(branch.id) && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
              {branchList.length === 0 && (
                <p className="text-xs text-gray-400 italic col-span-2 text-center py-4">No branches found. Create a branch first.</p>
              )}
            </div>
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row gap-3 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 min-h-[48px] px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all cursor-pointer border-none bg-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:flex-[2] min-h-[48px] bg-gray-900 hover:bg-black text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer border-none text-xs uppercase tracking-widest"
            >
              {isSaving ? (
                <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {userData ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


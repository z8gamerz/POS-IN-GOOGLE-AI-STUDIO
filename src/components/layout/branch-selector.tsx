'use client';

import { useStore } from '@/lib/hooks/use-store';
import { useAuth } from '@/lib/contexts/auth-context';
import { MapPin, ChevronDown, Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BranchModal } from '../branches/branch-modal';

interface BranchSelectorProps {
  onManageBranches?: () => void;
}

export function BranchSelector({ onManageBranches }: BranchSelectorProps) {
  const { branches, currentBranch, switchBranch } = useStore();
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingBranch, setIsAddingBranch] = useState(false);

  if (branches.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-3 bg-white dark:bg-slate-800 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
      >
        <div className="bg-orange-100 dark:bg-orange-950/40 p-1.5 rounded-lg text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 dark:group-hover:bg-orange-500 group-hover:text-white transition-colors">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">Branch</p>
          <p className="text-sm font-black text-gray-900 dark:text-gray-100 leading-none">{currentBranch?.name || 'Select Branch'}</p>
        </div>
        <div className="text-left sm:hidden block">
          <p className="text-[11px] font-black text-gray-900 dark:text-gray-100 leading-none truncate max-w-[60px]">{currentBranch?.name || 'Select'}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-64 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Switch Branch</p>
                {isAdmin && onManageBranches && (
                  <button 
                    onClick={() => {
                      onManageBranches();
                      setIsOpen(false);
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-900 transition-all"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => {
                      switchBranch(branch.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      currentBranch?.id === branch.id 
                        ? 'bg-orange-50 text-orange-600' 
                        : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <MapPin className={`w-4 h-4 ${currentBranch?.id === branch.id ? 'text-orange-600' : 'text-gray-400'}`} />
                    <span className="font-bold text-sm">{branch.name}</span>
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setIsAddingBranch(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 bg-gray-900 text-white hover:bg-orange-600 transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  Add Branch
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingBranch && (
          <BranchModal onClose={() => setIsAddingBranch(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

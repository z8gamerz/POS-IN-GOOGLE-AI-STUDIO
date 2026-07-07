'use client';

import { useStore } from '@/lib/hooks/use-store';
import { useAuth } from '@/lib/contexts/auth-context';
import { Store, Clock, UserCircle, ChevronDown, LogOut, RefreshCw, CloudLightning, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BranchSelector } from './branch-selector';
import { BranchManagement } from '../branches/branch-management';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { pullSync, processQueue } from '@/lib/db/sync-queue';
import { useTheme } from '@/lib/contexts/theme-context';

export function Header({ ticketNumber }: { ticketNumber?: string }) {
  const { store } = useStore();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.role === 'admin';
  const [isManagingBranches, setIsManagingBranches] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [hasSyncError, setHasSyncError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasSyncError(localStorage.getItem('firebase_sync_error') === 'Unauthorized');
    }
  }, [isSyncing]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      await pullSync();
      await processQueue();
      setSyncSuccess(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('firebase_sync_error');
        setHasSyncError(false);
      }
      setTimeout(() => setSyncSuccess(false), 3000);
      window.location.reload();
    } catch (error) {
      console.error('Manual sync failed:', error);
      if (typeof window !== 'undefined') {
        setHasSyncError(localStorage.getItem('firebase_sync_error') === 'Unauthorized');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="border-b-2 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50 transition-colors">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 md:gap-4"
      >
        <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shadow-orange-200 dark:shadow-none shrink-0">
          {store?.name ? store.name[0].toUpperCase() : 'J'}
        </div>
        <div>
          <h1 className="font-black text-sm md:text-2xl tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
            {store?.name || 'JHEFF POS'}{' '}
            <span className="text-orange-500 underline decoration-2 md:decoration-4 underline-offset-2 md:underline-offset-4 hidden xs:inline">Cloud</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {ticketNumber && (
              <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-orange-600 uppercase tracking-widest">
                <span className="w-1 h-1 bg-orange-600 rounded-full" />
                T: {ticketNumber}
              </div>
            )}
          </div>
        </div>
      </motion.div>
      
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 shadow-sm transition-all cursor-pointer flex items-center justify-center"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-500 animate-[spin_10s_linear_infinite]" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Firebase Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
            isSyncing 
              ? 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse dark:bg-orange-950/20 dark:border-orange-900/40 dark:text-orange-400'
              : syncSuccess
              ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-400'
              : hasSyncError
              ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse dark:bg-rose-950/20 dark:border-rose-900/40'
              : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-700 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700'
          }`}
          title={hasSyncError ? "Firebase rules are blocking sync. Click to retry." : "Synchronize data with Firebase Realtime Database"}
        >
          {hasSyncError && !isSyncing && !syncSuccess ? (
            <CloudLightning className="w-3.5 h-3.5 text-rose-500" />
          ) : (
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          )}
          <span className="hidden md:inline">
            {isSyncing ? 'Syncing...' : syncSuccess ? 'Synced' : hasSyncError ? 'Auth Error' : 'Sync'}
          </span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-all group cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-1">{user?.role || 'cashier'}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[120px]">{user?.email?.split('@')[0] || 'User'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900/40 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserMenuOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-2 z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-50 dark:border-slate-700 mb-1">
                    <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Logged in as</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{user?.email}</p>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin/users"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                        <UserCircle className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm">Manage Users</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                  >
                    <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/50">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm">Logout</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <BranchSelector onManageBranches={() => setIsManagingBranches(true)} />
        
        <div className="hidden lg:flex flex-col text-right">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">
            Current Date
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isManagingBranches && (
          <BranchManagement onClose={() => setIsManagingBranches(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}

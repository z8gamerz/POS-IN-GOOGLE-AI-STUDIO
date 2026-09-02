'use client';

import { useState, useEffect } from 'react';
import { X, Wallet, ArrowUpRight, ArrowDownLeft, Loader2, Check, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { EWalletTransaction } from '@/lib/db/idb';
import { useDevice } from '@/lib/hooks/use-device';

interface EWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<EWalletTransaction, 'id' | 'createdAt' | 'updatedAt' | 'branchId'>) => Promise<void>;
}

export function EWalletModal({ isOpen, onClose, onSave }: EWalletModalProps) {
  const { isMobile } = useDevice();
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [method, setMethod] = useState<'gcash' | 'maya' | 'bank_transfer' | 'gotyme'>('gcash');
  const [customerName, setCustomerName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        type,
        amount: parseFloat(amount),
        fee: fee ? parseFloat(fee) : 0,
        method,
        customerName: customerName || undefined,
        referenceNumber: referenceNumber || undefined,
      });
      onClose();
      // Reset form
      setAmount('');
      setFee('');
      setCustomerName('');
      setReferenceNumber('');
    } catch (error) {
      console.error('Failed to save e-wallet transaction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden overscroll-contain">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          <motion.div
            initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative bg-white rounded-t-[2.25rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10"
          >
            {isMobile && (
              <div className="w-full pt-3 pb-1 flex justify-center items-center bg-gray-50/50">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
            )}

            <div className="p-5 sm:p-7 md:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-blue-600 p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight uppercase">E-Wallet Service</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cash In / Cash Out</p>
                    <span className="text-gray-200">•</span>
                    <Link 
                      href="/pos/ewallet-history"
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      <History className="w-3 h-3" />
                      View History
                    </Link>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="min-w-[40px] min-h-[40px] p-2 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors border border-gray-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6 flex-1 overflow-y-auto overscroll-contain">
              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setType('cash_in')}
                  className={`p-4 sm:p-6 rounded-3xl flex flex-col items-center gap-2 sm:gap-3 transition-all border-2 cursor-pointer ${
                    type === 'cash_in'
                      ? 'bg-green-50 border-green-600 text-green-600 shadow-lg shadow-green-100'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <ArrowUpRight className={`w-6 h-6 sm:w-8 sm:h-8 ${type === 'cash_in' ? 'text-green-600' : 'text-gray-300'}`} />
                  <span className="font-black uppercase tracking-widest text-xs">Cash In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('cash_out')}
                  className={`p-4 sm:p-6 rounded-3xl flex flex-col items-center gap-2 sm:gap-3 transition-all border-2 cursor-pointer ${
                    type === 'cash_out'
                      ? 'bg-orange-50 border-orange-600 text-orange-600 shadow-lg shadow-orange-100'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <ArrowDownLeft className={`w-6 h-6 sm:w-8 sm:h-8 ${type === 'cash_out' ? 'text-orange-600' : 'text-gray-300'}`} />
                  <span className="font-black uppercase tracking-widest text-xs">Cash Out</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">₱</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3.5 sm:py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-base sm:text-lg font-black min-h-[48px]"
                    />
                  </div>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Service Fee</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3.5 sm:py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-base sm:text-lg font-black min-h-[48px]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-4 py-3.5 sm:py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black uppercase tracking-widest text-xs min-h-[48px]"
                >
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="gotyme">GoTyme</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-3 sm:py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm min-h-[44px]"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ref Number</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-3 sm:py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="pt-2 pb-safe">
                <button
                  type="submit"
                  disabled={!amount || isSaving}
                  className="w-full bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-6 sm:px-10 py-4 sm:py-5 min-h-[50px] rounded-2xl sm:rounded-[2rem] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 uppercase text-xs sm:text-sm tracking-widest cursor-pointer border-none"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm Transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


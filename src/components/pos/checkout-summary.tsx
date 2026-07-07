'use client';

import { Receipt, Coins } from 'lucide-react';
import { motion } from 'motion/react';

interface CheckoutSummaryProps {
  total: number;
  itemCount: number;
  onCheckout: () => void;
  disabled: boolean;
  isCheckingOut: boolean;
}

export function CheckoutSummary({ total, itemCount, onCheckout, disabled, isCheckingOut }: CheckoutSummaryProps) {
  return (
    <div className="p-6 md:p-8 bg-white border-t border-gray-100 space-y-6 shadow-2xl rounded-t-[3rem]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-2 rounded-xl text-gray-400">
            <Coins className="w-4 h-4" />
          </div>
          <span className="text-gray-500 font-black text-xs uppercase tracking-widest">Subtotal ({itemCount} items)</span>
        </div>
        <span className="text-gray-900 font-black text-xl tracking-tight">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      </div>
      
      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
        <span className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Total Due</span>
        <div className="text-right">
          <span className="text-4xl md:text-5xl font-black text-orange-600 tracking-tighter">
            ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Inclusive of all taxes</p>
        </div>
      </div>

      <motion.button
        whileTap={!disabled ? { scale: 0.98 } : {}}
        onClick={onCheckout}
        disabled={disabled}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-3 cursor-pointer"
      >
        {isCheckingOut ? (
          <span className="animate-spin border-4 border-white/30 border-t-white rounded-full w-6 h-6" />
        ) : (
          <>
            <Receipt className="w-6 h-6" />
            <span>COMPLETE PAYMENT</span>
          </>
        )}
      </motion.button>
    </div>
  );
}

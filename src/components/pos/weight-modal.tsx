'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/db/idb';
import { X, Scale, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevice } from '@/lib/hooks/use-device';

interface WeightModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (weight: number) => void;
}

export function WeightModal({ isOpen, product, onClose, onConfirm }: WeightModalProps) {
  const { isMobile } = useDevice();
  const [weight, setWeight] = useState<string>('1.000');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const handlePreset = (value: number) => {
    setWeight(value.toFixed(3));
    setError(null);
  };

  const handleAddPreset = (value: number) => {
    const current = parseFloat(weight) || 0;
    setWeight((current + value).toFixed(3));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(weight);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid weight greater than 0.');
      return;
    }
    onConfirm(parsed);
    onClose();
  };

  const calculatedTotal = (parseFloat(weight) || 0) * product.price;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden overscroll-contain">
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
          className="relative bg-white w-full max-w-md rounded-t-[2.25rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10"
        >
          {isMobile && (
            <div className="w-full pt-3 pb-1 flex justify-center items-center bg-orange-50/50">
              <div className="w-12 h-1.5 bg-orange-200 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between bg-orange-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2.5 rounded-2xl text-white shadow-md shadow-orange-100">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">Weight-Based Item</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enter measurement in kilograms</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] p-2 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6 flex-1 overflow-y-auto overscroll-contain">
            <div className="text-center bg-gray-50 p-4 sm:p-6 rounded-3xl border border-gray-100">
              <h4 className="font-bold text-gray-900 text-base sm:text-lg mb-1">{product.name}</h4>
              <p className="text-sm font-black text-orange-600 uppercase tracking-wide">
                ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} / kg
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 uppercase tracking-wide">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Weight (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    required
                    autoFocus
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-6 py-4 sm:py-5 bg-white rounded-2xl border-2 border-gray-200 text-center text-2xl sm:text-3xl font-black text-gray-900 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all min-h-[50px]"
                    placeholder="0.000"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-400 text-base sm:text-lg uppercase">
                    kg
                  </span>
                </div>
              </div>

              {/* Set Presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Quick Weights (Set)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[0.25, 0.5, 1.0, 2.0].map((val) => (
                    <button
                      key={`set-${val}`}
                      type="button"
                      onClick={() => handlePreset(val)}
                      className="min-h-[42px] py-2.5 px-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    >
                      {val}kg
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Adjust Weights (Add)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[0.05, 0.1, 0.25, 0.5].map((val) => (
                    <button
                      key={`add-${val}`}
                      type="button"
                      onClick={() => handleAddPreset(val)}
                      className="min-h-[42px] py-2.5 px-2 bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-600 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    >
                      +{val}kg
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Price Calculation */}
            <div className="flex items-center justify-between p-4 sm:p-5 bg-orange-50 rounded-3xl border border-orange-100">
              <span className="text-[11px] sm:text-xs font-black text-orange-800 uppercase tracking-widest">Calculated Subtotal</span>
              <span className="text-xl sm:text-2xl font-black text-orange-600 tracking-tight">
                ₱{calculatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 pb-safe">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 min-h-[48px] py-3.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:flex-[2] min-h-[48px] bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all cursor-pointer border-none text-xs uppercase tracking-wider"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>ADD TO CART</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


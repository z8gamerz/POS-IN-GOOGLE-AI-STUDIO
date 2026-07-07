'use client';

import { useState } from 'react';
import { Product } from '@/lib/db/idb';
import { X, Scale, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface WeightModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (weight: number) => void;
}

export function WeightModal({ isOpen, product, onClose, onConfirm }: WeightModalProps) {
  const [weight, setWeight] = useState<string>('1.000');
  const [error, setError] = useState<string | null>(null);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2.5 rounded-2xl text-white shadow-md shadow-orange-100">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Weight-Based Item</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enter measurement in kilograms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <h4 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h4>
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
                  className="w-full px-6 py-5 bg-white rounded-2xl border-2 border-gray-100 text-center text-3xl font-black text-gray-900 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                  placeholder="0.000"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg uppercase">
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
                    className="py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
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
                    className="py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-600 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                  >
                    +{val}kg
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Price Calculation */}
          <div className="flex items-center justify-between p-6 bg-orange-50 rounded-3xl border border-orange-100">
            <span className="text-xs font-black text-orange-800 uppercase tracking-widest">Calculated Subtotal</span>
            <span className="text-2xl font-black text-orange-600 tracking-tight">
              ₱{calculatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl font-bold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>ADD TO CART</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

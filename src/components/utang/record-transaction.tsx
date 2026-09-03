'use client';

import { useState, useRef } from 'react';
import { Customer } from '@/lib/db/idb';
import { X, Save, ArrowUpRight, ArrowDownLeft, Coins, FileText, Calendar, Tag, Percent, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface RecordTransactionProps {
  customer: Customer;
  type: 'credit' | 'payment';
  onSave: (
    customerId: string, 
    amount: number, 
    description: string, 
    type: 'credit' | 'payment', 
    customTimestamp?: number,
    discount?: number,
    discountNote?: string
  ) => Promise<void>;
  onClose: () => void;
}

export function RecordTransaction({ customer, type, onSave, onClose }: RecordTransactionProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState(type === 'payment' ? 'Payment for credit/utang' : '');
  const [discount, setDiscount] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactionTime, setTransactionTime] = useState(format(new Date(), 'HH:mm'));
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedDiscount = (type === 'payment' && parseFloat(discount)) ? parseFloat(discount) : 0;
  const totalDebtDeduction = parsedAmount + parsedDiscount;
  const projectedRemainingBalance = Math.max(0, customer.totalUtang - totalDebtDeduction);

  const handleApplyPresetDiscount = (percent: number, label: string) => {
    if (percent === 0) {
      setDiscount('');
      setDiscountNote('');
    } else {
      const baseForDiscount = parsedAmount > 0 ? parsedAmount : (customer.totalUtang > 0 ? customer.totalUtang : 0);
      const discountVal = (baseForDiscount * (percent / 100));
      setDiscount(discountVal.toFixed(2));
      setDiscountNote(label);
    }
  };

  const handlePayFull = () => {
    if (customer.totalUtang > 0) {
      setAmount(customer.totalUtang.toFixed(2));
      setDescription('Full payment for utang');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description.');
      return;
    }

    if (!customer.id) return;

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      let customTimestamp: number | undefined;
      if (transactionDate) {
        const dateTimeStr = `${transactionDate}T${transactionTime || '00:00'}:00`;
        const parsed = new Date(dateTimeStr).getTime();
        if (!isNaN(parsed)) {
          customTimestamp = parsed;
        }
      }

      await onSave(
        customer.id, 
        parseFloat(amount), 
        description.trim(), 
        type, 
        customTimestamp,
        parsedDiscount > 0 ? parsedDiscount : undefined,
        discountNote.trim() || undefined
      );
      onClose();
    } catch (error) {
      console.error('Record failed:', error);
      setError('Failed to save transaction. Please try again.');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl text-white ${type === 'credit' ? 'bg-red-500' : 'bg-green-500'}`}>
              {type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">
                {type === 'credit' ? 'Record Credit' : 'Record Payment'}
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">For {customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Current balance indicator for payment */}
          {type === 'payment' && (
            <div className="p-4 bg-green-50/60 rounded-2xl border border-green-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-wider block">Current Utang</span>
                  <span className="text-xl font-black text-green-900">
                    ₱{customer.totalUtang.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {customer.totalUtang > 0 && (
                  <button
                    type="button"
                    onClick={handlePayFull}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                  >
                    Pay Full
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Coins className="w-3 h-3" /> {type === 'payment' ? 'Amount Received (₱)' : 'Credit Amount (₱)'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg"
              />
            </div>

            {/* Discount section for Payment */}
            {type === 'payment' && (
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1 text-[11px] font-black text-purple-900 uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-purple-600" /> Discount on Payment
                  </label>
                  {/* Preset discounts */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDiscount(0, '')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${!discount || parseFloat(discount) === 0 ? 'bg-purple-200 text-purple-900' : 'bg-white text-gray-600 hover:bg-purple-100'}`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDiscount(5, '5% Promo Discount')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white hover:bg-purple-100 text-purple-700 transition-all border border-purple-200"
                    >
                      5%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDiscount(10, '10% Prompt Payment')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-white hover:bg-purple-100 text-purple-700 transition-all border border-purple-200"
                    >
                      10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPresetDiscount(20, 'Senior / PWD (20%)')}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-0.5"
                    >
                      <Percent className="w-2.5 h-2.5" /> 20%
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white rounded-xl border border-purple-200 text-xs font-bold text-gray-900 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={discountNote}
                    onChange={(e) => setDiscountNote(e.target.value)}
                    placeholder="Reason (e.g. Senior / PWD)"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200 text-xs font-bold text-gray-900 focus:border-purple-500 outline-none"
                  />
                </div>

                {parsedDiscount > 0 && (
                  <div className="pt-2 border-t border-purple-100 text-[11px] space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Cash Paid:</span>
                      <span className="font-bold">₱{parsedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-purple-700 font-bold">
                      <span>Discount:</span>
                      <span>+ ₱{parsedDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-700 font-black border-t border-purple-100 pt-1">
                      <span>Total Bawas sa Utang:</span>
                      <span>₱{totalDebtDeduction.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Natitirang Utang:</span>
                      <span className="font-bold">₱{projectedRemainingBalance.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                <FileText className="w-3 h-3" /> Description / Notes
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'credit' ? 'e.g. 2kg Rice, Cooking Oil' : 'e.g. Partial payment / Full payment'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              />
            </div>

            {/* Date & Time Picker */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <Calendar className="w-3 h-3" /> Date
                </label>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Time
                </label>
                <input
                  type="time"
                  required
                  value={transactionTime}
                  onChange={(e) => setTransactionTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-gray-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-[2] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                type === 'credit' 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                  : 'bg-green-600 hover:bg-green-700 shadow-green-200'
              }`}
            >
              {isSaving ? (
                <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

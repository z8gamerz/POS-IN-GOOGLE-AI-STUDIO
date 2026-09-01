'use client';

import { useState } from 'react';
import { Customer } from '@/lib/db/idb';
import { X, Save, ArrowUpRight, ArrowDownLeft, Coins, FileText, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface RecordTransactionProps {
  customer: Customer;
  type: 'credit' | 'payment';
  onSave: (customerId: string, amount: number, description: string, type: 'credit' | 'payment', customTimestamp?: number) => Promise<void>;
  onClose: () => void;
}

export function RecordTransaction({ customer, type, onSave, onClose }: RecordTransactionProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactionTime, setTransactionTime] = useState(format(new Date(), 'HH:mm'));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await onSave(customer.id, parseFloat(amount), description.trim(), type, customTimestamp);
      onClose();
    } catch (error) {
      console.error('Record failed:', error);
      setError('Failed to save transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white ${type === 'credit' ? 'bg-red-500' : 'bg-green-500'}`}>
              {type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {type === 'credit' ? 'Record Credit' : 'Record Payment'}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">For {customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Coins className="w-3 h-3" /> Amount (₱)
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

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                <FileText className="w-3 h-3" /> Description / Items
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

'use client';

import { useState, useEffect } from 'react';
import { Customer, CreditEntry } from '@/lib/db/idb';
import { X, ArrowUpRight, ArrowDownLeft, History, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreditHistoryProps {
  customer: Customer;
  getHistory: (id: string) => Promise<CreditEntry[]>;
  onDeleteEntry?: (entryId: string, customerId: string) => Promise<void>;
  onClose: () => void;
}

export function CreditHistory({ customer, getHistory, onDeleteEntry, onClose }: CreditHistoryProps) {
  const [history, setHistory] = useState<CreditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<CreditEntry | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(customer.totalUtang);

  useEffect(() => {
    const fetchHistory = async () => {
      if (customer.id) {
        const data = await getHistory(customer.id);
        setHistory(data);
        const calculatedBalance = data.reduce((sum, e) => sum + e.amount, 0);
        setCurrentBalance(Math.max(0, calculatedBalance));
      }
      setLoading(false);
    };
    fetchHistory();
  }, [customer.id, getHistory]);

  const handleDelete = async (entry: CreditEntry) => {
    if (!onDeleteEntry) return;
    setDeletingId(entry.id);
    try {
      await onDeleteEntry(entry.id, customer.id);
      const updated = history.filter(e => e.id !== entry.id);
      setHistory(updated);
      const newBal = updated.reduce((sum, e) => sum + e.amount, 0);
      setCurrentBalance(Math.max(0, newBal));
      setConfirmDeleteEntry(null);
    } catch (err) {
      console.error('Failed to delete credit entry:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] relative"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2.5 rounded-2xl text-white shadow-md shadow-blue-200">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">{customer.name}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Credit &amp; Payment History ({history.length} records)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin border-4 border-blue-200 border-t-blue-600 rounded-full w-12 h-12 mb-4" />
              <p className="text-gray-500 font-medium">Loading ledger history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">No credit or payment records found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-100 group transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className={`p-2.5 rounded-xl shrink-0 ${entry.type === 'credit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {entry.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{entry.description || 'No description provided'}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 font-medium mt-0.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(entry.timestamp).toLocaleDateString('en-PH', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {entry.discount && entry.discount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">
                            Disc: ₱{entry.discount.toFixed(2)} {entry.discountNote ? `(${entry.discountNote})` : ''}
                          </span>
                        )}
                        {(entry.referenceNumber || entry.transactionId) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-200/80 text-gray-700 text-[10px] font-bold font-mono">
                            Ref: {entry.referenceNumber || entry.transactionId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`text-base md:text-lg font-black ${entry.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>
                      {entry.type === 'credit' ? '+' : '-'} ₱{Math.abs(entry.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>

                    {onDeleteEntry && (
                      <button
                        onClick={() => setConfirmDeleteEntry(entry)}
                        disabled={deletingId === entry.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer opacity-75 group-hover:opacity-100"
                        title="Delete this transaction record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-gray-400 font-bold uppercase tracking-widest text-[11px] block">
              Current Outstanding Balance
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {currentBalance > 0 ? 'Remaining Credit Balance' : 'Fully Settled / No Debt'}
            </span>
          </div>
          <span className={`text-2xl md:text-3xl font-black ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₱{currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Delete Confirmation Popup */}
        <AnimatePresence>
          {confirmDeleteEntry && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4"
              >
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900">Delete Transaction Entry?</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Are you sure you want to remove &quot;{confirmDeleteEntry.description}&quot; amounting to ₱{Math.abs(confirmDeleteEntry.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}?
                  </p>
                  <p className="text-[11px] text-red-500 font-bold mt-2">
                    The customer&apos;s active balance will automatically recalculate.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmDeleteEntry(null)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDeleteEntry)}
                    disabled={deletingId === confirmDeleteEntry.id}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-red-200 cursor-pointer"
                  >
                    {deletingId === confirmDeleteEntry.id ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

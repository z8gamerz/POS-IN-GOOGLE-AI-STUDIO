'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Customer } from '@/lib/db/idb';
import { useCustomers } from '@/lib/hooks/use-customers';
import { CustomerForm } from '@/components/utang/customer-form';
import { X, Check, Coins, Wallet, UserCircle, UserPlus, Layers, Search, Truck, Plus, Tag, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevice } from '@/lib/hooks/use-device';

interface PaymentModalProps {
  isOpen: boolean;
  total: number;
  branchId: string;
  onClose: () => void;
  onConfirm: (paymentDetails: {
    paymentMethod: 'cash' | 'gcash' | 'credit' | 'split';
    amountTendered?: number;
    referenceNumber?: string;
    customerId?: string;
    creditAmount?: number;
    deliveryFee?: number;
    additionalCharges?: number;
    additionalChargesNote?: string;
    discount?: number;
    discountNote?: string;
    splitDetails?: {
      cash: number;
      gcash: number;
      gcashRef?: string;
      credit: number;
    };
  }) => void;
}

export function PaymentModal({ isOpen, total, branchId, onClose, onConfirm }: PaymentModalProps) {
  const { isMobile } = useDevice();
  const { customers, addCustomer, refresh } = useCustomers(branchId);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'credit' | 'split'>('cash');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Cash details
  const [amountTendered, setAmountTendered] = useState<string>('');
  
  // GCash details
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  
  // Credit details
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // Delivery & additional charges & discount
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [additionalCharges, setAdditionalCharges] = useState<string>('');
  const [additionalChargesNote, setAdditionalChargesNote] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [discountNote, setDiscountNote] = useState<string>('');

  // Split Payment details
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitGCash, setSplitGCash] = useState<string>('');
  const [splitGCashRef, setSplitGCashRef] = useState<string>('');
  const [splitCredit, setSplitCredit] = useState<string>('');

  // Prevent double submissions on rapid clicks
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [isOpen]);

  const computedTotal = useMemo(() => {
    const delivery = parseFloat(deliveryFee) || 0;
    const addCharges = parseFloat(additionalCharges) || 0;
    const discountVal = parseFloat(discount) || 0;
    return Math.max(0, total + delivery + addCharges - discountVal);
  }, [total, deliveryFee, additionalCharges, discount]);

  // Preset discount handler
  const handleApplyPresetDiscount = (percent: number, label: string) => {
    if (percent === 0) {
      setDiscount('');
      setDiscountNote('');
    } else {
      const discountAmount = (total * (percent / 100));
      setDiscount(discountAmount.toFixed(2));
      setDiscountNote(label);
    }
  };

  // Automatically update Split Credit (unpaid/remaining balance) based on entered Cash and GCash
  useEffect(() => {
    if (paymentMethod === 'split') {
      const cashVal = parseFloat(splitCash) || 0;
      const gcashVal = parseFloat(splitGCash) || 0;
      const remaining = Math.max(0, computedTotal - cashVal - gcashVal);
      setSplitCredit(remaining.toFixed(2));
    }
  }, [splitCash, splitGCash, computedTotal, paymentMethod]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [customers, customerSearch]);

  // Validation
  const changeDue = (parseFloat(amountTendered) || 0) - computedTotal;
  const isCashValid = paymentMethod === 'cash' && changeDue >= 0;
  const isGCashValid = paymentMethod === 'gcash' && referenceNumber.trim().length > 0;
  const isCreditValid = paymentMethod === 'credit' && selectedCustomerId !== '';
  
  const isSplitValid = useMemo(() => {
    if (paymentMethod !== 'split') return false;
    const cashVal = parseFloat(splitCash) || 0;
    const gcashVal = parseFloat(splitGCash) || 0;
    const creditVal = parseFloat(splitCredit) || 0;
    
    // Check if GCash is used and has a reference number
    if (gcashVal > 0 && splitGCashRef.trim().length === 0) {
      return false;
    }
    
    // Check if Credit is used and has a customer selected
    if (creditVal > 0 && selectedCustomerId === '') {
      return false;
    }
    
    // Sum must match computedTotal exactly or be extremely close
    const sum = cashVal + gcashVal + creditVal;
    return Math.abs(sum - computedTotal) < 0.01 && sum > 0;
  }, [paymentMethod, splitCash, splitGCash, splitGCashRef, splitCredit, selectedCustomerId, computedTotal]);

  const isValid = isCashValid || isGCashValid || isCreditValid || isSplitValid;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmittingRef.current || isSubmitting) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const extraFields = {
      deliveryFee: parseFloat(deliveryFee) || 0,
      additionalCharges: parseFloat(additionalCharges) || 0,
      additionalChargesNote: additionalChargesNote.trim() || undefined,
      discount: parseFloat(discount) || 0,
      discountNote: discountNote.trim() || undefined,
    };

    try {
      if (paymentMethod === 'cash') {
        onConfirm({
          paymentMethod: 'cash',
          amountTendered: parseFloat(amountTendered),
          ...extraFields,
        });
      } else if (paymentMethod === 'gcash') {
        onConfirm({
          paymentMethod: 'gcash',
          referenceNumber: referenceNumber.trim(),
          ...extraFields,
        });
      } else if (paymentMethod === 'credit') {
        onConfirm({
          paymentMethod: 'credit',
          customerId: selectedCustomerId,
          creditAmount: computedTotal,
          ...extraFields,
        });
      } else if (paymentMethod === 'split') {
        const creditVal = parseFloat(splitCredit) || 0;
        onConfirm({
          paymentMethod: 'split',
          customerId: creditVal > 0 ? selectedCustomerId : undefined,
          creditAmount: creditVal > 0 ? creditVal : undefined,
          ...extraFields,
          splitDetails: {
            cash: parseFloat(splitCash) || 0,
            gcash: parseFloat(splitGCash) || 0,
            gcashRef: splitGCashRef.trim() || undefined,
            credit: creditVal,
          }
        });
      }
      onClose();
    } finally {
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 500);
    }
  };

  const handleQuickAddCustomer = async (customerData: any) => {
    try {
      await addCustomer(customerData);
      await refresh();
      // Auto-select newly created customer
      setTimeout(() => {
        const matching = customers.find(c => c.name.toLowerCase() === customerData.name.toLowerCase());
        if (matching) setSelectedCustomerId(matching.id);
      }, 300);
      setIsAddingCustomer(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
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
        className="relative bg-white w-full max-w-lg rounded-t-[2.25rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] z-10"
      >
        {/* Mobile Drag Indicator */}
        {isMobile && (
          <div className="w-full pt-3 pb-1 flex justify-center items-center bg-orange-50/50">
            <div className="w-12 h-1.5 bg-orange-200 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between bg-orange-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2.5 rounded-2xl text-white shadow-md shadow-orange-100">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">Select Payment</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Complete purchase transaction</p>
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
          {/* Total display breakdown */}
          <div className="bg-orange-50/20 p-5 rounded-3xl border border-orange-100/50 space-y-2">
            <div className="flex justify-between text-xs text-gray-500 font-bold">
              <span>Items Subtotal:</span>
              <span>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Truck className="w-3 h-3 text-orange-500" /> Delivery Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:border-orange-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Plus className="w-3 h-3 text-orange-500" /> Add. Charges
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:border-orange-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {(parseFloat(additionalCharges) > 0) && (
              <div className="pt-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">
                  Charge Reason / Note
                </label>
                <input
                  type="text"
                  value={additionalChargesNote}
                  onChange={(e) => setAdditionalChargesNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:border-orange-500 outline-none transition-all"
                  placeholder="e.g. Rush packing, handling fee..."
                />
              </div>
            )}

            {/* Discount Section under Delivery Fee & Additional Charges */}
            <div className="pt-2 border-t border-orange-100/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-orange-500" /> Discount
                </label>
                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(0, '')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${!discount || parseFloat(discount) === 0 ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(5, '5% Promo Discount')}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-orange-100/80 text-orange-700 hover:bg-orange-200 transition-all"
                  >
                    5%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(10, '10% Promo Discount')}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-orange-100/80 text-orange-700 hover:bg-orange-200 transition-all"
                  >
                    10%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(20, 'Senior / PWD (20%)')}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all flex items-center gap-0.5"
                    title="Senior Citizen / PWD 20% Discount"
                  >
                    <Percent className="w-2.5 h-2.5" /> 20% Senior/PWD
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
                    className="w-full pl-7 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:border-orange-500 outline-none transition-all"
                    placeholder="Discount Amount (₱0.00)"
                  />
                </div>
                <input
                  type="text"
                  value={discountNote}
                  onChange={(e) => setDiscountNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:border-orange-500 outline-none transition-all"
                  placeholder="Reason (e.g. Senior, PWD, Promo)"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-orange-100/50">
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Total Amount Due</span>
              <span className="text-3xl font-black text-orange-600 tracking-tighter">
                ₱{computedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment Method Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'cash', label: 'Cash', icon: Coins, color: 'text-green-500 bg-green-50' },
              { id: 'gcash', label: 'GCash', icon: Wallet, color: 'text-blue-500 bg-blue-50' },
              { id: 'credit', label: 'Credit', icon: UserCircle, color: 'text-red-500 bg-red-50' },
              { id: 'split', label: 'Split Payment', icon: Layers, color: 'text-purple-500 bg-purple-50' },
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id as any);
                  }}
                  className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-3 transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/20 shadow-md shadow-orange-100/50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`p-2 rounded-xl self-start ${method.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`font-black text-xs uppercase tracking-wider ${isSelected ? 'text-orange-600' : 'text-gray-500'}`}>
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic input sections based on selected payment method */}
          <AnimatePresence mode="wait">
            {paymentMethod === 'cash' && (
              <motion.div
                key="cash-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    Cash Tendered
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      className="w-full pl-10 pr-6 py-4 bg-white rounded-2xl border-2 border-gray-100 text-2xl font-black text-gray-900 focus:border-orange-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {parseFloat(amountTendered) > 0 && (
                  <div className={`p-5 rounded-2xl flex justify-between items-center ${changeDue >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                    <span className={`text-xs font-black uppercase tracking-widest ${changeDue >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {changeDue >= 0 ? 'Change Due' : 'Short / Remaining'}
                    </span>
                    <span className={`text-xl font-black ${changeDue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₱{Math.abs(changeDue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {paymentMethod === 'gcash' && (
              <motion.div
                key="gcash-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">
                    GCash Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-5 py-4 bg-white rounded-2xl border-2 border-gray-100 font-bold text-gray-800 focus:border-orange-500 outline-none transition-all"
                    placeholder="e.g. 5012 3456 7890"
                  />
                  <p className="text-[10px] text-gray-400 font-bold mt-1.5 uppercase tracking-wide">
                    Reference number is mandatory for audit and compliance.
                  </p>
                </div>
              </motion.div>
            )}

            {paymentMethod === 'credit' && (
              <motion.div
                key="credit-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
                    Choose Customer (Credit)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomer(true)}
                    className="flex items-center gap-1.5 text-xs font-black text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    New Customer
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer by name..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50">
                  {filteredCustomers.length === 0 ? (
                    <p className="p-4 text-center text-xs text-gray-400 font-bold uppercase">No customers match search</p>
                  ) : (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`w-full p-3.5 flex justify-between items-center text-left text-sm transition-colors hover:bg-gray-50 ${selectedCustomerId === c.id ? 'bg-orange-50/50' : ''}`}
                      >
                        <div>
                          <p className="font-bold text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400 font-bold">{c.contact || 'No contact'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Bal:</p>
                          <p className={`font-black text-xs ${c.totalUtang > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            ₱{c.totalUtang.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {paymentMethod === 'split' && (
              <motion.div
                key="split-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-4"
              >
                {/* Cash Input */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                      Cash Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white rounded-xl border border-gray-200 font-bold focus:border-orange-500 outline-none transition-all text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* GCash Input */}
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                      GCash Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        value={splitGCash}
                        onChange={(e) => setSplitGCash(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white rounded-xl border border-gray-200 font-bold focus:border-orange-500 outline-none transition-all text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* GCash Reference Number (Required only if GCash amount is entered) */}
                {(parseFloat(splitGCash) || 0) > 0 && (
                  <div>
                    <label className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1.5 block">
                      GCash Reference Number
                    </label>
                    <input
                      type="text"
                      required
                      value={splitGCashRef}
                      onChange={(e) => setSplitGCashRef(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-orange-500 outline-none transition-all text-sm font-bold"
                      placeholder="Enter 13-digit Reference"
                    />
                  </div>
                )}

                {/* Remaining Balance (automatically computed as Credit) */}
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-purple-800 uppercase tracking-widest block mb-0.5">Remaining Balance (Credit)</span>
                    <span className="text-xs text-purple-600 font-bold">This will automatically be recorded as customer credit</span>
                  </div>
                  <span className="text-xl font-black text-purple-700">
                    ₱{(parseFloat(splitCredit) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* If Credit is active, force customer selection */}
                {(parseFloat(splitCredit) || 0) > 0 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-purple-600 uppercase tracking-widest block">
                        Select Customer for Credit
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomer(true)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-green-600 hover:text-green-700 bg-green-50 px-2.5 py-1 rounded-xl transition-all"
                      >
                        <UserPlus className="w-3 h-3" />
                        Quick Add
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customer by name..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-xs font-medium"
                      />
                    </div>

                    <div className="max-h-32 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                      {filteredCustomers.length === 0 ? (
                        <p className="p-3 text-center text-[10px] text-gray-400 font-bold uppercase">No customers match search</p>
                      ) : (
                        filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCustomerId(c.id)}
                            className={`w-full p-3 flex justify-between items-center text-left text-xs transition-colors hover:bg-gray-50 ${selectedCustomerId === c.id ? 'bg-orange-50/50' : ''}`}
                          >
                            <span className="font-bold text-gray-800">{c.name}</span>
                            <span className="text-[10px] text-red-600 font-black">
                              ₱{c.totalUtang.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error display */}
          {paymentMethod === 'split' && !isSplitValid && (splitCash || splitGCash) && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-wider leading-relaxed border border-red-100">
              ❌ Split amounts must sum to exact total ₱{computedTotal.toFixed(2)}. Current Sum: ₱{( (parseFloat(splitCash) || 0) + (parseFloat(splitGCash) || 0) + (parseFloat(splitCredit) || 0) ).toFixed(2)}. 
              { (parseFloat(splitGCash) || 0) > 0 && splitGCashRef.trim().length === 0 && " GCash reference is required." }
              { (parseFloat(splitCredit) || 0) > 0 && selectedCustomerId === '' && " Customer selection is required for credit." }
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 min-h-[48px] py-3.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`w-full sm:flex-[2] min-h-[48px] py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all font-black uppercase text-xs tracking-wider cursor-pointer border-none ${
                isValid && !isSubmitting
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-100'
                  : 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" />
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>CONFIRM PAYMENT</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Quick Add Customer Form */}
      <AnimatePresence>
        {isAddingCustomer && (
          <CustomerForm
            onSave={handleQuickAddCustomer}
            onClose={() => setIsAddingCustomer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

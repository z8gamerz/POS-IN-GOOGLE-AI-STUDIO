'use client';

import { useState, useMemo, useEffect } from 'react';
import { Product, Supplier, RestockItem } from '@/lib/db/idb';
import { X, Plus, Trash2, Search, Save, Package, Truck, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDevice } from '@/lib/hooks/use-device';

interface RestockFormProps {
  products: Product[];
  suppliers: Supplier[];
  onSave: (supplierId: string, items: RestockItem[], totalCost: number, referenceNumber?: string, notes?: string) => void;
  onClose: () => void;
}

export function RestockForm({ products, suppliers, onSave, onClose }: RestockFormProps) {
  const { isMobile } = useDevice();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [products, searchQuery]
  );

  const totalCost = useMemo(() => 
    restockItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0),
    [restockItems]
  );

  const addItem = (product: Product) => {
    if (restockItems.find(item => item.productId === product.id)) return;
    setRestockItems([...restockItems, {
      productId: product.id,
      name: product.name,
      quantity: 1,
      costPrice: product.cost || 0
    }]);
  };

  const removeItem = (productId: string) => {
    setRestockItems(restockItems.filter(item => item.productId !== productId));
  };

  const updateItem = (productId: string, field: keyof RestockItem, value: any) => {
    setRestockItems(restockItems.map(item => 
      item.productId === productId ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || restockItems.length === 0) return;
    onSave(selectedSupplierId, restockItems, totalCost, referenceNumber, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden overscroll-contain">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
      />

      <motion.div
        initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative bg-white rounded-t-[2.25rem] sm:rounded-[3rem] shadow-2xl w-full max-w-5xl h-[92dvh] sm:h-[90vh] flex flex-col overflow-hidden z-10"
      >
        {isMobile && (
          <div className="w-full pt-3 pb-1 flex justify-center items-center bg-gray-50/50">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-indigo-600 p-2.5 sm:p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">Record Restock</h3>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Add items to your inventory</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] p-2 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Sub-tabs */}
        {isMobile && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-100/70 border-b border-gray-100 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('products')}
              className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-none ${
                mobileTab === 'products' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 bg-transparent'
              }`}
            >
              <Package className="w-4 h-4" />
              Products ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-none ${
                mobileTab === 'cart' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 bg-transparent'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Restock Cart ({restockItems.length})
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Side: Product Selector */}
          <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/30 ${isMobile && mobileTab !== 'products' ? 'hidden' : 'flex'}`}>
            <div className="p-4 sm:p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold shadow-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[44px]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0 space-y-2.5 overscroll-contain">
              {filteredProducts.map(product => {
                const isSelected = !!restockItems.find(item => item.productId === product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItem(product)}
                    disabled={isSelected}
                    className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all text-left group min-h-[48px] cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-indigo-200 opacity-60' 
                        : 'bg-white border-gray-100 hover:border-indigo-500 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <p className="font-black text-gray-900 text-sm leading-tight">{product.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Stock: {product.stock}</p>
                    </div>
                    <Plus className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-gray-300 group-hover:text-indigo-600'} transition-colors shrink-0`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side: Restock List */}
          <div className={`flex-1 flex flex-col bg-white overflow-hidden ${isMobile && mobileTab !== 'cart' ? 'hidden' : 'flex'}`}>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Supplier *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[44px]"
                  >
                    <option value="" disabled>Select a supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Reference Number</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Invoice or Receipt #"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 sm:py-3.5 text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 sm:mb-6 pr-1 overscroll-contain">
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {restockItems.map(item => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-gray-50 p-3.5 sm:p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                          <p className="text-xs text-indigo-600 font-bold mt-0.5">Subtotal: ₱{(item.quantity * item.costPrice).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.productId, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-16 bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 min-h-[38px]"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400">Cost:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.costPrice}
                              onChange={(e) => updateItem(item.productId, 'costPrice', parseFloat(e.target.value) || 0)}
                              className="w-24 bg-white border border-gray-200 rounded-xl px-2 py-1.5 font-bold text-sm focus:ring-2 focus:ring-indigo-500 min-h-[38px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="min-w-[38px] min-h-[38px] p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border-none flex items-center justify-center bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {restockItems.length === 0 && (
                    <div className="py-12 sm:py-20 text-center">
                      <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-300">
                        <Package className="w-8 h-8" />
                      </div>
                      <p className="text-gray-400 font-bold text-sm">Select products to add to restock list</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-safe">
                <div className="w-full md:w-1/2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all min-h-[42px]"
                    placeholder="Optional notes about this restock..."
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Cost</p>
                    <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">₱{totalCost.toLocaleString()}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={restockItems.length === 0 || !selectedSupplierId}
                    className="min-h-[48px] bg-gray-900 text-white font-black px-6 sm:px-8 py-3 rounded-2xl shadow-xl hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-gray-900 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    <Save className="w-4 h-4" />
                    Complete Restock
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


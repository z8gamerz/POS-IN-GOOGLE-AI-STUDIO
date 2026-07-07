'use client';

import { useState, useMemo, useEffect } from 'react';
import { useProducts } from '@/lib/hooks/use-products';
import { useCart } from '@/lib/hooks/use-cart';
import { useTransactions } from '@/lib/hooks/use-transactions';
import { useTicket } from '@/lib/hooks/use-ticket';
import { useEWallet } from '@/lib/hooks/use-ewallet';
import { useBranches } from '@/lib/hooks/use-branches';
import { useStore } from '@/lib/hooks/use-store';
import { useCustomers } from '@/lib/hooks/use-customers';
import { useReceipt } from '@/lib/context/receipt-context';
import { Product } from '@/lib/db/idb';
import { auditService } from '@/lib/services/audit-service';
import { Header } from '@/components/layout/header';
import { QuickAdd } from '@/components/pos/quick-add';
import { EWalletModal } from '@/components/pos/ewallet-modal';
import { ProductCard } from '@/components/pos/product-card';
import { CartItem } from '@/components/pos/cart-item';
import { CheckoutSummary } from '@/components/pos/checkout-summary';
import { SuccessOverlay } from '@/components/pos/success-overlay';
import { WeightModal } from '@/components/pos/weight-modal';
import { PaymentModal } from '@/components/pos/payment-modal';
import { 
  Search, 
  ShoppingCart, 
  ArrowLeft,
  PackageOpen,
  X,
  Filter,
  History,
  Wallet,
  MapPin,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { AuthGuard } from '@/components/auth/auth-guard';

const getCategoryEmoji = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('coffee')) return '☕';
  if (cat.includes('pastry') || cat.includes('bread') || cat.includes('bake')) return '🥐';
  if (cat.includes('food') || cat.includes('meal') || cat.includes('rice')) return '🥪';
  if (cat.includes('iced') || cat.includes('cold') || cat.includes('smoothie')) return '🧊';
  if (cat.includes('salad') || cat.includes('veg')) return '🥗';
  if (cat.includes('drink') || cat.includes('soda') || cat.includes('beverage')) return '🥤';
  if (cat.includes('snack') || cat.includes('chip') || cat.includes('cookie')) return '🍿';
  if (cat.includes('grocer') || cat.includes('canned')) return '🛒';
  return '📦';
};

export default function POSPage() {
  const { currentBranchId, currentBranch, loading: loadingBranches } = useBranches();
  const { store, getNextORNumber, products, addProduct } = useStore();
  const { updateProduct, refresh } = useProducts(currentBranchId || undefined);
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, total } = useCart();
  const { addTransaction } = useTransactions(currentBranchId || undefined);
  const { currentTicket, rotateTicket } = useTicket(currentBranchId || undefined);
  const { addTransaction: addEWalletTransaction } = useEWallet(currentBranchId || undefined);
  const { customers, recordCredit } = useCustomers(currentBranchId || undefined);
  const { showReceipt } = useReceipt();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEWalletOpen, setIsEWalletOpen] = useState(false);
  const [completedTicket, setCompletedTicket] = useState<string>('');
  const [showCartMobile, setShowCartMobile] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Weight-based and payment-modal states
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Reset page on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const handleProductClick = (product: Product) => {
    if (product.isWeightBased) {
      setSelectedWeightProduct(product);
      setIsWeightModalOpen(true);
    } else {
      addToCart(product);
    }
  };

  const handleWeightConfirm = (weight: number) => {
    if (selectedWeightProduct) {
      addToCart(selectedWeightProduct, weight);
    }
  };

  const triggerCheckoutPayment = () => {
    if (cart.length === 0 || isCheckingOut || !currentBranchId) return;
    setIsPaymentModalOpen(true);
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return cats.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleQuickAdd = async (name: string, price: number) => {
    if (price <= 0 || !currentBranchId) return;
    
    try {
      const newProduct = await addProduct({
        name: name || 'Quick Item',
        price,
        cost: 0,
        stock: 999,
        category: 'Quick Add',
        branchId: currentBranchId,
      });
      addToCart(newProduct);
    } catch (error) {
      console.error('Quick add failed:', error);
    }
  };

  const handleCheckout = async (paymentDetails: {
    paymentMethod: 'cash' | 'gcash' | 'credit' | 'split';
    amountTendered?: number;
    referenceNumber?: string;
    customerId?: string;
    creditAmount?: number;
    splitDetails?: {
      cash: number;
      gcash: number;
      gcashRef?: string;
      credit: number;
    };
  }) => {
    if (cart.length === 0 || isCheckingOut || !currentBranchId) return;
    
    setIsCheckingOut(true);
    try {
      const now = Date.now();
      const ticketToFinalize = currentTicket;
      const orNumber = await getNextORNumber();
      
      // Calculate VAT if enabled
      let vatableSales = 0;
      let vatAmount = 0;
      if (store?.taxType === 'VAT') {
        const rate = (store.vatRate || 12) / 100;
        vatableSales = total / (1 + rate);
        vatAmount = total - vatableSales;
      }

      // Fetch customer name for receipt printing
      let customerName = '';
      if (paymentDetails.customerId) {
        const foundCust = customers.find(c => c.id === paymentDetails.customerId);
        if (foundCust) customerName = foundCust.name;
      }

      const isCredit = paymentDetails.paymentMethod === 'credit';
      const isSplitWithCredit = paymentDetails.paymentMethod === 'split' && (paymentDetails.splitDetails?.credit || 0) > 0;
      const isTransactionPaid = !isCredit && !isSplitWithCredit;
      const initialRemainingCredit = isCredit ? total : (isSplitWithCredit ? paymentDetails.splitDetails?.credit : undefined);

      // 1. Create transaction as a ticket
      await addTransaction({
        ticketNumber: ticketToFinalize,
        orNumber,
        items: cart,
        total,
        vatableSales,
        vatAmount,
        taxType: store?.taxType || 'NON-VAT',
        timestamp: now,
        branchId: currentBranchId,
        paymentMethod: paymentDetails.paymentMethod,
        customerId: paymentDetails.customerId || undefined,
        referenceNumber: paymentDetails.referenceNumber || undefined,
        creditAmount: paymentDetails.creditAmount || undefined,
        splitDetails: paymentDetails.splitDetails || undefined,
        isPaid: isTransactionPaid,
        remainingCreditBalance: initialRemainingCredit,
      });

      await auditService.log('TRANSACTION_COMPLETE', JSON.stringify({
        ticketNumber: ticketToFinalize,
        orNumber,
        total,
        itemsCount: cart.length,
        paymentMethod: paymentDetails.paymentMethod,
        customerId: paymentDetails.customerId || undefined
      }));

      // 2. Update stock
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await updateProduct({
            ...product,
            stock: Math.max(0, product.stock - item.quantity),
            updatedAt: now,
          });
        }
      }

      // 3. Record Credit / Utang balance if applicable
      if (paymentDetails.creditAmount && paymentDetails.customerId) {
        await recordCredit(
          paymentDetails.customerId,
          paymentDetails.creditAmount,
          `POS Purchase - Ticket ${ticketToFinalize}`,
          'credit'
        );
      }

      setCompletedTicket(ticketToFinalize);
      showReceipt({
        ticketNumber: ticketToFinalize,
        orNumber,
        timestamp: now,
        items: [...cart],
        total,
        vatableSales,
        vatAmount,
        taxType: store?.taxType || 'NON-VAT',
        paymentMethod: paymentDetails.paymentMethod,
        type: 'sales',
        referenceNumber: paymentDetails.referenceNumber || (paymentDetails.splitDetails?.gcashRef),
        customerName: customerName,
        splitDetails: paymentDetails.splitDetails
      }, async () => {
        // Automatically create a new empty ticket by rotating after receipt is closed
        await rotateTicket();
      });
      
      clearCart();
      setShowCartMobile(false);
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleEWalletSave = async (data: any) => {
    if (!currentBranchId) return;
    const now = Date.now();
    const ticketNum = `EW-${Math.floor(1000 + Math.random() * 9000)}`;
    const orNumber = await getNextORNumber();
    
    await addEWalletTransaction({
      ...data,
      orNumber,
      branchId: currentBranchId,
    });

    showReceipt({
      ticketNumber: ticketNum,
      orNumber,
      timestamp: now,
      items: [{ name: `${data.type.replace('_', ' ')} - ${data.method}`, qty: 1, price: data.amount }],
      total: data.amount,
      paymentMethod: 'e-wallet',
      type: 'ewallet',
      ewalletDetails: {
        type: data.type.replace('_', ' '),
        method: data.method,
        fee: data.fee,
        customerName: data.customerName,
        referenceNumber: data.referenceNumber
      }
    });

    await auditService.log('TRANSACTION_COMPLETE', JSON.stringify({
      ticketNumber: currentTicket,
      orNumber,
      total: data.amount + data.fee,
      type: 'ewallet',
      ewalletType: data.type,
      method: data.method,
      paymentMethod: 'e-wallet'
    }));
    
    setIsEWalletOpen(false);
  };

  if (!loadingBranches && !currentBranchId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center border border-gray-100 shadow-xl shadow-gray-200/50">
            <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-red-600">
              <MapPin className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-4">No Branch Access</h2>
            <p className="text-gray-500 font-medium leading-relaxed mb-8">
              You haven&apos;t been assigned to any branches yet. Please contact your administrator to get access.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Header ticketNumber={currentTicket} />
        
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Product Selection Area */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Link 
                      href="/"
                      className="p-3 bg-white hover:bg-gray-50 rounded-2xl transition-all text-gray-400 hover:text-gray-900 border border-gray-100 shadow-sm"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Checkout</h2>
                        {currentBranch && (
                          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            {currentBranch.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select items for transaction</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <QuickAdd onAdd={handleQuickAdd} />
                    <button
                      onClick={() => setIsEWalletOpen(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all text-white shadow-lg shadow-blue-100 font-black text-xs uppercase tracking-widest"
                    >
                      <Wallet className="w-4 h-4" />
                      E-Wallet
                    </button>
                    <Link
                      href="/pos/history"
                      className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 rounded-2xl transition-all text-gray-900 border border-gray-100 shadow-sm font-black text-xs uppercase tracking-widest"
                    >
                      <History className="w-4 h-4" />
                      History
                    </Link>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1 flex items-center">
                    <input
                      id="pos-search-input"
                      type="text"
                      placeholder="Search products or categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-6 pr-28 py-4 bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-lg font-medium"
                    />
                    <button 
                      onClick={() => {
                        const inputEl = document.getElementById('pos-search-input');
                        if (inputEl) inputEl.focus();
                      }}
                      className="absolute right-3 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Search className="w-4 h-4" />
                      Search
                    </button>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full md:w-auto px-6 py-4 bg-white hover:bg-gray-50 border-2 border-gray-100 rounded-[2rem] shadow-sm font-black text-xs uppercase tracking-wider transition-all flex items-center justify-between gap-4 cursor-pointer min-w-[220px]"
                    >
                      <div className="flex items-center gap-2 text-gray-700">
                        <Filter className="w-4 h-4 text-orange-500" />
                        <span>
                          {selectedCategory ? `${getCategoryEmoji(selectedCategory)} ${selectedCategory}` : '✨ All Categories'}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCategoryDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsCategoryDropdownOpen(false)} 
                        />
                        <div className="absolute right-0 mt-2 w-full md:w-[260px] bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 py-2 z-20 overflow-hidden max-h-[300px] overflow-y-auto">
                          <button
                            onClick={() => {
                              setSelectedCategory(null);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-6 py-3.5 text-left font-black text-xs uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer ${
                              !selectedCategory 
                                ? 'bg-orange-50 text-orange-600' 
                                : 'hover:bg-gray-50 text-gray-400'
                            }`}
                          >
                            <span>✨</span>
                            <span>All Categories</span>
                          </button>
                          {categories.map(cat => {
                            const emoji = getCategoryEmoji(cat);
                            return (
                              <button
                                key={cat}
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full px-6 py-3.5 text-left font-black text-xs uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer ${
                                  selectedCategory === cat
                                    ? 'bg-orange-50 text-orange-600' 
                                    : 'hover:bg-gray-50 text-gray-400'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="truncate">{cat}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
  
              {filteredProducts.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200 shadow-inner">
                  <PackageOpen className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">No products found</h3>
                  <p className="text-gray-400 mt-2 font-medium">Try searching for something else or add a new product.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-6 ${totalPages <= 1 ? 'pb-24 lg:pb-0' : ''}`}>
                    {paginatedProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onAdd={handleProductClick} 
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-24 lg:pb-8">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Showing {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)}-
                        {Math.min(filteredProducts.length, currentPage * itemsPerPage)} of {filteredProducts.length} items
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-100 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-600 transition-all cursor-pointer"
                        >
                          Prev
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                            if (
                              totalPages > 6 &&
                              pNum !== 1 &&
                              pNum !== totalPages &&
                              Math.abs(pNum - currentPage) > 1
                            ) {
                              if (pNum === 2 && currentPage > 3) {
                                return <span key="ellipsis-start" className="text-gray-400 px-1 font-bold">...</span>;
                              }
                              if (pNum === totalPages - 1 && currentPage < totalPages - 2) {
                                return <span key="ellipsis-end" className="text-gray-400 px-1 font-bold">...</span>;
                              }
                              return null;
                            }
                            return (
                              <button
                                key={pNum}
                                onClick={() => setCurrentPage(pNum)}
                                className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all flex items-center justify-center cursor-pointer ${
                                  currentPage === pNum
                                    ? 'bg-orange-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                                }`}
                              >
                                {pNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-100 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-600 transition-all cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
  
          {/* Desktop Cart Sidebar */}
          <div className="hidden lg:flex w-[450px] bg-white border-l-2 border-gray-100 flex-col shadow-2xl relative z-10">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-orange-600 p-3 rounded-2xl text-white shadow-lg shadow-orange-100">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Cart</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Review items before checkout</p>
                </div>
              </div>
              <span className="bg-orange-100 text-orange-600 text-sm font-black px-4 py-1.5 rounded-full">
                {cart.reduce((acc, item) => acc + item.quantity, 0)} ITEMS
              </span>
            </div>
  
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <AnimatePresence mode="popLayout">
                {cart.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center text-gray-300"
                  >
                    <div className="bg-gray-50 p-8 rounded-[3rem] mb-6">
                      <ShoppingCart className="w-16 h-16 opacity-20" />
                    </div>
                    <p className="font-black text-xl text-gray-400 uppercase tracking-tight">Cart is empty</p>
                    <p className="text-sm mt-2 max-w-[200px] mx-auto">Select products from the grid to start a transaction</p>
                  </motion.div>
                ) : (
                  cart.map((item) => (
                    <CartItem 
                      key={item.productId} 
                      item={item} 
                      onUpdateQuantity={updateQuantity} 
                      onRemove={removeFromCart} 
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
  
            <CheckoutSummary 
              total={total} 
              itemCount={cart.length} 
              onCheckout={triggerCheckoutPayment} 
              disabled={cart.length === 0 || isCheckingOut} 
              isCheckingOut={isCheckingOut} 
            />
          </div>
  
          {/* Mobile Cart Toggle Button */}
          <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCartMobile(true)}
              className="w-full bg-gray-900 text-white p-6 rounded-[2rem] flex items-center justify-between shadow-2xl shadow-gray-400"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900">
                      {cart.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </div>
                <span className="font-black text-lg tracking-tight uppercase">View Cart</span>
              </div>
              <span className="text-2xl font-black">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </motion.button>
          </div>
  
          {/* Mobile Cart Overlay */}
          <AnimatePresence>
            {showCartMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col justify-end"
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="bg-white rounded-t-[3rem] max-h-[90vh] flex flex-col shadow-2xl"
                >
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Your Cart</h3>
                    <button 
                      onClick={() => setShowCartMobile(false)}
                      className="p-3 bg-gray-100 rounded-2xl text-gray-500"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? (
                      <div className="py-20 text-center text-gray-400">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest">Cart is empty</p>
                      </div>
                    ) : (
                      cart.map((item) => (
                        <CartItem 
                          key={item.productId} 
                          item={item} 
                          onUpdateQuantity={updateQuantity} 
                          onRemove={removeFromCart} 
                        />
                      ))
                    )}
                  </div>
  
                  <div className="p-2">
                    <CheckoutSummary 
                      total={total} 
                      itemCount={cart.length} 
                      onCheckout={triggerCheckoutPayment} 
                      disabled={cart.length === 0 || isCheckingOut} 
                      isCheckingOut={isCheckingOut} 
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
  
        <SuccessOverlay 
          show={showSuccess} 
          onClose={() => setShowSuccess(false)}
          onViewReceipt={() => {
            setShowSuccess(false);
          }}
          title="Salamat Po!"
          message="Transaction completed successfully. Have a great day!"
          ticketNumber={completedTicket}
        />
  
        <EWalletModal
          isOpen={isEWalletOpen}
          onClose={() => setIsEWalletOpen(false)}
          onSave={handleEWalletSave}
        />

        <WeightModal
          isOpen={isWeightModalOpen}
          product={selectedWeightProduct}
          onClose={() => {
            setIsWeightModalOpen(false);
            setSelectedWeightProduct(null);
          }}
          onConfirm={handleWeightConfirm}
        />

        {currentBranchId && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            total={total}
            branchId={currentBranchId}
            onClose={() => setIsPaymentModalOpen(false)}
            onConfirm={handleCheckout}
          />
        )}
      </div>
    </AuthGuard>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCustomers } from '@/lib/hooks/use-customers';
import { useBranches } from '@/lib/hooks/use-branches';
import { useStore } from '@/lib/hooks/use-store';
import { Header } from '@/components/layout/header';
import { CreditHistory } from '@/components/utang/credit-history';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Customer, CreditEntry } from '@/lib/db/idb';
import {
  ArrowLeft,
  Search,
  Calendar,
  Download,
  Printer,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Coins,
  Receipt,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  History,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth } from 'date-fns';
import Papa from 'papaparse';

type TabType = 'all' | 'payments' | 'credit' | 'customers';

export default function UtangReportsPage() {
  const { branches, currentBranchId } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const { 
    customers, 
    loading: loadingCustomers, 
    getAllCreditHistory, 
    getCreditHistory,
    deleteCustomer,
    deleteCreditEntry 
  } = useCustomers(selectedBranchId === 'all' ? undefined : selectedBranchId);
  const { store } = useStore();

  const [allEntries, setAllEntries] = useState<CreditEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [datePreset, setDatePreset] = useState<string>('month');

  // Customer history modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  // Delete Confirmation States
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<CreditEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all credit logs
  const fetchAllHistory = async () => {
    setLoadingEntries(true);
    try {
      const branchParam = selectedBranchId === 'all' ? undefined : selectedBranchId;
      const history = await getAllCreditHistory(branchParam);
      setAllEntries(history);
    } catch (err) {
      console.error('Failed to load credit history:', err);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, [selectedBranchId]);

  const handleDeleteCustomerConfirm = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(customerToDelete.id);
      await fetchAllHistory();
      setCustomerToDelete(null);
    } catch (err) {
      console.error('Failed to delete customer:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteEntryConfirm = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCreditEntry(entryToDelete.id, entryToDelete.customerId);
      await fetchAllHistory();
      setEntryToDelete(null);
    } catch (err) {
      console.error('Failed to delete credit entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Customer Map for fast lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  // Branch Map for fast lookup
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => map.set(b.id, b.name));
    return map;
  }, [branches]);

  // Date Presets Handler
  const handleDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'today') {
      const d = format(today, 'yyyy-MM-dd');
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const d = format(subDays(today, 1), 'yyyy-MM-dd');
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'week') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'month') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  // Filtered Entries based on Date, Type, Branch, Customer, Search
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      // 1. Branch filter
      if (selectedBranchId !== 'all' && entry.branchId !== selectedBranchId) {
        return false;
      }

      // 2. Customer filter
      if (selectedCustomerId !== 'all' && entry.customerId !== selectedCustomerId) {
        return false;
      }

      // 3. Tab Type filter
      if (activeTab === 'payments' && entry.type !== 'payment') return false;
      if (activeTab === 'credit' && entry.type !== 'credit') return false;

      // 4. Date filter
      if (startDate && endDate) {
        const entryDate = new Date(entry.timestamp);
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        if (!isWithinInterval(entryDate, { start, end })) {
          return false;
        }
      }

      // 5. Search query (Customer Name, Phone, Description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const cust = customerMap.get(entry.customerId);
        const custName = cust?.name?.toLowerCase() || '';
        const custContact = cust?.contact?.toLowerCase() || '';
        const desc = entry.description?.toLowerCase() || '';
        if (!custName.includes(query) && !custContact.includes(query) && !desc.includes(query)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [allEntries, selectedBranchId, selectedCustomerId, activeTab, startDate, endDate, searchQuery, customerMap]);

  // Summary Metrics Calculation
  const metrics = useMemo(() => {
    let totalPaymentsPeriod = 0;
    let totalCreditPeriod = 0;
    let paymentCount = 0;
    let creditCount = 0;

    filteredEntries.forEach(entry => {
      if (entry.type === 'payment') {
        totalPaymentsPeriod += Math.abs(entry.amount);
        paymentCount += 1;
      } else {
        totalCreditPeriod += entry.amount;
        creditCount += 1;
      }
    });

    // Store-wide current active balances
    let totalOutstandingUtang = 0;
    let activeBorrowersCount = 0;
    customers.forEach(c => {
      if (c.totalUtang > 0) {
        totalOutstandingUtang += c.totalUtang;
        activeBorrowersCount += 1;
      }
    });

    const netFlow = totalCreditPeriod - totalPaymentsPeriod;

    return {
      totalPaymentsPeriod,
      totalCreditPeriod,
      paymentCount,
      creditCount,
      totalOutstandingUtang,
      activeBorrowersCount,
      netFlow,
    };
  }, [filteredEntries, customers]);

  // Customer Summary Breakdown List
  const customerBreakdown = useMemo(() => {
    return customers
      .filter(c => {
        if (selectedBranchId !== 'all' && c.branchId !== selectedBranchId) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return c.name.toLowerCase().includes(q) || c.contact?.toLowerCase().includes(q);
        }
        return true;
      })
      .map(cust => {
        const custEntries = allEntries.filter(e => e.customerId === cust.id);
        
        // In selected period
        const periodEntries = custEntries.filter(e => {
          if (!startDate || !endDate) return true;
          const entryDate = new Date(e.timestamp);
          return isWithinInterval(entryDate, {
            start: startOfDay(new Date(startDate)),
            end: endOfDay(new Date(endDate)),
          });
        });

        const periodBorrowed = periodEntries
          .filter(e => e.type === 'credit')
          .reduce((sum, e) => sum + e.amount, 0);

        const periodPaid = periodEntries
          .filter(e => e.type === 'payment')
          .reduce((sum, e) => sum + Math.abs(e.amount), 0);

        const allBorrowed = custEntries
          .filter(e => e.type === 'credit')
          .reduce((sum, e) => sum + e.amount, 0);

        const allPaid = custEntries
          .filter(e => e.type === 'payment')
          .reduce((sum, e) => sum + Math.abs(e.amount), 0);

        const lastActivity = custEntries.length > 0 ? custEntries[0].timestamp : cust.createdAt;

        return {
          customer: cust,
          periodBorrowed,
          periodPaid,
          allBorrowed,
          allPaid,
          currentBalance: cust.totalUtang,
          lastActivity,
        };
      })
      .sort((a, b) => b.currentBalance - a.currentBalance);
  }, [customers, allEntries, selectedBranchId, searchQuery, startDate, endDate]);

  // Export to CSV
  const handleExportCSV = () => {
    if (activeTab === 'customers') {
      const data = customerBreakdown.map(item => ({
        'Customer Name': item.customer.name,
        'Contact Number': item.customer.contact || 'N/A',
        'Branch': branchMap.get(item.customer.branchId) || 'Main',
        'Current Outstanding Balance': item.currentBalance.toFixed(2),
        'Period Utang (Borrowed)': item.periodBorrowed.toFixed(2),
        'Period Bayad (Paid)': item.periodPaid.toFixed(2),
        'Total Ever Borrowed': item.allBorrowed.toFixed(2),
        'Total Ever Paid': item.allPaid.toFixed(2),
        'Status': item.currentBalance > 0 ? 'HAS UTANG' : 'FULLY PAID',
        'Last Transaction Date': format(item.lastActivity, 'yyyy-MM-dd HH:mm'),
      }));

      const csv = Papa.unparse(data);
      downloadFile(csv, `customer-balances-report-${startDate}-to-${endDate}.csv`);
    } else {
      const data = filteredEntries.map(entry => {
        const cust = customerMap.get(entry.customerId);
        return {
          'Date & Time': format(entry.timestamp, 'yyyy-MM-dd HH:mm:ss'),
          'Customer Name': cust?.name || 'Unknown Customer',
          'Contact': cust?.contact || 'N/A',
          'Type': entry.type === 'payment' ? 'BAYAD (PAYMENT)' : 'UTANG (NEW CREDIT)',
          'Amount (PHP)': Math.abs(entry.amount).toFixed(2),
          'Description / Items': entry.description,
          'Branch': branchMap.get(entry.branchId) || 'Main',
          'Customer Current Balance': cust?.totalUtang ? cust.totalUtang.toFixed(2) : '0.00',
        };
      });

      const csv = Papa.unparse(data);
      downloadFile(csv, `utang-and-payments-report-${startDate}-to-${endDate}.csv`);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans print:bg-white print:p-0">
        <div className="print:hidden">
          <Header />
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header / Title Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm print:border-none print:shadow-none print:p-0">
              <div className="flex items-center gap-4">
                <Link
                  href="/utang"
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all text-gray-500 hover:text-gray-900 border border-gray-100 print:hidden cursor-pointer"
                  title="Back to Utang System"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-500 text-white p-1.5 rounded-xl print:hidden">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                      Utang &amp; Collection Reports
                    </h1>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">
                    Comprehensive breakdown of customer credit, collections, payments, and outstanding balances.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 print:hidden">
                <button
                  onClick={fetchAllHistory}
                  className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl border border-gray-200 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl transition-all text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print Report
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-5 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl shadow-md transition-all text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-orange-400" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Filter Controls (Date Pickers, Presets, Search, Branch, Customer) */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4 print:hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'week', label: 'Last 7 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'all', label: 'All Time' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleDatePreset(p.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        datePreset === p.id
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Date Inputs */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-xs font-bold text-gray-500">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                  />
                  <span className="text-xs font-bold text-gray-400">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => {
                      setEndDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer name, contact, notes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                {/* Customer Selector Filter */}
                <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-200">
                  <Users className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="all">All Customers</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.totalUtang > 0 ? `(Bal: ₱${c.totalUtang.toLocaleString()})` : '(Paid)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch Selector Filter */}
                <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-200">
                  <Filter className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <select
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="all">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Bayad Received */}
              <div className="bg-white p-5 rounded-3xl border border-green-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" /> Total Collections (Payments)
                  </p>
                  <p className="text-2xl font-black text-green-600">
                    ₱{metrics.totalPaymentsPeriod.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    {metrics.paymentCount} payment transactions in selected period
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <Coins className="w-6 h-6" />
                </div>
              </div>

              {/* Total New Utang Given */}
              <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-500" /> New Credit (Utang Issued)
                  </p>
                  <p className="text-2xl font-black text-red-600">
                    ₱{metrics.totalCreditPeriod.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    {metrics.creditCount} credit transactions in selected period
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>

              {/* Net Credit Movement */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Net Movement (Credit - Paid)
                  </p>
                  <p className={`text-2xl font-black ${metrics.netFlow > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                    {metrics.netFlow > 0 ? '+' : ''}₱{metrics.netFlow.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    {metrics.netFlow > 0 ? 'Total store credit increased' : 'Total store credit decreased'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${metrics.netFlow > 0 ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                  {metrics.netFlow > 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                </div>
              </div>

              {/* Total Outstanding Store Utang */}
              <div className="bg-gray-900 text-white p-5 rounded-3xl shadow-md flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Active Outstanding Balance
                  </p>
                  <p className="text-2xl font-black text-orange-400">
                    ₱{metrics.totalOutstandingUtang.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    {metrics.activeBorrowersCount} customers with active credit
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-orange-400 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2 print:hidden">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All Transactions ({filteredEntries.length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'payments'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5" /> Payments Received ({filteredEntries.filter(e => e.type === 'payment').length})
              </button>
              <button
                onClick={() => setActiveTab('credit')}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'credit'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> New Credit Issued ({filteredEntries.filter(e => e.type === 'credit').length})
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'customers'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Customer Balances Summary ({customerBreakdown.length})
              </button>
            </div>

            {/* Content Display */}
            {loadingEntries || loadingCustomers ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                <div className="animate-spin border-4 border-orange-200 border-t-orange-600 rounded-full w-10 h-10 mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-500">Loading credit reports and ledger data...</p>
              </div>
            ) : activeTab === 'customers' ? (
              /* Customer Balances Summary Table */
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Customer Balance Breakdown</h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Overview of customer accounts, total borrowed, payments made, and current balance.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-gray-400">
                    {customerBreakdown.length} Customers found
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-black uppercase tracking-widest text-gray-500">
                        <th className="py-4 px-6">Customer Name</th>
                        <th className="py-4 px-4">Contact</th>
                        <th className="py-4 px-4 text-right">Credit (Period)</th>
                        <th className="py-4 px-4 text-right">Paid (Period)</th>
                        <th className="py-4 px-6 text-right">Active Balance</th>
                        <th className="py-4 px-4 text-center">Status</th>
                        <th className="py-4 px-6 text-center print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {customerBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-400 font-bold">
                            No customers found matching the filter.
                          </td>
                        </tr>
                      ) : (
                        customerBreakdown.map(item => {
                          const hasUtang = item.currentBalance > 0;
                          return (
                            <tr key={item.customer.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-bold text-gray-900 text-sm block">
                                  {item.customer.name}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Branch: {branchMap.get(item.customer.branchId) || 'Main'}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-semibold text-gray-600">
                                {item.customer.contact || 'No Contact'}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-red-600">
                                ₱{item.periodBorrowed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-green-600">
                                ₱{item.periodPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <span className={`font-black text-sm ${hasUtang ? 'text-red-600' : 'text-green-600'}`}>
                                  ₱{item.currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    hasUtang
                                      ? 'bg-red-50 text-red-700 border border-red-100'
                                      : 'bg-green-50 text-green-700 border border-green-100'
                                  }`}
                                >
                                  {hasUtang ? (
                                    <>
                                      <AlertCircle className="w-3 h-3" /> Has Credit
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" /> Fully Paid
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center print:hidden whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setHistoryCustomer(item.customer)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    title="View Full Ledger History"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                    <span>Ledger</span>
                                  </button>
                                  <button
                                    onClick={() => setCustomerToDelete(item.customer)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                                    title="Delete customer account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Transaction Ledger Breakdown (All / Payments Only / Credit Only) */
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">
                      {activeTab === 'payments'
                        ? 'Breakdown of All Payments Received'
                        : activeTab === 'credit'
                        ? 'Breakdown of All New Credit Issued'
                        : 'Comprehensive Credit & Payment Master Ledger'}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      Chronological ledger of transactions between {startDate} and {endDate}.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-gray-400">
                    {filteredEntries.length} Records found
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-black uppercase tracking-widest text-gray-500">
                        <th className="py-4 px-6">Date &amp; Time</th>
                        <th className="py-4 px-4">Customer</th>
                        <th className="py-4 px-4 text-center">Transaction Type</th>
                        <th className="py-4 px-6 text-right">Amount (₱)</th>
                        <th className="py-4 px-6">Description / Items</th>
                        <th className="py-4 px-4">Branch</th>
                        <th className="py-4 px-6 text-center print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-gray-400 font-bold">
                            <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            No transactions found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map(entry => {
                          const cust = customerMap.get(entry.customerId);
                          const isCredit = entry.type === 'credit';
                          const entryDate = new Date(entry.timestamp);

                          return (
                            <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                              {/* Date & Time */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                <span className="font-bold text-gray-900 block">
                                  {format(entryDate, 'MMM dd, yyyy')}
                                </span>
                                <span className="text-[11px] text-gray-400 font-medium">
                                  {format(entryDate, 'hh:mm a')}
                                </span>
                              </td>

                              {/* Customer */}
                              <td className="py-4 px-4">
                                <span className="font-black text-gray-900 text-sm block">
                                  {cust?.name || 'Unknown Customer'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {cust?.contact || 'No contact'}
                                </span>
                              </td>

                              {/* Type Badge */}
                              <td className="py-4 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isCredit
                                      ? 'bg-red-50 text-red-700 border border-red-100'
                                      : 'bg-green-50 text-green-700 border border-green-100'
                                  }`}
                                >
                                  {isCredit ? (
                                    <>
                                      <ArrowUpRight className="w-3 h-3 text-red-500" /> CREDIT
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDownLeft className="w-3 h-3 text-green-500" /> PAYMENT
                                    </>
                                  )}
                                </span>
                              </td>

                              {/* Amount */}
                              <td className="py-4 px-6 text-right whitespace-nowrap">
                                <span
                                  className={`font-black text-sm ${
                                    isCredit ? 'text-red-600' : 'text-green-600'
                                  }`}
                                >
                                  {isCredit ? '+' : '-'} ₱{Math.abs(entry.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* Description / Items */}
                              <td className="py-4 px-6 text-gray-700 font-medium max-w-xs">
                                <span className="line-clamp-2">{entry.description || 'No description'}</span>
                              </td>

                              {/* Branch */}
                              <td className="py-4 px-4 text-gray-500 font-semibold whitespace-nowrap">
                                {branchMap.get(entry.branchId) || 'Main'}
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-6 text-center print:hidden whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  {cust && (
                                    <button
                                      onClick={() => setHistoryCustomer(cust)}
                                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
                                      title="View Customer Credit Ledger"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEntryToDelete(entry)}
                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                                    title="Delete this credit or payment record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Customer History Modal */}
        {historyCustomer && (
          <CreditHistory
            customer={historyCustomer}
            getHistory={getCreditHistory}
            onDeleteEntry={async (entryId, custId) => {
              await deleteCreditEntry(entryId, custId);
              await fetchAllHistory();
            }}
            onClose={() => setHistoryCustomer(null)}
          />
        )}

        {/* Customer Deletion Confirmation Modal */}
        <AnimatePresence>
          {customerToDelete && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[120]">
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
                  <h4 className="text-lg font-black text-gray-900">Delete Customer Account?</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Are you sure you want to delete the profile for <strong className="text-gray-800">{customerToDelete.name}</strong>?
                  </p>
                  {customerToDelete.totalUtang > 0 && (
                    <div className="mt-2 p-2.5 bg-red-50 rounded-xl text-red-700 text-xs font-bold">
                      This customer has a remaining balance of ₱{customerToDelete.totalUtang.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setCustomerToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCustomerConfirm}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-red-200 cursor-pointer"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Transaction Entry Deletion Confirmation Modal */}
        <AnimatePresence>
          {entryToDelete && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[120]">
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
                    Are you sure you want to remove &quot;{entryToDelete.description || 'Transaction'}&quot; amounting to <strong className="text-gray-800">₱{Math.abs(entryToDelete.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>?
                  </p>
                  <p className="text-[11px] text-red-500 font-bold mt-2">
                    The active balance will automatically recalculate.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEntryToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteEntryConfirm}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-red-200 cursor-pointer"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}

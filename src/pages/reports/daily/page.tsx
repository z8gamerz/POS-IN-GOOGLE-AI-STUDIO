'use client';

import { useReports } from '@/lib/hooks/use-reports';
import { useAuth } from '@/lib/contexts/auth-context';
import { useStore } from '@/lib/hooks/use-store';
import { Header } from '@/components/layout/header';
import { 
  Loader2, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  ShoppingBag, 
  Wallet, 
  Percent,
  Calendar,
  LayoutDashboard,
  Printer,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { downloadCSV } from '@/lib/utils';
import { useBranches } from '@/lib/hooks/use-branches';
import { AuthGuard } from '@/components/auth/auth-guard';

function DailySummaryContent() {
  const { currentBranchId, currentBranch } = useBranches();
  const { loading, getDailySummary } = useReports(currentBranchId || undefined);
  const { isCashier } = useAuth();
  const { store } = useStore();

  const summary = getDailySummary();

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const data = [
      { Metric: 'Report Date', Value: today },
      { Metric: 'Branch', Value: currentBranch?.name || 'Main Branch' },
      { Metric: 'Total Gross Sales (PHP)', Value: summary.totalSales.toFixed(2) },
      { Metric: 'Total Profit (PHP)', Value: summary.totalProfit.toFixed(2) },
      { Metric: 'Total Expenses (PHP)', Value: (summary.totalExpenses || 0).toFixed(2) },
      { Metric: 'Net Income (PHP)', Value: (summary.totalProfit - (summary.totalExpenses || 0)).toFixed(2) },
      { Metric: 'Total Transactions / Tickets', Value: summary.totalTickets.toString() },
      { Metric: 'E-Wallet Transactions', Value: summary.ewalletCount.toString() },
      { Metric: 'E-Wallet Fees Earned (PHP)', Value: summary.totalFees.toFixed(2) },
      { Metric: 'VAT Collected (PHP)', Value: summary.totalVatCollected.toFixed(2) },
      { Metric: 'VATable Sales (PHP)', Value: summary.totalVatableSales.toFixed(2) },
      { Metric: 'OR Range', Value: summary.orRange ? `${summary.orRange.start} - ${summary.orRange.end}` : 'N/A' },
    ];

    downloadCSV(data, `daily-summary-${today}.csv`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Sales',
      value: `₱${summary.totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-orange-600',
      bg: 'bg-orange-50',
      textColor: 'text-orange-900',
    },
    {
      title: 'Total Profit',
      value: `₱${summary.totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: LayoutDashboard,
      color: 'bg-emerald-600',
      bg: 'bg-emerald-50',
      textColor: 'text-emerald-900',
    },
    {
      title: 'Total Expenses',
      value: `₱${(summary.totalExpenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: 'bg-red-600',
      bg: 'bg-red-50',
      textColor: 'text-red-900',
    },
    ...(store?.taxType === 'VAT' ? [
      {
        title: 'VAT Collected',
        value: `₱${summary.totalVatCollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        icon: Percent,
        color: 'bg-rose-600',
        bg: 'bg-rose-50',
        textColor: 'text-rose-900',
      },
      {
        title: 'VATable Sales',
        value: `₱${summary.totalVatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        icon: Percent,
        color: 'bg-amber-600',
        bg: 'bg-amber-50',
        textColor: 'text-amber-900',
      }
    ] : []),
    {
      title: 'Total Tickets',
      value: summary.totalTickets.toString(),
      icon: ShoppingBag,
      color: 'bg-blue-600',
      bg: 'bg-blue-50',
      textColor: 'text-blue-900',
    },
    {
      title: 'E-Wallet Transactions',
      value: summary.ewalletCount.toString(),
      icon: Wallet,
      color: 'bg-indigo-600',
      bg: 'bg-indigo-50',
      textColor: 'text-indigo-900',
    },
    {
      title: 'Total Fees Earned',
      value: `₱${summary.totalFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: Percent,
      color: 'bg-purple-600',
      bg: 'bg-purple-50',
      textColor: 'text-purple-900',
    },
    ...(summary.orRange ? [
      {
        title: 'OR Range',
        value: `${summary.orRange.start} - ${summary.orRange.end.split('-')[1]}`,
        icon: ShoppingBag,
        color: 'bg-slate-600',
        bg: 'bg-slate-50',
        textColor: 'text-slate-900',
      }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans print:bg-white print:p-0">
      <div className="print:hidden">
        <Header />
      </div>

      {/* Printable Report Header for Official Print/PDF */}
      <div className="hidden print:block p-8 border-b-2 border-gray-900 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">{store?.name || 'Sari-Sari Store POS'}</h1>
            <p className="text-xs text-gray-600 font-medium">{store?.address || 'Store Location'}</p>
            {store?.tin && <p className="text-xs text-gray-600">TIN: {store.tin}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black uppercase text-gray-900 tracking-wider">End of Day Daily Summary</h2>
            <p className="text-xs text-gray-700 font-bold mt-1">Date: {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-[10px] text-gray-500">Printed on: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 md:p-12 overflow-y-auto print:overflow-visible print:p-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 print:hidden">
            <div className="flex items-center gap-6">
              <Link 
                href="/"
                className="p-4 bg-white hover:bg-gray-50 rounded-[1.5rem] transition-all text-gray-400 hover:text-gray-900 border border-gray-100 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight">Daily Summary</h2>
                <p className="text-lg text-gray-500 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="bg-white hover:bg-gray-100 text-gray-800 font-black px-5 py-4 rounded-2xl flex items-center justify-center gap-2 border border-gray-200 transition-all active:scale-95 text-xs uppercase tracking-widest cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                Print
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-gray-900 text-white font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all active:scale-95 text-xs uppercase tracking-widest cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-400" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {cards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${card.bg} p-10 rounded-[3rem] border border-transparent hover:border-white hover:shadow-2xl transition-all flex flex-col justify-between h-full group`}
              >
                <div className={`${card.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-8 text-white shadow-xl group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-gray-500 font-black text-xs uppercase tracking-widest mb-2">{card.title}</p>
                  <p className={`${card.textColor} font-black text-4xl tracking-tight`}>{card.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 p-8 bg-gray-900 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600 rounded-full -mr-32 -mt-32 opacity-20 blur-3xl" />
             <p className="text-gray-400 font-black text-xs uppercase tracking-widest mb-4 relative z-10">End of Day Summary</p>
             <h3 className="text-2xl font-bold mb-8 relative z-10 tracking-tight">Great job today! Your store is performing well.</h3>
             {!isCashier ? (
               <Link 
                 href="/reports"
                 className="inline-flex items-center gap-3 bg-white text-gray-900 font-black px-12 py-5 rounded-[2rem] hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest text-sm relative z-10"
               >
                 View Full Reports Dashboard
               </Link>
             ) : (
               <Link 
                 href="/pos"
                 className="inline-flex items-center gap-3 bg-white text-gray-900 font-black px-12 py-5 rounded-[2rem] hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest text-sm relative z-10"
               >
                 Go to POS Checkout
               </Link>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DailySummaryPage() {
  return (
    <AuthGuard>
      <DailySummaryContent />
    </AuthGuard>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { dbUtil, StorageStats, STORES } from '@/lib/db/idb';
import { Database, Zap, HardDrive, CheckCircle2, ShieldCheck, RefreshCw, Sparkles, Layers, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export function DatabaseHealth() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{ prunedQueue: number; prunedAuditLogs: number; freedRecords: number } | null>(null);
  const [persisting, setPersisting] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await dbUtil.getStorageStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to get storage stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimizeResult(null);
    try {
      const res = await dbUtil.optimizeAndPrune();
      setOptimizeResult(res);
      await fetchStats();
      setTimeout(() => setOptimizeResult(null), 6000);
    } catch (err) {
      console.error('Failed to optimize database:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleRequestPersistence = async () => {
    setPersisting(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        const isGranted = await navigator.storage.persist();
        if (isGranted) {
          await fetchStats();
        }
      }
    } catch (e) {
      console.error('Persistence error:', e);
    } finally {
      setPersisting(false);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-[2.5rem] border border-gray-100 p-8 md:p-10 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Database Indexing & Health</h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Active Indexing
              </span>
            </div>
            <p className="text-gray-500 font-medium text-sm mt-0.5">
              High-performance IndexedDB secondary indexes prevent memory exhaustion and browser lockups.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl transition-all border border-gray-200/60 cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOptimize}
            disabled={optimizing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-3 rounded-2xl transition-all flex items-center gap-2 text-sm shadow-md shadow-emerald-200 cursor-pointer border-none"
          >
            <Sparkles className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
            {optimizing ? 'Optimizing...' : 'Optimize & Clean'}
          </button>
        </div>
      </div>

      {optimizeResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            Database optimized: {optimizeResult.freedRecords} stale entries pruned. All store secondary indexes are healthy.
          </div>
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">Storage Usage</span>
            <HardDrive className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            {stats ? stats.usageFormatted : '...'}
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(1, stats?.percentUsed || 0.1)}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 font-bold mt-1.5 block">
            {stats ? `${stats.percentUsed.toFixed(2)}% of ${stats.quotaFormatted}` : 'Calculating...'}
          </span>
        </div>

        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">IndexedDB Indexes</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            {stats ? `${stats.activeIndexesCount} Indexes` : '...'}
          </p>
          <span className="text-[11px] text-emerald-600 font-black mt-3 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 inline" /> O(log N) Indexed Lookups
          </span>
        </div>

        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">Total Records</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            {stats ? stats.totalRecords.toLocaleString() : '...'}
          </p>
          <span className="text-[11px] text-gray-400 font-bold mt-3 block">
            Across 15 specialized tables
          </span>
        </div>

        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider">Persistence Status</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            {stats?.isPersisted ? 'Guaranteed' : 'Standard'}
          </p>
          {!stats?.isPersisted ? (
            <button
              type="button"
              onClick={handleRequestPersistence}
              disabled={persisting}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-black mt-3 underline block cursor-pointer border-none bg-transparent p-0"
            >
              {persisting ? 'Requesting...' : 'Lock Storage from Eviction'}
            </button>
          ) : (
            <span className="text-[11px] text-purple-600 font-bold mt-3 block">
              Protected from auto-clearing
            </span>
          )}
        </div>
      </div>

      {/* Store Breakdown */}
      {stats && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gray-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Store Records & Index Distribution</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(stats.storeCounts).map(([storeName, count]) => (
              <div key={storeName} className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 text-left">
                <p className="text-[11px] font-bold text-gray-500 truncate capitalize">
                  {storeName.replace('_', ' ')}
                </p>
                <p className="text-sm font-black text-gray-900 mt-0.5">
                  {count.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

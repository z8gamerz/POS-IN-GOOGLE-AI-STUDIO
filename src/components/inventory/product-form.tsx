'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/db/idb';
import { X, Save, Package, Tag, Hash, Coins, MapPin, AlertCircle, Image as ImageIcon, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useBranches } from '@/lib/hooks/use-branches';
import { useCategories } from '@/lib/hooks/use-categories';

interface ProductFormProps {
  product?: Product | null;
  onSave: (product: any) => Promise<void>;
  onClose: () => void;
}

export function ProductForm({ product, onSave, onClose }: ProductFormProps) {
  const { branches, currentBranchId } = useBranches();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    cost: '',
    stock: '',
    category: '',
    barcode: '',
    branchId: '',
    imageUrl: '',
    lowStockThreshold: '5',
  });
  const { categories } = useCategories(formData.branchId || currentBranchId || undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isWeightBased, setIsWeightBased] = useState(false);
  const [imagePreviewStatus, setImagePreviewStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        cost: (product.cost || 0).toString(),
        stock: product.stock.toString(),
        category: product.category,
        barcode: product.barcode || '',
        branchId: product.branchId,
        imageUrl: product.imageUrl || '',
        lowStockThreshold: (product.lowStockThreshold !== undefined ? product.lowStockThreshold : 5).toString(),
      });
      setIsWeightBased(!!product.isWeightBased);
      if (product.imageUrl) {
        setImagePreviewStatus('loading');
      }
    } else if (currentBranchId) {
      setFormData(prev => ({ ...prev, branchId: currentBranchId, lowStockThreshold: '5', imageUrl: '' }));
      setIsWeightBased(false);
      setImagePreviewStatus('idle');
    }
  }, [product, currentBranchId]);

  const handleImageUrlChange = (url: string) => {
    const trimmed = url.trim();
    setFormData(prev => ({ ...prev, imageUrl: url }));
    if (!trimmed) {
      setImagePreviewStatus('idle');
    } else {
      setImagePreviewStatus('loading');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchId) {
      alert('Please select a branch.');
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost) || 0,
        stock: parseInt(formData.stock),
        imageUrl: formData.imageUrl.trim() || undefined,
        isWeightBased,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
      };
      if (product?.id) {
        await onSave({ ...data, id: product.id, createdAt: product.createdAt });
      } else {
        await onSave(data);
      }
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 max-h-[92vh] flex flex-col"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {product ? 'Edit Product' : 'Add New Product'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                <Tag className="w-3 h-3" /> Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Coca-Cola 1.5L"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>

            {/* Product Image URL Section with Auto-Detection & Live Preview */}
            <div className="space-y-3 bg-orange-50/40 p-4 rounded-2xl border border-orange-100/80">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-orange-950 uppercase tracking-widest">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-600" /> Product Image URL
                </label>
                {formData.imageUrl && (
                  <button
                    type="button"
                    onClick={() => handleImageUrlChange('')}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 underline cursor-pointer"
                  >
                    Clear URL
                  </button>
                )}
              </div>
              
              <div className="relative">
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                  placeholder="Paste image link (e.g. https://.../product.jpg)"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-white"
                />
              </div>

              {/* Live Preview Card */}
              {formData.imageUrl.trim() && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                    <img
                      src={formData.imageUrl.trim()}
                      alt="Product preview"
                      referrerPolicy="no-referrer"
                      onLoad={() => setImagePreviewStatus('success')}
                      onError={() => setImagePreviewStatus('error')}
                      className={`w-full h-full object-contain p-1 transition-opacity duration-200 ${
                        imagePreviewStatus === 'success' ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {imagePreviewStatus === 'loading' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {imagePreviewStatus === 'error' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {imagePreviewStatus === 'success' && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-green-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        <span>Image Detected &amp; Ready</span>
                      </div>
                    )}
                    {imagePreviewStatus === 'loading' && (
                      <span className="text-xs font-medium text-gray-500">
                        Detecting image from URL...
                      </span>
                    )}
                    {imagePreviewStatus === 'error' && (
                      <span className="text-xs font-bold text-red-600">
                        Could not load image. Please verify URL is public and direct.
                      </span>
                    )}
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {formData.imageUrl.trim()}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-500 leading-tight">
                💡 Paste any direct image link from the web or image hosting. It will automatically show here and on the POS screen.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <Coins className="w-3 h-3" /> Cost (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <Coins className="w-3 h-3" /> Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Category
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-white"
                >
                  <option value="">Select...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <MapPin className="w-3 h-3" /> Branch
                </label>
                <select
                  required
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-white"
                >
                  <option value="">Select Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <Hash className="w-3 h-3" /> Stock
                </label>
                <input
                  type="number"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  <AlertCircle className="w-3 h-3 text-red-500" /> Low Stock Threshold
                </label>
                <input
                  type="number"
                  required
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Barcode (Optional)
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Scan or type..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <input
                type="checkbox"
                id="isWeightBased"
                checked={isWeightBased}
                onChange={(e) => setIsWeightBased(e.target.checked)}
                className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
              />
              <label htmlFor="isWeightBased" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                Sold by Weight (e.g. per kg, per gram)
              </label>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
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
              className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-200 transition-all cursor-pointer"
            >
              {isSaving ? (
                <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {product ? 'Update Product' : 'Save Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

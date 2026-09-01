'use client';

import { useState } from 'react';
import { Product } from '@/lib/db/idb';
import { Edit2, Trash2, Package, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

export function ProductList({ products, onEdit, onDelete }: ProductListProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (productId: string) => {
    setFailedImages(prev => ({ ...prev, [productId]: true }));
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] p-16 text-center border border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No products yet</h3>
        <p className="text-gray-500 mt-1">Start adding items to your inventory.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => {
        const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 5;
        const isLowStock = product.stock <= threshold;
        const hasValidImage = product.imageUrl && !failedImages[product.id];

        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-3xl p-6 border transition-all group relative overflow-hidden shadow-sm hover:shadow-md flex flex-col justify-between ${
              isLowStock 
                ? 'border-red-200 bg-red-50/5' 
                : 'border-gray-100'
            }`}
          >
            <div>
              {/* Product Visual Area */}
              {hasValidImage ? (
                <div className="w-full h-44 bg-gray-100 rounded-2xl mb-4 overflow-hidden relative border border-gray-200/80 flex items-center justify-center">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError(product.id)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-md text-white p-1.5 rounded-lg text-[10px] font-bold shadow-xs">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : null}

              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap items-center gap-1.5 max-w-[80%]">
                  <div className="bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
                    {product.category}
                  </div>
                  {product.isWeightBased && (
                    <div className="bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
                      ⚖️ Per Kg
                    </div>
                  )}
                  {isLowStock && (
                    <div className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                      <AlertCircle className="w-3 h-3" /> Low Stock
                    </div>
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(product)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(product.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h4 className="text-lg font-bold text-gray-900 mb-1 truncate pr-2">
                {product.name}
              </h4>
              <p className="text-2xl font-black text-orange-600 mb-4">
                ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${!isLowStock ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                <span className={`text-sm font-bold ${isLowStock ? 'text-red-600 font-extrabold' : 'text-gray-500'}`}>
                  {product.stock} {product.isWeightBased ? 'kg' : ''} in stock
                </span>
              </div>
              {isLowStock && (
                <div className="flex items-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-wider bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                  Limit: {threshold}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

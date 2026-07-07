'use client';

import { Product } from '@/lib/db/idb';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const getProductEmojiAndBg = (product: { name: string; category: string }) => {
  const name = product.name.toLowerCase();
  const category = product.category.toLowerCase();
  
  if (name.includes('espresso') || name.includes('macchiato') || name.includes('coffee') || category.includes('coffee')) {
    return { emoji: '☕', bg: 'bg-orange-50' };
  }
  if (name.includes('flat white') || name.includes('milk') || name.includes('latte')) {
    return { emoji: '🥛', bg: 'bg-blue-50' };
  }
  if (name.includes('caramel') || name.includes('pudding') || name.includes('dessert') || name.includes('flan') || name.includes('custard')) {
    return { emoji: '🍮', bg: 'bg-amber-50' };
  }
  if (name.includes('matcha') || name.includes('green tea') || name.includes('tea')) {
    return { emoji: '🍵', bg: 'bg-teal-50' };
  }
  if (name.includes('smoothie') || name.includes('berry') || name.includes('strawberry')) {
    return { emoji: '🍓', bg: 'bg-red-50' };
  }
  if (name.includes('lemon') || name.includes('juice') || name.includes('citrus')) {
    return { emoji: '🍋', bg: 'bg-yellow-50' };
  }
  if (name.includes('taro') || name.includes('boba') || name.includes('bubble')) {
    return { emoji: '🧋', bg: 'bg-purple-50' };
  }
  if (name.includes('cold brew') || name.includes('iced coffee') || name.includes('sea')) {
    return { emoji: '🌊', bg: 'bg-sky-50' };
  }
  if (name.includes('bagel') || name.includes('donut') || name.includes('croissant') || category.includes('pastry')) {
    return { emoji: '🥐', bg: 'bg-amber-100/50' };
  }
  if (name.includes('cookie') || name.includes('biscuit') || name.includes('chocolate')) {
    return { emoji: '🍪', bg: 'bg-orange-50' };
  }
  if (name.includes('sandwich') || name.includes('burger') || name.includes('toast') || category.includes('food')) {
    return { emoji: '🥪', bg: 'bg-blue-50' };
  }
  if (category.includes('salad') || name.includes('salad') || name.includes('veg')) {
    return { emoji: '🥗', bg: 'bg-emerald-50' };
  }
  
  const charCode = (category + name).charCodeAt(0) || 0;
  const emojis = ['☕', '🥐', '🥪', '🧊', '🥗', '🥛', '🍪', '🥤', '🍞', '🍎', '🧁', '🍦', '🍩', '🥑'];
  const bgs = ['bg-orange-50', 'bg-blue-50', 'bg-red-50', 'bg-purple-50', 'bg-teal-50', 'bg-yellow-50', 'bg-pink-50', 'bg-emerald-50', 'bg-sky-50', 'bg-indigo-50'];
  
  return {
    emoji: emojis[charCode % emojis.length],
    bg: bgs[charCode % bgs.length]
  };
};

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const { emoji, bg } = getProductEmojiAndBg(product);

  return (
    <motion.button
      whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
      disabled={isOutOfStock}
      onClick={() => onAdd(product)}
      className={`group relative bg-white p-5 rounded-3xl border-2 border-transparent hover:border-orange-400 hover:shadow-xl transition-all text-left flex flex-col h-full cursor-pointer ${
        isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''
      }`}
    >
      {/* Product Image/Emoji Area */}
      <div className={`w-full h-28 ${bg} rounded-2xl mb-4 flex items-center justify-center text-5xl transition-transform group-hover:scale-105 duration-300 relative overflow-hidden`}>
        <span className="relative z-10">{emoji}</span>
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-100/70 px-2.5 py-1 rounded-full">
              {product.category}
            </span>
            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${
              product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {product.stock} IN STOCK
            </span>
          </div>
          
          <h4 className="font-bold text-gray-800 line-clamp-2 text-base leading-snug tracking-tight mb-2">
            {product.name}
          </h4>
        </div>
        
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline">
            <span className="text-orange-500 font-black text-xl">
              ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-200 group-hover:bg-orange-600 transition-colors">
            <Plus className="w-5 h-5 stroke-[3]" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

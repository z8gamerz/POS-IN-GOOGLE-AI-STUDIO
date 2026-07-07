'use client';

import { TransactionItem } from '@/lib/db/idb';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CartItemProps {
  item: TransactionItem;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
}

const getCartItemEmojiAndBg = (nameStr: string) => {
  const name = nameStr.toLowerCase();
  
  if (name.includes('espresso') || name.includes('macchiato') || name.includes('coffee')) {
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
  if (name.includes('cold brew') || name.includes('iced coffee')) {
    return { emoji: '🌊', bg: 'bg-sky-50' };
  }
  if (name.includes('bagel') || name.includes('donut') || name.includes('croissant')) {
    return { emoji: '🥐', bg: 'bg-amber-100/50' };
  }
  if (name.includes('cookie') || name.includes('biscuit') || name.includes('chocolate')) {
    return { emoji: '🍪', bg: 'bg-orange-50' };
  }
  if (name.includes('sandwich') || name.includes('burger') || name.includes('toast')) {
    return { emoji: '🥪', bg: 'bg-blue-50' };
  }
  if (name.includes('salad') || name.includes('veg')) {
    return { emoji: '🥗', bg: 'bg-emerald-50' };
  }
  
  const charCode = name.charCodeAt(0) || 0;
  const emojis = ['☕', '🥐', '🥪', '🧊', '🥗', '🥛', '🍪', '🥤', '🍞', '🍎', '🧁', '🍦', '🍩', '🥑'];
  const bgs = ['bg-orange-50', 'bg-blue-50', 'bg-red-50', 'bg-purple-50', 'bg-teal-50', 'bg-yellow-50', 'bg-pink-50', 'bg-emerald-50', 'bg-sky-50', 'bg-indigo-50'];
  
  return {
    emoji: emojis[charCode % emojis.length],
    bg: bgs[charCode % bgs.length]
  };
};

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const { emoji, bg } = getCartItemEmojiAndBg(item.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-4 p-4 bg-white rounded-3xl border-2 border-gray-100/80 shadow-sm hover:shadow-md transition-all"
    >
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
        {emoji}
      </div>
      
      <div className="flex-1 min-w-0">
        <h5 className="font-bold text-gray-800 truncate text-sm leading-tight tracking-tight">
          {item.name}
        </h5>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-semibold text-gray-400">
            ₱{item.price.toFixed(2)}{item.isWeightBased ? '/kg' : ''}
          </span>
          <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            ₱{(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
        <button 
          onClick={() => onUpdateQuantity(item.productId, -1)}
          className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
        >
          <Minus className="w-4 h-4 text-gray-400" />
        </button>
        <span className={`text-center font-black text-gray-900 text-sm md:text-base ${item.isWeightBased ? 'w-20' : 'w-10'}`}>
          {item.isWeightBased ? `${item.quantity.toFixed(3)} kg` : item.quantity}
        </span>
        <button 
          onClick={() => onUpdateQuantity(item.productId, 1)}
          className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all active:scale-90"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      <button 
        onClick={() => onRemove(item.productId)}
        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

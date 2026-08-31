'use client';

import { useState, useEffect } from 'react';
import { TransactionItem } from '@/lib/db/idb';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CartItemProps {
  item: TransactionItem;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetQuantity?: (productId: string, quantity: number) => void;
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

export function CartItem({ item, onUpdateQuantity, onSetQuantity, onRemove }: CartItemProps) {
  const { emoji, bg } = getCartItemEmojiAndBg(item.name);
  const [inputValue, setInputValue] = useState<string>(item.quantity.toString());

  useEffect(() => {
    setInputValue(item.quantity.toString());
  }, [item.quantity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      if (onSetQuantity) {
        onSetQuantity(item.productId, parsed);
      } else {
        const delta = parsed - item.quantity;
        onUpdateQuantity(item.productId, delta);
      }
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed <= 0) {
      // If cleared or zero, revert to 1 or current quantity
      setInputValue('1');
      if (onSetQuantity) {
        onSetQuantity(item.productId, 1);
      }
    } else {
      const formatted = item.isWeightBased ? parseFloat(parsed.toFixed(3)) : Math.round(parsed);
      setInputValue(formatted.toString());
      if (onSetQuantity) {
        onSetQuantity(item.productId, formatted);
      }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 bg-white rounded-3xl border-2 border-gray-100/80 shadow-sm hover:shadow-md transition-all flex flex-col xs:flex-row xs:items-center gap-3"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center text-xl shrink-0`}>
          {emoji}
        </div>
        
        <div className="flex-1 min-w-0">
          <h5 className="font-extrabold text-gray-800 text-xs md:text-sm leading-snug tracking-tight truncate">
            {item.name}
          </h5>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-md shrink-0">
              ₱{item.price.toFixed(2)}{item.isWeightBased ? '/kg' : ''}
            </span>
            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md shrink-0 border border-orange-100/50">
              Total: ₱{(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between xs:justify-end gap-2 pt-2 xs:pt-0 border-t xs:border-t-0 border-gray-50 shrink-0">
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200/80 shadow-inner shrink-0">
          <button 
            onClick={() => onUpdateQuantity(item.productId, -1)}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all active:scale-90 text-gray-500 hover:text-gray-900 cursor-pointer"
            title="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <div className="relative flex items-center justify-center">
            <input
              type="number"
              step={item.isWeightBased ? "0.001" : "1"}
              min="1"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              title="Click or tap to directly edit quantity"
              className={`text-center font-black text-gray-900 text-xs bg-white border border-gray-200 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-lg py-1 px-1 outline-none transition-all ${
                item.isWeightBased ? 'w-16' : 'w-12'
              }`}
            />
            {item.isWeightBased && (
              <span className="absolute right-1 text-[9px] font-bold text-gray-400 pointer-events-none">
                kg
              </span>
            )}
          </div>

          <button 
            onClick={() => onUpdateQuantity(item.productId, 1)}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all active:scale-90 text-gray-500 hover:text-gray-900 cursor-pointer"
            title="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <button 
          onClick={() => onRemove(item.productId)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90 shrink-0 cursor-pointer"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

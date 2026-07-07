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
  
  // 1. GCash / E-Wallet / Load
  if (name.includes('load') || name.includes('gcash') || name.includes('smart') || name.includes('globe') || name.includes('tm') || name.includes('sun') || name.includes('dito') || name.includes('e-wallet') || name.includes('transfer') || category.includes('load') || category.includes('wallet')) {
    return { emoji: '📱', bg: 'bg-blue-50' };
  }

  // 2. Beer / Alcohol / Wine
  if (name.includes('beer') || name.includes('san miguel') || name.includes('red horse') || name.includes('gin') || name.includes('emperador') || name.includes('empe') || name.includes('tanduay') || name.includes('liquor') || name.includes('alcohol') || name.includes('wine') || name.includes('soju') || name.includes('rum') || category.includes('alcohol') || category.includes('beer')) {
    return { emoji: '🍺', bg: 'bg-orange-50' };
  }

  // 3. Canned Fish / Sardines / Seafood
  if (name.includes('sardines') || name.includes('tuna') || name.includes('ligo') || name.includes('mega') || name.includes('555') || name.includes('century') || name.includes('salmon') || name.includes('sarda') || name.includes('mackerel') || (category.includes('canned') && (name.includes('fish') || name.includes('tuna') || name.includes('sardine')))) {
    return { emoji: '🐟', bg: 'bg-blue-50' };
  }

  // 4. Canned Meat / Spam / Sausage
  if (name.includes('spam') || name.includes('corned beef') || name.includes('meat') || name.includes('beef') || name.includes('pork') || name.includes('loaf') || name.includes('sausage') || name.includes('hotdog') || name.includes('vienna') || name.includes('carne') || category.includes('canned') || category.includes('meat')) {
    return { emoji: '🥩', bg: 'bg-rose-50' };
  }

  // 5. Instant Noodles / Soup
  if (name.includes('noodle') || name.includes('noodles') || name.includes('ramen') || name.includes('canton') || name.includes('lucky me') || name.includes('soup') || name.includes('mami') || name.includes('cup noodles') || category.includes('noodle') || category.includes('noodles')) {
    return { emoji: '🍜', bg: 'bg-orange-50' };
  }

  // 6. Chips / Snacks / Crackers
  if (name.includes('chips') || name.includes('chippy') || name.includes('piattos') || name.includes('nova') || name.includes('crackers') || name.includes('skyflakes') || name.includes('fita') || name.includes('snack') || name.includes('snacks') || name.includes('boy bawang') || name.includes('nagaraya') || category.includes('snack') || category.includes('snacks') || category.includes('chips')) {
    return { emoji: '🍿', bg: 'bg-orange-50' };
  }

  // 7. Sweets / Candy / Chocolate
  if (name.includes('candy') || name.includes('sweets') || name.includes('chocolate') || name.includes('lollipop') || name.includes('gum') || name.includes('chocnut') || name.includes('fudgee') || name.includes('bar') || name.includes('caramel') || name.includes('pudding') || name.includes('dessert') || name.includes('flan') || name.includes('custard') || category.includes('sweets') || category.includes('candy')) {
    return { emoji: '🍬', bg: 'bg-purple-50' };
  }

  // 8. Rice / Grain
  if (name.includes('rice') || name.includes('bigas') || name.includes('sinandomeng') || name.includes('jasmine') || name.includes('milling') || name.includes('grain') || category.includes('rice') || category.includes('grain')) {
    return { emoji: '🌾', bg: 'bg-green-50' };
  }

  // 9. Eggs
  if (name.includes('egg') || name.includes('itlog') || name.includes('eggs')) {
    return { emoji: '🥚', bg: 'bg-orange-50' };
  }

  // 10. Coffee / Milo / Hot Drinks
  if (name.includes('coffee') || name.includes('kopiko') || name.includes('nescafe') || name.includes('milo') || name.includes('chocolate drink') || name.includes('ovaltine') || name.includes('tea') || name.includes('cafe') || name.includes('espresso') || name.includes('latte') || name.includes('cappuccino') || name.includes('matcha') || name.includes('green tea') || category.includes('coffee') || category.includes('tea')) {
    return { emoji: '☕', bg: 'bg-orange-50' };
  }

  // 11. Milk / Dairy
  if (name.includes('milk') || name.includes('bear brand') || name.includes('birch tree') || name.includes('evap') || name.includes('condensada') || name.includes('cream') || name.includes('flat white') || name.includes('gatas') || category.includes('dairy')) {
    return { emoji: '🥛', bg: 'bg-blue-50' };
  }

  // 12. Oil / Seasoning / Condiments
  if (name.includes('oil') || name.includes('mantika') || name.includes('soy sauce') || name.includes('toyo') || name.includes('vinegar') || name.includes('suka') || name.includes('salt') || name.includes('sugar') || name.includes('magic sarap') || name.includes('ketchup') || name.includes('ajinomoto') || name.includes('patis') || name.includes('sauce') || name.includes('seasoning') || name.includes('baking') || category.includes('condiment') || category.includes('seasoning') || category.includes('spices')) {
    return { emoji: '🧂', bg: 'bg-indigo-50' };
  }

  // 13. Toiletries / Soap / Hygiene
  if (name.includes('soap') || name.includes('shampoo') || name.includes('toothpaste') || name.includes('colgate') || name.includes('safeguard') || name.includes('tide') || name.includes('surf') || name.includes('detergent') || name.includes('conditioner') || name.includes('tooth') || name.includes('brush') || name.includes('tissue') || name.includes('diaper') || category.includes('hygiene') || category.includes('toiletries') || category.includes('household') || category.includes('personal')) {
    return { emoji: '🧼', bg: 'bg-blue-50' };
  }

  // 14. Bread / Bakery
  if (name.includes('bread') || name.includes('pandesal') || name.includes('loaf') || name.includes('pastry') || name.includes('donut') || name.includes('croissant') || name.includes('bagel') || name.includes('biscuit') || category.includes('bakery') || category.includes('pastry') || category.includes('bread')) {
    return { emoji: '🍞', bg: 'bg-orange-50' };
  }

  // 15. Ice / Cold
  if (name.includes('ice') || name.includes('ice candy') || name.includes('frozen') || name.includes('cold') || name.includes('popsicle') || name.includes('slush')) {
    return { emoji: '🧊', bg: 'bg-blue-50' };
  }

  // 16. Cigarettes / Matches
  if (name.includes('cigarette') || name.includes('yosi') || name.includes('marlboro') || name.includes('match') || name.includes('lighter') || name.includes('smoke') || category.includes('cigarette') || category.includes('tobacco')) {
    return { emoji: '🚬', bg: 'bg-red-50' };
  }

  // 17. Soft Drinks / Soda / Juice
  if (name.includes('coke') || name.includes('pepsi') || name.includes('sprite') || name.includes('royal') || name.includes('soda') || name.includes('juice') || name.includes('beverage') || name.includes('tang') || name.includes('c2') || name.includes('drink') || name.includes('drinks') || category.includes('beverage') || category.includes('beverages') || category.includes('drinks')) {
    return { emoji: '🥤', bg: 'bg-red-50' };
  }

  // 18. Fruits / Vegetables
  if (name.includes('apple') || name.includes('banana') || name.includes('saging') || name.includes('veg') || name.includes('vegetable') || name.includes('tomato') || name.includes('kamatis') || name.includes('bawang') || name.includes('sibuyas') || name.includes('onion') || name.includes('garlic') || category.includes('vegetable') || category.includes('fruit') || category.includes('produce')) {
    return { emoji: '🍎', bg: 'bg-green-50' };
  }

  // Generative Fallback with proper full-string hashing
  let hash = 0;
  const combined = category + name;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash);

  const emojis = ['🥫', '📦', '🛍️', '🍎', '🥪', '🥛', '🍪', '🥤', '🍞', '🍬', '🥑', '🍍', '🍳', '🍫', '🍕', '🥬', '🍋'];
  const bgs = ['bg-orange-50', 'bg-blue-50', 'bg-red-50', 'bg-purple-50', 'bg-indigo-50', 'bg-green-50', 'bg-rose-50'];

  return {
    emoji: emojis[index % emojis.length],
    bg: bgs[index % bgs.length]
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

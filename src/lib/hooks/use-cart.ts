'use client';

import { useState, useCallback } from 'react';
import { Product, TransactionItem } from '@/lib/db/idb';

export function useCart() {
  const [cart, setCart] = useState<TransactionItem[]>([]);

  const addToCart = useCallback((product: Product, quantityOverride?: number) => {
    if (!product.id) return;
    
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: quantityOverride !== undefined ? quantityOverride : item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          costPrice: product.cost || 0,
          quantity: quantityOverride !== undefined ? quantityOverride : 1,
          isWeightBased: product.isWeightBased,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const step = item.isWeightBased ? 0.1 : 1;
            const newQty = item.quantity + (delta > 0 ? step : -step);
            return { ...item, quantity: Math.max(0, parseFloat(newQty.toFixed(3))) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
  };
}

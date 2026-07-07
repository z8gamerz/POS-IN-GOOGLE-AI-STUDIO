'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense } from '@/lib/db/idb';
import { expenseService } from '@/lib/services/expense-service';

export function useExpenses(branchId?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const fetchExpenses = useCallback(async (isSilent = false) => {
    if (!branchId) {
      setExpenses([]);
      setLoading(false);
      setInitialLoaded(true);
      return;
    }
    if (!isSilent) {
      setLoading(true);
      setInitialLoaded(false);
    }
    try {
      const data = await expenseService.getByBranch(branchId);
      setExpenses((data || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [branchId]);

  useEffect(() => {
    fetchExpenses(false);
  }, [fetchExpenses]);

  const addExpense = async (expense: Omit<Expense, 'id' | 'branchId' | 'updatedAt' | 'isDeleted' | 'timestamp'>) => {
    if (!branchId) throw new Error('Branch ID is required to add an expense');
    const id = crypto.randomUUID();
    const now = Date.now();
    await expenseService.create({
      ...expense,
      id,
      branchId,
      timestamp: now,
    });
    await fetchExpenses(true);
  };

  const updateExpense = async (expense: Expense) => {
    await expenseService.update(expense);
    await fetchExpenses(true);
  };

  const deleteExpense = async (id: string) => {
    await expenseService.delete(id);
    await fetchExpenses(true);
  };

  return {
    expenses,
    loading: loading && !initialLoaded,
    addExpense,
    updateExpense,
    deleteExpense,
    refresh: () => fetchExpenses(true),
  };
}

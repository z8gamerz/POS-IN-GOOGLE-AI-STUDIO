'use client';

import { useState, useEffect, useCallback } from 'react';
import { Customer, CreditEntry } from '@/lib/db/idb';
import { customerService } from '@/lib/services/customer-service';
import { transactionService } from '@/lib/services/transaction-service';

export function useCustomers(branchId?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      let data: Customer[];
      if (branchId) {
        data = await customerService.getByBranch(branchId);
      } else {
        data = await customerService.getAll();
      }
      setCustomers(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalUtang' | 'branchId' | 'isDeleted'>) => {
    if (!branchId) throw new Error('Branch ID is required to add a customer');
    const id = crypto.randomUUID();
    const now = Date.now();
    await customerService.create({
      ...customer,
      id,
      totalUtang: 0,
      branchId,
      createdAt: now,
    });
    await fetchCustomers();
  };

  const updateCustomer = async (customer: Customer) => {
    await customerService.update(customer);
    await fetchCustomers();
  };

  const deleteCustomer = async (id: string) => {
    await customerService.delete(id);
    await fetchCustomers();
  };

  const recordCredit = async (customerId: string, amount: number, description: string, type: 'credit' | 'payment') => {
    if (!branchId) throw new Error('Branch ID is required to record credit');
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const now = Date.now();
    const entry: Omit<CreditEntry, 'updatedAt' | 'isDeleted'> = {
      id: crypto.randomUUID(),
      customerId,
      branchId,
      amount: type === 'credit' ? amount : -amount,
      type,
      description,
      timestamp: now,
    };

    await customerService.recordCredit(entry);
    
    // Distribute payment to unpaid/partially paid credit transactions
    if (type === 'payment') {
      try {
        const allTransactions = await transactionService.getByCustomer(customerId);
        const unpaid = allTransactions
          .filter(t => (t.paymentMethod === 'credit' || t.paymentMethod === 'split') && !t.isPaid)
          .sort((a, b) => a.timestamp - b.timestamp);
        
        let paymentLeft = amount;
        for (const t of unpaid) {
          if (paymentLeft <= 0) break;
          const initialBalance = t.paymentMethod === 'credit' ? t.total : (t.splitDetails?.credit || t.creditAmount || t.total);
          const currentBalance = t.remainingCreditBalance !== undefined ? t.remainingCreditBalance : initialBalance;
          
          if (paymentLeft >= currentBalance) {
            paymentLeft -= currentBalance;
            t.remainingCreditBalance = 0;
            t.isPaid = true;
          } else {
            t.remainingCreditBalance = currentBalance - paymentLeft;
            paymentLeft = 0;
          }
          t.updatedAt = now;
          await transactionService.update(t);
        }
      } catch (err) {
        console.error('Failed to distribute payment to credit transactions:', err);
      }
    }

    const updatedCustomer = {
      ...customer,
      totalUtang: customer.totalUtang + entry.amount,
      updatedAt: now,
    };
    
    await customerService.update(updatedCustomer);
    await fetchCustomers();
  };

  const getCreditHistory = async (customerId: string) => {
    const history = await customerService.getCreditHistory(customerId);
    return history.sort((a, b) => b.timestamp - a.timestamp);
  };

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordCredit,
    getCreditHistory,
    refresh: fetchCustomers,
  };
}

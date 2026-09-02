'use client';

import { BaseService } from './base-service';
import { Transaction, STORES } from '@/lib/db/idb';

class TransactionService extends BaseService<Transaction> {
  constructor() {
    super(STORES.TRANSACTIONS);
  }

  async getByBranch(branchId: string): Promise<Transaction[]> {
    return this.getByIndex('branchId', branchId);
  }

  async getByCustomer(customerId: string): Promise<Transaction[]> {
    return this.getByIndex('customerId', customerId);
  }
}

export const transactionService = new TransactionService();

'use client';

import { BaseService } from './base-service';
import { Expense, STORES } from '@/lib/db/idb';

class ExpenseService extends BaseService<Expense> {
  constructor() {
    super(STORES.EXPENSES);
  }

  async getByBranch(branchId: string): Promise<Expense[]> {
    return this.getByIndex('branchId', branchId);
  }
}

export const expenseService = new ExpenseService();

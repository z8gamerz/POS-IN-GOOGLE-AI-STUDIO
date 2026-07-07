'use client';

import { BaseService } from './base-service';
import { Category, STORES } from '@/lib/db/idb';

class CategoryService extends BaseService<Category> {
  constructor() {
    super(STORES.CATEGORIES);
  }

  async getByBranch(branchId: string): Promise<Category[]> {
    return this.query(c => c.branchId === branchId);
  }
}

export const categoryService = new CategoryService();

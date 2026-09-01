'use client';

import { BaseService } from './base-service';
import { Customer, CreditEntry, STORES, dbUtil } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

class CustomerService extends BaseService<Customer> {
  constructor() {
    super(STORES.CUSTOMERS);
  }

  async getByBranch(branchId: string): Promise<Customer[]> {
    const all = await this.getAll();
    return all.filter(c => !c.isDeleted && c.branchId === branchId && this.isValidCustomer(c));
  }

  override async getAll(): Promise<Customer[]> {
    const items = await dbUtil.getItems<Customer>(this.storeName);
    return items.filter(item => !item.isDeleted && this.isValidCustomer(item));
  }

  private isValidCustomer(customer: Customer): boolean {
    if (!customer.name || !customer.name.trim()) return false;
    const nameLower = customer.name.trim().toLowerCase();
    if (nameLower === 'unknown' || nameLower === 'unknown customer') return false;
    return true;
  }

  async getCreditHistory(customerId: string): Promise<CreditEntry[]> {
    const all = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    return all.filter(e => e.customerId === customerId && !e.isDeleted);
  }

  async getAllCreditHistory(branchId?: string): Promise<CreditEntry[]> {
    const allEntries = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    const activeCustomers = await this.getAll();
    const activeCustomerIds = new Set(activeCustomers.map(c => c.id));

    return allEntries.filter(e => {
      if (e.isDeleted) return false;
      if (!e.customerId || !activeCustomerIds.has(e.customerId)) return false;
      if (branchId && branchId !== 'all' && e.branchId !== branchId) return false;
      return true;
    });
  }

  async deleteCreditEntry(entryId: string): Promise<void> {
    const entry = await dbUtil.getItemById<CreditEntry>(STORES.CREDIT_LOG, entryId);
    if (!entry) return;
    const now = Date.now();
    const updated = {
      ...entry,
      isDeleted: true,
      updatedAt: now,
    };
    await syncDb.update(STORES.CREDIT_LOG, updated);
  }

  async recordCredit(entry: Omit<CreditEntry, 'updatedAt' | 'isDeleted'>): Promise<void> {
    const now = Date.now();
    const newEntry = {
      ...entry,
      updatedAt: now,
      isDeleted: false,
    } as CreditEntry;
    
    await syncDb.add(STORES.CREDIT_LOG, newEntry);
  }

  override async delete(id: string): Promise<void> {
    await super.delete(id);
    // Delete all associated credit entries
    const allEntries = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    for (const entry of allEntries) {
      if (entry.customerId === id && !entry.isDeleted) {
        await this.deleteCreditEntry(entry.id);
      }
    }
  }

  /**
   * Purges any unknown/dummy customers and orphan credit records
   */
  async cleanupUnknownAndDummyData(): Promise<void> {
    const dummyNames = new Set([
      'aling nena',
      'mang kanor',
      'tito boy',
      'ate fe',
      'kuya jun',
      'nanay linda',
      'tatay berting',
      'unknown',
      'unknown customer',
    ]);

    const allCustomers = await dbUtil.getItems<Customer>(STORES.CUSTOMERS);
    const deletedCustomerIds = new Set<string>();

    for (const cust of allCustomers) {
      const name = (cust.name || '').trim().toLowerCase();
      if (!name || dummyNames.has(name) || cust.isDeleted) {
        deletedCustomerIds.add(cust.id);
        if (!cust.isDeleted) {
          await this.delete(cust.id);
        }
      }
    }

    // Clean orphan or dummy credit log entries
    const allEntries = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    for (const entry of allEntries) {
      if (!entry.isDeleted && (!entry.customerId || deletedCustomerIds.has(entry.customerId))) {
        await this.deleteCreditEntry(entry.id);
      }
    }
  }
}

export const customerService = new CustomerService();



'use client';

import { BaseService } from './base-service';
import { Customer, CreditEntry, STORES, dbUtil } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

class CustomerService extends BaseService<Customer> {
  constructor() {
    super(STORES.CUSTOMERS);
  }

  async getByBranch(branchId: string): Promise<Customer[]> {
    const items = await this.getByIndex('branchId', branchId);
    return items.filter(c => this.isValidCustomer(c));
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

  private activeLocks = new Set<string>();

  async findCreditByTransactionId(transactionId: string): Promise<CreditEntry | undefined> {
    if (!transactionId || !transactionId.trim()) return undefined;
    const target = transactionId.trim();
    const items = await dbUtil.getItemsByIndex<CreditEntry>(STORES.CREDIT_LOG, 'transactionId', target);
    const matched = items.find(e => !e.isDeleted);
    if (matched) return matched;
    
    // Fallback scan if index pending
    const all = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    return all.find(e => !e.isDeleted && e.transactionId && e.transactionId.trim() === target);
  }

  async findCreditByReferenceNumber(referenceNumber: string, branchId?: string): Promise<CreditEntry | undefined> {
    if (!referenceNumber || !referenceNumber.trim()) return undefined;
    const target = referenceNumber.trim().toLowerCase();
    const items = await dbUtil.getItemsByIndex<CreditEntry>(STORES.CREDIT_LOG, 'referenceNumber', referenceNumber.trim());
    const matched = items.find(e => !e.isDeleted && (!branchId || e.branchId === branchId));
    if (matched) return matched;

    // Fallback scan (case-insensitive)
    const all = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    return all.find(e => 
      !e.isDeleted && 
      e.referenceNumber && 
      e.referenceNumber.trim().toLowerCase() === target &&
      (!branchId || e.branchId === branchId)
    );
  }

  async getCreditHistory(customerId: string): Promise<CreditEntry[]> {
    const items = await dbUtil.getItemsByIndex<CreditEntry>(STORES.CREDIT_LOG, 'customerId', customerId);
    return items.filter(e => !e.isDeleted);
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

  async recordCredit(entry: Omit<CreditEntry, 'updatedAt' | 'isDeleted'>): Promise<CreditEntry> {
    const txId = entry.transactionId ? entry.transactionId.trim() : undefined;
    const refNum = entry.referenceNumber ? entry.referenceNumber.trim() : undefined;

    // 1. Concurrency Mutex Lock: Prevent concurrent or rapid multi-click submissions
    const lockKey = txId 
      ? `tx_${txId}` 
      : refNum 
        ? `ref_${entry.branchId}_${refNum.toLowerCase()}`
        : `cust_${entry.customerId}_${entry.type}_${entry.amount}_${Math.floor(entry.timestamp / 3000)}`;

    if (this.activeLocks.has(lockKey)) {
      throw new Error(`Duplicate transaction prevented: A credit entry for this request is already processing.`);
    }

    this.activeLocks.add(lockKey);

    try {
      // 2. Database check: Verify transactionId uniqueness
      if (txId) {
        const existingTx = await this.findCreditByTransactionId(txId);
        if (existingTx) {
          throw new Error(`Duplicate Transaction: A credit record with Transaction ID "${txId}" already exists.`);
        }
      }

      // 3. Database check: Verify referenceNumber uniqueness
      if (refNum) {
        const existingRef = await this.findCreditByReferenceNumber(refNum, entry.branchId);
        if (existingRef) {
          throw new Error(`Duplicate Reference: A credit record with Reference Number "${refNum}" already exists.`);
        }
      }

      // 4. Multi-click debounce check: Detect identical rapid submissions within 4 seconds
      const now = Date.now();
      const allEntries = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
      const recentDuplicate = allEntries.find(e => 
        !e.isDeleted &&
        e.customerId === entry.customerId &&
        e.type === entry.type &&
        Math.abs(e.amount - entry.amount) < 0.001 &&
        e.description.trim().toLowerCase() === entry.description.trim().toLowerCase() &&
        (now - e.timestamp) < 4000
      );

      if (recentDuplicate) {
        throw new Error('Duplicate submission detected: A matching credit record was just recorded seconds ago.');
      }

      const newEntry: CreditEntry = {
        ...entry,
        transactionId: txId,
        referenceNumber: refNum,
        updatedAt: now,
        isDeleted: false,
      };
      
      await syncDb.add(STORES.CREDIT_LOG, newEntry);
      return newEntry;
    } finally {
      this.activeLocks.delete(lockKey);
    }
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



'use client';

import { BaseService } from './base-service';
import { Customer, CreditEntry, STORES, dbUtil } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

class CustomerService extends BaseService<Customer> {
  private recentRecordSubmissions = new Map<string, number>();

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

  /**
   * Filters out duplicate credit entries from an array.
   * Identifies duplicates caused by double submissions, network retries, or sync replays.
   */
  filterDuplicateEntries(entries: CreditEntry[]): { unique: CreditEntry[]; duplicates: CreditEntry[] } {
    const unique: CreditEntry[] = [];
    const duplicates: CreditEntry[] = [];

    // Sort by timestamp ascending (earlier record is considered primary canonical entry)
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of sorted) {
      const isDuplicate = unique.some(existing => {
        if (existing.customerId !== entry.customerId) return false;
        if (existing.type !== entry.type) return false;
        if (Math.abs(existing.amount - entry.amount) > 0.001) return false;

        const desc1 = (existing.description || '').trim().toLowerCase();
        const desc2 = (entry.description || '').trim().toLowerCase();

        // Check if both reference the exact same POS Ticket Number (e.g. "POS Purchase - Ticket T-0001")
        const ticketRegex = /ticket\s*[:#-]?\s*([a-z0-9-]+)/i;
        const match1 = desc1.match(ticketRegex);
        const match2 = desc2.match(ticketRegex);

        if (match1 && match2 && match1[1] === match2[1]) {
          return true;
        }

        // Matching description with exact same timestamp or within 3 minutes (180,000ms)
        if (desc1 === desc2) {
          const timeDiff = Math.abs(existing.timestamp - entry.timestamp);
          if (timeDiff <= 180000) {
            return true;
          }
        }

        return false;
      });

      if (isDuplicate) {
        duplicates.push(entry);
      } else {
        unique.push(entry);
      }
    }

    return { unique, duplicates };
  }

  /**
   * Purges duplicate credit entries across the entire database and repairs customer balances.
   */
  async deduplicateCreditEntries(): Promise<{ removedCount: number; affectedCustomersCount: number }> {
    try {
      const allEntries = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
      const activeEntries = allEntries.filter(e => !e.isDeleted);

      // Group active entries by customerId
      const customerEntriesMap = new Map<string, CreditEntry[]>();
      for (const entry of activeEntries) {
        if (!entry.customerId) continue;
        if (!customerEntriesMap.has(entry.customerId)) {
          customerEntriesMap.set(entry.customerId, []);
        }
        customerEntriesMap.get(entry.customerId)!.push(entry);
      }

      let removedCount = 0;
      const affectedCustomerIds = new Set<string>();

      for (const [customerId, entries] of customerEntriesMap.entries()) {
        const { unique, duplicates } = this.filterDuplicateEntries(entries);
        if (duplicates.length > 0) {
          affectedCustomerIds.add(customerId);
          removedCount += duplicates.length;

          // Soft delete duplicates locally and sync deletion to cloud
          for (const dup of duplicates) {
            await this.deleteCreditEntry(dup.id);
          }
        }

        // Automatically ensure true customer balance matches clean deduplicated records
        const cleanBalance = Math.max(0, unique.reduce((sum, e) => sum + e.amount, 0));
        const customer = await dbUtil.getItemById<Customer>(STORES.CUSTOMERS, customerId);
        if (customer && !customer.isDeleted) {
          if (Math.abs(customer.totalUtang - cleanBalance) > 0.001) {
            await syncDb.update(STORES.CUSTOMERS, {
              ...customer,
              totalUtang: cleanBalance,
              updatedAt: Date.now(),
            });
          }
        }
      }

      if (removedCount > 0) {
        console.log(`[CustomerService] Cleaned up ${removedCount} duplicate credit records across ${affectedCustomerIds.size} customers.`);
      }

      return { removedCount, affectedCustomersCount: affectedCustomerIds.size };
    } catch (err) {
      console.error('[CustomerService] Error during deduplication of credit entries:', err);
      return { removedCount: 0, affectedCustomersCount: 0 };
    }
  }

  async getCreditHistory(customerId: string): Promise<CreditEntry[]> {
    const items = await dbUtil.getItemsByIndex<CreditEntry>(STORES.CREDIT_LOG, 'customerId', customerId);
    const active = items.filter(e => !e.isDeleted);
    const { unique, duplicates } = this.filterDuplicateEntries(active);

    // If duplicate records were found, clean them up asynchronously
    if (duplicates.length > 0) {
      setTimeout(() => {
        this.deduplicateCreditEntries().catch(() => {});
      }, 0);
    }

    return unique;
  }

  async getAllCreditHistory(branchId?: string): Promise<CreditEntry[]> {
    const allEntries = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    const activeCustomers = await this.getAll();
    const activeCustomerIds = new Set(activeCustomers.map(c => c.id));

    const activeEntries = allEntries.filter(e => {
      if (e.isDeleted) return false;
      if (!e.customerId || !activeCustomerIds.has(e.customerId)) return false;
      if (branchId && branchId !== 'all' && e.branchId !== branchId) return false;
      return true;
    });

    const { unique, duplicates } = this.filterDuplicateEntries(activeEntries);

    if (duplicates.length > 0) {
      setTimeout(() => {
        this.deduplicateCreditEntries().catch(() => {});
      }, 0);
    }

    return unique;
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

  async recordCredit(entry: Omit<CreditEntry, 'updatedAt' | 'isDeleted'>): Promise<boolean> {
    const now = Date.now();
    const dedupeKey = `${entry.customerId}_${entry.branchId}_${entry.type}_${entry.amount.toFixed(2)}_${(entry.description || '').trim().toLowerCase()}`;

    // 1. In-memory rapid double-submission lock (blocks duplicate calls within 10 seconds)
    const lastTime = this.recentRecordSubmissions.get(dedupeKey);
    if (lastTime && (now - lastTime) < 10000) {
      console.warn('[CustomerService] Blocked rapid duplicate in-memory recordCredit call:', dedupeKey);
      return false;
    }

    // 2. Query existing customer credit history to prevent duplicate database entry
    const existing = await this.getCreditHistory(entry.customerId);
    const isDuplicate = existing.some(e => {
      if (e.type !== entry.type) return false;
      if (Math.abs(e.amount - entry.amount) > 0.001) return false;

      const desc1 = (e.description || '').trim().toLowerCase();
      const desc2 = (entry.description || '').trim().toLowerCase();

      // Same POS Ticket
      const ticketRegex = /ticket\s*[:#-]?\s*([a-z0-9-]+)/i;
      const match1 = desc1.match(ticketRegex);
      const match2 = desc2.match(ticketRegex);
      if (match1 && match2 && match1[1] === match2[1]) {
        return true;
      }

      // Matching description within 3 minutes
      if (desc1 === desc2) {
        const timeDiff = Math.abs(e.timestamp - entry.timestamp);
        if (timeDiff <= 180000) {
          return true;
        }
      }

      return false;
    });

    if (isDuplicate) {
      console.warn('[CustomerService] Duplicate credit entry detected in database; skipping duplicate creation:', entry);
      return false;
    }

    this.recentRecordSubmissions.set(dedupeKey, now);
    if (this.recentRecordSubmissions.size > 200) {
      for (const [k, t] of this.recentRecordSubmissions.entries()) {
        if (now - t > 60000) this.recentRecordSubmissions.delete(k);
      }
    }

    const newEntry = {
      ...entry,
      updatedAt: now,
      isDeleted: false,
    } as CreditEntry;
    
    await syncDb.add(STORES.CREDIT_LOG, newEntry);
    return true;
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
   * Purges any unknown/dummy customers and orphan credit records, and deduplicates credit entries
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

    // Automatically deduplicate credit entries
    await this.deduplicateCreditEntries();
  }
}

export const customerService = new CustomerService();



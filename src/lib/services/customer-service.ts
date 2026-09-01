'use client';

import { BaseService } from './base-service';
import { Customer, CreditEntry, STORES, dbUtil } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

export const SAMPLE_DUMMY_CUSTOMERS_DATA = [
  {
    name: 'Aling Nena',
    contact: '0917-123-4567',
    entries: [
      {
        description: '2x 555 Sardines (₱50), 3x Lucky Me Pancit Canton (₱60), 1x Silver Swan Soy Sauce 1L (₱65), 5kg Sinandomeng Rice (₱275)',
        amount: 450,
        type: 'credit' as const,
        hoursAgo: 18,
      },
      {
        description: '1x San Miguel Pale Pilsen 6-pack (₱240), 2x Chicharon Bulaklak (₱40)',
        amount: 280,
        type: 'credit' as const,
        hoursAgo: 10,
      },
      {
        description: 'Partial payment (Cash)',
        amount: -300,
        type: 'payment' as const,
        hoursAgo: 2,
      },
    ],
  },
  {
    name: 'Mang Kanor',
    contact: '0928-987-6543',
    entries: [
      {
        description: '1x Gasul LPG Refill (₱550), 1x Box Matches (₱20), 1x Safeguard Soap 3-pack (₱50)',
        amount: 620,
        type: 'credit' as const,
        hoursAgo: 36,
      },
      {
        description: '3x Bear Brand Milk Powder 33g (₱45), 2x Nescafe Classic 50g (₱80), 1x Sugar 1/2kg (₱60)',
        amount: 185,
        type: 'credit' as const,
        hoursAgo: 14,
      },
      {
        description: 'Payment via GCash (Ref: GC-883921)',
        amount: -500,
        type: 'payment' as const,
        hoursAgo: 4,
      },
    ],
  },
  {
    name: 'Tito Boy',
    contact: '0945-112-2334',
    entries: [
      {
        description: '4x San Miguel Light (₱180), 2x Boy Bawang (₱40), 2x Nagaraya (₱50), 1x Ice Tube (₱50)',
        amount: 320,
        type: 'credit' as const,
        hoursAgo: 8,
      },
      {
        description: '1x Marlboro Red pack (₱150)',
        amount: 150,
        type: 'credit' as const,
        hoursAgo: 1,
      },
    ],
  },
  {
    name: 'Ate Fe',
    contact: '0939-556-6778',
    entries: [
      {
        description: '1x Cooking Oil 1L (₱95), 1x Magic Sarap 12s (₱65), 2x Century Tuna Flakes in Oil (₱80), 6kg Well-Milled Rice (₱300)',
        amount: 540,
        type: 'credit' as const,
        hoursAgo: 48,
      },
      {
        description: 'Full Payment (Cash)',
        amount: -540,
        type: 'payment' as const,
        hoursAgo: 12,
      },
    ],
  },
  {
    name: 'Kuya Jun',
    contact: '0918-776-6554',
    entries: [
      {
        description: '2x Coca-Cola 1.5L (₱140), 2x Piattos Cheese (₱70)',
        amount: 210,
        type: 'credit' as const,
        hoursAgo: 7,
      },
      {
        description: '1x Loaf Bread Gardenia (₱75), 1x Star Margarine (₱20)',
        amount: 95,
        type: 'credit' as const,
        hoursAgo: 3,
      },
    ],
  },
  {
    name: 'Nanay Linda',
    contact: '0922-334-4556',
    entries: [
      {
        description: '1x Surf Powder Blossom Fresh 1kg (₱165), 1x Downy Sunrise Fresh 800ml (₱130), 4x Safeguard White (₱80)',
        amount: 375,
        type: 'credit' as const,
        hoursAgo: 26,
      },
      {
        description: 'Partial payment (Cash)',
        amount: -200,
        type: 'payment' as const,
        hoursAgo: 5,
      },
    ],
  },
  {
    name: 'Tatay Berting',
    contact: '0919-887-7665',
    entries: [
      {
        description: '1x Purefoods Corned Beef 210g (₱85), 2x Argentina Beef Loaf (₱70), 5kg Dinorado Rice (₱335)',
        amount: 490,
        type: 'credit' as const,
        hoursAgo: 20,
      },
      {
        description: '6x Kopiko Blanca Twin Pack (₱72), 1x Egg Tray 12pcs (₱48)',
        amount: 120,
        type: 'credit' as const,
        hoursAgo: 6,
      },
      {
        description: 'Payment via Cash',
        amount: -350,
        type: 'payment' as const,
        hoursAgo: 1,
      },
    ],
  },
];

class CustomerService extends BaseService<Customer> {
  constructor() {
    super(STORES.CUSTOMERS);
  }

  async getByBranch(branchId: string): Promise<Customer[]> {
    return this.query(c => !c.isDeleted && c.branchId === branchId);
  }

  async getCreditHistory(customerId: string): Promise<CreditEntry[]> {
    const all = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    return all.filter(e => e.customerId === customerId && !e.isDeleted);
  }

  async getAllCreditHistory(branchId?: string): Promise<CreditEntry[]> {
    const all = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    if (!branchId || branchId === 'all') {
      return all.filter(e => !e.isDeleted);
    }
    return all.filter(e => !e.isDeleted && e.branchId === branchId);
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

  async seedDummyAccounts(branchId: string, force = false): Promise<Customer[]> {
    const existing = await this.getAll();
    const activeExisting = existing.filter(c => !c.isDeleted);

    if (activeExisting.length > 0 && !force) {
      return activeExisting;
    }

    const now = Date.now();
    const createdCustomers: Customer[] = [];

    for (const sample of SAMPLE_DUMMY_CUSTOMERS_DATA) {
      const customerId = crypto.randomUUID();
      let calculatedUtang = 0;

      // Seed credit entries
      for (const item of sample.entries) {
        calculatedUtang += item.amount;
        const entryTimestamp = now - item.hoursAgo * 3600 * 1000;
        const entry: CreditEntry = {
          id: crypto.randomUUID(),
          customerId,
          branchId,
          amount: item.amount,
          type: item.type,
          description: item.description,
          timestamp: entryTimestamp,
          updatedAt: now,
          isDeleted: false,
        };
        await syncDb.add(STORES.CREDIT_LOG, entry);
      }

      const newCustomer: Customer = {
        id: customerId,
        name: sample.name,
        contact: sample.contact,
        totalUtang: Math.max(0, calculatedUtang),
        branchId,
        createdAt: now - 48 * 3600 * 1000,
        updatedAt: now,
        isDeleted: false,
      };

      await this.create(newCustomer);
      createdCustomers.push(newCustomer);
    }

    return createdCustomers;
  }
}

export const customerService = new CustomerService();


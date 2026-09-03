export type StoreInfo = {
  id: string;
  name: string;
  address?: string; // Added for business info
  tin?: string; // Added for BIR compliance
  currency: string;
  taxType: 'VAT' | 'NON-VAT';
  vatRate: number;
  lastORNumber: number; // Added for sequential OR numbering
  lastSyncedAt?: number; // Last successful full sync with cloud
  updatedAt: number;
  isDeleted?: boolean;
};

export type Branch = {
  id: string;
  name: string;
  businessId: string; // Reference to StoreInfo
  address?: string;
  contact?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type Product = {
  id: string; // UUID for SaaS sync
  name: string;
  price: number;
  cost: number; // Added for profit tracking
  stock: number;
  category: string;
  branchId: string; // Reference to Branch
  barcode?: string;
  imageUrl?: string; // Product image URL
  isWeightBased?: boolean; // Added for weight-based sales
  lowStockThreshold?: number; // Custom threshold for low stock alert
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type TransactionItem = {
  productId: string;
  name: string;
  price: number;
  costPrice: number; // Added for profit tracking (cost at time of sale)
  quantity: number;
  imageUrl?: string; // Product image URL
  isWeightBased?: boolean;
};

export type Transaction = {
  id: string;
  ticketNumber: string; // Sequential ticket number (e.g., T-0001)
  orNumber: string; // Added for Official Receipt numbering
  items: TransactionItem[];
  total: number;
  vatableSales?: number;
  vatAmount?: number;
  taxType?: 'VAT' | 'NON-VAT';
  timestamp: number;
  branchId: string; // Reference to Branch
  customerId?: string; // UUID
  paymentMethod: 'cash' | 'gcash' | 'credit' | 'split';
  referenceNumber?: string;
  creditAmount?: number;
  deliveryFee?: number;
  additionalCharges?: number;
  additionalChargesNote?: string;
  discount?: number;
  discountNote?: string;
  splitDetails?: {
    cash: number;
    gcash: number;
    gcashRef?: string;
    credit: number;
  };
  isPaid?: boolean;
  remainingCreditBalance?: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type Customer = {
  id: string;
  name: string;
  contact: string;
  totalUtang: number;
  branchId: string; // Reference to Branch
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type Category = {
  id: string;
  name: string;
  branchId: string; // Reference to Branch
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type CreditEntry = {
  id: string;
  customerId: string;
  branchId: string; // Reference to Branch
  amount: number; // Positive for utang, negative for payment (includes discount if granted)
  type: 'credit' | 'payment';
  description: string;
  transactionId?: string; // Associated POS transaction ID or Ticket ID
  referenceNumber?: string; // Reference number or receipt/ticket number or unique client idempotency key
  discount?: number; // Discount granted upon payment
  discountNote?: string;
  timestamp: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type SyncAction = {
  id?: number; // Local queue ID can stay numeric for ordering
  store: StoreName;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
};

export type EWalletTransaction = {
  id: string;
  orNumber?: string; // Added for BIR compliance
  type: 'cash_in' | 'cash_out';
  amount: number;
  method: 'gcash' | 'maya' | 'bank_transfer' | 'gotyme';
  fee?: number;
  customerName?: string;
  referenceNumber?: string;
  branchId: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  branchId: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type RestockItem = {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
};

export type RestockTransaction = {
  id: string;
  supplierId: string;
  items: RestockItem[];
  totalCost: number;
  timestamp: number;
  branchId: string;
  referenceNumber?: string;
  notes?: string;
  updatedAt: number;
  isDeleted?: boolean;
};

export type AuditLog = {
  id: string;
  action: string;
  user?: string;
  details: string;
  timestamp: number;
  updatedAt: number;
  isDeleted?: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'cashier';
  businessId: string; // Reference to StoreInfo
  assignedBranchIds: string[]; // Branches this user can access
  createdAt: number;
  updatedAt: number;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: 'Utilities' | 'Rent' | 'Salary' | 'Inventory Restock' | 'Snacks / Refreshments' | 'Marketing' | 'Others';
  timestamp: number;
  branchId: string;
  createdBy: string;
  referenceNumber?: string;
  isDeleted?: boolean;
  updatedAt: number;
};

const DB_NAME = 'SariSariPOS_DB';
const DB_VERSION = 19; // Incremented for credit_log duplicate prevention indexes and constraints

export const STORES = {
  STORE_INFO: 'store_info',
  BRANCHES: 'branches',
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  CUSTOMERS: 'customers',
  CREDIT_LOG: 'credit_log',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata',
  EWALLET_TRANSACTIONS: 'ewallet_transactions',
  SUPPLIERS: 'suppliers',
  RESTOCK_TRANSACTIONS: 'restock_transactions',
  AUDIT_LOGS: 'audit_logs',
  USERS: 'users',
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

export type StorageStats = {
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
  totalRecords: number;
  storeCounts: Record<string, number>;
  activeIndexesCount: number;
  isPersisted: boolean;
};

class IndexedDBUtility {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('[IndexedDB] Database upgrade is blocked by another open connection.');
        if (this.db) {
          this.db.close();
          this.db = null;
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        this.db = db;
        
        db.onversionchange = () => {
          console.warn('[IndexedDB] Database version changing. Closing connection.');
          db.close();
          if (this.db === db) {
            this.db = null;
          }
        };
        
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;

        // Helper to get or create stores
        const getOrCreateStore = (name: string, options: IDBObjectStoreParameters): IDBObjectStore => {
          if (db.objectStoreNames.contains(name)) {
            return transaction!.objectStore(name);
          }
          return db.createObjectStore(name, options);
        };

        // Helper to safely add indices without throwing if they already exist
        const ensureIndex = (
          store: IDBObjectStore,
          indexName: string,
          keyPath: string | string[],
          options: IDBIndexParameters = { unique: false }
        ) => {
          if (!store.indexNames.contains(indexName)) {
            store.createIndex(indexName, keyPath, options);
          }
        };

        // 1. Store Info
        getOrCreateStore(STORES.STORE_INFO, { keyPath: 'id' });

        // 2. Branches
        const branchStore = getOrCreateStore(STORES.BRANCHES, { keyPath: 'id' });
        ensureIndex(branchStore, 'businessId', 'businessId');
        ensureIndex(branchStore, 'name', 'name');
        ensureIndex(branchStore, 'updatedAt', 'updatedAt');
        ensureIndex(branchStore, 'isDeleted', 'isDeleted');

        // 3. Products (High volume store)
        const productStore = getOrCreateStore(STORES.PRODUCTS, { keyPath: 'id' });
        ensureIndex(productStore, 'branchId', 'branchId');
        ensureIndex(productStore, 'category', 'category');
        ensureIndex(productStore, 'barcode', 'barcode');
        ensureIndex(productStore, 'updatedAt', 'updatedAt');
        ensureIndex(productStore, 'isDeleted', 'isDeleted');
        ensureIndex(productStore, 'branch_deleted', ['branchId', 'isDeleted']);
        ensureIndex(productStore, 'branch_category', ['branchId', 'category']);

        // 4. Transactions (Highest volume store - prevents table scans & out of memory)
        const transStore = getOrCreateStore(STORES.TRANSACTIONS, { keyPath: 'id' });
        ensureIndex(transStore, 'branchId', 'branchId');
        ensureIndex(transStore, 'customerId', 'customerId');
        ensureIndex(transStore, 'timestamp', 'timestamp');
        ensureIndex(transStore, 'paymentMethod', 'paymentMethod');
        ensureIndex(transStore, 'orNumber', 'orNumber');
        ensureIndex(transStore, 'ticketNumber', 'ticketNumber');
        ensureIndex(transStore, 'updatedAt', 'updatedAt');
        ensureIndex(transStore, 'isDeleted', 'isDeleted');
        ensureIndex(transStore, 'branch_timestamp', ['branchId', 'timestamp']);
        ensureIndex(transStore, 'branch_deleted', ['branchId', 'isDeleted']);

        // 5. Customers
        const customerStore = getOrCreateStore(STORES.CUSTOMERS, { keyPath: 'id' });
        ensureIndex(customerStore, 'branchId', 'branchId');
        ensureIndex(customerStore, 'name', 'name');
        ensureIndex(customerStore, 'updatedAt', 'updatedAt');
        ensureIndex(customerStore, 'isDeleted', 'isDeleted');
        ensureIndex(customerStore, 'branch_deleted', ['branchId', 'isDeleted']);

        // 6. Credit Log
        const creditStore = getOrCreateStore(STORES.CREDIT_LOG, { keyPath: 'id' });
        ensureIndex(creditStore, 'customerId', 'customerId');
        ensureIndex(creditStore, 'branchId', 'branchId');
        ensureIndex(creditStore, 'timestamp', 'timestamp');
        ensureIndex(creditStore, 'type', 'type');
        ensureIndex(creditStore, 'transactionId', 'transactionId');
        ensureIndex(creditStore, 'referenceNumber', 'referenceNumber');
        ensureIndex(creditStore, 'updatedAt', 'updatedAt');
        ensureIndex(creditStore, 'isDeleted', 'isDeleted');
        ensureIndex(creditStore, 'customer_deleted', ['customerId', 'isDeleted']);
        ensureIndex(creditStore, 'branch_timestamp', ['branchId', 'timestamp']);

        // 7. Sync Queue (High churn store)
        const syncStore = getOrCreateStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        ensureIndex(syncStore, 'status', 'status');
        ensureIndex(syncStore, 'store', 'store');
        ensureIndex(syncStore, 'timestamp', 'timestamp');
        ensureIndex(syncStore, 'retryCount', 'retryCount');
        ensureIndex(syncStore, 'status_timestamp', ['status', 'timestamp']);

        // 8. Metadata
        getOrCreateStore(STORES.METADATA, { keyPath: 'key' });

        // 9. E-Wallet Transactions
        const ewalletStore = getOrCreateStore(STORES.EWALLET_TRANSACTIONS, { keyPath: 'id' });
        ensureIndex(ewalletStore, 'branchId', 'branchId');
        ensureIndex(ewalletStore, 'type', 'type');
        ensureIndex(ewalletStore, 'createdAt', 'createdAt');
        ensureIndex(ewalletStore, 'updatedAt', 'updatedAt');
        ensureIndex(ewalletStore, 'isDeleted', 'isDeleted');
        ensureIndex(ewalletStore, 'branch_created', ['branchId', 'createdAt']);

        // 10. Suppliers
        const supplierStore = getOrCreateStore(STORES.SUPPLIERS, { keyPath: 'id' });
        ensureIndex(supplierStore, 'branchId', 'branchId');
        ensureIndex(supplierStore, 'name', 'name');
        ensureIndex(supplierStore, 'updatedAt', 'updatedAt');
        ensureIndex(supplierStore, 'isDeleted', 'isDeleted');

        // 11. Restock Transactions
        const restockStore = getOrCreateStore(STORES.RESTOCK_TRANSACTIONS, { keyPath: 'id' });
        ensureIndex(restockStore, 'branchId', 'branchId');
        ensureIndex(restockStore, 'supplierId', 'supplierId');
        ensureIndex(restockStore, 'timestamp', 'timestamp');
        ensureIndex(restockStore, 'updatedAt', 'updatedAt');
        ensureIndex(restockStore, 'isDeleted', 'isDeleted');
        ensureIndex(restockStore, 'branch_timestamp', ['branchId', 'timestamp']);

        // 12. Audit Logs
        const auditStore = getOrCreateStore(STORES.AUDIT_LOGS, { keyPath: 'id' });
        ensureIndex(auditStore, 'timestamp', 'timestamp');
        ensureIndex(auditStore, 'action', 'action');
        ensureIndex(auditStore, 'user', 'user');
        ensureIndex(auditStore, 'updatedAt', 'updatedAt');

        // 13. Users
        const userStore = getOrCreateStore(STORES.USERS, { keyPath: 'id' });
        ensureIndex(userStore, 'email', 'email');
        ensureIndex(userStore, 'businessId', 'businessId');
        ensureIndex(userStore, 'role', 'role');
        ensureIndex(userStore, 'updatedAt', 'updatedAt');

        // 14. Expenses
        const expenseStore = getOrCreateStore(STORES.EXPENSES, { keyPath: 'id' });
        ensureIndex(expenseStore, 'branchId', 'branchId');
        ensureIndex(expenseStore, 'category', 'category');
        ensureIndex(expenseStore, 'timestamp', 'timestamp');
        ensureIndex(expenseStore, 'updatedAt', 'updatedAt');
        ensureIndex(expenseStore, 'isDeleted', 'isDeleted');
        ensureIndex(expenseStore, 'branch_timestamp', ['branchId', 'timestamp']);

        // 15. Categories
        const catStore = getOrCreateStore(STORES.CATEGORIES, { keyPath: 'id' });
        ensureIndex(catStore, 'branchId', 'branchId');
        ensureIndex(catStore, 'name', 'name');
        ensureIndex(catStore, 'updatedAt', 'updatedAt');
        ensureIndex(catStore, 'isDeleted', 'isDeleted');
        ensureIndex(catStore, 'branch_deleted', ['branchId', 'isDeleted']);
      };
    });
  }

  async addItem<T>(storeName: StoreName, item: T): Promise<number | string> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Database-level uniqueness check for credit_log to prevent duplicate utang records
      if (storeName === STORES.CREDIT_LOG) {
        const creditItem = item as any;
        const targetTxId = creditItem.transactionId ? String(creditItem.transactionId).trim() : '';
        const targetRefNum = creditItem.referenceNumber ? String(creditItem.referenceNumber).trim().toLowerCase() : '';

        if (targetTxId || targetRefNum) {
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const allEntries: any[] = allReq.result || [];
            const duplicate = allEntries.find(e => 
              !e.isDeleted && (
                (targetTxId && e.transactionId && String(e.transactionId).trim() === targetTxId) ||
                (targetRefNum && e.referenceNumber && String(e.referenceNumber).trim().toLowerCase() === targetRefNum)
              )
            );

            if (duplicate) {
              const dupIdent = targetTxId ? `Transaction ID "${targetTxId}"` : `Reference Number "${creditItem.referenceNumber}"`;
              reject(new Error(`Database Constraint: Duplicate credit entry with ${dupIdent} already exists.`));
              return;
            }

            const request = store.add(item);
            request.onsuccess = () => resolve(request.result as number | string);
            request.onerror = () => reject(request.error);
          };
          allReq.onerror = () => reject(allReq.error);
          return;
        }
      }

      const request = store.add(item);
      request.onsuccess = () => resolve(request.result as number | string);
      request.onerror = () => reject(request.error);
    });
  }

  async getItems<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Indexed retrieval for sub-millisecond targeted lookups and bounded memory usage.
   * Prevents browser out-of-memory errors on large databases.
   */
  async getItemsByIndex<T>(
    storeName: StoreName,
    indexName: string,
    queryKey?: IDBValidKey | IDBKeyRange,
    limit?: number,
    direction: 'next' | 'nextunique' | 'prev' | 'prevunique' = 'next'
  ): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        if (!store.indexNames.contains(indexName)) {
          // Fallback if index not present yet: filter standard store items safely
          this.getItems<any>(storeName).then(items => {
            const filtered = queryKey !== undefined 
              ? items.filter(i => (i as any)[indexName] === queryKey)
              : items;
            resolve((limit ? filtered.slice(0, limit) : filtered) as T[]);
          }).catch(reject);
          return;
        }

        const index = store.index(indexName);
        const results: T[] = [];

        if (limit && limit > 0) {
          const request = index.openCursor(queryKey, direction);
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor && results.length < limit) {
              results.push(cursor.value);
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          request.onerror = () => reject(request.error);
        } else {
          const request = queryKey !== undefined ? index.getAll(queryKey) : index.getAll();
          request.onsuccess = () => resolve(request.result as T[]);
          request.onerror = () => reject(request.error);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async countItems(storeName: StoreName, indexName?: string, queryKey?: IDBValidKey | IDBKeyRange): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        let request: IDBRequest<number>;

        if (indexName && store.indexNames.contains(indexName)) {
          const index = store.index(indexName);
          request = queryKey !== undefined ? index.count(queryKey) : index.count();
        } else {
          request = queryKey !== undefined ? store.count(queryKey) : store.count();
        }

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getItemById<T>(storeName: StoreName, id: number | string): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  async updateItem<T>(storeName: StoreName, item: T): Promise<number | string> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result as number | string);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteItem(storeName: StoreName, id: number | string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Reads browser storage quota and index telemetry to prevent device storage exhaustion.
   */
  async getStorageStats(): Promise<StorageStats> {
    let usageBytes = 0;
    let quotaBytes = 0;
    let isPersisted = false;

    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      }
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
    }

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const storeCounts: Record<string, number> = {};
    let totalRecords = 0;
    let activeIndexesCount = 0;

    try {
      const db = await this.getDB();
      const storeList = Object.values(STORES);

      for (const name of storeList) {
        if (db.objectStoreNames.contains(name)) {
          const count = await this.countItems(name);
          storeCounts[name] = count;
          totalRecords += count;

          const transaction = db.transaction(name, 'readonly');
          const store = transaction.objectStore(name);
          activeIndexesCount += store.indexNames.length;
        }
      }
    } catch (e) {
      console.warn('[IndexedDB] Storage stats error:', e);
    }

    const percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

    return {
      usageBytes,
      quotaBytes,
      usageFormatted: formatBytes(usageBytes),
      quotaFormatted: formatBytes(quotaBytes),
      percentUsed: Math.min(100, Math.max(0, percentUsed)),
      totalRecords,
      storeCounts,
      activeIndexesCount,
      isPersisted,
    };
  }

  /**
   * Prunes stale data, logs, and processed queue items to prevent IndexedDB exhaustion.
   */
  async optimizeAndPrune(): Promise<{ prunedQueue: number; prunedAuditLogs: number; freedRecords: number }> {
    let prunedQueue = 0;
    let prunedAuditLogs = 0;

    try {
      // 1. Prune processed/stale sync queue entries older than 24 hours
      const queueItems = await this.getItems<SyncAction>(STORES.SYNC_QUEUE);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const item of queueItems) {
        if (item.status === 'processing' && item.timestamp < oneDayAgo) {
          if (item.id !== undefined) {
            await this.deleteItem(STORES.SYNC_QUEUE, item.id);
            prunedQueue++;
          }
        }
      }

      // 2. Prune old audit logs keeping only latest 1,000 logs
      const logs = await this.getItems<AuditLog>(STORES.AUDIT_LOGS);
      if (logs.length > 1000) {
        const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = sorted.slice(1000);
        for (const log of toDelete) {
          await this.deleteItem(STORES.AUDIT_LOGS, log.id);
          prunedAuditLogs++;
        }
      }
    } catch (err) {
      console.warn('[IndexedDB] Optimization error:', err);
    }

    return {
      prunedQueue,
      prunedAuditLogs,
      freedRecords: prunedQueue + prunedAuditLogs,
    };
  }
}

export const dbUtil = new IndexedDBUtility();

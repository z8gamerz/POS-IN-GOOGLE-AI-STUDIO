'use client';

import { dbUtil, STORES, SyncAction, StoreName } from './idb';

export function getFirebaseRtdbUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_FIREBASE_RTDB_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  return "https://database-for-inventory-88e9f-default-rtdb.asia-southeast1.firebasedatabase.app/";
}

/**
 * Helper to fetch with an abort controller timeout, preventing hangs on slow/offline networks.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => {
    try {
      controller.abort(new Error(`Request timeout after ${timeout}ms`));
    } catch {
      controller.abort();
    }
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Pushes all existing local IndexedDB records to Firebase Realtime Database in parallel.
 * This guarantees that records created offline or prior to sync are fully uploaded to the cloud quickly.
 */
export async function pushAllLocalDataToCloud(): Promise<{ pushedCount: number; errors: number }> {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return { pushedCount: 0, errors: 0 };
  }

  const rawUrl = getFirebaseRtdbUrl();
  const BASE_URL = rawUrl.replace(/\/$/, '');
  
  const storesToPush: StoreName[] = [
    STORES.STORE_INFO,
    STORES.BRANCHES,
    STORES.USERS,
    STORES.PRODUCTS,
    STORES.CATEGORIES,
    STORES.TRANSACTIONS,
    STORES.CUSTOMERS,
    STORES.CREDIT_LOG,
    STORES.EWALLET_TRANSACTIONS,
    STORES.SUPPLIERS,
    STORES.RESTOCK_TRANSACTIONS,
    STORES.EXPENSES,
    STORES.AUDIT_LOGS,
    STORES.METADATA
  ];

  let pushedCount = 0;
  let errors = 0;

  await Promise.all(
    storesToPush.map(async (store) => {
      try {
        const items = await dbUtil.getItems<any>(store);
        if (items.length === 0) return;

        // Build a dictionary payload to PUT the entire store collection in ONE single HTTP request
        const dictionary: Record<string, any> = {};
        for (const item of items) {
          const key = item.id || item.key;
          if (key) {
            dictionary[key] = item;
          }
        }

        if (Object.keys(dictionary).length > 0) {
          const url = `${BASE_URL}/${store}.json`;
          const res = await fetchWithTimeout(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dictionary)
          }, 3000);

          if (res.ok) {
            pushedCount += Object.keys(dictionary).length;
          } else {
            errors++;
          }
        }
      } catch (err) {
        errors++;
      }
    })
  );

  return { pushedCount, errors };
}

/**
 * [SaaS ARCHITECT NOTE]
 * This sync queue is designed for a multi-device cloud environment.
 * 
 * OFFLINE-FIRST STRATEGY:
 * 1. Local-First: All writes go to IndexedDB immediately via syncDb.
 * 2. Background Sync: Changes are queued in 'sync_queue'.
 * 3. Conflict Resolution: Uses 'updatedAt' (Last Write Wins) on the server.
 * 4. Soft Deletes: 'isDeleted' flag ensures deletions propagate across devices.
 * 
 * FUTURE API INTEGRATION:
 * - Implement a /api/sync endpoint that accepts a batch of SyncActions.
 * - The backend should return the server's authoritative state for any conflicted items.
 */

/**
 * Queues an action to be synchronized with the server when online.
 */
export async function queueAction(
  store: StoreName,
  type: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: any
): Promise<void> {
  const key = payload.id || payload.key;
  if (!key) {
    console.warn('[CloudSync] Cannot queue action: payload is missing id or key', payload);
    return;
  }

  const action: SyncAction = {
    store,
    type,
    payload: {
      ...payload,
      updatedAt: Date.now(),
      isDeleted: type === 'DELETE'
    },
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  try {
    // Deduplicate pending actions in the queue to prevent database bloat
    const queue = await dbUtil.getItems<SyncAction>(STORES.SYNC_QUEUE);
    const existingAction = queue.find(a => 
      a.store === store && 
      (
        a.payload.id === key || 
        a.payload.key === key ||
        (store === STORES.CREDIT_LOG && payload.transactionId && a.payload.transactionId === payload.transactionId) ||
        (store === STORES.CREDIT_LOG && payload.referenceNumber && a.payload.referenceNumber && String(a.payload.referenceNumber).trim().toLowerCase() === String(payload.referenceNumber).trim().toLowerCase())
      ) &&
      (a.status === 'pending' || a.status === 'failed' || a.status === 'processing')
    );

    if (existingAction) {
      existingAction.payload = {
        ...payload,
        updatedAt: Date.now(),
        isDeleted: type === 'DELETE'
      };
      existingAction.type = type;
      existingAction.status = 'pending';
      existingAction.timestamp = Date.now();
      await dbUtil.updateItem(STORES.SYNC_QUEUE, existingAction);
      console.log(`[CloudSync] Updated existing pending action in queue for ${store}/${key}`);
    } else {
      await dbUtil.addItem(STORES.SYNC_QUEUE, action);
      console.log(`[CloudSync] Queued new ${type} for ${store}`);
    }
    
    // Trigger background sync if online
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      processQueue();
    }
  } catch (error) {
    console.error('[CloudSync] Failed to queue action:', error);
  }
}

/**
 * Marks a specific action as successfully synchronized.
 */
export async function markAsSynced(actionId: number): Promise<void> {
  try {
    await dbUtil.deleteItem(STORES.SYNC_QUEUE, actionId);
    console.log(`[CloudSync] Action ${actionId} synced and removed from queue.`);
  } catch (error) {
    console.error(`[CloudSync] Failed to mark action ${actionId} as synced:`, error);
  }
}

let isProcessingQueue = false;

/**
 * Processes the pending synchronization queue in batches.
 */
export async function processQueue(): Promise<void> {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return;
  }

  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  try {
    const queue = await dbUtil.getItems<SyncAction>(STORES.SYNC_QUEUE);
    const pendingActions = queue.filter(a => a.status === 'pending' || a.status === 'failed');

    if (pendingActions.length === 0) {
      isProcessingQueue = false;
      return;
    }

    console.log(`[CloudSync] Syncing ${pendingActions.length} changes to cloud...`);

    // Batching strategy: Send up to 30 actions at a time
    const BATCH_SIZE = 30;
    const batch = pendingActions.slice(0, BATCH_SIZE);

    // 1. Mark batch as processing locally
    for (const action of batch) {
      action.status = 'processing';
      await dbUtil.updateItem(STORES.SYNC_QUEUE, action);
    }

    // 2. Push each pending change to Firebase Realtime Database with per-item resilience
    const rawUrl = getFirebaseRtdbUrl();
    const BASE_URL = rawUrl.replace(/\/$/, '');

    const successfulActionIds: number[] = [];
    const failedActions: SyncAction[] = [];

    for (const action of batch) {
      const { store, payload } = action;
      const key = payload.id || payload.key;
      if (!key) {
        if (action.id) successfulActionIds.push(action.id);
        continue;
      }

      try {
        const url = `${BASE_URL}/${store}/${key}.json`;
        const response = await fetchWithTimeout(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }, 6000);

        if (response.ok) {
          if (action.id) {
            successfulActionIds.push(action.id);
          }
        } else {
          console.warn(`[CloudSync] Push notice for ${store}/${key}: ${response.statusText}`);
          failedActions.push(action);
        }
      } catch (err: any) {
        // Individual item timeout or network glitch - queue for non-blocking retry
        failedActions.push(action);
      }
    }

    // 3. Mark successful ones as synced
    for (const actionId of successfulActionIds) {
      await markAsSynced(actionId);
    }

    // 4. Mark failed ones for next scheduled retry
    for (const failedAction of failedActions) {
      failedAction.status = 'failed';
      failedAction.retryCount = (failedAction.retryCount || 0) + 1;
      await dbUtil.updateItem(STORES.SYNC_QUEUE, failedAction);
    }

    // 5. Update store-wide sync timestamp if any action was successful
    if (successfulActionIds.length > 0) {
      const storeInfo = await dbUtil.getItems<any>(STORES.STORE_INFO);
      if (storeInfo.length > 0) {
        const info = storeInfo[0];
        info.lastSyncedAt = Date.now();
        await dbUtil.updateItem(STORES.STORE_INFO, info);
      }
    }

    isProcessingQueue = false;

    // 6. If there are more items and we made progress, continue processing
    if (pendingActions.length > BATCH_SIZE && successfulActionIds.length > 0) {
      setTimeout(() => {
        processQueue().catch(() => {});
      }, 500);
    }
  } catch (error) {
    console.warn('[CloudSync] Queue processing notice:', error);
    isProcessingQueue = false;
  }
}

/**
 * Pulls a specific store from Firebase Realtime Database and merges locally.
 */
export async function pullStore(store: StoreName): Promise<number> {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return 0;
  }

  const rawUrl = getFirebaseRtdbUrl();
  const BASE_URL = rawUrl.replace(/\/$/, '');

  try {
    const url = `${BASE_URL}/${store}.json`;
    const response = await fetchWithTimeout(url, {}, 6000);
    if (!response.ok) {
      console.warn(`[CloudSync] Failed to fetch store ${store}:`, response.statusText);
      return 0;
    }

    const data = await response.json();
    if (!data) return 0;

    const cloudItems: any[] = Array.isArray(data)
      ? data.filter(Boolean)
      : Object.values(data);

    let updatedCount = 0;
    for (const cloudItem of cloudItems) {
      const key = cloudItem.id || cloudItem.key;
      if (!key) continue;

      const localItem = await dbUtil.getItemById<any>(store, key);
      if (!localItem) {
        await dbUtil.updateItem(store, cloudItem);
        updatedCount++;
      } else {
        const cloudUpdatedAt = cloudItem.updatedAt || 0;
        const localUpdatedAt = localItem.updatedAt || 0;

        if (cloudUpdatedAt >= localUpdatedAt) {
          await dbUtil.updateItem(store, cloudItem);
          updatedCount++;
        }
      }
    }
    return updatedCount;
  } catch (error) {
    console.warn(`[CloudSync] Error pulling store ${store}:`, error);
    return 0;
  }
}

/**
 * Pulls all updates from Firebase Realtime Database and merges them locally.
 * Uses Last Write Wins based on 'updatedAt' timestamp.
 */
export async function pullSync(): Promise<void> {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return;
  }

  const rawUrl = getFirebaseRtdbUrl();
  const BASE_URL = rawUrl.replace(/\/$/, '');
  
  // We sync all stores except the sync_queue itself
  const storesToSync = [
    STORES.STORE_INFO,
    STORES.BRANCHES,
    STORES.PRODUCTS,
    STORES.TRANSACTIONS,
    STORES.CUSTOMERS,
    STORES.CREDIT_LOG,
    STORES.METADATA,
    STORES.EWALLET_TRANSACTIONS,
    STORES.SUPPLIERS,
    STORES.RESTOCK_TRANSACTIONS,
    STORES.AUDIT_LOGS,
    STORES.USERS,
    STORES.EXPENSES,
    STORES.CATEGORIES
  ];

  console.log('[CloudSync] Starting parallel pull sync from Firebase RTDB...');
  let unauthorizedCount = 0;

  await Promise.all(
    storesToSync.map(async (store) => {
      try {
        const url = `${BASE_URL}/${store}.json`;
        const response = await fetchWithTimeout(url, {}, 6000);
        if (!response.ok) {
          if (response.status === 401 || response.status === 403 || response.statusText === 'Unauthorized') {
            unauthorizedCount++;
          }
          return;
        }

        const data = await response.json();
        if (!data) return;

        // Firebase returns { id1: item1, id2: item2 } or an array of items if IDs are numeric indexes
        const cloudItems: any[] = Array.isArray(data) 
          ? data.filter(Boolean)
          : Object.values(data);

        for (const cloudItem of cloudItems) {
          const key = cloudItem.id || cloudItem.key;
          if (!key) continue;

          // Fetch local item to compare
          const localItem = await dbUtil.getItemById<any>(store, key);

          if (!localItem) {
            // Item doesn't exist locally, save it
            await dbUtil.updateItem(store, cloudItem);
          } else {
            // Compare updatedAt
            const cloudUpdatedAt = cloudItem.updatedAt || 0;
            const localUpdatedAt = localItem.updatedAt || 0;

            if (cloudUpdatedAt > localUpdatedAt) {
              // Cloud has newer data, update local
              await dbUtil.updateItem(store, cloudItem);
            } else if (localUpdatedAt > cloudUpdatedAt) {
              // Local has newer data, queue it for push
              await queueAction(store, 'UPDATE', localItem);
            }
          }
        }
      } catch (error) {
        // Silently handle store fetch timeout without blocking
      }
    })
  );

  if (unauthorizedCount > 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('firebase_sync_error', 'Unauthorized');
    }
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('firebase_sync_error');
    }
  }

  // Update store-wide sync timestamp
  try {
    const storeInfo = await dbUtil.getItems<any>(STORES.STORE_INFO);
    if (storeInfo.length > 0) {
      const info = storeInfo[0];
      info.lastSyncedAt = Date.now();
      await dbUtil.updateItem(STORES.STORE_INFO, info);
    }
  } catch (error) {
    console.error('[CloudSync] Failed to update sync timestamp:', error);
  }

  console.log('[CloudSync] Pull sync completed.');
}

/**
 * SaaS-ready DB wrapper.
 */
export const syncDb = {
  async add<T>(store: StoreName, item: T): Promise<any> {
    // Database-level uniqueness check for credit logs to prevent duplicate utang records
    if (store === STORES.CREDIT_LOG) {
      const creditPayload = item as any;
      const txId = creditPayload.transactionId ? String(creditPayload.transactionId).trim() : '';
      const refNum = creditPayload.referenceNumber ? String(creditPayload.referenceNumber).trim().toLowerCase() : '';

      if (txId || refNum) {
        const existing = await dbUtil.getItems<any>(STORES.CREDIT_LOG);
        const dup = existing.find(e => 
          !e.isDeleted && (
            (txId && e.transactionId && String(e.transactionId).trim() === txId) ||
            (refNum && e.referenceNumber && String(e.referenceNumber).trim().toLowerCase() === refNum)
          )
        );
        if (dup) {
          const dupLabel = txId ? `Transaction ID "${txId}"` : `Reference Number "${creditPayload.referenceNumber}"`;
          throw new Error(`Database Constraint Violation: Duplicate credit entry with ${dupLabel} already exists.`);
        }
      }
    }

    const result = await dbUtil.addItem(store, item);
    await queueAction(store, 'CREATE', item);
    return result;
  },

  async update<T>(store: StoreName, item: T): Promise<any> {
    const result = await dbUtil.updateItem(store, item);
    await queueAction(store, 'UPDATE', item);
    return result;
  },

  async delete(store: StoreName, id: string | number): Promise<void> {
    const item = await dbUtil.getItemById<any>(store, id);
    if (item) {
      // For metadata, the ID might be 'key'
      const key = (item as any).id || (item as any).key || id;
      await dbUtil.deleteItem(store, id);
      await queueAction(store, 'DELETE', { ...item, id: key, isDeleted: true });
    }
  }
};

/**
 * Wipes all data (products, transactions, customers, credit_log, ewallet_transactions, suppliers, restock_transactions, audit_logs, metadata, sync_queue) 
 * both locally in IndexedDB and remotely in the connected Firebase Realtime Database.
 * This effectively removes all dummy data to let the user start fresh.
 */
export async function clearDatabaseAll(): Promise<void> {
  const storesToClear = [
    STORES.PRODUCTS,
    STORES.TRANSACTIONS,
    STORES.CUSTOMERS,
    STORES.CREDIT_LOG,
    STORES.EWALLET_TRANSACTIONS,
    STORES.SUPPLIERS,
    STORES.RESTOCK_TRANSACTIONS,
    STORES.AUDIT_LOGS,
    STORES.METADATA,
    STORES.SYNC_QUEUE,
    STORES.EXPENSES,
    STORES.CATEGORIES
  ];

  console.log('[CloudSync] Clearing all local IndexedDB stores...');

  // 1. Clear local IndexedDB stores
  for (const store of storesToClear) {
    try {
      await dbUtil.clearStore(store);
      console.log(`[CloudSync] Cleared local store: ${store}`);
    } catch (e) {
      console.error(`[CloudSync] Failed to clear local store ${store}:`, e);
    }
  }

  // 2. Clear remote Firebase Realtime Database for those stores
  const rawUrl = getFirebaseRtdbUrl();
  const BASE_URL = rawUrl ? rawUrl.replace(/\/$/, '') : null;
  
  if (BASE_URL && typeof window !== 'undefined' && window.navigator.onLine) {
    console.log('[CloudSync] Deleting remote stores from Firebase...');
    for (const store of storesToClear) {
      try {
        const url = `${BASE_URL}/${store}.json`;
        const response = await fetch(url, {
          method: 'DELETE'
        });
        if (response.ok) {
          console.log(`[CloudSync] Successfully deleted store ${store} on Firebase.`);
        } else {
          console.warn(`[CloudSync] Failed to delete store ${store} on Firebase:`, response.statusText);
        }
      } catch (e) {
        console.warn(`[CloudSync] Error deleting store ${store} on Firebase:`, e);
      }
    }
  }

  // 3. Clear branches and recreate a single Main Branch to keep system operational
  try {
    await dbUtil.clearStore(STORES.BRANCHES);
    const storeInfo = await dbUtil.getItems<any>(STORES.STORE_INFO);
    const businessId = storeInfo[0]?.id || 'main_config';
    const mainBranchId = crypto.randomUUID();
    const now = Date.now();
    const defaultBranch = {
      id: mainBranchId,
      name: 'Main Branch',
      address: storeInfo[0]?.address || 'Main Address',
      businessId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    };
    await dbUtil.addItem(STORES.BRANCHES, defaultBranch);
    localStorage.setItem('sarisari_current_branch_id', mainBranchId);

    if (BASE_URL && typeof window !== 'undefined' && window.navigator.onLine) {
      await fetch(`${BASE_URL}/${STORES.BRANCHES}.json`, { method: 'DELETE' }).catch(() => {});
      await fetch(`${BASE_URL}/${STORES.BRANCHES}/${mainBranchId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultBranch)
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to reset branches:', e);
  }

  console.log('[CloudSync] Database wipe completed.');
}

// Listen for online event to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Back online! Triggering sync...');
    processQueue();
  });
}

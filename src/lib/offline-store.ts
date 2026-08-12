const DB_NAME = "kafe-offline";
const DB_VERSION = 3;
const QUEUE_STORE = "queue";
const ORDERS_STORE = "orders";
const BILLS_STORE = "bills";
const OPEN_TABLES_STORE = "open_tables";
const MENU_STORE = "menu";

export type OrderCreatePayload = {
  cafeId: string;
  tableId: string;
  source: "WAITER" | "CASHIER";
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    modifierOptionIds?: string[];
  }[];
};

export type OrderAppendPayload = {
  orderId: string;
  items: {
    productId: string;
    quantity: number;
    modifierOptionIds?: string[];
  }[];
};

type PendingAction =
  | {
      id: string;
      type: "ORDER_STATUS";
      createdAt: number;
      payload: { orderId: string; status: string };
    }
  | {
      id: string;
      type: "TABLE_CLOSE";
      createdAt: number;
      payload: {
        cafeId: string;
        tableNumber: number;
        paymentMethod: "CASH" | "CARD";
      };
    }
  | {
      id: string;
      type: "ORDER_CREATE";
      createdAt: number;
      payload: OrderCreatePayload;
    }
  | {
      id: string;
      type: "ORDER_APPEND";
      createdAt: number;
      payload: OrderAppendPayload;
    };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        db.createObjectStore(ORDERS_STORE, { keyPath: "cafeId" });
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(BILLS_STORE)) {
          db.createObjectStore(BILLS_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(OPEN_TABLES_STORE)) {
          db.createObjectStore(OPEN_TABLES_STORE, { keyPath: "cafeId" });
        }
      }
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(MENU_STORE)) {
          db.createObjectStore(MENU_STORE, { keyPath: "cafeId" });
        }
      }
    };
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(fn(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error);
        } else {
          resolve(result as T);
        }
      })
      .catch(reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

function billKey(cafeId: string, tableNumber: number) {
  return `${cafeId}:${tableNumber}`;
}

export async function saveOrdersCache(cafeId: string, orders: unknown) {
  if (typeof window === "undefined") return;
  await withStore(ORDERS_STORE, "readwrite", (store) =>
    store.put({ cafeId, orders, savedAt: Date.now() }),
  );
}

export async function getOrdersCache(cafeId: string): Promise<unknown[] | null> {
  if (typeof window === "undefined") return null;
  const row = await withStore<{ orders: unknown[] } | undefined>(
    ORDERS_STORE,
    "readonly",
    (store) => store.get(cafeId),
  );
  return row?.orders ?? null;
}

export async function saveBillCache(cafeId: string, tableNumber: number, bill: unknown) {
  if (typeof window === "undefined") return;
  await withStore(BILLS_STORE, "readwrite", (store) =>
    store.put({ key: billKey(cafeId, tableNumber), bill, savedAt: Date.now() }),
  );
}

export async function getBillCache(cafeId: string, tableNumber: number): Promise<unknown | null> {
  if (typeof window === "undefined") return null;
  const row = await withStore<{ bill: unknown } | undefined>(BILLS_STORE, "readonly", (store) =>
    store.get(billKey(cafeId, tableNumber)),
  );
  return row?.bill ?? null;
}

export async function saveOpenTablesCache(cafeId: string, tables: unknown) {
  if (typeof window === "undefined") return;
  await withStore(OPEN_TABLES_STORE, "readwrite", (store) =>
    store.put({ cafeId, tables, savedAt: Date.now() }),
  );
}

export async function getOpenTablesCache(cafeId: string): Promise<unknown[] | null> {
  if (typeof window === "undefined") return null;
  const row = await withStore<{ tables: unknown[] } | undefined>(
    OPEN_TABLES_STORE,
    "readonly",
    (store) => store.get(cafeId),
  );
  return row?.tables ?? null;
}

export async function saveMenuCache(cafeId: string, categories: unknown) {
  if (typeof window === "undefined") return;
  await withStore(MENU_STORE, "readwrite", (store) =>
    store.put({ cafeId, categories, savedAt: Date.now() }),
  );
}

export async function getMenuCache(cafeId: string): Promise<unknown[] | null> {
  if (typeof window === "undefined") return null;
  const row = await withStore<{ categories: unknown[] } | undefined>(
    MENU_STORE,
    "readonly",
    (store) => store.get(cafeId),
  );
  return row?.categories ?? null;
}

export async function addPendingAction(
  action: Omit<PendingAction, "id" | "createdAt">,
) {
  const item: PendingAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  } as PendingAction;
  await withStore(QUEUE_STORE, "readwrite", (store) => store.put(item));
  window.dispatchEvent(new CustomEvent("kafe:offline-queue-changed"));
  return item.id;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  if (typeof window === "undefined") return [];
  return withStore<PendingAction[]>(QUEUE_STORE, "readonly", (store) => {
    const req = store.getAll();
    return req;
  });
}

export async function removePendingAction(id: string) {
  await withStore(QUEUE_STORE, "readwrite", (store) => store.delete(id));
  window.dispatchEvent(new CustomEvent("kafe:offline-queue-changed"));
}

export async function syncPendingActions(): Promise<number> {
  const actions = await getPendingActions();
  // ORDER_CREATE/APPEND avval, keyin status/close — bog'liqlik uchun
  const ordered = [...actions].sort((a, b) => {
    const rank = (t: PendingAction["type"]) =>
      t === "ORDER_CREATE" || t === "ORDER_APPEND" ? 0 : 1;
    const d = rank(a.type) - rank(b.type);
    return d !== 0 ? d : a.createdAt - b.createdAt;
  });

  let synced = 0;

  for (const action of ordered) {
    try {
      if (action.type === "ORDER_STATUS") {
        const res = await fetch(`/api/orders/${action.payload.orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action.payload.status }),
        });
        if (!res.ok) continue;
      } else if (action.type === "TABLE_CLOSE") {
        const res = await fetch(
          `/api/cafes/${action.payload.cafeId}/table-bill`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tableNumber: action.payload.tableNumber,
              paymentMethod: action.payload.paymentMethod,
            }),
          },
        );
        if (!res.ok) continue;
      } else if (action.type === "ORDER_CREATE") {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.payload),
        });
        if (!res.ok) continue;
      } else if (action.type === "ORDER_APPEND") {
        const res = await fetch(`/api/orders/${action.payload.orderId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: action.payload.items }),
        });
        if (!res.ok) continue;
      }
      await removePendingAction(action.id);
      synced++;
    } catch {
      // keyingi urinishda
    }
  }

  if (synced > 0) {
    window.dispatchEvent(new CustomEvent("kafe:synced"));
  }

  return synced;
}

export type { PendingAction };

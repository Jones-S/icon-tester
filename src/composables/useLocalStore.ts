// Browser-only persistence. Small JSON state goes to localStorage, binary files
// (icon images, font files) go to IndexedDB because localStorage is too small for them.
// Nothing here ever leaves the browser.

const DB_NAME = 'icon-tester'
const STORE = 'files'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

export async function fileGet<T>(key: string): Promise<T | undefined> {
  try {
    return await run<T | undefined>('readonly', (s) => s.get(key))
  } catch {
    return undefined
  }
}

export async function fileSet(key: string, value: unknown): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(value, key))
  } catch (err) {
    console.warn('Could not store file locally', err)
  }
}

export async function fileDelete(key: string): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(key))
  } catch {
    // ignore
  }
}

export async function fileClear(): Promise<void> {
  try {
    await run('readwrite', (s) => s.clear())
  } catch {
    // ignore
  }
}

export function jsonLoad<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function jsonSave(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode etc.) — app still works for this session
  }
}

export function jsonRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

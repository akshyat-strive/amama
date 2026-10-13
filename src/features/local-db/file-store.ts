"use client"

/*
 * Uploaded files live in IndexedDB, not localStorage: a scanned licence is
 * megabytes, localStorage's whole quota is about five, and IndexedDB stores
 * a `Blob` as-is with no base64 tax. Records elsewhere keep only the
 * returned id.
 *
 * Seeded applications carry ids starting `seed:` — those have no stored
 * bytes; a simple rendered document stands in, so a reviewer can still
 * open every file in the demo.
 */

const DB_NAME = "amama-files"
const STORE = "files"

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = action(transaction.objectStore(STORE))
        transaction.oncomplete = () => resolve(request ? request.result : undefined)
        transaction.onerror = () => reject(transaction.error)
      })
  )
}

function newFileId() {
  return `file-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Stores a file and returns the id to keep on the record. */
async function putFile(blob: Blob): Promise<string> {
  const id = newFileId()
  await run("readwrite", (store) => store.put(blob, id))
  return id
}

function seedFileId(label: string, owner: string) {
  return `seed:${encodeURIComponent(label)}|${encodeURIComponent(owner)}`
}

function escapeXml(text: string) {
  return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char)
}

/** A plain stand-in page for a seeded document. */
function seedDocument(id: string): Blob {
  const [label, owner] = id.slice(5).split("|").map(decodeURIComponent)
  const lines = [70, 92, 114, 136, 158, 210, 232, 254, 276]
    .map((y, index) => `<rect x="48" y="${y + 120}" width="${index % 3 === 2 ? 220 : 400}" height="10" rx="5" fill="#e6e9e7"/>`)
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="680" viewBox="0 0 500 680">
<rect width="500" height="680" fill="#ffffff"/><rect x="0" y="0" width="500" height="10" fill="#556b2f"/>
<text x="48" y="80" font-family="Inter, Arial, sans-serif" font-size="13" fill="#5f6b66">Sample document · amama demo</text>
<text x="48" y="122" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#111">${escapeXml(label)}</text>
<text x="48" y="152" font-family="Inter, Arial, sans-serif" font-size="15" fill="#333">${escapeXml(owner)}</text>
${lines}
<rect x="48" y="560" width="160" height="56" rx="10" fill="none" stroke="#556b2f" stroke-width="2" stroke-dasharray="6 5"/>
<text x="64" y="594" font-family="Inter, Arial, sans-serif" font-size="13" fill="#556b2f">Verified stamp</text>
</svg>`
  return new Blob([svg], { type: "image/svg+xml" })
}

async function getFile(id: string): Promise<Blob | null> {
  if (id.startsWith("seed:")) return seedDocument(id)
  try {
    return ((await run<Blob>("readonly", (store) => store.get(id))) as Blob | undefined) ?? null
  } catch {
    return null
  }
}

/** An object URL for previewing or downloading — revoke it when done. */
async function fileObjectUrl(id: string): Promise<string | null> {
  const blob = await getFile(id)
  return blob ? URL.createObjectURL(blob) : null
}

async function deleteFiles(ids: string[]) {
  const stored = ids.filter((id) => !id.startsWith("seed:"))
  if (stored.length === 0) return
  try {
    await run("readwrite", (store) => {
      for (const id of stored) store.delete(id)
    })
  } catch {
    // Already gone.
  }
}

async function clearFiles() {
  try {
    await run("readwrite", (store) => store.clear())
  } catch {
    // No database yet.
  }
}

export { putFile, getFile, fileObjectUrl, deleteFiles, clearFiles, seedFileId }

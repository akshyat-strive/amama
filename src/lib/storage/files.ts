import { Files } from "files-sdk"
import { neon } from "files-sdk/neon"

/**
 * The `uploads` bucket declared in `neon.ts` (private — every read needs a
 * presigned URL, every write needs the branch credential). Used for KYC
 * documents (`verification`) and term-sheet file uploads (`contracts`) —
 * both used to store base64/`localStorage`-only metadata; this is the one
 * place either feature touches actual bytes.
 */
const uploadsBucket = new Files({ adapter: neon({ bucket: "uploads" }) })

/** A stable, collision-free key: who it belongs to, when, and its own
 *  name — never trust the browser's filename alone as a key. */
function uploadKey(scope: string, ownerId: string, fileName: string) {
  return `${scope}/${ownerId}/${Date.now()}-${fileName}`
}

async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string) {
  await uploadsBucket.upload(key, body, { contentType })
}

/** A presigned GET — the only way anything (a KAM reviewing a document, a
 *  party downloading their own upload) ever reads a private object back. */
async function presignedReadUrl(key: string, expiresIn = 3600) {
  return uploadsBucket.url(key, { expiresIn })
}

export { uploadsBucket, uploadKey, uploadFile, presignedReadUrl }

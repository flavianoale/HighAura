export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('')
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptJson(passphrase: string, obj: any): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(obj))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const out = new Uint8Array(16 + 12 + ct.byteLength)
  out.set(salt, 0)
  out.set(iv, 16)
  out.set(new Uint8Array(ct), 28)
  return out
}

export async function decryptJson(passphrase: string, blob: ArrayBuffer): Promise<any> {
  const data = new Uint8Array(blob)
  const salt = data.slice(0,16)
  const iv = data.slice(16,28)
  const ct = data.slice(28)
  const key = await deriveKey(passphrase, salt)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(new Uint8Array(pt)))
}

import crypto from 'crypto'

/**
 * Generate a secure 8-digit PIN
 */
export function generateSecurePin(): string {
  return crypto.randomInt(10000000, 99999999).toString()
}

/**
 * Encrypt vote data using AES-256-GCM
 */
export function encryptVote(voteData: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv)

  let encrypted = cipher.update(voteData, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  })
}

/**
 * Decrypt vote data using AES-256-GCM
 */
export function decryptVote(encryptedData: string, encryptionKey: string): string {
  const { iv, encrypted, authTag } = JSON.parse(encryptedData)

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    Buffer.from(iv, 'hex')
  )

  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Hash a PIN for comparison
 */
export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

/**
 * Generate a unique vote ID
 */
export function generateVoteId(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Verify vote integrity
 */
export function verifyVoteIntegrity(voteId: string, voteHash: string): boolean {
  const calculatedHash = crypto.createHash('sha256').update(voteId).digest('hex')
  return calculatedHash === voteHash
}

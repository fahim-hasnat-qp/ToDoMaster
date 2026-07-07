import { randomBytes, createHash } from 'node:crypto';

/**
 * Verification/reset tokens are opaque random strings, never JWTs — they're
 * single-use and revocable (the DB row is the source of truth, not a signature).
 * We store only the SHA-256 hash of the token, mirroring password-hash hygiene:
 * a DB leak shouldn't hand out usable tokens.
 */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

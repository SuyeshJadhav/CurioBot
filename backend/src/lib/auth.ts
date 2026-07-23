import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Fail-secure: refuse to boot in production with default credentials
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "curiobot-super-secret-key-12345")) {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET must be securely set in production environment.");
}

const JWT_SECRET = process.env.JWT_SECRET || "curiobot-super-secret-key-12345";
const HASH_ITERATIONS = 600000; // Increased iterations for hashing protection

/**
 * Hashes a plaintext password using PBKDF2.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, 64, "sha256").toString("hex");
    return hash === testHash;
  } catch {
    return false;
  }
}

/**
 * Generates a lightweight, secure token containing the userId and role.
 */
export function generateToken(userId: string, role: string = 'user'): string {
  const payload = JSON.stringify({ userId, role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }); // 7 days expiration
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${signature}`;
}

export interface TokenPayload {
  userId: string;
  role: string;
}

/**
 * Verifies a token and extracts payload if valid.
 */
export function verifyTokenPayload(token: string): TokenPayload | null {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const payloadStr = Buffer.from(payloadB64, "base64").toString("utf8");
    const testSignature = crypto.createHmac("sha256", JWT_SECRET).update(payloadStr).digest("hex");
    if (signature !== testSignature) return null;

    const payload = JSON.parse(payloadStr);
    if (payload.exp < Date.now()) return null;

    return {
      userId: payload.userId as string,
      role: (payload.role as string) || 'user',
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a token and extracts the userId if valid.
 */
export function verifyToken(token: string): string | null {
  const payload = verifyTokenPayload(token);
  return payload ? payload.userId : null;
}

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for calendar_connections' stored secrets (Google refresh
// tokens, Apple app-specific passwords) — nothing calendar-related is
// ever stored in plaintext. Key is a 32-byte value, base64-encoded in
// the env var so it survives copy/paste into Vercel cleanly.
function getKey(): Buffer {
  const b64 = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

// Format: iv.authTag.ciphertext, each base64, dot-joined — a single
// text column can store this directly.
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const key = getKey();
  const [ivB64, authTagB64, ciphertextB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted value.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// ============================================================================
// 1. KEY MANAGEMENT & CRYPTO HELPERS
// ============================================================================

/**
 * Resolves a 32-byte AES-256 key from environment variables.
 * Accepts 64-char Hex, 44-char Base64, or passphrases (SHA-256 hashed).
 * Falls back to deterministic deployment entropy if unset.
 */
function getScrambleKey(): Buffer {
  const rawKey = process.env.SCRAMBLE_KEY || process.env.PROXY_SECRET;

  if (rawKey && rawKey.trim().length > 0) {
    const trimmed = rawKey.trim();

    // 64-character hex string (32 bytes)
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, "hex");
    }

    // Base64 string that decodes to 32 bytes
    try {
      const b64Buf = Buffer.from(trimmed, "base64");
      if (b64Buf.length === 32) return b64Buf;
    } catch {
      // Fall through to SHA-256
    }

    // Any passphrase: Hash with SHA-256 to guarantee 32 bytes
    return createHash("sha256").update(trimmed).digest();
  }

  // Fallback: Prevents server crash on preview deployments
  const fallbackEntropy =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.APP_URL ||
    "spotui-default-scramble-salt-2026";

  return createHash("sha256").update(fallbackEntropy).digest();
}

/**
 * Normalizes and decodes standard base64 or base64url inputs.
 */
function decodeBase64OrUrl(input: string): Buffer {
  let str = input.trim().replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4 !== 0) {
    str += "=";
  }
  return Buffer.from(str, "base64");
}

/**
 * Encodes a buffer to URL-safe base64 (RFC 4648 §5).
 */
function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ============================================================================
// 2. CORE ENCRYPT / DECRYPT ENGINES
// ============================================================================

interface ScrambleResult {
  result: string; // URL-safe base64 (safe for /s/:payload*)
  base64: string; // Standard base64
  format: string;
  expiresAt?: string;
}

interface DescrambleResult {
  payload: string;
  isUrl: boolean;
  expired?: boolean;
  expiresAt?: string;
}

function encryptPayload(text: string, key: Buffer, ttlSeconds?: number): ScrambleResult {
  const iv = randomBytes(12); // Recommended 96-bit IV for AES-GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let rawData: string = text;
  let expiresAt: string | undefined;

  // Wrap inside metadata if TTL is specified
  if (ttlSeconds && ttlSeconds > 0) {
    const expTime = Math.floor(Date.now() / 1000) + ttlSeconds;
    expiresAt = new Date(expTime * 1000).toISOString();
    rawData = JSON.stringify({ d: text, exp: expTime });
  }

  const ciphertext = Buffer.concat([cipher.update(rawData, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 bytes

  // Format: [12-byte IV][16-byte Auth Tag][Ciphertext]
  const combined = Buffer.concat([iv, tag, ciphertext]);

  return {
    result: toBase64Url(combined),
    base64: combined.toString("base64"),
    format: "aes-256-gcm",
    ...(expiresAt ? { expiresAt } : {}),
  };
}

function decryptPayload(encoded: string, key: Buffer): DescrambleResult {
  const data = decodeBase64OrUrl(encoded);

  if (data.length < 12 + 16) {
    throw new Error("Payload too short: Missing IV or GCM authentication tag");
  }

  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");

  // Check for TTL metadata
  if (decrypted.startsWith('{"d":') && decrypted.includes('"exp":')) {
    try {
      const parsed = JSON.parse(decrypted);
      if (typeof parsed.exp === "number") {
        const now = Math.floor(Date.now() / 1000);
        const expDate = new Date(parsed.exp * 1000).toISOString();

        if (now > parsed.exp) {
          return { payload: parsed.d, isUrl: isValidUrl(parsed.d), expired: true, expiresAt: expDate };
        }

        return { payload: parsed.d, isUrl: isValidUrl(parsed.d), expiresAt: expDate };
      }
    } catch {
      // Not JSON metadata, return as raw string
    }
  }

  return { payload: decrypted, isUrl: isValidUrl(decrypted) };
}

// ============================================================================
// 3. VERCEL SERVERLESS HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Api-Key, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const key = getScrambleKey();

  // Extract parameters
  const query = req.query;
  const body = req.body || {};

  const explicitMode = (query.mode || body.mode) as "encrypt" | "decrypt" | undefined;
  const ttl = Number(query.ttl || body.ttl) || undefined;
  const shouldRedirect = query.redirect === "true" || body.redirect === true;
  const shouldProxy = query.proxy === "true" || body.proxy === true;
  const forceJson = query.json === "true" || body.json === true;

  // Batch payload processing support
  if (Array.isArray(body.payloads)) {
    const mode = explicitMode || "encrypt";
    try {
      const results = body.payloads.map((item: string) =>
        mode === "decrypt" ? decryptPayload(item, key) : encryptPayload(item, key, ttl)
      );
      return res.status(200).json({ mode, count: results.length, results });
    } catch (err: any) {
      return res.status(400).json({ error: "Batch processing failed", message: err.message });
    }
  }

  // Single payload extraction
  const rawPayload =
    typeof body === "string"
      ? body
      : (query.payload as string) || (body.payload as string) || (body.url as string) || "";

  if (!rawPayload) {
    return res.status(400).json({
      error: "Missing payload",
      usage: {
        encrypt: "/api/scramble?payload=https://example.com&mode=encrypt",
        decrypt: "/api/scramble?payload=<encoded>&mode=decrypt",
        ttl: "/api/scramble?payload=https://example.com&ttl=3600",
        proxyRewrite: "/s/<encoded>",
      },
    });
  }

  // Auto-detection logic: Try decrypting first if it looks like an encrypted token
  let determinedMode = explicitMode;
  if (!determinedMode) {
    const isUrl = isValidUrl(rawPayload);
    if (isUrl) {
      determinedMode = "encrypt";
    } else {
      try {
        const decoded = decodeBase64OrUrl(rawPayload);
        if (decoded.length >= 28) {
          // Attempt dry-run decryption
          decryptPayload(rawPayload, key);
          determinedMode = "decrypt";
        } else {
          determinedMode = "encrypt";
        }
      } catch {
        determinedMode = "encrypt";
      }
    }
  }

  // --------------------------------------------------------------------------
  // ENCRYPT EXECUTION
  // --------------------------------------------------------------------------
  if (determinedMode === "encrypt") {
    try {
      const data = encryptPayload(rawPayload, key, ttl);
      return res.status(200).json({
        ...data,
        // Helper link ready to be pasted into the browser
        scrambleUrl: `/s/${data.result}`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Encryption failed", details: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // DECRYPT EXECUTION
  // --------------------------------------------------------------------------
  if (determinedMode === "decrypt") {
    try {
      const descrambled = decryptPayload(rawPayload, key);

      // Handle TTL Expiration
      if (descrambled.expired) {
        return res.status(410).json({
          error: "Payload expired",
          message: "The encrypted link has exceeded its configured time-to-live (TTL).",
          expiresAt: descrambled.expiresAt,
        });
      }

      const targetUrl = descrambled.payload;
      const isBrowserNavigation =
        !forceJson &&
        req.method === "GET" &&
        (req.headers.accept || "").includes("text/html");

      // Seamless Stealth Proxy: Route browser navigation or proxy flag through /api/proxy
      if (descrambled.isUrl && (shouldProxy || (isBrowserNavigation && !shouldRedirect))) {
        return res.redirect(307, `/api/proxy?url=${encodeURIComponent(targetUrl)}`);
      }

      // Direct Redirect
      if (descrambled.isUrl && shouldRedirect) {
        return res.redirect(307, targetUrl);
      }

      // Default JSON response
      return res.status(200).json(descrambled);
    } catch (err: any) {
      return res.status(400).json({
        error: "Decryption failed",
        details: "Invalid ciphertext, tampered data, or mismatched encryption key.",
        message: err.message,
      });
    }
  }

  return res.status(400).json({ error: "Invalid mode. Allowed: encrypt, decrypt" });
}

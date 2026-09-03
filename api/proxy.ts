import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "stream";

// ============================================================================
// 1. URL & SECURITY HELPERS
// ============================================================================

/**
 * Extracts and reconstructs the target URL, preserving nested query parameters.
 */
function extractTargetUrl(req: VercelRequest): string | null {
  // 1. Check body (POST/PUT)
  if (req.body && typeof req.body === "object" && req.body.url) {
    return String(req.body.url);
  }

  // 2. Extract from raw query string to preserve unencoded nested query params
  const rawUrl = req.url || "";
  try {
    const dummyUrl = new URL(rawUrl, "http://localhost");
    const target = dummyUrl.searchParams.get("url");
    if (!target) return null;

    // Collect any extra query parameters that may have been split off
    const proxyParams = new Set(["url", "api_key", "redirect", "proxy", "mode", "ttl"]);
    const extraParams: string[] = [];
    for (const [k, v] of dummyUrl.searchParams.entries()) {
      if (!proxyParams.has(k)) {
        extraParams.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
    }

    if (extraParams.length > 0) {
      const separator = target.includes("?") ? "&" : "?";
      return `${target}${separator}${extraParams.join("&")}`;
    }

    return target;
  } catch {
    if (typeof req.query.url === "string") return req.query.url;
    if (Array.isArray(req.query.url)) return req.query.url.join("/");
    return null;
  }
}

/**
 * Normalizes and validates incoming target URLs
 */
function sanitizeUrl(u?: string | null): string | null {
  if (!u) return null;
  let s = String(u).trim();
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    s = "https://" + s;
  }
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Blocks SSRF targeting local loopback, cloud instance metadata, and private subnets
 */
function isBlockedHostname(hostname: string): boolean {
  if (process.env.ALLOW_PRIVATE_HOSTS === "true") return false;

  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower === "0.0.0.0" ||
    lower === "169.254.169.254" || // AWS/GCP instance metadata
    lower === "metadata.google.internal" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  // IPv4 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
  const parts = lower.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
  }

  return false;
}

// ============================================================================
// 2. MAIN PROXY HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Preflight & Global Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type, X-Proxy-By, Set-Cookie"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. Optional API Key Verification (if PROXY_API_KEY env is configured)
  const requiredKey = process.env.PROXY_API_KEY;
  if (requiredKey && requiredKey.length > 0) {
    const providedKey = (req.headers["x-api-key"] ||
      req.query.api_key ||
      req.body?.api_key) as string | undefined;

    if (!providedKey || providedKey !== requiredKey) {
      return res.status(401).json({ error: "Invalid or missing API key for proxy" });
    }
  }

  // 3. Extract & Validate Target URL
  const rawTarget = extractTargetUrl(req);
  const target = sanitizeUrl(rawTarget);

  if (!target) {
    return res.status(400).json({
      error: "Missing or invalid url parameter",
      example: "/api/proxy?url=https://example.com/audio.mp3",
    });
  }

  const parsedUrl = new URL(target);

  // 4. SSRF Defense
  if (isBlockedHostname(parsedUrl.hostname)) {
    return res.status(403).json({ error: "Access to private or local network hosts is blocked" });
  }

  // 5. Optional Host Allowlist (if ALLOWLIST_HOSTS env is set)
  const allowlistEnv = (process.env.ALLOWLIST_HOSTS || "").trim();
  if (allowlistEnv) {
    const allowlist = allowlistEnv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!allowlist.includes(parsedUrl.hostname.toLowerCase())) {
      return res.status(403).json({ error: `Host '${parsedUrl.hostname}' is not allowed` });
    }
  }

  try {
    // 6. Browser Spoofing & Forwarding Headers (Chrome 122 Windows x64 Profile)
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        (req.headers.accept as string) ||
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": (req.headers["accept-language"] as string) || "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      Referer: parsedUrl.origin + "/",
      Origin: parsedUrl.origin,
    };

    // Forward streaming Range header (Required for audio/video seeking)
    if (req.headers.range) {
      upstreamHeaders["Range"] = req.headers.range as string;
    }

    // Forward incoming credentials / cookies / authorization
    if (req.headers.authorization) {
      upstreamHeaders["Authorization"] = req.headers.authorization as string;
    }
    if (req.headers.cookie) {
      upstreamHeaders["Cookie"] = req.headers.cookie as string;
    }

    // Forward content-type for payload bodies
    const reqContentType = req.headers["content-type"] as string | undefined;
    if (reqContentType) {
      upstreamHeaders["Content-Type"] = reqContentType;
    }

    // 7. Request Body Formatting (Supports JSON, URL-Encoded OAuth, and Raw)
    const method = (req.method || "GET").toUpperCase();
    const canHaveBody = !["GET", "HEAD"].includes(method) && req.body;
    let bodyData: any = undefined;

    if (canHaveBody) {
      if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
        bodyData = req.body;
      } else if (reqContentType?.includes("application/x-www-form-urlencoded")) {
        // Essential for Spotify & OAuth token endpoints
        bodyData = new URLSearchParams(req.body).toString();
      } else {
        bodyData = JSON.stringify(req.body);
      }
    }

    // 8. Execute Upstream Request
    const response = await fetch(target, {
      method,
      headers: upstreamHeaders,
      body: bodyData,
      redirect: "follow",
    });

    res.status(response.status);

    // 9. Forward Upstream Set-Cookie Headers
    if (typeof (response.headers as any).getSetCookie === "function") {
      const cookies: string[] = (response.headers as any).getSetCookie();
      if (cookies && cookies.length > 0) {
        // Remove upstream Domain constraint so the client browser accepts it
        const rewritten = cookies.map((c) =>
          c.replace(/Domain=[^;]+;?/gi, "").replace(/SameSite=None/gi, "SameSite=Lax")
        );
        res.setHeader("Set-Cookie", rewritten);
      }
    }

    // 10. Filter Restrictive Framing and Hop-by-Hop Headers
    const hopByHop = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
    ]);

    const blockedSecurityHeaders = new Set([
      "x-frame-options",
      "content-security-policy",
      "content-security-policy-report-only",
      "cross-origin-embedder-policy",
      "cross-origin-opener-policy",
    ]);

    const contentType = response.headers.get("content-type") || "";
    const isHtml = contentType.includes("text/html");
    const hasEncoding = Boolean(response.headers.get("content-encoding"));

    for (const [k, v] of response.headers.entries()) {
      const lower = k.toLowerCase();
      if (hopByHop.has(lower) || blockedSecurityHeaders.has(lower)) {
        continue;
      }

      // Drop content-length & content-encoding when modifying HTML or when fetch auto-decompressed
      if ((isHtml || hasEncoding) && (lower === "content-length" || lower === "content-encoding")) {
        continue;
      }

      res.setHeader(k, v);
    }

    // Custom Identification Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Proxy-By", "spotui-proxy");
    res.setHeader("X-Vercel-Proxy-Engine", "WSM-Stealth-Edge");
    res.setHeader("X-Spoofed-Fingerprint", "TLS-JA3-Chrome122-Win64");

    // Handle empty body status codes
    if (response.status === 204 || response.status === 304 || method === "HEAD") {
      return res.end();
    }

    // 11. HTML Response Processing: Framebuster Neutralization & Asset Injection
    if (isHtml) {
      let html = await response.text();

      // Resolve final origin (handles redirects properly)
      const finalOrigin = response.url ? new URL(response.url).origin : parsedUrl.origin;

      // Neutralize modern and legacy framebusters
      html = html.replace(
        /if\s*\(\s*(?:top|window\.top)\s*!==\s*(?:self|window\.self)\s*\)[^}]+}/gi,
        "/* framebuster neutralized */"
      );
      html = html.replace(
        /if\s*\(\s*(?:self|window\.self)\s*!==\s*(?:top|window\.top)\s*\)[^}]+}/gi,
        "/* framebuster neutralized */"
      );
      html = html.replace(
        /(?:window\.)?top\.location(?:\.href)?\s*=\s*(?:window\.)?self\.location(?:\.href)?/gi,
        "/* bypassed */"
      );
      html = html.replace(/window\.top\.location/gi, "window.self.location");
      html = html.replace(/top\.location/gi, "self.location");
      html = html.replace(/parent\.location/gi, "self.location");

      // Strip existing <base> tags to avoid collisions, then inject the correct base URL
      html = html.replace(/<base\b[^>]*>/gi, "");
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (match) => `${match}<base href="${finalOrigin}/">`);
      } else {
        html = `<base href="${finalOrigin}/">` + html;
      }

      // Inject client spoofing runtime
      const clientSpoofScript = `
        <script>
          (function() {
            try {
              window.__SPOTUI_PROXY__ = true;
              window.__SPOTUI_VERCEL_PROXY__ = true;
              window.__WSM_ACTIVE__ = true;
              Object.defineProperty(window, 'top', { get: function() { return window.self; } });
              Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
            } catch(e) {}
          })();
        </script>
      `;

      return res.send(clientSpoofScript + html);
    }

    // 12. Non-HTML Streaming (Audio, Video, Binary, JSON, Images)
    // Streams data on the fly with low latency and constant memory
    if (response.body && typeof Readable.fromWeb === "function") {
      const stream = Readable.fromWeb(response.body as any);
      stream.on("error", () => res.end());
      return stream.pipe(res);
    } else if (response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    } else {
      return res.end();
    }
  } catch (err: any) {
    return res.status(502).json({
      error: "Upstream fetch failed",
      message: err?.message || String(err),
      targetUrl: target,
    });
  }
}

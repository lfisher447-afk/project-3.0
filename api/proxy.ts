import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Sanitizes and normalizes incoming target URLs
 */
function sanitizeUrl(u?: string): string | null {
  if (!u) return null;
  let s = String(u).trim();
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    s = "https://" + s;
  }
  try {
    return new URL(s).toString();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Preflight & Global Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. Optional API Key Verification (if PROXY_API_KEY env is set)
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
  const rawUrl = (req.query.url || req.body?.url) as string | undefined;
  const target = sanitizeUrl(rawUrl);
  if (!target) {
    return res.status(400).json({ error: "Missing or invalid url parameter" });
  }

  const parsedUrl = new URL(target);

  // 4. Optional Host Allowlist (if ALLOWLIST_HOSTS env is set)
  const allowlistEnv = (process.env.ALLOWLIST_HOSTS || "").trim();
  if (allowlistEnv) {
    const allowlist = allowlistEnv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!allowlist.includes(parsedUrl.hostname.toLowerCase())) {
      return res.status(403).json({ error: "Host not allowed by allowlist" });
    }
  }

  try {
    // 5. Browser Spoofing & Forwarding Headers (Chrome 122 Windows x64 profile)
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        (req.headers.accept as string) ||
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
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

    // Forward range header for media/audio streaming
    if (req.headers.range) {
      upstreamHeaders["Range"] = req.headers.range as string;
    }

    // Forward content-type for payload bodies
    if (req.headers["content-type"]) {
      upstreamHeaders["Content-Type"] = req.headers["content-type"] as string;
    }

    // 6. Request Body Handling
    const method = req.method?.toUpperCase() || "GET";
    const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method) && req.body;
    const body = hasBody
      ? typeof req.body === "object"
        ? JSON.stringify(req.body)
        : req.body
      : undefined;

    // 7. Execute Upstream Request
    const response = await fetch(target, {
      method,
      headers: upstreamHeaders,
      body,
      redirect: "follow",
    });

    res.status(response.status);

    // 8. Filter & Forward Headers
    const hopByHop = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
      "content-encoding", // Dropped so Node/Vercel handles body compression properly
      "content-length",
    ]);

    const blockedSecurityHeaders = new Set([
      "x-frame-options",
      "content-security-policy",
      "content-security-policy-report-only",
      "cross-origin-embedder-policy",
      "cross-origin-opener-policy",
    ]);

    for (const [k, v] of response.headers.entries()) {
      const lower = k.toLowerCase();
      if (hopByHop.has(lower) || blockedSecurityHeaders.has(lower)) {
        continue;
      }
      res.setHeader(k, v);
    }

    // Custom Identification Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Proxy-By", "spotui-proxy");
    res.setHeader("X-Vercel-Proxy-Engine", "WSM-Stealth-Edge");
    res.setHeader("X-Spoofed-Fingerprint", "TLS-JA3-Chrome122-Win64");

    const contentType = response.headers.get("content-type") || "";

    // 9. Process Response Bodies
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Deobfuscate & neutralize framebusters
      html = html.replace(/if\s*\(top\s*!==\s*self\)[^}]+}/gi, "/* framebuster neutralized */");
      html = html.replace(/top\.location\s*=\s*self\.location/gi, "/* bypassed */");
      html = html.replace(/window\.top\.location/gi, "window.self.location");

      // Inject base tag for relative assets
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (match) => `${match}<base href="${parsedUrl.origin}/">`);
      } else {
        html = `<base href="${parsedUrl.origin}/">` + html;
      }

      // Inject combined client spoofing runtime
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
    } else if (
      contentType.includes("json") ||
      contentType.includes("text") ||
      contentType.includes("xml")
    ) {
      const text = await response.text();
      return res.send(text);
    } else {
      // Binary data, images, media, audio streams
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    }
  } catch (err: any) {
    return res.status(502).json({
      error: "Upstream fetch failed",
      message: err?.message || String(err),
      targetUrl: target,
    });
  }
}

/**
 * Lightweight, bounded in-process limiter.
 *
 * This is an application safety net, not a replacement for edge/WAF limits.
 * Use a shared store at the edge or a shared backend if multiple Node workers
 * or replicas are introduced. Never trust arbitrary forwarded IP headers unless
 * the origin can only be reached through the configured trusted proxy.
 */
export function createRateLimiter({
  windowMs = 60_000,
  limit = 120,
  keyPrefix = 'api',
  keyGenerator = (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  message = 'Too many requests. Please try again later.',
  maxEntries = 10_000,
} = {}) {
  const entries = new Map();
  let operations = 0;

  return function rateLimit(req, res, next) {
    const now = Date.now();
    // Periodically prune expired entries and cap memory use under high-cardinality traffic.
    if ((++operations % 256) === 0 || entries.size >= maxEntries) {
      for (const [key, value] of entries) {
        if (value.resetAt <= now) entries.delete(key);
      }
      while (entries.size >= maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    }

    let identity = 'unknown';
    try {
      identity = String(keyGenerator(req) || 'unknown').slice(0, 160);
    } catch {
      identity = 'unknown';
    }
    const key = keyPrefix + ':' + identity;
    let state = entries.get(key);
    if (!state || state.resetAt <= now) {
      state = { count: 0, resetAt: now + windowMs };
      entries.set(key, state);
    }

    state.count += 1;
    const remaining = Math.max(0, limit - state.count);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(state.resetAt / 1000)));

    if (state.count > limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((state.resetAt - now) / 1000))));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(429).json({ error: message });
    }
    next();
  };
}

export function applySecurityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Report-only first: the existing React and staff pages have inline styles/scripts.
  // Move to an enforced CSP only after browser reports and production smoke tests.
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; " +
      "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://cdn.discordapp.com; " +
      "connect-src 'self' https://discord.com; upgrade-insecure-requests"
  );

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
}

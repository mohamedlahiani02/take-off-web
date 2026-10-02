/**
 * The single place that decides which API the server talks to.
 *
 * There used to be two answers. `lib/prototype/serve.ts` fell back to the
 * production URL when the env var was missing, while `apiBase()` returned an
 * empty string — so the prototype pages kept working on Vercel without the
 * variable set, and the React pages silently rendered "unavailable". Same
 * deployment, same missing variable, two different behaviours.
 *
 * `API_URL` wins so a server-side override is possible without exposing it to
 * the browser; `NEXT_PUBLIC_API_URL` is the normal setting.
 */
const PRODUCTION_API = 'https://take-off-api.onrender.com'

/**
 * For fetches made by the server (route handlers, Server Components).
 * `API_URL` wins so the server can be pointed elsewhere — at a private address
 * or a test double — without that value reaching the browser.
 */
export function apiBase(): string {
  const configured = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? ''
  return (configured || PRODUCTION_API).replace(/\/$/, '')
}

/**
 * For URLs handed to the browser — notably the one injected into the prototype
 * pages as `window.TAKEOFF_API_URL`.
 *
 * Deliberately ignores `API_URL`: that address is only meaningful inside the
 * server. Leaking it to the page sends the browser to a different origin, where
 * the request dies in CORS rather than reaching the API.
 */
export function publicApiBase(): string {
  const configured = process.env['NEXT_PUBLIC_API_URL'] ?? ''
  return (configured || PRODUCTION_API).replace(/\/$/, '')
}

/**
 * Upper bound for a server-side read from the API.
 *
 * Without it a stalled upstream (a Render instance waking up, a dropped
 * connection) hangs the caller indefinitely: `next build` gives up on a page
 * after 60s, and a route handler holds the browser until the platform kills
 * the function. Kept well under the 60s prerender budget so a page that waits
 * on several reads in parallel still finishes and falls back to its
 * "unavailable" state instead of failing the build.
 */
const DEFAULT_READ_TIMEOUT_MS = 15_000

export function readTimeoutMs(): number {
  const configured = Number(process.env['API_READ_TIMEOUT_MS'])
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_READ_TIMEOUT_MS
}

/**
 * Abort signal for an idempotent read (GET) from the API. It also covers the
 * body, so a response whose headers arrive but whose body stalls is bounded too.
 *
 * Deliberately not used for writes: aborting a booking or payment POST on our
 * side does not stop the API from committing it, so the member would see a
 * failure for something that happened — and could pay twice by retrying.
 *
 * Next.js skips per-render request memoization for a fetch that carries a
 * signal, so callers that run more than once per render wrap themselves in
 * React's `cache()`. The persistent data cache (`next.revalidate`) is
 * unaffected: the signal is not part of its cache key.
 */
export function readSignal(): AbortSignal {
  return AbortSignal.timeout(readTimeoutMs())
}

/** True when the URL came from configuration rather than the built-in default. */
export function apiBaseIsConfigured(): boolean {
  return !!(process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'])
}

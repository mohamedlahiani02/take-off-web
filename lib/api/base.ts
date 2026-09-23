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

export function apiBase(): string {
  const configured = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? ''
  return (configured || PRODUCTION_API).replace(/\/$/, '')
}

/** True when the URL came from configuration rather than the built-in default. */
export function apiBaseIsConfigured(): boolean {
  return !!(process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'])
}

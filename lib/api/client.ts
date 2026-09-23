/**
 * API client placeholder.
 *
 * THIS FILE WILL BE REPLACED by an OpenAPI-generated TypeScript client once
 * take-off-api publishes its OpenAPI 3.1 spec. See .github/workflows/codegen.yml.
 *
 * For now, every call throws a clear "not implemented" error so TypeScript
 * consumers compile cleanly while the backend is absent.
 */

import type { ApiResponse } from './types'

class NotImplementedError extends Error {
  constructor(endpoint: string) {
    super(
      `API call to "${endpoint}" is not implemented yet. ` +
        `The take-off-api backend does not exist yet. ` +
        `See ARCHITECTURE.md §10 for the expected contract.`,
    )
    this.name = 'NotImplementedError'
  }
}

/**
 * Core fetch wrapper — prepends NEXT_PUBLIC_API_URL, includes cookies, and
 * throws on non-2xx responses.
 *
 * When the OpenAPI client is generated, it will wrap this function (or replace
 * it entirely with a generated SDK).
 */
export async function apiFetch<T>(
  path: string,
  _init?: RequestInit,
): Promise<ApiResponse<T>> {
  throw new NotImplementedError(path)

  // The implementation below will be uncommented once the backend is live:
  //
  // const base = process.env['NEXT_PUBLIC_API_URL']
  // if (!base) throw new Error('NEXT_PUBLIC_API_URL is not set')
  //
  // const res = await fetch(`${base}${path}`, {
  //   credentials: 'include',
  //   headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  //   ...init,
  // })
  //
  // if (!res.ok) {
  //   const body = await res.json().catch(() => ({}))
  //   throw Object.assign(new Error(body.detail ?? res.statusText), { status: res.status, body })
  // }
  //
  // return res.json() as Promise<ApiResponse<T>>
}

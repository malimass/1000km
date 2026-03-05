/**
 * api.ts — Client per le API routes Vercel (Neon PostgreSQL)
 */

/** URL base delle API (stringa vuota = same-origin su Vercel). */
export const API_BASE = "";

/** Token JWT in localStorage. */
const TOKEN_KEY = "gp_jwt";

export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setAuthToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* noop */ }
}

export function clearAuthToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
}

/** Esegue un fetch verso un'API route con Authorization header. */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

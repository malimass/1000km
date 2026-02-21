const STORAGE_KEY = "gratitudepath_ltw";

export function getLtwUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setLtwUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url.trim());
  } catch {}
}

export function clearLtwUrl(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

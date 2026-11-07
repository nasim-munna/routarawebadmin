/**
 * Browser-side API client. The access token lives in memory only; the
 * long-lived refresh token stays in an httpOnly cookie owned by the
 * /api/session routes, so page scripts can never read it.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
let onSessionLost: () => void = () => {};

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setSessionLostHandler(handler: () => void) {
  onSessionLost = handler;
}

async function requestNewToken(): Promise<string | null> {
  const response = await fetch("/api/session/refresh", { method: "POST" });
  if (!response.ok) return null;
  const { accessToken: token } = (await response.json()) as { accessToken: string };
  return token;
}

/**
 * Refresh tokens rotate on every use, so two refreshes running at once would
 * burn the same token and sign the user out. `refreshing` covers this tab
 * and the Web Lock covers other open tabs.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const token = navigator.locks
      ? await navigator.locks.request("routara-refresh", requestNewToken)
      : await requestNewToken();
    accessToken = token;
    return token;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function send(path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body) headers.set("Content-Type", "application/json");
  return fetch(`/backend/api/v1${path}`, { ...init, headers });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init);

  if (response.status === 401) {
    if (!(await refreshAccessToken())) {
      onSessionLost();
      throw new ApiError("Your session has ended. Please sign in again.", 401);
    }
    response = await send(path, init);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.message ?? "The server could not complete this request.", response.status);
  }
  return payload.data as T;
}

export const post = <T,>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const patch = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const put = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });

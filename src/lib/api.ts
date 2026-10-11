// Morline API client — talks to https://api.morline.space/v1.
// Tokens live in localStorage; a single in-flight refresh is shared across requests.

export const API_BASE = "https://api.morline.space/v1";

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
  requestId?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = body?.code ?? "unknown";
    if (body?.fields) this.fields = body.fields;
  }
}

const SESSION_KEY = "morline.session";

export function getSession(): Session | null {
  try {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const rawSession = params.get("auth_session");
      if (rawSession) {
        const parsed = JSON.parse(rawSession) as Session;
        if (parsed.accessToken) {
          setSession(parsed);
          params.delete("auth_session");
          const cleanSearch = params.toString() ? `?${params.toString()}` : "";
          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${cleanSearch}${window.location.hash}`,
          );
          return parsed;
        }
      }
    }
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

let refreshing: Promise<Session | null> | null = null;

async function refreshSession(): Promise<Session | null> {
  const current = getSession();
  if (!current) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      setSession(null);
      return null;
    }
    const next = (await res.json()) as Session;
    setSession(next);
    return next;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; formData?: FormData } = {},
): Promise<T> {
  const { method = "GET", body, auth = true, formData } = options;

  const doFetch = async (session: Session | null) => {
    const headers: Record<string, string> = {};
    if (formData) {
      // browser sets multipart boundary
    } else if (body !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (auth && session) headers["authorization"] = `Bearer ${session.accessToken}`;
    return fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : null),
    });
  };

  let session = getSession();
  // Proactively refresh if the token is expired or about to expire.
  if (auth && session && Date.parse(session.expiresAt) - Date.now() < 15_000) {
    refreshing ??= refreshSession().finally(() => (refreshing = null));
    session = await refreshing;
  }

  let res = await doFetch(session);

  // On 401, try one refresh + retry.
  if (res.status === 401 && auth && session) {
    refreshing ??= refreshSession().finally(() => (refreshing = null));
    const next = await refreshing;
    if (next) res = await doFetch(next);
  }

  // Lets listeners (e.g. the unapplied-changes bar) refresh right after any write.
  const notify = () => {
    if (method !== "GET" && res.ok && typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("morline:mutated", { detail: { path } }));
  };
  if (res.status === 204) {
    notify();
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) throw new ApiError(res.status, data as ApiErrorBody | null);
  notify();
  return data as T;
}

export function oauthUrl(provider: "github" | "google", redirectTo: string) {
  return `${API_BASE}/auth/oauth/${provider}/start?redirectTo=${encodeURIComponent(redirectTo)}`;
}

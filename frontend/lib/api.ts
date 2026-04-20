const API_BASE = process.env.NEXT_PUBLIC_API_BACKEND_URL || "";

const AUTH_ERROR_CODES = ["UNAUTHORIZED", "INVALID_TOKEN", "TOKEN_EXPIRED", "USER_NOT_FOUND"];

function isAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "code" in error.error &&
    typeof error.error.code === "string" &&
    AUTH_ERROR_CODES.includes(error.error.code)
  );
}

export function handleAuthError(error: unknown): boolean {
  if (isAuthError(error)) {
    clearToken();
    localStorage.removeItem("user");
    window.location.href = "/";
    return true;
  }
  return false;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true,
): Promise<T> {
  const url = `${API_BASE}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    const token = getToken();
    if (!token) {
      throw { error: { code: "UNAUTHORIZED", message: "Authentication required" } };
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: "Request failed" } }));
    throw error;
  }

  return response.json();
}

export async function publicFetch<T>(endpoint: string, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, options, false);
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, options, true);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
}

export async function login(identifier: string, password: string) {
  return publicFetch<{
    data: {
      user: {
        id: string;
        name: string;
        username: string;
        email: string;
        phone: string;
      };
      access_token: string;
    };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export async function register(data: {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}) {
  return publicFetch<{
    data: {
      user: {
        id: string;
        name: string;
        username: string;
        email: string;
        phone: string;
      };
      access_token: string;
    };
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout() {
  const result = await apiFetch<{ data: { success: boolean; message: string } }>(
    "/auth/logout",
    { method: "POST" },
  );
  clearToken();
  return result;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8800"

function getToken() {
  return localStorage.getItem("adminAccessToken")
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem("adminAccessToken")
    localStorage.removeItem("adminRefreshToken")
    window.location.href = "/admin/auth/login"
    throw new Error("Session expired")
  }

  if (!res.ok) {
    const text = await res.text()
    let msg = `Request failed: ${res.status}`
    try {
      const json = JSON.parse(text)
      msg = json.message || json.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  const text = await res.text()
  if (!text) return undefined as unknown as T
  try {
    const json = JSON.parse(text)
    return (json.success === true && json.data !== undefined ? json.data : json) as T
  } catch {
    return text as unknown as T
  }
}

export const adminApi = {
  get: <T = unknown>(path: string) => request<T>(path),
  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
}

export function isAdminAuthenticated(): boolean {
  return !!localStorage.getItem("adminAccessToken")
}

export function clearAdminSession() {
  localStorage.removeItem("adminAccessToken")
  localStorage.removeItem("adminRefreshToken")
  window.location.href = "/admin/auth/login"
}


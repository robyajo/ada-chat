const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function getTokens() {
  const at = localStorage.getItem("accessToken")
  const rt = localStorage.getItem("refreshToken")
  return { accessToken: at, refreshToken: rt }
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { accessToken } = getTokens()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      const { accessToken: newAt } = getTokens()
      headers["Authorization"] = `Bearer ${newAt}`
      const retry = await fetch(`${API_URL}${path}`, { ...options, headers })
      if (!retry.ok) {
        const text = await retry.text()
        let msg = `Request failed: ${retry.status}`
        try {
          const json = JSON.parse(text)
          msg = json.message || json.error || msg
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      const text = await retry.text()
      try {
        return JSON.parse(text)
      } catch {
        return text as unknown as T
      }
    }
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    throw new Error("Session expired")
  }

  if (!res.ok) {
    const text = await res.text()
    let msg = `Request failed: ${res.status}`
    try {
      const json = JSON.parse(text)
      msg = json.message || json.error || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  const text = await res.text()
  if (!text) return undefined as unknown as T
  try {
    return JSON.parse(text)
  } catch {
    return text as unknown as T
  }
}

async function attemptRefresh(): Promise<boolean> {
  const { refreshToken } = getTokens()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem("accessToken", data.tokens?.accessToken ?? data.accessToken ?? "")
    localStorage.setItem("refreshToken", data.tokens?.refreshToken ?? data.refreshToken ?? "")
    return true
  } catch {
    return false
  }
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken)
  localStorage.setItem("refreshToken", refreshToken)
}

export function clearTokens() {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
}

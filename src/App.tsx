import { useState, useEffect } from "react"
import Lobby from "./components/Lobby"
import Chat from "./components/Chat"
import OAuthCallback from "./components/OAuthCallback"
import { api, clearTokens } from "@/services/api"
import "./App.css"

const SESSION_KEY = "chat_session"

export interface AuthUser {
  id: string
  username: string
  displayName: string | null
  pin: string
  patuihApiKey: string | null
  patuihTenantId: string | null
}

interface Session {
  name: string
  room: string
  apiKey: string
  tenantId: string
  userId?: string
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

function saveSession(s: Session | null) {
  if (s) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

function getInitialAuthReady(): boolean {
  return !localStorage.getItem("accessToken")
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(getInitialAuthReady)

  const isOAuthPath = window.location.pathname === "/oauth/callback"

  useEffect(() => {
    if (isOAuthPath) return
    const at = localStorage.getItem("accessToken")
    if (!at) return
    let cancelled = false
    api
      .get<AuthUser>("/api/v1/auth/me")
      .then((user) => {
        if (!cancelled) setAuthUser(user)
      })
      .catch(() => {
        if (!cancelled) clearTokens()
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [isOAuthPath])

  useEffect(() => {
    const handler = () => {
      setAuthUser(null)
      setSession(null)
      saveSession(null)
    }
    window.addEventListener("auth:expired", handler)
    return () => window.removeEventListener("auth:expired", handler)
  }, [])

  if (isOAuthPath) {
    return <OAuthCallback />
  }

  if (!authReady) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center backdrop-blur-xl">
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  const hasApiKey = !!(authUser?.patuihApiKey && authUser?.patuihTenantId)

  // If user has an active session (in a room), show Chat
  if (session) {
    return (
      <Chat
        user={session.name}
        room={session.room}
        apiKey={session.apiKey}
        tenantId={session.tenantId}
        userId={session.userId}
        authUser={authUser}
        onLeave={() => {
          setSession(null)
          saveSession(null)
        }}
        onEnterRoom={(s) => {
          setSession(s)
          saveSession(s)
        }}
        onLogout={() => {
          setAuthUser(null)
          clearTokens()
        }}
      />
    )
  }

  // If authenticated AND has API key → Chat (no room = welcome screen)
  if (authUser && hasApiKey) {
    return (
      <Chat
        user={authUser.displayName || authUser.username}
        room=""
        apiKey={authUser.patuihApiKey!}
        tenantId={authUser.patuihTenantId!}
        userId={authUser.id}
        authUser={authUser}
        onLeave={() => {}}
        onEnterRoom={(s) => {
          setSession(s)
          saveSession(s)
        }}
        onLogout={() => {
          setAuthUser(null)
          clearTokens()
        }}
      />
    )
  }

  return (
    <Lobby
      authUser={authUser}
      onAuthSuccess={(user) => setAuthUser(user)}
      onEnter={(s) => {
        setSession(s)
        saveSession(s)
      }}
      onDirectChat={() => {
        // After setting up API key in Lobby, user goes to Chat
      }}
      onLogout={() => {
        setAuthUser(null)
        clearTokens()
      }}
    />
  )
}

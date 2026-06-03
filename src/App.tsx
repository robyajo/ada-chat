import { useState, useEffect } from "react"
import Lobby from "./components/Lobby"
import Chat from "./components/Chat"
import OAuthCallback from "./components/OAuthCallback"
import { api, clearTokens } from "@/services/api"

export interface AuthUser {
  id: string
  username: string
  displayName: string | null
  pin: string
}

interface Session {
  name: string
  room: string
  userId?: string
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const isOAuthPath = window.location.pathname === "/oauth/callback"
  const hasToken = !!localStorage.getItem("accessToken")

  useEffect(() => {
    if (isOAuthPath) return
    if (!hasToken) {
      setAuthReady(true)
      return
    }
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
    }
    window.addEventListener("auth:expired", handler)
    return () => window.removeEventListener("auth:expired", handler)
  }, [])

  if (isOAuthPath) return <OAuthCallback />

  if (!authReady) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center backdrop-blur-xl">
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  // In-room session
  if (session) {
    return (
      <Chat
        user={session.name}
        room={session.room}
        userId={session.userId}
        authUser={authUser}
        onLeave={() => setSession(null)}
        onEnterRoom={(s) => setSession(s)}
        onLogout={() => {
          setAuthUser(null)
          clearTokens()
        }}
      />
    )
  }

  // Authenticated → Chat (welcome/no room)
  if (authUser) {
    return (
      <Chat
        user={authUser.displayName || authUser.username}
        room=""
        userId={authUser.id}
        authUser={authUser}
        onLeave={() => {}}
        onEnterRoom={(s) => setSession(s)}
        onLogout={() => {
          setAuthUser(null)
          clearTokens()
        }}
      />
    )
  }

  // Not authenticated → Lobby
  return (
    <Lobby
      authUser={authUser}
      onAuthSuccess={(user) => setAuthUser(user)}
      onEnter={(s) => setSession(s)}
      onLogout={() => {
        setAuthUser(null)
        clearTokens()
      }}
    />
  )
}

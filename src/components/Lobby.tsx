import { useState } from "react"
import { api, setTokens } from "@/services/api"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthUser {
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

interface LobbyProps {
  authUser: AuthUser | null
  onAuthSuccess: (user: AuthUser) => void
  onEnter: (s: Session) => void
  onLogout: () => void
}

export default function Lobby({ authUser, onAuthSuccess, onEnter, onLogout }: LobbyProps) {
  const [name, setName] = useState(() => localStorage.getItem("chat_name") || "")
  const [room, setRoom] = useState("")
  const [error, setError] = useState(() => {
    const cached = localStorage.getItem("lobby_error")
    if (cached) { localStorage.removeItem("lobby_error"); return cached }
    return ""
  })
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [isRegister, setIsRegister] = useState(false)

  const handleAuth = async () => {
    setError("")
    setLoading(true)
    try {
      const endpoint = isRegister ? "register" : "login"
      const body = isRegister
        ? { username, email, password, confirmPassword: password }
        : { username, password }
      const data = await api.post<{
        tokens: { accessToken: string; refreshToken: string }
        user: { id: string; displayName: string | null; username: string; pin: string }
      }>(`/api/v1/auth/${endpoint}`, body)
      setTokens(data.tokens.accessToken, data.tokens.refreshToken)
      const userData = data.user
      localStorage.setItem("chat_name", userData.displayName || userData.username)
      onAuthSuccess({ id: userData.id, username: userData.username, displayName: userData.displayName, pin: userData.pin })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    setError("")
    setLoading(true)
    try {
      const n = name.trim() || "User"
      const r = room.trim()
      if (!r) { setError("Enter Room ID"); setLoading(false); return }
      localStorage.setItem("chat_name", n)
      onEnter({ name: n, room: r, userId: authUser?.id ?? "" })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room")
    } finally {
      setLoading(false)
    }
  }

  // --- Auth form ---
  if (!authUser) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        <Card className="relative w-[420px] overflow-hidden rounded-2xl border-white/10 bg-slate-900/40 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] backdrop-blur-xl">
          <CardHeader className="pt-8 pb-4 text-center">
            <div className="mb-6 flex justify-center">
              <div className="group relative">
                <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-indigo-500 to-emerald-500 opacity-25 blur-md transition duration-500 group-hover:opacity-40" />
                <div className="relative rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
              </div>
            </div>
            <CardTitle className="bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">Ada Chat</CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-slate-400">
              {isRegister ? "Create your account" : "Sign in to start chatting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6 pt-4 pb-6">
            <div className="space-y-2">
              <Label htmlFor="auth-username" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Username</Label>
              <Input id="auth-username" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" />
            </div>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="auth-email" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Email</Label>
                <Input id="auth-email" type="email" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Password</Label>
              <Input id="auth-password" type="password" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            </div>
            <div className="flex gap-2">
              <a href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/auth/google`} className="flex-1">
                <Button type="button" variant="outline" className="w-full h-11 rounded-xl border-slate-800 bg-slate-950/45 text-slate-300 hover:bg-slate-800 hover:text-white">Google</Button>
              </a>
            </div>
            {error && (
              <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
                <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500" onClick={handleAuth} disabled={loading}>
              {loading ? "..." : isRegister ? "Register" : "Login"}
            </Button>
            <p className="text-center text-xs text-slate-500">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button className="text-indigo-400 hover:underline" onClick={() => { setIsRegister(!isRegister); setError("") }}>
                {isRegister ? "Login" : "Register"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Room join (authenticated) ---
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      <Card className="relative w-[420px] overflow-hidden rounded-2xl border-white/10 bg-slate-900/40 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] backdrop-blur-xl">
        <CardHeader className="pt-8 pb-4 text-center">
          <CardTitle className="bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">Ada Chat</CardTitle>
          <CardDescription className="text-sm text-slate-400">
            Welcome, <span className="text-indigo-300 font-semibold">{authUser.displayName || authUser.username}</span>
            <span className="block mt-1 font-mono text-xs text-indigo-400">PIN: {authUser.pin}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="lobby-name" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Your Name</Label>
            <Input id="lobby-name" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lobby-room" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Room ID</Label>
            <Input id="lobby-room" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Enter Room ID" />
          </div>
          {error && (
            <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500" onClick={handleJoin} disabled={loading}>
            {loading ? "..." : "Join Room"}
          </Button>
          <Button variant="ghost" className="text-xs text-slate-500 hover:text-slate-300" onClick={onLogout}>Logout</Button>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from "react"
import { api } from "@/services/api"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

function genId() {
  return (
    "room_" +
    Date.now().toString(36).slice(-6) +
    Math.random().toString(36).slice(2, 6)
  )
}

interface Session {
  name: string
  room: string
  apiKey: string
  tenantId: string
  accessToken: string
  refreshToken: string
  userId: string
}

export default function Lobby({
  onEnter,
}: {
  onEnter: (s: Session) => void
}) {
  const [tab, setTab] = useState<"join" | "create" | null>(null)
  const [name, setName] = useState(
    () => localStorage.getItem("chat_name") || ""
  )
  const [room, setRoom] = useState("")
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("chat_key") || ""
  )
  const [generatedRoom, setGeneratedRoom] = useState("")
  const [error, setError] = useState(() => {
    const cached = localStorage.getItem("lobby_error")
    if (cached) {
      localStorage.removeItem("lobby_error")
      return cached
    }
    return ""
  })
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [isRegister, setIsRegister] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "patuih">("login")

  const handleAuth = async () => {
    setError("")
    setLoading(true)
    try {
      const endpoint = isRegister ? "register" : "login"
      const body = isRegister
        ? { username, email, password, confirmPassword: password }
        : { username, password }

      const data = await api.post<{
        tokens: { accessToken: string; refreshToken: string };
        user: {
          id: string;
          displayName: string | null;
          username: string;
          patuihApiKey: string | null;
          patuihTenantId: string | null;
        };
      }>(`/api/v1/auth/${endpoint}`, body)
      const { accessToken, refreshToken } = data.tokens
      const userData = data.user

      setTokens(accessToken, refreshToken)
      localStorage.setItem("chat_name", userData.displayName || userData.username)

      if (userData.patuihApiKey && userData.patuihTenantId) {
        onEnter({
          name: userData.displayName || userData.username,
          room: "",
          apiKey: userData.patuihApiKey,
          tenantId: userData.patuihTenantId,
          accessToken,
          refreshToken,
          userId: userData.id,
        })
      } else {
        setAuthMode("patuih")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const handleSavePatuihKey = async () => {
    setError("")
    setLoading(true)
    try {
      const data = await api.post<{ tenantId: string; message: string }>("/api/v1/chat/patuih-key", { apiKey })
      const n = name.trim() || "User"
      localStorage.setItem("chat_name", n)
      localStorage.setItem("chat_key", apiKey)
      onEnter({
        name: n,
        room: "",
        apiKey,
        tenantId: data.tenantId,
        accessToken: localStorage.getItem("accessToken") ?? "",
        refreshToken: localStorage.getItem("refreshToken") ?? "",
        userId: "",
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save API key")
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
      if (!r) {
        setError("Enter Room ID or Token")
        setTimeout(() => setError(""), 3000)
        return
      }

      let actualRoom = r
      let actualApiKey = apiKey.trim()
      let actualTenantId = ""

      if (r.length > 20) {
        try {
          const decoded = atob(r)
          const parts = decoded.split("|")
          if (parts.length >= 2) {
            actualRoom = parts[0]
            if (parts.length === 2) {
              actualApiKey = parts[1]
            } else if (parts.length === 3) {
              actualTenantId = parts[1]
              actualApiKey = parts[2]
            }
          }
        } catch {
          // not a base64 token
        }
      }

      if (!actualApiKey) {
        setError("API Key required")
        setTimeout(() => setError(""), 3000)
        return
      }

      // Save API key to backend first
      const keyResult = await api.post<{ tenantId: string }>("/api/v1/chat/patuih-key", { apiKey: actualApiKey })
      actualTenantId = actualTenantId || keyResult.tenantId

      localStorage.setItem("chat_name", n)
      localStorage.setItem("chat_key", actualApiKey)

      onEnter({
        name: n,
        room: actualRoom,
        apiKey: actualApiKey,
        tenantId: actualTenantId,
        accessToken: localStorage.getItem("accessToken") ?? "",
        refreshToken: localStorage.getItem("refreshToken") ?? "",
        userId: "",
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setError("")
    setLoading(true)
    try {
      const n = name.trim() || "User"
      const k = apiKey.trim()
      const r = generatedRoom
      if (!k) {
        setError("API Key required")
        setTimeout(() => setError(""), 3000)
        return
      }

      const keyResult = await api.post<{ tenantId: string }>("/api/v1/chat/patuih-key", { apiKey: k })

      localStorage.setItem("chat_name", n)
      localStorage.setItem("chat_key", k)

      onEnter({
        name: n,
        room: r,
        apiKey: k,
        tenantId: keyResult.tenantId,
        accessToken: localStorage.getItem("accessToken") ?? "",
        refreshToken: localStorage.getItem("refreshToken") ?? "",
        userId: "",
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create room")
    } finally {
      setLoading(false)
    }
  }

  function setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem("accessToken", accessToken)
    localStorage.setItem("refreshToken", refreshToken)
  }

  if (authMode === "login") {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,7,10,0.8)_80%)]" />

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
            <CardTitle className="bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              Ada Chat
            </CardTitle>
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

  if (authMode === "patuih") {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
        <Card className="relative w-[420px] overflow-hidden rounded-2xl border-white/10 bg-slate-900/40 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] backdrop-blur-xl">
          <CardHeader className="pt-8 pb-4 text-center">
            <CardTitle className="bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              Patuih API Key
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-slate-400">
              Enter your Patuih API Key to enable real-time messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="patuih-key" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">API Key</Label>
              <Input id="patuih-key" type="password" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="pk_live_..." />
            </div>
            {error && (
              <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
                <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500" onClick={handleSavePatuihKey} disabled={loading}>
              {loading ? "Validating..." : "Save & Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tab) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,7,10,0.8)_80%)]" />

        <Card className="relative w-[420px] overflow-hidden rounded-2xl border-white/10 bg-slate-900/40 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] backdrop-blur-xl transition-all duration-300">
          <CardHeader className="pt-8 pb-4 text-center">
            <div className="mb-6 flex justify-center">
              <div className="group relative">
                <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-indigo-500 to-emerald-500 opacity-25 blur-md transition duration-500 group-hover:opacity-40" />
                <div className="relative rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
              </div>
            </div>
            <CardTitle className="bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              Ada Chat
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-slate-400">
              Real-time messaging powered by Patuih Gateway.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6 pt-4 pb-6">
            <Button
              size="lg"
              className="flex w-full transform cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-indigo-400/20 bg-linear-to-r from-indigo-600 to-indigo-500 py-6 font-semibold text-white shadow-lg shadow-indigo-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-indigo-400 hover:shadow-indigo-500/25"
              onClick={() => { setTab("join"); setApiKey(localStorage.getItem("chat_key") || ""); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              Join Existing Room
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex w-full transform cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-emerald-500/35 bg-slate-950/40 py-6 font-semibold text-emerald-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-500/5 hover:text-emerald-300"
              onClick={() => { setTab("create"); setApiKey(localStorage.getItem("chat_key") || ""); setGeneratedRoom(genId()); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Create New Room
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

      <Card className="relative w-[440px] overflow-hidden rounded-2xl border-white/10 bg-slate-900/40 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] backdrop-blur-xl transition-all duration-300">
        <CardHeader className="relative border-b border-white/5 pt-8 pb-4">
          <Button variant="ghost" size="sm" className="absolute top-4 left-4 flex h-8 items-center gap-1.5 rounded-lg border border-slate-700/35 bg-slate-800/30 px-3 text-xs text-slate-400 hover:bg-slate-800/80 hover:text-white" onClick={() => setTab(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </Button>
          <div className="flex justify-center pt-6">
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
              {tab === "join" ? (
                <><span className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg></span><span className="bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">Join Chat Room</span></>
              ) : (
                <><span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span><span className="bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">Create Chat Room</span></>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="lobby-name" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Your Name</Label>
            <Input id="lobby-name" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 pl-3 text-white placeholder-slate-500" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lobby-room" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Room</Label>
            {tab === "create" ? (
              <div className="flex gap-2">
                <Input id="lobby-room" className="h-11 flex-1 rounded-xl border-slate-800/80 bg-slate-950/45 font-mono text-white placeholder-slate-500 read-only:opacity-85" value={generatedRoom} readOnly />
                <Button variant="secondary" className="h-11 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 text-xs font-semibold text-slate-200" onClick={() => { navigator.clipboard.writeText(apiKey ? btoa(`${generatedRoom}|${apiKey}`) : generatedRoom); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            ) : (
              <Input id="lobby-room" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 pl-3 text-white placeholder-slate-500" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Paste Room ID or Token here" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lobby-key" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">API Key</Label>
            <Input id="lobby-key" type="password" className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 pl-3 text-white placeholder-slate-500" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="pk_live_..." />
          </div>
          {error && (
            <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="px-6 pt-4 pb-8">
          <Button className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/15" onClick={tab === "join" ? handleJoin : handleCreate} disabled={loading}>
            {loading ? "..." : tab === "join" ? "Join Room" : "Create Room"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

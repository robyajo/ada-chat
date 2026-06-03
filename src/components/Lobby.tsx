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
  const [name, setName] = useState("")
  const [room, setRoom] = useState("")
  const [error, setError] = useState("")
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
      onEnter({ name: n, room: r, userId: authUser?.id ?? "" })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room")
    } finally {
      setLoading(false)
    }
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-[420px]">
          <CardHeader className="pt-8 pb-4 text-center">
            <CardTitle className="text-3xl font-extrabold tracking-tight">Ada Chat</CardTitle>
            <CardDescription className="mt-2">
              {isRegister ? "Create your account" : "Sign in to start chatting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6 pt-4 pb-6">
            <div className="space-y-2">
              <Label htmlFor="auth-username">Username</Label>
              <Input id="auth-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" />
            </div>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            </div>
            <div className="flex gap-2">
              <a href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/auth/google`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">Google</Button>
              </a>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full" onClick={handleAuth} disabled={loading}>
              {loading ? "..." : isRegister ? "Register" : "Login"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button className="text-primary hover:underline" onClick={() => { setIsRegister(!isRegister); setError("") }}>
                {isRegister ? "Login" : "Register"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-[420px]">
        <CardHeader className="pt-8 pb-4 text-center">
          <CardTitle className="text-3xl font-extrabold tracking-tight">Ada Chat</CardTitle>
          <CardDescription className="mt-2">
            Welcome, <span className="font-semibold text-foreground">{authUser.displayName || authUser.username}</span>
            <span className="mt-1 block font-mono text-xs text-muted-foreground">PIN: {authUser.pin}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="lobby-name">Your Name</Label>
            <Input id="lobby-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lobby-room">Room ID</Label>
            <Input id="lobby-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Enter Room ID" />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={handleJoin} disabled={loading}>
            {loading ? "..." : "Join Room"}
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={onLogout}>Logout</Button>
        </CardContent>
      </Card>
    </div>
  )
}

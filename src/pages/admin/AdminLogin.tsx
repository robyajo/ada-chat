import { useState } from "react"
import { useNavigate } from "react-router"
import { api } from "@/services/api"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError("")
    setLoading(true)
    try {
      const data = await api.post<{
        tokens: { accessToken: string; refreshToken: string }
        user: { role: string }
      }>("/api/v1/auth/login", { username, password })

      if (data.user.role !== "ADMIN") {
        setError("Unauthorized: admin access only")
        return
      }

      localStorage.setItem("adminAccessToken", data.tokens.accessToken)
      localStorage.setItem("adminRefreshToken", data.tokens.refreshToken)

      navigate("/admin")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-orange-500/5 blur-3xl" />
      <Card className="relative w-[420px] overflow-hidden rounded-2xl border-white/10 bg-slate-900/40 shadow-[0_0_50px_-12px_rgba(251,146,60,0.15)] backdrop-blur-xl">
        <CardHeader className="pt-8 pb-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="group relative">
              <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 opacity-25 blur-md transition duration-500 group-hover:opacity-40" />
              <div className="relative rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-amber-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
          </div>
          <CardTitle className="bg-linear-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">Admin Panel</CardTitle>
          <CardDescription className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-slate-400">
            Sign in with your admin credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6 pt-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="admin-username" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Username</Label>
            <Input
              id="admin-username"
              className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Password</Label>
            <Input
              id="admin-password"
              type="password"
              className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 text-white placeholder-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          {error && (
            <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full h-11 rounded-xl bg-amber-600 font-bold text-white hover:bg-amber-500" onClick={handleLogin} disabled={loading}>
            {loading ? "..." : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

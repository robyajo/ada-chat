import { useState } from "react"
import { Patuih } from "patuih-sdk"
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

const API_URL = import.meta.env.VITE_PATUIH_URL || "http://localhost:8000"

function genId() {
  return (
    "room_" +
    Date.now().toString(36).slice(-6) +
    Math.random().toString(36).slice(2, 6)
  )
}

export default function Lobby({
  onEnter,
}: {
  onEnter: (s: {
    name: string
    room: string
    apiKey: string
    tenantId: string
  }) => void
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

  const handleJoin = async () => {
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

    // Try decoding as a base64 Room Token
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
      } catch (e) {
        // Not a base64 token, treat as raw room ID
      }
    }

    if (!actualApiKey) {
      setError("API Key required (Invalid or missing token credentials)")
      setTimeout(() => setError(""), 3000)
      return
    }

    localStorage.setItem("chat_name", n)
    localStorage.setItem("chat_key", actualApiKey)

    if (!actualTenantId) {
      try {
        const patuih = new Patuih({ apiKey: actualApiKey, baseUrl: API_URL })
        const credits = await patuih.getCredits()
        actualTenantId = credits.tenantId || ""
        if (!actualTenantId) {
          setError("Invalid API key")
          return
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Invalid API key")
        return
      }
    }

    onEnter({ name: n, room: actualRoom, apiKey: actualApiKey, tenantId: actualTenantId })
  }

  const handleCreate = async () => {
    const n = name.trim() || "User"
    const k = apiKey.trim()
    const r = generatedRoom
    if (!k) {
      setError("API Key required")
      setTimeout(() => setError(""), 3000)
      return
    }
    localStorage.setItem("chat_name", n)
    localStorage.setItem("chat_key", k)

    let tenantId = ""
    try {
      const patuih = new Patuih({ apiKey: k, baseUrl: API_URL })
      const credits = await patuih.getCredits()
      tenantId = credits.tenantId || ""
      if (!tenantId) {
        setError("Invalid API key")
        return
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid API key")
      return
    }

    onEnter({ name: n, room: r, apiKey: k, tenantId })
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"></span>
              Live Gateway Active
            </div>
            <CardTitle className="bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              Patuih Chat
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-slate-400">
              Real-time messaging powered by the Patuih Webhook Gateway.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-6 pt-4 pb-6">
            <div className="mb-2 grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-slate-950/40 p-3 text-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Latency
                </span>
                <span className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>{" "}
                  ~12ms
                </span>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-white/5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Network
                </span>
                <span className="flex items-center justify-center gap-1 text-xs font-semibold text-indigo-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"></span>{" "}
                  WebSocket
                </span>
              </div>
            </div>
            <Button
              size="lg"
              className="flex w-full transform cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-indigo-400/20 bg-linear-to-r from-indigo-600 to-indigo-500 py-6 font-semibold text-white shadow-lg shadow-indigo-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-indigo-400 hover:shadow-indigo-500/25"
              onClick={() => {
                setTab("join")
                setName(localStorage.getItem("chat_name") || "")
                setApiKey(localStorage.getItem("chat_key") || "")
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Join Existing Room
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex w-full transform cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-emerald-500/35 bg-slate-950/40 py-6 font-semibold text-emerald-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-500/5 hover:text-emerald-300"
              onClick={() => {
                setTab("create")
                setName(localStorage.getItem("chat_name") || "")
                setApiKey(localStorage.getItem("chat_key") || "")
                setGeneratedRoom(genId())
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
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
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 flex h-8 items-center gap-1.5 rounded-lg border border-slate-700/35 bg-slate-800/30 px-3 text-xs text-slate-400 transition-all duration-200 hover:bg-slate-800/80 hover:text-white"
            onClick={() => setTab(null)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </Button>
          <div className="flex justify-center pt-6">
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
              {tab === "join" ? (
                <>
                  <span className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                  </span>
                  <span className="bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">
                    Join Chat Room
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </span>
                  <span className="bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">
                    Create Chat Room
                  </span>
                </>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-6 pt-6">
          <div className="space-y-2">
            <Label
              htmlFor="lobby-name"
              className="text-[10px] font-bold tracking-wider text-slate-400 uppercase"
            >
              Your Name
            </Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <Input
                id="lobby-name"
                className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 pl-10 text-white placeholder-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/50"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="lobby-room"
              className="text-[10px] font-bold tracking-wider text-slate-400 uppercase"
            >
              Room ID
            </Label>
            {tab === "create" ? (
              <div className="flex w-full gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" y1="9" x2="20" y2="9"></line>
                      <line x1="4" y1="15" x2="20" y2="15"></line>
                      <line x1="10" y1="3" x2="8" y2="21"></line>
                      <line x1="16" y1="3" x2="14" y2="21"></line>
                    </svg>
                  </div>
                  <Input
                    id="lobby-room"
                    className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 pl-10 font-mono text-white placeholder-slate-500 read-only:opacity-85"
                    value={generatedRoom}
                    readOnly
                  />
                </div>
                <Button
                  variant="secondary"
                  className="hover:bg-slate-850 h-11 rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 text-xs font-semibold text-slate-200"
                  onClick={() => {
                    const textToCopy = apiKey ? btoa(`${generatedRoom}|${apiKey}`) : generatedRoom
                    navigator.clipboard.writeText(textToCopy)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" y1="9" x2="20" y2="9"></line>
                    <line x1="4" y1="15" x2="20" y2="15"></line>
                    <line x1="10" y1="3" x2="8" y2="21"></line>
                    <line x1="16" y1="3" x2="14" y2="21"></line>
                  </svg>
                </div>
                <Input
                  id="lobby-room"
                  className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 pl-10 text-white placeholder-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/50"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Paste Room ID or Token here"
                />
              </div>
            )}
            <span className="block text-[11px] leading-relaxed text-slate-500">
              {tab === "create"
                ? "Share this Room Token with your friends."
                : "Enter the Room Token shared with you."}
            </span>
          </div>
          {tab === "create" && (
            <div className="space-y-2">
              <Label
                htmlFor="lobby-key"
                className="flex justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase"
              >
                <span>API Key</span>
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <Input
                  id="lobby-key"
                  className="h-11 rounded-xl border-slate-800/80 bg-slate-950/45 pl-10 text-white placeholder-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/50"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pk_live_..."
                  type="password"
                />
              </div>
              <span className="block text-[11px] leading-relaxed text-slate-500">
                Generate this key in Patuih → API Keys.
              </span>
            </div>
          )}
          {error && (
            <Alert
              variant="destructive"
              className="mt-2 rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400"
            >
              <AlertDescription className="text-xs font-semibold">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="px-6 pt-4 pb-8">
          {tab === "join" ? (
            <Button
              className="w-full transform rounded-xl bg-linear-to-r from-indigo-600 to-indigo-500 py-6 font-bold text-white shadow-lg shadow-indigo-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-indigo-400 hover:shadow-indigo-500/25"
              onClick={handleJoin}
            >
              Join Room
            </Button>
          ) : (
            <Button
              className="w-full transform rounded-xl bg-linear-to-r from-emerald-600 to-emerald-500 py-6 font-bold text-white shadow-lg shadow-emerald-600/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/25"
              onClick={handleCreate}
            >
              Create Room
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

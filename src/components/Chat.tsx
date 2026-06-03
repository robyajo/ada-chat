import { useState, useEffect, useRef, useCallback } from "react"
import { Socket } from "socket.io-client"
import { connectChat, disconnectChat, joinRoom, leaveRoom, sendMessage, sendTyping } from "@/services/socket"
import { api } from "@/services/api"
import Message from "./Message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6",
]

function getColor(name: string) {
  const n = name || "?"
  let hash = 0
  for (let i = 0; i < n.length; i++)
    hash = n.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface WsEventPayload {
  channel: string
  event: string
  data: Record<string, unknown>
  timestamp: string
}

interface AuthUser {
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

interface ChatProps {
  user: string
  room: string
  apiKey: string
  tenantId: string
  userId?: string
  authUser: AuthUser | null
  onLeave: () => void
  onEnterRoom: (s: Session) => void
  onLogout: () => void
}

function genId() {
  return "room_" + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 6)
}

export default function Chat({ user, room, apiKey, tenantId, userId, authUser, onLeave, onEnterRoom, onLogout }: ChatProps) {

  const [messages, setMessages] = useState<Record<string, unknown>[]>(() => {
    const cached = localStorage.getItem(`chat_messages_room_${room}`)
    if (cached) { try { return JSON.parse(cached) } catch { return [] } }
    return []
  })
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState<string[]>([user])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState("")
  const [fabOpen, setFabOpen] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showJoinRoom, setShowJoinRoom] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showFindPin, setShowFindPin] = useState(false)
  const [newName, setNewName] = useState(() => localStorage.getItem("chat_name") || user)
  const [newRoom, setNewRoom] = useState("")
  const [newApiKey, setNewApiKey] = useState(() => localStorage.getItem("chat_key") || apiKey)
  const [generatedRoom, setGeneratedRoom] = useState("")
  const [dialogError, setDialogError] = useState("")
  const [dialogLoading, setDialogLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchPin, setSearchPin] = useState("")
  const [searchingPin, setSearchingPin] = useState(false)
  const [pinResult, setPinResult] = useState<{ username: string; displayName: string | null } | null>(null)
  const [pinError, setPinError] = useState("")
  const [settingsKey, setSettingsKey] = useState("")
  const [settingsError, setSettingsError] = useState("")
  const [settingsLoading, setSettingsLoading] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const socketRef = useRef<Socket | null>(null)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    if (!tenantId || !room) return
    if (socketRef.current) disconnectChat()
    const token = localStorage.getItem("accessToken") ?? ""
    const uid = userId || ""
    const socket = connectChat(uid, user, tenantId, token)
    socketRef.current = socket
    socket.on("connect", () => { joinRoom(socket, room, user) })
    socket.on("event", (payload: WsEventPayload) => {
      if (payload.channel === room) {
        if (payload.event === "chat.message") {
          setMessages((prev) => {
            const msgId = (payload.data?.id as string) || `msg_${Date.now()}`
            if (prev.some((m) => m.id === msgId)) return prev
            return [...prev, { id: msgId, text: payload.data?.text, sender: payload.data?.sender, type: "received", timestamp: payload.timestamp || new Date().toISOString(), status: "delivered" }]
          })
        }
        if (payload.event === "chat.join") {
          const username = payload.data?.username as string
          if (username && username !== user) {
            setMessages((prev) => [...prev, { id: `sys_join_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: `${username} joined the room`, type: "system", timestamp: payload.timestamp || new Date().toISOString() }])
            setUsers((prev) => prev.includes(username) ? prev : [...prev, username])
          }
        }
        if (payload.event === "chat.present") {
          const username = payload.data?.username as string
          const target = payload.data?.target as string
          if (username && username !== user && target === user) setUsers((prev) => prev.includes(username) ? prev : [...prev, username])
        }
        if (payload.event === "chat.leave") {
          const username = payload.data?.username as string
          if (username && username !== user) {
            setMessages((prev) => [...prev, { id: `sys_leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: `${username} left the room`, type: "system", timestamp: payload.timestamp || new Date().toISOString() }])
            setUsers((prev) => prev.filter((u) => u !== username))
            setTypingUsers((prev) => prev.filter((u) => u !== username))
          }
        }
        if (payload.event === "chat.typing") {
          const username = payload.data?.username as string
          const isTyping = payload.data?.isTyping as boolean
          if (username && username !== user) setTypingUsers((prev) => isTyping ? (prev.includes(username) ? prev : [...prev, username]) : prev.filter((u) => u !== username))
        }
      }
    })
    socket.on("error", (msg: string) => setError(msg))
    return () => { leaveRoom(socket); disconnectChat(); socketRef.current = null }
  }, [room, user, tenantId, userId])

  useEffect(() => { if (room) localStorage.setItem(`chat_messages_room_${room}`, JSON.stringify(messages)) }, [messages, room])

  useEffect(() => {
    if (!room) return
    const cached = localStorage.getItem(`chat_messages_room_${room}`)
    if (!cached) setMessages([{ id: "sys_init", text: `${user} joined #${room}`, type: "system" as const, timestamp: new Date().toISOString() }])
  }, [room, user])

  const handleAutoLeave = useCallback(() => {
    localStorage.removeItem(`chat_messages_room_${room}`)
    localStorage.setItem("lobby_error", "Dikeluarkan karena tidak aktif 10 menit.")
    onLeave()
  }, [room, onLeave])
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(() => handleAutoLeave(), 10 * 60 * 1000)
  }, [handleAutoLeave])
  useEffect(() => {
    if (!room) return
    resetInactivityTimer()
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"]
    const handler = () => resetInactivityTimer()
    events.forEach((e) => window.addEventListener(e, handler))
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      events.forEach((e) => window.removeEventListener(e, handler))
    }
  }, [resetInactivityTimer, room])
  useEffect(() => {
    if (!room) return
    const socket = socketRef.current
    if (!socket) return
    if (!text.trim()) { if (isTypingRef.current) { isTypingRef.current = false; sendTyping(socket, false) }; return }
    if (!isTypingRef.current) { isTypingRef.current = true; sendTyping(socket, true) }
  }, [text, room])
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const send = useCallback(async () => {
    if (!room || sendingRef.current) return
    sendingRef.current = true
    const t = text.trim()
    if (!t) { sendingRef.current = false; return }
    setError("")
    resetInactivityTimer()
    const id = "msg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setMessages((prev) => [...prev, { id, text: t, sender: user, type: "sent", timestamp: new Date().toISOString(), status: "sending" }])
    setText("")
    setSending(true)
    try {
      const socket = socketRef.current
      if (socket && socket.connected) {
        sendMessage(socket, t, id, user, new Date().toISOString())
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m)))
      } else {
        await api.post("/api/v1/chat/publish", { roomId: room, text: t, id, sender: user, timestamp: new Date().toISOString() })
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m)))
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: "failed" } : m)))
      setError("Failed to send message")
    } finally { setSending(false); sendingRef.current = false }
  }, [text, room, user, resetInactivityTimer])

  const handleCopyRoomId = () => {
    if (!room) return
    try {
      navigator.clipboard.writeText(btoa(`${room}|${tenantId}|${apiKey}`))
      setToastMsg("Room Token copied to clipboard!")
    } catch {
      navigator.clipboard.writeText(room)
      setToastMsg("Room ID copied to clipboard!")
    }
    setTimeout(() => setToastMsg(""), 2500)
  }
  const handleManualLeave = () => {
    if (socketRef.current) leaveRoom(socketRef.current)
    localStorage.removeItem(`chat_messages_room_${room}`)
    onLeave()
  }
  const handleCreateRoom = async () => {
    setDialogError(""); setDialogLoading(true)
    try {
      const n = newName.trim() || "User"; const k = newApiKey.trim()
      if (!k) { setDialogError("API Key required"); setDialogLoading(false); return }
      const keyResult = await api.post<{ tenantId: string }>("/api/v1/chat/patuih-key", { apiKey: k })
      localStorage.setItem("chat_name", n); localStorage.setItem("chat_key", k)
      setShowCreateRoom(false); setFabOpen(false)
      onEnterRoom({ name: n, room: generatedRoom, apiKey: k, tenantId: keyResult.tenantId, userId: authUser?.id ?? "" })
    } catch (err: unknown) { setDialogError(err instanceof Error ? err.message : "Failed") }
    finally { setDialogLoading(false) }
  }
  const handleJoinRoom = async () => {
    setDialogError(""); setDialogLoading(true)
    try {
      const n = newName.trim() || "User"; const r = newRoom.trim()
      if (!r) { setDialogError("Enter Room ID or Token"); setDialogLoading(false); return }
      let actualRoom = r; let actualApiKey = newApiKey.trim(); let actualTenantId = ""
      if (r.length > 20) {
        try {
          const decoded = atob(r); const parts = decoded.split("|")
          if (parts.length >= 2) { actualRoom = parts[0]; actualApiKey = parts[1] }
          if (parts.length === 3) { actualTenantId = parts[1]; actualApiKey = parts[2] }
        } catch {}
      }
      if (!actualApiKey) { setDialogError("API Key required"); setDialogLoading(false); return }
      const keyResult = await api.post<{ tenantId: string }>("/api/v1/chat/patuih-key", { apiKey: actualApiKey })
      localStorage.setItem("chat_name", n); localStorage.setItem("chat_key", actualApiKey)
      setShowJoinRoom(false); setFabOpen(false)
      onEnterRoom({ name: n, room: actualRoom, apiKey: actualApiKey, tenantId: actualTenantId || keyResult.tenantId, userId: authUser?.id ?? "" })
    } catch (err: unknown) { setDialogError(err instanceof Error ? err.message : "Failed") }
    finally { setDialogLoading(false) }
  }
  const handleSearchPin = async () => {
    if (searchPin.length !== 6) return
    setSearchingPin(true); setPinResult(null); setPinError("")
    try {
      const found = await api.get<{ username: string; displayName: string | null }>(`/api/v1/auth/find-by-pin?pin=${searchPin}`)
      setPinResult(found)
    } catch (err: unknown) { setPinError(err instanceof Error ? err.message : "User not found") }
    finally { setSearchingPin(false) }
  }
  const handleUpdateApiKey = async () => {
    if (!settingsKey.trim()) return
    setSettingsError(""); setSettingsLoading(true)
    try {
      await api.post("/api/v1/chat/patuih-key", { apiKey: settingsKey.trim() })
      localStorage.setItem("chat_key", settingsKey.trim())
      setToastMsg("API Key updated!"); setShowSettings(false)
    } catch (err: unknown) { setSettingsError(err instanceof Error ? err.message : "Failed") }
    finally { setSettingsLoading(false) }
  }

  // === RENDER: IN-ROOM VIEW ===
  if (room) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
        <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white md:hidden" onClick={() => setSidebarOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </Button>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-500/10 p-1.5 text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <span className="bg-linear-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-sm font-extrabold text-transparent md:text-base">Ada Chat</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3">
            <span className="text-lg font-extrabold text-indigo-400">#</span>
            <Badge variant="secondary" className="rounded-lg border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300">
              {room.slice(0, 10)}{room.length > 10 ? "..." : ""}
            </Badge>
            <Badge variant="secondary" className="hidden rounded-lg border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 sm:inline-flex">{user}</Badge>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">{users.length} online</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger render={<button />} className="flex h-8 items-center gap-1.5 rounded-lg border-slate-800 bg-slate-900/35 px-2.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-white" onClick={() => setShowProfile(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </TooltipTrigger>
              <TooltipContent>Profile</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<button />} className="flex h-8 items-center gap-1.5 rounded-lg border-slate-800 bg-slate-900/35 px-2.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-white" onClick={() => setShowSettings(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<button />} className="flex h-8 items-center gap-1.5 rounded-lg border-slate-800 bg-slate-900/35 px-2.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-white" onClick={handleCopyRoomId}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </TooltipTrigger>
              <TooltipContent>Copy Token</TooltipContent>
            </Tooltip>
            <Button variant="destructive" size="sm" className="h-8 rounded-lg border border-rose-500/20 bg-rose-950/40 px-3 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white" onClick={handleManualLeave}>Leave</Button>
          </div>
        </header>

        <div className="relative flex h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
          <aside className="z-10 hidden w-[260px] flex-col border-r border-slate-800 bg-slate-950/20 md:flex">
            <ScrollArea className="flex-1">
              <div className="border-b border-slate-900 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                  Online Users
                </h3>
                <div className="flex flex-col gap-1.5">
                  {users.map((u) => (
                    <div key={u} className="flex items-center gap-2.5 rounded-xl border border-slate-800/30 bg-slate-900/20 px-3 py-2 text-sm text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="truncate font-medium">{u === user ? `${u} (You)` : u}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </aside>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-[280px] border-r border-slate-800 bg-slate-950 p-0 text-slate-100">
              <SheetHeader className="border-b border-slate-900 p-6">
                <SheetTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                  Active Members
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-2.5 p-5">
                {users.map((u) => (
                  <div key={u} className="flex items-center gap-2.5 rounded-xl bg-slate-900/20 px-3 py-2 text-sm text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>{u === user ? `${u} (You)` : u}</span>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <main className="flex h-full flex-1 flex-col overflow-hidden bg-slate-950/20">
            {error && (
              <div className="flex items-center justify-between border-b border-rose-500/20 bg-rose-500/10 px-6 py-2.5 text-xs font-medium text-rose-300">
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  {error}
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-rose-300 hover:bg-rose-500/20 hover:text-white" onClick={() => setError("")}>✕</Button>
              </div>
            )}
            <ScrollArea className="w-full flex-1">
              <div className="flex flex-col gap-4 p-4 md:p-6">
                {messages.map((m) => (
                  <Message key={m.id as string} msg={m} isOwn={m.sender === user} getColor={getColor} />
                ))}
                <div ref={endRef} />
              </div>
            </ScrollArea>
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-6 py-2 text-xs text-indigo-400 bg-slate-950/40 border-t border-slate-800/40">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                </span>
                <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
              </div>
            )}
            <div className="flex items-center gap-3 border-t border-slate-800/80 bg-slate-900/10 p-4 backdrop-blur-md">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === "Enter" && !sending && send()} disabled={sending}
                className="h-11 rounded-xl border-slate-800 bg-slate-950/60 px-4 text-white placeholder-slate-500 focus-visible:ring-indigo-500" />
              <Button onClick={send} disabled={sending || !text.trim()}
                className="h-11 rounded-xl bg-indigo-600 px-5 font-bold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500">
                {sending ? "..." : <><span className="hidden sm:inline">Send</span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></>}
              </Button>
            </div>
          </main>
        </div>
        {toastMsg && (
          <div className="toast-notif">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>{toastMsg}</span>
          </div>
        )}
        {/* Profile Sheet */}
        <ProfileSheet authUser={authUser} open={showProfile} onOpenChange={setShowProfile} />
        {/* Settings Sheet */}
        <SettingsSheet settingsKey={settingsKey} setSettingsKey={setSettingsKey} handleUpdate={handleUpdateApiKey} loading={settingsLoading} error={settingsError} open={showSettings} onOpenChange={setShowSettings} />
      </div>
    )
  }

  // === RENDER: WELCOME SCREEN (no room) ===
  return (
    <div className="flex h-screen flex-col bg-[#05070a] font-sans text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-1.5 text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span className="bg-linear-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-sm font-extrabold text-transparent md:text-base">Ada Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger render={<button />} className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/35 px-2.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-white" onClick={() => setShowProfile(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span className="hidden sm:inline">Profile</span>
            </TooltipTrigger>
            <TooltipContent className="border-slate-800 bg-slate-900 text-xs text-slate-300">Profile</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-300" onClick={onLogout}>Logout</Button>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-indigo-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h2 className="mb-2 text-2xl font-extrabold text-white">Welcome to Ada Chat</h2>
          <p className="mb-8 text-sm text-slate-400">Start a new chat or join an existing room to begin messaging.</p>
        </div>
      </div>
      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Button size="sm" className="h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500" onClick={() => { setShowCreateRoom(true); setGeneratedRoom(genId()); setFabOpen(false) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New Room
            </Button>
            <Button size="sm" className="h-11 rounded-xl bg-indigo-600 px-5 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500" onClick={() => { setShowJoinRoom(true); setFabOpen(false) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              Join Room
            </Button>
            <Button size="sm" variant="outline" className="h-11 rounded-xl border-slate-700 bg-slate-900/60 px-5 font-bold text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => { setShowFindPin(true); setFabOpen(false) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Find by PIN
            </Button>
          </div>
        )}
        <button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 transition-all duration-200 hover:bg-indigo-500 hover:scale-105 active:scale-95"
          onClick={() => setFabOpen(!fabOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
      {/* Profile Sheet */}
      <ProfileSheet authUser={authUser} open={showProfile} onOpenChange={setShowProfile} />
      {/* Settings Sheet */}
      <SettingsSheet settingsKey={settingsKey} setSettingsKey={setSettingsKey} handleUpdate={handleUpdateApiKey} loading={settingsLoading} error={settingsError} open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}

// --- Profile Sheet Component ---
function ProfileSheet({ authUser, open, onOpenChange }: { authUser: AuthUser | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!authUser) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[320px] border-slate-800 bg-slate-950 text-slate-100 sm:w-[380px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg font-extrabold text-white">Profile</SheetTitle>
        </SheetHeader>
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-3xl font-extrabold text-indigo-400">
              {(authUser.displayName || authUser.username).charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{authUser.displayName || authUser.username}</p>
              <p className="text-xs text-slate-400">@{authUser.username}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <Label className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">Your PIN</Label>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-white">{authUser.pin}</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg border border-slate-800/50 px-4 py-3">
              <span className="text-slate-400">Username</span>
              <span className="text-white">{authUser.username}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/50 px-4 py-3">
              <span className="text-slate-400">Display Name</span>
              <span className="text-white">{authUser.displayName || "-"}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/50 px-4 py-3">
              <span className="text-slate-400">API Key</span>
              <span className="text-xs text-emerald-400">{authUser.patuihApiKey ? "Configured" : "Not set"}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// --- Settings Sheet Component ---
function SettingsSheet({ settingsKey, setSettingsKey, handleUpdate, loading, error, open, onOpenChange }: {
  settingsKey: string; setSettingsKey: (v: string) => void; handleUpdate: () => void;
  loading: boolean; error: string; open: boolean; onOpenChange: (v: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[320px] border-slate-800 bg-slate-950 text-slate-100 sm:w-[380px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg font-extrabold text-white">Settings</SheetTitle>
          <SheetDescription className="text-slate-400">Update your Patuih API Key</SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">API Key</Label>
            <Input className="h-11 rounded-xl border-slate-800 bg-slate-900/60 text-white placeholder-slate-500" type="password" value={settingsKey} onChange={(e) => setSettingsKey(e.target.value)} placeholder="pk_live_..." />
          </div>
          {error && (
            <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500" onClick={handleUpdate} disabled={loading || !settingsKey.trim()}>
            {loading ? "..." : "Update API Key"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

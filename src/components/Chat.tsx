import { useState, useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { Patuih } from "patuih-sdk"
import Message from "./Message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const API_URL = import.meta.env.VITE_PATUIH_URL || "http://localhost:8000"
const WS_URL = import.meta.env.VITE_WS_URL || API_URL
const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#14b8a6",
]

function getColor(name: string) {
  const n = name || "?"
  let hash = 0
  for (let i = 0; i < n.length; i++)
    hash = n.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface ChatProps {
  user: string
  room: string
  apiKey: string
  tenantId: string
  onLeave: () => void
}

interface WsEventPayload {
  channel: string
  event: string
  data: Record<string, unknown>
  timestamp: string
}

export default function Chat({
  user,
  room,
  apiKey,
  tenantId,
  onLeave,
}: ChatProps) {
  const [messages, setMessages] = useState<Record<string, unknown>[]>(() => {
    const cached = localStorage.getItem(`chat_messages_room_${room}`)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        return []
      }
    }
    return []
  })
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState<string[]>([user])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState("")

  const endRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const socketRef = useRef<Socket | null>(null)
  const patuihRef = useRef(new Patuih({ apiKey, baseUrl: API_URL }))
  const isTypingRef = useRef(false)

  // Connect to Patuih WebSocket gateway
  useEffect(() => {
    if (!tenantId) return
    if (socketRef.current) socketRef.current.disconnect()

    const socket = io(WS_URL, { query: { tenantId } })
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("join-room", { roomId: room, username: user })
      // Inform others that we have joined
      patuihRef.current.publish(room, "chat.join", { username: user }).catch(() => {})
    })

    socket.on("event", (payload: WsEventPayload) => {
      if (payload.channel === room) {
        if (payload.event === "chat.message") {
          setMessages((prev) => {
            const msgId = (payload.data?.id as string) || `msg_${Date.now()}`
            if (prev.some((m) => m.id === msgId)) return prev
            return [
              ...prev,
              {
                id: msgId,
                text: payload.data?.text,
                sender: payload.data?.sender,
                type: "received",
                timestamp: payload.timestamp || new Date().toISOString(),
                status: "delivered",
              },
            ]
          })
        }
        if (payload.event === "chat.join") {
          const username = payload.data?.username as string
          if (username && username !== user) {
            // Add system message
            setMessages((prev) => [
              ...prev,
              {
                id: `sys_join_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                text: `${username} joined the room`,
                type: "system",
                timestamp: payload.timestamp || new Date().toISOString(),
              },
            ])
            // Add to online list
            setUsers((prev) =>
              prev.includes(username) ? prev : [...prev, username]
            )
            // Respond back so they know we are also here
            patuihRef.current.publish(room, "chat.present", {
              username: user,
              target: username,
            }).catch(() => {})
          }
        }
        if (payload.event === "chat.present") {
          const username = payload.data?.username as string
          const target = payload.data?.target as string
          if (username && username !== user && target === user) {
            // Add to online list
            setUsers((prev) =>
              prev.includes(username) ? prev : [...prev, username]
            )
          }
        }
        if (payload.event === "chat.leave") {
          const username = payload.data?.username as string
          if (username && username !== user) {
            // Add system message
            setMessages((prev) => [
              ...prev,
              {
                id: `sys_leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                text: `${username} left the room`,
                type: "system",
                timestamp: payload.timestamp || new Date().toISOString(),
              },
            ])
            // Remove from online list
            setUsers((prev) => prev.filter((u) => u !== username))
            // Remove from typing list
            setTypingUsers((prev) => prev.filter((u) => u !== username))
          }
        }
        if (payload.event === "chat.typing") {
          const username = payload.data?.username as string
          const isTyping = payload.data?.isTyping as boolean
          if (username && username !== user) {
            setTypingUsers((prev) => {
              if (isTyping) {
                return prev.includes(username) ? prev : [...prev, username]
              } else {
                return prev.filter((u) => u !== username)
              }
            })
          }
        }
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      patuihRef.current.publish(room, "chat.leave", { username: user }).catch(() => {})
    }
  }, [room, user, tenantId])

  // Persist messages
  useEffect(() => {
    localStorage.setItem(`chat_messages_room_${room}`, JSON.stringify(messages))
  }, [messages, room])

  // Init message
  useEffect(() => {
    const cached = localStorage.getItem(`chat_messages_room_${room}`)
    if (!cached) {
      setMessages([
        {
          id: "sys_init",
          text: `${user} joined #${room}`,
          type: "system",
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }, [room, user])

  // Auto leave inactivity
  const handleAutoLeave = useCallback(() => {
    localStorage.removeItem(`chat_messages_room_${room}`)
    localStorage.setItem(
      "lobby_error",
      "Dikeluarkan karena tidak aktif 10 menit."
    )
    onLeave()
  }, [room, onLeave])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(
      () => handleAutoLeave(),
      10 * 60 * 1000
    )
  }, [handleAutoLeave])

  useEffect(() => {
    resetInactivityTimer()
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"]
    const handler = () => resetInactivityTimer()
    events.forEach((e) => window.addEventListener(e, handler))
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      events.forEach((e) => window.removeEventListener(e, handler))
    }
  }, [resetInactivityTimer])

  // Publish typing status when text changes
  useEffect(() => {
    if (!text.trim()) {
      if (isTypingRef.current) {
        isTypingRef.current = false
        patuihRef.current.publish(room, "chat.typing", {
          username: user,
          isTyping: false,
        }).catch(() => {})
      }
      return
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true
      patuihRef.current.publish(room, "chat.typing", {
        username: user,
        isTyping: true,
      }).catch(() => {})
    }
  }, [text, room, user])

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = useCallback(async () => {
    if (sendingRef.current) return
    sendingRef.current = true
    const t = text.trim()
    if (!t) {
      sendingRef.current = false
      return
    }
    setError("")
    resetInactivityTimer()

    const id =
      "msg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setMessages((prev) => [
      ...prev,
      {
        id,
        text: t,
        sender: user,
        type: "sent",
        timestamp: new Date().toISOString(),
        status: "sending",
      },
    ])
    setText("")
    setSending(true)

    try {
      await patuihRef.current.publish(room, "chat.message", {
        text: t,
        sender: user,
        id,
        timestamp: new Date().toISOString(),
      })
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m))
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "failed" } : m))
      )
      setError("Failed to publish event")
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }, [text, room, user, resetInactivityTimer])

  const handleCopyRoomId = () => {
    try {
      const token = btoa(`${room}|${tenantId}|${apiKey}`)
      navigator.clipboard.writeText(token)
      setToastMsg("Room Token copied to clipboard!")
    } catch {
      navigator.clipboard.writeText(room)
      setToastMsg("Room ID copied to clipboard!")
    }
    setTimeout(() => setToastMsg(""), 2500)
  }

  const handleManualLeave = () => {
    patuihRef.current.publish(room, "chat.leave", { username: user }).catch(() => {})
    localStorage.removeItem(`chat_messages_room_${room}`)
    onLeave()
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </Button>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-500/10 p-1.5 text-indigo-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span className="bg-linear-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-sm font-extrabold text-transparent md:text-base">
              Patuih Chat
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3">
          <span className="text-lg font-extrabold text-indigo-400">#</span>
          <Badge
            variant="secondary"
            className="rounded-lg border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300"
          >
            {room.slice(0, 10)}
            {room.length > 10 ? "..." : ""}
          </Badge>
          <Badge
            variant="secondary"
            className="hidden rounded-lg border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 sm:inline-flex"
          >
            {user}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">{users.length} online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {apiKey && (
            <Tooltip>
              <TooltipTrigger
                render={<div />}
                className="cursor-help rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5 text-amber-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                </svg>
              </TooltipTrigger>
              <TooltipContent className="border-slate-800 bg-slate-900 text-xs text-slate-300">
                Connected via Patuih Gateway
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={<button />}
              className="flex h-8 items-center gap-1.5 rounded-lg border-slate-800 bg-slate-900/35 px-2.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-white"
              onClick={handleCopyRoomId}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span className="hidden sm:inline">Copy Token</span>
            </TooltipTrigger>
            <TooltipContent className="border-slate-800 bg-slate-900 text-xs text-slate-300">
              Copy Room Token
            </TooltipContent>
          </Tooltip>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 rounded-lg border border-rose-500/20 bg-rose-950/40 px-3 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white"
            onClick={handleManualLeave}
          >
            Leave
          </Button>
        </div>
      </header>

      <div className="relative flex h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
        <aside className="z-10 hidden w-[260px] flex-col border-r border-slate-800 bg-slate-950/20 md:flex">
          <ScrollArea className="flex-1">
            <div className="border-b border-slate-900 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                Online Users
              </h3>
              <div className="flex flex-col gap-1.5">
                {users.map((u) => (
                  <div
                    key={u}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-800/30 bg-slate-900/20 px-3 py-2 text-sm text-slate-300"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="truncate font-medium">
                      {u === user ? `${u} (You)` : u}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Room Details
              </h3>
              <div className="space-y-2">
                <div className="space-y-1 rounded-xl border border-slate-900/80 bg-slate-950/40 p-3 text-xs break-all text-slate-400">
                  <div className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
                    Room ID
                  </div>
                  <div>{room}</div>
                </div>
                <div className="space-y-1 rounded-xl border border-slate-900/80 bg-slate-950/40 p-3 text-xs break-all text-slate-400">
                  <div className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
                    Logged In As
                  </div>
                  <div className="font-semibold text-slate-300">{user}</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-[280px] border-r border-slate-800 bg-slate-950 p-0 text-slate-100"
          >
            <SheetHeader className="border-b border-slate-900 p-6">
              <SheetTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                Active Members
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-2.5 p-5">
              {users.map((u) => (
                <div
                  key={u}
                  className="flex items-center gap-2.5 rounded-xl bg-slate-900/20 px-3 py-2 text-sm text-slate-300"
                >
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-rose-300 hover:bg-rose-500/20 hover:text-white"
                onClick={() => setError("")}
              >
                ✕
              </Button>
            </div>
          )}

          <ScrollArea className="w-full flex-1">
            <div className="flex flex-col gap-4 p-4 md:p-6">
              {messages.map((m) => (
                <Message
                  key={m.id as string}
                  msg={m}
                  isOwn={m.sender === user}
                  getColor={getColor}
                />
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
              <span>
                {typingUsers.join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-slate-800/80 bg-slate-900/10 p-4 backdrop-blur-md">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && !sending && send()}
              disabled={sending}
              className="h-11 rounded-xl border-slate-800 bg-slate-950/60 px-4 text-white placeholder-slate-500 focus-visible:ring-indigo-500"
            />
            <Button
              onClick={send}
              disabled={sending || !text.trim()}
              className="h-11 rounded-xl bg-indigo-600 px-5 font-bold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500"
            >
              {sending ? (
                "..."
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </>
              )}
            </Button>
          </div>
        </main>
      </div>

      {toastMsg && (
        <div className="toast-notif">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}

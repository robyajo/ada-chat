import { useState, useEffect, useRef, useCallback } from "react"
import { Socket } from "socket.io-client"
import {
  connectChat,
  disconnectChat,
  joinRoom,
  leaveRoom,
  sendMessage,
  sendTyping,
} from "@/services/socket"
import { api } from "@/services/api"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ProfileSheet from "./com-chat/ProfileSheet"
import Sidebar from "./com-chat/Sidebar"
import MomentFeed from "./com-chat/MomentFeed"
import ActiveChatArea from "./com-chat/ActiveChatArea"
import { Sparkles, Menu, Search, MessageSquare } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"

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
}

interface Session {
  name: string
  room: string
  userId?: string
}

interface ChatProps {
  user: string
  room: string
  userId?: string
  authUser: AuthUser | null
  onLeave: () => void
  onEnterRoom: (s: Session) => void
  onLogout: () => void
}

function genId() {
  return (
    "room_" +
    Date.now().toString(36).slice(-6) +
    Math.random().toString(36).slice(2, 6)
  )
}

export default function Chat({
  user,
  room,
  userId,
  authUser,
  onLeave,
  onEnterRoom,
  onLogout,
}: ChatProps) {
  const [activeTab, setActiveTab] = useState<
    "chat" | "room" | "contact" | "moment"
  >(() => {
    if (room) {
      return room.startsWith("dm_") ? "chat" : "room"
    }
    return "chat"
  })

  // Contacts states
  const [contacts, setContacts] = useState<any[]>([])
  const [invites, setInvites] = useState<{ received: any[]; sent: any[] }>({
    received: [],
    sent: [],
  })
  const [onlineContacts, setOnlineContacts] = useState<string[]>([])
  const [showFabDialog, setShowFabDialog] = useState(false)
  const [fabSearchQuery, setFabSearchQuery] = useState("")

  const fetchContacts = useCallback(async () => {
    try {
      const data = await api.get<any[]>("/api/v1/contacts")
      setContacts(data)
    } catch {
      // ignore
    }
  }, [])

  const fetchInvites = useCallback(async () => {
    try {
      const data = await api.get<any>("/api/v1/contacts/invites")
      setInvites(data)
    } catch {
      // ignore
    }
  }, [])

  const fetchOnlineContacts = useCallback(async () => {
    try {
      const data = await api.get<{ online: string[] }>(
        "/api/v1/contacts/online"
      )
      setOnlineContacts(data.online)
    } catch {
      // ignore
    }
  }, [])

  const handleInviteContact = async (target: string) => {
    await api.post("/api/v1/contacts/invite", { target })
    fetchInvites()
  }

  const handleAcceptInvite = async (id: string) => {
    await api.post(`/api/v1/contacts/accept/${id}`)
    fetchInvites()
    fetchContacts()
    fetchOnlineContacts()
  }

  const handleRejectInvite = async (id: string) => {
    await api.post(`/api/v1/contacts/reject/${id}`)
    fetchInvites()
  }

  useEffect(() => {
    if (authUser) {
      fetchContacts()
      fetchInvites()
      fetchOnlineContacts()
    }
  }, [authUser, fetchContacts, fetchInvites, fetchOnlineContacts])

  const [recentDms, setRecentDms] = useState<
    Array<{ username: string; lastMessage?: string; timestamp?: string }>
  >([
    {
      username: "DeepMind Agent",
      lastMessage: "Hey! I am Antigravity. Ask me anything!",
      timestamp: new Date().toISOString(),
    },
    {
      username: "Patuih Support",
      lastMessage: "Let us know if you need help configuring your API Key.",
      timestamp: new Date().toISOString(),
    },
  ])

  function getDmTarget(roomId: string, currentUser: string): string | null {
    if (!roomId.startsWith("dm_")) return null
    const parts = roomId.slice(3).split("_")
    return parts[0] === currentUser ? parts[1] : parts[0]
  }

  function getDmRoomId(userA: string, userB: string) {
    const sorted = [userA, userB].sort()
    return `dm_${sorted[0]}_${sorted[1]}`
  }

  const activeDmUser = room ? getDmTarget(room, user) : null

  const [messages, setMessages] = useState<Record<string, unknown>[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState<string[]>([user])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState("")
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showJoinRoom, setShowJoinRoom] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [generatedRoom, setGeneratedRoom] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [dialogError, setDialogError] = useState("")
  const [dialogLoading, setDialogLoading] = useState(false)
  const [userRooms, setUserRooms] = useState<
    Array<{
      id: string
      name: string
      roomId: string
      memberCount: number
      isOwner: boolean
    }>
  >([])

  const endRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const socketRef = useRef<Socket | null>(null)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    const effectiveTenantId = "system"
    const token = localStorage.getItem("accessToken") ?? ""
    const uid = userId || ""

    const socket = connectChat(uid, user, effectiveTenantId, token)
    socketRef.current = socket
    socket.on("connect", () => {
      if (room) {
        joinRoom(socket, room, user)
      }
    })
    socket.on("notification", (payload: any) => {
      if (payload.event === "contact.invite") {
        setToastMsg(`Friend request from @${payload.data.sender.username}!`)
        setTimeout(() => setToastMsg(""), 3500)
        fetchInvites()
      } else if (payload.event === "contact.accepted") {
        setToastMsg(`@${payload.data.receiver.username} accepted your request!`)
        setTimeout(() => setToastMsg(""), 3500)
        fetchContacts()
        fetchOnlineContacts()
      } else if (payload.event === "contact.deleted") {
        fetchContacts()
        fetchOnlineContacts()
      }
    })
    socket.on("presence", (payload: any) => {
      if (payload.event === "presence.online") {
        const u = payload.data.username
        setOnlineContacts((prev) => (prev.includes(u) ? prev : [...prev, u]))
      } else if (payload.event === "presence.offline") {
        const u = payload.data.username
        setOnlineContacts((prev) => prev.filter((x) => x !== u))
      }
    })
    socket.on("event", (payload: WsEventPayload) => {
      if (payload.channel === room) {
          if (payload.event === "chat.message") {
          setMessages((prev) => {
            const msgId = (payload.data?.id as string) || `msg_${Date.now()}`
            if (prev.some((m) => m.id === msgId)) return prev
            const rawText = payload.data?.text
            return [
              ...prev,
              {
                id: msgId,
                text: typeof rawText === "string" ? rawText : JSON.stringify(rawText),
                sender: payload.data?.sender,
                type: "received",
                timestamp: payload.timestamp || new Date().toISOString(),
                status: "delivered",
              },
            ]
          })

          // Update recent DMs list if this is a DM channel
          if (room.startsWith("dm_")) {
            const dmUser = getDmTarget(room, user)
            if (dmUser) {
              setRecentDms((prev) => {
                const textVal = (payload.data?.text as string) || ""
                const exists = prev.some((d) => d.username === dmUser)
                if (exists) {
                  return [
                    {
                      username: dmUser,
                      lastMessage: textVal,
                      timestamp: payload.timestamp || new Date().toISOString(),
                    },
                    ...prev.filter((d) => d.username !== dmUser),
                  ]
                }
                return [
                  {
                    username: dmUser,
                    lastMessage: textVal,
                    timestamp: payload.timestamp || new Date().toISOString(),
                  },
                  ...prev,
                ]
              })
            }
          }
        }
        if (payload.event === "chat.join") {
          const username = payload.data?.username as string
          if (username && username !== user) {
            if (!room.startsWith("dm_")) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `sys_join_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  text: `${username} joined the room`,
                  type: "system",
                  timestamp: payload.timestamp || new Date().toISOString(),
                },
              ])
            }
            setUsers((prev) =>
              prev.includes(username) ? prev : [...prev, username]
            )
          }
        }
        if (payload.event === "chat.present") {
          const username = payload.data?.username as string
          const target = payload.data?.target as string
          if (username && username !== user && target === user)
            setUsers((prev) =>
              prev.includes(username) ? prev : [...prev, username]
            )
        }
        if (payload.event === "chat.leave") {
          const username = payload.data?.username as string
          if (username && username !== user) {
            if (!room.startsWith("dm_")) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `sys_leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  text: `${username} left the room`,
                  type: "system",
                  timestamp: payload.timestamp || new Date().toISOString(),
                },
              ])
            }
            setUsers((prev) => prev.filter((u) => u !== username))
            setTypingUsers((prev) => prev.filter((u) => u !== username))
          }
        }
        if (payload.event === "chat.typing") {
          const username = payload.data?.username as string
          const isTyping = payload.data?.isTyping as boolean
          if (username && username !== user)
            setTypingUsers((prev) =>
              isTyping
                ? prev.includes(username)
                  ? prev
                  : [...prev, username]
                : prev.filter((u) => u !== username)
            )
        }
      }
    })
    socket.on("error", (err: unknown) => setError(err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err)))
    return () => {
      leaveRoom(socket)
      disconnectChat()
      socketRef.current = null
    }
  }, [
    room,
    user,
    userId,
    authUser,
    fetchInvites,
    fetchContacts,
    fetchOnlineContacts,
  ])

  useEffect(() => {
    if (!room) return
    if (room.startsWith("dm_")) {
      setMessages([])
    } else {
      setMessages([
        {
          id: "sys_init",
          text: `${user} joined #${room}`,
          type: "system" as const,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }, [room, user])

  // Load messages from backend on room change
  useEffect(() => {
    if (!room) return
    api
      .get<
        Array<{
          msgId: string
          sender: string
          text: string
          createdAt: string
        }>
      >(`/api/v1/chat/messages/${encodeURIComponent(room)}?limit=50`)
      .then((msgs) => {
        if (msgs && msgs.length > 0) {
          const formatted = msgs.map((m) => ({
            id: m.msgId,
            text: m.text,
            sender: m.sender,
            type: "received" as const,
            timestamp: m.createdAt,
            status: "sent" as const,
          }))
          setMessages(formatted)
        }
      })
      .catch(() => {})
  }, [room])

  const handleAutoLeave = useCallback(() => {
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
    if (!text.trim()) {
      if (isTypingRef.current) {
        isTypingRef.current = false
        sendTyping(socket, false)
      }
      return
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTyping(socket, true)
    }
  }, [text, room])
  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = useCallback(async () => {
    if (!room || sendingRef.current) return
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

    if (room.startsWith("dm_")) {
      const dmUser = getDmTarget(room, user)
      if (dmUser) {
        setRecentDms((prev) => {
          const exists = prev.some((d) => d.username === dmUser)
          if (exists) {
            return [
              {
                username: dmUser,
                lastMessage: t,
                timestamp: new Date().toISOString(),
              },
              ...prev.filter((d) => d.username !== dmUser),
            ]
          }
          return [
            {
              username: dmUser,
              lastMessage: t,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ]
        })
      }
    }

    try {
      const socket = socketRef.current
      if (socket && socket.connected) {
        sendMessage(socket, t, id, user, new Date().toISOString())
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m))
        )
      } else {
        await api.post("/api/v1/chat/publish", {
          roomId: room,
          text: t,
          id,
          sender: user,
          timestamp: new Date().toISOString(),
        })
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: "sent" } : m))
        )
      }

      if (
        activeDmUser &&
        (activeDmUser === "DeepMind Agent" || activeDmUser === "Patuih Support")
      ) {
        setTimeout(() => {
          const botReplyId = "bot_" + Date.now()
          let botReplyText = "Hello! I am an automated assistant."
          if (activeDmUser === "DeepMind Agent") {
            const tips = [
              "Here is a cool TS tip: Use 'ReturnType' helper to type variables returned by functions!",
              "Always keep components focused and reusable! Extract subviews to components.",
              "Clean code is key. Prefer pure functions and custom hooks for business logic.",
              "Have you checked out our AI developer tools? I am pair programming with you right now!",
              "Glassmorphism styling tip: combine low opacity background color with backdrop-filter blur and a subtle border!",
            ]
            botReplyText = tips[Math.floor(Math.random() * tips.length)]
          } else if (activeDmUser === "Patuih Support") {
            const tips = [
              "Ada Chat is fully integrated with Patuih Gateway.",
              "All real-time events are routed automatically.",
              "If you experience connection errors, check your internet connectivity.",
              "Need help with socket channels? All communication runs on high-speed pub/sub pipelines.",
              "Our team is available 24/7. How can we help you today?",
            ]
            botReplyText = tips[Math.floor(Math.random() * tips.length)]
          }

          setMessages((prev) => [
            ...prev,
            {
              id: botReplyId,
              text: botReplyText,
              sender: activeDmUser,
              type: "received",
              timestamp: new Date().toISOString(),
              status: "delivered",
            },
          ])

          setRecentDms((prev) =>
            prev.map((d) =>
              d.username === activeDmUser
                ? { ...d, lastMessage: botReplyText, timestamp: new Date().toISOString() }
                : d
            )
          )
        }, 1000)
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "failed" } : m))
      )
      setError("Failed to send message")
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }, [text, room, user, resetInactivityTimer, activeDmUser])

  // Fetch user rooms
  useEffect(() => {
    api
      .get<
        Array<{
          id: string
          name: string
          roomId: string
          memberCount: number
          isOwner: boolean
        }>
      >("/api/v1/chat/rooms")
      .then(setUserRooms)
      .catch(() => {})
  }, [])

  const handleSelectRoom = (r: {
    id: string
    name: string
    roomId: string
    isOwner: boolean
  }) => {
    const existingName = user
    onEnterRoom({
      name: existingName,
      room: r.roomId,
      userId: authUser?.id ?? "",
    })
  }

  const handleCopyRoomId = () => {
    if (!room) return
    try {
      navigator.clipboard.writeText(room)
      setToastMsg("Room Token copied to clipboard!")
    } catch {
      navigator.clipboard.writeText(room)
      setToastMsg("Room ID copied to clipboard!")
    }
    setTimeout(() => setToastMsg(""), 2500)
  }
  const handleManualLeave = () => {
    if (socketRef.current) leaveRoom(socketRef.current)
    onLeave()
  }
  const [roomNameInput, setRoomNameInput] = useState("")
  const [roomAvatar, setRoomAvatar] = useState("💬")
  const [invitePin, setInvitePin] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState<
    Array<{ id: string; username: string; displayName: string | null }>
  >([])

  const handleAddInvite = async () => {
    if (invitePin.length !== 6) return
    setInviteLoading(true)
    try {
      const user = await api.get<{
        id: string
        username: string
        displayName: string | null
      }>(`/api/v1/auth/find-by-pin?pin=${invitePin}`)
      if (!invitedUsers.some((u) => u.id === user.id)) {
        setInvitedUsers((prev) => [...prev, user])
      }
      setInvitePin("")
    } catch {
      setDialogError("User not found")
      setTimeout(() => setDialogError(""), 2000)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCreateRoomApi = async () => {
    setDialogError("")
    setDialogLoading(true)
    try {
      const n = user
      const rn = roomNameInput.trim()
      if (!rn) {
        setDialogError("Room name is required")
        setDialogLoading(false)
        return
      }
      const room = await api.post<{ id: string; name: string; roomId: string }>(
        "/api/v1/chat/rooms",
        { name: rn, roomId: generatedRoom, avatarUrl: roomAvatar }
      )
      await api.post(`/api/v1/chat/rooms/${room.id}/join`)
      for (const _invited of invitedUsers) {
        try {
          await api.post(`/api/v1/chat/rooms/${room.id}/join`)
        } catch {}
      }
      setUserRooms((prev) => [
        ...prev,
        {
          id: room.id,
          name: room.name,
          roomId: room.roomId,
          memberCount: 1,
          isOwner: true,
        },
      ])
      setShowCreateRoom(false)
      onEnterRoom({
        name: n,
        room: generatedRoom,
        userId: authUser?.id ?? "",
      })
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : "Failed")
    } finally {
      setDialogLoading(false)
    }
  }

  const handleJoinRoomSubmit = async () => {
    setDialogError("")
    setDialogLoading(true)
    try {
      const r = joinRoomId.trim()
      if (!r) {
        setDialogError("Enter Room ID or Token")
        setDialogLoading(false)
        return
      }
      let actualRoom = r
      if (r.length > 20) {
        try {
          const decoded = atob(r)
          const parts = decoded.split("|")
          if (parts.length >= 1) {
            actualRoom = parts[0]
          }
        } catch {}
      }
      const n = user
      setShowJoinRoom(false)
      onEnterRoom({ name: n, room: actualRoom, userId: authUser?.id ?? "" })
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : "Failed")
    } finally {
      setDialogLoading(false)
    }
  }

  // === RENDER: UNIFIED TABS VIEW ===
  const handleSelectDm = (targetUsername: string) => {
    const dmRoomId = getDmRoomId(user, targetUsername)
    setRecentDms((prev) => {
      if (prev.some((d) => d.username === targetUsername)) return prev
      return [
        {
          username: targetUsername,
          lastMessage: "Click to start chatting",
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]
    })
    onEnterRoom({
      name: user,
      room: dmRoomId,
      userId: authUser?.id ?? "",
    })
    setActiveTab("chat")
  }

  const handleAddDm = (targetUsername: string) => {
    if (targetUsername === user) return
    setRecentDms((prev) => {
      if (prev.some((d) => d.username === targetUsername)) return prev
      return [
        {
          username: targetUsername,
          lastMessage: "Click to start chatting",
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]
    })
    handleSelectDm(targetUsername)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-card">
      {/* Sidebar for Desktop */}
      <div className="hidden h-full shrink-0 md:flex">
        <Sidebar
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRooms={userRooms}
          activeRoomId={room && !room.startsWith("dm_") ? room : null}
          activeDmUser={activeDmUser}
          onSelectRoom={handleSelectRoom}
          onSelectDm={handleSelectDm}
          onOpenCreateRoom={() => { setShowCreateRoom(true); setGeneratedRoom(genId()); setRoomNameInput(""); setInvitedUsers([]) }}
          onOpenJoinRoom={() => { setShowJoinRoom(true); setJoinRoomId("") }}
          onlineUsers={users}
          recentDms={recentDms}
          onAddDm={handleAddDm}
          contacts={contacts}
          invites={invites}
          onInviteContact={handleInviteContact}
          onAcceptInvite={handleAcceptInvite}
          onRejectInvite={handleRejectInvite}
          onlineContacts={onlineContacts}
        />
      </div>

      {/* Mobile Drawer (Sheet) for Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[300px] border-r border-border bg-card p-0">
          <Sidebar
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userRooms={userRooms}
            activeRoomId={room && !room.startsWith("dm_") ? room : null}
            activeDmUser={activeDmUser}
            onSelectRoom={(r) => { handleSelectRoom(r); setSidebarOpen(false) }}
            onSelectDm={(username) => { handleSelectDm(username); setSidebarOpen(false) }}
            onOpenCreateRoom={() => { setShowCreateRoom(true); setGeneratedRoom(genId()); setRoomNameInput(""); setInvitedUsers([]); setSidebarOpen(false) }}
            onOpenJoinRoom={() => { setShowJoinRoom(true); setJoinRoomId(""); setSidebarOpen(false) }}
            onlineUsers={users}
            recentDms={recentDms}
            onAddDm={(username) => { handleAddDm(username); setSidebarOpen(false) }}
            contacts={contacts}
            invites={invites}
            onInviteContact={handleInviteContact}
            onAcceptInvite={handleAcceptInvite}
            onRejectInvite={handleRejectInvite}
            onlineContacts={onlineContacts}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {activeTab === "moment" ? (
          <MomentFeed currentUser={user} getColor={getColor} />
        ) : room ? (
          <ActiveChatArea
            user={user}
            room={room}
            activeDmUser={activeDmUser}
            messages={messages}
            text={text}
            setText={setText}
            sending={sending}
            error={error}
            setError={setError}
            users={users}
            typingUsers={typingUsers}
            onSend={send}
            onLeaveRoom={handleManualLeave}
            onCopyToken={handleCopyRoomId}
            onOpenProfile={() => setShowProfile(true)}
            getColor={getColor}
            onOpenSidebarMobile={() => setSidebarOpen(true)}
          />
        ) : (
          /* Welcome/Empty State */
          <div className="relative flex flex-1 flex-col items-center justify-center bg-background p-8">
            <header className="absolute top-0 right-0 left-0 flex h-16 w-full items-center justify-between border-b border-border bg-card/40 px-4 backdrop-blur-md md:hidden">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-extrabold text-primary">Ada Chat</span>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={onLogout}>
                Logout
              </Button>
            </header>
            <div className="max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 shadow-lg shadow-indigo-500/5">
                <Sparkles className="h-10 w-10 animate-pulse text-primary" />
              </div>
              <h2 className="mb-2.5 text-2xl font-extrabold text-white">Welcome to Ada Chat</h2>
              <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
                Choose a channel, start a direct message with friends or check out what's new in the Moments tab.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={() => { setShowCreateRoom(true); setGeneratedRoom(genId()); setRoomNameInput(""); setInvitedUsers([]) }}
                  className="h-10 rounded-xl bg-primary px-5 text-xs font-bold text-white shadow-md shadow-indigo-600/15 hover:bg-indigo-500">
                  Create New Room
                </Button>
                <Button onClick={() => { setShowJoinRoom(true); setJoinRoomId("") }}
                  className="h-10 rounded-xl border border-border bg-muted/50 px-5 text-xs font-bold text-foreground hover:bg-muted hover:text-white">
                  Join Existing Room
                </Button>
                <Button className="text-xs text-muted-foreground hover:text-foreground" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Sheet */}
      <ProfileSheet authUser={authUser} open={showProfile} onOpenChange={setShowProfile} />

      {/* Join Room Dialog */}
      <Dialog open={showJoinRoom} onOpenChange={setShowJoinRoom}>
        <DialogContent className="rounded-2xl border-border bg-card text-slate-100 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-white">Join Room</DialogTitle>
            <DialogDescription className="text-muted-foreground">Enter Room ID or Token to join</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Room ID / Token</Label>
              <Input className="h-11 rounded-xl border-border bg-muted/60 text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} placeholder="Paste Room ID or Token" />
            </div>
            {dialogError && (
              <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
                <AlertDescription className="text-xs font-semibold">{dialogError}</AlertDescription>
              </Alert>
            )}
            <Button className="h-11 w-full rounded-xl bg-primary font-bold text-white shadow-md hover:bg-indigo-500"
              onClick={handleJoinRoomSubmit} disabled={dialogLoading}>
              {dialogLoading ? "..." : "Join"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Room Dialog */}
      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent className="rounded-2xl border-border bg-card text-slate-100 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Room</DialogTitle>
            <DialogDescription className="text-muted-foreground">Set up your room details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Room Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {["💬","🎮","🎵","📚","🎬","💻","🌍","🔥","⭐","🌈","🎯","🚀"].map((emoji) => (
                  <button key={emoji} onClick={() => setRoomAvatar(emoji)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-all ${
                      roomAvatar === emoji ? "border-indigo-500 bg-indigo-500/20" : "border-slate-700 bg-muted/60 hover:border-slate-500"
                    }`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Room Name</Label>
              <Input className="h-11 rounded-xl border-border bg-muted/60 text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                value={roomNameInput} onChange={(e) => setRoomNameInput(e.target.value)} placeholder="My Chat Room" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Invite Friends (by PIN)</Label>
              <div className="flex gap-2">
                <Input className="h-11 flex-1 rounded-xl border-border bg-muted/60 font-mono text-white placeholder-slate-500 focus-visible:ring-indigo-500"
                  value={invitePin} onChange={(e) => setInvitePin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 digit PIN" />
                <Button variant="secondary" className="hover:bg-slate-850 h-11 rounded-xl border border-border bg-muted px-4 text-xs font-semibold text-foreground"
                  onClick={handleAddInvite} disabled={invitePin.length !== 6 || inviteLoading}>
                  {inviteLoading ? "..." : "Add"}
                </Button>
              </div>
              {invitedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {invitedUsers.map((u) => (
                    <span key={u.id} className="flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">
                      {u.displayName || u.username}
                      <button onClick={() => setInvitedUsers((prev) => prev.filter((x) => x.id !== u.id))} className="ml-0.5 text-primary hover:text-white">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {dialogError && (
              <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
                <AlertDescription className="text-xs font-semibold">{dialogError}</AlertDescription>
              </Alert>
            )}
            <Button className="h-11 w-full rounded-xl bg-primary font-bold text-white shadow-md hover:bg-indigo-500"
              onClick={handleCreateRoomApi} disabled={dialogLoading}>
              {dialogLoading ? "..." : "Create Room"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB: Start New Chat Dialog */}
      <Dialog open={showFabDialog} onOpenChange={setShowFabDialog}>
        <DialogContent className="rounded-2xl border-border bg-card text-slate-100 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-white">New Chat</DialogTitle>
            <DialogDescription className="text-muted-foreground">Select a friend to start a direct message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute top-3.5 left-3 h-4 w-4 text-muted-foreground" />
              <Input value={fabSearchQuery} onChange={(e) => setFabSearchQuery(e.target.value)}
                placeholder="Search friends..." className="h-11 rounded-xl border-border bg-muted/60 pr-3 pl-9 text-white placeholder-slate-500 focus-visible:ring-indigo-500" />
            </div>
            <ScrollArea className="h-64 rounded-xl border border-border bg-card/40 p-2">
              <div className="flex flex-col gap-1.5">
                {contacts.filter((c) => (c.displayName || c.username).toLowerCase().includes(fabSearchQuery.toLowerCase())).length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground italic">No friends found</p>
                ) : (
                  contacts.filter((c) => (c.displayName || c.username).toLowerCase().includes(fabSearchQuery.toLowerCase())).map((friend) => (
                    <button key={friend.id} onClick={() => { setShowFabDialog(false); handleSelectDm(friend.username) }}
                      className="border-slate-850 flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-muted/10 p-2.5 text-left transition-all hover:border-border hover:bg-muted/35">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-primary">
                        {typeof friend.username === "string" ? friend.username.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-200">
                          {typeof (friend.displayName || friend.username) === "string" ? (friend.displayName || friend.username) : JSON.stringify(friend.displayName || friend.username)}
                        </p>
                        <p className="truncate text-[9px] text-muted-foreground">
                          @{typeof friend.username === "string" ? friend.username : JSON.stringify(friend.username)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button (FAB) for New Chat */}
      {authUser && (
        <div className="fixed right-6 bottom-6 z-50">
          <Button onClick={() => { setFabSearchQuery(""); setShowFabDialog(true) }}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-indigo-600/35 transition-all duration-200 hover:scale-105 active:scale-95">
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>
      )}

      {toastMsg && (
        <div className="toast-notif">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}

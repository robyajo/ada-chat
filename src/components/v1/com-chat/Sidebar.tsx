import { useState } from "react"
import { MessageSquare, Users, Sparkles, Plus, LogIn, Search, UserPlus, Check, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RoomItem {
  id: string
  name: string
  roomId: string
  memberCount: number
  isOwner: boolean
}

interface DmItem {
  username: string
  lastMessage?: string
  timestamp?: string
}

interface ContactItem {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface InviteItem {
  id: string
  createdAt: string
  sender: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

interface InvitesData {
  received: InviteItem[]
  sent: any[]
}

interface SidebarProps {
  user: string
  activeTab: "chat" | "room" | "contact" | "moment"
  setActiveTab: (tab: "chat" | "room" | "contact" | "moment") => void
  userRooms: RoomItem[]
  activeRoomId: string | null
  activeDmUser: string | null
  onSelectRoom: (r: RoomItem) => void
  onSelectDm: (username: string) => void
  onOpenCreateRoom: () => void
  onOpenJoinRoom: () => void
  onlineUsers: string[]
  recentDms: DmItem[]
  onAddDm: (username: string) => void
  contacts: ContactItem[]
  invites: InvitesData
  onInviteContact: (target: string) => Promise<void>
  onAcceptInvite: (id: string) => Promise<void>
  onRejectInvite: (id: string) => Promise<void>
  onlineContacts: string[]
}

export default function Sidebar({
  user,
  activeTab,
  setActiveTab,
  userRooms,
  activeRoomId,
  activeDmUser,
  onSelectRoom,
  onSelectDm,
  onOpenCreateRoom,
  onOpenJoinRoom,
  onlineUsers,
  recentDms,
  onAddDm,
  contacts,
  invites,
  onInviteContact,
  onAcceptInvite,
  onRejectInvite,
  onlineContacts,
}: SidebarProps) {
  const [newDmName, setNewDmName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [newContactInput, setNewContactInput] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const handleInviteSubmit = async () => {
    const val = newContactInput.trim()
    if (!val) return
    setInviteLoading(true)
    setInviteError("")
    setInviteSuccess(false)
    try {
      await onInviteContact(val)
      setInviteSuccess(true)
      setNewContactInput("")
      setTimeout(() => setInviteSuccess(false), 3000)
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invitation")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleAddDmSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = newDmName.trim()
    if (!target) return
    onAddDm(target)
    setNewDmName("")
  }

  // Filter lists based on search query
  const filteredRooms = userRooms.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDms = recentDms.filter((d) =>
    d.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((c) =>
    (c.displayName || c.username).toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter online users list to exclude current user
  const otherOnlineUsers = onlineUsers.filter((u) => u !== user)

  return (
    <aside className="z-10 flex h-full w-[280px] flex-col border-r border-border/80 bg-card/40 backdrop-blur-md">
      {/* Tab Switcher */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 border border-slate-850">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-primary text-white shadow-lg shadow-indigo-600/10"
                : "text-muted-foreground hover:text-white hover:bg-slate-800/30"
            }`}
          >
            <MessageSquare className="w-4 h-4 mb-1" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("room")}
            className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200 ${
              activeTab === "room"
                ? "bg-primary text-white shadow-lg shadow-indigo-600/10"
                : "text-muted-foreground hover:text-white hover:bg-slate-800/30"
            }`}
          >
            <Users className="w-4 h-4 mb-1" />
            Room
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200 ${
              activeTab === "contact"
                ? "bg-primary text-white shadow-lg shadow-indigo-600/10"
                : "text-muted-foreground hover:text-white hover:bg-slate-800/30"
            }`}
          >
            <UserPlus className="w-4 h-4 mb-1" />
            Contact
          </button>
          <button
            onClick={() => setActiveTab("moment")}
            className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-200 ${
              activeTab === "moment"
                ? "bg-primary text-white shadow-lg shadow-indigo-600/10"
                : "text-muted-foreground hover:text-white hover:bg-slate-800/30"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-1" />
            Moment
          </button>
        </div>
      </div>

      {/* Search Input for Rooms/Chats/Contacts */}
      {activeTab !== "moment" && (
        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "chat"
                  ? "Search direct messages..."
                  : activeTab === "contact"
                  ? "Search contacts..."
                  : "Search rooms..."
              }
              className="h-10 pl-9 pr-3 rounded-xl border-border bg-muted/30 text-xs text-white placeholder-slate-500 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <ScrollArea className="flex-1 px-4 py-3">
        {activeTab === "chat" && (
          <div className="space-y-5">
            {/* New DM Form */}
            <form onSubmit={handleAddDmSubmit} className="space-y-2">
              <label className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                Start Private Chat
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={newDmName}
                  onChange={(e) => setNewDmName(e.target.value)}
                  placeholder="Enter username..."
                  className="h-9 text-xs rounded-lg border-border bg-muted/30 text-white"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 bg-primary hover:bg-indigo-500 rounded-lg shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {/* Direct Messages List */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                <span>Direct Messages</span>
                <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-mono">
                  {filteredDms.length}
                </span>
              </h3>

              <div className="flex flex-col gap-1">
                {filteredDms.length === 0 ? (
                  <p className="text-[11px] text-slate-600 py-2 italic text-center">
                    No active chats. Start one above!
                  </p>
                ) : (
                  filteredDms.map((dm) => {
                    const isActive = activeDmUser === dm.username
                    const isBot = dm.username.toLowerCase().includes("agent") || dm.username.toLowerCase().includes("support")
                    const isOnline = isBot || onlineUsers.includes(dm.username)

                    return (
                      <button
                        key={dm.username}
                        onClick={() => onSelectDm(dm.username)}
                        className={`group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 ${
                          isActive
                            ? "border-indigo-500/40 bg-primary/10 text-indigo-300 shadow-md shadow-indigo-950/20"
                            : "border-border/10 bg-muted/10 text-foreground hover:border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        {/* Avatar container */}
                        <div className="relative shrink-0">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs ${
                            isBot ? "bg-primary/10 text-emerald-400" : "bg-primary/20 text-primary"
                          }`}>
                            {dm.username.charAt(0).toUpperCase()}
                          </div>
                          {/* Online Indicator Dot */}
                          <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
                            isOnline ? "bg-primary" : "bg-slate-650"
                          }`} />
                        </div>

                        {/* Text Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-xs font-semibold text-foreground group-hover:text-white">
                              {dm.username}
                            </p>
                            {dm.timestamp && (
                              <span className="text-[9px] text-muted-foreground shrink-0">
                                {new Date(dm.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                            {typeof dm.lastMessage === "string" ? dm.lastMessage : "Click to start chatting"}
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Active Workspace Users */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                <span>Active Users ({otherOnlineUsers.length})</span>
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </h3>

              <div className="flex flex-col gap-1">
                {otherOnlineUsers.length === 0 ? (
                  <p className="text-[11px] text-slate-600 py-1 text-center">
                    No other users online right now
                  </p>
                ) : (
                  otherOnlineUsers.map((username) => (
                    <button
                      key={username}
                      onClick={() => onSelectDm(username)}
                      className="flex items-center justify-between rounded-xl border border-border/10 bg-muted/10 hover:border-border/40 hover:bg-muted/30 px-3 py-2 text-xs transition-all w-full text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span className="truncate text-foreground font-medium">{username}</span>
                      </div>
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "room" && (
          <div className="space-y-4">
            {/* Create / Join Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={onOpenCreateRoom}
                className="flex-1 h-9 rounded-xl border border-border bg-muted/50 hover:bg-muted hover:text-white text-xs font-bold text-foreground"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Room
              </Button>
              <Button
                onClick={onOpenJoinRoom}
                className="flex-1 h-9 rounded-xl border border-border bg-muted/50 hover:bg-muted hover:text-white text-xs font-bold text-foreground"
              >
                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                Join Room
              </Button>
            </div>

            {/* Rooms List */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                Your Rooms
              </h3>

              <div className="flex flex-col gap-1.5">
                {filteredRooms.length === 0 ? (
                  <button
                    onClick={onOpenCreateRoom}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-6 text-xs text-muted-foreground hover:border-indigo-500/40 hover:text-primary transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first room
                  </button>
                ) : (
                  filteredRooms.map((r) => {
                    const isActive = activeRoomId === r.roomId

                    return (
                      <button
                        key={r.id}
                        onClick={() => onSelectRoom(r)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 w-full ${
                          isActive
                            ? "border-indigo-500/40 bg-primary/10 text-indigo-300 shadow-md shadow-indigo-950/20"
                            : "border-border/10 bg-muted/10 text-foreground hover:border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary shadow-sm">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-xs text-foreground">{r.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                            {r.memberCount} member{r.memberCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {r.isOwner && (
                          <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-mono shrink-0">
                            Owner
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-5">
            {/* Invite Form */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                Invite Friend
              </label>
              <div className="flex gap-1.5">
                <Input
                  value={newContactInput}
                  onChange={(e) => setNewContactInput(e.target.value)}
                  placeholder="Username or 6-digit PIN..."
                  className="h-9 text-xs rounded-lg border-border bg-muted/30 text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleInviteSubmit()}
                />
                <Button
                  onClick={handleInviteSubmit}
                  className="h-9 w-9 bg-primary hover:bg-indigo-500 rounded-lg shrink-0 p-0"
                  disabled={inviteLoading}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {inviteError && <p className="text-[9px] text-rose-450">{inviteError}</p>}
              {inviteSuccess && <p className="text-[9px] text-emerald-400">Invite sent!</p>}
            </div>

            {/* Notification / Notices (Received pending requests) */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                <span>Notices / Requests</span>
                <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-mono">
                  {invites.received.length}
                </span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {invites.received.length === 0 ? (
                  <p className="text-[10px] text-slate-600 py-1 italic text-center">
                    No pending invitations
                  </p>
                ) : (
                  invites.received.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                          {invite.sender.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate min-w-0">
                          <p className="truncate font-semibold text-foreground text-[11px]">
                            {invite.sender.displayName || invite.sender.username}
                          </p>
                          <p className="text-[9px] text-muted-foreground">@{invite.sender.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          onClick={() => onAcceptInvite(invite.id)}
                          className="h-6 w-6 rounded bg-emerald-600 hover:bg-primary p-0 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          onClick={() => onRejectInvite(invite.id)}
                          className="h-6 w-6 rounded bg-rose-600 hover:bg-rose-500 p-0 text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Contacts / Friends List */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                <span>My Contacts</span>
                <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-mono">
                  {filteredContacts.length}
                </span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {filteredContacts.length === 0 ? (
                  <p className="text-[11px] text-slate-650 py-4 italic text-center">
                    No contacts found
                  </p>
                ) : (
                  filteredContacts.map((contact) => {
                    const isOnline = onlineContacts.includes(contact.username);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => onSelectDm(contact.username)}
                        className={`group flex items-center gap-3 rounded-xl border p-2 text-left transition-all duration-200 w-full border-slate-850 bg-muted/10 hover:border-border hover:bg-muted/30`}
                      >
                        <div className="relative shrink-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                            {contact.username.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
                              isOnline ? "bg-primary" : "bg-slate-650"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-xs text-foreground group-hover:text-white">
                            {contact.displayName || contact.username}
                          </p>
                          <p className="truncate text-[9px] text-muted-foreground">@{contact.username}</p>
                        </div>
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary transition-colors" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "moment" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2.5" />
              <h4 className="text-xs font-bold text-white mb-1">Ada Moments Feed</h4>
              <p className="text-[10px] text-muted-foreground leading-normal mb-3.5">
                Share what's on your mind, choose beautiful gradients, comment, and like updates from other users!
              </p>
              <Button
                onClick={() => setActiveTab("moment")}
                className="w-full h-8.5 rounded-lg bg-primary hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/15"
              >
                View Moments Feed
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                Moments Preview
              </h3>
              <div className="rounded-lg border border-border bg-card/60 p-3 space-y-3">
                <div className="text-[10px] leading-relaxed">
                  <span className="font-bold text-primary block mb-0.5">@DeepMind Agent</span>
                  <span className="text-muted-foreground">Just launched Ada Chat! The ultimate real-time communication platform. 🚀</span>
                </div>
                <div className="border-t border-border/60 pt-2 text-[10px] leading-relaxed">
                  <span className="font-bold text-emerald-400 block mb-0.5">@Patuih Team</span>
                  <span className="text-muted-foreground">Our pub/sub gateway is fully integrated with socket.io. Low latency guaranteed! ⚡</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}

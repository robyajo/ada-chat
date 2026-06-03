import { useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Message from "../Message"
import { Menu, MessageSquare, ShieldAlert, Copy, User, LogOut, Send } from "lucide-react"

interface ActiveChatAreaProps {
  user: string
  room: string
  activeDmUser: string | null
  messages: Record<string, unknown>[]
  text: string
  setText: (v: string) => void
  sending: boolean
  error: string
  setError: (v: string) => void
  users: string[]
  typingUsers: string[]
  onSend: () => void
  onLeaveRoom: () => void
  onCopyToken: () => void
  onOpenProfile: () => void
  getColor: (name: string) => string
  onOpenSidebarMobile: () => void
}

export default function ActiveChatArea({
  user,
  room,
  activeDmUser,
  messages,
  text,
  setText,
  sending,
  error,
  setError,
  users,
  typingUsers,
  onSend,
  onLeaveRoom,
  onCopyToken,
  onOpenProfile,
  getColor,
  onOpenSidebarMobile,
}: ActiveChatAreaProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const isDm = !!activeDmUser
  const chatTitle = isDm ? `@${activeDmUser}` : `#${room.slice(0, 12)}${room.length > 12 ? "..." : ""}`

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden bg-slate-950/20">
      {/* Header inside chat area */}
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-900 bg-slate-950/40 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white md:hidden"
            onClick={onOpenSidebarMobile}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Chat details */}
          <div className="flex items-center gap-2.5">
            <div className={`rounded-xl p-1.5 ${isDm ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"}`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm md:text-base text-white">
                  {chatTitle}
                </span>
                {isDm && (
                  <Badge variant="secondary" className="rounded-lg border-emerald-500/20 bg-emerald-500/10 text-[9px] font-semibold text-emerald-300 px-1.5 py-0.5">
                    Direct Message
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>
                  {isDm ? (
                    activeDmUser.toLowerCase().includes("agent") || activeDmUser.toLowerCase().includes("support") ? "online" : "active now"
                  ) : (
                    `${users.length} member${users.length !== 1 ? "s" : ""} online`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2">
          {/* User profile */}
          <Tooltip>
            <TooltipTrigger
              render={<button />}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-900 bg-slate-900/40 text-slate-400 hover:bg-slate-900 hover:text-white"
              onClick={onOpenProfile}
            >
              <User className="w-4 h-4 mx-auto" />
            </TooltipTrigger>
            <TooltipContent className="border-slate-800 bg-slate-900 text-xs text-slate-300">
              Profile
            </TooltipContent>
          </Tooltip>

          {/* Copy Room ID (Only for rooms) */}
          {!isDm && (
            <Tooltip>
              <TooltipTrigger
                render={<button />}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-900 bg-slate-900/40 text-slate-400 hover:bg-slate-900 hover:text-white"
                onClick={onCopyToken}
              >
                <Copy className="w-4 h-4 mx-auto" />
              </TooltipTrigger>
              <TooltipContent className="border-slate-800 bg-slate-900 text-xs text-slate-300">
                Copy Token
              </TooltipContent>
            </Tooltip>
          )}

          {/* Close/Leave */}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 rounded-lg border border-rose-500/20 bg-rose-950/40 px-3 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white"
            onClick={onLeaveRoom}
          >
            <LogOut className="w-3.5 h-3.5 mr-1 sm:inline hidden" />
            Leave
          </Button>
        </div>
      </header>

      {/* Error notification bar */}
      {error && (
        <div className="flex items-center justify-between border-b border-rose-500/20 bg-rose-500/10 px-6 py-2.5 text-xs font-semibold text-rose-300">
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            {error}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-rose-300 hover:bg-rose-500/20 hover:text-white rounded"
            onClick={() => setError("")}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Messages list */}
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

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 border-t border-slate-900 bg-slate-950/40 px-6 py-2 text-xs text-indigo-400">
          <span className="flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
          </span>
          <span className="truncate">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      )}

      {/* Message input bar */}
      <div className="flex items-center gap-3 border-t border-slate-900 bg-slate-950/20 p-4 backdrop-blur-md">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Type a message to ${isDm ? "@" + activeDmUser : "#" + room.slice(0, 10)}...`}
          onKeyDown={(e) => e.key === "Enter" && !sending && onSend()}
          disabled={sending}
          className="h-11 rounded-xl border-slate-800 bg-slate-950/60 px-4 text-white placeholder-slate-500 focus-visible:ring-indigo-500"
        />
        <Button
          onClick={onSend}
          disabled={sending || !text.trim()}
          className="h-11 rounded-xl bg-indigo-600 px-5 font-bold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 flex items-center gap-1.5 shrink-0"
        >
          {sending ? (
            "..."
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </div>
    </main>
  )
}

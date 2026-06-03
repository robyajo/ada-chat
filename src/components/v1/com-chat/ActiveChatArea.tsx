import { useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Message from "../Message"
import { Menu, MessageSquare, Copy, User, LogOut, Send } from "lucide-react"

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
  user, room, activeDmUser, messages, text, setText, sending, error, setError,
  users, typingUsers, onSend, onLeaveRoom, onCopyToken, onOpenProfile,
  getColor, onOpenSidebarMobile,
}: ActiveChatAreaProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const isDm = !!activeDmUser
  const chatTitle = isDm ? `@${activeDmUser}` : `#${room.slice(0, 12)}${room.length > 12 ? "..." : ""}`

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenSidebarMobile}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-muted p-1.5">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm md:text-base">{chatTitle}</span>
              {isDm && <Badge variant="secondary" className="ml-2">Direct Message</Badge>}
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>
                  {isDm ? "active now" : `${users.length} member${users.length !== 1 ? "s" : ""} online`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger render={<button />} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" onClick={onOpenProfile}>
              <User className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Profile</TooltipContent>
          </Tooltip>
          {!isDm && (
            <Tooltip>
              <TooltipTrigger render={<button />} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground" onClick={onCopyToken}>
                <Copy className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Copy Token</TooltipContent>
            </Tooltip>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onLeaveRoom}>
            <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-center justify-between border-b bg-destructive/10 px-6 py-2.5 text-xs font-semibold text-destructive">
          <span>{typeof error === "string" ? error : JSON.stringify(error)}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setError("")}>✕</Button>
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
        <div className="flex items-center gap-2 border-t bg-muted/50 px-6 py-2 text-xs text-primary">
          <span className="flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
          </span>
          <span className="truncate">{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
        </div>
      )}

      <div className="flex items-center gap-3 border-t bg-background p-4">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Type a message to ${isDm ? "@" + activeDmUser : "#" + room.slice(0, 10)}...`}
          onKeyDown={(e) => e.key === "Enter" && !sending && onSend()}
          disabled={sending}
        />
        <Button onClick={onSend} disabled={sending || !text.trim()} className="flex items-center gap-1.5 shrink-0">
          {sending ? "..." : <><span className="hidden sm:inline">Send</span><Send className="h-3.5 w-3.5" /></>}
        </Button>
      </div>
    </main>
  )
}

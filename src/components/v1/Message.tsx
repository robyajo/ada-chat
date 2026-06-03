import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface MsgData {
  id: string
  text: string
  sender: string
  type: string
  timestamp: string
  status?: string
  rawData?: Record<string, unknown> | string
}

export default function Message({ msg, isOwn, getColor }: { msg: Record<string, unknown>; isOwn: boolean; getColor: (name: string) => string }) {
  const [showJson, setShowJson] = useState(false)
  const m = msg as unknown as MsgData

  if (m.type === "system") {
    return (
      <div className="flex justify-center my-1">
        <span className="px-4 py-1 bg-muted text-xs text-muted-foreground font-bold uppercase tracking-wider rounded-full">
          {typeof m.text === "string" ? m.text : JSON.stringify(m.text)}
        </span>
      </div>
    )
  }

  const avatarBg = `radial-gradient(circle at 30% 30%, ${getColor(m.sender)} 0%, ${getColor(m.sender)}bb 100%)`

  const renderStatus = () => {
    if (m.status === "sending") {
      return (
        <span className="text-muted-foreground inline-flex items-center" title="Sending...">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        </span>
      )
    }
    if (m.status === "failed") {
      return (
        <span className="text-destructive inline-flex items-center" title="Failed to send">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </span>
      )
    }
    if (isOwn && m.status === "sent") {
      return (
        <span className="text-muted-foreground inline-flex items-center ml-1" title="Sent">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </span>
      )
    }
    if (m.status === "delivered") {
      return (
        <span className="text-muted-foreground inline-flex items-center" title="Delivered">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </span>
      )
    }
    return null
  }

  return (
    <div className={`flex gap-3 max-w-[85%] items-end group ${isOwn ? "flex-row-reverse self-end" : "self-start"}`}>
      {!isOwn && (
        <Avatar className="w-8 h-8 rounded-xl shrink-0">
          <AvatarFallback style={{ background: avatarBg }} className="text-xs font-bold rounded-xl">
            {m.sender.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex flex-col gap-1 max-w-full">
        <div className={`px-4 py-2.5 rounded-2xl text-sm border ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {!isOwn && <span className="text-xs font-bold" style={{ color: getColor(m.sender) }}>{typeof m.sender === "string" ? m.sender : JSON.stringify(m.sender)}</span>}
            <span className={`text-xs ml-auto ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {renderStatus()}
          </div>
          <div className="wrap-break-word leading-relaxed">{typeof m.text === "string" ? m.text : JSON.stringify(m.text)}</div>

          {m.rawData && (
            <div className="mt-2 pt-2 border-t">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowJson(!showJson)}>
                {showJson ? "Hide" : "Show"} Raw Data
              </Button>
              {showJson && (
                <pre className="mt-2 p-2.5 bg-background rounded-lg text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
                  {JSON.stringify(m.rawData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {isOwn && (
        <Avatar className="w-8 h-8 rounded-xl shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <AvatarFallback style={{ background: avatarBg }} className="text-xs font-bold rounded-xl">
            {m.sender.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

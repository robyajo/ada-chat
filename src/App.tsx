import { useState, useEffect } from "react"
import Lobby from "./components/Lobby"
import Chat from "./components/Chat"
import "./App.css"

interface Session {
  name: string
  room: string
  apiKey: string
  tenantId: string
  userId?: string
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const cached = localStorage.getItem("chat_session")
    if (cached) { try { return JSON.parse(cached) } catch { return null } }
    return null
  })

  useEffect(() => {
    if (session) {
      localStorage.setItem("chat_session", JSON.stringify(session))
    } else {
      localStorage.removeItem("chat_session")
    }
  }, [session])

  return session ? (
    <Chat
      user={session.name}
      room={session.room}
      apiKey={session.apiKey}
      tenantId={session.tenantId}
      userId={session.userId}
      onLeave={() => setSession(null)}
    />
  ) : (
    <Lobby onEnter={(s) => setSession(s)} />
  )
}

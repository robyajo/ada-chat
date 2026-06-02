import { io, Socket } from "socket.io-client"

const WS_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/chat`, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    })
  }
  return socket
}

export function connectChat(
  userId: string,
  username: string,
  tenantId: string,
  token: string,
): Socket {
  const s = getSocket()
  if (s.connected) return s

  s.auth = { userId, username, tenantId, token }
  s.connect()
  return s
}

export function disconnectChat(): void {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export function joinRoom(socket: Socket, roomId: string, username: string) {
  socket.emit("join-room", { roomId, username })
}

export function leaveRoom(socket: Socket) {
  socket.emit("leave-room")
}

export function sendMessage(
  socket: Socket,
  text: string,
  id: string,
  sender: string,
  timestamp: string,
) {
  socket.emit("send-message", { text, id, sender, timestamp })
}

export function sendTyping(socket: Socket, isTyping: boolean) {
  socket.emit("typing", { isTyping })
}

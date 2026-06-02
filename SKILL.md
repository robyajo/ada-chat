# SKILL.md — Frontend Patterns (Ada Chat FE)

> Pola-pola yang sudah distandarisasi. Update jika ada perubahan.

## Services Layer

### REST API (`services/api.ts`)
- `api.get<T>(path)` → GET request dengan JWT auto-refresh
- `api.post<T>(path, body)` → POST request
- `api.patch<T>(path, body)` → PATCH request
- `api.delete<T>(path)` → DELETE request
- `setTokens(accessToken, refreshToken)` — simpan token ke localStorage
- `clearTokens()` — hapus token dari localStorage
- Semua request otomatis attach `Authorization: Bearer <token>`
- Auto-refresh jika 401

### WebSocket (`services/socket.ts`)
- `connectChat(userId, username, tenantId, token)` → connect ke `/chat` namespace
- `joinRoom(socket, roomId, username)` → emit `join-room`
- `leaveRoom(socket)` → emit `leave-room`
- `sendMessage(socket, text, id, sender, timestamp)` → emit `send-message`
- `sendTyping(socket, isTyping)` → emit `typing`
- `disconnectChat()` → cleanup

## Component Patterns

### Lobby (`components/Lobby.tsx`)

Multi-step flow:
1. **Auth Mode** (`authMode === "login"`) — Login/Register form, Google OAuth button
2. **Patuih Key Mode** (`authMode === "patuih"`) — Input API Key, save via backend
3. **Room Mode** (`!tab`) — Pilih Join atau Create room
4. **Join/Create** — Form detail room + API key

State machine:
```
authMode: "login" → "patuih" (if no key saved) → lobby tab selection → join/create
```

### Chat (`components/Chat.tsx`)

- Connect ke backend WS via `services/socket.ts` di `useEffect`
- Kirim pesan via `sendMessage()` (WS) dengan fallback REST `api.post('/api/v1/chat/publish')`
- Terima event dari server via `socket.on('event', ...)`
- Cache messages di localStorage key `chat_messages_room_<roomId>`
- Auto-inactivity leave setelah 10 menit

## Event Handling (Socket.IO)

```ts
socket.on("event", (payload: { channel, event, data, timestamp }) => {
  if (payload.channel !== roomId) return
  switch (payload.event) {
    case "chat.message":  // tambah pesan baru
    case "chat.join":     // tambah user + system message
    case "chat.leave":    // hapus user + system message
    case "chat.typing":   // show/hide typing indicator
    case "chat.present":  // tambah user ke online list
  }
})
```

## Environment

| Variable | Default | Keterangan |
|----------|---------|------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend URL (REST + WebSocket) |

## Linting

- **WAJIB** `npm run typecheck && npm run lint` sebelum selesai
- Jangan skip error shadcn/ui yang sudah ada (pre-existing di `components/ui/`)
- Error baru di kode kita WAJIB diperbaiki

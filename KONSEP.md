# Ada Chat FE — Konsep Frontend

Chat interaktif real-time seperti WhatsApp/Telegram. FE hanya komunikasi dengan **Backend NestJS** — tidak langsung ke Patuih Gateway.

---

## Arsitektur

```
┌────────────────────────────────────────────────────────────┐
│                      Browser (React FE)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Lobby (Login/Register + Setup Key + Join/Create)    │   │
│  │  Chat (Messaging UI + Online Users + Typing)         │   │
│  │  Message (Bubble + Status + Raw Data)                │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │  services/                                            │   │
│  │    api.ts      ← REST (Auth, API Key mgmt)           │   │
│  │    socket.ts   ← WebSocket ke /chat (backend)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │ REST + WebSocket (JWT Auth)
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                    Backend (NestJS API)                        │
│  - Auth Module (JWT/OAuth2)                                    │
│  - Chat Gateway (/chat WS)                                    │
│  - PatuihService (patuih-sdk)                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Alur Aplikasi (Side Pandangan FE)

### 1. Login / Register
```
Halaman Login
  ├── Input username + password (atau Register)
  ├── Atau klik "Google" → redirect OAuth
  └── POST /api/v1/auth/login → dapat JWT tokens
       → simpan accessToken + refreshToken di localStorage
       → cek apakah user sudah punya Patuih API Key
            ├── Ya → masuk ke Lobby
            └── Tidak → tampilkan form API Key
```

### 2. Setup Patuih API Key
```
Form API Key
  └── Input pk_live_xxx
       → POST /api/v1/chat/patuih-key { apiKey }
       → Backend validasi & simpan
       → Masuk ke Lobby
```

### 3. Join / Create Room
```
Lobby
  ├── "Join Room" → input Room ID / Token
  └── "Create Room" → generate room ID, copy token
       → connect ke backend WS (/chat)
       → masuk ke Chat
```

### 4. Chat
```
Chat View
  ├── Connect: connectChat(userId, username, tenantId, token)
  ├── Join: joinRoom(socket, roomId, username)
  ├── Send: sendMessage(socket, text, id, sender, timestamp)
  ├── Typing: sendTyping(socket, isTyping)
  └── Receive: socket.on("event", handler)
       ├── chat.message → tambah bubble
       ├── chat.join → system message + online list
       ├── chat.leave → system message + online list
       ├── chat.typing → typing indicator
       └── chat.present → update online users
```

---

## Services Layer

### `services/api.ts` — REST Client
- **Auto JWT:** setiap request attach `Authorization: Bearer <token>`
- **Auto-refresh:** jika 401,自动 refresh token via `/api/v1/auth/refresh`
- Methods: `api.get<T>()`, `api.post<T>()`, `api.patch<T>()`, `api.delete<T>()`

### `services/socket.ts` — WebSocket Manager
- Namespace: `/chat` (backend)
- Auth via `socket.auth = { userId, username, tenantId, token }`
- Fungsi: `connectChat()`, `joinRoom()`, `leaveRoom()`, `sendMessage()`, `sendTyping()`

---

## Component Structure

### `App.tsx` — Root
- Manage session state (user, room, tenantId, apiKey, userId)
- Persist session ke localStorage (`chat_session`)
- Render `Lobby` atau `Chat` berdasarkan session

### `Lobby.tsx` — Multi-step Form
- **Step 1 (authMode="login"):** Login / Register + Google OAuth
- **Step 2 (authMode="patuih"):** Input Patuih API Key (jika belum diset)
- **Step 3 (tab=null):** Pilih Join atau Create room
- **Step 4 (tab="join"/"create"):** Detail room + API Key

### `Chat.tsx` — Main Chat
- Connect ke backend WS di `useEffect`
- Kirim pesan via WS (fallback REST)
- Terima event dari server
- Cache messages di localStorage
- Auto-inactivity leave 10 menit
- Sidebar online users, typing indicator

### `Message.tsx` — Message Bubble
- Tipe: `sent`, `received`, `system`
- Status: `sending`, `sent`, `delivered`, `failed`
- Avatar dengan warna unik per user
- Raw data viewer (toggle JSON)

---

## Environment Variables

| Variable        | Default                    | Keterangan                     |
|-----------------|----------------------------|--------------------------------|
| `VITE_API_URL`  | `http://localhost:8000`    | Backend NestJS URL (REST + WS) |

---

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 8
- **Styling:** Tailwind CSS 4 + `tw-animate-css`
- **Components:** shadcn/ui + Base UI React (55+ komponen)
- **Icons:** lucide-react
- **Real-time Client:** Socket.IO Client (`socket.io-client`)
- **Dates:** date-fns + react-day-picker
- **Theme:** next-themes
- **Chart:** recharts
- **Notifications:** sonner
- **State:** React hooks + localStorage

---

## Aturan Keamanan

- **Jangan pernah simpan API Key di client** — API Key hanya di server
- Client hanya pegang **JWT Access Token** + **Refresh Token** + **tenantId**
- tenantId tidak sensitif (hanya identifier gateway namespace)
- Semua request ke backend via services layer (api.ts / socket.ts)

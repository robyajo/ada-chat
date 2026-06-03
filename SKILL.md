# SKILL.md — Frontend Patterns (Ada Chat FE)

> Pola-pola yang sudah distandarisasi. Update jika ada perubahan.

## Services Layer

### REST API (`services/api.ts`)
- `api.get<T>(path)` → GET request dengan JWT auto-refresh
- `api.post<T>(path, body)` → POST request
- `api.patch<T>(path, body)` → PATCH request
- `api.delete<T>(path)` → DELETE request
- `setTokens(accessToken, refreshToken)` — simpan token ke localStorage
- `clearTokens()` — hapus token dari localStorage, dispatch event `auth:expired`
- Semua request otomatis attach `Authorization: Bearer <token>`
- Auto-refresh jika 401 (expired accessToken)
- **Response unwrapping otomatis** — backend pake `ResponseInterceptor` yg bungkus response jd `{ success, message, data }`. `request()` otomatis extract `data`-nya. Caller langsung dapet data mentah tanpa perlu manual unwrap.
- **Session expiry**: pas refresh gagal, `clearTokens()` dispatch `CustomEvent('auth:expired')`. `App.tsx` listen event ini → clear `authUser` + `session` → balik ke login form.

### WebSocket (`services/socket.ts`)
- `connectChat(userId, username, tenantId, token)` → connect ke `/chat` namespace
  - Gateway butuh `userId` dan `tenantId` wajib diisi (tidak boleh kosong)
  - `userId` harus dari `authUser.id` (hasil login), bukan string kosong
- `joinRoom(socket, roomId, username)` → emit `join-room`
- `leaveRoom(socket)` → emit `leave-room`
- `sendMessage(socket, text, id, sender, timestamp)` → emit `send-message`
- `sendTyping(socket, isTyping)` → emit `typing`
- `disconnectChat()` → cleanup

## Component Patterns

### App (`App.tsx`)

Root component with 4 states:
1. **OAuth Callback** — If URL path = `/oauth/callback`, render `OAuthCallback.tsx`
2. **In Chat (active room)** — If `session` exists, render `Chat.tsx`
3. **In Chat (welcome)** — If `authUser` has `patuihApiKey`, render `Chat.tsx` with empty room (welcome screen + FAB)
4. **In Lobby** — Otherwise, render `Lobby.tsx`

Auth state (`authUser`) fetched from `/api/v1/auth/me` on mount if token exists in localStorage.
Session (room) persisted to `localStorage` key `chat_session`.

**Flow:** Login → Lobby (setup API key jika belum) → langsung ke Chat (welcome) → FAB → Create/Join Room → Chat (in-room)

### Lobby (`components/Lobby.tsx`)

Props: `authUser`, `onAuthSuccess`, `onEnter`, `onLogout`

Multi-step flow:
1. **Auth Form** (`!isAuthenticated && !showPatuihSetup`) — Login/Register form, Google OAuth button
2. **Patuih Key Setup** (`showPatuihSetup`) — Input API Key, save via backend
3. **Room Selection** (`!tab`) — Pilih Join atau Create room
4. **Join/Create Form** — Form detail room + API key

After successful auth → langsung ke **Room Selection** (bukan langsung Chat).
Room Selection masuk setelah user Join/Create room.

**PENTING:** `onEnter()` harus kirim `userId: authUser?.id ?? ""`. Jangan hardcode `userId: ""` — gateway backend tolak koneksi WS kalo userId kosong.

State machine:
```
belum login → Auth Form → login success
  ├─ punya Patuih key → Room Selection → Join/Create → Chat
  └─ belum punya key → Patuih Key Setup → Room Selection → Join/Create → Chat
sudah login (refresh halaman) → Room Selection
```

### OAuthCallback (`components/OAuthCallback.tsx`)

- Read `accessToken` & `refreshToken` from URL search params
- Save tokens via `setTokens()` to localStorage
- Redirect to `/`
- Jika ada `?error=` param, tampilkan pesan error lalu redirect

### Chat (`components/Chat.tsx`)

Props: `user, room, apiKey, tenantId, userId?, authUser, onLeave, onEnterRoom, onLogout`

**Dua mode render:**
1. **In-Room** (`room` tidak kosong) — tampilan chat biasa + header dg profile/settings/copy/leave
2. **Welcome** (`room` kosong) — layar selamat datang + FAB (New Room / Join Room / Find by PIN)

**Fitur:**
- Connect ke backend WS via `services/socket.ts` di `useEffect`
- Kirim pesan via `sendMessage()` (WS) dengan fallback REST `api.post('/api/v1/chat/publish')`
- Terima event dari server via `socket.on('event', ...)`
- Cache messages di localStorage key `chat_messages_room_<roomId>`
- Auto-inactivity leave setelah 10 menit
- **Floating Action Button (FAB)** — tombol "+" pojok kanan bawah, buka menu: New Room, Join Room, Find by PIN
- **Profile Sheet** — avatar (inisial), PIN, username, display name, status API Key
- **Settings Sheet** — update Patuih API Key
- **Create Room / Join Room** — dialog modal untuk buat/gabung room
- **Find by PIN** — cari user via PIN 6 digit

## Phone Registration (OTP via SMS)

- Register via `/api/v1/auth/register-phone` → kirim OTP ke nomor (via Twilio atau log dev)
- Verify OTP via `/api/v1/auth/verify-otp` → selesai registrasi, dapet JWT
- Login form di FE punya tab **Email** / **Phone** pas mode Register
- Nomor hp harus format internasional (`+628123456789`)
- OTP 6 digit, valid 5 menit
- Di dev mode (tanpa Twilio), OTP muncul di log backend

## Auth

- Tokens JWT disimpan di localStorage via `setTokens()` / `clearTokens()` dari `services/api.ts`
- `App.tsx` cek token di localStorage saat mount → panggil `/api/v1/auth/me` buat dapetin `authUser`
- Google OAuth flow: backend redirect ke `CLIENT_URL/oauth/callback?accessToken=...&refreshToken=...`
- `OAuthCallback.tsx` handle redirect, simpan token, redirect ke `/`
- **Auto-refresh**: pas 401, `request()` panggil `/api/v1/auth/refresh` (public endpoint, `@Public()`). Harus handle wrapping `data.data` karena `ResponseInterceptor` backend bungkus response.
- **Session expiry**: pas refresh gagal, `clearTokens()` dispatch `CustomEvent('auth:expired')`. `App.tsx` listen event ini → clear `authUser` + `session` → user balik ke login form otomatis.
- **Response unwrapping**: `request()` otomatis extract `json.data` kalo response punya `success: true`. Caller (`Lobby`, `App`, dll) langsung dapet data mentah, gak perlu manual unwrap.

## PIN (BBM-like)

- Setiap user punya **PIN 6 digit unik** — digenerate otomatis pas register (email/password, Google, Discord)
- PIN ditampilkan di halaman **Room Selection** (kotak `PIN Anda` di atas tombol Join/Create)
- Cari user via PIN pake kolom `Cari via PIN` di Room Selection → panggil `GET /api/v1/auth/find-by-pin?pin=123456`
- `AuthUser` interface di `App.tsx` dan `Lobby.tsx` skrg include `pin: string`
- Saat login, `onAuthSuccess()` kirim `{ ..., pin: userData.pin }`

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

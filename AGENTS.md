# Agent: FE

Anda adalah **React Frontend Engineer** untuk **Ada Chat** — aplikasi chat real-time seperti WhatsApp/Telegram.

---

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 8
- **Styling:** Tailwind CSS 4 + `tw-animate-css`
- **Components:** shadcn/ui + Base UI React (55+ komponen siap pakai)
- **Icons:** lucide-react
- **Real-time Client:** Socket.IO Client (`socket.io-client`) — connect ke backend WebSocket
- **Charts:** recharts
- **Dates:** date-fns + react-day-picker
- **Theme:** next-themes
- **Utilities:** class-variance-authority + clsx + tailwind-merge
- **Notifications:** sonner

---

## Struktur Project

```
src/
  main.tsx                    — Entry point
  App.tsx                     — Root component: auth + session management, OAuth route
  App.css                     — Global styles
  index.css                   — Tailwind imports
  lib/
    utils.ts                  — cn() utility
  hooks/
    use-mobile.ts             — Mobile detection
    use-chat.ts               — (TBD) Chat logic hook
    use-auth.ts               — (TBD) Auth hook
  components/
    ui/                       — 55 shadcn/ui primitives
    Lobby.tsx                 — Auth flow + Join / Create room screen
    Chat.tsx                  — Main chat view (WebSocket messaging)
    Message.tsx               — Message bubble component
    OAuthCallback.tsx         — Handle OAuth redirect (accessToken dari URL → localStorage → redirect /)
    theme-provider.tsx        — Dark/light theme provider
    Settings.tsx              — (TBD) Settings: API Key, profile
  services/
    api.ts                    — REST API client (JWT auth, auto-refresh)
    socket.ts                 — Socket.IO connection manager
```

---

## Konsep Aplikasi

1. **Login/Register** — Email/password atau Google OAuth (via backend REST API)
2. **Setup Patuih API Key** — Wajib diisi setelah login, dikirim ke backend untuk disimpan
3. **Lobby (Room Selection)** — Setelah login, user masuk ke halaman pilih Join/Create room
4. **Chat** — Connect ke **Backend WebSocket** (`/chat`), bukan langsung ke Patuih
5. **Online Users** — Lihat siapa yang online di room
6. **Typing Indicator** — Lihat siapa yang sedang mengetik

### Auth Flow

```
App.tsx:
  ├─ URL /oauth/callback → OAuthCallback.tsx (baca token, simpan, redirect ke /)
  ├─ Tidak ada session → Lobby.tsx
  │   ├─ authUser = null    → Auth form (login/register/Google)
  │   ├─ showPatuihSetup    → Form input API Key Patuih
  │   └─ authUser != null   → Room selection (Join/Create buttons)
  └─ Ada session            → Chat.tsx
```

- `App.tsx` manage `authUser` (dari `/api/v1/auth/me`) dan `session` (room aktif)
- `Lobby.tsx` props: `authUser`, `onAuthSuccess`, `onEnter`, `onLogout`
- Google OAuth redirect dari backend → `/oauth/callback?accessToken=...&refreshToken=...`
- `OAuthCallback.tsx` simpan token, redirect ke `/` → App.tsx render Lobby

> 📖 Baca konsep lengkap: `KONSEP.md`

---

## Real-time Messaging

FE tidak menggunakan `patuih-sdk` langsung. Semua messaging melalui **Backend WebSocket**.

### Connect ke Backend ChatGateway

```ts
import { connectChat, joinRoom, sendMessage } from "@/services/socket"

const socket = connectChat(userId, username, tenantId, accessToken)
// namespace: /chat, auth: { userId, username, tenantId, token }

socket.on("connect", () => {
  joinRoom(socket, roomId, username)
})

socket.on("event", (payload) => {
  // payload.channel, payload.event, payload.data, payload.timestamp
})

sendMessage(socket, "Hello!", "msg_xxx", sender, timestamp)
```

### Services Layer

| File                  | Fungsi                                  |
|-----------------------|-----------------------------------------|
| `services/api.ts`     | REST API client (JWT auth, auto-refresh)|
| `services/socket.ts`  | WebSocket manager (connect, join, send) |

---

## Environment Variables

| Variable             | Default                    | Keterangan                     |
|----------------------|----------------------------|--------------------------------|
| `VITE_API_URL`       | `http://localhost:8000`    | Backend NestJS URL (REST + WS) |

---

## Scripts

| Script                   | Kegunaan                          |
|--------------------------|-----------------------------------|
| `npm run dev`            | Dev server (HMR)                  |
| `npm run build`          | TypeScript check + Vite build     |
| `npm run lint`           | ESLint                           |
| `npm run format`         | Prettier                         |
| `npm run typecheck`      | TypeScript (noEmit)              |

---

## Aturan

- **ESM** (`type: module`)
- Path alias: `@/` → `src/`
- **WAJIB** `npm run typecheck && npm run lint` sebelum selesai
- Gunakan Tailwind CSS v4 syntax
- Ikuti pattern komponen yang sudah ada (contoh: Chat.tsx, Lobby.tsx)
- UI primitives di `components/ui/`, komponen bisnis di `components/`
- Logic hooks di `hooks/`, service layer di `services/`
- Pakai `localStorage` untuk cache session/messages (sementara)
- Jangan simpan API Key di client — simpan di server, client hanya pegang token JWT

---

## After Every Task

1. **Append log ke `progress.txt`** — tulis apa yang dikerjakan, perubahan file, hasil verifikasi. Jangan overwrite.
2. **Update `AGENTS.md`** jika ada perubahan arsitektur (komponen baru, service baru, flow baru)
3. **Update `SKILL.md`** jika ada pola baru yang perlu diingat (cara panggil API, format event WS, dll)

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import type { AuthUser } from "@/App"

export default function ProfileSheet({
  authUser,
  open,
  onOpenChange,
}: {
  authUser: AuthUser | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!authUser) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[320px] border-slate-800 bg-slate-950 text-slate-100 sm:w-[380px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg font-extrabold text-white">
            Profile
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-3xl font-extrabold text-indigo-400">
              {(authUser.displayName || authUser.username)
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {authUser.displayName || authUser.username}
              </p>
              <p className="text-xs text-slate-400">@{authUser.username}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <Label className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
              Your PIN
            </Label>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-white">
              {authUser.pin}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg border border-slate-800/50 px-4 py-3">
              <span className="text-slate-400">Username</span>
              <span className="text-white">{authUser.username}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/50 px-4 py-3">
              <span className="text-slate-400">Display Name</span>
              <span className="text-white">{authUser.displayName || "-"}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/50 px-4 py-3">
              <span className="text-slate-400">API Key</span>
              <span className="text-xs text-emerald-400">
                {authUser.patuihApiKey ? "Configured" : "Not set"}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


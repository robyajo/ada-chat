import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

// --- Settings Sheet Component ---
export default function SettingsSheet({
  settingsKey,
  setSettingsKey,
  handleUpdate,
  loading,
  error,
  open,
  onOpenChange,
}: {
  settingsKey: string
  setSettingsKey: (v: string) => void
  handleUpdate: () => void
  loading: boolean
  error: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[320px] border-slate-800 bg-slate-950 text-slate-100 sm:w-[380px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg font-extrabold text-white">
            Settings
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Update your Patuih API Key
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              API Key
            </Label>
            <Input
              className="h-11 rounded-xl border-slate-800 bg-slate-900/60 text-white placeholder-slate-500"
              type="password"
              value={settingsKey}
              onChange={(e) => setSettingsKey(e.target.value)}
              placeholder="pk_live_..."
            />
          </div>
          {error && (
            <Alert
              variant="destructive"
              className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400"
            >
              <AlertDescription className="text-xs font-semibold">
                {error}
              </AlertDescription>
            </Alert>
          )}
          <Button
            className="h-11 w-full rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500"
            onClick={handleUpdate}
            disabled={loading || !settingsKey.trim()}
          >
            {loading ? "..." : "Update API Key"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}


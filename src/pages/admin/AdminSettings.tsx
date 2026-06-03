import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { adminApi, isAdminAuthenticated, clearAdminSession } from "@/services/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { LogOut, Plus, Pencil, Trash2, ArrowLeft, Key, Save } from "lucide-react"

interface AppConfig {
  id: string
  key: string
  value: string
  description: string | null
  createdAt: string
  updatedAt: string
}

function ConfigDialog({ open, onOpenChange, config, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: AppConfig | null
  onSave: (key: string, value: string, description: string) => Promise<void>
}) {
  const [key, setKey] = useState(config?.key ?? "")
  const [value, setValue] = useState(config?.value ?? "")
  const [description, setDescription] = useState(config?.description ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!key.trim()) return
    setSaving(true)
    try {
      await onSave(key.trim(), value, description)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle>{config ? "Edit Config" : "Add Config"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {config ? "Update the configuration value." : "Add a new application configuration."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Key</Label>
            <Input
              className="h-10 rounded-xl border-slate-800 bg-slate-950/45 text-white"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. patuih_system_api_key"
              disabled={!!config}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Value</Label>
            <Input
              className="h-10 rounded-xl border-slate-800 bg-slate-950/45 text-white font-mono"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value"
              type={key.toLowerCase().includes("key") || key.toLowerCase().includes("secret") ? "password" : "text"}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Description</Label>
            <Input
              className="h-10 rounded-xl border-slate-800 bg-slate-950/45 text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this config for?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-slate-400" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-amber-600 text-white hover:bg-amber-500" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 size-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminSettings() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<AppConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/auth/login", { replace: true })
      return
    }
    let cancelled = false
    adminApi.get<AppConfig[]>("/api/v1/admin/config")
      .then((data) => { if (!cancelled) setConfigs(data) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load configs") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [navigate])

  const reloadConfigs = () => {
    adminApi.get<AppConfig[]>("/api/v1/admin/config")
      .then(setConfigs)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load configs"))
  }

  const handleSave = async (key: string, value: string, description: string) => {
    await adminApi.put(`/api/v1/admin/config/${encodeURIComponent(key)}`, { value, description: description || undefined })
    setSuccess(`Config "${key}" saved`)
    setTimeout(() => setSuccess(""), 3000)
    reloadConfigs()
  }

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete config "${key}"?`)) return
    await adminApi.delete(`/api/v1/admin/config/${encodeURIComponent(key)}`)
    reloadConfigs()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070a]">
        <p className="text-slate-400">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05070a]">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-1 size-4" /> Back
          </Button>
          <h1 className="text-lg font-bold text-white">Settings</h1>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-400" onClick={clearAdminSession}>
          <LogOut className="mr-1 size-4" /> Logout
        </Button>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-8">
        {error && (
          <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">Application Config</h2>
            <p className="mt-1 text-xs text-slate-500">
              API keys and settings stored in database instead of .env
            </p>
          </div>
          <Button className="bg-amber-600 text-white hover:bg-amber-500" onClick={() => { setEditingConfig(null); setDialogOpen(true) }}>
            <Plus className="mr-1 size-4" /> Add Config
          </Button>
        </div>

        {configs.length === 0 ? (
          <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Key className="size-8 text-slate-600" />
              <p className="text-sm text-slate-400">No configurations yet</p>
              <p className="text-xs text-slate-500">Add API keys and settings for your application</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg) => (
              <Card key={cfg.id} className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono text-amber-400">{cfg.key}</span>
                    </div>
                    <p className="mt-1.5 truncate text-sm text-slate-300 font-mono">
                      {cfg.key.toLowerCase().includes("key") || cfg.key.toLowerCase().includes("secret")
                        ? "••••••••••••••••"
                        : cfg.value}
                    </p>
                    {cfg.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{cfg.description}</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => { setEditingConfig(cfg); setDialogOpen(true) }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-400" onClick={() => handleDelete(cfg.key)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-wider text-slate-300 uppercase">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between rounded-lg bg-slate-950/30 px-4 py-2">
              <span className="text-slate-400">API URL</span>
              <span className="font-mono text-slate-300">{import.meta.env.VITE_API_URL || "http://localhost:8000"}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-slate-950/30 px-4 py-2">
              <span className="text-slate-400">Configs in Database</span>
              <span className="font-mono text-slate-300">{configs.length}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      <ConfigDialog
        key={editingConfig?.id ?? '__new__'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        config={editingConfig}
        onSave={handleSave}
      />
    </div>
  )
}

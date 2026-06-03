import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { adminApi, isAdminAuthenticated, clearAdminSession } from "@/services/admin-api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Monitor, Wifi, ScrollText, LogOut, ArrowLeft, RefreshCw,
  Cpu, Database, Server, RotateCw,
  WifiOff, WifiHigh,
} from "lucide-react"

interface SystemInfo {
  hostname: string
  platform: string
  arch: string
  release: string
  uptime: number
  nodeVersion: string
  processUptime: number
  cpu: { model: string; cores: number; load1: number; load5: number; load15: number }
  memory: { total: number; free: number; used: number; usagePercent: number }
}

interface GatewayStatus {
  connected: boolean
  tenants: string[]
  tenantCount: number
}

interface LogEntry {
  id: string
  userId: string
  method: string
  ip: string | null
  userAgent: string | null
  createdAt: string
  user: { id: string; username: string; displayName: string | null; role: string }
}

interface LogsData {
  logs: LogEntry[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface Pm2Status {
  running: boolean
  status?: string
  pid?: number
  uptime?: number
  restarts?: number
  cpu?: number
  memory?: number
  message?: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  return parts.join(" ") || "< 1m"
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-amber-600/20 text-amber-400" : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

function SystemTab({ data, pm2, restarting, onRestart }: {
  data: SystemInfo | null
  pm2: Pm2Status | null
  restarting: boolean
  onRestart: () => void
}) {
  if (!data) return <p className="text-sm text-slate-500">Loading system info...</p>

  const memBarWidth = Math.min(data.memory.usagePercent, 100)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            <Server className="size-3.5 text-amber-400" /> Server
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Hostname" value={data.hostname} />
          <Row label="OS" value={`${data.platform} ${data.arch} (${data.release})`} />
          <Row label="Node.js" value={data.nodeVersion} />
          <Row label="System Uptime" value={formatUptime(data.uptime)} />
          <Row label="Process Uptime" value={formatUptime(data.processUptime)} />
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            <Cpu className="size-3.5 text-amber-400" /> CPU
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Model" value={data.cpu.model} />
          <Row label="Cores" value={String(data.cpu.cores)} />
          <Row label="Load (1m)" value={data.cpu.load1.toFixed(2)} />
          <Row label="Load (5m)" value={data.cpu.load5.toFixed(2)} />
          <Row label="Load (15m)" value={data.cpu.load15.toFixed(2)} />
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            <Database className="size-3.5 text-amber-400" /> Memory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}</span>
            <span className={`font-bold ${memBarWidth > 80 ? "text-rose-400" : memBarWidth > 60 ? "text-amber-400" : "text-emerald-400"}`}>
              {data.memory.usagePercent}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                memBarWidth > 80 ? "bg-rose-500" : memBarWidth > 60 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${memBarWidth}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Free: {formatBytes(data.memory.free)}</span>
            <span>Used: {formatBytes(data.memory.used)}</span>
          </div>
        </CardContent>
      </Card>

      {/* PM2 Process Manager */}
      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            <RotateCw className="size-3.5 text-amber-400" /> Process Manager (PM2)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pm2 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${pm2.running ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <span className="text-sm font-bold text-white">ada-chat-api</span>
                </div>
                <Badge className={pm2.running ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}>
                  {pm2.running ? "Online" : pm2.status || "Stopped"}
                </Badge>
              </div>
              {pm2.running && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Row label="PID" value={String(pm2.pid ?? "—")} />
                  <Row label="Restarts" value={String(pm2.restarts ?? 0)} />
                  <Row label="Uptime" value={pm2.uptime ? formatUptime(pm2.uptime) : "—"} />
                  <Row label="CPU" value={pm2.cpu != null ? `${pm2.cpu}%` : "—"} />
                  <Row label="Memory" value={pm2.memory != null ? formatBytes(pm2.memory) : "—"} />
                </div>
              )}
              {!pm2.running && pm2.message && (
                <p className="text-xs text-slate-500">{pm2.message}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">Loading PM2 status...</p>
          )}
          <Button
            className="w-full h-9 rounded-xl bg-amber-600 text-xs font-bold text-white hover:bg-amber-500"
            onClick={onRestart}
            disabled={restarting || !pm2?.running}
          >
            <RotateCw className={`mr-1.5 size-3.5 ${restarting ? "animate-spin" : ""}`} />
            {restarting ? "Restarting..." : "Restart Process"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-lg bg-slate-950/30 px-3 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200 text-right max-w-[60%] truncate" title={value}>{value}</span>
    </div>
  )
}

function GatewayTab({ data }: { data: GatewayStatus | null }) {
  if (!data) return <p className="text-sm text-slate-500">Loading gateway status...</p>

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            <Wifi className="size-3.5 text-amber-400" /> Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {data.connected ? (
              <WifiHigh className="size-8 text-emerald-400" />
            ) : (
              <WifiOff className="size-8 text-rose-400" />
            )}
            <div>
              <p className={`text-lg font-bold ${data.connected ? "text-emerald-400" : "text-rose-400"}`}>
                {data.connected ? "Connected" : "Disconnected"}
              </p>
              <p className="text-xs text-slate-500">
                {data.tenantCount} active tenant{data.tenantCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {data.tenants.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase">Connected Tenants</p>
              {data.tenants.map((t) => (
                <div key={t} className="rounded-lg bg-slate-950/30 px-3 py-2 font-mono text-xs text-slate-300">
                  {t}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold tracking-wider text-slate-300 uppercase">Gateway Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="SDK" value={data.connected ? "Connected" : "Not Connected"} />
          <Row label="Status" value={data.connected ? "Operational" : "Offline"} />
          <Row label="Tenants" value={String(data.tenantCount)} />
        </CardContent>
      </Card>
    </div>
  )
}

function LogsTab() {
  const [logsData, setLogsData] = useState<LogsData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    adminApi.get<LogsData>(`/api/v1/admin/logs?page=${page}&limit=50`)
      .then((data) => { if (!cancelled) setLogsData(data); if (!cancelled) setLoading(false) })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page])

  if (loading && !logsData) return <p className="text-sm text-slate-500">Loading logs...</p>

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-xs font-bold tracking-wider text-slate-300 uppercase">
            <span>Activity Logs</span>
            <span className="text-slate-500 font-normal normal-case">{logsData?.meta.total ?? 0} entries</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsData && logsData.logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500 uppercase">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logsData.logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 text-slate-300 last:border-0 hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <span className="text-white">{log.user.displayName || log.user.username}</span>
                        <span className="ml-1.5 text-xs text-slate-500">@{log.user.username}</span>
                        {log.user.role === "ADMIN" && (
                          <Badge className="ml-1.5 bg-amber-500/20 text-amber-400 text-[9px] px-1 py-0">ADMIN</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="border-slate-800 text-slate-400 text-[10px]">
                          {log.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.ip || "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ScrollText className="size-8 text-slate-600" />
              <p className="text-sm text-slate-400">No logs found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {logsData && logsData.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost" size="sm"
            className="text-slate-400 hover:text-white"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {logsData.meta.page} of {logsData.meta.totalPages}
          </span>
          <Button
            variant="ghost" size="sm"
            className="text-slate-400 hover:text-white"
            disabled={page >= logsData.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

type Tab = "system" | "gateway" | "logs"

export default function AdminMonitoring() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("system")
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null)
  const [pm2Status, setPm2Status] = useState<Pm2Status | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [restarting, setRestarting] = useState(false)

  const refreshData = () => {
    setRefreshing(true)
    Promise.all([
      adminApi.get<SystemInfo>("/api/v1/admin/system").then(setSystemInfo).catch(() => {}),
      adminApi.get<GatewayStatus>("/api/v1/admin/gateway").then(setGatewayStatus).catch(() => {}),
      adminApi.get<Pm2Status>("/api/v1/admin/pm2").then(setPm2Status).catch(() => {}),
    ]).finally(() => setRefreshing(false))
  }

  const handleRestart = async () => {
    setRestarting(true)
    try {
      const res = await adminApi.post<{ success: boolean; message: string }>("/api/v1/admin/pm2/restart")
      alert(res.message)
      setTimeout(() => {
        adminApi.get<Pm2Status>("/api/v1/admin/pm2").then(setPm2Status).catch(() => {})
      }, 3000)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Restart failed")
    } finally {
      setRestarting(false)
    }
  }

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/auth/login", { replace: true })
      return
    }
    let cancelled = false
    let completed = 0
    const markDone = () => { completed++; if (completed === 3 && !cancelled) setRefreshing(false) }
    adminApi.get<SystemInfo>("/api/v1/admin/system").then((data) => { if (!cancelled) setSystemInfo(data) }).catch(() => {}).finally(markDone)
    adminApi.get<GatewayStatus>("/api/v1/admin/gateway").then((data) => { if (!cancelled) setGatewayStatus(data) }).catch(() => {}).finally(markDone)
    adminApi.get<Pm2Status>("/api/v1/admin/pm2").then((data) => { if (!cancelled) setPm2Status(data) }).catch(() => {}).finally(markDone)
    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#05070a]">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-1 size-4" /> Back
          </Button>
          <h1 className="text-lg font-bold text-white">Monitoring</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`mr-1 size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-400" onClick={clearAdminSession}>
            <LogOut className="mr-1 size-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-8">
        <div className="flex gap-2">
          <TabButton active={tab === "system"} onClick={() => setTab("system")} icon={Monitor} label="System" />
          <TabButton active={tab === "gateway"} onClick={() => setTab("gateway")} icon={Wifi} label="Gateway" />
          <TabButton active={tab === "logs"} onClick={() => setTab("logs")} icon={ScrollText} label="Logs" />
        </div>

        {tab === "system" && <SystemTab data={systemInfo} pm2={pm2Status} restarting={restarting} onRestart={handleRestart} />}
        {tab === "gateway" && <GatewayTab data={gatewayStatus} />}
        {tab === "logs" && <LogsTab />}
      </main>
    </div>
  )
}

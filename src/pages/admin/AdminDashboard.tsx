import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { adminApi, isAdminAuthenticated, clearAdminSession } from "@/services/admin-api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Users, MessageSquare, Hash, Activity, LogOut,
  UserPlus, MousePointerClick,
} from "lucide-react"

interface DashboardData {
  totalUsers: number
  totalMessages: number
  totalRooms: number
  activeUsersToday: number
  loginLogsToday: number
  totalContacts: number
  recentUsers: {
    id: string
    username: string
    displayName: string | null
    email: string
    provider: string
    role: string
    createdAt: string
  }[]
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  color: string
}) {
  return (
    <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/auth/login", { replace: true })
      return
    }
    adminApi.get<DashboardData>("/api/v1/admin/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070a]">
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05070a]">
        <p className="text-rose-400">{error}</p>
        <Button variant="outline" onClick={() => navigate("/admin/auth/login")}>
          Back to Login
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05070a]">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => navigate("/admin/settings")}>
            Settings
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => navigate("/admin/monitoring")}>
            Monitoring
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-400" onClick={clearAdminSession}>
            <LogOut className="mr-1 size-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={Users} label="Total Users" value={data?.totalUsers ?? 0} color="bg-indigo-500/20 text-indigo-400" />
          <StatCard icon={MessageSquare} label="Total Messages" value={data?.totalMessages ?? 0} color="bg-emerald-500/20 text-emerald-400" />
          <StatCard icon={Hash} label="Total Rooms" value={data?.totalRooms ?? 0} color="bg-cyan-500/20 text-cyan-400" />
          <StatCard icon={Activity} label="Active Today" value={data?.activeUsersToday ?? 0} color="bg-amber-500/20 text-amber-400" />
          <StatCard icon={MousePointerClick} label="Logins (24h)" value={data?.loginLogsToday ?? 0} color="bg-violet-500/20 text-violet-400" />
          <StatCard icon={UserPlus} label="Connections" value={data?.totalContacts ?? 0} color="bg-rose-500/20 text-rose-400" />
        </div>

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-wider text-slate-300 uppercase">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500 uppercase">
                    <th className="px-6 py-3">Username</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Provider</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 text-slate-300 last:border-0 hover:bg-white/5">
                      <td className="px-6 py-3 font-medium text-white">
                        {user.displayName || user.username}
                        <span className="ml-2 text-xs text-slate-500">@{user.username}</span>
                      </td>
                      <td className="px-6 py-3 text-slate-400">{user.email}</td>
                      <td className="px-6 py-3">
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{user.provider}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          user.role === "ADMIN" ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

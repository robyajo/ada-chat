import { Navigate } from "react-router"

function isAdminAuthenticated() {
  return !!localStorage.getItem("adminAccessToken")
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/auth/login" replace />
  }
  return <>{children}</>
}

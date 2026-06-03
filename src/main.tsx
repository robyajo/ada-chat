import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router"

import "./index.css"
import App from "./App.tsx"
import AdminLogin from "./pages/admin/AdminLogin.tsx"
import AdminDashboard from "./pages/admin/AdminDashboard.tsx"
import AdminSettings from "./pages/admin/AdminSettings.tsx"
import AdminMonitoring from "./pages/admin/AdminMonitoring.tsx"
import { AdminGuard } from "./components/admin-guard.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "./components/ui/tooltip.tsx"
import ChatPage from "./pages/chat/page-chat.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <TooltipProvider>
          <Routes>
            <Route path="/admin/auth/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminGuard>
                  <AdminSettings />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/monitoring"
              element={
                <AdminGuard>
                  <AdminMonitoring />
                </AdminGuard>
              }
            />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<App />} />
          </Routes>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)

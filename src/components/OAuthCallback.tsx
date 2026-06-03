import { useEffect, useRef } from "react"
import { setTokens } from "@/services/api"

function getStatus(): string {
  const params = new URLSearchParams(window.location.search)
  const accessToken = params.get("accessToken")
  const refreshToken = params.get("refreshToken")
  const error = params.get("error")
  if (error) return `Login failed: ${error}`
  if (!accessToken || !refreshToken) return "Invalid callback"
  return "Processing..."
}

export default function OAuthCallback() {
  const status = getStatus()
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get("accessToken")
    const refreshToken = params.get("refreshToken")
    const error = params.get("error")
    if (error || !accessToken || !refreshToken) {
      doneRef.current = true
      setTimeout(() => { window.location.href = "/" }, 2000)
      return
    }
    doneRef.current = true
    setTokens(accessToken, refreshToken)
    window.location.href = "/"
  }, [])

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#05070a] p-4">
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center backdrop-blur-xl">
        <p className="text-slate-300">{status}</p>
      </div>
    </div>
  )
}

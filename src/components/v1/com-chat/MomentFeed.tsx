import { useState, useEffect } from "react"
import { Heart, MessageCircle, Send, Sparkles, Clock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { api } from "@/services/api"

interface Comment {
  id: string
  author: string
  content: string
  createdAt: string
}

interface Moment {
  id: string
  author: string
  content: string
  background: string
  likes: number
  likedBy: string[] // List of usernames who liked it
  comments: Comment[]
  createdAt: string
}

interface MomentFeedProps {
  currentUser: string
  getColor: (name: string) => string
}

const BG_PRESETS = [
  {
    name: "Glass Dark",
    class: "bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl text-slate-100",
    color: "bg-slate-900 border border-slate-800",
  },
  {
    name: "Indigo Spark",
    class: "bg-gradient-to-tr from-indigo-600 to-violet-850 text-white border-none shadow-lg shadow-indigo-950/40",
    color: "bg-gradient-to-tr from-indigo-500 to-violet-600",
  },
  {
    name: "Teal Breeze",
    class: "bg-gradient-to-tr from-emerald-600 to-teal-850 text-white border-none shadow-lg shadow-teal-950/40",
    color: "bg-gradient-to-tr from-emerald-500 to-teal-600",
  },
  {
    name: "Sunset Ember",
    class: "bg-gradient-to-tr from-rose-500 to-orange-600 text-white border-none shadow-lg shadow-rose-950/40",
    color: "bg-gradient-to-tr from-rose-400 to-orange-500",
  },
  {
    name: "Neon Fuchsia",
    class: "bg-gradient-to-tr from-purple-600 to-fuchsia-850 text-white border-none shadow-lg shadow-purple-950/40",
    color: "bg-gradient-to-tr from-purple-500 to-fuchsia-600",
  },
]

export default function MomentFeed({ currentUser, getColor }: MomentFeedProps) {
  const [moments, setMoments] = useState<Moment[]>([])
  const [postText, setPostText] = useState("")
  const [selectedBg, setSelectedBg] = useState(BG_PRESETS[0].class)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({})

  // Load moments from backend API
  const fetchMoments = async () => {
    try {
      const data = await api.get<Moment[]>("/api/v1/moments")
      setMoments(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchMoments()
  }, [])

  // Create new moment
  const handlePublish = async () => {
    if (!postText.trim()) return

    try {
      const newMoment = await api.post<Moment>("/api/v1/moments", {
        content: postText.trim(),
        background: selectedBg,
      })
      setMoments((prev) => [newMoment, ...prev])
      setPostText("")
      setSelectedBg(BG_PRESETS[0].class)
    } catch {
      // ignore
    }
  }

  // Like a moment
  const handleLike = async (id: string) => {
    try {
      const res = await api.post<{ liked: boolean }>(`/api/v1/moments/${id}/like`)
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m

          const hasLiked = m.likedBy.includes(currentUser)
          let likedBy = [...m.likedBy]

          if (res.liked && !hasLiked) {
            likedBy.push(currentUser)
          } else if (!res.liked && hasLiked) {
            likedBy = likedBy.filter((u) => u !== currentUser)
          }

          return { ...m, likes: likedBy.length, likedBy }
        })
      )
    } catch {
      // ignore
    }
  }

  // Toggle comment input display
  const toggleComments = (id: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Submit comment
  const handleAddComment = async (momentId: string) => {
    const text = newCommentTexts[momentId]?.trim()
    if (!text) return

    try {
      const newComment = await api.post<Comment>(`/api/v1/moments/${momentId}/comments`, {
        content: text,
      })
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m
          return {
            ...m,
            comments: [...m.comments, newComment],
          }
        })
      )
      setNewCommentTexts((prev) => ({
        ...prev,
        [momentId]: "",
      }))
    } catch {
      // ignore
    }
  }

  const formatTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return new Date(isoString).toLocaleDateString([], { month: "short", day: "numeric" })
    } catch {
      return "some time ago"
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-slate-950/20 px-4 py-6 md:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header Title */}
        <div className="flex items-center gap-3 border-b border-slate-900 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Moments</h1>
            <p className="text-xs text-slate-500">Share updates and check out what others are doing</p>
          </div>
        </div>

        {/* Create Post Card */}
        <div className="rounded-2xl border border-slate-850 bg-slate-900/30 p-4 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex gap-3">
            <Avatar className="w-9 h-9 rounded-xl border border-slate-800 shadow-sm shrink-0">
              <AvatarFallback style={{ background: `radial-gradient(circle at 30% 30%, ${getColor(currentUser)} 0%, ${getColor(currentUser)}bb 100%)` }} className="text-white text-xs font-bold rounded-xl">
                {currentUser.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="What is happening? Post a moment..."
                maxLength={280}
                className="min-h-[80px] w-full border-none bg-transparent p-0 text-sm text-slate-100 placeholder-slate-500 focus-visible:ring-0 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-900">
            {/* Background Style Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase shrink-0">Theme:</span>
              <div className="flex gap-1.5">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setSelectedBg(preset.class)}
                    title={preset.name}
                    className={`h-6 w-6 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${preset.color} ${
                      selectedBg === preset.class ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handlePublish}
              disabled={!postText.trim()}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
            >
              <span>Publish</span>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Moments Feed List */}
        <div className="space-y-4">
          {moments.map((moment) => {
            const hasLiked = moment.likedBy.includes(currentUser)
            const showComments = !!expandedComments[moment.id]
            const avatarBg = `radial-gradient(circle at 30% 30%, ${getColor(moment.author)} 0%, ${getColor(moment.author)}bb 100%)`

            return (
              <div
                key={moment.id}
                className={`rounded-2xl p-5 border transition-all duration-350 hover:shadow-2xl ${moment.background}`}
              >
                {/* Author Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 rounded-xl border border-white/10 shadow-sm shrink-0">
                      <AvatarFallback style={{ background: avatarBg }} className="text-white text-xs font-bold rounded-xl">
                        {moment.author.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-bold text-xs block text-white/95">{moment.author}</span>
                      <span className="text-[10px] text-white/60 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(moment.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm font-medium leading-relaxed mb-5 whitespace-pre-wrap">
                  {moment.content}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center gap-4 pt-3.5 border-t border-white/10 text-white/80">
                  <button
                    onClick={() => handleLike(moment.id)}
                    className="flex items-center gap-1.5 text-xs hover:text-white transition-colors cursor-pointer group"
                  >
                    <Heart className={`w-4.5 h-4.5 transition-transform duration-250 active:scale-130 ${
                      hasLiked ? "fill-rose-500 text-rose-500" : "text-white/70 group-hover:text-rose-400"
                    }`} />
                    <span>{moment.likes}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(moment.id)}
                    className="flex items-center gap-1.5 text-xs hover:text-white transition-colors cursor-pointer group"
                  >
                    <MessageCircle className="w-4.5 h-4.5 text-white/70 group-hover:text-indigo-400" />
                    <span>{moment.comments.length}</span>
                  </button>
                </div>

                {/* Expanded Comments Drawer */}
                {showComments && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3.5">
                    {/* Add Comment Input Form */}
                    <div className="flex gap-2">
                      <Input
                        value={newCommentTexts[moment.id] || ""}
                        onChange={(e) =>
                          setNewCommentTexts((prev) => ({
                            ...prev,
                            [moment.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment(moment.id)}
                        placeholder="Add a comment..."
                        className="h-8.5 rounded-lg border-white/10 bg-white/5 text-xs text-white placeholder-white/40 focus-visible:ring-indigo-400"
                      />
                      <Button
                        onClick={() => handleAddComment(moment.id)}
                        size="icon"
                        className="h-8.5 w-8.5 bg-white/10 hover:bg-white/20 text-white rounded-lg shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {moment.comments.length === 0 ? (
                        <p className="text-[10px] text-white/40 py-1 italic">
                          No comments yet. Write the first one!
                        </p>
                      ) : (
                        moment.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-white/5 rounded-xl border border-white/5 p-2.5 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-white/90">{comment.author}</span>
                              <span className="text-white/40">{formatTime(comment.createdAt)}</span>
                            </div>
                            <p className="text-white/80 leading-relaxed">{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

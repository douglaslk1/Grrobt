"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Volume2,
  CheckCircle,
  Laugh,
  Frown,
  Angry,
  Sunrise as Surprise,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Post {
  id: string
  content: string
  audio_url: string | null
  video_url: string | null
  media_type: string
  duration: number | null
  created_at: string
  author: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    is_verified: boolean
  }
  tags: Array<{ name: string }>
  reactions_count: number
  comments_count: number
}

interface Comment {
  id: string
  content: string
  created_at: string
  author: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
}

interface PostCardProps {
  post: Post
  currentUserId: string
}

const reactionTypes = [
  { type: "like", icon: Heart, label: "Like", color: "text-red-500" },
  { type: "love", icon: Heart, label: "Love", color: "text-pink-500" },
  { type: "laugh", icon: Laugh, label: "Laugh", color: "text-yellow-500" },
  { type: "wow", icon: Surprise, label: "Wow", color: "text-blue-500" },
  { type: "sad", icon: Frown, label: "Sad", color: "text-gray-500" },
  { type: "angry", icon: Angry, label: "Angry", color: "text-orange-500" },
]

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [userReaction, setUserReaction] = useState<string | null>(null)
  const [reactionsCount, setReactionsCount] = useState(post.reactions_count)
  const [commentsCount, setCommentsCount] = useState(post.comments_count)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchUserReaction()
    fetchReactionsCount()
    fetchCommentsCount()
  }, [])

  const fetchUserReaction = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("reactions")
      .select("reaction_type")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .single()

    if (data) {
      setUserReaction(data.reaction_type)
    }
  }

  const fetchReactionsCount = async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id)

    setReactionsCount(count || 0)
  }

  const fetchCommentsCount = async () => {
    const supabase = createClient()
    const { count } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id)

    setCommentsCount(count || 0)
  }

  const fetchComments = async () => {
    setIsLoadingComments(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        author:profiles!comments_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", post.id)
      .is("parent_id", null)
      .order("created_at", { ascending: true })

    if (!error && data) {
      setComments(data as Comment[])
    }
    setIsLoadingComments(false)
  }

  const handleReaction = async (reactionType: string) => {
    const supabase = createClient()

    if (userReaction === reactionType) {
      // Remove reaction
      await supabase.from("reactions").delete().eq("post_id", post.id).eq("user_id", currentUserId)

      setUserReaction(null)
      setReactionsCount((prev) => prev - 1)
    } else {
      // Add or update reaction
      await supabase.from("reactions").upsert({
        post_id: post.id,
        user_id: currentUserId,
        reaction_type: reactionType,
      })

      if (!userReaction) {
        setReactionsCount((prev) => prev + 1)
      }
      setUserReaction(reactionType)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    const supabase = createClient()

    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      author_id: currentUserId,
      content: newComment.trim(),
    })

    if (!error) {
      setNewComment("")
      setCommentsCount((prev) => prev + 1)
      fetchComments() // Refresh comments
    }
    setIsSubmittingComment(false)
  }

  const toggleComments = () => {
    setShowComments(!showComments)
    if (!showComments && comments.length === 0) {
      fetchComments()
    }
  }

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return ""
    return formatTime(seconds)
  }

  const getUserReactionIcon = () => {
    if (!userReaction) return Heart
    const reaction = reactionTypes.find((r) => r.type === userReaction)
    return reaction?.icon || Heart
  }

  const getUserReactionColor = () => {
    if (!userReaction) return "text-muted-foreground"
    const reaction = reactionTypes.find((r) => r.type === userReaction)
    return reaction?.color || "text-muted-foreground"
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.username}`}>
              <Avatar className="h-10 w-10 cursor-pointer">
                <AvatarImage src={post.author.avatar_url || undefined} />
                <AvatarFallback>{post.author.display_name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline">
                  {post.author.display_name}
                </Link>
                {post.author.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>@{post.author.username}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Text Content */}
        {post.content && <div className="text-foreground whitespace-pre-wrap">{post.content}</div>}

        {/* Audio Player */}
        {post.audio_url && (
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                className="flex items-center gap-2 bg-transparent"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex items-center gap-2 flex-1">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Audio {post.duration && `(${formatDuration(post.duration)})`}
                </span>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={post.audio_url}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              className="hidden"
            />
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag.name} href={`/feed?tag=${tag.name}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">
                  #{tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Media Type Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {post.media_type}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-6">
            {/* Reactions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("flex items-center gap-2 hover:text-red-500", getUserReactionColor())}
                >
                  {React.createElement(getUserReactionIcon(), { className: "w-4 h-4" })}
                  <span>{reactionsCount}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {reactionTypes.map((reaction) => (
                  <DropdownMenuItem
                    key={reaction.type}
                    onClick={() => handleReaction(reaction.type)}
                    className="flex items-center gap-2"
                  >
                    <reaction.icon className={cn("w-4 h-4", reaction.color)} />
                    <span>{reaction.label}</span>
                    {userReaction === reaction.type && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Comments */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleComments}
              className="flex items-center gap-2 text-muted-foreground hover:text-blue-500"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{commentsCount}</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Share className="w-4 h-4" />
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-4 pt-4 border-t">
            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{newComment.length}/500</span>
                <Button type="submit" size="sm" disabled={!newComment.trim() || isSubmittingComment}>
                  {isSubmittingComment ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </form>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-24 h-3 bg-muted rounded"></div>
                      <div className="w-full h-4 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Link href={`/profile/${comment.author.username}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar_url || undefined} />
                        <AvatarFallback>{comment.author.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${comment.author.username}`}
                          className="font-medium text-sm hover:underline"
                        >
                          {comment.author.display_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

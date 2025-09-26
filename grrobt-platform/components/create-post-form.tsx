"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Mic, Play, Pause, Square, X, Hash, Type } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type MediaType = "text" | "audio" | "video" | "mixed"

export default function CreatePostForm() {
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [mediaType, setMediaType] = useState<MediaType>("text")
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      setMediaType(content ? "mixed" : "audio")
    }
  }, [isRecording, content])

  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }, [audioUrl, isPlaying])

  const removeAudio = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setIsPlaying(false)
    setRecordingTime(0)
    setMediaType(content ? "text" : "text")
  }, [content])

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags((prev) => [...prev, tag])
      setTagInput("")
    }
  }, [tagInput, tags])

  const removeTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }, [])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        addTag()
      }
    },
    [addTag],
  )

  const uploadAudio = async (audioBlob: Blob): Promise<string | null> => {
    const supabase = createClient()
    const fileName = `audio_${Date.now()}.webm`

    const { data, error } = await supabase.storage.from("audio").upload(fileName, audioBlob)

    if (error) {
      console.error("Audio upload error:", error)
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("audio").getPublicUrl(fileName)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !audioBlob) {
      setError("Please add some content or record audio")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to create a post")
        return
      }

      let audioUrl = null
      if (audioBlob) {
        audioUrl = await uploadAudio(audioBlob)
        if (!audioUrl) {
          setError("Failed to upload audio")
          return
        }
      }

      // Create the post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content: content.trim(),
          audio_url: audioUrl,
          media_type: mediaType,
          duration: audioBlob ? recordingTime : null,
        })
        .select()
        .single()

      if (postError) throw postError

      // Add tags if any
      if (tags.length > 0 && post) {
        for (const tagName of tags) {
          // Insert or get existing tag
          const { data: tag, error: tagError } = await supabase
            .from("tags")
            .upsert({ name: tagName }, { onConflict: "name" })
            .select()
            .single()

          if (!tagError && tag) {
            // Link tag to post
            await supabase.from("post_tags").insert({ post_id: post.id, tag_id: tag.id })
          }
        }
      }

      router.push("/feed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post")
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="w-5 h-5" />
          Create New Post
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content">What's on your mind?</Label>
            <Textarea
              id="content"
              placeholder="Share your experience..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                if (e.target.value.trim() && !audioBlob) {
                  setMediaType("text")
                } else if (e.target.value.trim() && audioBlob) {
                  setMediaType("mixed")
                }
              }}
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <div className="text-sm text-muted-foreground text-right">{content.length}/500</div>
          </div>

          {/* Audio Recording Section */}
          <div className="space-y-4">
            <Label>Audio Recording</Label>
            <div className="flex flex-wrap gap-3">
              {!audioBlob && (
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="flex items-center gap-2"
                >
                  {isRecording ? (
                    <>
                      <Square className="w-4 h-4" />
                      Stop ({formatTime(recordingTime)})
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Record Audio
                    </>
                  )}
                </Button>
              )}

              {audioBlob && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={playAudio}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <span className="text-sm">Audio recorded ({formatTime(recordingTime)})</span>
                  <Button type="button" variant="ghost" size="sm" onClick={removeAudio}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />}
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <Label htmlFor="tags">Tags (optional)</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="tags"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  maxLength={20}
                />
              </div>
              <Button type="button" variant="outline" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 5}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground">{tags.length}/5 tags</div>
          </div>

          {/* Media Type Display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Post type:</span>
            <Badge variant="outline" className="capitalize">
              {mediaType}
            </Badge>
          </div>

          {/* Error Display */}
          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading || (!content.trim() && !audioBlob)}>
            {isLoading ? "Creating Post..." : "Share Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

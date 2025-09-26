"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Send, Mic, MicOff, Play, Pause, Volume2, ArrowLeft, MoreVertical, Phone, Video } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
}

interface Message {
  id: string
  content: string
  audio_url: string | null
  created_at: string
  is_read: boolean
  sender: Profile
  recipient: Profile
}

interface Conversation {
  user: Profile
  lastMessage: Message | null
  unreadCount: number
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    initializeChat()
  }, [])

  useEffect(() => {
    const targetUser = searchParams.get("user")
    if (targetUser && conversations.length > 0) {
      const conversation = conversations.find((c) => c.user.username === targetUser)
      if (conversation) {
        setSelectedConversation(conversation.user.id)
      }
    }
  }, [searchParams, conversations])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
      markMessagesAsRead(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profile) {
        setCurrentUser(profile)
        await fetchConversations(profile.id)
      }
    } catch (error) {
      console.error("Error initializing chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConversations = async (userId: string) => {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*),
          recipient:profiles!messages_recipient_id_fkey(*)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })

      if (!messages) return

      const conversationMap = new Map<string, Conversation>()

      messages.forEach((message: any) => {
        const otherUser = message.sender.id === userId ? message.recipient : message.sender
        const conversationId = otherUser.id

        if (!conversationMap.has(conversationId)) {
          conversationMap.set(conversationId, {
            user: otherUser,
            lastMessage: message,
            unreadCount: 0,
          })
        }

        if (!message.is_read && message.recipient.id === userId) {
          const conversation = conversationMap.get(conversationId)!
          conversation.unreadCount++
        }
      })

      setConversations(Array.from(conversationMap.values()))
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

  const fetchMessages = async (otherUserId: string) => {
    if (!currentUser) return

    try {
      const { data } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*),
          recipient:profiles!messages_recipient_id_fkey(*)
        `)
        .or(
          `and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUser.id})`,
        )
        .order("created_at", { ascending: true })

      if (data) {
        setMessages(data as Message[])
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const markMessagesAsRead = async (otherUserId: string) => {
    if (!currentUser) return

    try {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", otherUserId)
        .eq("recipient_id", currentUser.id)
        .eq("is_read", false)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !currentUser || isSending) return

    setIsSending(true)
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUser.id,
        recipient_id: selectedConversation,
        content: newMessage.trim(),
        is_read: false,
      })

      if (!error) {
        setNewMessage("")
        fetchMessages(selectedConversation)
        fetchConversations(currentUser.id)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        await sendAudioMessage(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!selectedConversation || !currentUser) return

    try {
      // Upload audio to Supabase Storage
      const fileName = `audio_${Date.now()}.wav`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("audio-messages")
        .upload(fileName, audioBlob)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("audio-messages").getPublicUrl(fileName)

      // Save message with audio URL
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUser.id,
        recipient_id: selectedConversation,
        content: "",
        audio_url: publicUrl,
        is_read: false,
      })

      if (!error) {
        fetchMessages(selectedConversation)
        fetchConversations(currentUser.id)
      }
    } catch (error) {
      console.error("Error sending audio message:", error)
    }
  }

  const playAudio = (audioUrl: string, messageId: string) => {
    if (playingAudio === messageId) {
      audioRef.current?.pause()
      setPlayingAudio(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
        setPlayingAudio(messageId)
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const filteredConversations = conversations.filter(
    (conversation) =>
      conversation.user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedUser = conversations.find((c) => c.user.id === selectedConversation)?.user

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations Sidebar */}
      <div className={cn("w-full md:w-80 border-r bg-card flex flex-col", selectedConversation && "hidden md:flex")}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start a conversation from someone's profile</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.user.id}
                onClick={() => setSelectedConversation(conversation.user.id)}
                className={cn(
                  "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedConversation === conversation.user.id && "bg-muted",
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.user.avatar_url || undefined} />
                    <AvatarFallback>{conversation.user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{conversation.user.display_name}</h3>
                      {conversation.user.is_verified && (
                        <Badge variant="secondary" className="text-xs">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage?.audio_url
                        ? "🎵 Audio message"
                        : conversation.lastMessage?.content || "No messages yet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conversation.lastMessage &&
                        formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 flex flex-col", !selectedConversation && "hidden md:flex")}>
        {selectedConversation && selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)} className="md:hidden">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Link href={`/profile/${selectedUser.username}`}>
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>{selectedUser.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{selectedUser.display_name}</h2>
                    {selectedUser.is_verified && (
                      <Badge variant="secondary" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.sender.id === currentUser?.id ? "justify-end" : "justify-start")}
                >
                  {message.sender.id !== currentUser?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.avatar_url || undefined} />
                      <AvatarFallback>{message.sender.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                      message.sender.id === currentUser?.id ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {message.audio_url ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playAudio(message.audio_url!, message.id)}
                          className="p-1 h-8 w-8"
                        >
                          {playingAudio === message.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Volume2 className="w-4 h-4" />
                        <span className="text-sm">Audio message</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p
                      className={cn(
                        "text-xs mt-1",
                        message.sender.id === currentUser?.id ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {message.sender.id === currentUser?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.avatar_url || undefined} />
                      <AvatarFallback>{message.sender.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <form onSubmit={sendMessage} className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[40px] max-h-32 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(e)
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn("h-10 w-10 p-0", isRecording && "bg-red-500 text-white hover:bg-red-600")}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button type="submit" size="sm" disabled={!newMessage.trim() || isSending} className="h-10 w-10 p-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} className="hidden" />
    </div>
  )
}

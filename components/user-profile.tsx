"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import PostCard from "@/components/post-card"
import {
  CheckCircle,
  MapPin,
  LinkIcon,
  Calendar,
  Users,
  UserPlus,
  UserMinus,
  Settings,
  MessageCircle,
  Camera,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  location: string | null
  website: string | null
  is_verified: boolean
  is_private: boolean
  created_at: string
}

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

interface UserProfileProps {
  profile: Profile
  currentUserId: string
  isOwnProfile: boolean
}

export default function UserProfile({ profile, currentUserId, isOwnProfile }: UserProfileProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("posts")

  useEffect(() => {
    fetchProfileData()
  }, [profile.id])

  const fetchProfileData = async () => {
    setIsLoading(true)
    await Promise.all([fetchPosts(), fetchFollowStats(), fetchFollowStatus()])
    setIsLoading(false)
  }

  const fetchPosts = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        audio_url,
        video_url,
        media_type,
        duration,
        created_at,
        author:profiles!posts_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        ),
        tags:post_tags (
          tag:tags (name)
        )
      `)
      .eq("author_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      // Get engagement counts for each post
      const transformedPosts = await Promise.all(
        data.map(async (post) => {
          const { count: reactionsCount } = await supabase
            .from("reactions")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)

          const { count: commentsCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)

          return {
            ...post,
            tags: post.tags?.map((t) => ({ name: t.tag.name })) || [],
            reactions_count: reactionsCount || 0,
            comments_count: commentsCount || 0,
          }
        }),
      )

      setPosts(transformedPosts)
      setPostsCount(transformedPosts.length)
    }
  }

  const fetchFollowStats = async () => {
    const supabase = createClient()

    // Get followers count
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id)

    // Get following count
    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id)

    setFollowersCount(followersCount || 0)
    setFollowingCount(followingCount || 0)
  }

  const fetchFollowStatus = async () => {
    if (isOwnProfile) return

    const supabase = createClient()
    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", currentUserId)
      .eq("following_id", profile.id)
      .single()

    setIsFollowing(!!data)
  }

  const fetchFollowers = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("follows")
      .select(`
        follower:profiles!follows_follower_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq("following_id", profile.id)

    if (data) {
      setFollowers(data.map((f) => f.follower))
    }
  }

  const fetchFollowing = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("follows")
      .select(`
        following:profiles!follows_following_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq("follower_id", profile.id)

    if (data) {
      setFollowing(data.map((f) => f.following))
    }
  }

  const handleFollow = async () => {
    const supabase = createClient()

    if (isFollowing) {
      // Unfollow
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profile.id)

      setIsFollowing(false)
      setFollowersCount((prev) => prev - 1)
    } else {
      // Follow
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: profile.id,
      })

      setIsFollowing(true)
      setFollowersCount((prev) => prev + 1)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "followers" && followers.length === 0) {
      fetchFollowers()
    } else if (tab === "following" && following.length === 0) {
      fetchFollowing()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-0">
            <div className="h-48 bg-muted animate-pulse"></div>
            <div className="p-6">
              <div className="flex items-start gap-6 animate-pulse">
                <div className="w-24 h-24 bg-muted rounded-full -mt-12 border-4 border-background"></div>
                <div className="flex-1 space-y-4 mt-4">
                  <div className="w-48 h-6 bg-muted rounded"></div>
                  <div className="w-32 h-4 bg-muted rounded"></div>
                  <div className="w-full h-4 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-48 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            {profile.banner_url ? (
              <img
                src={profile.banner_url || "/placeholder.svg"}
                alt={`${profile.display_name}'s banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500" />
            )}
            {isOwnProfile && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white border-0"
              >
                <Camera className="w-4 h-4 mr-2" />
                Edit Banner
              </Button>
            )}
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="w-24 h-24 -mt-12 border-4 border-background">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4 md:mt-0 mt-2">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                    {profile.is_verified && <CheckCircle className="w-6 h-6 text-blue-500" />}
                  </div>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                {profile.bio && <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <LinkIcon className="w-4 h-4" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{postsCount}</span>
                    <span className="text-muted-foreground">Posts</span>
                  </div>
                  <button
                    onClick={() => handleTabChange("followers")}
                    className="flex items-center gap-1 hover:underline"
                  >
                    <span className="font-semibold">{followersCount}</span>
                    <span className="text-muted-foreground">Followers</span>
                  </button>
                  <button
                    onClick={() => handleTabChange("following")}
                    className="flex items-center gap-1 hover:underline"
                  >
                    <span className="font-semibold">{followingCount}</span>
                    <span className="text-muted-foreground">Following</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 md:mt-4">
                {isOwnProfile ? (
                  <Link href="/settings">
                    <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                      <Settings className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? "outline" : "default"}
                      className="flex items-center gap-2"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Link href={`/chat?user=${profile.username}`}>
                      <Button variant="outline" size="icon">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No posts yet</h3>
              <p className="text-muted-foreground">
                {isOwnProfile ? "Share your first experience!" : `${profile.display_name} hasn't posted anything yet.`}
              </p>
              {isOwnProfile && (
                <Link href="/create" className="mt-4 inline-block">
                  <Button>Create Post</Button>
                </Link>
              )}
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} currentUserId={currentUserId} />)
          )}
        </TabsContent>

        <TabsContent value="followers" className="space-y-4">
          {followers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No followers yet</h3>
              <p className="text-muted-foreground">
                {isOwnProfile
                  ? "Share great content to attract followers!"
                  : `${profile.display_name} doesn't have any followers yet.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {followers.map((follower) => (
                <Card key={follower.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${follower.username}`}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={follower.avatar_url || undefined} />
                            <AvatarFallback>{follower.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${follower.username}`} className="font-semibold hover:underline">
                              {follower.display_name}
                            </Link>
                            {follower.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground">@{follower.username}</p>
                        </div>
                      </div>
                      {follower.id !== currentUserId && (
                        <Button variant="outline" size="sm">
                          Follow
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="space-y-4">
          {following.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Not following anyone</h3>
              <p className="text-muted-foreground">
                {isOwnProfile
                  ? "Discover and follow interesting people!"
                  : `${profile.display_name} isn't following anyone yet.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {following.map((followedUser) => (
                <Card key={followedUser.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${followedUser.username}`}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={followedUser.avatar_url || undefined} />
                            <AvatarFallback>{followedUser.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${followedUser.username}`} className="font-semibold hover:underline">
                              {followedUser.display_name}
                            </Link>
                            {followedUser.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground">@{followedUser.username}</p>
                        </div>
                      </div>
                      {followedUser.id !== currentUserId && (
                        <Button variant="outline" size="sm">
                          Follow
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

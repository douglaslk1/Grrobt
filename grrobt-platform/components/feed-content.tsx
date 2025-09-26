"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import PostCard from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Hash, TrendingUp, Clock, Users } from "lucide-react"
import Link from "next/link"

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

interface FeedContentProps {
  userId: string
  searchQuery: string
  tagFilter: string
}

export default function FeedContent({ userId, searchQuery, tagFilter }: FeedContentProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [trendingTags, setTrendingTags] = useState<Array<{ name: string; count: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("recent")

  useEffect(() => {
    fetchPosts()
    fetchTrendingTags()
  }, [searchQuery, tagFilter, activeTab])

  const fetchPosts = async () => {
    setIsLoading(true)
    const supabase = createClient()

    let query = supabase
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
      .eq("is_public", true)

    // Apply search filter
    if (searchQuery) {
      query = query.ilike("content", `%${searchQuery}%`)
    }

    // Apply tag filter
    if (tagFilter) {
      query = query.contains("tags", [{ tag: { name: tagFilter } }])
    }

    // Apply sorting based on active tab
    if (activeTab === "recent") {
      query = query.order("created_at", { ascending: false })
    } else if (activeTab === "trending") {
      // For now, just order by created_at, but in a real app you'd have engagement metrics
      query = query.order("created_at", { ascending: false })
    }

    query = query.limit(20)

    const { data, error } = await query

    if (error) {
      console.error("Error fetching posts:", error)
    } else {
      // Transform the data and get engagement counts
      const transformedPosts = await Promise.all(
        (data || []).map(async (post) => {
          // Get reactions count
          const { count: reactionsCount } = await supabase
            .from("reactions")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)

          // Get comments count
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
    }
    setIsLoading(false)
  }

  const fetchTrendingTags = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("post_tags")
      .select(`
        tag:tags (name),
        count:post_id
      `)
      .limit(10)

    if (!error && data) {
      // Group by tag name and count occurrences
      const tagCounts = data.reduce((acc: Record<string, number>, item) => {
        const tagName = item.tag.name
        acc[tagName] = (acc[tagName] || 0) + 1
        return acc
      }, {})

      const sortedTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      setTrendingTags(sortedTags)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <div className="space-y-2">
                <div className="w-24 h-4 bg-muted rounded"></div>
                <div className="w-16 h-3 bg-muted rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full h-4 bg-muted rounded"></div>
              <div className="w-3/4 h-4 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Results Header */}
      {(searchQuery || tagFilter) && (
        <div className="bg-card rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {searchQuery ? `Search results for "${searchQuery}"` : `Posts tagged with #${tagFilter}`}
            </span>
          </div>
          <Link href="/feed">
            <Button variant="outline" size="sm">
              Clear filters
            </Button>
          </Link>
        </div>
      )}

      {/* Feed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No posts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || tagFilter
                  ? "Try adjusting your search or browse all posts"
                  : "Be the first to share something!"}
              </p>
              <Link href="/create">
                <Button>Create Post</Button>
              </Link>
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} currentUserId={userId} />)
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No trending posts</h3>
              <p className="text-muted-foreground">Check back later for trending content!</p>
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} currentUserId={userId} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Trending Tags Sidebar */}
      {trendingTags.length > 0 && (
        <div className="bg-card rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Trending Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag) => (
              <Link key={tag.name} href={`/feed?tag=${tag.name}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">
                  #{tag.name} ({tag.count})
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

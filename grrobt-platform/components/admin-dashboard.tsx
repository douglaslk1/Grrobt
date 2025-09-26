"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import {
  Shield,
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Eye,
  Ban,
  Check,
  X,
  MoreHorizontal,
  Calendar,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface AdminDashboardProps {
  userId: string
  userRole: string
}

interface Report {
  id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  reporter: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
  reported_user: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  } | null
  reported_post: {
    id: string
    content: string
    author: {
      username: string
      display_name: string
    }
  } | null
}

interface Stats {
  totalUsers: number
  totalPosts: number
  totalReports: number
  pendingReports: number
  activeUsers: number
}

export default function AdminDashboard({ userId, userRole }: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalReports: 0,
    pendingReports: 0,
    activeUsers: 0,
  })
  const [reports, setReports] = useState<Report[]>([])
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    await Promise.all([fetchStats(), fetchReports(), fetchRecentUsers(), fetchRecentPosts()])
    setIsLoading(false)
  }

  const fetchStats = async () => {
    const supabase = createClient()

    const [{ count: totalUsers }, { count: totalPosts }, { count: totalReports }, { count: pendingReports }] =
      await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ])

    // Calculate active users (users who posted in last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: activeUsers } = await supabase
      .from("posts")
      .select("author_id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString())

    setStats({
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      totalReports: totalReports || 0,
      pendingReports: pendingReports || 0,
      activeUsers: activeUsers || 0,
    })
  }

  const fetchReports = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("reports")
      .select(`
        id,
        reason,
        description,
        status,
        created_at,
        reporter:profiles!reports_reporter_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        reported_user:profiles!reports_reported_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        reported_post:posts!reports_reported_post_id_fkey (
          id,
          content,
          author:profiles!posts_author_id_fkey (
            username,
            display_name
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      setReports(data as Report[])
    }
  }

  const fetchRecentUsers = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at, role")
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setRecentUsers(data)
    }
  }

  const fetchRecentPosts = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        media_type,
        created_at,
        author:profiles!posts_author_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setRecentPosts(data)
    }
  }

  const handleReportAction = async (reportId: string, action: "resolved" | "dismissed") => {
    const supabase = createClient()

    const { error } = await supabase
      .from("reports")
      .update({
        status: action,
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
      })
      .eq("id", reportId)

    if (!error) {
      fetchReports() // Refresh reports
      fetchStats() // Refresh stats
    }
  }

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case "spam":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "harassment":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "inappropriate_content":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "fake_account":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "copyright":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "dismissed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage and moderate the Grrobt platform</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {userRole === "admin" ? "Administrator" : "Moderator"}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pendingReports}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentPosts.slice(0, 5).map((post) => (
                    <div key={post.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={post.author.avatar_url || undefined} />
                          <AvatarFallback>{post.author.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{post.author.display_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {post.media_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No reports to review</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getReasonBadgeColor(report.reason)}>
                              {report.reason.replace("_", " ")}
                            </Badge>
                            <Badge className={getStatusBadgeColor(report.status)}>{report.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Reported by</span>
                            <Link href={`/profile/${report.reporter.username}`} className="hover:underline">
                              @{report.reporter.username}
                            </Link>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        {report.status === "pending" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleReportAction(report.id, "resolved")}>
                                <Check className="w-4 h-4 mr-2" />
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReportAction(report.id, "dismissed")}>
                                <X className="w-4 h-4 mr-2" />
                                Dismiss
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {report.description && <p className="text-sm bg-muted p-2 rounded">{report.description}</p>}

                      {report.reported_user && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>Reported user:</span>
                          <Link href={`/profile/${report.reported_user.username}`} className="hover:underline">
                            @{report.reported_user.username}
                          </Link>
                        </div>
                      )}

                      {report.reported_post && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Reported post:</span>
                          <p className="bg-muted p-2 rounded mt-1 line-clamp-2">{report.reported_post.content}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.role}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem asChild>
                            <Link href={`/profile/${user.username}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          {userRole === "admin" && (
                            <DropdownMenuItem>
                              <Ban className="w-4 h-4 mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={post.author.avatar_url || undefined} />
                          <AvatarFallback>{post.author.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{post.author.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{post.author.username}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {post.media_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Post
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Ban className="w-4 h-4 mr-2" />
                              Hide Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className="text-sm line-clamp-3">{post.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="mt-8">
        <Link href="/feed">
          <Button variant="outline">Back to Feed</Button>
        </Link>
      </div>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import FeedContent from "@/components/feed-content"
import Navigation from "@/components/navigation"

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const params = await searchParams
  const searchQuery = params.search || ""
  const tagFilter = params.tag || ""

  // Get user's profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <FeedContent userId={user.id} searchQuery={searchQuery} tagFilter={tagFilter} />
      </div>
    </div>
  )
}

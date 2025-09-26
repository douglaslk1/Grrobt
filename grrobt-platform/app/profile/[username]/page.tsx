import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Navigation from "@/components/navigation"
import UserProfile from "@/components/user-profile"

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { username } = await params

  // Get the profile being viewed
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("username", username).single()

  if (error || !profile) {
    notFound()
  }

  // Get current user's profile
  const { data: currentUserProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} profile={currentUserProfile} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <UserProfile profile={profile} currentUserId={user.id} isOwnProfile={profile.id === user.id} />
      </div>
    </div>
  )
}

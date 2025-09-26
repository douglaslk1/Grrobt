import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Navigation from "@/components/navigation"
import ProfileSettings from "@/components/profile-settings"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's profile - create if doesn't exist
  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: `user_${user.id.slice(0, 8)}`,
        display_name: user.email?.split("@")[0] || "User",
      })
      .select()
      .single()

    if (!createError) {
      profile = newProfile
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and account settings</p>
        </div>
        <ProfileSettings profile={profile} />
      </div>
    </div>
  )
}

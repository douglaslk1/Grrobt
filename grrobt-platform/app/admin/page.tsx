import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminDashboard from "@/components/admin-dashboard"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin or moderator
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !["admin", "moderator"].includes(profile.role)) {
    redirect("/feed")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminDashboard userId={user.id} userRole={profile.role} />
    </div>
  )
}

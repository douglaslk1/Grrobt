import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import CreatePostForm from "@/components/create-post-form"

export default async function CreatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Post</h1>
          <p className="text-muted-foreground">Share your experience with text, audio, or video</p>
        </div>
        <CreatePostForm />
      </div>
    </div>
  )
}

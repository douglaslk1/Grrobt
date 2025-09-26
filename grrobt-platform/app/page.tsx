import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mic, Video, MessageCircle, Users } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/feed")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-6">Grrobt</h1>
          <p className="text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Share your experiences through text, audio, and video. Connect with others in a whole new way.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3 bg-transparent">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Text Posts</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Share your thoughts and experiences with rich text formatting
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Audio Stories</h3>
            <p className="text-gray-600 dark:text-gray-400">Record and share audio messages with your unique voice</p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Video Content</h3>
            <p className="text-gray-600 dark:text-gray-400">Create engaging video posts to tell your story visually</p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Social Network</h3>
            <p className="text-gray-600 dark:text-gray-400">Follow friends, react to posts, and build your community</p>
          </div>
        </div>
      </div>
    </div>
  )
}

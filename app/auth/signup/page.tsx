"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Captcha } from "@/components/captcha"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isCaptchaVerified) {
      setError("Please complete the security verification")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      setIsCaptchaVerified(false)
      return
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long")
      setIsLoading(false)
      setIsCaptchaVerified(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      setIsCaptchaVerified(false)
      return
    }

    try {
      console.log("[v0] Starting signup process...")
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/feed`,
          data: {
            username,
            display_name: displayName || username,
          },
        },
      })

      console.log("[v0] Signup response:", { data, error })

      if (error) {
        if (error.message?.includes("already registered")) {
          setError("This email is already registered. Please try logging in instead.")
        } else {
          setError(error.message || "An error occurred during signup")
        }
        setIsCaptchaVerified(false)
        return
      }

      console.log("[v0] Signup successful, redirecting to verify email...")
      router.push("/auth/verify-email")
    } catch (error: unknown) {
      console.error("[v0] Signup error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsCaptchaVerified(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-400">Grrobt</CardTitle>
            <CardDescription className="text-lg">Create your account and start sharing</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <Captcha onVerify={setIsCaptchaVerified} />
              {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>}
              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !isCaptchaVerified}
              >
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              {"Already have an account? "}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

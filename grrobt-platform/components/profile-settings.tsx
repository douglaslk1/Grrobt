"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Upload, Save, User, Shield, Bell, LogOut } from "lucide-react"

interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  location: string | null
  website: string | null
  is_verified: boolean
  is_private: boolean
}

interface ProfileSettingsProps {
  profile: Profile
}

export default function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    display_name: profile.display_name || "",
    bio: profile.bio || "",
    location: profile.location || "",
    website: profile.website || "",
    is_private: profile.is_private || false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim() || null,
          location: formData.location.trim() || null,
          website: formData.website.trim() || null,
          is_private: formData.is_private,
        })
        .eq("id", profile.id)

      if (error) throw error

      setSuccess("Profile updated successfully!")
      setTimeout(() => {
        router.push(`/profile/${profile.username}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-lg">{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Upload className="w-4 h-4" />
                  Change Avatar
                </Button>
                <p className="text-sm text-muted-foreground mt-1">JPG, PNG or GIF. Max size 2MB.</p>
              </div>
            </div>

            {/* Username (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={profile.username} disabled className="bg-muted" />
              <p className="text-sm text-muted-foreground">Username cannot be changed</p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => handleInputChange("display_name", e.target.value)}
                maxLength={100}
                required
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <div className="text-sm text-muted-foreground text-right">{formData.bio.length}/500</div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Where are you based?"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://your-website.com"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                maxLength={255}
              />
            </div>

            {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

            {success && (
              <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">{success}</div>
            )}

            <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="private-account">Private Account</Label>
              <p className="text-sm text-muted-foreground">Only approved followers can see your posts</p>
            </div>
            <Switch
              id="private-account"
              checked={formData.is_private}
              onCheckedChange={(checked) => handleInputChange("is_private", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for new followers and mentions
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive push notifications for reactions and comments</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

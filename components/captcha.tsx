"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CaptchaProps {
  onVerify: (isValid: boolean) => void
  className?: string
}

export function Captcha({ onVerify, className }: CaptchaProps) {
  const [captchaText, setCaptchaText] = useState("")
  const [userInput, setUserInput] = useState("")
  const [isVerified, setIsVerified] = useState(false)

  // Generate random captcha text
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaText(result)
    setUserInput("")
    setIsVerified(false)
    onVerify(false)
  }

  useEffect(() => {
    generateCaptcha()
  }, [])

  const handleVerify = () => {
    const isValid = userInput.toLowerCase() === captchaText.toLowerCase()
    setIsVerified(isValid)
    onVerify(isValid)

    if (!isValid) {
      generateCaptcha()
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label htmlFor="captcha">Security Verification</Label>
      <div className="flex items-center gap-3">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 font-mono text-lg tracking-wider select-none">
          {captchaText}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={generateCaptcha} className="shrink-0 bg-transparent">
          Refresh
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          id="captcha"
          type="text"
          placeholder="Enter the code above"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          className={isVerified ? "border-green-500" : ""}
        />
        <Button type="button" onClick={handleVerify} variant={isVerified ? "default" : "outline"} className="shrink-0">
          Verify
        </Button>
      </div>
      {isVerified && <p className="text-sm text-green-600 dark:text-green-400">✓ Verification successful</p>}
    </div>
  )
}

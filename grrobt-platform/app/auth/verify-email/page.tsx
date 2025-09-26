import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-lg">We've sent you a verification link</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Please check your email and click the verification link to activate your account.
            </p>
            <p className="text-sm text-muted-foreground">
              {"Didn't receive the email? Check your spam folder or try signing up again."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

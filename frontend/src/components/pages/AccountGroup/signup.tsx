"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { setAuthSession } from "@/lib/auth"
import { getInstruments, type Instrument } from "@/lib/api"
import InstrumentSelector from "@/components/shared/InstrumentSelector"

export default function SignupCard() {
  const router = useRouter()
  const apiBaseUrl = "http://localhost:5000"

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [instrumentIds, setInstrumentIds] = useState<number[]>([])
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(true)
  const [instrumentError, setInstrumentError] = useState("")
  const [instrumentLoadAttempt, setInstrumentLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getInstruments(controller.signal)
      .then((options) => {
        if (!controller.signal.aborted) setInstruments(options)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setInstrumentError(error instanceof Error
            ? error.message
            : "Unable to load instruments. Please try again.")
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingInstruments(false)
      })
    return () => controller.abort()
  }, [instrumentLoadAttempt])

  const hasValidSelection = instrumentIds.length > 0 && instrumentIds.every(
    (id) => instruments.some((instrument) => instrument.instrument_id === id)
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (isSubmitting) return
    if (isLoadingInstruments || instrumentError || !hasValidSelection) {
      setErrorMessage("Please select at least one available instrument.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/users/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username, email, password,
          instrument_ids: instrumentIds,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.Error ?? "Sign up failed.")
        return
      }

      if (payload.Token) {
        setAuthSession(payload.Token, payload.User)
      }

      setSuccessMessage(payload.Message ?? "Account created successfully.")
      router.push("/dashboard")
    } 
    catch {
      setErrorMessage("Unable to reach the sign up service.")
    } 
    finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-sm">
          
        {/* Header */}
        <CardHeader>
            
          <CardTitle>
            Create your account
          </CardTitle>
            
          <CardDescription>
            Create your account and choose the instruments you want to practice.
          </CardDescription>
            
          <CardAction>
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
          </CardAction>

        </CardHeader>

        {/* Content */}
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">

              {/* Username Input */}
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="musiclover123"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
                
              {/* Email Input */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
                
              <div className="grid gap-2">
                <InstrumentSelector
                  instruments={instruments}
                  selectedIds={instrumentIds}
                  onChange={setInstrumentIds}
                  label="Instruments to practice"
                  description="Select at least one instrument. You can choose more than one."
                  loading={isLoadingInstruments}
                  disabled={isLoadingInstruments || !!instrumentError || isSubmitting}
                  gridClassName="grid-cols-2 gap-2"
                />
                {instrumentError && (
                  <div className="grid gap-2">
                    <p role="alert" className="text-sm text-red-500">{instrumentError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setInstrumentError("")
                        setIsLoadingInstruments(true)
                        setInstrumentLoadAttempt((attempt) => attempt + 1)
                      }}
                    >
                      Retry loading instruments
                    </Button>
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="grid gap-2">
                  
                <div className="flex items-center">
                  <Label htmlFor="password">New Password</Label>
                </div>

                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />

              </div>

              {errorMessage ? (
                <p role="alert" className="text-sm text-red-500">{errorMessage}</p>
              ) : null}

              {successMessage ? (
                <p className="text-sm text-green-600">{successMessage}</p>
              ) : null}

            </div>
            
            {/* Footer */}
            <CardFooter className="flex-col gap-2 px-0 pt-6">
              <Button type="submit" className="w-full" disabled={
                isSubmitting || isLoadingInstruments || !!instrumentError || !hasValidSelection
              }>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>

              <p> or </p>

              <Button variant="outline" className="w-full" type="button">
                Continue as Guest
              </Button>
            </CardFooter>
          </form>
        </CardContent>

      </Card>
    </>
  )
}

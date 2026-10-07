"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getInstruments, getProfile, updateInstruments, type Instrument } from "@/lib/api"
import { getAuthToken, updateAuthUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function InstrumentSettings() {
  const [options, setOptions] = useState<Instrument[]>([])
  const [savedIds, setSavedIds] = useState<number[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const saveController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const token = getAuthToken()
    Promise.all([getProfile(controller.signal), getInstruments(controller.signal)])
      .then(([user, instruments]) => {
        if (controller.signal.aborted || getAuthToken() !== token) return
        const ids = user.instruments.map((instrument) => instrument.instrument_id)
        setOptions(instruments)
        setSavedIds(ids)
        setSelectedIds(ids)
        updateAuthUser(user)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Unable to load your instruments.")
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
      saveController.current?.abort()
    }
  }, [loadAttempt])

  const hasChanges = selectedIds.length !== savedIds.length || selectedIds.some((id) => !savedIds.includes(id))
  const validSelection = selectedIds.length > 0 && selectedIds.every((id) => options.some((item) => item.instrument_id === id))

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (loading || loadError || saveController.current || !validSelection || !hasChanges) return
    const controller = new AbortController()
    saveController.current = controller
    const token = getAuthToken()
    setSaving(true)
    setSaved(false)
    setSaveError("")
    try {
      const user = await updateInstruments(selectedIds, controller.signal)
      if (controller.signal.aborted || getAuthToken() !== token) return
      const ids = user.instruments.map((instrument) => instrument.instrument_id)
      updateAuthUser(user)
      setSavedIds(ids)
      setSelectedIds(ids)
      setSaved(true)
    } catch (error) {
      if (!controller.signal.aborted) {
        setSaveError(error instanceof Error ? error.message : "Unable to save your instruments. Please try again.")
      }
    } finally {
      saveController.current = null
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Practice instruments</CardTitle>
        <CardDescription>Choose the instruments you are interested in learning or practicing.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <p role="status">Loading your instruments...</p> : loadError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-500">{loadError}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {
                setLoading(true)
                setLoadError("")
                setLoadAttempt((attempt) => attempt + 1)
              }}>Retry</Button>
              <Button variant="ghost" asChild><Link href="/login">Log in</Link></Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <fieldset disabled={saving} aria-describedby="profile-instruments-help" className="disabled:opacity-50">
              <legend className="mb-3 text-sm font-medium">Your instruments</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((instrument) => (
                  <label key={instrument.instrument_id} className="border-input flex items-center gap-3 rounded-md border p-3 text-sm">
                    <input type="checkbox" name="instrument_ids" value={instrument.instrument_id}
                      checked={selectedIds.includes(instrument.instrument_id)}
                      onChange={() => {
                        setSelectedIds((ids) => ids.includes(instrument.instrument_id)
                          ? ids.filter((id) => id !== instrument.instrument_id)
                          : [...ids, instrument.instrument_id])
                        setSaved(false)
                        setSaveError("")
                      }}
                      className="accent-primary size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                    {instrument.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <p id="profile-instruments-help" className="text-muted-foreground text-sm">Select at least one instrument, then save your changes.</p>
            {saveError && <p role="alert" className="text-sm text-red-500">{saveError}</p>}
            {saved && <p role="status" className="text-sm text-green-600">Your instruments have been saved.</p>}
            <Button type="submit" disabled={saving || !validSelection || !hasChanges}>
              {saving ? "Saving..." : "Save instruments"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

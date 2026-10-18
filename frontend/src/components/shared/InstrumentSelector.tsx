"use client"

import { useId } from "react"
import type { Instrument } from "@/lib/api"
import { cn } from "@/lib/utils"

type InstrumentSelectorProps = {
  instruments: Instrument[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
  label: string
  description: string
  disabled?: boolean
  loading?: boolean
  gridClassName?: string
}

// Shared checkbox UI; each parent owns its selections, validation, and API requests.
export default function InstrumentSelector({
  instruments, selectedIds, onChange, label, description,
  disabled = false, loading = false, gridClassName,
}: InstrumentSelectorProps) {
  const helpId = useId()

  function toggleInstrument(id: number) {
    onChange(selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id])
  }

  return (
    <div className="grid gap-2">
      <fieldset disabled={disabled || loading} aria-describedby={helpId} className="min-w-0 disabled:opacity-50">
        <legend className="mb-2 text-sm font-medium">{label}</legend>
        {loading ? (
          <p role="status" className="text-muted-foreground text-sm">Loading instruments...</p>
        ) : (
          <div className={cn("grid gap-3 sm:grid-cols-2", gridClassName)}>
            {instruments.map((instrument) => (
              <label key={instrument.instrument_id} className="border-input flex items-center gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  name="instrument_ids"
                  value={instrument.instrument_id}
                  checked={selectedIds.includes(instrument.instrument_id)}
                  onChange={() => toggleInstrument(instrument.instrument_id)}
                  className="accent-primary size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                {instrument.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <p id={helpId} className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

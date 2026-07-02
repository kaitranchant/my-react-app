'use client'

import * as React from 'react'
import { Plus, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DIETARY_RESTRICTION_PRESETS,
  parseDietaryRestrictions,
  serializeDietaryRestrictions,
  type DietaryRestrictionPreset,
} from '@/lib/dietary-restrictions'
import { cn } from '@/lib/utils'

type DietaryRestrictionsPickerProps = {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function DietaryRestrictionsPicker({
  value,
  onChange,
  disabled = false,
}: DietaryRestrictionsPickerProps) {
  const parsed = parseDietaryRestrictions(value)
  const [customInput, setCustomInput] = React.useState('')

  function updateSelection(
    presets: DietaryRestrictionPreset[],
    custom: string[]
  ) {
    onChange(serializeDietaryRestrictions(presets, custom))
  }

  function togglePreset(preset: DietaryRestrictionPreset) {
    const nextPresets = parsed.presets.includes(preset)
      ? parsed.presets.filter((entry) => entry !== preset)
      : [...parsed.presets, preset]
    updateSelection(nextPresets, parsed.custom)
  }

  function addCustomEntry() {
    const trimmed = customInput.trim()
    if (!trimmed) return

    let nextPresets = [...parsed.presets]
    let nextCustom = [...parsed.custom]

    for (const rawEntry of trimmed.split(',')) {
      const entry = rawEntry.trim()
      if (!entry) continue

      const presetMatch = DIETARY_RESTRICTION_PRESETS.find(
        (preset) => preset.toLowerCase() === entry.toLowerCase()
      )
      if (presetMatch) {
        if (!nextPresets.includes(presetMatch)) {
          nextPresets = [...nextPresets, presetMatch]
        }
      } else if (
        !nextCustom.some(
          (item) => item.toLowerCase() === entry.toLowerCase()
        )
      ) {
        nextCustom = [...nextCustom, entry]
      }
    }

    updateSelection(nextPresets, nextCustom)
    setCustomInput('')
  }

  function removeCustomEntry(entry: string) {
    updateSelection(
      parsed.presets,
      parsed.custom.filter((item) => item !== entry)
    )
  }

  return (
    <div className="grid gap-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {DIETARY_RESTRICTION_PRESETS.map((preset) => {
          const selected = parsed.presets.includes(preset)
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => togglePreset(preset)}
              className={cn(
                'focus-visible:ring-ring shrink-0 rounded-md focus-visible:ring-2 focus-visible:outline-none',
                disabled && 'pointer-events-none opacity-60'
              )}
            >
              <Badge variant={selected ? 'default' : 'outline'}>{preset}</Badge>
            </button>
          )
        })}
      </div>

      {parsed.custom.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {parsed.custom.map((entry) => (
            <Badge key={entry} variant="secondary" className="shrink-0 gap-1 pr-1">
              {entry}
              {!disabled ? (
                <button
                  type="button"
                  className="hover:bg-background/20 rounded-sm p-0.5"
                  onClick={() => removeCustomEntry(entry)}
                  aria-label={`Remove ${entry}`}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      ) : null}

      {!disabled ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="dietary-custom-entry">Custom restriction</Label>
            <Input
              id="dietary-custom-entry"
              placeholder="e.g. Shellfish allergy (comma-separated OK)"
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addCustomEntry()
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomEntry}
            disabled={!customInput.trim()}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function DietaryRestrictionsDisplay({
  value,
}: {
  value: string | null | undefined
}) {
  const items = [
    ...parseDietaryRestrictions(value).presets,
    ...parseDietaryRestrictions(value).custom,
  ]

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="warning-soft">
          {item}
        </Badge>
      ))}
    </div>
  )
}

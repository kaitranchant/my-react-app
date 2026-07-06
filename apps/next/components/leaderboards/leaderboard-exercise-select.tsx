'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export type LeaderboardExerciseSelectOption = {
  id: string
  name: string
}

type LeaderboardExerciseSelectProps = {
  options: LeaderboardExerciseSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

export function LeaderboardExerciseSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select exercise',
}: LeaderboardExerciseSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selected = options.find((option) => option.id === value)

  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative w-full sm:w-[280px]">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-label="Exercise"
        className="w-full justify-between font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">
          {selected?.name ?? placeholder}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open ? (
        <div className="bg-popover absolute top-full right-0 z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md">
          <Command>
            <CommandInput placeholder="Search exercises…" />
            <CommandList>
              <CommandEmpty>No exercises found.</CommandEmpty>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onValueChange(option.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === option.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  )
}

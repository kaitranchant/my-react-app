'use client'

import * as React from 'react'
import { Check, Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ASSESSMENT_CATEGORY_LABELS,
  groupAssessmentItemsByCategory,
  parseAssessmentRubricConfig,
} from '@/lib/assessments'
import { cn } from '@/lib/utils'
import {
  createCustomAssessmentItem,
} from '@/app/(dashboard)/clients/assessment-actions'
import {
  assessmentItemCategories,
  assessmentRubricTypes,
  defaultRubricConfig,
} from '@/lib/validations/assessment'
import type { AssessmentItem, AssessmentRubricType } from 'app/types/database'
import { toast } from 'sonner'

type AssessmentItemPickerProps = {
  items: AssessmentItem[]
  selectedItemIds: Set<string>
  onToggleItem: (item: AssessmentItem) => void
  onItemCreated: (item: AssessmentItem) => void
  disabled?: boolean
}

export function AssessmentItemPicker({
  items,
  selectedItemIds,
  onToggleItem,
  onItemCreated,
  disabled,
}: AssessmentItemPickerProps) {
  const [query, setQuery] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [showCreate, setShowCreate] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [customName, setCustomName] = React.useState('')
  const [customCategory, setCustomCategory] =
    React.useState<(typeof assessmentItemCategories)[number]>('custom')
  const [customRubric, setCustomRubric] =
    React.useState<AssessmentRubricType>('scale')
  const [customInstructions, setCustomInstructions] = React.useState('')
  const [customUnit, setCustomUnit] = React.useState('units')

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false
      }
      if (!normalized) return true
      return (
        item.name.toLowerCase().includes(normalized) ||
        (item.instructions?.toLowerCase().includes(normalized) ?? false)
      )
    })
  }, [items, query, categoryFilter])

  const groups = groupAssessmentItemsByCategory(filtered)

  async function handleCreate() {
    if (!customName.trim()) {
      toast.error('Enter a name for the custom movement.')
      return
    }

    setCreating(true)
    const rubricConfig =
      customRubric === 'measurement'
        ? { unit: customUnit.trim() || 'units', higherIsBetter: true }
        : defaultRubricConfig(customRubric)

    const result = await createCustomAssessmentItem({
      name: customName.trim(),
      category: customCategory,
      instructions: customInstructions.trim() || null,
      rubricType: customRubric,
      rubricConfig,
    })
    setCreating(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    onItemCreated(result.data)
    onToggleItem(result.data)
    setCustomName('')
    setCustomInstructions('')
    setShowCreate(false)
    toast.success('Custom movement added')
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movements…"
            className="pl-8"
            disabled={disabled}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {assessmentItemCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {ASSESSMENT_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border p-2">
        {groups.length === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">
            No movements match your search.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.category} className="grid gap-1.5">
              <p className="text-muted-foreground px-1 text-xs font-medium uppercase tracking-wide">
                {ASSESSMENT_CATEGORY_LABELS[group.category]}
              </p>
              {group.items.map((item) => {
                const selected = selectedItemIds.has(item.id)
                const config = parseAssessmentRubricConfig(
                  item.rubric_type,
                  item.rubric_config
                )
                const rubricHint =
                  item.rubric_type === 'scale'
                    ? `${config.min ?? 0}–${config.max ?? 3}`
                    : item.rubric_type === 'measurement'
                      ? config.unit ?? 'measure'
                      : item.rubric_type === 'pass_fail'
                        ? 'pass/fail'
                        : 'notes'
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleItem(item)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition',
                      selected
                        ? 'border-brand/50 bg-brand/10'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                        selected
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-muted-foreground/40'
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {rubricHint}
                        {item.coach_id ? ' · Custom' : ''}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>

      {showCreate ? (
        <div className="grid gap-3 rounded-xl border p-3">
          <div className="grid gap-2">
            <Label htmlFor="custom-assessment-name">Custom movement</Label>
            <Input
              id="custom-assessment-name"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="e.g. Seated hip internal rotation"
              disabled={creating || disabled}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={customCategory}
                onValueChange={(value) =>
                  setCustomCategory(value as typeof customCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assessmentItemCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {ASSESSMENT_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Scoring</Label>
              <Select
                value={customRubric}
                onValueChange={(value) =>
                  setCustomRubric(value as AssessmentRubricType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                      {assessmentRubricTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'pass_fail'
                        ? 'Pass / fail'
                        : type === 'scale'
                          ? 'Ordinal (0–3)'
                          : type === 'measurement'
                            ? 'Continuous'
                            : type === 'questionnaire'
                              ? 'Questionnaire'
                              : 'Notes'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {customRubric === 'measurement' ? (
            <div className="grid gap-2">
              <Label htmlFor="custom-assessment-unit">Unit</Label>
              <Input
                id="custom-assessment-unit"
                value={customUnit}
                onChange={(event) => setCustomUnit(event.target.value)}
                placeholder="lbs, cm, sec…"
                disabled={creating || disabled}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="custom-assessment-instructions">
              Instructions (optional)
            </Label>
            <Textarea
              id="custom-assessment-instructions"
              rows={2}
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value)}
              disabled={creating || disabled}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || disabled}
            >
              {creating ? 'Saving…' : 'Add movement'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="justify-start"
          onClick={() => setShowCreate(true)}
          disabled={disabled}
        >
          <Plus className="size-4" />
          Create custom movement
        </Button>
      )}
    </div>
  )
}

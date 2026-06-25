'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Pill, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { updateClientNutritionProfile } from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import {
  DietaryRestrictionsDisplay,
  DietaryRestrictionsPicker,
} from '@/components/nutrition/dietary-restrictions-picker'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasDietaryInfo } from '@/lib/nutrition-goal-context'
import {
  normalizeSupplements,
  nutritionProfileToFormValues,
  parseSupplements,
} from '@/lib/nutrition'
import type { ClientNutritionProfile, NutritionSupplement } from 'app/types/database'

type NutritionDietaryCardProps = {
  clientId: string
  profile: ClientNutritionProfile | null
}

export function NutritionDietaryCard({
  clientId,
  profile,
}: NutritionDietaryCardProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [dietaryRestrictions, setDietaryRestrictions] = React.useState(
    profile?.dietary_restrictions ?? null
  )
  const [supplements, setSupplements] = React.useState<NutritionSupplement[]>(
    parseSupplements(profile?.supplements)
  )

  React.useEffect(() => {
    setDietaryRestrictions(profile?.dietary_restrictions ?? null)
    setSupplements(parseSupplements(profile?.supplements))
  }, [profile])

  const hasContent = hasDietaryInfo({
    ...profile,
    dietary_restrictions: dietaryRestrictions,
    supplements,
  } as ClientNutritionProfile)

  function updateSupplement(
    index: number,
    field: keyof NutritionSupplement,
    value: string
  ) {
    setSupplements((current) => {
      const next = [...current]
      const existing = next[index] ?? { name: '', dosage: null, timing: null }
      next[index] = {
        ...existing,
        [field]: value || null,
      }
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const cleanedSupplements = normalizeSupplements(
      supplements.filter((supplement) => supplement.name.trim())
    )

    const result = await updateClientNutritionProfile(clientId, {
      ...nutritionProfileToFormValues(profile),
      dietaryRestrictions,
      supplements: cleanedSupplements,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Dietary info saved.')
    router.refresh()
  }

  return (
    <Card className={hasContent ? 'border-amber-500/30' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle
            className={hasContent ? 'size-4 text-amber-500' : 'size-4'}
          />
          Dietary restrictions & supplements
        </CardTitle>
        <CardDescription>
          Record allergies, intolerances, and supplements. Use chips for common
          restrictions so they&apos;re easy to reference when planning meals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-2">
            <Label>Restrictions & allergies</Label>
            <DietaryRestrictionsPicker
              value={dietaryRestrictions}
              onChange={setDietaryRestrictions}
              disabled={pending}
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Pill className="size-3.5" />
                Supplements
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSupplements((current) => [
                    ...current,
                    { name: '', dosage: null, timing: null },
                  ])
                }
              >
                <Plus className="size-4" />
                Add supplement
              </Button>
            </div>
            {supplements.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No supplements recorded.
              </p>
            ) : (
              <div className="grid gap-2">
                {supplements.map((supplement, index) => (
                  <div
                    key={index}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                  >
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input
                        placeholder="Creatine"
                        value={supplement.name}
                        onChange={(event) =>
                          updateSupplement(index, 'name', event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Dosage</Label>
                      <Input
                        placeholder="5g"
                        value={supplement.dosage ?? ''}
                        onChange={(event) =>
                          updateSupplement(index, 'dosage', event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Timing</Label>
                      <Input
                        placeholder="Post-workout"
                        value={supplement.timing ?? ''}
                        onChange={(event) =>
                          updateSupplement(index, 'timing', event.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSupplements((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save dietary info'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

type NutritionDietarySummaryProps = {
  profile: ClientNutritionProfile | null
}

export function NutritionDietarySummary({
  profile,
}: NutritionDietarySummaryProps) {
  const restrictions = profile?.dietary_restrictions
  const supplements = parseSupplements(profile?.supplements)
  const hasContent = hasDietaryInfo(profile)

  if (!hasContent) return null

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-500" />
          Dietary restrictions & supplements
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {restrictions ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Restrictions & allergies
            </p>
            <DietaryRestrictionsDisplay value={restrictions} />
          </div>
        ) : null}
        {supplements.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <Pill className="size-3.5" />
              Supplements
            </p>
            <ul className="grid gap-2">
              {supplements.map((supplement, index) => (
                <li
                  key={`${supplement.name}-${index}`}
                  className="bg-muted/30 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{supplement.name}</span>
                  {supplement.dosage ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {supplement.dosage}
                    </span>
                  ) : null}
                  {supplement.timing ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {supplement.timing}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Scale, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { InbodyScanForm } from '@/components/inbody/inbody-scan-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatInbodyMetric,
  formatInbodyScanDateTime,
  formatInbodyScanSummary,
  inbodyScanToFormValues,
} from '@/lib/inbody-scans'
import type { InbodyScanFormValues } from '@/lib/validations/inbody-scan'
import type { ClientInbodyScan } from 'app/types/database'

type InbodyScanListProps = {
  scans: ClientInbodyScan[]
  emptyMessage?: string
  emptyAction?: { label: string; href?: string; onClick?: () => void }
  canEdit?: (scan: ClientInbodyScan) => boolean
  onUpdate: (
    scanId: string,
    values: InbodyScanFormValues
  ) => Promise<{ success: boolean; error?: string }>
  onDelete: (scanId: string) => Promise<{ success: boolean; error?: string }>
}

function ScanDetail({ scan }: { scan: ClientInbodyScan }) {
  const optionalMetrics = [
    scan.total_body_water_lbs != null
      ? formatInbodyMetric(scan.total_body_water_lbs, 'lbs')
      : null,
    scan.dry_lean_mass_lbs != null
      ? `Dry lean ${scan.dry_lean_mass_lbs.toFixed(1)} lbs`
      : null,
    scan.body_fat_mass_lbs != null
      ? `Fat mass ${scan.body_fat_mass_lbs.toFixed(1)} lbs`
      : null,
    scan.bmi != null ? `BMI ${scan.bmi.toFixed(1)}` : null,
    scan.lean_body_mass_lbs != null
      ? `LBM ${scan.lean_body_mass_lbs.toFixed(1)} lbs`
      : null,
    scan.basal_metabolic_rate_kcal != null
      ? `${scan.basal_metabolic_rate_kcal} kcal BMR`
      : null,
    scan.skeletal_muscle_index != null
      ? `SMI ${scan.skeletal_muscle_index.toFixed(1)}`
      : null,
  ].filter(Boolean)

  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{formatInbodyScanSummary(scan)}</p>
      {optionalMetrics.length > 0 && (
        <p className="text-muted-foreground text-xs">{optionalMetrics.join(' · ')}</p>
      )}
      {scan.notes && (
        <p className="text-muted-foreground text-xs leading-relaxed">{scan.notes}</p>
      )}
    </div>
  )
}

function ScanRow({
  scan,
  canEdit,
  onUpdate,
  onDelete,
}: {
  scan: ClientInbodyScan
  canEdit: boolean
  onUpdate: InbodyScanListProps['onUpdate']
  onDelete: InbodyScanListProps['onDelete']
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const deleteConfirm = useConfirmDialog({
    title: 'Delete InBody scan?',
    description: 'This permanently removes the scan from history.',
    confirmLabel: 'Delete scan',
    destructive: true,
    onConfirm: async () => {
      setIsDeleting(true)
      const result = await onDelete(scan.id)
      setIsDeleting(false)
      if (result.success) {
        toast.success('Scan deleted')
        router.refresh()
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

  async function handleUpdate(values: InbodyScanFormValues) {
    const result = await onUpdate(scan.id, values)
    if (result.success) {
      setIsEditing(false)
      router.refresh()
    }
    return result
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>
              {formatInbodyScanDateTime(scan.scan_date)}
            </CardTitle>
            <CardDescription>
              Logged by {scan.submitted_by === 'client' ? 'client' : 'coach'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {scan.submitted_by === 'client' ? 'Client' : 'Coach'}
            </Badge>
            {canEdit && !isEditing && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deleteConfirm.open}
                  disabled={isDeleting}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <InbodyScanForm
            initialValues={inbodyScanToFormValues(scan)}
            submitLabel="Update scan"
            onSubmit={handleUpdate}
            onSuccess={() => router.refresh()}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <ScanDetail scan={scan} />
        )}
      </CardContent>
      {deleteConfirm.dialog}
    </Card>
  )
}

export function InbodyScanList({
  scans,
  emptyMessage = 'No InBody scans logged yet.',
  emptyAction,
  canEdit = () => true,
  onUpdate,
  onDelete,
}: InbodyScanListProps) {
  if (scans.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Scale}
            title={emptyMessage.replace(/\.$/, '')}
            description="Log a scan to track body composition alongside check-ins and goals."
            action={emptyAction}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {scans.map((scan) => (
        <ScanRow
          key={scan.id}
          scan={scan}
          canEdit={canEdit(scan)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

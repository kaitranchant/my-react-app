import { Badge } from '@/components/ui/badge'
import type { ExerciseSource } from 'app/types/database'

export function ExerciseSourceBadge({ source }: { source: ExerciseSource }) {
  if (source === 'custom') return null

  return (
    <Badge variant="outline" className="text-[10px] font-normal">
      ExerciseDB
    </Badge>
  )
}

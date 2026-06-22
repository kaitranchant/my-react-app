import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function SettingsSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card id={id} className={cn('scroll-mt-6 gap-0 overflow-hidden py-0', className)}>
      <CardHeader className="border-b bg-muted/30 px-5 py-4">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-5 py-5">{children}</CardContent>
    </Card>
  )
}

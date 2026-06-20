import { Megaphone } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { TeamAnnouncement } from 'app/types/database'

type PortalTeamAnnouncementsProps = {
  announcements: TeamAnnouncement[]
}

export function PortalTeamAnnouncements({
  announcements,
}: PortalTeamAnnouncementsProps) {
  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/30 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Megaphone className="size-4" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-5">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No announcements yet. Your coach will post team updates here.
          </p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((announcement) => (
              <li
                key={announcement.id}
                className="rounded-lg border bg-muted/20 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  {announcement.pinned && (
                    <span className="text-muted-foreground text-xs font-medium">
                      Pinned
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {new Date(announcement.created_at).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric' }
                    )}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

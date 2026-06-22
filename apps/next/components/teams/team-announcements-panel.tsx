'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Megaphone, Pin, PinOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createTeamAnnouncement,
  deleteTeamAnnouncement,
  restoreTeamAnnouncement,
  toggleTeamAnnouncementPin,
} from '@/app/(dashboard)/teams/feature-actions'
import { toastSuccessWithUndo } from '@/lib/toast-undo'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import {
  teamAnnouncementSchema,
  type TeamAnnouncementValues,
} from '@/lib/validations/team'
import type { TeamAnnouncement } from 'app/types/database'

type TeamAnnouncementsPanelProps = {
  teamId: string
  announcements: TeamAnnouncement[]
}

export function TeamAnnouncementsPanel({
  teamId,
  announcements,
}: TeamAnnouncementsPanelProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const form = useForm<TeamAnnouncementValues>({
    resolver: zodResolver(teamAnnouncementSchema),
    defaultValues: { content: '', pinned: true },
  })

  async function onSubmit(values: TeamAnnouncementValues) {
    setPending(true)
    const result = await createTeamAnnouncement(teamId, values)
    setPending(false)

    if (result.success) {
      toast.success('Announcement posted')
      form.reset({ content: '', pinned: true })
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  async function handleDelete(id: string) {
    const announcement = announcements.find((item) => item.id === id)
    if (!announcement) return

    setPending(true)
    const result = await deleteTeamAnnouncement(teamId, id)
    setPending(false)
    if (result.success) {
      toastSuccessWithUndo('Announcement deleted', async () => {
        const undoResult = await restoreTeamAnnouncement(teamId, announcement)
        if (undoResult.success) {
          toast.success('Announcement restored')
          router.refresh()
        } else {
          toast.error(undoResult.error)
        }
      })
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    setPending(true)
    const result = await toggleTeamAnnouncementPin(teamId, id, !pinned)
    setPending(false)
    if (result.success) {
      toast.success(pinned ? 'Announcement unpinned' : 'Announcement pinned')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/30 px-5 py-4">
        <CardTitle className="text-muted-foreground">Announcements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Post a message to the whole team…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="sm" disabled={pending}>
              <Megaphone className="size-4" />
              {pending ? 'Posting…' : 'Post announcement'}
            </Button>
          </form>
        </Form>

        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No announcements yet. Post updates for the whole team here.
          </p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((announcement) => (
              <li
                key={announcement.id}
                className="rounded-lg border bg-muted/20 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
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
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={pending}
                      onClick={() =>
                        handleTogglePin(announcement.id, announcement.pinned)
                      }
                    >
                      {announcement.pinned ? (
                        <PinOff className="size-4" />
                      ) : (
                        <Pin className="size-4" />
                      )}
                      <span className="sr-only">Toggle pin</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={pending}
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
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

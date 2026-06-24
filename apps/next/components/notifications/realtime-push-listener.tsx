'use client'

import * as React from 'react'

import { createClient } from '@/lib/supabase/client'
import { showBrowserNotification } from '@/lib/web-push/client'

type RealtimePushListenerProps = {
  role: 'coach' | 'client'
  userId: string
  clientId?: string | null
}

function shouldNotify(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.visibilityState !== 'visible' &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  )
}

export function RealtimePushListener({
  role,
  userId,
  clientId,
}: RealtimePushListenerProps) {
  React.useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }

    const supabase = createClient()
    const channels: ReturnType<typeof supabase.channel>[] = []

    if (role === 'coach') {
      const messagesChannel = supabase
        .channel(`coach-push-messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_messages',
            filter: `coach_id=eq.${userId}`,
          },
          (payload) => {
            const message = payload.new as {
              sender_role?: string
              body?: string | null
              message_type?: string | null
              client_id?: string
            }

            if (message.sender_role !== 'client' || !message.client_id) {
              return
            }

            const preview =
              message.message_type === 'voice'
                ? 'Voice message'
                : message.body?.trim() || 'New message'

            if (!shouldNotify()) {
              return
            }

            showBrowserNotification({
              title: 'New client message',
              body: preview,
              url: `/clients/${message.client_id}/messages`,
              tag: `coach-message-${message.client_id}`,
            })
          }
        )
        .subscribe()
      channels.push(messagesChannel)

      const checkInsChannel = supabase
        .channel(`coach-push-check-ins:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_check_ins',
            filter: `coach_id=eq.${userId}`,
          },
          (payload) => {
            const checkIn = payload.new as {
              submitted_by?: string
              client_id?: string
            }

            if (checkIn.submitted_by !== 'client' || !checkIn.client_id) {
              return
            }

            if (!shouldNotify()) {
              return
            }

            showBrowserNotification({
              title: 'New client check-in',
              body: 'A client submitted a wellness check-in for your review.',
              url: '/check-ins',
              tag: `coach-check-in-${checkIn.client_id}`,
            })
          }
        )
        .subscribe()
      channels.push(checkInsChannel)

      const formReviewsChannel = supabase
        .channel(`coach-push-form-reviews:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_form_reviews',
            filter: `coach_id=eq.${userId}`,
          },
          (payload) => {
            const review = payload.new as {
              client_id?: string
              title?: string | null
            }

            if (!review.client_id) {
              return
            }

            if (!shouldNotify()) {
              return
            }

            showBrowserNotification({
              title: 'New form review submission',
              body: review.title?.trim() || 'A client submitted a lift for review.',
              url: '/form-review',
              tag: `coach-form-review-${review.client_id}`,
            })
          }
        )
        .subscribe()
      channels.push(formReviewsChannel)
    }

    if (role === 'client' && clientId) {
      const messagesChannel = supabase
        .channel(`client-push-messages:${clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_messages',
            filter: `client_id=eq.${clientId}`,
          },
          (payload) => {
            const message = payload.new as {
              sender_role?: string
              body?: string | null
              message_type?: string | null
            }

            if (message.sender_role !== 'coach') {
              return
            }

            const preview =
              message.message_type === 'voice'
                ? 'Voice message from your coach'
                : message.body?.trim() || 'New message from your coach'

            if (!shouldNotify()) {
              return
            }

            showBrowserNotification({
              title: 'Message from your coach',
              body: preview,
              url: '/portal/messages',
              tag: `client-message-${clientId}`,
            })
          }
        )
        .subscribe()
      channels.push(messagesChannel)

      const checkInReviewChannel = supabase
        .channel(`client-push-check-in-review:${clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'client_check_ins',
            filter: `client_id=eq.${clientId}`,
          },
          (payload) => {
            const checkIn = payload.new as { reviewed_at?: string | null }
            const previous = payload.old as { reviewed_at?: string | null }

            if (!checkIn.reviewed_at || previous.reviewed_at) {
              return
            }

            if (!shouldNotify()) {
              return
            }

            showBrowserNotification({
              title: 'Check-in feedback',
              body: 'Your coach reviewed your check-in.',
              url: '/portal/progress',
              tag: `client-check-in-review-${clientId}`,
            })
          }
        )
        .subscribe()
      channels.push(checkInReviewChannel)

      const formReviewReplyChannel = supabase
        .channel(`client-push-form-review-reply:${clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'client_form_reviews',
            filter: `client_id=eq.${clientId}`,
          },
          (payload) => {
            const review = payload.new as {
              coach_feedback?: string | null
              reviewed_at?: string | null
              title?: string | null
            }
            const previous = payload.old as {
              coach_feedback?: string | null
              reviewed_at?: string | null
            }

            const gainedFeedback =
              Boolean(review.coach_feedback?.trim()) &&
              !previous.coach_feedback?.trim()
            const newlyReviewed =
              Boolean(review.reviewed_at) && !previous.reviewed_at

            if (!gainedFeedback && !newlyReviewed) {
              return
            }

            if (!shouldNotify()) {
              return
            }

            showBrowserNotification({
              title: 'Form review feedback',
              body:
                review.title?.trim()
                  ? `Your coach replied to "${review.title.trim()}"`
                  : 'Your coach replied to your form review.',
              url: '/portal/form-review',
              tag: `client-form-review-${clientId}`,
            })
          }
        )
        .subscribe()
      channels.push(formReviewReplyChannel)
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel)
      }
    }
  }, [role, userId, clientId])

  return null
}

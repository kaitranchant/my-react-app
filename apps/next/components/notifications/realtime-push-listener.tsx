'use client'

import * as React from 'react'

import { createClient } from '@/lib/supabase/client'
import type { PortalNotificationPreferences } from '@/lib/portal-notification-preferences'
import { showBrowserNotification } from '@/lib/web-push/client'

type RealtimePushListenerProps = {
  role: 'coach' | 'client'
  userId: string
  clientId?: string | null
  notificationPrefs?: PortalNotificationPreferences
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
  notificationPrefs,
}: RealtimePushListenerProps) {
  React.useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }

    const prefs = notificationPrefs
    const supabase = createClient()
    const channels: ReturnType<typeof supabase.channel>[] = []

    if (role === 'coach') {
      const coachChannel = supabase
        .channel(`coach-push:${userId}`)
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
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_form_reviews',
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
      channels.push(coachChannel)
    }

    if (role === 'client' && clientId) {
      const clientChannel = supabase
        .channel(`client-push:${clientId}`)
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

            if (prefs && !prefs.notifyCoachMessages) {
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

            if (prefs && !prefs.notifyCheckInReviews) {
              return
            }

            if (!shouldNotify()) {
              return
            }

            showBrowserNotification({
              title: 'Check-in feedback',
              body: 'Your coach reviewed your check-in.',
              url: '/portal/check-in',
              tag: `client-check-in-review-${clientId}`,
            })
          }
        )
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

            if (prefs && !prefs.notifyFormReviewReplies) {
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
      channels.push(clientChannel)
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel)
      }
    }
  }, [role, userId, clientId, notificationPrefs])

  return null
}

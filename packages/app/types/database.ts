export type ClientStatus = 'active' | 'paused' | 'archived'
export type ClientCoachingType = 'online' | 'in_person' | 'hybrid'
export type UserRole = 'coach' | 'client'
export type ClientInviteStatus = 'not_invited' | 'pending' | 'accepted'
export type GymMemberRole = 'owner' | 'coach'
export type GymMemberStatus = 'active' | 'pending'
export type GymInviteStatus = 'pending' | 'accepted' | 'revoked'
export type SubscriptionPlan = 'starter' | 'growth' | 'scale' | 'facility'
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
export type ClientInvoiceStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'void'
  | 'uncollectible'
export type ClientSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
export type ClientBillingInterval = 'month' | 'year'
export type ProgramStatus = 'draft' | 'active' | 'archived'
export type ProgramAssignmentStatus = 'active' | 'completed' | 'cancelled'
export type MealPlanStatus = 'draft' | 'active' | 'archived'
export type MealPlanAssignmentStatus = 'active' | 'completed' | 'cancelled'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
export type FoodSource = 'usda' | 'custom'
export type TeamEventType =
  | 'practice'
  | 'check_in'
  | 'mock_meet'
  | 'competition'
  | 'other'
export type TeamEventRsvpStatus = 'going' | 'maybe' | 'declined' | 'no_response'
export type TeamEventAttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'excused'
export type TeamChallengeStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'cancelled'
export type ExerciseStatus = 'active' | 'archived'
export type ExerciseSource = 'custom' | 'exercisedb'
export type WorkoutStatus = 'draft' | 'active' | 'archived'
export type ScheduledWorkoutStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'skipped'
export type CheckInSubmittedBy = 'client' | 'coach'
export type WeightUnit = 'lbs' | 'kg'
export type BiologicalSex = 'male' | 'female'
export type WeekStartsOn = 'sunday' | 'monday'
export type CheckInFrequency = 'daily' | 'weekly' | 'biweekly'
export type ClientEmailNudgeType =
  | 'workout_reminder'
  | 'check_in_due'
  | 'unread_digest'
  | 'appointment_reminder'
export type CoachTimezone =
  | 'auto'
  | 'america_new_york'
  | 'america_chicago'
  | 'america_denver'
  | 'america_los_angeles'
  | 'europe_london'
export type MessageSenderRole = 'coach' | 'client'
export type ClientMessageType = 'text' | 'voice'
export type ProgressPhotoPose = 'front' | 'side' | 'back'
export type ExercisePrRecordType = 'e1rm' | 'top_set'
export type ScheduledExerciseRepMode = 'reps' | 'time'
export type ClientGoalCategory =
  | 'composition'
  | 'daily'
  | 'performance'
  | 'habit'
  | 'milestone'
export type ClientGoalDirection = 'decrease' | 'increase'
export type ClientGoalComparison = 'at_least' | 'at_most'
export type ClientGoalPerformanceMetric =
  | 'weight'
  | 'reps'
  | 'e1rm'
  | 'time_seconds'
  | 'powerlifting_total'
export type ClientGoalHabitSource =
  | 'workouts_per_week'
  | 'check_in_submitted'
  | 'nutrition_adherence'
export type ClientGoalHabitPeriod = 'week'
export type ClientGoalMilestoneType =
  | 'session_count'
  | 'program_completion'
  | 'training_streak_days'
export type ClientGoalProgressSource = 'inbody' | 'check_in' | 'prefer_inbody'
export type NutritionSupplement = {
  name: string
  dosage: string | null
  timing: string | null
}

export type WearableProvider =
  | 'whoop'
  | 'garmin'
  | 'oura'
  | 'apple_health'
  | 'fitbit'
export type WearableConnectionStatus =
  | 'pending'
  | 'connected'
  | 'disconnected'
  | 'error'
export type CoachingAppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
export type CoachingAppointmentBookedBy = 'coach' | 'client'
export type CoachAvailabilityExceptionType = 'blocked' | 'extra_hours'

export type ClientGoalMetadata = {
  squatExerciseId?: string
  benchExerciseId?: string
  deadliftExerciseId?: string
}
export type CompositionGoalMetric =
  | 'weight_lbs'
  | 'percent_body_fat'
  | 'skeletal_muscle_mass_lbs'
  | 'body_fat_mass_lbs'
  | 'lean_body_mass_lbs'
  | 'bmi'
  | 'total_body_water_lbs'
  | 'dry_lean_mass_lbs'
  | 'basal_metabolic_rate_kcal'
  | 'skeletal_muscle_index'

export type ScheduledExerciseBlock =
  | 'warmup'
  | 'activation'
  | 'main_lift'
  | 'accessory'
  | 'core'
  | 'conditioning'
  | 'cooldown'
  | 'mobility'
  | 'finisher'

export type ScheduledExerciseTrackingOptions = {
  completionLift: boolean
  bodyweight: boolean
  coachCompletes: boolean
  disablePrTracking: boolean
  forcePrUpdate: boolean
  trackBarSpeed: boolean
  trackPeakPower: boolean
  trackReps: boolean
  trackVolume: boolean
  autoProgressLoad: boolean
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          business_name: string | null
          avatar_url: string | null
          role: UserRole
          weight_unit: WeightUnit
          week_starts_on: WeekStartsOn
          coach_timezone: string | null
          default_check_in_frequency: CheckInFrequency
          default_onboarding_program_id: string | null
          onboarding_welcome_template_id: string | null
          notify_check_ins: boolean
          notify_workout_completions: boolean
          notify_missed_sessions: boolean
          notify_invite_accepted: boolean
          notify_form_reviews: boolean
          notify_prs: boolean
          notify_weekly_summary: boolean
          portal_notify_messages: boolean
          portal_notify_check_in_reviews: boolean
          portal_notify_form_review_replies: boolean
          portal_notify_team_updates: boolean
          portal_notify_workout_reminders: boolean
          portal_notify_check_in_reminders: boolean
          portal_notify_unread_digest: boolean
          portal_notify_appointment_reminders: boolean
          notify_appointment_reminders: boolean
          appointment_reminder_hours: number
          session_booking_enabled: boolean
          default_session_duration_minutes: number
          booking_buffer_minutes: number
          booking_min_notice_hours: number
          booking_max_days_ahead: number
          default_session_location: string | null
          booking_requires_session_pack: boolean
          subscription_plan: SubscriptionPlan
          subscription_status: SubscriptionStatus | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean
          stripe_connect_payouts_enabled: boolean
          stripe_connect_details_submitted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          business_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          weight_unit?: WeightUnit
          week_starts_on?: WeekStartsOn
          coach_timezone?: string | null
          default_check_in_frequency?: CheckInFrequency
          default_onboarding_program_id?: string | null
          onboarding_welcome_template_id?: string | null
          notify_check_ins?: boolean
          notify_workout_completions?: boolean
          notify_missed_sessions?: boolean
          notify_invite_accepted?: boolean
          notify_form_reviews?: boolean
          notify_prs?: boolean
          notify_weekly_summary?: boolean
          portal_notify_messages?: boolean
          portal_notify_check_in_reviews?: boolean
          portal_notify_form_review_replies?: boolean
          portal_notify_team_updates?: boolean
          portal_notify_workout_reminders?: boolean
          portal_notify_check_in_reminders?: boolean
          portal_notify_unread_digest?: boolean
          portal_notify_appointment_reminders?: boolean
          notify_appointment_reminders?: boolean
          appointment_reminder_hours?: number
          session_booking_enabled?: boolean
          default_session_duration_minutes?: number
          booking_buffer_minutes?: number
          booking_min_notice_hours?: number
          booking_max_days_ahead?: number
          default_session_location?: string | null
          booking_requires_session_pack?: boolean
          subscription_plan?: SubscriptionPlan
          subscription_status?: SubscriptionStatus | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean
          stripe_connect_payouts_enabled?: boolean
          stripe_connect_details_submitted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          business_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          weight_unit?: WeightUnit
          week_starts_on?: WeekStartsOn
          coach_timezone?: string | null
          default_check_in_frequency?: CheckInFrequency
          default_onboarding_program_id?: string | null
          onboarding_welcome_template_id?: string | null
          notify_check_ins?: boolean
          notify_workout_completions?: boolean
          notify_missed_sessions?: boolean
          notify_invite_accepted?: boolean
          notify_form_reviews?: boolean
          notify_prs?: boolean
          notify_weekly_summary?: boolean
          portal_notify_messages?: boolean
          portal_notify_check_in_reviews?: boolean
          portal_notify_form_review_replies?: boolean
          portal_notify_team_updates?: boolean
          portal_notify_workout_reminders?: boolean
          portal_notify_check_in_reminders?: boolean
          portal_notify_unread_digest?: boolean
          portal_notify_appointment_reminders?: boolean
          notify_appointment_reminders?: boolean
          appointment_reminder_hours?: number
          session_booking_enabled?: boolean
          default_session_duration_minutes?: number
          booking_buffer_minutes?: number
          booking_min_notice_hours?: number
          booking_max_days_ahead?: number
          default_session_location?: string | null
          booking_requires_session_pack?: boolean
          subscription_plan?: SubscriptionPlan
          subscription_status?: SubscriptionStatus | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean
          stripe_connect_payouts_enabled?: boolean
          stripe_connect_details_submitted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_billing_subscriptions: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          amount_cents: number
          interval: ClientBillingInterval
          currency: string
          description: string
          status: ClientSubscriptionStatus
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          checkout_session_id: string | null
          checkout_url: string | null
          current_period_end: string | null
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          amount_cents: number
          interval: ClientBillingInterval
          currency?: string
          description: string
          status?: ClientSubscriptionStatus
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          checkout_session_id?: string | null
          checkout_url?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          amount_cents?: number
          interval?: ClientBillingInterval
          currency?: string
          description?: string
          status?: ClientSubscriptionStatus
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          checkout_session_id?: string | null
          checkout_url?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_billing_subscriptions_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_billing_subscriptions_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_email_nudges: {
        Row: {
          id: string
          client_id: string
          nudge_type: ClientEmailNudgeType
          reference_key: string
          sent_at: string
        }
        Insert: {
          id?: string
          client_id: string
          nudge_type: ClientEmailNudgeType
          reference_key: string
          sent_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          nudge_type?: ClientEmailNudgeType
          reference_key?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_email_nudges_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      client_invoices: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          amount_cents: number
          currency: string
          description: string
          status: ClientInvoiceStatus
          due_date: string | null
          stripe_invoice_id: string | null
          hosted_invoice_url: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          amount_cents: number
          currency?: string
          description: string
          status?: ClientInvoiceStatus
          due_date?: string | null
          stripe_invoice_id?: string | null
          hosted_invoice_url?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          amount_cents?: number
          currency?: string
          description?: string
          status?: ClientInvoiceStatus
          due_date?: string | null
          stripe_invoice_id?: string | null
          hosted_invoice_url?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_invoices_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          coach_id: string
          user_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          status: ClientStatus
          invite_status: ClientInviteStatus
          invite_token: string | null
          invite_expires_at: string | null
          goal: string | null
          notes: string | null
          avatar_url: string | null
          coaching_type: ClientCoachingType | null
          is_coach_self: boolean
          gym_id: string | null
          leaderboard_opt_out: boolean
          biological_sex: BiologicalSex | null
          invite_accepted_at: string | null
          onboarding_automation_at: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          user_id?: string | null
          full_name: string
          email?: string | null
          phone?: string | null
          status?: ClientStatus
          invite_status?: ClientInviteStatus
          invite_token?: string | null
          invite_expires_at?: string | null
          goal?: string | null
          notes?: string | null
          avatar_url?: string | null
          coaching_type?: ClientCoachingType | null
          is_coach_self?: boolean
          gym_id?: string | null
          leaderboard_opt_out?: boolean
          biological_sex?: BiologicalSex | null
          invite_accepted_at?: string | null
          onboarding_automation_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          user_id?: string | null
          full_name?: string
          email?: string | null
          phone?: string | null
          status?: ClientStatus
          invite_status?: ClientInviteStatus
          invite_token?: string | null
          invite_expires_at?: string | null
          goal?: string | null
          notes?: string | null
          avatar_url?: string | null
          coaching_type?: ClientCoachingType | null
          is_coach_self?: boolean
          gym_id?: string | null
          leaderboard_opt_out?: boolean
          biological_sex?: BiologicalSex | null
          invite_accepted_at?: string | null
          onboarding_automation_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clients_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: false
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          },
        ]
      }
      gyms: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'gyms_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      gym_subscriptions: {
        Row: {
          id: string
          gym_id: string
          plan: SubscriptionPlan
          status: SubscriptionStatus
          included_coach_seats: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          plan?: SubscriptionPlan
          status?: SubscriptionStatus
          included_coach_seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          plan?: SubscriptionPlan
          status?: SubscriptionStatus
          included_coach_seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'gym_subscriptions_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: true
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          },
        ]
      }
      gym_members: {
        Row: {
          id: string
          gym_id: string
          coach_id: string
          role: GymMemberRole
          status: GymMemberStatus
          joined_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          coach_id: string
          role?: GymMemberRole
          status?: GymMemberStatus
          joined_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          coach_id?: string
          role?: GymMemberRole
          status?: GymMemberStatus
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'gym_members_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: false
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gym_members_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      gym_invites: {
        Row: {
          id: string
          gym_id: string
          email: string
          invite_token: string
          invited_by: string
          status: GymInviteStatus
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          gym_id: string
          email: string
          invite_token?: string
          invited_by: string
          status?: GymInviteStatus
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          gym_id?: string
          email?: string
          invite_token?: string
          invited_by?: string
          status?: GymInviteStatus
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'gym_invites_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: false
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gym_invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      programs: {
        Row: {
          id: string
          coach_id: string
          name: string
          description: string | null
          status: ProgramStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          description?: string | null
          status?: ProgramStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          description?: string | null
          status?: ProgramStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'programs_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          id: string
          coach_id: string
          name: string
          description: string | null
          active_program_id: string | null
          program_start_date: string | null
          next_competition_name: string | null
          next_competition_date: string | null
          gym_id: string | null
          squat_exercise_id: string | null
          bench_exercise_id: string | null
          deadlift_exercise_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          description?: string | null
          active_program_id?: string | null
          program_start_date?: string | null
          next_competition_name?: string | null
          next_competition_date?: string | null
          gym_id?: string | null
          squat_exercise_id?: string | null
          bench_exercise_id?: string | null
          deadlift_exercise_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          description?: string | null
          active_program_id?: string | null
          program_start_date?: string | null
          next_competition_name?: string | null
          next_competition_date?: string | null
          gym_id?: string | null
          squat_exercise_id?: string | null
          bench_exercise_id?: string | null
          deadlift_exercise_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teams_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teams_active_program_id_fkey'
            columns: ['active_program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teams_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: false
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          client_id: string
          weight_class: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          client_id: string
          weight_class?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          client_id?: string
          weight_class?: string | null
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      team_announcements: {
        Row: {
          id: string
          team_id: string
          coach_id: string
          content: string
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          coach_id: string
          content: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          coach_id?: string
          content?: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_announcements_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      team_forum_posts: {
        Row: {
          id: string
          team_id: string
          author_id: string
          author_role: MessageSenderRole
          body: string
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          author_id: string
          author_role: MessageSenderRole
          body: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          author_id?: string
          author_role?: MessageSenderRole
          body?: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_forum_posts_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      team_forum_replies: {
        Row: {
          id: string
          post_id: string
          author_id: string
          author_role: MessageSenderRole
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          author_role: MessageSenderRole
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          author_role?: MessageSenderRole
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_forum_replies_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'team_forum_posts'
            referencedColumns: ['id']
          },
        ]
      }
      team_challenges: {
        Row: {
          id: string
          team_id: string
          coach_id: string
          name: string
          description: string | null
          metric: string
          exercise_id: string | null
          formula: string | null
          weight_class_filter: string | null
          start_date: string
          end_date: string
          status: TeamChallengeStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          coach_id: string
          name: string
          description?: string | null
          metric: string
          exercise_id?: string | null
          formula?: string | null
          weight_class_filter?: string | null
          start_date: string
          end_date: string
          status?: TeamChallengeStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          coach_id?: string
          name?: string
          description?: string | null
          metric?: string
          exercise_id?: string | null
          formula?: string | null
          weight_class_filter?: string | null
          start_date?: string
          end_date?: string
          status?: TeamChallengeStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_challenges_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      team_events: {
        Row: {
          id: string
          team_id: string
          coach_id: string
          title: string
          event_type: TeamEventType
          event_date: string
          start_time: string | null
          location: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          coach_id: string
          title: string
          event_type?: TeamEventType
          event_date: string
          start_time?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          coach_id?: string
          title?: string
          event_type?: TeamEventType
          event_date?: string
          start_time?: string | null
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_events_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      team_event_member_status: {
        Row: {
          id: string
          event_id: string
          client_id: string
          rsvp_status: TeamEventRsvpStatus
          attendance_status: TeamEventAttendanceStatus | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          client_id: string
          rsvp_status?: TeamEventRsvpStatus
          attendance_status?: TeamEventAttendanceStatus | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          client_id?: string
          rsvp_status?: TeamEventRsvpStatus
          attendance_status?: TeamEventAttendanceStatus | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_event_member_status_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'team_events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_event_member_status_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      program_assignments: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          program_id: string
          team_id: string | null
          status: ProgramAssignmentStatus
          start_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          program_id: string
          team_id?: string | null
          status?: ProgramAssignmentStatus
          start_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          program_id?: string
          team_id?: string | null
          status?: ProgramAssignmentStatus
          start_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'program_assignments_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_assignments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_assignments_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_assignments_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      program_phases: {
        Row: {
          id: string
          coach_id: string
          program_id: string
          name: string
          description: string | null
          start_day_offset: number
          end_day_offset: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          program_id: string
          name: string
          description?: string | null
          start_day_offset: number
          end_day_offset: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          program_id?: string
          name?: string
          description?: string | null
          start_day_offset?: number
          end_day_offset?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'program_phases_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_phases_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
        ]
      }
      progressive_overload_decisions: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          exercise_id: string
          source_workout_id: string
          source_scheduled_exercise_id: string
          source_session_date: string
          previous_weight: number
          suggested_weight: number
          status: 'approved' | 'dismissed'
          upcoming_updated_count: number
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          exercise_id: string
          source_workout_id: string
          source_scheduled_exercise_id: string
          source_session_date: string
          previous_weight: number
          suggested_weight: number
          status: 'approved' | 'dismissed'
          upcoming_updated_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          exercise_id?: string
          source_workout_id?: string
          source_scheduled_exercise_id?: string
          source_session_date?: string
          previous_weight?: number
          suggested_weight?: number
          status?: 'approved' | 'dismissed'
          upcoming_updated_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'progressive_overload_decisions_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progressive_overload_decisions_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progressive_overload_decisions_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progressive_overload_decisions_source_workout_id_fkey'
            columns: ['source_workout_id']
            isOneToOne: false
            referencedRelation: 'client_scheduled_workouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progressive_overload_decisions_source_scheduled_exercise_id_fkey'
            columns: ['source_scheduled_exercise_id']
            isOneToOne: false
            referencedRelation: 'scheduled_workout_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      program_scheduled_workouts: {
        Row: {
          id: string
          coach_id: string
          program_id: string
          day_offset: number
          name: string
          notes: string | null
          library_workout_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          program_id: string
          day_offset: number
          name: string
          notes?: string | null
          library_workout_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          program_id?: string
          day_offset?: number
          name?: string
          notes?: string | null
          library_workout_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'program_scheduled_workouts_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_scheduled_workouts_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_scheduled_workouts_library_workout_id_fkey'
            columns: ['library_workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      program_scheduled_workout_exercises: {
        Row: {
          id: string
          program_scheduled_workout_id: string
          exercise_id: string
          sort_order: number
          sets: string | null
          reps: string | null
          prescription: string | null
          superset_group: string | null
          exercise_block: ScheduledExerciseBlock | null
          workout_notes: string | null
          rep_mode: ScheduledExerciseRepMode
          each_side: boolean
          tempo: string | null
          rest_seconds: string | null
          weight_percent: string | null
          target_weight: string | null
          rpe_target: string | null
          tracking_options: ScheduledExerciseTrackingOptions
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_scheduled_workout_id: string
          exercise_id: string
          sort_order?: number
          sets?: string | null
          reps?: string | null
          prescription?: string | null
          superset_group?: string | null
          exercise_block?: ScheduledExerciseBlock | null
          workout_notes?: string | null
          rep_mode?: ScheduledExerciseRepMode
          each_side?: boolean
          tempo?: string | null
          rest_seconds?: string | null
          weight_percent?: string | null
          target_weight?: string | null
          rpe_target?: string | null
          tracking_options?: ScheduledExerciseTrackingOptions
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_scheduled_workout_id?: string
          exercise_id?: string
          sort_order?: number
          sets?: string | null
          reps?: string | null
          prescription?: string | null
          superset_group?: string | null
          exercise_block?: ScheduledExerciseBlock | null
          workout_notes?: string | null
          rep_mode?: ScheduledExerciseRepMode
          each_side?: boolean
          tempo?: string | null
          rest_seconds?: string | null
          weight_percent?: string | null
          target_weight?: string | null
          rpe_target?: string | null
          tracking_options?: ScheduledExerciseTrackingOptions
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'program_scheduled_workout_exercises_program_scheduled_workout_id_fkey'
            columns: ['program_scheduled_workout_id']
            isOneToOne: false
            referencedRelation: 'program_scheduled_workouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'program_scheduled_workout_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      exercises: {
        Row: {
          id: string
          coach_id: string
          name: string
          instructions: string | null
          muscle_group: string | null
          equipment: string | null
          status: ExerciseStatus
          source: ExerciseSource
          external_id: string | null
          image_url: string | null
          demo_video_path: string | null
          difficulty: string | null
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          instructions?: string | null
          muscle_group?: string | null
          equipment?: string | null
          status?: ExerciseStatus
          source?: ExerciseSource
          external_id?: string | null
          image_url?: string | null
          demo_video_path?: string | null
          difficulty?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          instructions?: string | null
          muscle_group?: string | null
          equipment?: string | null
          status?: ExerciseStatus
          source?: ExerciseSource
          external_id?: string | null
          image_url?: string | null
          demo_video_path?: string | null
          difficulty?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exercises_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      workouts: {
        Row: {
          id: string
          coach_id: string
          name: string
          description: string | null
          status: WorkoutStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          description?: string | null
          status?: WorkoutStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          description?: string | null
          status?: WorkoutStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workouts_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_session_packs: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          label: string
          total_sessions: number
          sessions_used: number
          expires_at: string | null
          notes: string | null
          price_cents: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          label: string
          total_sessions: number
          sessions_used?: number
          expires_at?: string | null
          notes?: string | null
          price_cents?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          label?: string
          total_sessions?: number
          sessions_used?: number
          expires_at?: string | null
          notes?: string | null
          price_cents?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_scheduled_workouts: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          scheduled_date: string
          name: string
          notes: string | null
          library_workout_id: string | null
          status: ScheduledWorkoutStatus
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          scheduled_date: string
          name: string
          notes?: string | null
          library_workout_id?: string | null
          status?: ScheduledWorkoutStatus
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          scheduled_date?: string
          name?: string
          notes?: string | null
          library_workout_id?: string | null
          status?: ScheduledWorkoutStatus
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_scheduled_workouts_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_scheduled_workouts_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_scheduled_workouts_library_workout_id_fkey'
            columns: ['library_workout_id']
            isOneToOne: false
            referencedRelation: 'workouts'
            referencedColumns: ['id']
          },
        ]
      }
      scheduled_workout_exercises: {
        Row: {
          id: string
          scheduled_workout_id: string
          exercise_id: string
          sort_order: number
          sets: string | null
          reps: string | null
          prescription: string | null
          superset_group: string | null
          exercise_block: ScheduledExerciseBlock | null
          workout_notes: string | null
          client_notes: string | null
          rep_mode: ScheduledExerciseRepMode
          each_side: boolean
          tempo: string | null
          rest_seconds: string | null
          weight_percent: string | null
          target_weight: string | null
          rpe_target: string | null
          tracking_options: ScheduledExerciseTrackingOptions
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scheduled_workout_id: string
          exercise_id: string
          sort_order?: number
          sets?: string | null
          reps?: string | null
          prescription?: string | null
          superset_group?: string | null
          exercise_block?: ScheduledExerciseBlock | null
          workout_notes?: string | null
          client_notes?: string | null
          rep_mode?: ScheduledExerciseRepMode
          each_side?: boolean
          tempo?: string | null
          rest_seconds?: string | null
          weight_percent?: string | null
          target_weight?: string | null
          rpe_target?: string | null
          tracking_options?: ScheduledExerciseTrackingOptions
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scheduled_workout_id?: string
          exercise_id?: string
          sort_order?: number
          sets?: string | null
          reps?: string | null
          prescription?: string | null
          superset_group?: string | null
          exercise_block?: ScheduledExerciseBlock | null
          workout_notes?: string | null
          client_notes?: string | null
          rep_mode?: ScheduledExerciseRepMode
          each_side?: boolean
          tempo?: string | null
          rest_seconds?: string | null
          weight_percent?: string | null
          target_weight?: string | null
          rpe_target?: string | null
          tracking_options?: ScheduledExerciseTrackingOptions
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'scheduled_workout_exercises_scheduled_workout_id_fkey'
            columns: ['scheduled_workout_id']
            isOneToOne: false
            referencedRelation: 'client_scheduled_workouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'scheduled_workout_exercises_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      workout_log_sets: {
        Row: {
          id: string
          scheduled_workout_id: string
          scheduled_exercise_id: string
          set_number: number
          weight: number | null
          reps: number | null
          duration_seconds: number | null
          bar_speed: number | null
          peak_power: number | null
          completed: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scheduled_workout_id: string
          scheduled_exercise_id: string
          set_number: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
          bar_speed?: number | null
          peak_power?: number | null
          completed?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scheduled_workout_id?: string
          scheduled_exercise_id?: string
          set_number?: number
          weight?: number | null
          reps?: number | null
          duration_seconds?: number | null
          bar_speed?: number | null
          peak_power?: number | null
          completed?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workout_log_sets_scheduled_workout_id_fkey'
            columns: ['scheduled_workout_id']
            isOneToOne: false
            referencedRelation: 'client_scheduled_workouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_log_sets_scheduled_exercise_id_fkey'
            columns: ['scheduled_exercise_id']
            isOneToOne: false
            referencedRelation: 'scheduled_workout_exercises'
            referencedColumns: ['id']
          },
        ]
      }
      client_check_ins: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          check_in_date: string
          weight: number | null
          sleep_hours: number | null
          calm_level: number | null
          sleep_quality: number | null
          energy_level: number | null
          motivation_level: number | null
          nutrition_adherence: number | null
          soreness_level: number | null
          soreness_notes: string | null
          has_pain: boolean
          pain_notes: string | null
          client_notes: string | null
          coach_notes: string | null
          submitted_by: CheckInSubmittedBy
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          check_in_date: string
          weight?: number | null
          sleep_hours?: number | null
          calm_level?: number | null
          sleep_quality?: number | null
          energy_level?: number | null
          motivation_level?: number | null
          nutrition_adherence?: number | null
          soreness_level?: number | null
          soreness_notes?: string | null
          has_pain?: boolean
          pain_notes?: string | null
          client_notes?: string | null
          coach_notes?: string | null
          submitted_by: CheckInSubmittedBy
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          check_in_date?: string
          weight?: number | null
          sleep_hours?: number | null
          calm_level?: number | null
          sleep_quality?: number | null
          energy_level?: number | null
          motivation_level?: number | null
          nutrition_adherence?: number | null
          soreness_level?: number | null
          soreness_notes?: string | null
          has_pain?: boolean
          pain_notes?: string | null
          client_notes?: string | null
          coach_notes?: string | null
          submitted_by?: CheckInSubmittedBy
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_check_ins_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_check_ins_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_progress_photos: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          check_in_id: string | null
          photo_date: string
          pose: ProgressPhotoPose
          storage_path: string
          caption: string | null
          uploaded_by: CheckInSubmittedBy
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          check_in_id?: string | null
          photo_date: string
          pose: ProgressPhotoPose
          storage_path: string
          caption?: string | null
          uploaded_by: CheckInSubmittedBy
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          check_in_id?: string | null
          photo_date?: string
          pose?: ProgressPhotoPose
          storage_path?: string
          caption?: string | null
          uploaded_by?: CheckInSubmittedBy
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_progress_photos_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_progress_photos_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_progress_photos_check_in_id_fkey'
            columns: ['check_in_id']
            isOneToOne: false
            referencedRelation: 'client_check_ins'
            referencedColumns: ['id']
          },
        ]
      }
      client_form_reviews: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          exercise_id: string | null
          storage_path: string
          content_type: string
          file_size_bytes: number | null
          title: string | null
          client_notes: string | null
          coach_feedback: string | null
          coach_annotations: Json
          uploaded_by: CheckInSubmittedBy
          reviewed_at: string | null
          client_viewed_at: string | null
          scheduled_workout_id: string | null
          scheduled_exercise_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          exercise_id?: string | null
          storage_path: string
          content_type: string
          file_size_bytes?: number | null
          title?: string | null
          client_notes?: string | null
          coach_feedback?: string | null
          coach_annotations?: Json
          uploaded_by: CheckInSubmittedBy
          reviewed_at?: string | null
          client_viewed_at?: string | null
          scheduled_workout_id?: string | null
          scheduled_exercise_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          exercise_id?: string | null
          storage_path?: string
          content_type?: string
          file_size_bytes?: number | null
          title?: string | null
          client_notes?: string | null
          coach_feedback?: string | null
          coach_annotations?: Json
          uploaded_by?: CheckInSubmittedBy
          reviewed_at?: string | null
          client_viewed_at?: string | null
          scheduled_workout_id?: string | null
          scheduled_exercise_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_form_reviews_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_form_reviews_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_form_reviews_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
        ]
      }
      client_wearable_connection_secrets: {
        Row: {
          connection_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          scope: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_wearable_connection_secrets_connection_id_fkey'
            columns: ['connection_id']
            isOneToOne: true
            referencedRelation: 'client_wearable_connections'
            referencedColumns: ['id']
          },
        ]
      }
      client_wearable_connections: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          provider: WearableProvider
          status: WearableConnectionStatus
          external_user_id: string | null
          display_name: string | null
          last_synced_at: string | null
          sync_error: string | null
          metadata: Record<string, unknown>
          connected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          provider: WearableProvider
          status?: WearableConnectionStatus
          external_user_id?: string | null
          display_name?: string | null
          last_synced_at?: string | null
          sync_error?: string | null
          metadata?: Record<string, unknown>
          connected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          provider?: WearableProvider
          status?: WearableConnectionStatus
          external_user_id?: string | null
          display_name?: string | null
          last_synced_at?: string | null
          sync_error?: string | null
          metadata?: Record<string, unknown>
          connected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_wearable_connections_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_wearable_connections_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_wearable_daily_metrics: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          connection_id: string | null
          provider: WearableProvider
          metric_date: string
          steps: number | null
          sleep_hours: number | null
          sleep_score: number | null
          hrv_ms: number | null
          resting_hr_bpm: number | null
          recovery_score: number | null
          strain_score: number | null
          calories_kcal: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          connection_id?: string | null
          provider: WearableProvider
          metric_date: string
          steps?: number | null
          sleep_hours?: number | null
          sleep_score?: number | null
          hrv_ms?: number | null
          resting_hr_bpm?: number | null
          recovery_score?: number | null
          strain_score?: number | null
          calories_kcal?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          connection_id?: string | null
          provider?: WearableProvider
          metric_date?: string
          steps?: number | null
          sleep_hours?: number | null
          sleep_score?: number | null
          hrv_ms?: number | null
          resting_hr_bpm?: number | null
          recovery_score?: number | null
          strain_score?: number | null
          calories_kcal?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_wearable_daily_metrics_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_wearable_daily_metrics_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_wearable_daily_metrics_connection_id_fkey'
            columns: ['connection_id']
            isOneToOne: false
            referencedRelation: 'client_wearable_connections'
            referencedColumns: ['id']
          },
        ]
      }
      client_message_threads: {
        Row: {
          client_id: string
          coach_id: string
          coach_last_read_at: string | null
          client_last_read_at: string | null
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          coach_id: string
          coach_last_read_at?: string | null
          client_last_read_at?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          coach_last_read_at?: string | null
          client_last_read_at?: string | null
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_message_threads_client_id_fkey'
            columns: ['client_id']
            isOneToOne: true
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_message_threads_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_messages: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          sender_id: string
          sender_role: MessageSenderRole
          body: string | null
          message_type: ClientMessageType
          storage_path: string | null
          content_type: string | null
          media_duration_seconds: number | null
          broadcast_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          sender_id: string
          sender_role: MessageSenderRole
          body?: string | null
          message_type?: ClientMessageType
          storage_path?: string | null
          content_type?: string | null
          media_duration_seconds?: number | null
          broadcast_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          sender_id?: string
          sender_role?: MessageSenderRole
          body?: string | null
          message_type?: ClientMessageType
          storage_path?: string | null
          content_type?: string | null
          media_duration_seconds?: number | null
          broadcast_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_messages_broadcast_id_fkey'
            columns: ['broadcast_id']
            isOneToOne: false
            referencedRelation: 'coach_broadcasts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_messages_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_messages_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      coach_broadcasts: {
        Row: {
          id: string
          coach_id: string
          sender_id: string
          message_type: ClientMessageType
          body: string | null
          storage_path: string | null
          content_type: string | null
          media_duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          sender_id: string
          message_type?: ClientMessageType
          body?: string | null
          storage_path?: string | null
          content_type?: string | null
          media_duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          sender_id?: string
          message_type?: ClientMessageType
          body?: string | null
          storage_path?: string | null
          content_type?: string | null
          media_duration_seconds?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'coach_broadcasts_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      coach_message_templates: {
        Row: {
          id: string
          coach_id: string
          name: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          name: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          name?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'coach_message_templates_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      meal_plan_assignments: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          meal_plan_id: string
          status: MealPlanAssignmentStatus
          start_date: string
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          meal_plan_id: string
          status?: MealPlanAssignmentStatus
          start_date: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          meal_plan_id?: string
          status?: MealPlanAssignmentStatus
          start_date?: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plan_assignments_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_plan_assignments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_plan_assignments_meal_plan_id_fkey'
            columns: ['meal_plan_id']
            isOneToOne: false
            referencedRelation: 'meal_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_plan_assignments_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      meal_plan_days: {
        Row: {
          id: string
          meal_plan_id: string
          day_offset: number
          label: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meal_plan_id: string
          day_offset: number
          label?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meal_plan_id?: string
          day_offset?: number
          label?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plan_days_meal_plan_id_fkey'
            columns: ['meal_plan_id']
            isOneToOne: false
            referencedRelation: 'meal_plans'
            referencedColumns: ['id']
          },
        ]
      }
      meal_plan_meals: {
        Row: {
          id: string
          meal_plan_day_id: string
          sort_order: number
          meal_type: MealType
          name: string
          description: string | null
          calories_kcal: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meal_plan_day_id: string
          sort_order?: number
          meal_type?: MealType
          name: string
          description?: string | null
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meal_plan_day_id?: string
          sort_order?: number
          meal_type?: MealType
          name?: string
          description?: string | null
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plan_meals_meal_plan_day_id_fkey'
            columns: ['meal_plan_day_id']
            isOneToOne: false
            referencedRelation: 'meal_plan_days'
            referencedColumns: ['id']
          },
        ]
      }
      meal_plan_meal_foods: {
        Row: {
          id: string
          meal_plan_meal_id: string
          sort_order: number
          food_name: string
          source: FoodSource
          external_id: string | null
          quantity_g: number
          calories_kcal: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meal_plan_meal_id: string
          sort_order?: number
          food_name: string
          source?: FoodSource
          external_id?: string | null
          quantity_g: number
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meal_plan_meal_id?: string
          sort_order?: number
          food_name?: string
          source?: FoodSource
          external_id?: string | null
          quantity_g?: number
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plan_meal_foods_meal_plan_meal_id_fkey'
            columns: ['meal_plan_meal_id']
            isOneToOne: false
            referencedRelation: 'meal_plan_meals'
            referencedColumns: ['id']
          },
        ]
      }
      meal_plans: {
        Row: {
          id: string
          coach_id: string
          client_id: string | null
          name: string
          description: string | null
          status: MealPlanStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id?: string | null
          name: string
          description?: string | null
          status?: MealPlanStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string | null
          name?: string
          description?: string | null
          status?: MealPlanStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plans_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meal_plans_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      client_inbody_scans: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          scan_date: string
          weight_lbs: number
          skeletal_muscle_mass_lbs: number
          percent_body_fat: number
          total_body_water_lbs: number | null
          dry_lean_mass_lbs: number | null
          body_fat_mass_lbs: number | null
          bmi: number | null
          lean_body_mass_lbs: number | null
          basal_metabolic_rate_kcal: number | null
          skeletal_muscle_index: number | null
          notes: string | null
          submitted_by: CheckInSubmittedBy
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          scan_date: string
          weight_lbs: number
          skeletal_muscle_mass_lbs: number
          percent_body_fat: number
          total_body_water_lbs?: number | null
          dry_lean_mass_lbs?: number | null
          body_fat_mass_lbs?: number | null
          bmi?: number | null
          lean_body_mass_lbs?: number | null
          basal_metabolic_rate_kcal?: number | null
          skeletal_muscle_index?: number | null
          notes?: string | null
          submitted_by: CheckInSubmittedBy
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          scan_date?: string
          weight_lbs?: number
          skeletal_muscle_mass_lbs?: number
          percent_body_fat?: number
          total_body_water_lbs?: number | null
          dry_lean_mass_lbs?: number | null
          body_fat_mass_lbs?: number | null
          bmi?: number | null
          lean_body_mass_lbs?: number | null
          basal_metabolic_rate_kcal?: number | null
          skeletal_muscle_index?: number | null
          notes?: string | null
          submitted_by?: CheckInSubmittedBy
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_inbody_scans_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_inbody_scans_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_nutrition_logs: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          log_date: string
          adherence_score: number
          client_notes: string | null
          fiber_g: number | null
          water_ml: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          log_date: string
          adherence_score: number
          client_notes?: string | null
          fiber_g?: number | null
          water_ml?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          log_date?: string
          adherence_score?: number
          client_notes?: string | null
          fiber_g?: number | null
          water_ml?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_nutrition_logs_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_nutrition_logs_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_food_diary_entries: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          log_date: string
          meal_type: MealType
          food_name: string
          calories_kcal: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          fiber_g: number | null
          sort_order: number
          source: FoodSource | null
          external_id: string | null
          quantity_g: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          log_date: string
          meal_type?: MealType
          food_name: string
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          sort_order?: number
          source?: FoodSource | null
          external_id?: string | null
          quantity_g?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          log_date?: string
          meal_type?: MealType
          food_name?: string
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          sort_order?: number
          source?: FoodSource | null
          external_id?: string | null
          quantity_g?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_food_diary_entries_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_food_diary_entries_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_nutrition_profiles: {
        Row: {
          client_id: string
          coach_id: string
          calories_kcal: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          fiber_g: number | null
          water_ml: number | null
          notes: string | null
          dietary_restrictions: string | null
          supplements: NutritionSupplement[]
          client_nutrition_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          coach_id: string
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          water_ml?: number | null
          notes?: string | null
          dietary_restrictions?: string | null
          supplements?: NutritionSupplement[]
          client_nutrition_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          calories_kcal?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          water_ml?: number | null
          notes?: string | null
          dietary_restrictions?: string | null
          supplements?: NutritionSupplement[]
          client_nutrition_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_nutrition_profiles_client_id_fkey'
            columns: ['client_id']
            isOneToOne: true
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_nutrition_profiles_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      client_goals: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          category: ClientGoalCategory
          metric: CompositionGoalMetric | null
          direction: ClientGoalDirection | null
          target_amount: number | null
          title: string | null
          target_value: number | null
          comparison: ClientGoalComparison | null
          unit: string | null
          sort_order: number
          target_date: string | null
          exercise_id: string | null
          performance_metric: ClientGoalPerformanceMetric | null
          habit_source: ClientGoalHabitSource | null
          habit_frequency: number | null
          habit_period: ClientGoalHabitPeriod | null
          milestone_type: ClientGoalMilestoneType | null
          milestone_target_count: number | null
          program_id: string | null
          progress_source: ClientGoalProgressSource | null
          metadata: ClientGoalMetadata | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          category: ClientGoalCategory
          metric?: CompositionGoalMetric | null
          direction?: ClientGoalDirection | null
          target_amount?: number | null
          title?: string | null
          target_value?: number | null
          comparison?: ClientGoalComparison | null
          unit?: string | null
          sort_order?: number
          target_date?: string | null
          exercise_id?: string | null
          performance_metric?: ClientGoalPerformanceMetric | null
          habit_source?: ClientGoalHabitSource | null
          habit_frequency?: number | null
          habit_period?: ClientGoalHabitPeriod | null
          milestone_type?: ClientGoalMilestoneType | null
          milestone_target_count?: number | null
          program_id?: string | null
          progress_source?: ClientGoalProgressSource | null
          metadata?: ClientGoalMetadata | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          category?: ClientGoalCategory
          metric?: CompositionGoalMetric | null
          direction?: ClientGoalDirection | null
          target_amount?: number | null
          title?: string | null
          target_value?: number | null
          comparison?: ClientGoalComparison | null
          unit?: string | null
          sort_order?: number
          target_date?: string | null
          exercise_id?: string | null
          performance_metric?: ClientGoalPerformanceMetric | null
          habit_source?: ClientGoalHabitSource | null
          habit_frequency?: number | null
          habit_period?: ClientGoalHabitPeriod | null
          milestone_type?: ClientGoalMilestoneType | null
          milestone_target_count?: number | null
          program_id?: string | null
          progress_source?: ClientGoalProgressSource | null
          metadata?: ClientGoalMetadata | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_goals_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_goals_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_goals_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_goals_program_id_fkey'
            columns: ['program_id']
            isOneToOne: false
            referencedRelation: 'programs'
            referencedColumns: ['id']
          },
        ]
      }
      coach_availability_exceptions: {
        Row: {
          id: string
          coach_id: string
          exception_date: string
          exception_type: CoachAvailabilityExceptionType
          start_time: string | null
          end_time: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          exception_date: string
          exception_type: CoachAvailabilityExceptionType
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          exception_date?: string
          exception_type?: CoachAvailabilityExceptionType
          start_time?: string | null
          end_time?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_availability_rules: {
        Row: {
          id: string
          coach_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_appointment_reminders: {
        Row: {
          appointment_id: string
          recipient: 'client' | 'coach'
          sent_at: string
        }
        Insert: {
          appointment_id: string
          recipient: 'client' | 'coach'
          sent_at?: string
        }
        Update: {
          appointment_id?: string
          recipient?: 'client' | 'coach'
          sent_at?: string
        }
        Relationships: []
      }
      coaching_appointments: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          starts_at: string
          ends_at: string
          status: CoachingAppointmentStatus
          location: string | null
          notes: string | null
          pre_session_notes: string | null
          post_session_notes: string | null
          coaching_type: ClientCoachingType | null
          session_pack_id: string | null
          booked_by: CoachingAppointmentBookedBy
          cancelled_at: string | null
          cancellation_reason: string | null
          rescheduled_to_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          starts_at: string
          ends_at: string
          status?: CoachingAppointmentStatus
          location?: string | null
          notes?: string | null
          pre_session_notes?: string | null
          post_session_notes?: string | null
          coaching_type?: ClientCoachingType | null
          session_pack_id?: string | null
          booked_by: CoachingAppointmentBookedBy
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rescheduled_to_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          starts_at?: string
          ends_at?: string
          status?: CoachingAppointmentStatus
          location?: string | null
          notes?: string | null
          pre_session_notes?: string | null
          post_session_notes?: string | null
          coaching_type?: ClientCoachingType | null
          session_pack_id?: string | null
          booked_by?: CoachingAppointmentBookedBy
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rescheduled_to_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_daily_attendance: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          attendance_date: string
          status: TeamEventAttendanceStatus
          notes: string | null
          coaching_type: ClientCoachingType | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          attendance_date: string
          status: TeamEventAttendanceStatus
          notes?: string | null
          coaching_type?: ClientCoachingType | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          attendance_date?: string
          status?: TeamEventAttendanceStatus
          notes?: string | null
          coaching_type?: ClientCoachingType | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_daily_attendance_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_daily_attendance_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      exercise_pr_records: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          exercise_id: string
          record_type: ExercisePrRecordType
          e1rm: number | null
          weight: number | null
          reps: number | null
          session_volume: number | null
          scheduled_workout_id: string
          scheduled_exercise_id: string
          forced: boolean
          achieved_at: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          exercise_id: string
          record_type: ExercisePrRecordType
          e1rm?: number | null
          weight?: number | null
          reps?: number | null
          session_volume?: number | null
          scheduled_workout_id: string
          scheduled_exercise_id: string
          forced?: boolean
          achieved_at: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          exercise_id?: string
          record_type?: ExercisePrRecordType
          e1rm?: number | null
          weight?: number | null
          reps?: number | null
          session_volume?: number | null
          scheduled_workout_id?: string
          scheduled_exercise_id?: string
          forced?: boolean
          achieved_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exercise_pr_records_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_pr_records_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_pr_records_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_pr_records_scheduled_workout_id_fkey'
            columns: ['scheduled_workout_id']
            isOneToOne: false
            referencedRelation: 'client_scheduled_workouts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'exercise_pr_records_scheduled_exercise_id_fkey'
            columns: ['scheduled_exercise_id']
            isOneToOne: false
            referencedRelation: 'scheduled_workout_exercises'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_invite_preview: {
        Args: { p_token: string }
        Returns: {
          client_name: string
          coach_name: string
          email: string
        }[]
      }
      get_portal_coach_display_name: {
        Args: Record<string, never>
        Returns: string
      }
      get_gym_invite_preview: {
        Args: { p_token: string }
        Returns: {
          gym_name: string
          inviter_name: string
          email: string
        }[]
      }
      link_client_invite: {
        Args: { p_token: string; p_user_id: string; p_email: string }
        Returns: string
      }
      link_gym_invite: {
        Args: { p_token: string; p_user_id: string; p_email: string }
        Returns: string
      }
      coach_create_client: {
        Args: {
          p_full_name: string
          p_email?: string | null
          p_phone?: string | null
          p_status?: ClientStatus
          p_coaching_type?: ClientCoachingType | null
          p_gym_id?: string | null
          p_goal?: string | null
          p_notes?: string | null
        }
        Returns: string
      }
      count_coach_unread_messages: {
        Args: { p_coach_id: string }
        Returns: number
      }
      get_coach_unread_by_client: {
        Args: { p_coach_id: string }
        Returns: {
          client_id: string
          unread_count: number
        }[]
      }
      get_coach_latest_messages: {
        Args: { p_coach_id: string }
        Returns: {
          client_id: string
          body: string | null
          sender_role: MessageSenderRole
          created_at: string
          message_type: ClientMessageType
        }[]
      }
      get_client_unread_from_coach: {
        Args: { p_client_ids: string[] }
        Returns: {
          client_id: string
          unread_count: number
        }[]
      }
      get_client_latest_coach_messages: {
        Args: { p_client_ids: string[] }
        Returns: {
          client_id: string
          body: string | null
          created_at: string
          message_type: ClientMessageType
        }[]
      }
    }
    Enums: {
      client_coaching_type: ClientCoachingType
      client_status: ClientStatus
      user_role: UserRole
      client_invite_status: ClientInviteStatus
      program_status: ProgramStatus
      program_assignment_status: ProgramAssignmentStatus
      meal_plan_status: MealPlanStatus
      meal_plan_assignment_status: MealPlanAssignmentStatus
      meal_type: MealType
      food_source: FoodSource
      team_event_type: TeamEventType
      team_event_rsvp_status: TeamEventRsvpStatus
      team_event_attendance_status: TeamEventAttendanceStatus
      team_challenge_status: TeamChallengeStatus
      exercise_status: ExerciseStatus
      exercise_source: ExerciseSource
      workout_status: WorkoutStatus
      scheduled_workout_status: ScheduledWorkoutStatus
      check_in_submitted_by: CheckInSubmittedBy
      message_sender_role: MessageSenderRole
      client_message_type: ClientMessageType
      exercise_pr_record_type: ExercisePrRecordType
      gym_member_role: GymMemberRole
      gym_member_status: GymMemberStatus
      gym_invite_status: GymInviteStatus
      subscription_plan: SubscriptionPlan
      subscription_status: SubscriptionStatus
      client_invoice_status: ClientInvoiceStatus
      client_subscription_status: ClientSubscriptionStatus
      client_billing_interval: ClientBillingInterval
      weight_unit: WeightUnit
      week_starts_on: WeekStartsOn
      check_in_frequency: CheckInFrequency
      wearable_provider: WearableProvider
      wearable_connection_status: WearableConnectionStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
export type Program = Database['public']['Tables']['programs']['Row']
export type ProgramInsert = Database['public']['Tables']['programs']['Insert']
export type ProgramUpdate = Database['public']['Tables']['programs']['Update']
export type ProgramAssignment =
  Database['public']['Tables']['program_assignments']['Row']
export type ProgramAssignmentInsert =
  Database['public']['Tables']['program_assignments']['Insert']
export type ProgramAssignmentUpdate =
  Database['public']['Tables']['program_assignments']['Update']

export type MealPlan = Database['public']['Tables']['meal_plans']['Row']
export type MealPlanInsert = Database['public']['Tables']['meal_plans']['Insert']
export type MealPlanUpdate = Database['public']['Tables']['meal_plans']['Update']
export type MealPlanDay = Database['public']['Tables']['meal_plan_days']['Row']
export type MealPlanDayInsert =
  Database['public']['Tables']['meal_plan_days']['Insert']
export type MealPlanDayUpdate =
  Database['public']['Tables']['meal_plan_days']['Update']
export type MealPlanMeal = Database['public']['Tables']['meal_plan_meals']['Row']
export type MealPlanMealInsert =
  Database['public']['Tables']['meal_plan_meals']['Insert']
export type MealPlanMealUpdate =
  Database['public']['Tables']['meal_plan_meals']['Update']
export type MealPlanMealFood =
  Database['public']['Tables']['meal_plan_meal_foods']['Row']
export type MealPlanMealFoodInsert =
  Database['public']['Tables']['meal_plan_meal_foods']['Insert']
export type MealPlanMealFoodUpdate =
  Database['public']['Tables']['meal_plan_meal_foods']['Update']

export type MealPlanMealWithFoods = MealPlanMeal & {
  foods: MealPlanMealFood[]
}

export type MealPlanAssignment =
  Database['public']['Tables']['meal_plan_assignments']['Row']
export type MealPlanAssignmentInsert =
  Database['public']['Tables']['meal_plan_assignments']['Insert']
export type MealPlanAssignmentUpdate =
  Database['public']['Tables']['meal_plan_assignments']['Update']

export type MealPlanWithAssignmentCount = MealPlan & {
  assignment_count: number
  day_count: number
}

export type MealPlanDayWithMeals = MealPlanDay & {
  meals: MealPlanMealWithFoods[]
}

export type MealPlanAssignmentWithPlan = MealPlanAssignment & {
  meal_plan: Pick<MealPlan, 'id' | 'name' | 'description'> | null
}

export type ClientNutritionProfile =
  Database['public']['Tables']['client_nutrition_profiles']['Row']
export type ClientNutritionProfileInsert =
  Database['public']['Tables']['client_nutrition_profiles']['Insert']
export type ClientNutritionProfileUpdate =
  Database['public']['Tables']['client_nutrition_profiles']['Update']

export type ClientNutritionLog =
  Database['public']['Tables']['client_nutrition_logs']['Row']
export type ClientNutritionLogInsert =
  Database['public']['Tables']['client_nutrition_logs']['Insert']
export type ClientNutritionLogUpdate =
  Database['public']['Tables']['client_nutrition_logs']['Update']

export type ClientFoodDiaryEntry =
  Database['public']['Tables']['client_food_diary_entries']['Row']
export type ClientFoodDiaryEntryInsert =
  Database['public']['Tables']['client_food_diary_entries']['Insert']
export type ClientFoodDiaryEntryUpdate =
  Database['public']['Tables']['client_food_diary_entries']['Update']

export type ProgramWithAssignmentCount = Program & {
  assignment_count: number
}

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

export type Gym = Database['public']['Tables']['gyms']['Row']
export type GymInsert = Database['public']['Tables']['gyms']['Insert']
export type GymUpdate = Database['public']['Tables']['gyms']['Update']
export type GymMember = Database['public']['Tables']['gym_members']['Row']
export type GymMemberInsert = Database['public']['Tables']['gym_members']['Insert']
export type GymSubscription =
  Database['public']['Tables']['gym_subscriptions']['Row']
export type GymSubscriptionInsert =
  Database['public']['Tables']['gym_subscriptions']['Insert']
export type ClientInvoice = Database['public']['Tables']['client_invoices']['Row']
export type ClientInvoiceInsert =
  Database['public']['Tables']['client_invoices']['Insert']
export type ClientInvoiceUpdate =
  Database['public']['Tables']['client_invoices']['Update']
export type ClientBillingSubscription =
  Database['public']['Tables']['client_billing_subscriptions']['Row']
export type ClientBillingSubscriptionInsert =
  Database['public']['Tables']['client_billing_subscriptions']['Insert']
export type ClientBillingSubscriptionUpdate =
  Database['public']['Tables']['client_billing_subscriptions']['Update']
export type GymInvite = Database['public']['Tables']['gym_invites']['Row']

export type GymMemberWithProfile = GymMember & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'business_name'> | null
}

export type GymWithMembership = Gym & {
  membership: GymMember
  member_count: number
  pending_invite_count: number
}
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']

export type TeamWithProgram = Team & {
  program: Pick<Program, 'id' | 'name' | 'status'> | null
  member_count: number
}

export type TeamMemberWithClient = TeamMember & {
  client: Pick<Client, 'id' | 'full_name' | 'status' | 'avatar_url' | 'email'>
}

export type TeamAnnouncement =
  Database['public']['Tables']['team_announcements']['Row']
export type TeamChallenge = Database['public']['Tables']['team_challenges']['Row']
export type TeamChallengeInsert =
  Database['public']['Tables']['team_challenges']['Insert']
export type TeamChallengeUpdate =
  Database['public']['Tables']['team_challenges']['Update']
export type TeamEvent = Database['public']['Tables']['team_events']['Row']
export type TeamEventMemberStatus =
  Database['public']['Tables']['team_event_member_status']['Row']

export type TeamEventWithMemberStatus = TeamEvent & {
  memberStatuses: (TeamEventMemberStatus & {
    client: Pick<Client, 'id' | 'full_name' | 'avatar_url'>
  })[]
}

export type TeamEventWithTeamContext = TeamEventWithMemberStatus & {
  team: Pick<Team, 'id' | 'name'>
}

export type ClientDailyAttendance =
  Database['public']['Tables']['client_daily_attendance']['Row']
export type ClientDailyAttendanceInsert =
  Database['public']['Tables']['client_daily_attendance']['Insert']
export type ClientDailyAttendanceUpdate =
  Database['public']['Tables']['client_daily_attendance']['Update']

export type TeamMemberPerformance = {
  clientId: string
  clientName: string
  completionRate: number | null
  acwrLabel: string
  lastActiveLabel: string
  onTrack: boolean
}

export type TeamActivityItem = {
  id: string
  type: 'workout' | 'check_in' | 'pr'
  clientId: string
  clientName: string
  label: string
  timestamp: string
}

export type TeamProgramProgress = {
  currentWeek: number
  totalWeeks: number
  workoutsThisWeek: number
  workoutsRemainingThisWeek: number
  currentPhase: Pick<ProgramPhase, 'id' | 'name'> | null
}

export type TeamProgramHistoryEntry = {
  programId: string
  programName: string
  startDate: string | null
  status: 'active' | 'completed' | 'cancelled'
  endedAt: string | null
}

export type TeamPerformanceSummary = {
  avgCompletionRate: number | null
  onTrackCount: number
  behindCount: number
  avgAcwrLabel: string
  members: TeamMemberPerformance[]
}

export type ClientTeamMembership = {
  team: Pick<Team, 'id' | 'name'>
}

export type ClientProgramAssignment = ProgramAssignment & {
  program: Pick<Program, 'id' | 'name' | 'description' | 'status'>
  team?: Pick<Team, 'id' | 'name'> | null
}

export type ProgramPhase = Database['public']['Tables']['program_phases']['Row']
export type ProgramPhaseInsert =
  Database['public']['Tables']['program_phases']['Insert']
export type ProgramPhaseUpdate =
  Database['public']['Tables']['program_phases']['Update']
export type ProgressiveOverloadDecision =
  Database['public']['Tables']['progressive_overload_decisions']['Row']
export type ProgressiveOverloadDecisionInsert =
  Database['public']['Tables']['progressive_overload_decisions']['Insert']
export type ProgressiveOverloadDecisionUpdate =
  Database['public']['Tables']['progressive_overload_decisions']['Update']

export type ProgramScheduledWorkout =
  Database['public']['Tables']['program_scheduled_workouts']['Row']
export type ProgramScheduledWorkoutInsert =
  Database['public']['Tables']['program_scheduled_workouts']['Insert']
export type ProgramScheduledWorkoutUpdate =
  Database['public']['Tables']['program_scheduled_workouts']['Update']

export type ProgramDaySummary = Pick<
  ProgramScheduledWorkout,
  'id' | 'day_offset' | 'name' | 'notes' | 'library_workout_id'
>

export type ProgramScheduledWorkoutExercise =
  Database['public']['Tables']['program_scheduled_workout_exercises']['Row']

export type ProgramScheduledWorkoutWithExercises = ProgramScheduledWorkout & {
  exercises: ScheduledWorkoutExerciseWithDetails[]
}

export type Exercise = Database['public']['Tables']['exercises']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutInsert = Database['public']['Tables']['workouts']['Insert']
export type WorkoutUpdate = Database['public']['Tables']['workouts']['Update']

export type ClientScheduledWorkout =
  Database['public']['Tables']['client_scheduled_workouts']['Row']
export type ClientScheduledWorkoutInsert =
  Database['public']['Tables']['client_scheduled_workouts']['Insert']
export type ClientScheduledWorkoutUpdate =
  Database['public']['Tables']['client_scheduled_workouts']['Update']

export type ScheduledWorkoutExercise =
  Database['public']['Tables']['scheduled_workout_exercises']['Row']
export type ScheduledWorkoutExerciseInsert =
  Database['public']['Tables']['scheduled_workout_exercises']['Insert']
export type ScheduledWorkoutExerciseUpdate =
  Database['public']['Tables']['scheduled_workout_exercises']['Update']

export type ScheduledWorkoutExerciseWithDetails = ScheduledWorkoutExercise & {
  exercise: Pick<
    Exercise,
    | 'id'
    | 'name'
    | 'muscle_group'
    | 'equipment'
    | 'external_id'
    | 'image_url'
    | 'demo_video_path'
    | 'instructions'
  >
}

export type ClientScheduledWorkoutWithExercises = ClientScheduledWorkout & {
  exercises: ScheduledWorkoutExerciseWithDetails[]
}

export type CalendarDaySummary = Pick<
  ClientScheduledWorkout,
  'id' | 'scheduled_date' | 'name' | 'status' | 'started_at'
>

export type WorkoutLogSet = Database['public']['Tables']['workout_log_sets']['Row']
export type WorkoutLogSetInsert =
  Database['public']['Tables']['workout_log_sets']['Insert']
export type WorkoutLogSetUpdate =
  Database['public']['Tables']['workout_log_sets']['Update']

export type PreviousSetLog = {
  weight: number | null
  reps: number | null
  durationSeconds?: number | null
}

export type ExercisePreviousSets = Record<number, PreviousSetLog>

export type ExercisePersonalBest = {
  e1rm: number | null
  topSetWeight: number | null
  topSetReps: number | null
}

export type WorkoutLogData = ClientScheduledWorkoutWithExercises & {
  logSets: WorkoutLogSet[]
  previousSetsByExerciseId: Record<string, ExercisePreviousSets>
  previousSessionDateByExerciseId: Record<string, string | null>
  personalBestsByExerciseId: Record<string, ExercisePersonalBest>
}

export type ExerciseHistorySet = {
  setNumber: number
  weight: number | null
  reps: number | null
  durationSeconds: number | null
  e1rm: number | null
}

export type ExerciseHistorySession = {
  workoutId: string
  date: string
  workoutName: string | null
  sets: ExerciseHistorySet[]
  bestE1rm: number | null
}

export type ClientCheckIn =
  Database['public']['Tables']['client_check_ins']['Row']
export type ClientCheckInInsert =
  Database['public']['Tables']['client_check_ins']['Insert']
export type ClientCheckInUpdate =
  Database['public']['Tables']['client_check_ins']['Update']

export type ClientCheckInWithClient = ClientCheckIn & {
  client: Pick<Client, 'id' | 'full_name' | 'avatar_url' | 'email'>
}

export type ClientProgressPhoto =
  Database['public']['Tables']['client_progress_photos']['Row']
export type ClientProgressPhotoInsert =
  Database['public']['Tables']['client_progress_photos']['Insert']
export type ClientProgressPhotoUpdate =
  Database['public']['Tables']['client_progress_photos']['Update']

export type ClientProgressPhotoWithUrl = ClientProgressPhoto & {
  signedUrl: string | null
}

export type ClientProgressPhotoWithClient = ClientProgressPhoto & {
  client: Pick<Client, 'id' | 'full_name' | 'avatar_url' | 'email'> | null
  signedUrl: string | null
}

export type ClientFormReview =
  Database['public']['Tables']['client_form_reviews']['Row']
export type ClientFormReviewInsert =
  Database['public']['Tables']['client_form_reviews']['Insert']
export type ClientFormReviewUpdate =
  Database['public']['Tables']['client_form_reviews']['Update']

export type FormReviewAnnotation = {
  id: string
  timestampSeconds: number
  text: string
}

export type ClientFormReviewWithUrl = ClientFormReview & {
  signedUrl: string | null
}

export type ClientFormReviewWithClient = ClientFormReview & {
  client: Pick<Client, 'id' | 'full_name' | 'avatar_url' | 'email'> | null
  exercise: Pick<Exercise, 'id' | 'name'> | null
  signedUrl: string | null
}

export type ClientWearableConnection =
  Database['public']['Tables']['client_wearable_connections']['Row']
export type ClientWearableConnectionInsert =
  Database['public']['Tables']['client_wearable_connections']['Insert']
export type ClientWearableConnectionUpdate =
  Database['public']['Tables']['client_wearable_connections']['Update']

export type ClientWearableConnectionSecret =
  Database['public']['Tables']['client_wearable_connection_secrets']['Row']
export type ClientWearableConnectionSecretInsert =
  Database['public']['Tables']['client_wearable_connection_secrets']['Insert']

export type ClientWearableDailyMetric =
  Database['public']['Tables']['client_wearable_daily_metrics']['Row']
export type ClientWearableDailyMetricInsert =
  Database['public']['Tables']['client_wearable_daily_metrics']['Insert']
export type ClientWearableDailyMetricUpdate =
  Database['public']['Tables']['client_wearable_daily_metrics']['Update']

export type ClientMessage =
  Database['public']['Tables']['client_messages']['Row']
export type ClientMessageInsert =
  Database['public']['Tables']['client_messages']['Insert']
export type ClientMessageWithUrl = ClientMessage & {
  signedUrl: string | null
}
export type ClientMessageThread =
  Database['public']['Tables']['client_message_threads']['Row']
export type CoachBroadcast =
  Database['public']['Tables']['coach_broadcasts']['Row']
export type CoachBroadcastInsert =
  Database['public']['Tables']['coach_broadcasts']['Insert']
export type TeamForumPost =
  Database['public']['Tables']['team_forum_posts']['Row']
export type TeamForumPostInsert =
  Database['public']['Tables']['team_forum_posts']['Insert']
export type TeamForumReply =
  Database['public']['Tables']['team_forum_replies']['Row']
export type TeamForumReplyInsert =
  Database['public']['Tables']['team_forum_replies']['Insert']
export type TeamForumReplyWithAuthor = TeamForumReply & {
  authorName: string
}

export type TeamForumPostWithReplies = TeamForumPost & {
  replies: TeamForumReplyWithAuthor[]
  authorName: string
}

export type CoachMessageTemplate =
  Database['public']['Tables']['coach_message_templates']['Row']
export type CoachMessageTemplateInsert =
  Database['public']['Tables']['coach_message_templates']['Insert']
export type CoachMessageTemplateUpdate =
  Database['public']['Tables']['coach_message_templates']['Update']

export type ClientInbodyScan =
  Database['public']['Tables']['client_inbody_scans']['Row']
export type ClientInbodyScanInsert =
  Database['public']['Tables']['client_inbody_scans']['Insert']
export type ClientInbodyScanUpdate =
  Database['public']['Tables']['client_inbody_scans']['Update']

export type ClientGoal = Database['public']['Tables']['client_goals']['Row']
export type ClientGoalInsert =
  Database['public']['Tables']['client_goals']['Insert']
export type ClientGoalUpdate =
  Database['public']['Tables']['client_goals']['Update']

export type ExercisePrRecord =
  Database['public']['Tables']['exercise_pr_records']['Row']
export type ExercisePrRecordInsert =
  Database['public']['Tables']['exercise_pr_records']['Insert']
export type ExercisePrRecordUpdate =
  Database['public']['Tables']['exercise_pr_records']['Update']

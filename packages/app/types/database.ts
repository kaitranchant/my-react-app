export type ClientStatus = 'active' | 'paused' | 'archived'
export type ClientCoachingType = 'online' | 'in_person' | 'hybrid'
export type UserRole = 'coach' | 'client'
export type ClientInviteStatus = 'not_invited' | 'pending' | 'accepted'
export type GymMemberRole = 'owner' | 'coach'
export type GymMemberStatus = 'active' | 'pending'
export type GymInviteStatus = 'pending' | 'accepted' | 'revoked'
export type ProgramStatus = 'draft' | 'active' | 'archived'
export type ProgramAssignmentStatus = 'active' | 'completed' | 'cancelled'
export type TeamEventType =
  | 'practice'
  | 'check_in'
  | 'mock_meet'
  | 'competition'
  | 'other'
export type TeamEventRsvpStatus = 'going' | 'maybe' | 'declined' | 'no_response'
export type TeamEventAttendanceStatus = 'present' | 'absent' | 'excused'
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
export type WeekStartsOn = 'sunday' | 'monday'
export type CheckInFrequency = 'daily' | 'weekly' | 'biweekly'
export type CoachTimezone =
  | 'auto'
  | 'america_new_york'
  | 'america_chicago'
  | 'america_denver'
  | 'america_los_angeles'
  | 'europe_london'
export type MessageSenderRole = 'coach' | 'client'
export type ProgressPhotoPose = 'front' | 'side' | 'back'
export type ExercisePrRecordType = 'e1rm' | 'top_set'
export type ScheduledExerciseRepMode = 'reps' | 'time'

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
          notify_check_ins: boolean
          notify_workout_completions: boolean
          notify_missed_sessions: boolean
          notify_invite_accepted: boolean
          notify_weekly_summary: boolean
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
          notify_check_ins?: boolean
          notify_workout_completions?: boolean
          notify_missed_sessions?: boolean
          notify_invite_accepted?: boolean
          notify_weekly_summary?: boolean
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
          notify_check_ins?: boolean
          notify_workout_completions?: boolean
          notify_missed_sessions?: boolean
          notify_invite_accepted?: boolean
          notify_weekly_summary?: boolean
          created_at?: string
          updated_at?: string
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
          rep_mode: ScheduledExerciseRepMode
          each_side: boolean
          tempo: string | null
          rest_seconds: string | null
          weight_percent: string | null
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
          rep_mode?: ScheduledExerciseRepMode
          each_side?: boolean
          tempo?: string | null
          rest_seconds?: string | null
          weight_percent?: string | null
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
          rep_mode?: ScheduledExerciseRepMode
          each_side?: boolean
          tempo?: string | null
          rest_seconds?: string | null
          weight_percent?: string | null
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
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          sender_id: string
          sender_role: MessageSenderRole
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          sender_id?: string
          sender_role?: MessageSenderRole
          body?: string
          created_at?: string
        }
        Relationships: [
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
    }
    Enums: {
      client_coaching_type: ClientCoachingType
      client_status: ClientStatus
      user_role: UserRole
      client_invite_status: ClientInviteStatus
      program_status: ProgramStatus
      program_assignment_status: ProgramAssignmentStatus
      team_event_type: TeamEventType
      team_event_rsvp_status: TeamEventRsvpStatus
      team_event_attendance_status: TeamEventAttendanceStatus
      exercise_status: ExerciseStatus
      exercise_source: ExerciseSource
      workout_status: WorkoutStatus
      scheduled_workout_status: ScheduledWorkoutStatus
      check_in_submitted_by: CheckInSubmittedBy
      message_sender_role: MessageSenderRole
      exercise_pr_record_type: ExercisePrRecordType
      gym_member_role: GymMemberRole
      gym_member_status: GymMemberStatus
      gym_invite_status: GymInviteStatus
      weight_unit: WeightUnit
      week_starts_on: WeekStartsOn
      check_in_frequency: CheckInFrequency
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
export type TeamEvent = Database['public']['Tables']['team_events']['Row']
export type TeamEventMemberStatus =
  Database['public']['Tables']['team_event_member_status']['Row']

export type TeamEventWithMemberStatus = TeamEvent & {
  memberStatuses: (TeamEventMemberStatus & {
    client: Pick<Client, 'id' | 'full_name' | 'avatar_url'>
  })[]
}

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
  weight: number
  reps: number
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

export type ClientMessage =
  Database['public']['Tables']['client_messages']['Row']
export type ClientMessageInsert =
  Database['public']['Tables']['client_messages']['Insert']
export type ClientMessageThread =
  Database['public']['Tables']['client_message_threads']['Row']

export type ClientInbodyScan =
  Database['public']['Tables']['client_inbody_scans']['Row']
export type ClientInbodyScanInsert =
  Database['public']['Tables']['client_inbody_scans']['Insert']
export type ClientInbodyScanUpdate =
  Database['public']['Tables']['client_inbody_scans']['Update']

export type ExercisePrRecord =
  Database['public']['Tables']['exercise_pr_records']['Row']
export type ExercisePrRecordInsert =
  Database['public']['Tables']['exercise_pr_records']['Insert']
export type ExercisePrRecordUpdate =
  Database['public']['Tables']['exercise_pr_records']['Update']

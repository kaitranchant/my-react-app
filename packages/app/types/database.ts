export type ClientStatus = 'active' | 'paused' | 'archived'
export type UserRole = 'coach' | 'client'
export type ClientInviteStatus = 'not_invited' | 'pending' | 'accepted'
export type ProgramStatus = 'draft' | 'active' | 'archived'
export type ProgramAssignmentStatus = 'active' | 'completed' | 'cancelled'
export type ExerciseStatus = 'active' | 'archived'
export type ExerciseSource = 'custom' | 'exercisedb'
export type WorkoutStatus = 'draft' | 'active' | 'archived'
export type ScheduledWorkoutStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'skipped'
export type CheckInSubmittedBy = 'client' | 'coach'
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          business_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          business_name?: string | null
          avatar_url?: string | null
          role?: UserRole
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
      program_assignments: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          program_id: string
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
      link_client_invite: {
        Args: { p_token: string; p_user_id: string; p_email: string }
        Returns: string
      }
    }
    Enums: {
      client_status: ClientStatus
      user_role: UserRole
      client_invite_status: ClientInviteStatus
      program_status: ProgramStatus
      program_assignment_status: ProgramAssignmentStatus
      exercise_status: ExerciseStatus
      exercise_source: ExerciseSource
      workout_status: WorkoutStatus
      scheduled_workout_status: ScheduledWorkoutStatus
      check_in_submitted_by: CheckInSubmittedBy
      exercise_pr_record_type: ExercisePrRecordType
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

export type ClientProgramAssignment = ProgramAssignment & {
  program: Pick<Program, 'id' | 'name' | 'description' | 'status'>
}

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

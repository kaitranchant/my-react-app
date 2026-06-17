export type ClientStatus = 'active' | 'paused' | 'archived'
export type UserRole = 'coach' | 'client'
export type ClientInviteStatus = 'not_invited' | 'pending' | 'accepted'
export type ProgramStatus = 'draft' | 'active' | 'archived'
export type ProgramAssignmentStatus = 'active' | 'completed' | 'cancelled'
export type ExerciseStatus = 'active' | 'archived'
export type ExerciseSource = 'custom' | 'exercisedb'
export type WorkoutStatus = 'draft' | 'active' | 'archived'

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

export type Exercise = Database['public']['Tables']['exercises']['Row']
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type WorkoutInsert = Database['public']['Tables']['workouts']['Insert']
export type WorkoutUpdate = Database['public']['Tables']['workouts']['Update']

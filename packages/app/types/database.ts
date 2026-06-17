export type ClientStatus = 'active' | 'paused' | 'archived'
export type UserRole = 'coach' | 'client'
export type ClientInviteStatus = 'not_invited' | 'pending' | 'accepted'

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

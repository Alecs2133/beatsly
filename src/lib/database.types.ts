export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_auth_handoff: {
        Row: {
          access_token: string
          code: string
          created_at: string
          expires_at: string
          refresh_token: string
          user_id: string
        }
        Insert: {
          access_token: string
          code: string
          created_at?: string
          expires_at?: string
          refresh_token: string
          user_id: string
        }
        Update: {
          access_token?: string
          code?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          user_id?: string
        }
        Relationships: []
      }
      client_error_reports: {
        Row: {
          app_version: string | null
          context: string
          created_at: string
          id: string
          message: string
          platform: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          context: string
          created_at?: string
          id?: string
          message: string
          platform: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          context?: string
          created_at?: string
          id?: string
          message?: string
          platform?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      collection_sounds: {
        Row: {
          added_at: string
          collection_id: string
          sound_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          sound_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          sound_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_sounds_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_sounds_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "sounds"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          crew_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          crew_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          crew_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
          user_id: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
          user_id?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          credits: number
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          last_refill_date: string
          onboarded_at: string | null
          phone_number: string | null
          role: string
          social_links: Json
          stripe_customer_id: string | null
          tier: string
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          credits?: number
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          last_refill_date?: string
          onboarded_at?: string | null
          phone_number?: string | null
          role?: string
          social_links?: Json
          stripe_customer_id?: string | null
          tier?: string
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          credits?: number
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_refill_date?: string
          onboarded_at?: string | null
          phone_number?: string | null
          role?: string
          social_links?: Json
          stripe_customer_id?: string | null
          tier?: string
          username?: string | null
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          created_at: string | null
          id: string
          requested_role: string | null
          social_links: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requested_role?: string | null
          social_links: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requested_role?: string | null
          social_links?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sounds: {
        Row: {
          author: string
          bpm: number | null
          created_at: string
          crew_id: string | null
          duration: string | null
          file_url: string | null
          id: string
          key_signature: string | null
          license: string
          owner_id: string | null
          preview_url: string | null
          status: string | null
          storage_path: string | null
          tags: string[] | null
          title: string
          type: string
        }
        Insert: {
          author: string
          bpm?: number | null
          created_at?: string
          crew_id?: string | null
          duration?: string | null
          file_url?: string | null
          id?: string
          key_signature?: string | null
          license?: string
          owner_id?: string | null
          preview_url?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title: string
          type: string
        }
        Update: {
          author?: string
          bpm?: number | null
          created_at?: string
          crew_id?: string | null
          duration?: string | null
          file_url?: string | null
          id?: string
          key_signature?: string | null
          license?: string
          owner_id?: string | null
          preview_url?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sounds_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      user_libraries: {
        Row: {
          created_at: string
          sound_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sound_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          sound_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_libraries_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "sounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_crew_member: {
        Args: { p_crew_id: string; p_username: string }
        Returns: undefined
      }
      apply_subscription_tier: {
        Args: {
          p_customer_id?: string
          p_event_id: string
          p_tier: string
          p_user_id: string
        }
        Returns: boolean
      }
      approve_role_request: {
        Args: { granted_role: string; req_id: string; req_user_id: string }
        Returns: undefined
      }
      claim_daily_refill: {
        Args: never
        Returns: {
          credits: number
          first_name: string | null
          id: string
          last_name: string | null
          last_refill_date: string
          onboarded_at: string | null
          phone_number: string | null
          role: string
          stripe_customer_id: string | null
          tier: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_crew: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        SetofOptions: {
          from: "*"
          to: "crews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_app_role: { Args: never; Returns: string }
      deduct_credit: { Args: never; Returns: number }
      end_subscription_by_customer: {
        Args: { p_customer_id: string; p_event_id: string }
        Returns: boolean
      }
      get_crew_members: {
        Args: { p_crew_id: string }
        Returns: {
          is_owner: boolean
          joined_at: string
          user_id: string
          username: string
        }[]
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_path: string
          bio: string
          display_name: string
          follower_count: number
          following_count: number
          social_links: Json
          sound_count: number
          user_id: string
          username: string
        }[]
      }
      get_sound_storage_path: {
        Args: { p_requesting_user: string; p_sound_id: string }
        Returns: {
          is_crew: boolean
          storage_path: string
        }[]
      }
      grant_purchased_credits: {
        Args: { p_amount: number; p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_crew_member: { Args: { p_crew_id: string }; Returns: boolean }
      is_crew_owner: { Args: { p_crew_id: string }; Returns: boolean }
      is_publisher: { Args: never; Returns: boolean }
      refund_credit: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: number
      }
      remove_crew_member: {
        Args: { p_crew_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
          email: string
          full_name: string | null
          created_at: string
          email_notifications: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          email_notifications?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          email_notifications?: boolean
        }
      }
      sites: {
        Row: {
          id: string
          user_id: string
          url: string
          nickname: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          nickname?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          nickname?: string | null
          created_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          site_id: string
          seo_score: number | null
          trust_score: number | null
          combined_score: number | null
          seo_report: Json | null
          trust_report: Json | null
          image_flags: Json | null
          scanned_at: string
        }
        Insert: {
          id?: string
          site_id: string
          seo_score?: number | null
          trust_score?: number | null
          combined_score?: number | null
          seo_report?: Json | null
          trust_report?: Json | null
          image_flags?: Json | null
          scanned_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          seo_score?: number | null
          trust_score?: number | null
          combined_score?: number | null
          seo_report?: Json | null
          trust_report?: Json | null
          image_flags?: Json | null
          scanned_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

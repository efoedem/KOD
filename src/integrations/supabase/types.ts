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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_invitations: {
        Row: {
          accepted_by: string | null
          created_at: string
          created_by: string
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          school_id: string | null
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string
          created_by: string
          department_id?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          school_id?: string | null
        }
        Update: {
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          course_code: string | null
          cover_url: string | null
          created_at: string
          department_id: string
          description: string | null
          edition: string | null
          id: string
          is_active: boolean
          isbn: string | null
          level: string
          price: number
          stock: number
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          author: string
          course_code?: string | null
          cover_url?: string | null
          created_at?: string
          department_id: string
          description?: string | null
          edition?: string | null
          id?: string
          is_active?: boolean
          isbn?: string | null
          level: string
          price?: number
          stock?: number
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          author?: string
          course_code?: string | null
          cover_url?: string | null
          created_at?: string
          department_id?: string
          description?: string | null
          edition?: string | null
          id?: string
          is_active?: boolean
          isbn?: string | null
          level?: string
          price?: number
          stock?: number
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          code: string | null
          created_at: string
          department_id: string
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          department_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          author: string | null
          book_id: string | null
          created_at: string
          id: string
          order_id: string
          quantity: number
          seller_id: string | null
          title: string
          unit_price: number
        }
        Insert: {
          author?: string | null
          book_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          quantity?: number
          seller_id?: string | null
          title: string
          unit_price?: number
        }
        Update: {
          author?: string | null
          book_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          seller_id?: string | null
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_name: string
          created_at: string
          department_name: string | null
          email: string
          id: string
          level: string | null
          notified_email: boolean
          notified_sms: boolean
          order_ref: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          phone: string
          school_name: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_name: string
          created_at?: string
          department_name?: string | null
          email: string
          id?: string
          level?: string | null
          notified_email?: boolean
          notified_sms?: boolean
          order_ref: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          phone: string
          school_name?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_name?: string
          created_at?: string
          department_name?: string | null
          email?: string
          id?: string
          level?: string | null
          notified_email?: boolean
          notified_sms?: boolean
          order_ref?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string
          school_name?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string | null
          id: string
          index_number: string | null
          level: string | null
          phone: string
          programme_id: string | null
          school_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name?: string | null
          id: string
          index_number?: string | null
          level?: string | null
          phone: string
          programme_id?: string | null
          school_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          index_number?: string | null
          level?: string | null
          phone?: string
          programme_id?: string | null
          school_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: boolean
          site_url: string
          support_email: string
          support_phone: string
        }
        Insert: {
          id?: boolean
          site_url?: string
          support_email?: string
          support_phone?: string
        }
        Update: {
          id?: boolean
          site_url?: string
          support_email?: string
          support_phone?: string
        }
        Relationships: []
      }
      telegram_admin_links: {
        Row: {
          chat_id: number | null
          code_expires_at: string | null
          code_hash: string | null
          confirmed: boolean
          pending_action: Json | null
          pending_expires_at: string | null
          pending_token: string | null
          telegram_user_id: number | null
          user_id: string
        }
        Insert: {
          chat_id?: number | null
          code_expires_at?: string | null
          code_hash?: string | null
          confirmed?: boolean
          pending_action?: Json | null
          pending_expires_at?: string | null
          pending_token?: string | null
          telegram_user_id?: number | null
          user_id: string
        }
        Update: {
          chat_id?: number | null
          code_expires_at?: string | null
          code_hash?: string | null
          confirmed?: boolean
          pending_action?: Json | null
          pending_expires_at?: string | null
          pending_token?: string | null
          telegram_user_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_admin_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bot_updates: {
        Row: {
          created_at: string
          reply: string
          update_id: number
        }
        Insert: {
          created_at?: string
          reply: string
          update_id: number
        }
        Update: {
          created_at?: string
          reply?: string
          update_id?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_book_admin: {
        Args: {
          _department?: string
          _email: string
          _name?: string
          _phone?: string
          _school?: string
        }
        Returns: string
      }
      admin_sales: {
        Args: never
        Returns: {
          buyer_name: string
          created_at: string
          department_name: string
          email: string
          id: string
          items: Json
          level: string
          order_ref: string
          paid_at: string
          payment_method: string
          payment_status: string
          phone: string
          school_name: string
          status: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      telegram_bot_action: {
        Args: {
          _action: Json
          _chat: number
          _telegram: number
          _update: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "student" | "super_admin"
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
    Enums: {
      app_role: ["admin", "student", "super_admin"],
    },
  },
} as const

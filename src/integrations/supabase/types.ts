export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          unread_count: number
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          unread_count?: number
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_public: boolean
          name: string
          trade_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          name: string
          trade_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          name?: string
          trade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_chains: {
        Row: {
          chain_id: number
          chain_id_hex: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          chain_id: number
          chain_id_hex: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          chain_id?: number
          chain_id_hex?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_licenses: {
        Row: {
          created_at: string
          description: string
          id: string
          license_name: string
          region: string
          region_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          license_name: string
          region: string
          region_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          license_name?: string
          region?: string
          region_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_tokens: {
        Row: {
          address: string
          chain_id: number
          created_at: string
          id: string
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          address: string
          chain_id: number
          created_at?: string
          id?: string
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          address?: string
          chain_id?: number
          created_at?: string
          id?: string
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_tokens_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "data_chains"
            referencedColumns: ["chain_id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email: string | null
          email_frequency: string | null
          enable_email: boolean
          enable_slack: boolean
          enable_sms: boolean
          enable_telegram: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_frequency?: string | null
          enable_email?: boolean
          enable_slack?: boolean
          enable_sms?: boolean
          enable_telegram?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_frequency?: string | null
          enable_email?: boolean
          enable_slack?: boolean
          enable_sms?: boolean
          enable_telegram?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_public: boolean
          kyc_level: Database["public"]["Enums"]["kyc_level"]
          licenses: string[]
          reputation: number
          successful_trades: number
          total_trades: number
          trader_type: Database["public"]["Enums"]["trader_type"]
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id: string
          is_public?: boolean
          kyc_level?: Database["public"]["Enums"]["kyc_level"]
          licenses?: string[]
          reputation?: number
          successful_trades?: number
          total_trades?: number
          trader_type?: Database["public"]["Enums"]["trader_type"]
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_public?: boolean
          kyc_level?: Database["public"]["Enums"]["kyc_level"]
          licenses?: string[]
          reputation?: number
          successful_trades?: number
          total_trades?: number
          trader_type?: Database["public"]["Enums"]["trader_type"]
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          buy_asset: string | null
          chain: string
          chain_id: number | null
          created_at: string
          created_by: string
          expected_execution: string | null
          expiry_timestamp: string | null
          expiry_type: string | null
          id: string
          limit_price: string | null
          pair: string
          price: string
          sell_asset: string | null
          size: string
          status: Database["public"]["Enums"]["trade_status"]
          trigger_asset: string | null
          trigger_condition: string | null
          trigger_price: string | null
          type: Database["public"]["Enums"]["trade_type"]
          updated_at: string
          usd_amount: string | null
        }
        Insert: {
          buy_asset?: string | null
          chain: string
          chain_id?: number | null
          created_at?: string
          created_by: string
          expected_execution?: string | null
          expiry_timestamp?: string | null
          expiry_type?: string | null
          id?: string
          limit_price?: string | null
          pair: string
          price: string
          sell_asset?: string | null
          size: string
          status?: Database["public"]["Enums"]["trade_status"]
          trigger_asset?: string | null
          trigger_condition?: string | null
          trigger_price?: string | null
          type: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          usd_amount?: string | null
        }
        Update: {
          buy_asset?: string | null
          chain?: string
          chain_id?: number | null
          created_at?: string
          created_by?: string
          expected_execution?: string | null
          expiry_timestamp?: string | null
          expiry_type?: string | null
          id?: string
          limit_price?: string | null
          pair?: string
          price?: string
          sell_asset?: string | null
          size?: string
          status?: Database["public"]["Enums"]["trade_status"]
          trigger_asset?: string | null
          trigger_condition?: string | null
          trigger_price?: string | null
          type?: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          usd_amount?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trades_chain_id"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "data_chains"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "trades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message: string
          nonce: string
          signature: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          message: string
          nonce: string
          signature: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string
          nonce?: string
          signature?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_uid_test: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      authenticate_wallet: {
        Args: {
          wallet_addr: string
          signature_msg: string
          user_signature: string
          nonce_value: string
        }
        Returns: Json
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_wallet_challenge: {
        Args: { wallet_addr: string }
        Returns: Json
      }
      increment_unread_count: {
        Args: { chat_id: string; sender_id: string }
        Returns: undefined
      }
      user_is_chat_member: {
        Args: { check_chat_id: string; check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      kyc_level: "Level 0" | "Level 1" | "Level 2"
      message_type: "message" | "trade_action" | "system"
      trade_status: "active" | "completed" | "cancelled"
      trade_type: "buy" | "sell"
      trader_type: "Degen" | "Institutional"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      kyc_level: ["Level 0", "Level 1", "Level 2"],
      message_type: ["message", "trade_action", "system"],
      trade_status: ["active", "completed", "cancelled"],
      trade_type: ["buy", "sell"],
      trader_type: ["Degen", "Institutional"],
    },
  },
} as const

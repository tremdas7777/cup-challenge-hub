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
      cloaker_config: {
        Row: {
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          event: string
          id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          session_id?: string | null
        }
        Relationships: []
      }
      gateway_config: {
        Row: {
          active_gateway: string
          centurionpay_company_id: string | null
          centurionpay_secret_key: string | null
          credit_card_enabled: boolean
          external_checkout_enabled: boolean
          external_checkout_url: string
          facebook_access_token: string | null
          facebook_pixel_id: string | null
          id: string
          ironpay_api_token: string | null
          pagouai_public_key: string | null
          pagouai_secret_key: string | null
          product_ticket_cents: number
          simpayout_client_id: string | null
          simpayout_client_secret: string | null
          stripe_public_key: string | null
          stripe_secret_key: string | null
          support_whatsapp: string | null
          updated_at: string | null
          utmify_api_token: string | null
          utmify_api_token_2: string | null
          vennox_company_id: string | null
          vennox_secret_key: string | null
        }
        Insert: {
          active_gateway?: string
          centurionpay_company_id?: string | null
          centurionpay_secret_key?: string | null
          credit_card_enabled?: boolean
          external_checkout_enabled?: boolean
          external_checkout_url?: string
          facebook_access_token?: string | null
          facebook_pixel_id?: string | null
          id?: string
          ironpay_api_token?: string | null
          pagouai_public_key?: string | null
          pagouai_secret_key?: string | null
          product_ticket_cents?: number
          simpayout_client_id?: string | null
          simpayout_client_secret?: string | null
          stripe_public_key?: string | null
          stripe_secret_key?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
          utmify_api_token?: string | null
          utmify_api_token_2?: string | null
          vennox_company_id?: string | null
          vennox_secret_key?: string | null
        }
        Update: {
          active_gateway?: string
          centurionpay_company_id?: string | null
          centurionpay_secret_key?: string | null
          credit_card_enabled?: boolean
          external_checkout_enabled?: boolean
          external_checkout_url?: string
          facebook_access_token?: string | null
          facebook_pixel_id?: string | null
          id?: string
          ironpay_api_token?: string | null
          pagouai_public_key?: string | null
          pagouai_secret_key?: string | null
          product_ticket_cents?: number
          simpayout_client_id?: string | null
          simpayout_client_secret?: string | null
          stripe_public_key?: string | null
          stripe_secret_key?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
          utmify_api_token?: string | null
          utmify_api_token_2?: string | null
          vennox_company_id?: string | null
          vennox_secret_key?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          buyer_address: string | null
          buyer_address_number: string | null
          buyer_cep: string | null
          buyer_city: string | null
          buyer_complement: string | null
          buyer_document: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_neighborhood: string | null
          buyer_phone: string | null
          buyer_state: string | null
          client_ip: string | null
          client_user_agent: string | null
          created_at: string
          external_id: string | null
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          gateway: string
          gateway_response: Json | null
          id: string
          items_description: string | null
          pix_code: string | null
          pix_qr_code_base64: string | null
          proof_url: string | null
          qr_code_copied: boolean
          recovery_last_sent_at: string | null
          recovery_sent: boolean | null
          shipping_cost_cents: number | null
          shipping_method: string | null
          source_url: string | null
          status: string
          tracking: Json | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          amount_cents: number
          buyer_address?: string | null
          buyer_address_number?: string | null
          buyer_cep?: string | null
          buyer_city?: string | null
          buyer_complement?: string | null
          buyer_document?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_neighborhood?: string | null
          buyer_phone?: string | null
          buyer_state?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string
          external_id?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gateway?: string
          gateway_response?: Json | null
          id?: string
          items_description?: string | null
          pix_code?: string | null
          pix_qr_code_base64?: string | null
          proof_url?: string | null
          qr_code_copied?: boolean
          recovery_last_sent_at?: string | null
          recovery_sent?: boolean | null
          shipping_cost_cents?: number | null
          shipping_method?: string | null
          source_url?: string | null
          status?: string
          tracking?: Json | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          amount_cents?: number
          buyer_address?: string | null
          buyer_address_number?: string | null
          buyer_cep?: string | null
          buyer_city?: string | null
          buyer_complement?: string | null
          buyer_document?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_neighborhood?: string | null
          buyer_phone?: string | null
          buyer_state?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string
          external_id?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gateway?: string
          gateway_response?: Json | null
          id?: string
          items_description?: string | null
          pix_code?: string | null
          pix_qr_code_base64?: string | null
          proof_url?: string | null
          qr_code_copied?: boolean
          recovery_last_sent_at?: string | null
          recovery_sent?: boolean | null
          shipping_cost_cents?: number | null
          shipping_method?: string | null
          source_url?: string | null
          status?: string
          tracking?: Json | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          url?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const

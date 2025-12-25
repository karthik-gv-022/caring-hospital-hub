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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string | null
          scheduled_date: string
          scheduled_time: string
          status: string | null
          symptoms: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          symptoms?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          symptoms?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          patient_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          available_slots: number | null
          created_at: string | null
          id: string
          is_available: boolean | null
          name: string
          next_available: string | null
          rating: number | null
          specialty: string
          user_id: string | null
        }
        Insert: {
          available_slots?: number | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          next_available?: string | null
          rating?: number | null
          specialty: string
          user_id?: string | null
        }
        Update: {
          available_slots?: number | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          next_available?: string | null
          rating?: number | null
          specialty?: string
          user_id?: string | null
        }
        Relationships: []
      }
      medicines: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          generic_name: string | null
          id: string
          image_url: string | null
          manufacturer: string | null
          name: string
          price: number
          requires_prescription: boolean | null
          stock_quantity: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          name: string
          price: number
          requires_prescription?: boolean | null
          stock_quantity?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          manufacturer?: string | null
          name?: string
          price?: number
          requires_prescription?: boolean | null
          stock_quantity?: number | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          address: string
          created_at: string | null
          delivery_fee: number | null
          email: string | null
          estimated_delivery_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          rating: number | null
        }
        Insert: {
          address: string
          created_at?: string | null
          delivery_fee?: number | null
          email?: string | null
          estimated_delivery_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          rating?: number | null
        }
        Update: {
          address?: string
          created_at?: string | null
          delivery_fee?: number | null
          email?: string | null
          estimated_delivery_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      pharmacy_order_items: {
        Row: {
          created_at: string | null
          id: string
          medicine_id: string | null
          medicine_name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          medicine_id?: string | null
          medicine_name: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          medicine_id?: string | null
          medicine_name?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_order_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_orders: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_fee: number | null
          delivery_phone: string
          estimated_delivery: string | null
          id: string
          notes: string | null
          order_number: string
          patient_id: string
          payment_method: string | null
          payment_status: string | null
          pharmacy_id: string | null
          prescription_id: string | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_fee?: number | null
          delivery_phone: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_number: string
          patient_id: string
          payment_method?: string | null
          payment_status?: string | null
          pharmacy_id?: string | null
          prescription_id?: string | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_fee?: number | null
          delivery_phone?: string
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          patient_id?: string
          payment_method?: string | null
          payment_status?: string | null
          pharmacy_id?: string | null
          prescription_id?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_orders_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string | null
          dosage: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          medicine_id: string | null
          medicine_name: string
          prescription_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          dosage: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          medicine_id?: string | null
          medicine_name: string
          prescription_id: string
          quantity?: number
        }
        Update: {
          created_at?: string | null
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          medicine_id?: string | null
          medicine_name?: string
          prescription_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          diagnosis: string | null
          doctor_id: string | null
          id: string
          is_valid: boolean | null
          notes: string | null
          patient_id: string
          valid_until: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          is_valid?: boolean | null
          notes?: string | null
          patient_id: string
          valid_until?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          is_valid?: boolean | null
          notes?: string | null
          patient_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      queue_tokens: {
        Row: {
          created_at: string | null
          department: string
          doctor_id: string | null
          estimated_wait_minutes: number | null
          id: string
          patient_id: string | null
          position: number | null
          status: string | null
          token_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department: string
          doctor_id?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          patient_id?: string | null
          position?: number | null
          status?: string | null
          token_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string
          doctor_id?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          patient_id?: string | null
          position?: number | null
          status?: string | null
          token_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_tokens_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "patient"
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
      app_role: ["admin", "doctor", "patient"],
    },
  },
} as const

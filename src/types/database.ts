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
      stores: {
        Row: {
          id: string
          name: string
          currency: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          currency?: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          currency?: string
          created_at?: string
          created_by?: string
        }
        Relationships: []
      }
      store_members: {
        Row: {
          id: string
          store_id: string
          user_id: string
          role: 'owner' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          role: 'owner' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          store_id: string
          type: 'work' | 'expense'
          description: string
          amount: number
          date: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          store_id: string
          type: 'work' | 'expense'
          description: string
          amount: number
          date: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          store_id?: string
          type?: 'work' | 'expense'
          description?: string
          amount?: number
          date?: string
          created_at?: string
          created_by?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          store_id: string
          work_name: string
          customer_name: string
          imei: string
          imei2: string
          phone: string
          cnic: string
          address: string
          notes: string
          photo_path: string | null
          status: 'pending' | 'delivered'
          date: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          store_id: string
          work_name: string
          customer_name: string
          imei?: string
          imei2?: string
          phone?: string
          cnic?: string
          address?: string
          notes?: string
          photo_path?: string | null
          status?: 'pending' | 'delivered'
          date?: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          store_id?: string
          work_name?: string
          customer_name?: string
          imei?: string
          imei2?: string
          phone?: string
          cnic?: string
          address?: string
          notes?: string
          photo_path?: string | null
          status?: 'pending' | 'delivered'
          date?: string
          created_at?: string
          created_by?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Store = Database['public']['Tables']['stores']['Row']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']
export type StoreUpdate = Database['public']['Tables']['stores']['Update']
export type StoreMember = Database['public']['Tables']['store_members']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']
export type CustomerStatus = Customer['status']

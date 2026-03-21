export interface Database {
  public: {
    Tables: {
      library_documents: {
        Row: {
          id: string
          user_id: string
          slug: string
          title: string
          body: string
          block_depths: number[]
          block_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          slug: string
          title: string
          body?: string
          block_depths?: number[]
          block_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slug?: string
          title?: string
          body?: string
          block_depths?: number[]
          block_ids?: number[] | string[]
          created_at?: string
          updated_at?: string
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

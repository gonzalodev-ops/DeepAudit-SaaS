export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          industry: string | null
          logo_url: string | null
          manual_url: string | null
          manual_text: string | null
          audit_criteria: AuditCriterion[]
          default_processing_mode: 'full' | 'compliance' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
          logo_url?: string | null
          manual_url?: string | null
          manual_text?: string | null
          audit_criteria?: AuditCriterion[]
          default_processing_mode?: 'full' | 'compliance' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
          logo_url?: string | null
          manual_url?: string | null
          manual_text?: string | null
          audit_criteria?: AuditCriterion[]
          default_processing_mode?: 'full' | 'compliance' | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          auth_id: string | null
          tenant_id: string | null
          email: string
          full_name: string | null
          role: 'admin' | 'supervisor' | 'agent'
          created_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          tenant_id?: string | null
          email: string
          full_name?: string | null
          role?: 'admin' | 'supervisor' | 'agent'
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          tenant_id?: string | null
          email?: string
          full_name?: string | null
          role?: 'admin' | 'supervisor' | 'agent'
          created_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          tenant_id: string | null
          agent_id: string | null
          audio_url: string | null
          duration_seconds: number | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          agent_id?: string | null
          audio_url?: string | null
          duration_seconds?: number | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          agent_id?: string | null
          audio_url?: string | null
          duration_seconds?: number | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          metadata?: Json
          created_at?: string
        }
      }
      audits: {
        Row: {
          id: string
          call_id: string | null
          transcript: string | null
          overall_score: number | null
          summary: string | null
          strengths: string[] | null
          areas_for_improvement: string[] | null
          criteria_scores: CriterionScore[]
          recommendations: string | null
          processed_at: string
        }
        Insert: {
          id?: string
          call_id?: string | null
          transcript?: string | null
          overall_score?: number | null
          summary?: string | null
          strengths?: string[] | null
          areas_for_improvement?: string[] | null
          criteria_scores?: CriterionScore[]
          recommendations?: string | null
          processed_at?: string
        }
        Update: {
          id?: string
          call_id?: string | null
          transcript?: string | null
          overall_score?: number | null
          summary?: string | null
          strengths?: string[] | null
          areas_for_improvement?: string[] | null
          criteria_scores?: CriterionScore[]
          recommendations?: string | null
          processed_at?: string
        }
      }
    }
  }
}

export interface AuditCriterion {
  id: string
  name: string
  weight: number
  description: string
}

export interface CriterionScore {
  criterion_id: string
  criterion_name: string
  score: number
  max_score: number
  feedback: string
}

export type Call = Database['public']['Tables']['calls']['Row']
export type Audit = Database['public']['Tables']['audits']['Row']
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type User = Database['public']['Tables']['users']['Row']

export interface CallWithAudit extends Call {
  audit?: Audit | null
  agent?: User | null
}

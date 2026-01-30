export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enterprise-specific types
export type CallScenario = 'retention' | 'cancellation' | 'dispute' | 'collection' | 'support' | 'sales'
export type ClientSentiment = 'hostile' | 'negative' | 'neutral' | 'positive' | 'enthusiastic'
export type LegalRiskLevel = 'critical' | 'high' | 'medium' | 'safe'
export type CallOutcome = 'retained' | 'churned' | 'hung_up' | 'escalated' | 'pending'
export type SuggestedAction = 'immediate_termination' | 'urgent_coaching' | 'standard_coaching' | 'model_script' | 'recognition' | 'none'

// Callfast types
export type PipelineType = 'legacy' | 'callfast'
export type BillingModel = 'platform' | 'byoak'
export type BillingStatus = 'pending' | 'billed' | 'free_tier'
export type ProcessingStep = 'stt' | 'silence_detection' | 'llm_evaluation'

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
          pipeline_type: string | null
          gemini_api_key_encrypted: string | null
          stt_api_key_encrypted: string | null
          billing_model: string | null
          price_per_minute: number | null
          price_per_audit: number | null
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
          pipeline_type?: string | null
          gemini_api_key_encrypted?: string | null
          stt_api_key_encrypted?: string | null
          billing_model?: string | null
          price_per_minute?: number | null
          price_per_audit?: number | null
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
          pipeline_type?: string | null
          gemini_api_key_encrypted?: string | null
          stt_api_key_encrypted?: string | null
          billing_model?: string | null
          price_per_minute?: number | null
          price_per_audit?: number | null
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
          stt_transcript_url: string | null
          channel_count: number | null
          campaign_id: string | null
          subcampaign_id: string | null
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
          stt_transcript_url?: string | null
          channel_count?: number | null
          campaign_id?: string | null
          subcampaign_id?: string | null
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
          stt_transcript_url?: string | null
          channel_count?: number | null
          campaign_id?: string | null
          subcampaign_id?: string | null
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
          // Enterprise fields
          call_scenario: CallScenario | null
          client_sentiment: ClientSentiment | null
          legal_risk_level: LegalRiskLevel | null
          legal_risk_reasons: string[] | null
          call_outcome: CallOutcome | null
          suggested_action: SuggestedAction | null
          // Callfast fields
          agent_transcript: string | null
          client_transcript: string | null
          total_silence_seconds: number | null
          silence_count: number | null
          pipeline_type: string | null
          processing_mode: string | null
          key_moments: Json | null
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
          // Enterprise fields
          call_scenario?: CallScenario | null
          client_sentiment?: ClientSentiment | null
          legal_risk_level?: LegalRiskLevel | null
          legal_risk_reasons?: string[] | null
          call_outcome?: CallOutcome | null
          suggested_action?: SuggestedAction | null
          // Callfast fields
          agent_transcript?: string | null
          client_transcript?: string | null
          total_silence_seconds?: number | null
          silence_count?: number | null
          pipeline_type?: string | null
          processing_mode?: string | null
          key_moments?: Json | null
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
          // Enterprise fields
          call_scenario?: CallScenario | null
          client_sentiment?: ClientSentiment | null
          legal_risk_level?: LegalRiskLevel | null
          legal_risk_reasons?: string[] | null
          call_outcome?: CallOutcome | null
          suggested_action?: SuggestedAction | null
          // Callfast fields
          agent_transcript?: string | null
          client_transcript?: string | null
          total_silence_seconds?: number | null
          silence_count?: number | null
          pipeline_type?: string | null
          processing_mode?: string | null
          key_moments?: Json | null
        }
      }
      campaigns: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subcampaigns: {
        Row: {
          id: string
          campaign_id: string
          name: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      commercial_offers: {
        Row: {
          id: string
          subcampaign_id: string
          offer_data: Json
          valid_from: string
          valid_until: string | null
          version: number
          created_at: string
        }
        Insert: {
          id?: string
          subcampaign_id: string
          offer_data: Json
          valid_from: string
          valid_until?: string | null
          version?: number
          created_at?: string
        }
        Update: {
          id?: string
          subcampaign_id?: string
          offer_data?: Json
          valid_from?: string
          valid_until?: string | null
          version?: number
          created_at?: string
        }
      }
      silence_events: {
        Row: {
          id: string
          call_id: string
          start_seconds: number
          end_seconds: number
          duration_seconds: number
          channel: number
          silence_type: string
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          start_seconds: number
          end_seconds: number
          duration_seconds: number
          channel: number
          silence_type: string
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          start_seconds?: number
          end_seconds?: number
          duration_seconds?: number
          channel?: number
          silence_type?: string
          created_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          tenant_id: string
          call_id: string
          audio_duration_seconds: number
          audio_duration_minutes: number
          pipeline_type: string
          stt_cost_usd: number | null
          llm_cost_usd: number | null
          total_internal_cost_usd: number | null
          billing_status: BillingStatus
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          call_id: string
          audio_duration_seconds: number
          audio_duration_minutes: number
          pipeline_type: string
          stt_cost_usd?: number | null
          llm_cost_usd?: number | null
          total_internal_cost_usd?: number | null
          billing_status?: BillingStatus
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          call_id?: string
          audio_duration_seconds?: number
          audio_duration_minutes?: number
          pipeline_type?: string
          stt_cost_usd?: number | null
          llm_cost_usd?: number | null
          total_internal_cost_usd?: number | null
          billing_status?: BillingStatus
          created_at?: string
        }
      }
      processing_logs: {
        Row: {
          id: string
          tenant_id: string
          call_id: string
          step: string
          status: string
          provider: string | null
          model_version: string | null
          prompt_hash: string | null
          config_snapshot: Json | null
          duration_ms: number | null
          input_tokens: number | null
          output_tokens: number | null
          cost_usd: number | null
          error_message: string | null
          audio_duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          call_id: string
          step: string
          status: string
          provider?: string | null
          model_version?: string | null
          prompt_hash?: string | null
          config_snapshot?: Json | null
          duration_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          error_message?: string | null
          audio_duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          call_id?: string
          step?: string
          status?: string
          provider?: string | null
          model_version?: string | null
          prompt_hash?: string | null
          config_snapshot?: Json | null
          duration_ms?: number | null
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          error_message?: string | null
          audio_duration_seconds?: number | null
          created_at?: string
        }
      }
      tenant_domains: {
        Row: {
          id: string
          tenant_id: string
          hostname: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          hostname: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          hostname?: string
          is_primary?: boolean
          created_at?: string
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
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Subcampaign = Database['public']['Tables']['subcampaigns']['Row']
export type CommercialOffer = Database['public']['Tables']['commercial_offers']['Row']
export type SilenceEvent = Database['public']['Tables']['silence_events']['Row']
export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
export type ProcessingLog = Database['public']['Tables']['processing_logs']['Row']
export type TenantDomain = Database['public']['Tables']['tenant_domains']['Row']

export interface CallWithAudit extends Call {
  audit?: Audit | null
  agent?: User | null
}

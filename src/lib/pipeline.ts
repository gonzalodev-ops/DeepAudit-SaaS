import type { STTTranscriptionResult } from './stt/types'
import type { SilenceEvent } from './silence/detector'

export type PipelineType = 'legacy' | 'callfast'

export interface PipelineInput {
  callId: string
  tenantId: string
  audioBuffer: Buffer
  mimeType: string
  pipelineType: PipelineType
  processingMode: 'full' | 'compliance'
  auditCriteria: Array<{
    id: string
    name: string
    weight: number
    description: string
  }>
  manualText: string | null
  campaignId?: string
  subcampaignId?: string
}

export interface PipelineOutput {
  callId: string
  pipelineType: PipelineType
  transcription?: STTTranscriptionResult
  silenceEvents: SilenceEvent[]
  auditResult: {
    overall_score: number
    summary: string
    transcript: string
    agent_transcript?: string
    client_transcript?: string
    strengths: string[]
    areas_for_improvement: string[]
    criteria_scores: Array<{
      criterion_id: string
      criterion_name: string
      score: number
      max_score: number
      feedback: string
    }>
    recommendations: string
    call_scenario?: string
    client_sentiment?: string
    legal_risk_level?: string
    legal_risk_reasons?: string[]
    call_outcome?: string
    suggested_action?: string
    key_moments?: Array<{
      timestamp: string
      description: string
      type: string
    }>
    processing_mode: string
    duration_seconds?: number
  }
  costs: CostBreakdown
}

export interface CostBreakdown {
  stt_cost_usd: number | null
  llm_cost_usd: number | null
  total_cost_usd: number
  input_tokens?: number
  output_tokens?: number
}

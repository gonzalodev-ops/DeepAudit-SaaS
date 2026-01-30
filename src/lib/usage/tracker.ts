import { createServiceClient } from '@/lib/supabase/server'

export interface UsageRecord {
  tenantId: string
  callId: string
  audioDurationSeconds: number
  pipelineType: 'legacy' | 'callfast'
  sttCostUsd?: number
  llmCostUsd?: number
  totalInternalCostUsd?: number
}

export async function trackUsage(record: UsageRecord): Promise<void> {
  const supabase = await createServiceClient()

  await supabase.from('usage_logs').insert({
    tenant_id: record.tenantId,
    call_id: record.callId,
    audio_duration_seconds: record.audioDurationSeconds,
    audio_duration_minutes: record.audioDurationSeconds / 60,
    pipeline_type: record.pipelineType,
    stt_cost_usd: record.sttCostUsd ?? null,
    llm_cost_usd: record.llmCostUsd ?? null,
    total_internal_cost_usd: record.totalInternalCostUsd ?? null,
    billing_status: 'pending',
  })
}

export async function getUsageSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCalls: number
  totalMinutes: number
  totalCostUsd: number
}> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('usage_logs')
    .select('audio_duration_minutes, total_internal_cost_usd')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (error || !data) {
    return { totalCalls: 0, totalMinutes: 0, totalCostUsd: 0 }
  }

  return {
    totalCalls: data.length,
    totalMinutes: data.reduce((sum: number, r: { audio_duration_minutes: number | null }) => sum + (r.audio_duration_minutes || 0), 0),
    totalCostUsd: data.reduce((sum: number, r: { total_internal_cost_usd: number | null }) => sum + (r.total_internal_cost_usd || 0), 0),
  }
}

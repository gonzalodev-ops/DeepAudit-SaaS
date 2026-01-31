import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromRequest } from '@/lib/auth/session'

interface ProcessingLog {
  step: string | null
  status: string | null
  provider: string | null
  cost_usd: number | null
  duration_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  audio_duration_seconds: number | null
  created_at: string | null
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request)
    const supabase = await createServiceClient()

    // Fetch all processing logs for this tenant
    const { data: logs, error: logsError } = await supabase
      .from('processing_logs')
      .select('step, status, provider, cost_usd, duration_ms, input_tokens, output_tokens, audio_duration_seconds, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }) as unknown as { data: ProcessingLog[] | null; error: { message: string } | null }

    if (logsError) {
      console.error('Error fetching processing logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch operations data' }, { status: 500 })
    }

    // Fetch calls count
    const { count: totalCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    // Fetch completed audits count
    const { count: completedAudits } = await supabase
      .from('audits')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    const allLogs = logs || []
    const completedLogs = allLogs.filter(l => l.status === 'completed')
    const failedLogs = allLogs.filter(l => l.status === 'failed')

    // Total audio minutes processed (from STT steps)
    const sttLogs = completedLogs.filter(l => l.step === 'stt')
    const totalAudioSeconds = sttLogs.reduce((sum, l) => sum + (l.audio_duration_seconds || 0), 0)
    const totalAudioMinutes = totalAudioSeconds / 60

    // Costs by step
    const costByStep: Record<string, { total_cost_usd: number; count: number; avg_duration_ms: number }> = {}
    for (const log of completedLogs) {
      const step = log.step || 'unknown'
      if (!costByStep[step]) {
        costByStep[step] = { total_cost_usd: 0, count: 0, avg_duration_ms: 0 }
      }
      costByStep[step].total_cost_usd += log.cost_usd || 0
      costByStep[step].count += 1
      costByStep[step].avg_duration_ms += log.duration_ms || 0
    }
    // Calculate averages
    for (const step of Object.keys(costByStep)) {
      if (costByStep[step].count > 0) {
        costByStep[step].avg_duration_ms = Math.round(costByStep[step].avg_duration_ms / costByStep[step].count)
      }
    }

    // Total costs
    const totalCostUsd = completedLogs.reduce((sum, l) => sum + (l.cost_usd || 0), 0)

    // Total tokens
    const totalInputTokens = completedLogs.reduce((sum, l) => sum + (l.input_tokens || 0), 0)
    const totalOutputTokens = completedLogs.reduce((sum, l) => sum + (l.output_tokens || 0), 0)

    // Provider usage
    const providerUsage: Record<string, number> = {}
    for (const log of completedLogs) {
      const provider = log.provider || 'unknown'
      providerUsage[provider] = (providerUsage[provider] || 0) + 1
    }

    // Recent activity (last 10 logs)
    const recentActivity = allLogs.slice(0, 10).map(l => ({
      step: l.step,
      status: l.status,
      provider: l.provider,
      cost_usd: l.cost_usd,
      duration_ms: l.duration_ms,
      created_at: l.created_at,
    }))

    return NextResponse.json({
      summary: {
        total_calls: totalCalls || 0,
        completed_audits: completedAudits || 0,
        total_processing_steps: allLogs.length,
        failed_steps: failedLogs.length,
        success_rate: allLogs.length > 0
          ? Number(((completedLogs.length / allLogs.length) * 100).toFixed(1))
          : 0,
      },
      audio: {
        total_seconds: Number(totalAudioSeconds.toFixed(1)),
        total_minutes: Number(totalAudioMinutes.toFixed(2)),
        calls_with_audio: sttLogs.length,
      },
      costs: {
        total_usd: Number(totalCostUsd.toFixed(4)),
        total_mxn: Number((totalCostUsd * 20).toFixed(2)),
        by_step: costByStep,
      },
      tokens: {
        total_input: totalInputTokens,
        total_output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      providers: providerUsage,
      recent_activity: recentActivity,
    })
  } catch (error) {
    console.error('Operations stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { processAudioWithGemini, ProcessingMode } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const mode: ProcessingMode = body.mode || 'full'

    const supabase = await createServiceClient()

    // Get the call with its audio URL
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, tenant:tenants(audit_criteria, manual_text)')
      .eq('id', id)
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    if (!call.audio_url) {
      return NextResponse.json({ error: 'No audio URL available' }, { status: 400 })
    }

    // Download the audio file
    const audioResponse = await fetch(call.audio_url)
    if (!audioResponse.ok) {
      return NextResponse.json({ error: 'Failed to download audio' }, { status: 500 })
    }

    const arrayBuffer = await audioResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get content type from response or default to mp3
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg'

    // Update call status to processing
    await supabase
      .from('calls')
      .update({ status: 'processing' })
      .eq('id', id)

    // Process with Gemini in the requested mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = call.tenant as any
    const auditResult = await processAudioWithGemini(
      buffer,
      contentType,
      tenant?.audit_criteria || [],
      tenant?.manual_text || null,
      mode
    )

    // Update call status
    await supabase
      .from('calls')
      .update({
        status: 'completed',
        duration_seconds: auditResult.duration_seconds || call.duration_seconds,
      })
      .eq('id', id)

    // Update existing audit or create new one
    const { data: existingAudit } = await supabase
      .from('audits')
      .select('id')
      .eq('call_id', id)
      .single()

    const auditData = {
      call_id: id,
      transcript: auditResult.transcript,
      overall_score: auditResult.overall_score,
      summary: auditResult.summary,
      strengths: auditResult.strengths,
      areas_for_improvement: auditResult.areas_for_improvement,
      criteria_scores: auditResult.criteria_scores,
      recommendations: auditResult.recommendations,
      input_tokens: auditResult.token_usage?.inputTokens || null,
      output_tokens: auditResult.token_usage?.outputTokens || null,
      total_tokens: auditResult.token_usage?.totalTokens || null,
      cost_usd: auditResult.token_usage?.costUsd || null,
      processing_mode: auditResult.processing_mode,
      key_moments: auditResult.key_moments || [],
      // Enterprise fields
      call_scenario: auditResult.call_scenario || null,
      client_sentiment: auditResult.client_sentiment || null,
      legal_risk_level: auditResult.legal_risk_level || null,
      legal_risk_reasons: auditResult.legal_risk_reasons || [],
      call_outcome: auditResult.call_outcome || null,
      suggested_action: auditResult.suggested_action || null,
    }

    if (existingAudit) {
      await supabase
        .from('audits')
        .update(auditData)
        .eq('id', existingAudit.id)
    } else {
      await supabase.from('audits').insert(auditData)
    }

    return NextResponse.json({
      success: true,
      mode: mode,
      callId: id,
      tokenUsage: auditResult.token_usage,
    })
  } catch (error) {
    console.error('Regenerate API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

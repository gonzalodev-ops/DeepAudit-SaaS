import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { processAudioWithGemini, ProcessingMode } from '@/lib/gemini'
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { path, filename, contentType, mode } = await request.json()

    if (!path) {
      return NextResponse.json({ error: 'Storage path required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Get tenant audit criteria and manual
    const { data: tenant } = await supabase
      .from('tenants')
      .select('audit_criteria, manual_text, default_processing_mode')
      .eq('id', DEMO_TENANT_ID)
      .single()

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('call-recordings')
      .download(path)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 })
    }

    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('call-recordings')
      .getPublicUrl(path)

    // Create call record with pending status
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        tenant_id: DEMO_TENANT_ID,
        agent_id: DEMO_USER_ID,
        audio_url: urlData.publicUrl,
        status: 'processing',
        metadata: { original_filename: filename || path },
      })
      .select()
      .single()

    if (callError || !call) {
      console.error('Call creation error:', callError)
      return NextResponse.json({ error: 'Failed to create call record' }, { status: 500 })
    }

    // Get processing mode
    const tenantDefaultMode = tenant?.default_processing_mode as ProcessingMode | null
    const processingMode: ProcessingMode = mode || tenantDefaultMode || 'full'

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine content type
    const mimeType = contentType || 'audio/wav'

    // Process with Gemini
    try {
      const auditResult = await processAudioWithGemini(
        buffer,
        mimeType,
        tenant?.audit_criteria || [],
        tenant?.manual_text || null,
        processingMode
      )

      // Update call status
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          duration_seconds: auditResult.duration_seconds || null,
        })
        .eq('id', call.id)

      // Insert audit with all fields
      await supabase.from('audits').insert({
        call_id: call.id,
        transcript: auditResult.transcript,
        overall_score: auditResult.overall_score,
        summary: auditResult.summary,
        strengths: auditResult.strengths,
        areas_for_improvement: auditResult.areas_for_improvement,
        criteria_scores: auditResult.criteria_scores,
        recommendations: auditResult.recommendations,
        // Token tracking
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
      })

      return NextResponse.json({ callId: call.id })
    } catch (processError) {
      console.error('Processing error:', processError)

      await supabase
        .from('calls')
        .update({ status: 'failed' })
        .eq('id', call.id)

      return NextResponse.json({
        callId: call.id,
        error: 'Processing failed, but call was saved',
      })
    }
  } catch (error) {
    console.error('Process API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

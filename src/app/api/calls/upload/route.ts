import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { processAudioWithGemini, ProcessingMode } from '@/lib/gemini'
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/webm']
    const isValidType = validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)

    if (!isValidType) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Get tenant audit criteria, manual, and default processing mode
    const { data: tenant } = await supabase
      .from('tenants')
      .select('audit_criteria, manual_text, default_processing_mode')
      .eq('id', DEMO_TENANT_ID)
      .single()

    // Upload file to storage
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `${DEMO_TENANT_ID}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('call-recordings')
      .getPublicUrl(filePath)

    // Create call record with pending status
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        tenant_id: DEMO_TENANT_ID,
        agent_id: DEMO_USER_ID,
        audio_url: urlData.publicUrl,
        status: 'processing',
        metadata: { original_filename: file.name },
      })
      .select()
      .single()

    if (callError || !call) {
      console.error('Call creation error:', callError)
      return NextResponse.json({ error: 'Failed to create call record' }, { status: 500 })
    }

    // Get processing mode from request, tenant default, or fallback to 'full'
    const requestMode = formData.get('mode') as ProcessingMode | null
    const tenantDefaultMode = tenant?.default_processing_mode as ProcessingMode | null
    const processingMode: ProcessingMode = requestMode || tenantDefaultMode || 'full'

    // Process with Gemini (async but we wait for it)
    try {
      const auditResult = await processAudioWithGemini(
        buffer,
        file.type,
        tenant?.audit_criteria || [],
        tenant?.manual_text || null,
        processingMode
      )

      // Update call status and create audit
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          duration_seconds: auditResult.duration_seconds || null,
        })
        .eq('id', call.id)

      // Insert audit with token tracking and key moments
      await supabase.from('audits').insert({
        call_id: call.id,
        transcript: auditResult.transcript,
        overall_score: auditResult.overall_score,
        summary: auditResult.summary,
        strengths: auditResult.strengths,
        areas_for_improvement: auditResult.areas_for_improvement,
        criteria_scores: auditResult.criteria_scores,
        recommendations: auditResult.recommendations,
        // New fields for token tracking
        input_tokens: auditResult.token_usage?.inputTokens || null,
        output_tokens: auditResult.token_usage?.outputTokens || null,
        total_tokens: auditResult.token_usage?.totalTokens || null,
        cost_usd: auditResult.token_usage?.costUsd || null,
        processing_mode: auditResult.processing_mode,
        // Key moments with timestamps
        key_moments: auditResult.key_moments || [],
      })
    } catch (processError) {
      console.error('Processing error:', processError)

      // Update call status to failed
      await supabase
        .from('calls')
        .update({ status: 'failed' })
        .eq('id', call.id)

      return NextResponse.json({
        callId: call.id,
        error: 'Processing failed, but call was saved',
      })
    }

    return NextResponse.json({ callId: call.id })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

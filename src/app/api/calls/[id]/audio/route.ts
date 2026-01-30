import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DEMO_TENANT_ID } from '@/lib/constants'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServiceClient()

    // Get the call to find the audio path
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('audio_url, tenant_id')
      .eq('id', id)
      .eq('tenant_id', DEMO_TENANT_ID)  // will come from auth later
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // audio_url now stores the path directly
    const filePath = call.audio_url
    if (!filePath) {
      return NextResponse.json({ error: 'No audio file' }, { status: 404 })
    }

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('call-recordings')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate audio URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signedUrlData.signedUrl })
  } catch (error) {
    console.error('Audio URL API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

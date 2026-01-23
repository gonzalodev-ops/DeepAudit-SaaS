import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Extract the file path from the stored URL
    // The audio_url is stored as the full public URL, we need to extract the path
    const audioUrl = call.audio_url
    if (!audioUrl) {
      return NextResponse.json({ error: 'No audio file' }, { status: 404 })
    }

    // Extract path from URL: https://xxx.supabase.co/storage/v1/object/public/call-recordings/tenant-id/filename
    const pathMatch = audioUrl.match(/call-recordings\/(.+)$/)
    if (!pathMatch) {
      return NextResponse.json({ error: 'Invalid audio path' }, { status: 400 })
    }

    const filePath = pathMatch[1]

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

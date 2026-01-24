import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DEMO_TENANT_ID } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Generate unique file path
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${DEMO_TENANT_ID}/${Date.now()}-${sanitizedName}`

    // Create signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('call-recordings')
      .createSignedUploadUrl(filePath)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: filePath,
      token: data.token,
    })
  } catch (error) {
    console.error('Upload URL API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

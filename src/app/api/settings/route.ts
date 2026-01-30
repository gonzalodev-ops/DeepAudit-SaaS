import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromRequest } from '@/lib/auth/session'
import { AuditCriterion } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request)
    const supabase = await createServiceClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (error) {
      console.error('Error fetching tenant:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request)
    const body = await request.json()
    const { name, industry, manual_text, audit_criteria, default_processing_mode } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre de la empresa es requerido' }, { status: 400 })
    }

    // Validate audit_criteria if provided
    if (audit_criteria && Array.isArray(audit_criteria)) {
      // Validate weights sum to 100%
      const totalWeight = audit_criteria.reduce((sum: number, c: AuditCriterion) => sum + (c.weight || 0), 0)
      if (audit_criteria.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
        return NextResponse.json(
          { error: `Los pesos de los criterios deben sumar 100%. Actualmente suman ${totalWeight}%` },
          { status: 400 }
        )
      }

      // Validate each criterion
      for (const criterion of audit_criteria) {
        if (!criterion.id || !criterion.name || typeof criterion.weight !== 'number') {
          return NextResponse.json(
            { error: 'Cada criterio debe tener id, nombre y peso' },
            { status: 400 }
          )
        }
        if (criterion.weight < 0 || criterion.weight > 100) {
          return NextResponse.json(
            { error: 'El peso de cada criterio debe estar entre 0 y 100' },
            { status: 400 }
          )
        }
      }
    }

    // Validate processing mode if provided
    if (default_processing_mode && !['full', 'compliance'].includes(default_processing_mode)) {
      return NextResponse.json(
        { error: 'Modo de procesamiento invalido. Debe ser "full" o "compliance"' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Build update object with only provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      name: name.trim(),
      updated_at: new Date().toISOString(),
    }

    if (industry !== undefined) {
      updateData.industry = industry?.trim() || null
    }

    if (manual_text !== undefined) {
      updateData.manual_text = manual_text?.trim() || null
    }

    if (audit_criteria !== undefined) {
      updateData.audit_criteria = audit_criteria
    }

    if (default_processing_mode !== undefined) {
      updateData.default_processing_mode = default_processing_mode
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating tenant:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

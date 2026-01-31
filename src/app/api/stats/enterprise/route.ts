import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromRequest } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request)
    const supabase = await createServiceClient()

    // Get all audits for the tenant
    const { data: audits, error } = await supabase
      .from('audits')
      .select(`
        legal_risk_level,
        call_outcome,
        call_scenario,
        calls!inner(tenant_id)
      `)
      .eq('calls.tenant_id', tenantId)

    if (error) {
      console.error('Error fetching audits:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // Calculate stats
    const stats = {
      criticalAlerts: 0,
      highRiskAlerts: 0,
      mediumRiskAlerts: 0,
      retainedClients: 0,
      churnedClients: 0,
      scenarioBreakdown: {
        retention: 0,
        cancellation: 0,
        dispute: 0,
        collection: 0,
        support: 0,
        sales: 0,
      } as Record<string, number>,
    }

    for (const audit of audits || []) {
      // Risk level counts
      switch (audit.legal_risk_level) {
        case 'critical':
          stats.criticalAlerts++
          break
        case 'high':
          stats.highRiskAlerts++
          break
        case 'medium':
          stats.mediumRiskAlerts++
          break
      }

      // Outcome counts
      switch (audit.call_outcome) {
        case 'retained':
          stats.retainedClients++
          break
        case 'churned':
          stats.churnedClients++
          break
      }

      // Scenario breakdown
      if (audit.call_scenario && audit.call_scenario in stats.scenarioBreakdown) {
        stats.scenarioBreakdown[audit.call_scenario]++
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { DEMO_TENANT_ID } from '@/lib/constants'

// Constantes para cálculos (consistente con CostsSummaryCard)
const USD_TO_MXN = 20
const INFRASTRUCTURE_OVERHEAD = 0.30 // 30% overhead para hosting, storage, bandwidth
const HUMAN_AUDIT_COST_MXN = 50 // Costo promedio de auditoría humana
const HUMAN_AUDIT_PERCENTAGE = 1.5 // % que audita un humano (estándar industria 1-2%)
const AI_AUDIT_PERCENTAGE = 100 // % que audita la IA

export async function GET() {
  try {
    const supabase = await createServiceClient()

    // Obtener estadísticas de costos de auditorías
    const { data: audits, error } = await supabase
      .from('audits')
      .select('cost_usd, calls!inner(tenant_id)')
      .eq('calls.tenant_id', DEMO_TENANT_ID)
      .not('cost_usd', 'is', null)

    if (error) {
      console.error('Error fetching audit costs:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const totalAudits = audits?.length || 0
    const totalCostUsd = audits?.reduce((sum: number, a: { cost_usd: number | null }) => sum + (a.cost_usd || 0), 0) || 0

    // Agregar overhead de infraestructura (consistente con CostsSummaryCard)
    const totalCostWithOverhead = totalCostUsd * (1 + INFRASTRUCTURE_OVERHEAD)
    const avgCostUsd = totalAudits > 0 ? totalCostWithOverhead / totalAudits : 0
    const avgCostMxn = avgCostUsd * USD_TO_MXN

    // Cálculos de Unit Economics
    // 641x = cuántas auditorías IA puedes hacer por el costo de 1 auditoría humana
    const humanCapacityRatio = avgCostMxn > 0
      ? Math.round(HUMAN_AUDIT_COST_MXN / avgCostMxn)  // $50 / $0.078 ≈ 641x
      : 641 // Default del PRD
    const operationalSavingsPct = avgCostMxn > 0
      ? ((1 - (avgCostMxn / HUMAN_AUDIT_COST_MXN)) * 100)
      : 99.8 // Default del PRD

    // Costo total si fuera humano
    const humanTotalCostMxn = totalAudits * HUMAN_AUDIT_COST_MXN
    const aiTotalCostMxn = totalCostWithOverhead * USD_TO_MXN
    const savingsMxn = humanTotalCostMxn - aiTotalCostMxn

    return NextResponse.json({
      // Métricas principales
      avg_cost_per_audit_usd: Number(avgCostUsd.toFixed(4)),
      avg_cost_per_audit_mxn: Number(avgCostMxn.toFixed(2)),
      human_audit_cost_mxn: HUMAN_AUDIT_COST_MXN,

      // Comparativas
      human_capacity_ratio: Number(humanCapacityRatio.toFixed(1)),
      operational_savings_pct: Number(operationalSavingsPct.toFixed(2)),

      // Totales
      total_audits: totalAudits,
      total_cost_usd: Number(totalCostUsd.toFixed(4)),
      total_cost_mxn: Number(aiTotalCostMxn.toFixed(2)),

      // Ahorros
      human_total_cost_mxn: humanTotalCostMxn,
      savings_mxn: Number(savingsMxn.toFixed(2)),

      // Metadata
      usd_to_mxn_rate: USD_TO_MXN,
    })
  } catch (error) {
    console.error('Unit economics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

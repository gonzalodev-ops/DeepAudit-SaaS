import { Header } from '@/components/dashboard/header'
import { createServiceClient } from '@/lib/supabase/server'
import { DEMO_TENANT_ID } from '@/lib/constants'
import { isEnterpriseMode } from '@/lib/feature-flags'
import { UnitEconomicsCard } from '@/components/enterprise/unit-economics-card'
import { PricingCalculator } from '@/components/enterprise/pricing-calculator'
import { CostsSummaryCard } from '@/components/dashboard/costs-summary-card'
import { Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface AuditWithCalls {
  cost_usd: number | null
  total_tokens: number | null
  call_id: string
  calls: {
    tenant_id: string
    duration_seconds: number | null
    status: string
  } | null
}

async function getReportStats() {
  const supabase = await createServiceClient()

  // Obtener datos de auditorías con costos
  const { data: audits } = await supabase
    .from('audits')
    .select(`
      cost_usd,
      total_tokens,
      call_id,
      calls!inner(tenant_id, duration_seconds, status)
    `)
    .eq('calls.tenant_id', DEMO_TENANT_ID)

  const completedAudits = (audits as AuditWithCalls[] | null)?.filter(a => a.calls?.status === 'completed') || []

  // Calcular métricas de costos
  const costs = completedAudits
    .map(a => a.cost_usd)
    .filter((c): c is number => c !== null && c !== undefined)

  const totalCostUSD = costs.reduce((sum, c) => sum + c, 0)
  const avgCostPerCall = costs.length > 0 ? totalCostUSD / costs.length : 0

  // Calcular tokens
  const totalTokens = completedAudits.reduce((sum, a) => sum + (a.total_tokens || 0), 0)
  const avgTokens = completedAudits.length > 0 ? Math.round(totalTokens / completedAudits.length) : 0

  // Calcular minutos totales
  const totalMinutes = completedAudits.reduce((sum, a) => {
    const duration = a.calls?.duration_seconds
    return sum + (duration ? duration / 60 : 0)
  }, 0)

  const costPerMinuteUSD = totalMinutes > 0 ? totalCostUSD / totalMinutes : 0

  return {
    totalCalls: completedAudits.length,
    totalCostUSD,
    avgCostPerCall,
    costPerMinuteUSD,
    totalTokens,
    avgTokens,
    totalMinutes,
  }
}

export default async function ReportesPage() {
  const stats = await getReportStats()
  const isEnterprise = isEnterpriseMode()

  return (
    <div className="flex flex-col">
      <Header title="Impacto Financiero" description="ROI y eficiencia operativa de tu inversión" />
      <div className="p-6 space-y-6">
        {/* Sección 1: Unit Economics - Eficiencia Operativa (Enterprise) */}
        {isEnterprise && <UnitEconomicsCard />}

        {/* Sección 2: Calculadora de Pricing (Enterprise) */}
        {isEnterprise && <PricingCalculator />}

        {/* Sección 3: Desglose de Costos (Colapsable) */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Ver desglose detallado de costos</span>
            <span className="ml-auto text-muted-foreground text-xs group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-4">
            <CostsSummaryCard
              totalCostUSD={stats.totalCostUSD}
              avgCostPerCall={stats.avgCostPerCall}
              costPerMinuteUSD={stats.costPerMinuteUSD}
              totalCalls={stats.totalCalls}
              totalTokens={stats.totalTokens}
              avgTokens={stats.avgTokens}
              totalMinutes={stats.totalMinutes}
            />
          </div>
        </details>
      </div>
    </div>
  )
}

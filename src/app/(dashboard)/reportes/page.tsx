import { Header } from '@/components/dashboard/header'
import { createServiceClient } from '@/lib/supabase/server'
import { DEMO_TENANT_ID } from '@/lib/constants'
import { isEnterpriseMode } from '@/lib/feature-flags'
import { UnitEconomicsCard } from '@/components/enterprise/unit-economics-card'
import { CostsSummaryCard } from '@/components/dashboard/costs-summary-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, PieChart } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface AuditWithCalls {
  overall_score: number | null
  cost_usd: number | null
  total_tokens: number | null
  input_tokens: number | null
  output_tokens: number | null
  call_id: string
  legal_risk_level: string | null
  call_outcome: string | null
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
      overall_score,
      cost_usd,
      total_tokens,
      input_tokens,
      output_tokens,
      call_id,
      legal_risk_level,
      call_outcome,
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

  // Calcular scores promedio
  const scores = completedAudits
    .map(a => a.overall_score)
    .filter((s): s is number => s !== null && s !== undefined)
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0

  // Distribución de riesgo legal
  const riskDistribution = {
    critical: completedAudits.filter(a => a.legal_risk_level === 'critical').length,
    high: completedAudits.filter(a => a.legal_risk_level === 'high').length,
    medium: completedAudits.filter(a => a.legal_risk_level === 'medium').length,
    safe: completedAudits.filter(a => a.legal_risk_level === 'safe').length,
  }

  // Distribución de resultados
  const outcomeDistribution = {
    retained: completedAudits.filter(a => a.call_outcome === 'retained').length,
    churned: completedAudits.filter(a => a.call_outcome === 'churned').length,
    escalated: completedAudits.filter(a => a.call_outcome === 'escalated').length,
    pending: completedAudits.filter(a => a.call_outcome === 'pending').length,
  }

  return {
    totalCalls: completedAudits.length,
    totalCostUSD,
    avgCostPerCall,
    costPerMinuteUSD,
    totalTokens,
    avgTokens,
    totalMinutes,
    avgScore,
    riskDistribution,
    outcomeDistribution,
  }
}

export default async function ReportesPage() {
  const stats = await getReportStats()
  const isEnterprise = isEnterpriseMode()

  return (
    <div className="flex flex-col">
      <Header title="Reportes" />
      <div className="p-6 space-y-6">
        {/* Resumen de Costos */}
        <CostsSummaryCard
          totalCostUSD={stats.totalCostUSD}
          avgCostPerCall={stats.avgCostPerCall}
          costPerMinuteUSD={stats.costPerMinuteUSD}
          totalCalls={stats.totalCalls}
          totalTokens={stats.totalTokens}
          avgTokens={stats.avgTokens}
          totalMinutes={stats.totalMinutes}
        />

        {/* Unit Economics - Solo en modo Enterprise */}
        {isEnterprise && <UnitEconomicsCard />}

        {/* Métricas adicionales en Enterprise */}
        {isEnterprise && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Distribución de Riesgo Legal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-orange-500" />
                  Distribucion de Riesgo Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      Critico
                    </span>
                    <span className="font-semibold">{stats.riskDistribution.critical}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-500" />
                      Alto
                    </span>
                    <span className="font-semibold">{stats.riskDistribution.high}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500" />
                      Medio
                    </span>
                    <span className="font-semibold">{stats.riskDistribution.medium}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      Seguro
                    </span>
                    <span className="font-semibold">{stats.riskDistribution.safe}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distribución de Resultados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Resultados de Llamadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                      Retenidos
                    </span>
                    <span className="font-semibold text-green-600">{stats.outcomeDistribution.retained}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      Perdidos (Churn)
                    </span>
                    <span className="font-semibold text-red-600">{stats.outcomeDistribution.churned}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      Escalados
                    </span>
                    <span className="font-semibold">{stats.outcomeDistribution.escalated}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gray-400" />
                      Pendientes
                    </span>
                    <span className="font-semibold">{stats.outcomeDistribution.pending}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Score Promedio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Rendimiento General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-emerald-600">{stats.avgScore.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Score Promedio</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{stats.totalCalls}</p>
                <p className="text-sm text-muted-foreground">Llamadas Auditadas</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">{stats.totalMinutes.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Minutos Procesados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

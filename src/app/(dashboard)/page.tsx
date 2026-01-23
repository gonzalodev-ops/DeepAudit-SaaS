import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { CallsTable } from '@/components/calls/calls-table'
import { CallsFilters } from '@/components/calls/calls-filters'
import { CostComparisonCard } from '@/components/dashboard/cost-comparison-card'
import { CostsSummaryCard } from '@/components/dashboard/costs-summary-card'
import { parseFiltersFromParams } from '@/lib/filters'
import { CallFilters } from '@/types/filters'

// Force dynamic rendering - requires database connection at runtime
export const dynamic = 'force-dynamic'

// Costo estimado por defecto si no hay datos reales
const DEFAULT_COST_PER_CALL_USD = 0.002

async function getStats() {
  const supabase = await createServiceClient()

  const [callsResult, completedResult, pendingResult] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact', head: true }),
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  // Obtener scores y datos de tokens
  const auditDataResult = await supabase
    .from('audits')
    .select('overall_score, cost_usd, total_tokens, input_tokens, output_tokens, call_id')

  // Obtener duraciones de las llamadas completadas
  const callsWithDuration = await supabase
    .from('calls')
    .select('id, duration_seconds')
    .eq('status', 'completed')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audits = auditDataResult.data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callsDuration = callsWithDuration.data || []

  // Crear mapa de duraciones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const durationMap = new Map(callsDuration.map((c: any) => [c.id, c.duration_seconds]))

  // Calcular score promedio
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scores = audits.map((a: any) => a.overall_score).filter(Boolean) as number[]
  const avgScore = scores.length > 0
    ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1)
    : '0'

  // Calcular costo real basado en datos de tokens
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const costs = audits.map((a: any) => a.cost_usd).filter((c: number | null) => c !== null) as number[]
  const totalCostUSD = costs.reduce((a: number, b: number) => a + b, 0)
  const avgCostPerCall = costs.length > 0 ? totalCostUSD / costs.length : DEFAULT_COST_PER_CALL_USD

  // Calcular tokens totales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalTokens = audits.reduce((sum: number, a: any) => sum + (a.total_tokens || 0), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avgTokens = audits.length > 0 ? Math.round(totalTokens / audits.length) : 0

  // Calcular costo por minuto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let totalMinutes = 0
  let costForMinuteCalc = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  audits.forEach((audit: any) => {
    const duration = durationMap.get(audit.call_id)
    if (duration && audit.cost_usd) {
      totalMinutes += duration / 60
      costForMinuteCalc += audit.cost_usd
    }
  })
  const costPerMinuteUSD = totalMinutes > 0 ? costForMinuteCalc / totalMinutes : 0

  return {
    totalCalls: callsResult.count || 0,
    completedAudits: completedResult.count || 0,
    pendingAudits: pendingResult.count || 0,
    avgScore: parseFloat(avgScore),
    totalCostUSD,
    avgCostPerCall,
    totalTokens,
    avgTokens,
    totalMinutes,
    costPerMinuteUSD,
  }
}

async function getRecentCalls(filters: CallFilters) {
  const supabase = await createServiceClient()

  // Build query with filters
  let query = supabase
    .from('calls')
    .select(`
      *,
      agent:users(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(50) // Increased limit to allow for filtering

  // Apply status filter
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  // Apply date filter
  if (filters.dateFrom) {
    query = query.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`)
  }

  const { data: calls } = await query

  if (!calls) return []

  // Get audits for these calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callIds = calls.map((c: any) => c.id)
  const { data: audits } = await supabase
    .from('audits')
    .select('*')
    .in('call_id', callIds)

  // Map calls with audits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result = calls.map((call: any) => ({
    ...call,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audit: audits?.find((a: any) => a.call_id === call.id) || null
  }))

  // Apply score filter (must be done after joining with audits)
  if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = result.filter((call: any) => {
      // If no audit, we can't filter by score - exclude from filtered results
      if (!call.audit || call.audit.overall_score === null) {
        return false
      }
      const score = call.audit.overall_score
      const minOk = filters.scoreMin === undefined || score >= filters.scoreMin
      const maxOk = filters.scoreMax === undefined || score <= filters.scoreMax
      return minOk && maxOk
    })
  }

  // Limit to 10 results for display
  return result.slice(0, 10)
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const filters = parseFiltersFromParams(resolvedParams)

  const stats = await getStats()
  const recentCalls = await getRecentCalls(filters)

  // Solo 4 KPIs principales arriba
  const statCards = [
    {
      title: 'Total Llamadas',
      value: stats.totalCalls,
      icon: Phone,
      color: 'text-blue-500',
    },
    {
      title: 'Auditorias Completadas',
      value: stats.completedAudits,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Pendientes',
      value: stats.pendingAudits,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'Score Promedio',
      value: `${stats.avgScore}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        description="Resumen de auditorias de llamadas"
      />

      <div className="p-6 space-y-6">
        {/* KPIs principales - 4 cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Costos consolidados con overhead */}
        <CostsSummaryCard
          totalCostUSD={stats.totalCostUSD}
          avgCostPerCall={stats.avgCostPerCall}
          costPerMinuteUSD={stats.costPerMinuteUSD}
          totalCalls={stats.completedAudits}
          totalTokens={stats.totalTokens}
          avgTokens={stats.avgTokens}
          totalMinutes={stats.totalMinutes}
        />

        {/* Comparativa vs QA Humano */}
        <CostComparisonCard
          totalCostUSD={stats.totalCostUSD}
          totalCalls={stats.completedAudits}
          avgCostPerCall={stats.avgCostPerCall}
        />

        {/* Recent Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Llamadas Recientes</CardTitle>
            <CallsFilters />
          </CardHeader>
          <CardContent>
            <CallsTable calls={recentCalls} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

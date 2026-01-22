import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, CheckCircle, Clock, TrendingUp, Cpu } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { CallsTable } from '@/components/calls/calls-table'
import { CostComparisonCard } from '@/components/dashboard/cost-comparison-card'

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
    .select('overall_score, cost_usd, total_tokens, input_tokens, output_tokens')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audits = auditDataResult.data || []

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

  return {
    totalCalls: callsResult.count || 0,
    completedAudits: completedResult.count || 0,
    pendingAudits: pendingResult.count || 0,
    avgScore: parseFloat(avgScore),
    totalCostUSD,
    avgCostPerCall,
    totalTokens,
    avgTokens,
  }
}

async function getRecentCalls() {
  const supabase = await createServiceClient()

  const { data: calls } = await supabase
    .from('calls')
    .select(`
      *,
      agent:users(id, full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!calls) return []

  // Get audits for these calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callIds = calls.map((c: any) => c.id)
  const { data: audits } = await supabase
    .from('audits')
    .select('*')
    .in('call_id', callIds)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return calls.map((call: any) => ({
    ...call,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audit: audits?.find((a: any) => a.call_id === call.id) || null
  }))
}

export default async function DashboardPage() {
  const stats = await getStats()
  const recentCalls = await getRecentCalls()

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
    {
      title: 'Tokens Promedio',
      value: stats.avgTokens.toLocaleString(),
      icon: Cpu,
      color: 'text-cyan-500',
      subtitle: `Total: ${stats.totalTokens.toLocaleString()}`,
    },
  ]

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        description="Resumen de auditorias de llamadas"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                {'subtitle' in stat && stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cost Comparison Card */}
        <CostComparisonCard
          totalCostUSD={stats.totalCostUSD}
          totalCalls={stats.completedAudits}
          avgCostPerCall={stats.avgCostPerCall}
        />

        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle>Llamadas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <CallsTable calls={recentCalls} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

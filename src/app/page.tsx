import { Header } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, CheckCircle, Clock, TrendingUp, DollarSign } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { CallsTable } from '@/components/calls/calls-table'

// Force dynamic rendering - requires database connection at runtime
export const dynamic = 'force-dynamic'

// Costo estimado por llamada basado en Gemini 2.5 Flash
// ~10,500 tokens promedio por llamada
// Input: $0.15/1M tokens, Output: $0.60/1M tokens (cacheable)
const COST_PER_CALL_USD = 0.002

async function getStats() {
  const supabase = await createServiceClient()

  const [callsResult, completedResult, pendingResult] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact', head: true }),
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const avgScoreResult = await supabase
    .from('audits')
    .select('overall_score')
    .not('overall_score', 'is', null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scores = avgScoreResult.data?.map((a: any) => a.overall_score).filter(Boolean) as number[] || []
  const avgScore = scores.length > 0
    ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1)
    : '0'

  // Calcular costo estimado
  const completedCount = completedResult.count || 0
  const estimatedCost = (completedCount * COST_PER_CALL_USD).toFixed(3)

  return {
    totalCalls: callsResult.count || 0,
    completedAudits: completedCount,
    pendingAudits: pendingResult.count || 0,
    avgScore: parseFloat(avgScore),
    estimatedCostUSD: parseFloat(estimatedCost),
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
      title: 'Costo Estimado IA',
      value: `$${stats.estimatedCostUSD} USD`,
      icon: DollarSign,
      color: 'text-emerald-500',
      subtitle: `~$${COST_PER_CALL_USD}/llamada`,
    },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
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
      </main>
    </div>
  )
}

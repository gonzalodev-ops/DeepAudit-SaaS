'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  Clock,
  DollarSign,
  Phone,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react'

interface OperationsData {
  summary: {
    total_calls: number
    completed_audits: number
    total_processing_steps: number
    failed_steps: number
    success_rate: number
  }
  audio: {
    total_seconds: number
    total_minutes: number
    calls_with_audio: number
  }
  costs: {
    total_usd: number
    total_mxn: number
    by_step: Record<string, { total_cost_usd: number; count: number; avg_duration_ms: number }>
  }
  tokens: {
    total_input: number
    total_output: number
    total: number
  }
  providers: Record<string, number>
  recent_activity: Array<{
    step: string
    status: string
    provider: string
    cost_usd: number | null
    duration_ms: number | null
    created_at: string
  }>
}

function formatNumber(n: number): string {
  return n.toLocaleString('es-MX')
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function stepLabel(step: string): string {
  const labels: Record<string, string> = {
    stt: 'Speech-to-Text',
    silence_detection: 'Deteccion de Silencios',
    llm_evaluation: 'Evaluacion IA (Gemini)',
  }
  return labels[step] || step
}

function statusBadge(status: string) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" /> Completado
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" /> Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      <Activity className="h-3 w-3" /> {status}
    </span>
  )
}

export default function OperacionesPage() {
  const [data, setData] = useState<OperationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stats/operations')
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar datos')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Operaciones</h1>
          <p className="text-muted-foreground">Metricas de uso del pipeline</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Operaciones</h1>
          <p className="text-muted-foreground">Metricas de uso del pipeline</p>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>{error || 'No hay datos disponibles'}</p>
            <p className="text-sm mt-2">Los datos apareceran cuando se procesen llamadas.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kpis = [
    {
      label: 'Llamadas',
      value: formatNumber(data.summary.total_calls),
      sub: `${formatNumber(data.summary.completed_audits)} auditadas`,
      icon: Phone,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Minutos de Audio',
      value: data.audio.total_minutes.toFixed(1),
      sub: `${formatNumber(data.audio.calls_with_audio)} con STT`,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Costo Total',
      value: `$${data.costs.total_usd.toFixed(2)} USD`,
      sub: `$${formatNumber(data.costs.total_mxn)} MXN`,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Tokens Usados',
      value: formatNumber(data.tokens.total),
      sub: `${formatNumber(data.tokens.total_input)} in / ${formatNumber(data.tokens.total_output)} out`,
      icon: Cpu,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Operaciones</h1>
        <p className="text-muted-foreground">Metricas de uso del pipeline de procesamiento</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cost by Pipeline Step */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Costo por Paso del Pipeline
            </CardTitle>
            <CardDescription>
              Desglose de costos y tiempos por etapa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(data.costs.by_step).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos de pipeline aun</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(data.costs.by_step).map(([step, info]) => (
                  <div key={step} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{stepLabel(step)}</p>
                      <p className="text-xs text-muted-foreground">
                        {info.count} ejecuciones | ~{formatDuration(info.avg_duration_ms)} promedio
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${info.total_cost_usd.toFixed(4)} USD</p>
                      <p className="text-xs text-muted-foreground">
                        ${(info.total_cost_usd / Math.max(info.count, 1)).toFixed(4)}/ejecucion
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Uso por Proveedor
            </CardTitle>
            <CardDescription>
              Llamadas a APIs externas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(data.providers).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos de proveedores aun</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.providers).map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{provider}</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                      {formatNumber(count)} llamadas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Rate + Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Success Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tasa de Exito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-green-600">
                {data.summary.success_rate}%
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{formatNumber(data.summary.total_processing_steps)} pasos totales</p>
                <p>{formatNumber(data.summary.failed_steps)} errores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.recent_activity.map((activity, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      {statusBadge(activity.status)}
                      <span className="text-muted-foreground">{stepLabel(activity.step)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activity.duration_ms ? formatDuration(activity.duration_ms) : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

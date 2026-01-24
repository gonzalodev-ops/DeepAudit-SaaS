'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, TrendingUp, Zap, DollarSign } from 'lucide-react'

interface UnitEconomicsData {
  avg_cost_per_audit_mxn: number
  human_audit_cost_mxn: number
  human_capacity_ratio: number
  operational_savings_pct: number
  total_audits: number
  total_cost_mxn: number
  human_total_cost_mxn: number
  savings_mxn: number
}

export function UnitEconomicsCard() {
  const [data, setData] = useState<UnitEconomicsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats/unit-economics')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Unit Economics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const metrics = [
    {
      label: 'Costo por Auditoria IA',
      value: `$${data.avg_cost_per_audit_mxn.toFixed(2)} MXN`,
      comparison: `vs $${data.human_audit_cost_mxn} MXN auditor humano`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Multiplicador de Eficiencia',
      value: `${data.human_capacity_ratio}x`,
      comparison: `${data.human_capacity_ratio}x vs auditoria manual`,
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Ahorro Operativo',
      value: `${data.operational_savings_pct.toFixed(1)}%`,
      comparison: `$${data.savings_mxn.toLocaleString()} MXN vs auditoria manual`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-[var(--enterprise-primary)]" />
          Eficiencia Operativa
        </CardTitle>
        <CardDescription>
          Por menos del costo de 1 auditor QA, procesa {data.total_audits.toLocaleString()} auditorias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-lg p-4 ${metric.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </span>
              </div>
              <p className={`text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.comparison}
              </p>
            </div>
          ))}
        </div>

        {/* Resumen de costos */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Costo total IA</p>
              <p className="font-semibold">${data.total_cost_mxn.toLocaleString()} MXN</p>
            </div>
            <div>
              <p className="text-muted-foreground">Costo equivalente humano</p>
              <p className="font-semibold">${data.human_total_cost_mxn.toLocaleString()} MXN</p>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}

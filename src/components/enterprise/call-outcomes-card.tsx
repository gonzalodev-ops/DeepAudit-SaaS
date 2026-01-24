'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface OutcomeDistribution {
  retained: number
  churned: number
  escalated: number
  pending: number
}

interface CallOutcomesCardProps {
  distribution: OutcomeDistribution
}

export function CallOutcomesCard({ distribution }: CallOutcomesCardProps) {
  const total = distribution.retained + distribution.churned + distribution.escalated + distribution.pending

  const getPercentage = (value: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.retained)}</span>
              <span className="font-semibold text-green-600 min-w-[2ch] text-right">{distribution.retained}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Perdidos (Churn)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.churned)}</span>
              <span className="font-semibold text-red-600 min-w-[2ch] text-right">{distribution.churned}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Escalados
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.escalated)}</span>
              <span className="font-semibold text-blue-600 min-w-[2ch] text-right">{distribution.escalated}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              Pendientes
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.pending)}</span>
              <span className="font-semibold text-gray-600 min-w-[2ch] text-right">{distribution.pending}</span>
            </div>
          </div>
        </div>

        {/* Visual bar */}
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
          {distribution.retained > 0 && (
            <div
              className="bg-green-500 h-full"
              style={{ width: getPercentage(distribution.retained) }}
            />
          )}
          {distribution.churned > 0 && (
            <div
              className="bg-red-500 h-full"
              style={{ width: getPercentage(distribution.churned) }}
            />
          )}
          {distribution.escalated > 0 && (
            <div
              className="bg-blue-500 h-full"
              style={{ width: getPercentage(distribution.escalated) }}
            />
          )}
          {distribution.pending > 0 && (
            <div
              className="bg-gray-400 h-full"
              style={{ width: getPercentage(distribution.pending) }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

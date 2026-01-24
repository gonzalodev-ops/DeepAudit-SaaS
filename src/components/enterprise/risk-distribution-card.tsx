'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart } from 'lucide-react'

interface RiskDistribution {
  critical: number
  high: number
  medium: number
  safe: number
}

interface RiskDistributionCardProps {
  distribution: RiskDistribution
}

export function RiskDistributionCard({ distribution }: RiskDistributionCardProps) {
  const total = distribution.critical + distribution.high + distribution.medium + distribution.safe

  const getPercentage = (value: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-orange-500" />
          Distribución de Riesgo Legal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              Crítico
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.critical)}</span>
              <span className="font-semibold text-red-600 min-w-[2ch] text-right">{distribution.critical}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              Alto
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.high)}</span>
              <span className="font-semibold text-orange-600 min-w-[2ch] text-right">{distribution.high}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              Medio
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.medium)}</span>
              <span className="font-semibold text-yellow-600 min-w-[2ch] text-right">{distribution.medium}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Seguro
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{getPercentage(distribution.safe)}</span>
              <span className="font-semibold text-green-600 min-w-[2ch] text-right">{distribution.safe}</span>
            </div>
          </div>
        </div>

        {/* Visual bar */}
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
          {distribution.critical > 0 && (
            <div
              className="bg-red-500 h-full"
              style={{ width: getPercentage(distribution.critical) }}
            />
          )}
          {distribution.high > 0 && (
            <div
              className="bg-orange-500 h-full"
              style={{ width: getPercentage(distribution.high) }}
            />
          )}
          {distribution.medium > 0 && (
            <div
              className="bg-yellow-500 h-full"
              style={{ width: getPercentage(distribution.medium) }}
            />
          )}
          {distribution.safe > 0 && (
            <div
              className="bg-green-500 h-full"
              style={{ width: getPercentage(distribution.safe) }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

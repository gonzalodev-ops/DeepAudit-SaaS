'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Cpu, Timer, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Overhead para hosting, storage, bandwidth (30% conservador)
const INFRASTRUCTURE_OVERHEAD = 0.30

// Tipo de cambio
const USD_TO_MXN = 20

interface CostsSummaryCardProps {
  totalCostUSD: number
  avgCostPerCall: number
  costPerMinuteUSD: number
  totalCalls: number
  totalTokens: number
  avgTokens: number
  totalMinutes: number
}

export function CostsSummaryCard({
  totalCostUSD,
  avgCostPerCall,
  costPerMinuteUSD,
  totalCalls,
  totalTokens,
  avgTokens,
  totalMinutes,
}: CostsSummaryCardProps) {
  // Calcular costos con overhead
  const totalWithOverhead = totalCostUSD * (1 + INFRASTRUCTURE_OVERHEAD)
  const avgPerCallWithOverhead = avgCostPerCall * (1 + INFRASTRUCTURE_OVERHEAD)
  const perMinuteWithOverhead = costPerMinuteUSD * (1 + INFRASTRUCTURE_OVERHEAD)

  // Convertir a MXN
  const totalMXN = totalWithOverhead * USD_TO_MXN
  const avgPerCallMXN = avgPerCallWithOverhead * USD_TO_MXN
  const perMinuteMXN = perMinuteWithOverhead * USD_TO_MXN

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Costos de Procesamiento
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-muted-foreground">
                  <Info className="h-3 w-3 mr-1" />
                  +30% infra
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Incluye estimación de costos de infraestructura: storage (~5MB/audio),
                  hosting, base de datos y bandwidth. Este overhead es conservador para
                  garantizar que los costos reales no excedan el estimado.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Costo Total */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Costo Total ({totalCalls} llamadas)</p>
            <p className="text-2xl font-bold text-emerald-600">
              ${totalMXN.toFixed(2)} MXN
            </p>
            <p className="text-xs text-muted-foreground">
              ${totalWithOverhead.toFixed(4)} USD
            </p>
            <p className="text-xs text-muted-foreground/70">
              IA: ${totalCostUSD.toFixed(4)} + Infra: ${(totalCostUSD * INFRASTRUCTURE_OVERHEAD).toFixed(4)}
            </p>
          </div>

          {/* Costo por Llamada */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Costo por Llamada</p>
            <p className="text-2xl font-bold text-blue-600">
              ${avgPerCallMXN.toFixed(2)} MXN
            </p>
            <p className="text-xs text-muted-foreground">
              ${avgPerCallWithOverhead.toFixed(4)} USD
            </p>
            <p className="text-xs text-muted-foreground/70">
              ~{Math.round(totalMinutes / (totalCalls || 1) * 60)} seg promedio
            </p>
          </div>

          {/* Costo por Minuto */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Timer className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-muted-foreground">Costo por Minuto</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ${perMinuteMXN.toFixed(2)} MXN
            </p>
            <p className="text-xs text-muted-foreground">
              ${perMinuteWithOverhead.toFixed(4)} USD/min
            </p>
            <p className="text-xs text-muted-foreground/70">
              {totalMinutes.toFixed(1)} min procesados
            </p>
          </div>
        </div>

        {/* Tokens info */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cpu className="h-4 w-4 text-cyan-500" />
            <span>Tokens: {avgTokens.toLocaleString('en-US')} promedio</span>
            <span className="text-muted-foreground/50">|</span>
            <span>{totalTokens.toLocaleString('en-US')} total</span>
          </div>
          <p className="text-xs text-muted-foreground">
            TC: $20 MXN = $1 USD
          </p>
        </div>

        {/* Nota explicativa */}
        <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
          <strong>Nota:</strong> Costo base de IA (Gemini 2.5 Flash) + 30% de overhead por infraestructura
          (storage, hosting, bandwidth) = costo total mostrado.
        </div>
      </CardContent>
    </Card>
  )
}

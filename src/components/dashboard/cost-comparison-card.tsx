'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Cpu, Users, TrendingDown, Zap } from 'lucide-react'

// Configuracion base QA humano (hardcoded por ahora, configurable en settings despues)
const QA_CONFIG = {
  monthlySalaryMXN: 30000, // Costo total empleador
  callsPerHour: 5, // Promedio entre 4-6
  hoursPerMonth: 160, // 40 horas/semana * 4 semanas
}

// Tipo de cambio aproximado
const MXN_TO_USD = 0.058

interface CostComparisonCardProps {
  totalCostUSD: number
  totalCalls: number
  avgCostPerCall: number
}

export function CostComparisonCard({
  totalCostUSD,
  totalCalls,
  avgCostPerCall,
}: CostComparisonCardProps) {
  // Calculos QA humano
  const qaMonthlyCostUSD = QA_CONFIG.monthlySalaryMXN * MXN_TO_USD
  const qaCallsPerMonth = QA_CONFIG.callsPerHour * QA_CONFIG.hoursPerMonth
  const qaCostPerCallUSD = qaMonthlyCostUSD / qaCallsPerMonth
  const qaCostPerCallMXN = QA_CONFIG.monthlySalaryMXN / qaCallsPerMonth

  // Costo IA en MXN
  const totalCostMXN = totalCostUSD / MXN_TO_USD
  const avgCostPerCallMXN = avgCostPerCall / MXN_TO_USD

  // Ahorro
  const savingsPerCall = qaCostPerCallUSD - avgCostPerCall
  const savingsPercentage = ((savingsPerCall / qaCostPerCallUSD) * 100).toFixed(1)

  // Capacidad: cuantas llamadas podria procesar IA con presupuesto de 1 QA
  const iaCallsWithQABudget = Math.floor(qaMonthlyCostUSD / (avgCostPerCall || 0.002))

  // Costo equivalente QA para las llamadas procesadas
  const equivalentQACostUSD = totalCalls * qaCostPerCallUSD
  const equivalentQACostMXN = totalCalls * qaCostPerCallMXN

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-emerald-500" />
            Comparativa de Costos: IA vs QA Humano
          </CardTitle>
          <Badge variant="outline" className="text-emerald-600 border-emerald-600">
            {savingsPercentage}% ahorro
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Columna IA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-blue-600">DeepAudit IA</h3>
            </div>

            <div className="space-y-3 pl-7">
              <div>
                <p className="text-sm text-muted-foreground">Costo Total ({totalCalls} llamadas)</p>
                <p className="text-xl font-bold">
                  ${totalCostUSD.toFixed(4)} USD
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (${totalCostMXN.toFixed(2)} MXN)
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Costo por Llamada</p>
                <p className="text-lg font-semibold">
                  ${avgCostPerCall.toFixed(4)} USD
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (${avgCostPerCallMXN.toFixed(2)} MXN)
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Capacidad con presupuesto QA</p>
                <p className="text-lg font-semibold text-emerald-600">
                  ~{iaCallsWithQABudget.toLocaleString()} llamadas/mes
                </p>
              </div>
            </div>
          </div>

          {/* Columna QA Humano */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-orange-600">QA Humano (1 analista)</h3>
            </div>

            <div className="space-y-3 pl-7">
              <div>
                <p className="text-sm text-muted-foreground">Costo Mensual Total</p>
                <p className="text-xl font-bold">
                  ${qaMonthlyCostUSD.toFixed(0)} USD
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (${QA_CONFIG.monthlySalaryMXN.toLocaleString()} MXN)
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Costo por Llamada</p>
                <p className="text-lg font-semibold">
                  ${qaCostPerCallUSD.toFixed(2)} USD
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (${qaCostPerCallMXN.toFixed(2)} MXN)
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Capacidad Mensual</p>
                <p className="text-lg font-semibold text-orange-600">
                  ~{qaCallsPerMonth} llamadas/mes
                </p>
                <p className="text-xs text-muted-foreground">
                  ({QA_CONFIG.callsPerHour} llamadas/hora x {QA_CONFIG.hoursPerMonth}h)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de comparacion visual */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Ahorro vs QA Humano</span>
            <span className="text-sm text-emerald-600 font-semibold">
              ${(equivalentQACostUSD - totalCostUSD).toFixed(2)} USD ahorrados
            </span>
          </div>
          <div className="relative">
            <Progress value={parseFloat(savingsPercentage)} className="h-3" />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Costo IA: ${totalCostUSD.toFixed(2)} USD</span>
            <span>Equivalente QA: ${equivalentQACostUSD.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Insight rapido */}
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-emerald-600 mt-0.5" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              <strong>Insight:</strong> Con el presupuesto de 1 analista QA, DeepAudit puede procesar{' '}
              <strong>{Math.floor(iaCallsWithQABudget / qaCallsPerMonth)}x</strong> mas llamadas por mes.
              {totalCalls > 0 && (
                <> Las {totalCalls} llamadas procesadas hubieran costado{' '}
                <strong>${equivalentQACostMXN.toFixed(0)} MXN</strong> con QA humano.</>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

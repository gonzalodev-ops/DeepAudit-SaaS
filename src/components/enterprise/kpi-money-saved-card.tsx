'use client'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { getEnterprisConfig } from '@/lib/feature-flags'
import { DollarSign, TrendingUp, Users } from 'lucide-react'

// Colores Enterprise - Paleta más vibrante
const ENTERPRISE_COLORS = {
  primary: '#0052CC',    // Azul más vibrante
  steel: '#71797E',      // Gris Acero
  light: '#F2F2F2',
  success: '#00875A',    // Verde más profundo
}

interface KPIMoneySavedCardProps {
  retainedClients: number
  customLTV?: number // Opcional: LTV personalizado
}

// Formatear numero como moneda MXN
function formatCurrencyMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formatear numero con separador de miles
function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-MX').format(num)
}

export function KPIMoneySavedCard({ retainedClients, customLTV }: KPIMoneySavedCardProps) {
  const config = getEnterprisConfig()
  const ltv = customLTV || config.defaultLTV
  const moneySaved = retainedClients * ltv

  // Calcular metricas adicionales
  const averagePerClient = ltv
  const projectedAnnual = moneySaved * 12 // Proyeccion anual si este es mensual

  return (
    <Card className="overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1" style={{ borderLeftColor: ENTERPRISE_COLORS.primary }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" style={{ color: ENTERPRISE_COLORS.primary }} />
          Valor de Cartera Blindada
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Monto principal */}
          <div>
            <p className="text-3xl font-bold" style={{ color: ENTERPRISE_COLORS.success }}>
              {formatCurrencyMXN(moneySaved)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              LTV Riesgo Retenido
            </p>
          </div>

          {/* Metricas detalladas */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5" style={{ color: ENTERPRISE_COLORS.primary }} />
              <div>
                <p className="text-lg font-semibold" style={{ color: ENTERPRISE_COLORS.primary }}>
                  {formatNumber(retainedClients)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Clientes retenidos
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 mt-0.5" style={{ color: ENTERPRISE_COLORS.success }} />
              <div>
                <p className="text-lg font-semibold" style={{ color: ENTERPRISE_COLORS.success }}>
                  {formatCurrencyMXN(averagePerClient)}
                </p>
                <p className="text-xs text-muted-foreground">
                  LTV promedio
                </p>
              </div>
            </div>
          </div>

          {/* Barra de progreso visual */}
          {moneySaved > 0 && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Proyeccion anual</span>
                <span className="text-xs font-medium" style={{ color: ENTERPRISE_COLORS.success }}>
                  {formatCurrencyMXN(projectedAnnual)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full" style={{ backgroundColor: ENTERPRISE_COLORS.light }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: ENTERPRISE_COLORS.success,
                    width: `${Math.min((moneySaved / projectedAnnual) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <p className="text-xs text-muted-foreground italic">
          * Estimacion basada en LTV promedio del sector ({formatCurrencyMXN(ltv)}/cliente)
        </p>
      </CardFooter>
    </Card>
  )
}

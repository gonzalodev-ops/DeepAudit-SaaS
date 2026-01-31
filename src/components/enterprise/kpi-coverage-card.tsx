'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getEnterpriseConfig } from '@/lib/feature-flags'
import { CheckCircle2 } from 'lucide-react'

// Colores Enterprise - Paleta más vibrante
const ENTERPRISE_COLORS = {
  primary: '#0052CC',    // Azul más vibrante
  steel: '#71797E',      // Gris Acero
  light: '#F2F2F2',
  success: '#00875A',    // Verde más profundo
}

interface KPICoverageCardProps {
  totalCalls: number
  completedAudits: number
}

export function KPICoverageCard({ totalCalls, completedAudits }: KPICoverageCardProps) {
  const config = getEnterpriseConfig()
  const coveragePercentage = totalCalls > 0 ? Math.round((completedAudits / totalCalls) * 100) : 100

  // Radio y propiedades del gráfico de anillo
  const size = 120
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (coveragePercentage / 100) * circumference

  return (
    <Card className="overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1" style={{ borderLeftColor: ENTERPRISE_COLORS.success }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: ENTERPRISE_COLORS.success }} />
          Cobertura de Auditoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {/* Grafico de anillo */}
          <div className="relative flex items-center justify-center pb-3">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Circulo de fondo */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ENTERPRISE_COLORS.light}
                strokeWidth={strokeWidth}
              />
              {/* Circulo de progreso */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ENTERPRISE_COLORS.success}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            {/* Texto central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: ENTERPRISE_COLORS.primary }}>
                {coveragePercentage}%
              </span>
            </div>
            {/* 641x Multiplier Badge */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
              641x
            </div>
          </div>

          {/* Estadisticas */}
          <div className="flex-1 ml-4 space-y-2">
            <div>
              <p className="text-2xl font-bold" style={{ color: ENTERPRISE_COLORS.success }}>
                100% Auditado
              </p>
              <p className="text-sm text-muted-foreground">
                vs {config.humanAuditPercentage}% Humano
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {completedAudits} de {totalCalls} llamadas
              </p>
            </div>
          </div>
        </div>

        {/* Comparativa visual */}
        <div className="mt-4 pt-3 border-t space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="h-2 flex-1 rounded-full"
              style={{ backgroundColor: ENTERPRISE_COLORS.success }}
            />
            <span className="text-xs font-medium" style={{ color: ENTERPRISE_COLORS.success }}>
              IA: 100%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-2 rounded-full"
              style={{
                backgroundColor: ENTERPRISE_COLORS.steel,
                width: `${config.humanAuditPercentage}%`,
                minWidth: '4px'
              }}
            />
            <div
              className="flex-1 h-2 rounded-full"
              style={{ backgroundColor: ENTERPRISE_COLORS.light }}
            />
            <span className="text-xs font-medium" style={{ color: ENTERPRISE_COLORS.steel }}>
              Humano: {config.humanAuditPercentage}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ShieldCheck, Bell } from 'lucide-react'

// Colores Enterprise - Paleta más vibrante
const ENTERPRISE_COLORS = {
  primary: '#0052CC',    // Azul más vibrante
  steel: '#71797E',      // Gris Acero
  light: '#F2F2F2',
  critical: '#DE350B',   // Rojo más intenso
  success: '#00875A',    // Verde más profundo
  warning: '#FF8B00',    // Naranja más brillante
}

interface KPICriticalAlertsCardProps {
  criticalAlerts: number
  highRiskAlerts?: number
  mediumRiskAlerts?: number
}

export function KPICriticalAlertsCard({
  criticalAlerts,
  highRiskAlerts = 0,
  mediumRiskAlerts = 0,
}: KPICriticalAlertsCardProps) {
  const hasAlerts = criticalAlerts > 0
  const totalAlerts = criticalAlerts + highRiskAlerts + mediumRiskAlerts

  return (
    <Card
      className={`overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${hasAlerts ? 'ring-2 ring-red-200' : ''}`}
      style={{ borderLeftColor: hasAlerts ? ENTERPRISE_COLORS.critical : ENTERPRISE_COLORS.steel }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Bell
            className="h-4 w-4"
            style={{ color: hasAlerts ? ENTERPRISE_COLORS.critical : ENTERPRISE_COLORS.steel }}
          />
          Alertas de Riesgo Legal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Badge principal con contador */}
          <div className="flex items-center gap-4">
            {hasAlerts ? (
              <>
                <div
                  className="relative flex items-center justify-center w-16 h-16 rounded-full animate-pulse"
                  style={{ backgroundColor: `${ENTERPRISE_COLORS.critical}20` }}
                >
                  <AlertTriangle
                    className="h-8 w-8"
                    style={{ color: ENTERPRISE_COLORS.critical }}
                  />
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full"
                    style={{ backgroundColor: ENTERPRISE_COLORS.critical }}
                  >
                    {criticalAlerts}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: ENTERPRISE_COLORS.critical }}>
                    {criticalAlerts} Critica{criticalAlerts !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: ENTERPRISE_COLORS.critical }}>
                    RIESGO DE MULTA ACTIVO
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-full"
                  style={{ backgroundColor: `${ENTERPRISE_COLORS.success}20` }}
                >
                  <ShieldCheck
                    className="h-8 w-8"
                    style={{ color: ENTERPRISE_COLORS.success }}
                  />
                </div>
                <div>
                  <Badge
                    variant="outline"
                    className="text-sm px-3 py-1"
                    style={{
                      borderColor: ENTERPRISE_COLORS.steel,
                      color: ENTERPRISE_COLORS.steel
                    }}
                  >
                    Sin alertas
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Todas las llamadas en cumplimiento
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Desglose por nivel de riesgo */}
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Desglose por nivel de riesgo
            </p>

            {/* Critico */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ENTERPRISE_COLORS.critical }}
                />
                <span className="text-sm">Critico</span>
              </div>
              <Badge
                variant={criticalAlerts > 0 ? 'destructive' : 'outline'}
                className={criticalAlerts > 0 ? 'animate-pulse' : ''}
              >
                {criticalAlerts}
              </Badge>
            </div>

            {/* Alto */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ENTERPRISE_COLORS.warning }}
                />
                <span className="text-sm">Alto</span>
              </div>
              <Badge
                variant="outline"
                style={{
                  borderColor: highRiskAlerts > 0 ? ENTERPRISE_COLORS.warning : undefined,
                  color: highRiskAlerts > 0 ? ENTERPRISE_COLORS.warning : undefined,
                }}
              >
                {highRiskAlerts}
              </Badge>
            </div>

            {/* Medio */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#FBBF24' }}
                />
                <span className="text-sm">Medio</span>
              </div>
              <Badge variant="outline">
                {mediumRiskAlerts}
              </Badge>
            </div>
          </div>

          {/* Alerta de accion requerida */}
          {hasAlerts && (
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${ENTERPRISE_COLORS.critical}10` }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                  style={{ color: ENTERPRISE_COLORS.critical }}
                />
                <div>
                  <p className="text-sm" style={{ color: ENTERPRISE_COLORS.critical }}>
                    <strong>Accion requerida:</strong> Revise las {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''} pendiente{totalAlerts !== 1 ? 's' : ''} en el Centro de Comando.
                  </p>
                  <p className="text-xs mt-1 opacity-80" style={{ color: ENTERPRISE_COLORS.critical }}>
                    PROFECO puede multar hasta $4,500,000 MXN por practicas abusivas
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

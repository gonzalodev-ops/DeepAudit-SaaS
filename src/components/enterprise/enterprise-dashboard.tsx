'use client'

import { KPICoverageCard } from './kpi-coverage-card'
import { KPIMoneySavedCard } from './kpi-money-saved-card'
import { KPICriticalAlertsCard } from './kpi-critical-alerts'
import { RiskDistributionCard } from './risk-distribution-card'
import { CallOutcomesCard } from './call-outcomes-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBranding } from '@/lib/feature-flags'
import { Shield, LayoutDashboard } from 'lucide-react'

// Colores Enterprise - Paleta más vibrante
const ENTERPRISE_COLORS = {
  primary: '#0052CC',    // Azul más vibrante
  steel: '#71797E',      // Gris Acero
  light: '#F2F2F2',
  critical: '#DE350B',   // Rojo más intenso
  success: '#00875A',    // Verde más profundo
  warning: '#FF8B00',    // Naranja más brillante
  accent: '#6554C0',     // Púrpura para destacar
}

export interface RiskDistribution {
  critical: number
  high: number
  medium: number
  safe: number
}

export interface OutcomeDistribution {
  retained: number
  churned: number
  escalated: number
  pending: number
}

export interface EnterpriseStats {
  totalCalls: number
  completedAudits: number
  criticalAlerts: number
  highRiskAlerts?: number
  mediumRiskAlerts?: number
  retainedClients: number
  avgScore: number
  riskDistribution?: RiskDistribution
  outcomeDistribution?: OutcomeDistribution
}

interface EnterpriseDashboardProps {
  stats: EnterpriseStats
  children?: React.ReactNode // Para el Centro de Comando u otros componentes
}

export function EnterpriseDashboard({ stats, children }: EnterpriseDashboardProps) {
  const branding = getBranding()

  return (
    <div className="space-y-6">
      {/* Header Enterprise */}
      <div
        className="p-4 rounded-lg flex items-center justify-between"
        style={{ backgroundColor: `${ENTERPRISE_COLORS.primary}10` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: ENTERPRISE_COLORS.primary }}
          >
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: ENTERPRISE_COLORS.primary }}>
              {branding.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {branding.subtitle}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="px-3 py-1"
          style={{
            borderColor: ENTERPRISE_COLORS.primary,
            color: ENTERPRISE_COLORS.primary,
          }}
        >
          Enterprise
        </Badge>
      </div>

      {/* Row 1: 3 KPIs principales */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICoverageCard
          totalCalls={stats.totalCalls}
          completedAudits={stats.completedAudits}
        />
        <KPIMoneySavedCard
          retainedClients={stats.retainedClients}
        />
        <KPICriticalAlertsCard
          criticalAlerts={stats.criticalAlerts}
          highRiskAlerts={stats.highRiskAlerts}
          mediumRiskAlerts={stats.mediumRiskAlerts}
        />
      </div>

      {/* Metricas secundarias */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Llamadas"
          value={stats.totalCalls.toString()}
          color={ENTERPRISE_COLORS.primary}
        />
        <MetricCard
          title="Auditorias Completadas"
          value={stats.completedAudits.toString()}
          color={ENTERPRISE_COLORS.success}
        />
        <MetricCard
          title="Score Promedio"
          value={`${stats.avgScore}%`}
          color={stats.avgScore >= 70 ? ENTERPRISE_COLORS.success : ENTERPRISE_COLORS.warning}
        />
        <MetricCard
          title="Clientes Retenidos"
          value={stats.retainedClients.toString()}
          color={ENTERPRISE_COLORS.primary}
        />
      </div>

      {/* Distribution Cards - Risk & Outcomes */}
      {(stats.riskDistribution || stats.outcomeDistribution) && (
        <div className="grid gap-4 md:grid-cols-2">
          {stats.riskDistribution && (
            <RiskDistributionCard distribution={stats.riskDistribution} />
          )}
          {stats.outcomeDistribution && (
            <CallOutcomesCard distribution={stats.outcomeDistribution} />
          )}
        </div>
      )}

      {/* Row 2: Centro de Comando (placeholder o children) */}
      {children ? (
        children
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" style={{ color: ENTERPRISE_COLORS.primary }} />
              Centro de Comando
            </CardTitle>
            <Badge variant="outline" className="text-muted-foreground">
              Proximamente
            </Badge>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed"
              style={{ borderColor: ENTERPRISE_COLORS.light }}
            >
              <p className="text-muted-foreground text-sm">
                Tabla de Centro de Comando - Se implementara en otro agente
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente auxiliar para metricas secundarias
interface MetricCardProps {
  title: string
  value: string
  color: string
}

function MetricCard({ title, value, color }: MetricCardProps) {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default">
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-2xl font-bold transition-transform duration-300" style={{ color }}>
            {value}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {title}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Re-exportar tipos para uso externo
export type { EnterpriseStats as EnterpriseStatsType }

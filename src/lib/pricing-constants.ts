// Constantes de Pricing para DeepAudit Enterprise
// Modelo: Licencia por asiento con tarifa plana y FUP (Fair Use Policy)

export interface PricingPlan {
  id: string
  name: string
  pricePerSeatMXN: number
  fupCallsPerAgent: number
  costPerCallMXN: number // Costo real interno
  overage: {
    enabled: boolean
    pricePerCallMXN: number
    maxOveragePercent: number
    hardCapPercent: number
  }
  features: string[]
  recommended?: boolean
}

// Costo real por auditoría (interno, no mostrar al cliente)
export const INTERNAL_COST_PER_AUDIT_MXN = 0.08

export const PRICING_PLANS: Record<string, PricingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    pricePerSeatMXN: 199,           // $0.50/llamada efectivo
    fupCallsPerAgent: 400,
    costPerCallMXN: INTERNAL_COST_PER_AUDIT_MXN,
    overage: {
      enabled: true,
      pricePerCallMXN: 0.60,        // Sin descuento en overage
      maxOveragePercent: 25,
      hardCapPercent: 125,
    },
    features: [
      'Dashboard basico',
      'Transcripcion automatica',
      'Score de calidad',
      'Exportacion CSV',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    pricePerSeatMXN: 299,           // $0.37/llamada efectivo (-26%)
    fupCallsPerAgent: 800,          // 2x FUP del Starter
    costPerCallMXN: INTERNAL_COST_PER_AUDIT_MXN,
    overage: {
      enabled: true,
      pricePerCallMXN: 0.45,        // Descuento moderado
      maxOveragePercent: 30,
      hardCapPercent: 130,
    },
    features: [
      'Todo en Starter',
      'Deteccion de riesgo legal',
      'Alertas PROFECO/Condusef',
      'Comparativa de agentes',
      'API basica',
    ],
    recommended: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    pricePerSeatMXN: 449,           // $0.30/llamada efectivo (-40%)
    fupCallsPerAgent: 1500,         // 3.75x FUP del Starter
    costPerCallMXN: INTERNAL_COST_PER_AUDIT_MXN,
    overage: {
      enabled: true,
      pricePerCallMXN: 0.35,        // Mejor descuento en overage
      maxOveragePercent: 50,
      hardCapPercent: 150,
    },
    features: [
      'Todo en Professional',
      'RAG con manuales personalizados',
      'Multi-campana',
      'SSO/SAML',
      'SLA 99.9%',
      'Success Manager dedicado',
    ],
  },
}

// Calcula el margen bruto para un plan dado
export function calculateMargin(
  plan: PricingPlan,
  seats: number,
  usagePercent: number = 0.8 // Uso típico del 80%
) {
  const monthlyRevenue = plan.pricePerSeatMXN * seats
  const estimatedCalls = plan.fupCallsPerAgent * seats * usagePercent
  const monthlyCost = estimatedCalls * plan.costPerCallMXN
  const grossMargin = monthlyRevenue - monthlyCost
  const marginPercent = (grossMargin / monthlyRevenue) * 100

  return {
    monthlyRevenue,
    estimatedCalls,
    monthlyCost,
    grossMargin,
    marginPercent,
    annualRevenue: monthlyRevenue * 12,
    annualMargin: grossMargin * 12,
  }
}

// Comparación con auditor humano
export const HUMAN_QA_COMPARISON = {
  monthlySalaryMXN: 30000,
  callsPerMonth: 800, // ~5 llamadas/hora × 160 horas
  costPerCallMXN: 37.5, // 30000 / 800
}

// Calcula la ventaja vs humano
export function calculateVsHuman(plan: PricingPlan, seats: number) {
  const deepAuditCalls = plan.fupCallsPerAgent * seats
  const humanEquivalent = Math.ceil(deepAuditCalls / HUMAN_QA_COMPARISON.callsPerMonth)
  const humanCost = humanEquivalent * HUMAN_QA_COMPARISON.monthlySalaryMXN
  const deepAuditCost = plan.pricePerSeatMXN * seats
  const savings = humanCost - deepAuditCost
  const multiplier = Math.round(deepAuditCalls / HUMAN_QA_COMPARISON.callsPerMonth)

  return {
    deepAuditCalls,
    humanEquivalent,
    humanCost,
    deepAuditCost,
    savings,
    multiplier,
    savingsPercent: (savings / humanCost) * 100,
  }
}

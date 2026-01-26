// Constantes de Pricing para DeepAudit Enterprise
// Modelo: Licencia mensual con llamadas incluidas + overage
// NOTA: Margenes calculados al 100% de uso (peor caso). Uso tipico 70-80% mejora margenes.

export interface PricingPlan {
  id: string
  name: string
  licenseMXN: number           // Licencia mensual fija
  includedCalls: number        // Llamadas incluidas en la licencia
  overagePerCallMXN: number    // Costo por llamada extra
  marginAt100Percent: number   // Margen al 100% de uso (referencia)
  features: string[]
  recommended?: boolean
}

// Costo real por auditoria (interno, no mostrar al cliente)
export const INTERNAL_COST_PER_AUDIT_MXN = 0.08

export const PRICING_PLANS: Record<string, PricingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    licenseMXN: 2999,
    includedCalls: 10000,
    overagePerCallMXN: 0.30,
    marginAt100Percent: 73, // Al 100% uso: ($2,999 - $800) / $2,999
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
    licenseMXN: 11999,
    includedCalls: 50000,
    overagePerCallMXN: 0.25,
    marginAt100Percent: 67, // Al 100% uso: ($11,999 - $4,000) / $11,999
    features: [
      'Todo en Starter',
      'Deteccion de riesgo legal',
      'Alertas PROFECO/Condusef',
      'Comparativa de agentes',
      'API basica',
    ],
    recommended: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    licenseMXN: 44999,
    includedCalls: 200000,
    overagePerCallMXN: 0.20,
    marginAt100Percent: 64, // Al 100% uso: ($44,999 - $16,000) / $44,999
    features: [
      'Todo en Professional',
      'Multi-campana',
      'Comparativa de agentes avanzada',
      'Integraciones premium',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    licenseMXN: 350000,
    includedCalls: 1500000,
    overagePerCallMXN: 0.15,
    marginAt100Percent: 66, // Al 100% uso: ($350,000 - $120,000) / $350,000
    features: [
      'Todo en Business',
      'RAG con manuales personalizados',
      'SSO/SAML',
      'SLA 99.9%',
      'Success Manager dedicado',
      'Soporte prioritario 24/7',
    ],
  },
}

// Calcula el total y margen para un plan dado
export function calculatePlanTotal(
  plan: PricingPlan,
  totalCalls: number,
  usagePercent: number = 1.0 // Default 100% para mostrar peor caso
) {
  const actualCalls = Math.round(totalCalls * usagePercent)
  const extraCalls = Math.max(0, actualCalls - plan.includedCalls)
  const overage = extraCalls * plan.overagePerCallMXN
  const totalRevenue = plan.licenseMXN + overage
  const totalCost = actualCalls * INTERNAL_COST_PER_AUDIT_MXN
  const grossMargin = totalRevenue - totalCost
  const marginPercent = (grossMargin / totalRevenue) * 100

  return {
    totalRevenue,
    overage,
    extraCalls,
    totalCost,
    grossMargin,
    marginPercent,
    annualRevenue: totalRevenue * 12,
    annualMargin: grossMargin * 12,
  }
}

// Comparacion con auditor humano
export const HUMAN_QA_COMPARISON = {
  monthlySalaryMXN: 30000,
  callsPerMonth: 800, // ~5 llamadas/hora x 160 horas
  costPerCallMXN: 37.5, // 30000 / 800
}

// Calcula la ventaja vs humano
export function calculateVsHuman(totalCalls: number, planCost: number) {
  const humanEquivalent = Math.ceil(totalCalls / HUMAN_QA_COMPARISON.callsPerMonth)
  const humanCost = humanEquivalent * HUMAN_QA_COMPARISON.monthlySalaryMXN
  const savings = humanCost - planCost
  const multiplier = Math.round(totalCalls / HUMAN_QA_COMPARISON.callsPerMonth)

  return {
    totalCalls,
    humanEquivalent,
    humanCost,
    planCost,
    savings,
    multiplier,
    savingsPercent: (savings / humanCost) * 100,
  }
}

// Verifica anti-arbitraje: Enterprise debe ser mas barato que stacking Business
export function verifyAntiArbitrage(targetCalls: number) {
  const business = PRICING_PLANS.business
  const enterprise = PRICING_PLANS.enterprise

  // Calculo stacking Business
  const businessPlansNeeded = Math.ceil(targetCalls / business.includedCalls)
  const businessIncluded = businessPlansNeeded * business.includedCalls
  const businessExtra = Math.max(0, targetCalls - businessIncluded)
  const stackingCost = (businessPlansNeeded * business.licenseMXN) + (businessExtra * business.overagePerCallMXN)

  // Calculo Enterprise
  const enterpriseExtra = Math.max(0, targetCalls - enterprise.includedCalls)
  const enterpriseCost = enterprise.licenseMXN + (enterpriseExtra * enterprise.overagePerCallMXN)

  return {
    targetCalls,
    stacking: {
      plansNeeded: businessPlansNeeded,
      cost: stackingCost,
    },
    enterprise: {
      cost: enterpriseCost,
    },
    enterpriseIsCheaper: enterpriseCost < stackingCost,
    savings: stackingCost - enterpriseCost,
  }
}

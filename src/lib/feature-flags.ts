export type ProductMode = 'standard' | 'enterprise' | 'poc'

export const getProductMode = (): ProductMode => {
  return (process.env.NEXT_PUBLIC_PRODUCT_MODE as ProductMode) || 'standard'
}

export const isEnterpriseMode = (): boolean => {
  return getProductMode() === 'enterprise'
}

export const isPocMode = (): boolean => {
  return getProductMode() === 'poc'
}

export const showFinancialData = (): boolean => {
  // Financial data is visible in all modes — needed for POC demos and metrics
  return true
}

export const getBranding = () => {
  const mode = getProductMode()
  if (mode === 'enterprise') {
    return {
      name: 'DeepAudit Enterprise',
      subtitle: 'CallFasst Intelligence',
      sidebarName: 'DeepAudit Enterprise',
      logo: 'shield',
    }
  }
  if (mode === 'poc') {
    return {
      name: 'DeepAudit',
      subtitle: 'Prueba de Concepto',
      sidebarName: 'DeepAudit PoC',
      logo: 'file-audio',
    }
  }
  return {
    name: 'DeepAudit',
    subtitle: 'Auditoria Automatizada de Llamadas',
    sidebarName: 'DeepAudit',
    logo: 'file-audio',
  }
}

// Configuracion de LTV para calculo de dinero salvado
export const getEnterpriseConfig = () => ({
  defaultLTV: 5000, // MXN por cliente
  humanAuditPercentage: 1.5, // % que audita un humano
  aiAuditPercentage: 100, // % que audita la IA
})

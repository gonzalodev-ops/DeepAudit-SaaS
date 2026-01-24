export type ProductMode = 'standard' | 'enterprise'

export const getProductMode = (): ProductMode => {
  return (process.env.NEXT_PUBLIC_PRODUCT_MODE as ProductMode) || 'standard'
}

export const isEnterpriseMode = (): boolean => {
  return getProductMode() === 'enterprise'
}

export const getBranding = () => {
  const mode = getProductMode()
  return mode === 'enterprise'
    ? {
        name: 'DeepAudit Enterprise',
        subtitle: 'Powered by CallFasst Intelligence',
        logo: 'shield',
      }
    : {
        name: 'DeepAudit',
        subtitle: 'Auditoria Automatizada de Llamadas',
        logo: 'file-audio',
      }
}

// Configuracion de LTV para calculo de dinero salvado
export const getEnterprisConfig = () => ({
  defaultLTV: 5000, // MXN por cliente
  humanAuditPercentage: 1.5, // % que audita un humano
  aiAuditPercentage: 100, // % que audita la IA
})

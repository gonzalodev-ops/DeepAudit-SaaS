# Plan: DeepAudit MVP → DeepAudit Enterprise

## Resumen Ejecutivo

Transformar DeepAudit de "herramienta de costos" a **Plataforma de Blindaje Corporativo y Retención de Ingresos** usando Feature Flags para mantener ambas versiones en un solo codebase.

**Estrategia:** Variable `NEXT_PUBLIC_PRODUCT_MODE=enterprise|standard`

---

## Estrategia de Ejecución Paralela

Para maximizar velocidad, ejecutar múltiples agentes en paralelo:

```
PARALELO 1 (Infraestructura):
├── Agente A: Feature flags + tipos TypeScript
├── Agente B: Migración SQL + script regeneración
└── Agente C: Modificar prompt Gemini

PARALELO 2 (UI Enterprise):
├── Agente D: Dashboard Enterprise + 3 KPIs
├── Agente E: Tabla Centro de Comando + badges
└── Agente F: Selector de compañía/tenant

PARALELO 3 (Vistas):
├── Agente G: Vista detalle Enterprise
└── Agente H: Página /compare + filtros
```

---

## Fase 1: Infraestructura (30 min)

### 1.1 Sistema de Feature Flags
**Crear:** `/src/lib/feature-flags.ts`
```typescript
export type ProductMode = 'standard' | 'enterprise'
export const getProductMode = (): ProductMode =>
  (process.env.NEXT_PUBLIC_PRODUCT_MODE as ProductMode) || 'standard'
export const isEnterpriseMode = () => getProductMode() === 'enterprise'
export const getBranding = () => isEnterpriseMode()
  ? { name: 'DeepAudit Enterprise', subtitle: 'Powered by CallFasst Intelligence | Cliente Demo: Telecom Global' }
  : { name: 'DeepAudit', subtitle: 'Auditoría Automatizada de Llamadas' }
```

### 1.2 Migración Base de Datos
**Crear:** `/docs/migrations/003_add_enterprise_fields.sql`

Nuevos campos en tabla `audits`:
- `call_scenario`: retention | cancellation | dispute | collection | support | sales
- `client_sentiment`: hostile | negative | neutral | positive | enthusiastic
- `legal_risk_level`: critical | high | medium | safe
- `legal_risk_reasons`: TEXT[]
- `call_outcome`: retained | churned | hung_up | escalated | pending
- `suggested_action`: immediate_termination | urgent_coaching | standard_coaching | model_script | recognition | none

### 1.3 Script de Regeneración
**Crear:** `/scripts/regenerate-audits-enterprise.ts`

Script que:
1. Lee todas las auditorías existentes
2. Re-procesa cada audio con el nuevo prompt Enterprise
3. **CONSERVA** metadata de tokens/costos existente (input_tokens, output_tokens, cost_usd)
4. **AGREGA** los nuevos campos Enterprise
5. Actualiza la auditoría sin perder datos históricos

### 1.4 Actualizar Tipos
**Modificar:** `/src/types/database.ts`
- Agregar tipos Enterprise (CallScenario, ClientSentiment, LegalRiskLevel, etc.)
- Actualizar interface Audit con nuevos campos

---

## Fase 2: Backend - Prompt Gemini (1-2 hrs)

### 2.1 Modificar Prompt
**Modificar:** `/src/lib/gemini.ts`

Agregar instrucciones Enterprise al prompt basadas en:
- **ETI-01** (Agresión Verbal) → legal_risk=critical, action=immediate_termination
- **ETI-02** (Gaslighting) → legal_risk=critical, action=immediate_termination
- **ETI-03** (Abandono Hostil) → legal_risk=critical, action=immediate_termination
- Menciones PROFECO sin escalamiento → legal_risk=high
- Score < 50 → action=urgent_coaching
- Score > 90 + retained → action=model_script

### 2.2 Actualizar API Route
**Modificar:** `/src/app/api/calls/upload/route.ts`
- Guardar nuevos campos Enterprise en Supabase

---

## Fase 3: Dashboard Enterprise (2-3 hrs)

### 3.1 Nuevos KPIs
**Crear:** `/src/components/enterprise/`
- `kpi-coverage-card.tsx` - Gráfico anillo 100% vs 1.5% humano
- `kpi-money-saved-card.tsx` - $X MXN (LTV × clientes retenidos)
  - **LTV configurable en settings** (default: $5,000 MXN)
  - **Nota visual:** "* Estimación basada en LTV promedio del sector"
- `kpi-critical-alerts.tsx` - Contador rojo pulsante

### 3.2 Dashboard Principal
**Crear:** `/src/components/enterprise/enterprise-dashboard.tsx`
**Modificar:** `/src/app/(dashboard)/page.tsx` - Condicional por modo

### 3.3 Sidebar con Branding
**Modificar:** `/src/components/dashboard/sidebar.tsx`
- Logo dinámico (Shield para Enterprise)
- Nombre y subtítulo según modo

### 3.4 Selector de Compañía/Tenant
**Crear:** `/src/components/enterprise/tenant-selector.tsx`
**Modificar:** `/src/components/dashboard/header.tsx`

Dropdown en el header que permite:
- Cambiar entre tenants/compañías
- Mostrar nombre de compañía actual
- Filtrar llamadas por tenant seleccionado
- Útil para demo multi-empresa (Telecom, Cobranza, etc.)

---

## Fase 4: Tabla Centro de Comando (2 hrs)

### 4.1 Nueva Tabla
**Crear:** `/src/components/enterprise/command-center-table.tsx`

Columnas:
| ID | Agente | Escenario | Sentimiento | Riesgo Legal | Resultado | Acción |

Con badges visuales:
- Sentimiento: 🔴 Hostil, 🟠 Negativo, ⚪ Neutral, 🟢 Positivo
- Riesgo: 🔥 CRÍTICO (rojo pulsante), ⚠️ ALTO (naranja), 🛡️ SEGURO (verde)
- Resultado: ✅ Retenido, 📉 Churn, ❌ Colgado

### 4.2 Componentes de Soporte
**Crear:**
- `/src/components/enterprise/legal-risk-badge.tsx`
- `/src/components/enterprise/sentiment-indicator.tsx`
- `/src/components/enterprise/action-badge.tsx`

---

## Fase 5: User Stories Funcionales (2-3 hrs)

### 5.1 Bombero - Alerta Visual
- Contador rojo pulsante para `legal_risk_level = 'critical'`
- Indicador prominente en header cuando hay alertas

### 5.2 Abogado - Filtro Keywords Legales
**Modificar:** `/src/components/calls/calls-filters.tsx`
- Agregar input de búsqueda por keyword (PROFECO, demanda, abogado)
- Busca en transcript y legal_risk_reasons

### 5.3 Estratega - Comparar Llamadas
**Crear:** `/src/app/(dashboard)/compare/page.tsx`
- Selector de 2 llamadas
- Vista lado a lado
- Resaltar diferencias en criterios

---

## Fase 6: Vista Detalle Enterprise (1-2 hrs)

**Crear:** `/src/components/enterprise/call-detail-enterprise.tsx`
**Modificar:** `/src/app/(dashboard)/calls/[id]/page.tsx`

Incluir:
- Alertas prominentes con tipo (ETI-01, ETI-02, ETI-03)
- Transcripción con citas resaltadas en rojo
- "Grounding" - Qué regla del manual se violó
- Badge de acción sugerida prominente

---

## Fase 7: Estilos Enterprise (30 min)

**Modificar:** `/src/app/globals.css`
```css
:root {
  /* Paleta Enterprise */
  --enterprise-primary: #003B6D;    /* Azul Corporativo Profundo */
  --enterprise-steel: #71797E;      /* Gris Acero */
  --enterprise-light: #F2F2F2;      /* Blanco/Gris Claro */
  --enterprise-critical: #DC2626;   /* Rojo Crítico */
  --enterprise-success: #16A34A;    /* Verde Retención */
  --enterprise-warning: #EA580C;    /* Naranja Alerta */
}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `/src/lib/gemini.ts` | Prompt Enterprise + nuevos campos |
| `/src/types/database.ts` | Tipos Enterprise |
| `/src/app/(dashboard)/page.tsx` | Condicional de modo |
| `/src/app/(dashboard)/calls/[id]/page.tsx` | Vista detalle Enterprise |
| `/src/components/dashboard/sidebar.tsx` | Branding dinámico |
| `/src/components/dashboard/header.tsx` | Selector de compañía |
| `/src/components/calls/calls-filters.tsx` | Filtro keywords |
| `/src/app/api/calls/upload/route.ts` | Guardar campos Enterprise |
| `/src/app/api/calls/[id]/regenerate/route.ts` | Regenerar con campos Enterprise |
| `/src/app/globals.css` | Variables CSS Enterprise |
| `/src/app/(dashboard)/settings/page.tsx` | Config LTV para dinero salvado |

## Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `/src/lib/feature-flags.ts` | Sistema feature flags |
| `/docs/migrations/003_add_enterprise_fields.sql` | Migración DB |
| `/scripts/regenerate-audits-enterprise.ts` | Script regeneración |
| `/src/components/enterprise/enterprise-dashboard.tsx` | Dashboard |
| `/src/components/enterprise/kpi-*.tsx` | 3 KPIs nuevos |
| `/src/components/enterprise/command-center-table.tsx` | Tabla comando |
| `/src/components/enterprise/legal-risk-badge.tsx` | Badge riesgo |
| `/src/components/enterprise/sentiment-indicator.tsx` | Indicador sentimiento |
| `/src/components/enterprise/call-detail-enterprise.tsx` | Detalle |
| `/src/components/enterprise/tenant-selector.tsx` | Selector compañía |
| `/src/app/(dashboard)/compare/page.tsx` | Página comparar |

---

## Verificación

### Test 1: Modo Standard
```bash
NEXT_PUBLIC_PRODUCT_MODE=standard npm run dev
```
- Dashboard actual con costos ✓
- Sidebar "DeepAudit" ✓

### Test 2: Modo Enterprise
```bash
NEXT_PUBLIC_PRODUCT_MODE=enterprise npm run dev
```
- Dashboard con KPIs de blindaje ✓
- Tabla Centro de Comando ✓
- Página /compare disponible ✓

### Test 3: Bombero
- Subir audio con insultos → Contador rojo pulsante ✓

### Test 4: Abogado
- Filtrar "PROFECO" → Mostrar llamadas con menciones ✓

### Test 5: Estratega
- /compare → Ver 2 llamadas lado a lado ✓

---

## Estimación Total: 8-12 horas de implementación

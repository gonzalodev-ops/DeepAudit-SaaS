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

## Fase 8: Tests y Validación (2-3 hrs)

### 8.1 Estructura de Tests
**Crear:** `/src/__tests__/` con estructura:
```
src/__tests__/
├── unit/
│   ├── feature-flags.test.ts
│   ├── gemini-enterprise.test.ts
│   └── utils/
│       ├── legal-risk.test.ts
│       └── sentiment.test.ts
├── integration/
│   ├── api/
│   │   ├── upload-enterprise.test.ts
│   │   └── regenerate.test.ts
│   └── database/
│       └── audit-fields.test.ts
├── components/
│   ├── enterprise-dashboard.test.tsx
│   ├── command-center-table.test.tsx
│   ├── kpi-cards.test.tsx
│   └── badges.test.tsx
└── e2e/
    ├── enterprise-flow.test.ts
    └── user-stories.test.ts
```

---

## Tests Unitarios

### Test U1: Feature Flags (`/src/__tests__/unit/feature-flags.test.ts`)
```typescript
describe('Feature Flags', () => {
  test('getProductMode() returns "standard" by default')
  test('getProductMode() returns "enterprise" when env is set')
  test('isEnterpriseMode() returns false in standard mode')
  test('isEnterpriseMode() returns true in enterprise mode')
  test('getBranding() returns correct name for standard')
  test('getBranding() returns correct name for enterprise')
  test('getBranding() returns correct subtitle for enterprise')
  test('getEnterpriseConfig() returns default LTV of 5000')
})
```

### Test U2: Gemini Enterprise Fields (`/src/__tests__/unit/gemini-enterprise.test.ts`)
```typescript
describe('Gemini Enterprise Processing', () => {
  // Validación de campos
  test('call_scenario acepta solo valores válidos')
  test('client_sentiment acepta solo valores válidos')
  test('legal_risk_level acepta solo valores válidos')
  test('call_outcome acepta solo valores válidos')
  test('suggested_action acepta solo valores válidos')

  // Lógica de determinación
  test('fatal_violation=true → legal_risk_level="critical"')
  test('fatal_violation=true → suggested_action="immediate_termination"')
  test('score < 50 → suggested_action="urgent_coaching"')
  test('score 50-70 → suggested_action="standard_coaching"')
  test('score > 90 + retained → suggested_action="model_script"')
  test('score > 85 → suggested_action="recognition"')

  // Detección ETI
  test('detecta ETI-01 (insultos) → legal_risk="critical"')
  test('detecta ETI-02 (gaslighting) → legal_risk="critical"')
  test('detecta ETI-03 (abandono hostil) → legal_risk="critical"')
  test('mención PROFECO sin escalamiento → legal_risk="high"')
})
```

### Test U3: Validación de Tipos (`/src/__tests__/unit/utils/legal-risk.test.ts`)
```typescript
describe('Legal Risk Validation', () => {
  test('legal_risk_reasons es array de strings')
  test('legal_risk_reasons puede estar vacío')
  test('legal_risk_reasons contiene razones específicas')
  test('mapeo correcto de violation_codes a legal_risk_reasons')
})
```

---

## Tests de Integración

### Test I1: API Upload con Campos Enterprise
```typescript
describe('POST /api/calls/upload - Enterprise', () => {
  test('guarda call_scenario correctamente en DB')
  test('guarda client_sentiment correctamente en DB')
  test('guarda legal_risk_level correctamente en DB')
  test('guarda legal_risk_reasons como array')
  test('guarda call_outcome correctamente en DB')
  test('guarda suggested_action correctamente en DB')
  test('CONSERVA input_tokens, output_tokens, cost_usd existentes')
})
```

### Test I2: API Regenerate
```typescript
describe('POST /api/calls/[id]/regenerate', () => {
  test('regenera con campos Enterprise')
  test('conserva metadata de costos original')
  test('actualiza solo campos Enterprise')
  test('no pierde campos existentes (transcript, score, etc.)')
})
```

### Test I3: Base de Datos
```typescript
describe('Database Enterprise Fields', () => {
  test('migración crea columna call_scenario')
  test('migración crea columna client_sentiment')
  test('migración crea columna legal_risk_level')
  test('migración crea columna legal_risk_reasons')
  test('migración crea columna call_outcome')
  test('migración crea columna suggested_action')
  test('índices creados correctamente')
  test('constraints CHECK funcionan')
})
```

---

## Tests de Componentes UI

### Test C1: Enterprise Dashboard
```typescript
describe('EnterpriseDashboard', () => {
  test('renderiza KPI de cobertura 100%')
  test('renderiza KPI de dinero salvado con nota')
  test('renderiza KPI de alertas críticas')
  test('muestra contador pulsante cuando hay alertas')
  test('muestra $0 cuando no hay clientes retenidos')
  test('calcula dinero salvado = LTV × clientes retenidos')
})
```

### Test C2: Command Center Table
```typescript
describe('CommandCenterTable', () => {
  test('renderiza columna ID')
  test('renderiza columna Agente')
  test('renderiza columna Escenario con badge')
  test('renderiza columna Sentimiento con indicador color')
  test('renderiza columna Riesgo Legal con badge')
  test('renderiza columna Resultado con icono')
  test('renderiza columna Acción Sugerida')
  test('ordena por riesgo crítico primero')
  test('filtra por keyword legal')
})
```

### Test C3: Badges y Indicators
```typescript
describe('LegalRiskBadge', () => {
  test('critical → badge rojo pulsante')
  test('high → badge naranja')
  test('medium → badge amarillo')
  test('safe → badge verde')
})

describe('SentimentIndicator', () => {
  test('hostile → indicador rojo')
  test('negative → indicador naranja')
  test('neutral → indicador gris')
  test('positive → indicador verde')
  test('enthusiastic → indicador verde brillante')
})

describe('ActionBadge', () => {
  test('immediate_termination → badge rojo "Despido Inmediato"')
  test('urgent_coaching → badge naranja "Coaching Urgente"')
  test('model_script → badge verde "Modelar Script"')
})
```

### Test C4: Tenant Selector
```typescript
describe('TenantSelector', () => {
  test('muestra lista de tenants disponibles')
  test('muestra tenant actual seleccionado')
  test('cambia tenant al seleccionar')
  test('filtra llamadas por tenant seleccionado')
})
```

---

## Tests End-to-End (E2E)

### Test E2E-1: Flujo Completo Enterprise
```typescript
describe('Enterprise Flow E2E', () => {
  test('1. Cambiar a modo Enterprise')
  test('2. Ver dashboard con KPIs Enterprise')
  test('3. Ver tabla Centro de Comando')
  test('4. Subir audio de prueba')
  test('5. Verificar campos Enterprise generados')
  test('6. Ver detalle con alertas')
  test('7. Usar filtro de keywords')
  test('8. Comparar 2 llamadas')
})
```

### Test E2E-2: User Story Bombero
```typescript
describe('User Story: Bombero', () => {
  test('1. Subir audio con insultos (ETI-01)')
  test('2. Dashboard muestra alerta crítica pulsante')
  test('3. Tabla muestra riesgo CRÍTICO en rojo')
  test('4. Detalle muestra transcripción resaltada')
  test('5. Acción sugerida = Despido Inmediato')
})
```

### Test E2E-3: User Story Abogado
```typescript
describe('User Story: Abogado', () => {
  test('1. Subir audio con mención PROFECO')
  test('2. Usar filtro keyword "PROFECO"')
  test('3. Tabla filtra correctamente')
  test('4. Detalle muestra legal_risk_reasons')
  test('5. Riesgo legal = HIGH')
})
```

### Test E2E-4: User Story Estratega
```typescript
describe('User Story: Estratega', () => {
  test('1. Ir a /compare')
  test('2. Seleccionar llamada con score bajo')
  test('3. Seleccionar llamada con score alto')
  test('4. Ver comparación lado a lado')
  test('5. Diferencias resaltadas visualmente')
})
```

---

## Checklist de Validación Manual

### Pre-Deployment
- [ ] Build completa sin errores: `npm run build`
- [ ] Lint pasa: `npm run lint`
- [ ] TypeScript compila: `npx tsc --noEmit`

### Modo Standard (Regresión)
- [ ] Dashboard muestra KPIs de costos
- [ ] Sidebar muestra "DeepAudit"
- [ ] Upload de audio funciona
- [ ] Vista detalle muestra transcripción
- [ ] Filtros funcionan

### Modo Enterprise
- [ ] Variable `NEXT_PUBLIC_PRODUCT_MODE=enterprise` activa modo
- [ ] Sidebar muestra "DeepAudit Enterprise"
- [ ] Subtítulo "Powered by CallFasst Intelligence"
- [ ] Dashboard muestra 3 KPIs Enterprise
- [ ] KPI Cobertura muestra 100% vs 1.5%
- [ ] KPI Dinero Salvado muestra cálculo correcto
- [ ] KPI Alertas muestra contador (pulsante si > 0)
- [ ] Tabla Centro de Comando con 7 columnas
- [ ] Badges de colores correctos
- [ ] Selector de compañía funciona
- [ ] Página /compare accesible
- [ ] Filtro keywords funciona

### Campos Gemini Enterprise
- [ ] call_scenario se genera correctamente
- [ ] client_sentiment detecta tono del cliente
- [ ] legal_risk_level clasifica correctamente
- [ ] legal_risk_reasons lista razones específicas
- [ ] call_outcome identifica resultado
- [ ] suggested_action aplica lógica de negocio

### Casos de Prueba Específicos

| Audio | call_scenario | sentiment | risk | outcome | action |
|-------|---------------|-----------|------|---------|--------|
| Telco 1 (Alex) | cancellation | negative | high | churned | urgent_coaching |
| Telco 2 (X) | dispute | hostile | critical | hung_up | immediate_termination |
| Telco 3 (Sofía) | retention | positive | safe | retained | model_script |

### Base de Datos
- [ ] Migración ejecutada sin errores
- [ ] Nuevas columnas visibles en Supabase
- [ ] Índices creados
- [ ] Constraints CHECK funcionan
- [ ] Script regeneración conserva metadata

### Performance
- [ ] Dashboard carga en < 2s
- [ ] Tabla con 100 llamadas renderiza fluido
- [ ] Filtros responden instantáneamente

---

## Archivos de Test a Crear

| Archivo | Propósito |
|---------|-----------|
| `/src/__tests__/unit/feature-flags.test.ts` | Tests feature flags |
| `/src/__tests__/unit/gemini-enterprise.test.ts` | Tests lógica Gemini |
| `/src/__tests__/integration/api/upload-enterprise.test.ts` | Tests API |
| `/src/__tests__/components/enterprise-dashboard.test.tsx` | Tests dashboard |
| `/src/__tests__/components/command-center-table.test.tsx` | Tests tabla |
| `/src/__tests__/components/badges.test.tsx` | Tests badges |
| `/src/__tests__/e2e/user-stories.test.ts` | Tests E2E |
| `/jest.config.js` | Configuración Jest |
| `/jest.setup.js` | Setup de tests |

---

## Comandos de Test

```bash
# Ejecutar todos los tests
npm test

# Tests unitarios
npm test -- --testPathPattern=unit

# Tests de integración
npm test -- --testPathPattern=integration

# Tests de componentes
npm test -- --testPathPattern=components

# Tests E2E
npm test -- --testPathPattern=e2e

# Coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Estimación Total: 10-14 horas de implementación (incluyendo tests)

# 00 - Modo PoC: Versión sin datos financieros

## Objetivo
Crear un modo `poc` (Proof of Concept) que oculte toda la información financiera
de la aplicación, manteniendo la funcionalidad core de auditoría de llamadas.
Esto permite demostrar el producto a usuarios finales sin exponer datos de
pricing, costos internos, márgenes o unit economics.

## Configuración
Variable de entorno: `NEXT_PUBLIC_PRODUCT_MODE=poc`

### Modos disponibles
| Modo | Descripción |
|------|-------------|
| `standard` | Dashboard básico con costos visibles |
| `enterprise` | Dashboard completo con alertas, pricing, unit economics |
| `poc` | Solo funcionalidad de auditoría, sin datos financieros |

## Cambios realizados

### 1. `src/lib/feature-flags.ts`
- Agregar `'poc'` al tipo `ProductMode`
- Agregar `isPocMode()` helper
- Agregar `showFinancialData()` helper que retorna `false` en modo poc
- Agregar branding específico para poc

### 2. `src/app/(dashboard)/page.tsx` (Dashboard principal)
- Condicionar `CostsSummaryCard` y `CostComparisonCard` con `showFinancialData()`
- En modo poc, no calcular ni mostrar métricas de costo

### 3. `src/app/(dashboard)/reportes/page.tsx` (Impacto Financiero)
- Ocultar toda la página en modo poc (redirigir o mostrar mensaje)
- O bien: ocultar componentes financieros y mostrar solo métricas de calidad

### 4. `src/components/dashboard/sidebar.tsx`
- Ocultar link "Impacto Financiero" en modo poc

### 5. `src/app/api/stats/unit-economics/route.ts`
- Retornar 403 en modo poc

### 6. `src/lib/gemini.ts`
- No exponer constantes de pricing en modo poc (las constantes se mantienen
  internamente para el cálculo, pero la función `calculateCost` no retorna
  datos de costo en modo poc — en realidad el costo se guarda en DB siempre,
  solo se oculta en UI)

### 7. `.env.example`
- Documentar la opción `poc`

### 8. Tests
- Agregar casos de prueba para modo poc en feature-flags.test.ts

## Qué se oculta en modo PoC
- Costos por llamada (USD/MXN)
- Costos por minuto
- Tokens consumidos y su costo
- Comparativa de costos IA vs QA humano
- Unit economics (multiplicador de eficiencia, ahorro operativo)
- Calculadora de pricing
- Página completa de "Impacto Financiero"
- Constantes de pricing de Gemini en respuestas de API

## Qué se mantiene en modo PoC
- Subir y procesar audios
- Transcripciones
- Scores de calidad y criterios
- Fortalezas y áreas de mejora
- Comparación de llamadas (scores, no costos)
- Alertas de riesgo legal (si enterprise features están habilitadas)
- Badges de sentimiento, escenario y outcome

# Plan de Implementación: DeepAudit + Callfast SaaS

> Última actualización: 2026-01-31
> Branch: `claude/review-fasst-docs-6LEt8`
> Estado: **Fase de infraestructura completada. Pendiente: contenido sintético + pipeline real.**

---

## Resumen Ejecutivo

DeepAudit es una plataforma SaaS multi-tenant para auditoría automatizada de llamadas de call center. El cliente Callfast será el primer tenant en producción. Esta sesión implementó la base completa: autenticación, seguridad, pipeline foundation, observabilidad y billing infrastructure.

---

## ✅ COMPLETADO

### 1. Security Fixes

| Fix | Archivos | Estado |
|---|---|---|
| Eliminar `getPublicUrl()` — guardar solo filePath | `upload/route.ts`, `audio/route.ts` | ✅ |
| Validar path prefix con tenant_id | `process/route.ts` | ✅ |
| Tenant scoping en audio endpoint | `audio/route.ts` | ✅ |
| Middleware API key validation (con dev fallback) | `src/middleware.ts` | ✅ |
| Migración SQL: drop anon policies, RLS real con auth.uid() | `006_security_and_callfast.sql` | ✅ |

### 2. Pipeline Foundation (tipos e interfaces — sin audio real)

| Componente | Archivo | Estado |
|---|---|---|
| Silence detector (función pura) + 9 tests | `src/lib/silence/detector.ts` | ✅ |
| STT types (interfaces agnósticas) | `src/lib/stt/types.ts` | ✅ |
| Pipeline types (PipelineInput/Output/CostBreakdown) | `src/lib/pipeline.ts` | ✅ |
| AES-256-GCM encrypt/decrypt para BYOAK + 4 tests | `src/lib/crypto/keys.ts` | ✅ |
| Observability logger con sanitización + 3 tests | `src/lib/observability/logger.ts` | ✅ |
| Usage tracker para billing | `src/lib/usage/tracker.ts` | ✅ |

### 3. Autenticación Completa con Supabase Auth

| Componente | Archivo | Estado |
|---|---|---|
| Login page (con Suspense para Next.js 16) | `src/app/(auth)/login/page.tsx` | ✅ |
| Signup page | `src/app/(auth)/signup/page.tsx` | ✅ |
| Forgot password page | `src/app/(auth)/forgot-password/page.tsx` | ✅ |
| Reset password page | `src/app/(auth)/reset-password/page.tsx` | ✅ |
| Auth layout (sin sidebar) | `src/app/(auth)/layout.tsx` | ✅ |
| Auth callback (email confirmation) | `src/app/auth/callback/route.ts` | ✅ |
| Logout route | `src/app/api/auth/logout/route.ts` | ✅ |
| getAuthContext() + getTenantIdFromRequest() | `src/lib/auth/session.ts` | ✅ |
| Tenant resolver (hostname → tenant_id) + 5 tests | `src/lib/auth/tenant-resolver.ts` | ✅ |
| SQL trigger: auto-create user row on signup | `006_security_and_callfast.sql` | ✅ |
| Sidebar: user info + logout button | `src/components/dashboard/sidebar.tsx` | ✅ |
| Dashboard layout: auth context → sidebar props | `src/app/(dashboard)/layout.tsx` | ✅ |

### 4. Migración de DEMO_TENANT_ID

Todos los API routes de runtime ahora usan `getTenantIdFromRequest()` en lugar de DEMO_TENANT_ID:

- `src/app/api/calls/upload/route.ts` ✅
- `src/app/api/calls/process/route.ts` ✅
- `src/app/api/calls/[id]/audio/route.ts` ✅
- `src/app/api/stats/unit-economics/route.ts` ✅

`DEMO_TENANT_ID` en `constants.ts` marcado como `@deprecated`.

### 5. Migración de Cost Data (audits → processing_logs)

Las columnas `cost_usd`, `input_tokens`, `output_tokens`, `total_tokens` fueron eliminadas del tipo `Audit` y movidas a `processing_logs`:

- `src/app/(dashboard)/page.tsx` — query separado a processing_logs ✅
- `src/app/(dashboard)/reportes/page.tsx` — query separado a processing_logs ✅
- `src/app/(dashboard)/calls/[id]/page.tsx` — query separado a processing_logs ✅
- `src/app/api/calls/[id]/regenerate/route.ts` — eliminadas columnas del insert ✅
- `src/app/api/stats/unit-economics/route.ts` — consulta processing_logs ✅

### 6. Base de Datos (SQL Migration)

**Archivo:** `docs/migrations/006_security_and_callfast.sql`

Tablas nuevas:
- `campaigns`, `subcampaigns`, `commercial_offers`
- `silence_events`, `usage_logs`, `processing_logs`
- `tenant_domains`

Columnas nuevas en `tenants`: `pipeline_type`, `billing_model`, `price_per_minute`, `price_per_audit`, `gemini_api_key_encrypted`, `stt_api_key_encrypted`

Columnas nuevas en `calls`: `stt_transcript_url`, `channel_count`, `campaign_id`, `subcampaign_id`

Columnas nuevas en `audits`: `agent_transcript`, `client_transcript`, `total_silence_seconds`, `silence_count`, `pipeline_type`

RLS con `auth.uid()` + service_role bypass en todas las tablas.

Trigger `handle_new_user()` para auto-crear user row al signup.

### 7. Corrección de Tests Pre-existentes

Corregidos 30 tests que fallaban en 6 suites:

| Suite | Problema | Fix |
|---|---|---|
| criteria-weights | Cálculo esperado incorrecto (95.55→95.65) | Corregido valor |
| branding | Enterprise name/subtitle desactualizados | Actualizado a "DeepAudit Enterprise" / "CallFasst Intelligence" |
| feature-flags | Typo `getEnterprisConfig`, branding | Renombrado + actualizado |
| filters | `parseFiltersFromParams` no aceptaba URLSearchParams | Reescrito con soporte dual |
| kpi-cards | Import names incorrectos, prop `ltv`→`customLTV` | Corregidos imports y props |
| unit-economics | Labels del componente cambiados vs tests | Alineados |

### 8. Tests Totales

**220 tests pasan en 15 suites, 0 fallos.**

| Suite | Tests | Tipo |
|---|---|---|
| silence/detector | 9 | Unit |
| crypto/keys | 4 | Unit |
| observability/logger | 3 | Unit |
| auth/tenant-resolver | 5 | Unit |
| middleware | 4 | Unit |
| integration/auth-flow | 33 | Integration |
| integration/api-routes | 34 | Integration |
| integration/cost-data-integrity | 18 | Integration |
| components/badges | 10 | Component |
| components/kpi-cards | 14 | Component |
| components/unit-economics | 6 | Component |
| unit/branding | 12 | Unit |
| unit/criteria-weights | 4 | Unit |
| unit/feature-flags | 18 | Unit |
| unit/filters | 46 | Unit |

---

## ⏳ PENDIENTE

### P1: Contenido Sintético para POC (BLOQUEANTE)

**Problema:** No tenemos archivos de audio reales para probar el pipeline completo. Necesitamos datos sintéticos para validar el flujo end-to-end antes de la demo.

**Qué se necesita generar:**

1. **Audios sintéticos** (3-5 archivos .wav o .mp3):
   - Llamada buena (score ~90): agente cortés, resuelve problema, cierre profesional
   - Llamada mala (score ~40): agente grosero, no resuelve, sin cierre
   - Llamada con silencios largos (>30s): para probar silence detector
   - Llamada con riesgo legal: menciones de PROFECO, amenazas, información incorrecta
   - Llamada normal (score ~70): cumplimiento parcial

2. **Transcripciones JSON** (formato STT) para cada audio:
   - Con timestamps word-level
   - Con channel labels (agent=0, client=1)
   - Alineadas con el contenido del audio

3. **Datos seed para Supabase**:
   - 1 tenant (Callfast)
   - 1 usuario admin
   - 5 calls con sus audits
   - processing_logs para cada call
   - usage_logs para billing

### P2: Pipeline Callfast Real

Depende de P1 (necesita audio/transcripciones para testear).

| Tarea | Descripción | Prioridad |
|---|---|---|
| STT client (AssemblyAI o Deepgram) | Implementar `STTProvider` interface con un proveedor real | Alta |
| Pipeline orchestrator | `processPipeline()` que encadena: upload → STT → silence detection → LLM evaluation → save | Alta |
| Integrar observability logger en pipeline | Cada paso del pipeline registra en `processing_logs` | Alta |
| Integrar usage tracker | Cada llamada procesada registra en `usage_logs` | Media |

### P3: Funcionalidad Dashboard Pendiente

| Tarea | Descripción | Prioridad |
|---|---|---|
| Redirect logged-in users away from /login | Si ya tiene sesión, redirigir a / | Media |
| Dashboard settings page con tenant context | Actualmente usa DEMO_TENANT_ID | Media |
| Enterprise stats endpoint con tenant context | Actualmente usa DEMO_TENANT_ID | Baja |

### P4: Infraestructura Pre-Deploy

| Tarea | Descripción | Prioridad |
|---|---|---|
| Ejecutar migración 006 en Supabase | Aplicar SQL en la base de datos real | Alta |
| Configurar variables de entorno en Vercel | `INTERNAL_API_KEY`, `TENANT_KEY_ENCRYPTION_KEY` | Alta |
| Configurar bucket privado en Supabase | Cambiar permisos del bucket `call-recordings` | Alta |
| Configurar dominio callfast.deepaudit.com | DNS + Vercel domain | Alta |
| Seed data en Supabase | Tenant Callfast + dominio + usuario admin | Alta |

---

## Commits en esta Branch

```
480e1d8 fix: resolve all 30 failing tests across 6 test suites
c0cec58 test: add 85 integration tests for auth, API routes, and cost data integrity
a2fbea1 fix: resolve TypeScript compilation errors in dashboard pages
09e7318 fix: complete auth flow, migrate DEMO_TENANT_ID, fix dropped column refs
8d7c302 feat: add signup page and link from login
eff7b8a fix: wrap useSearchParams in Suspense boundary
5a2b997 feat: implement security fixes, pipeline foundation, auth, and billing infrastructure
15bae79 docs(spec): add implementation plan
```

---

## Arquitectura de Archivos Creados/Modificados

```
src/
├── middleware.ts                          # API key + auth + tenant resolution
├── lib/
│   ├── auth/
│   │   ├── session.ts                    # getAuthContext() + getTenantIdFromRequest()
│   │   └── tenant-resolver.ts            # hostname → tenant_id
│   ├── crypto/
│   │   └── keys.ts                       # AES-256-GCM encrypt/decrypt
│   ├── observability/
│   │   └── logger.ts                     # logStep() + sanitización
│   ├── pipeline.ts                       # PipelineInput/Output types
│   ├── silence/
│   │   └── detector.ts                   # detectSilences()
│   ├── stt/
│   │   └── types.ts                      # STTProvider interfaces
│   ├── usage/
│   │   └── tracker.ts                    # trackUsage() + getUsageSummary()
│   ├── constants.ts                      # DEMO_TENANT_ID (deprecated)
│   ├── feature-flags.ts                  # getEnterpriseConfig (typo fixed)
│   └── filters.ts                        # parseFiltersFromParams (URLSearchParams support)
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── auth/callback/route.ts
│   ├── api/auth/logout/route.ts
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # getAuthContext → Sidebar props
│   │   ├── page.tsx                      # cost data from processing_logs
│   │   ├── reportes/page.tsx             # cost data from processing_logs
│   │   └── calls/[id]/page.tsx           # cost data from processing_logs
│   └── api/
│       ├── calls/upload/route.ts         # filePath, tenant from header
│       ├── calls/process/route.ts        # path validation, tenant
│       ├── calls/[id]/audio/route.ts     # tenant scoped, signedUrl
│       ├── calls/[id]/regenerate/route.ts # no cost columns in insert
│       └── stats/unit-economics/route.ts  # queries processing_logs
├── components/
│   ├── dashboard/sidebar.tsx             # user info + logout
│   └── enterprise/
│       ├── kpi-coverage-card.tsx          # getEnterpriseConfig (fixed)
│       ├── kpi-money-saved-card.tsx       # getEnterpriseConfig (fixed)
│       ├── kpi-critical-alerts.tsx        # "Requieren atención" (fixed)
│       └── unit-economics-card.tsx        # labels aligned with tests
├── types/database.ts                     # all new table types
└── __tests__/
    ├── integration/
    │   ├── auth-flow.test.ts             # 33 tests
    │   ├── api-routes.test.ts            # 34 tests
    │   └── cost-data-integrity.test.ts   # 18 tests
    ├── auth/tenant-resolver.test.ts      # 5 tests
    ├── middleware.test.ts                # 4 tests
    └── components/
        ├── kpi-cards.test.tsx            # fixed imports/props
        └── unit-economics.test.tsx

docs/migrations/
└── 006_security_and_callfast.sql         # full migration + trigger
```

---

## Prompt para Retomar en Nueva Conversación

```
Contexto: Estoy continuando el trabajo en DeepAudit-SaaS, un proyecto SaaS multi-tenant
para auditoría automatizada de llamadas de call center. El primer cliente será Callfast.

Branch: claude/review-fasst-docs-6LEt8

Estado actual:
- Toda la infraestructura base está implementada y testeada (220 tests, 0 fallos)
- Auth completo: login, signup, forgot/reset password, auth callback, logout, session management
- Security: middleware con API key, tenant resolution por hostname, path validation, signed URLs
- Pipeline foundation: silence detector, STT types, pipeline types, crypto, observability, usage tracking
- Cost data migrada de audits a processing_logs en todos los endpoints y dashboard pages
- SQL migration lista en docs/migrations/006_security_and_callfast.sql (NO ejecutada aún en Supabase)
- Todos los tests pre-existentes que fallaban también fueron corregidos

Lee el plan completo en: spec/02-plan-implementacion-security-pipeline.md

Pendiente principal (sección ⏳ PENDIENTE del plan):
- P1: Contenido sintético para POC (audios, transcripciones, seed data)
- P2: Pipeline Callfast real (STT client, orchestrator)
- P3: Funcionalidad dashboard pendiente
- P4: Infraestructura pre-deploy (ejecutar migración, env vars, bucket privado, dominio)

Tarea actual: [DESCRIBIR LA TAREA ESPECÍFICA]
```

---

## Prompt para Generar Contenido Sintético (P1)

```
Necesito generar contenido sintético para el POC de DeepAudit/Callfast, una plataforma
de auditoría automatizada de llamadas de call center en México. Esto es para demostrar
el producto a un cliente potencial (Callfast) este fin de semana.

Branch: claude/review-fasst-docs-6LEt8
Plan: spec/02-plan-implementacion-security-pipeline.md

### Qué necesito generar:

1. **5 scripts de llamadas** (en español mexicano, contexto call center financiero/telecoms):

   a) LLAMADA EXCELENTE (target score ~92):
      - Agente saluda con nombre, verifica identidad
      - Escucha activamente, repite el problema del cliente
      - Resuelve la queja del cliente completamente
      - Cierre profesional con resumen y despedida
      - Duración: ~3 minutos

   b) LLAMADA DEFICIENTE (target score ~35):
      - Agente interrumpe constantemente
      - No verifica identidad del cliente
      - No resuelve el problema, da respuestas evasivas
      - Cuelga sin cierre apropiado
      - Duración: ~2 minutos

   c) LLAMADA CON SILENCIOS (target score ~60):
      - Conversación normal pero con 2 silencios de >30 segundos (hold sin avisar)
      - Un silencio de 45s donde el agente busca información
      - Duración: ~4 minutos

   d) LLAMADA CON RIESGO LEGAL (target score ~25):
      - Cliente menciona PROFECO
      - Agente da información incorrecta sobre derechos del consumidor
      - Agente amenaza al cliente o lo presiona indebidamente
      - Potencial violación Art. 128 LFPC
      - Duración: ~3 minutos

   e) LLAMADA PROMEDIO (target score ~70):
      - Cumplimiento parcial de protocolo
      - Resuelve pero sin empatía
      - Cierre apresurado
      - Duración: ~2.5 minutos

2. **Para cada script generar:**
   - El texto completo del diálogo (AGENTE: / CLIENTE:)
   - Transcripción en formato JSON con timestamps word-level simulados y channel labels
   - Los criterios de evaluación que aplican (los 4 estándar: Respeto y Cortesía 29%,
     Cumplimiento de Protocolo 24%, Resolución del Problema 29%, Cierre Profesional 18%)

3. **Datos seed SQL** para insertar en Supabase:
   - 1 tenant: Callfast (id: 00000000-0000-0000-0000-000000000001)
   - 1 tenant_domain: localhost:3000
   - 1 usuario admin: admin@callfast.mx
   - 5 calls (uno por script)
   - 5 audits con scores y transcripts generados
   - processing_logs para cada call (step: llm_evaluation, status: completed)
   - usage_logs para billing data

4. **Opcionalmente, generar los archivos de audio** usando TTS (ElevenLabs, Google TTS,
   o similar) con voces en español mexicano. Si no es posible generar audio real,
   al menos tener los scripts listos para grabación manual o TTS posterior.

### Criterios de evaluación (pesos actuales):
- Respeto y Cortesía: 29%
- Cumplimiento de Protocolo: 24%
- Resolución del Problema: 29%
- Cierre Profesional: 18%

### Formato de transcripción JSON esperado:
{
  "words": [
    { "word": "Buenos", "start": 0.0, "end": 0.3, "channel": 0 },
    { "word": "días", "start": 0.3, "end": 0.6, "channel": 0 },
    ...
  ],
  "channels": 2,
  "duration_seconds": 180
}

### Ubicación de archivos:
- Scripts: docs/synthetic/scripts/
- Transcripciones JSON: docs/synthetic/transcripts/
- Seed SQL: docs/synthetic/seed.sql
- Audio (si se genera): public/synthetic-audio/ (solo para dev, no producción)

Lee el schema completo en docs/migrations/006_security_and_callfast.sql y los tipos
en src/types/database.ts para asegurar que los seeds sean compatibles con la DB.
```

---

## Notas para el Desarrollador

### Lecciones aprendidas en esta sesión:

1. **Siempre implementar flujos completos** — login sin signup es un flujo roto. Auth callback sin trigger de user creation es un flujo roto. Pensar en el journey completo del usuario.

2. **Verificar TypeScript después de cada cambio** — `npx tsc --noEmit` debe correr después de cada fase de implementación, no al final.

3. **Presentar QA antes de implementar** — El usuario necesita ver y aprobar los hallazgos antes de que se empiecen a arreglar.

4. **No ignorar tests "pre-existentes"** — Si el código es del proyecto, los tests rotos son responsabilidad del proyecto. Arreglarlos todos.

5. **Los tests de integración por inspección de código** son confiables y rápidos. No requieren polyfills de Web APIs ni mocking complejo de Next.js runtime.

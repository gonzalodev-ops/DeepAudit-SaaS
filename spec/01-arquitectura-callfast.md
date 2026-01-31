# 01 — Arquitectura Callfast: Multi-Tenant en DeepAudit-SaaS

*Spec v2 — Actualización 31 de enero de 2026*

---

## Estado General

| Área | Estado |
|---|---|
| Decisiones de arquitectura | ✅ Cerradas |
| Seguridad (5 hallazgos críticos) | ✅ Implementados |
| Auth (Supabase Auth + tenant resolver) | ✅ Implementado |
| Migración SQL (schema + RLS + trigger) | ✅ Escrita, ⏳ NO ejecutada en Supabase |
| Types (database.ts) | ✅ Actualizados |
| Silence detector | ✅ Implementado + 9 tests |
| STT types (interfaces) | ✅ Implementados |
| Pipeline types (interfaces) | ✅ Implementados |
| Crypto (BYOAK prep) | ✅ Implementado + 4 tests |
| Observability (processing_logs) | ✅ Implementado + 3 tests |
| Usage tracker (billing) | ✅ Implementado |
| Cost data migration (audits → processing_logs) | ✅ Implementado |
| Tests (220 total, 0 fallos) | ✅ Todo verde |
| **STT client real** | ⏳ Pendiente (depende de evaluación con audio) |
| **Pipeline orchestrator real** | ⏳ Pendiente (depende de STT client) |
| **processTextWithGemini()** | ⏳ Pendiente |
| **Supabase Edge Function** | ⏳ Pendiente |
| **Contenido sintético para POC** | ⏳ Pendiente (BLOQUEANTE) |
| **Frontend: polling, silencios, transcript por canal** | ⏳ Pendiente |
| **Infraestructura deploy (migración, env vars, dominio)** | ⏳ Pendiente |

---

## Decisiones Tomadas

| Decisión | Resolución |
|---|---|
| **Repo** | Un solo repo (DeepAudit-SaaS). Pipeline configurable por tenant. Sin fork. |
| **Deploy** | Un solo deploy en Vercel Hobby. Dominios custom por tenant. |
| **Procesamiento async** | Supabase Edge Functions (Vercel Hobby tiene 60s timeout) |
| **STT** | AssemblyAI vs Deepgram — se decide tras evaluación side-by-side con audio real |
| **Fallback entre STT** | No para MVP. Solo un proveedor. |
| **Campañas en POC** | Hardcoded via SQL, sin UI CRUD |
| **Infraestructura** | Cloud/Serverless. No on-prem. |
| **Auth** | Supabase Auth (email/password) + tenant resolution por hostname + RLS real ✅ |
| **Cost tracking** | Movido de `audits` a `processing_logs` (por paso) + `usage_logs` (billing) ✅ |
| **BYOAK** | Infraestructura crypto lista, no activada para POC ✅ |

---

## 1. Arquitectura Multi-Tenant con Pipeline Configurable

```
Un solo deploy en Vercel
  ├── deepaudit.dominio.com  → tenant DeepAudit (pipeline legacy: Gemini audio)
  ├── callfast.dominio.com   → tenant Callfast (pipeline nuevo: STT + silencios + Gemini texto)
  └── app.otrocliente.mx     → futuro tenant (pipeline configurable)
```

**Resolución de tenant por hostname:** ✅ Implementado en `src/lib/auth/tenant-resolver.ts`
- POC: mapa hardcoded (localhost → tenant default)
- MVP: lookup en tabla `tenant_domains`

**Middleware:** ✅ Implementado en `src/middleware.ts`
- API routes: valida `X-API-Key` header (con dev fallback)
- Dashboard routes: valida sesión Supabase Auth
- Todas las rutas: resuelve tenant por hostname, inyecta `x-tenant-id` header

### Pipeline Legacy (DeepAudit existente — no se toca) ✅
```
Audio → Gemini (audio base64) → AuditResult
```

### Pipeline Callfast (nuevo) ⏳ Parcialmente implementado
```
Audio estéreo MP3
  ↓
  Supabase Storage (guardar audio)              ✅ (upload route ya guarda)
  ↓
  Supabase Edge Function (procesamiento async):  ⏳ NO implementado
    1. Lee audio de Storage
    2. STT Service → transcripción por canal      ⏳ Solo interfaces (src/lib/stt/types.ts)
    3. Silence Detector → silence_events[]        ✅ (src/lib/silence/detector.ts)
    4. Gemini Flash (TEXTO, no audio) → evaluación ⏳ processTextWithGemini() no existe
  ↓
  Guarda resultados en DB
  ↓
  Frontend hace polling hasta status=completed    ⏳ NO implementado
```

### Estructura de archivos

```
src/lib/stt/
  types.ts          ✅ Interfaces STT agnósticas del proveedor
  client.ts         ⏳ Cliente del STT elegido (AssemblyAI o Deepgram)

src/lib/silence/
  detector.ts       ✅ Detección de silencios sobre timestamps (9 tests)

src/lib/pipeline.ts ✅ Tipos (PipelineInput/Output/CostBreakdown)
                    ⏳ Orquestador real (processPipeline())

supabase/functions/
  process-call/     ⏳ Edge Function que ejecuta el pipeline
```

### gemini.ts — Cambios Pendientes ⏳

Se necesita agregar `processTextWithGemini()` junto al existente `processAudioWithGemini()`. Ambos coexisten.

La nueva función recibe:
- Transcripción etiquetada por canal: `[Agente 0:00] Hola...\n[Cliente 0:03] Buenas...`
- Resumen de silencios: `3 silencios del agente: 0:45-1:18 (33s), ...`
- Contexto de oferta comercial (RAG, para fase posterior)
- Criterios y manual (igual que hoy)

---

## 2. Procesamiento Asíncrono ⏳ NO implementado

```
Frontend                    Vercel API                  Supabase Edge Function
   |                           |                              |
   |-- POST /upload ---------->|                              |
   |                           |-- guarda audio en Storage    |
   |                           |-- crea call status=pending   |
   |                           |-- invoca Edge Function ----->|
   |<-- { callId } ------------|                              |
   |                           |                              |-- lee audio de Storage
   |-- GET /status/callId ---->|                              |-- STT multicanal
   |<-- { status: processing } |                              |-- detección silencios
   |                           |                              |-- Gemini evaluación (texto)
   |-- GET /status/callId ---->|                              |-- guarda en DB
   |<-- { status: completed }  |                              |-- status=completed
```

**Pendiente:** Edge Function `process-call`, endpoint `/api/calls/[id]/status`, frontend polling.

---

## 3. Base de Datos

### Tablas nuevas ✅ (en migración, no ejecutada)

**Archivo:** `docs/migrations/006_security_and_callfast.sql`

- `campaigns`, `subcampaigns`, `commercial_offers` ✅
- `silence_events` ✅
- `usage_logs` (billing) ✅
- `processing_logs` (observabilidad) ✅
- `tenant_domains` (hostname resolution) ✅

### Columnas nuevas ✅

- `tenants`: `pipeline_type`, `billing_model`, `price_per_minute`, `price_per_audit`, `gemini_api_key_encrypted`, `stt_api_key_encrypted`
- `calls`: `stt_transcript_url`, `channel_count`, `campaign_id`, `subcampaign_id`
- `audits`: `agent_transcript`, `client_transcript`, `total_silence_seconds`, `silence_count`, `pipeline_type`

### Cost tracking ✅ Migrado

| Tabla | Propósito |
|---|---|
| `audits` | Score, resumen, transcript. **Sin costos** (eliminados) |
| `processing_logs` | Costo por paso, tokens, duración, errores |
| `usage_logs` | Facturación al cliente |

### RLS ✅

- Todas las tablas con `auth.uid()` para tenant isolation
- `service_role` bypass para API routes
- Trigger `handle_new_user()` para auto-crear user row al signup

### ⚠️ MIGRACIÓN NO EJECUTADA

El archivo SQL existe pero NO se ha aplicado a Supabase. Ejecutar antes del deploy.

---

## 4. API Routes

### Implementados ✅

| Route | Estado |
|---|---|
| `POST /api/calls/upload` | ✅ filePath (no getPublicUrl), tenant from header |
| `POST /api/calls/process` | ✅ path validation, tenant scoping |
| `GET /api/calls/[id]/audio` | ✅ tenant scoped, signedUrl |
| `POST /api/calls/[id]/regenerate` | ✅ sin cost columns |
| `GET /api/stats/unit-economics` | ✅ queries processing_logs |
| `POST /api/auth/logout` | ✅ |
| `GET /auth/callback` | ✅ |

### Pendientes ⏳

| Route | Propósito | Prioridad |
|---|---|---|
| `GET /api/calls/[id]/status` | Polling de estado de procesamiento | Alta (POC) |
| `GET /api/calls/[id]/silences` | Eventos de silencio de una llamada | Media (POC) |
| `CRUD /api/campaigns` | Gestión de campañas | Baja (MVP) |
| `POST /api/calls/batch-upload` | Subir múltiples llamadas | Baja (MVP) |

### Supabase Edge Function ⏳

| Function | Propósito | Estado |
|---|---|---|
| `process-call` | Pipeline completo: STT → silencios → Gemini texto → guardar | ⏳ |

---

## 5. Frontend

### POC — Cambios pendientes ⏳

- **Upload form:** Cambiar de espera síncrona a polling con indicador de progreso
- **Call detail page:** Sección de silencios con timeline visual. Transcripción separada por canal.
- **Dashboard:** Tarjeta de "Silencios promedio" si tenant es Callfast

### Implementado ✅

- Auth completo (login, signup, forgot/reset password)
- Sidebar con user info + logout
- Dashboard layout con auth context
- Cost data desde processing_logs en todas las páginas

---

## 6. Seguridad

### Hallazgos CRÍTICOS ✅ Resueltos

| # | Hallazgo | Estado |
|---|---|---|
| 1 | Bucket público + getPublicUrl() | ✅ getPublicUrl eliminado, filePath guardado |
| 2 | RLS con USING(true), anon puede leer todo | ✅ RLS con auth.uid() + service_role |
| 3 | Zero autenticación en API routes | ✅ Middleware API key + Supabase Auth |

### Hallazgos HIGH ✅ Resueltos

| # | Hallazgo | Estado |
|---|---|---|
| 4 | process/route.ts acepta path arbitrario | ✅ Validación path.startsWith(tenantId) |
| 5 | Audio endpoint sin validación de tenant | ✅ .eq('tenant_id', tenantId) |
| 6 | Retención de datos | Pendiente: definir política con Callfast |
| 7 | Audio enviado a Google/STT | Pendiente: documentar sub-procesadores, DPA |
| 8 | Sin rate limiting | Pendiente: budget cap en Google Cloud |

### Hallazgos MEDIUM ⏳

| # | Hallazgo | Estado |
|---|---|---|
| 9 | Sin validación magic bytes en uploads | ⏳ |
| 10 | Sin recuperación de jobs stuck | ⏳ |
| 11 | Service role key sin scoping por ambiente | ⏳ |
| 12 | Sin audit log para compliance | ⏳ |

### Acciones pre-deploy ⏳

1. ~~Bucket → privado + eliminar getPublicUrl()~~ ✅ Código listo
2. ~~Eliminar RLS policies anon~~ ✅ En migración
3. ~~Middleware X-API-Key~~ ✅
4. ~~Validar path en process/route.ts~~ ✅
5. Budget cap en Google Cloud Console ⏳ (acción manual)
6. **Cambiar bucket a privado en Supabase Dashboard** ⏳ (acción manual)

---

## 7. Modelo de Operación

**Nosotros procesamos, ellos retienen.** DeepAudit recibe audio vía API, procesa (STT + silencios + evaluación), y devuelve resultados estructurados. Callfast se encarga de:
- Política de retención de datos en su lado
- Gestión de consentimiento con sus clientes
- Cumplimiento regulatorio local

---

## 8. Secuencia de Implementación Actualizada

### ✅ COMPLETADO

| Paso | Qué |
|---|---|
| 1 | Migración SQL: tablas, columnas, RLS, trigger |
| 2 | Types: database.ts con todos los tipos nuevos |
| 3 | Security fixes: getPublicUrl, path validation, tenant scoping |
| 4 | Middleware: API key + auth + tenant resolution |
| 5 | Auth completo: login, signup, forgot/reset password, callback, logout, session |
| 6 | Silence detector (puro, testeable, 9 tests) |
| 7 | STT types + Pipeline types (interfaces) |
| 8 | Crypto (AES-256-GCM), Observability (logger), Usage tracker |
| 9 | Cost data migration (audits → processing_logs) |
| 10 | DEMO_TENANT_ID → getTenantIdFromRequest() en todos los API routes |
| 11 | Fix 30 tests pre-existentes + 85 integration tests nuevos |

### ⏳ SIGUIENTE: Contenido Sintético (BLOQUEANTE)

| Paso | Qué |
|---|---|
| 12 | Generar 5 scripts de llamadas sintéticas (español mexicano) |
| 13 | Generar transcripciones JSON con timestamps word-level |
| 14 | Generar datos seed SQL (tenant, usuario, calls, audits, processing_logs) |
| 15 | Opcionalmente: generar audios con TTS |

### ⏳ SIGUIENTE: Pipeline Real

| Paso | Qué |
|---|---|
| 16 | Evaluación side-by-side AssemblyAI vs Deepgram |
| 17 | STT client del proveedor elegido |
| 18 | `processTextWithGemini()` en gemini.ts |
| 19 | Pipeline orquestador: STT → silencios → Gemini |
| 20 | Supabase Edge Function: process-call |
| 21 | Upload route: async + invocación Edge Function |
| 22 | Status endpoint + frontend polling |
| 23 | Frontend: silencios, transcripción por canal, progreso |

### ⏳ Pre-Deploy

| Paso | Qué |
|---|---|
| 24 | Ejecutar migración 006 en Supabase |
| 25 | Configurar env vars en Vercel |
| 26 | Bucket privado en Supabase Dashboard |
| 27 | Dominio callfast.deepaudit.com |
| 28 | Seed data (tenant + usuario admin) |

### Post-POC (MVP)

| Paso | Qué |
|---|---|
| 29 | Campaign CRUD + commercial offers |
| 30 | Dashboard por rol |
| 31 | Batch upload |
| 32 | RAG dinámico para ofertas comerciales |

---

## 9. Tests

**220 tests, 15 suites, 0 fallos.**

Ver detalle completo en `spec/02-plan-implementacion-security-pipeline.md` sección "8. Tests Totales".

# 01 — Arquitectura Callfast: Multi-Tenant en DeepAudit-SaaS

*Spec v1 — 30 de enero de 2026*

## Decisiones Tomadas

| Decisión | Resolución |
|---|---|
| **Repo** | Un solo repo (DeepAudit-SaaS). Pipeline configurable por tenant. Sin fork. |
| **Deploy** | Un solo deploy en Vercel Hobby. Dominios custom por tenant (ej. `deepaudit.dominio.com`, `callfast.dominio.com`). |
| **Procesamiento async** | Supabase Edge Functions (Vercel Hobby tiene 60s timeout) |
| **STT** | AssemblyAI vs Deepgram — se decide tras evaluación side-by-side con audio real |
| **Fallback entre STT** | No para MVP. Solo un proveedor. |
| **Campañas en POC** | Hardcoded via SQL, sin UI CRUD |
| **Infraestructura** | Cloud/Serverless. No on-prem. |

---

## 1. Arquitectura Multi-Tenant con Pipeline Configurable

```
Un solo deploy en Vercel
  ├── deepaudit.dominio.com  → tenant DeepAudit (pipeline legacy: Gemini audio)
  ├── callfast.dominio.com   → tenant Callfast (pipeline nuevo: STT + silencios + Gemini texto)
  └── app.otrocliente.mx     → futuro tenant (pipeline configurable)
```

**Resolución de tenant por hostname:**
```typescript
const host = request.headers.get('host')
// Mapeo hostname → tenant_id en DB o config
```

### Pipeline Legacy (DeepAudit existente — no se toca)
```
Audio → Gemini (audio base64) → AuditResult
```

### Pipeline Callfast (nuevo)
```
Audio estéreo MP3
  ↓
  Supabase Storage (guardar audio)
  ↓
  Supabase Edge Function (procesamiento async):
    1. Lee audio de Storage
    2. STT Service (multichannel=true) → transcripción por canal + timestamps
    3. Silence Detector (código propio) → silence_events[]
    4. Gemini Flash (TEXTO, no audio) → evaluación + resumen + sentimiento
  ↓
  Guarda resultados en DB
  ↓
  Frontend hace polling hasta status=completed
```

### Selección de pipeline

Campo `pipeline_type` en tabla `tenants`:
- `'legacy'` → `processAudioWithGemini()` (existente, intacto)
- `'callfast'` → STT → silencios → `processTextWithGemini()` (nuevo)

### Estructura de archivos nuevos

```
src/lib/stt/
  types.ts          — interfaces STT agnósticas del proveedor
  client.ts         — cliente del STT elegido (AssemblyAI o Deepgram)

src/lib/silence/
  detector.ts       — detección de silencios sobre timestamps (puro, testeable)

src/lib/pipeline.ts — orquestador: STT → silencios → Gemini(texto)

supabase/functions/
  process-call/     — Edge Function que ejecuta el pipeline
```

### gemini.ts — Cambios

Se agrega `processTextWithGemini()` junto al existente `processAudioWithGemini()`. Ambos coexisten.

La nueva función recibe:
- Transcripción etiquetada por canal: `[Agente 0:00] Hola...\n[Cliente 0:03] Buenas...`
- Resumen de silencios: `3 silencios del agente: 0:45-1:18 (33s), ...`
- Contexto de oferta comercial (RAG, para fase posterior)
- Criterios y manual (igual que hoy)

El prompt cambia en que ya no pide transcribir — solo evaluar. El resto (criterios, ETI, campos enterprise) es idéntico.

---

## 2. Procesamiento Asíncrono (Supabase Edge Functions)

**Problema:** El pipeline toma ~30-90s (STT ~15s + silencios ~1s + Gemini ~15s). Vercel Hobby tiene 60s timeout.

**Solución:** Supabase Edge Functions.

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
   |                           |                              |
   |-- redirige a /calls/id -->|                              |
```

**Edge Functions:** 150s en plan Free, 400s en Pro. Suficiente para el pipeline.

**Frontend:** Cambia de espera síncrona a polling cada 3-5 segundos con indicador de progreso:
"Transcribiendo... → Analizando silencios... → Evaluando..."

---

## 3. Cambios de Base de Datos

### Nuevas tablas

```sql
-- Campañas (jerarquía: tenant → campaign → subcampaign → offer)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  audit_criteria JSONB DEFAULT '[]',
  manual_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subcampaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commercial_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcampaign_id UUID REFERENCES subcampaigns(id) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Eventos de silencio (un registro por cada silencio detectado)
CREATE TABLE silence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) NOT NULL,
  start_seconds FLOAT NOT NULL,
  end_seconds FLOAT NOT NULL,
  duration_seconds FLOAT NOT NULL,
  channel INT DEFAULT 0,  -- 0=agente, 1=cliente
  silence_type TEXT,       -- 'dead_silence' | 'agent_listening' | 'hold'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Columnas nuevas en tablas existentes

```sql
-- tenants
ALTER TABLE tenants ADD COLUMN pipeline_type TEXT DEFAULT 'legacy';
  -- 'legacy' = Gemini directo (existente)
  -- 'callfast' = STT → silencios → Gemini texto

-- calls
ALTER TABLE calls ADD COLUMN campaign_id UUID REFERENCES campaigns(id);
ALTER TABLE calls ADD COLUMN subcampaign_id UUID REFERENCES subcampaigns(id);
ALTER TABLE calls ADD COLUMN stt_transcript_url TEXT;   -- JSON del STT guardado en Storage
ALTER TABLE calls ADD COLUMN channel_count INT DEFAULT 1;

-- audits
ALTER TABLE audits ADD COLUMN stt_cost_usd FLOAT;
ALTER TABLE audits ADD COLUMN total_silence_seconds FLOAT;
ALTER TABLE audits ADD COLUMN silence_count INT;
ALTER TABLE audits ADD COLUMN pipeline_type TEXT DEFAULT 'legacy';
ALTER TABLE audits ADD COLUMN agent_transcript TEXT;    -- transcripción solo agente
ALTER TABLE audits ADD COLUMN client_transcript TEXT;   -- transcripción solo cliente
```

---

## 4. API Routes — Cambios

### Modificados

| Route | Cambio |
|---|---|
| `POST /api/calls/upload` | Async: guarda audio, crea registro, invoca Edge Function, retorna callId |
| `GET /api/calls/[id]` (page) | Mostrar silence_events, transcripción por canal, cost breakdown |
| `GET /api/stats/unit-economics` | Sumar `stt_cost_usd + cost_usd` para costo total |

### Nuevos (POC)

| Route | Propósito |
|---|---|
| `GET /api/calls/[id]/status` | Polling de estado de procesamiento |
| `GET /api/calls/[id]/silences` | Eventos de silencio de una llamada |

### Nuevos (MVP)

| Route | Propósito |
|---|---|
| `CRUD /api/campaigns` | Gestión de campañas |
| `CRUD /api/campaigns/[id]/subcampaigns` | Gestión de subcampañas |
| `CRUD /api/campaigns/[id]/offers` | Gestión de ofertas comerciales |
| `POST /api/calls/batch-upload` | Subir múltiples llamadas |

### Supabase Edge Function (POC)

| Function | Propósito |
|---|---|
| `process-call` | Pipeline completo: STT → silencios → Gemini texto → guardar resultados |

---

## 5. Frontend — Impacto

### POC (Cambios mínimos)

- **Upload form:** Agregar dropdown de campaña/subcampaña (solo visible si tenant es Callfast). Cambiar de espera síncrona a polling con indicador de progreso.
- **Call detail page:** Nueva sección de silencios con timeline visual. Transcripción separada por canal con etiquetas visuales (Agente/Cliente). Cost breakdown (STT + Gemini).
- **Dashboard:** Agregar tarjeta de "Silencios promedio" si tenant es Callfast.

### MVP (Vistas nuevas)

- Gestión de campañas/subcampañas
- Dashboard por rol (filtrado según usuario)
- Interfaz de carga batch
- CRUD de ofertas comerciales

---

## 6. Storage

| Contenido | Ubicación | Path |
|---|---|---|
| Audio MP3 | Supabase Storage `call-recordings` | `{tenant_id}/{timestamp}-{filename}` (igual que hoy) |
| JSON del STT | Supabase Storage `stt-transcripts` (nuevo bucket) | `{tenant_id}/{call_id}.json` |

Se guarda el JSON crudo del STT para: debugging, reprocesamiento, y auditoría.

---

## 7. Tracking de Costos Unificado

| Campo | Fuente |
|---|---|
| `audits.cost_usd` | Costo Gemini (existente) |
| `audits.stt_cost_usd` | Costo STT (nuevo) |
| Total | `cost_usd + stt_cost_usd` calculado en queries |

Los componentes de unit economics existentes se extienden para sumar ambas columnas.

---

## 8. Multi-Tenant — Evolución

| Fase | Approach |
|---|---|
| **POC** | Dos tenants hardcoded: `DEMO_TENANT_ID` (legacy) + `CALLFAST_TENANT_ID` (callfast). Resolución por hostname. Sin auth. |
| **MVP** | Supabase Auth + RLS. Tenant ID viene del user autenticado. Dominios custom en Vercel. |

---

## 9. Lo que se MANTIENE vs lo que se AGREGA

### Se mantiene intacto
- Pipeline legacy (`processAudioWithGemini()`) para tenant DeepAudit
- Frontend completo (dashboard, call detail, upload, settings, compare, reports)
- Componentes UI (shadcn/ui, layout, sidebar)
- Estructura de DB existente (tenants, users, calls, audits)
- Feature flags existentes
- Cost tracking existente
- Configuración Next.js, Tailwind, ESLint, Jest

### Se agrega/extiende
- `processTextWithGemini()` nueva función en gemini.ts (coexiste con la existente)
- Upload route: condicional — síncrono para legacy, async con Edge Function para callfast
- Nuevo: `src/lib/stt/`, `src/lib/silence/`, `src/lib/pipeline.ts`
- Nuevo: `supabase/functions/process-call/`
- Nuevo: endpoint `/api/calls/[id]/status` para polling
- Nuevo: resolución de tenant por hostname
- Frontend: call detail extiende con silencios y transcripción por canal (condicional por tenant)
- Frontend: upload extiende con polling (condicional por pipeline_type)
- DB: nuevas tablas (campaigns, subcampaigns, commercial_offers, silence_events)
- DB: nuevas columnas en tenants, calls, audits

---

## 10. Secuencia de Implementación

### Pre-POC (antes de tener audio real)

| Paso | Qué |
|---|---|
| 1 | Evaluación side-by-side AssemblyAI vs Deepgram (con audio real o sintético) |
| 2 | Decidir proveedor STT |

### POC

| Paso | Qué | Archivos |
|---|---|---|
| 3 | Migraciones DB: tablas campaigns, silence_events, columnas nuevas | `docs/migrations/006_callfast_schema.sql` |
| 4 | Types: actualizar database.ts con nuevos tipos | `src/types/database.ts` |
| 5 | STT client del proveedor elegido | `src/lib/stt/` |
| 6 | Silence detector: puro, testeable | `src/lib/silence/detector.ts` |
| 7 | `processTextWithGemini()` reemplazando audio por texto | `src/lib/gemini.ts` |
| 8 | Pipeline orquestador: STT → silencios → Gemini | `src/lib/pipeline.ts` |
| 9 | Supabase Edge Function: process-call | `supabase/functions/process-call/` |
| 10 | Upload route: async + invocación Edge Function | `src/app/api/calls/upload/route.ts` |
| 11 | Status endpoint + frontend polling | `src/app/api/calls/[id]/status/route.ts` |
| 12 | Frontend: silencios, transcripción por canal, progreso | Components + call detail page |
| 13 | Correr 100-150 llamadas del POC | — |

### MVP (Post-POC)

| Paso | Qué |
|---|---|
| 14 | Supabase Auth + roles + RLS real |
| 15 | Campaign CRUD + commercial offers |
| 16 | Dashboard por rol |
| 17 | Batch upload |
| 18 | RAG dinámico para ofertas comerciales |

---

## 11. Verificación

- **Unit tests:** Silence detector con fixtures de timestamps conocidos
- **Integration test:** Pipeline completo con audio sintético estéreo
- **Side-by-side:** Mismas llamadas por AssemblyAI y Deepgram, comparar transcripción, timestamps, y costo real
- **Smoke test:** Subir audio estéreo → verificar transcripción por canal → verificar silencios → verificar evaluación Gemini
- **POC validation:** Correr 100-150 llamadas, presentar resultados a Eduardo y Alejandro

---

## 12. Revisión de Seguridad

### Hallazgos CRÍTICOS (resolver antes del POC)

| # | Hallazgo | Riesgo | Fix |
|---|---|---|---|
| 1 | **Bucket `call-recordings` es público.** El código usa `getPublicUrl()` — cualquiera con el patrón de URL puede descargar audios. | Exfiltración de grabaciones con PII de clientes | Cambiar bucket a **privado**. Guardar solo el path en DB. Usar `createSignedUrl()` para todo acceso. |
| 2 | **RLS usa `USING (true)` en todas las tablas.** Anon y authenticated leen TODOS los datos de TODOS los tenants. Anon puede INSERT en calls. | Zero aislamiento entre tenants. Acceso total desde browser con anon key. | Eliminar TODAS las policies `anon`. Restringir `authenticated` con filtro `tenant_id`. |
| 3 | **Zero autenticación en todos los API routes.** No hay middleware, no hay session check, no hay API key. | Cualquiera puede subir archivos, quemar créditos Gemini, leer datos. | Agregar middleware `X-API-Key` en todas las rutas. |

### Hallazgos HIGH (resolver antes del MVP)

| # | Hallazgo | Riesgo | Fix |
|---|---|---|---|
| 4 | **`process/route.ts` acepta path arbitrario.** Un atacante puede leer archivos de otro tenant. | Cross-tenant data exfiltration | Validar que `path` inicie con tenant_id del solicitante. |
| 5 | **Endpoint de audio sin validación de tenant.** Cualquier UUID de call devuelve signed URL. | IDOR — acceso a grabaciones ajenas | Agregar `.eq('tenant_id', tenantId)` al query. |
| 6 | **Retención de datos.** Transcripciones con datos personales almacenadas. | Riesgo en breach | **Modelo: nosotros procesamos y devolvemos resultados vía API. Callfast se encarga de la política de retención en su lado.** Definir retención mínima de nuestro lado (ej. 30 días para reprocesamiento) y purga automática. |
| 7 | **Audio enviado a Google/STT.** Datos de clientes transitan por Google, AssemblyAI/Deepgram. | Riesgo legal/regulatorio | Gemini está en tier pagado (confirmado). Documentar sub-procesadores, habilitar zero-retention en STT, firmar DPA con Callfast. |
| 8 | **Sin rate limiting.** El endpoint de upload puede ser abusado para quemar créditos. | Abuso financiero | API key + budget cap en Google Cloud + rate limiting básico. |

### Hallazgos MEDIUM (para producción)

| # | Hallazgo | Fix |
|---|---|---|
| 9 | Sin validación de magic bytes en uploads (MIME type viene del cliente) | Validar primeros bytes del archivo (MP3: `FF FB`, WAV: `RIFF`) |
| 10 | Sin recuperación de jobs stuck en `processing` | Cron que marca como `failed` después de 5 min |
| 11 | Service role key sin scoping por ambiente | Separar secrets por environment en Vercel |
| 12 | Sin audit log para compliance | Tabla `audit_log` con actor, acción, recurso, timestamp |

### Acciones Inmediatas (hacer antes de procesar audio real de Callfast)

1. Bucket `call-recordings` → **privado** + eliminar `getPublicUrl()`
2. Eliminar TODAS las RLS policies de `anon`
3. Middleware `X-API-Key` en todas las rutas API
4. Validar `path` en `process/route.ts`
5. Budget cap en Google Cloud Console para Gemini API

*Estas 5 acciones son implementables en un día y eliminan los 3 hallazgos CRÍTICOS.*

---

## 13. Modelo de Operación

**Nosotros procesamos, ellos retienen.** DeepAudit recibe audio vía API, procesa (STT + silencios + evaluación), y devuelve resultados estructurados. Callfast se encarga de:
- Política de retención de datos en su lado
- Gestión de consentimiento con sus clientes
- Cumplimiento regulatorio local

De nuestro lado: retención mínima para reprocesamiento/debugging (configurable por tenant), purga automática después del periodo.

---

## 14. Notas de Diseño

- **Un repo, un deploy, múltiples tenants:** Vercel permite asignar dominios custom sin costo adicional. El código detecta el tenant por hostname y aplica el pipeline correspondiente.
- **Ambos pipelines coexisten:** El legacy (Gemini audio) sigue funcionando para DeepAudit. El nuevo (STT + silencios + Gemini texto) se activa solo para tenants con `pipeline_type='callfast'`.
- **Bugfixes y mejoras de UI** aplican automáticamente a todos los tenants.
- **Cada tenant tiene** su propia configuración: criterios de auditoría, manual de calidad, pipeline_type, campañas.

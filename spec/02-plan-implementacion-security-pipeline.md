# Plan: Security Fixes + Pipeline Foundation (sin audio)

## Parte 1: Security Fixes (5 acciones críticas)

### Fix 1: Bucket privado — eliminar `getPublicUrl()`

**Archivo:** `src/app/api/calls/upload/route.ts` (líneas 59-62, 70)

**Cambio:** Reemplazar `getPublicUrl()` por guardar solo el `filePath` en la DB. El audio se accede via `createSignedUrl()` que ya existe en `src/app/api/calls/[id]/audio/route.ts`.

```typescript
// ANTES (línea 59-62):
const { data: urlData } = supabase.storage
  .from('call-recordings')
  .getPublicUrl(filePath)

// DESPUÉS:
// No llamar getPublicUrl. Guardar filePath directamente.

// ANTES (línea 70):
audio_url: urlData.publicUrl,

// DESPUÉS:
audio_url: filePath,  // solo el path, no URL pública
```

**Archivo:** `src/app/api/calls/[id]/audio/route.ts` — adaptar para recibir path en vez de URL completa. Hoy extrae el path de la URL; si guardamos solo el path, simplificamos.

**Nota:** Requiere cambiar el bucket a privado en Supabase Dashboard (manual, no código).

---

### Fix 2: Eliminar políticas `anon` de RLS

**Archivo:** `docs/migrations/006_security_fixes.sql` (nuevo)

```sql
-- Eliminar todas las políticas anon
DROP POLICY IF EXISTS "Allow anon read audits" ON public.audits;
DROP POLICY IF EXISTS "Allow anon read calls" ON public.calls;
DROP POLICY IF EXISTS "Allow anon insert calls" ON public.calls;
DROP POLICY IF EXISTS "Allow anon read tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow anon read users" ON public.users;
```

---

### Fix 3: Middleware `X-API-Key`

**Archivo nuevo:** `src/middleware.ts` (Next.js middleware)

- Intercepta todas las rutas `/api/*`
- Valida header `X-API-Key` contra `process.env.INTERNAL_API_KEY`
- Retorna 401 si falta o es inválido
- Excluye rutas públicas si las hay (ninguna por ahora)

**Archivo:** `.env.example` — agregar `INTERNAL_API_KEY`

---

### Fix 4: Validar `path` en `process/route.ts`

**Archivo:** `src/app/api/calls/process/route.ts` (línea 11-15)

```typescript
// Después de extraer path:
const tenantId = DEMO_TENANT_ID // después vendrá del auth
if (!path.startsWith(`${tenantId}/`)) {
  return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
}
```

---

### Fix 5: Tenant scoping en endpoint de audio

**Archivo:** `src/app/api/calls/[id]/audio/route.ts` (líneas 14-18)

```typescript
// Agregar filtro de tenant:
.eq('tenant_id', DEMO_TENANT_ID)  // después vendrá del auth
```

---

## Parte 2: Pipeline Foundation (sin audio)

Lo que podemos implementar sin tener grabaciones reales:

### 2.1 Silence Detector (puro, testeable)

**Archivo nuevo:** `src/lib/silence/detector.ts`

Función pura que recibe timestamps de palabras y retorna eventos de silencio. No depende de audio ni APIs externas.

```typescript
interface WordTimestamp {
  word: string
  start: number  // segundos
  end: number
  channel: number  // 0=agente, 1=cliente
}

interface SilenceEvent {
  start_seconds: number
  end_seconds: number
  duration_seconds: number
  channel: number
  silence_type: 'dead_silence' | 'agent_listening' | 'hold'
}

function detectSilences(
  words: WordTimestamp[],
  thresholdSeconds: number = 30
): SilenceEvent[]
```

**Tests:** `src/lib/silence/__tests__/detector.test.ts` con fixtures de timestamps conocidos.

### 2.2 Usage Tracking para Facturación

**Archivo nuevo:** `docs/migrations/006_security_and_callfast.sql` (incluir en la migración)

Nueva tabla `usage_logs` — un registro por cada llamada procesada, orientado a facturación:

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  call_id UUID REFERENCES calls(id) NOT NULL,
  audio_duration_seconds FLOAT NOT NULL,     -- duración real del audio
  audio_duration_minutes FLOAT NOT NULL,     -- para facturar por minuto
  pipeline_type TEXT NOT NULL,               -- 'legacy' | 'callfast'
  stt_cost_usd FLOAT,                       -- costo STT (null si BYOAK)
  llm_cost_usd FLOAT,                       -- costo Gemini (null si BYOAK)
  total_internal_cost_usd FLOAT,            -- nuestro costo real
  billing_status TEXT DEFAULT 'pending',     -- 'pending' | 'billed' | 'free_tier'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_logs_tenant_billing
ON usage_logs(tenant_id, billing_status, created_at);
```

Columnas nuevas en `tenants` para BYOAK y facturación:

```sql
ALTER TABLE tenants ADD COLUMN gemini_api_key_encrypted TEXT;   -- key del cliente (encriptada)
ALTER TABLE tenants ADD COLUMN stt_api_key_encrypted TEXT;      -- key del cliente (encriptada)
ALTER TABLE tenants ADD COLUMN billing_model TEXT DEFAULT 'platform';
  -- 'platform' = nosotros pagamos APIs, cobramos por minuto/llamada
  -- 'byoak' = cliente trae sus keys, cobramos solo plataforma + fee
ALTER TABLE tenants ADD COLUMN price_per_minute FLOAT;          -- precio que cobramos al cliente
ALTER TABLE tenants ADD COLUMN price_per_audit FLOAT;           -- fee por auditoría completada
```

**Nota sobre BYOAK:** Las API keys del cliente se guardan encriptadas. Para el POC no se implementa BYOAK — usamos nuestras keys. Se habilita en MVP. El tracking de uso sí se implementa desde el POC para tener datos reales de consumo.

### 2.2b Observabilidad — Processing Logs

Cada paso del pipeline se registra para poder diagnosticar problemas, comparar resultados entre modelos/prompts, y dar visibilidad por tenant.

**Archivo nuevo:** `docs/migrations/006_security_and_callfast.sql` (incluir)

```sql
CREATE TABLE processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  call_id UUID REFERENCES calls(id) NOT NULL,

  -- Qué paso del pipeline
  step TEXT NOT NULL,              -- 'stt' | 'silence_detection' | 'llm_evaluation'
  status TEXT NOT NULL,            -- 'started' | 'completed' | 'failed'

  -- Configuración usada en este paso
  provider TEXT,                   -- 'assemblyai' | 'deepgram' | 'gemini-2.5-flash' | etc.
  model_version TEXT,              -- versión específica del modelo
  prompt_hash TEXT,                -- hash del prompt usado (para detectar cambios)
  config_snapshot JSONB,           -- config relevante: criteria, manual, thresholds, etc.

  -- Resultado
  duration_ms INT,                 -- cuánto tardó este paso
  input_tokens INT,
  output_tokens INT,
  cost_usd FLOAT,
  error_message TEXT,              -- null si success, detalle si failed

  -- Metadata
  audio_duration_seconds FLOAT,    -- duración del audio procesado
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_processing_logs_call ON processing_logs(call_id);
CREATE INDEX idx_processing_logs_tenant_step ON processing_logs(tenant_id, step, created_at);
CREATE INDEX idx_processing_logs_provider ON processing_logs(provider, created_at);
```

**Para qué sirve cada campo:**

| Campo | Uso |
|---|---|
| `step` | Saber qué paso falló o es lento |
| `provider` + `model_version` | Comparar resultados cuando cambias modelo |
| `prompt_hash` | Detectar si un cambio de prompt mejoró o empeoró resultados |
| `config_snapshot` | Reproducir exactamente las condiciones de un procesamiento |
| `duration_ms` | Detectar degradación de performance |
| `cost_usd` | Costo real por paso, por tenant, por periodo |
| `error_message` | Debugging cuando algo falla |

**Queries útiles que habilita:**

```sql
-- Costo promedio por paso, por tenant, último mes
SELECT tenant_id, step, AVG(cost_usd), AVG(duration_ms)
FROM processing_logs
WHERE created_at > now() - interval '30 days'
GROUP BY tenant_id, step;

-- Comparar antes/después de un cambio de prompt
SELECT prompt_hash, AVG(cost_usd), AVG(duration_ms), COUNT(*)
FROM processing_logs
WHERE step = 'llm_evaluation' AND tenant_id = '...'
GROUP BY prompt_hash;

-- Tasa de error por proveedor
SELECT provider, status, COUNT(*)
FROM processing_logs
GROUP BY provider, status;

-- Facturación: minutos procesados por tenant por mes
SELECT tenant_id,
  DATE_TRUNC('month', created_at) as month,
  SUM(audio_duration_seconds) / 60.0 as total_minutes,
  COUNT(DISTINCT call_id) as total_calls,
  SUM(cost_usd) as total_cost
FROM processing_logs
WHERE step = 'stt' AND status = 'completed'
GROUP BY tenant_id, month;
```

**Archivo nuevo:** `src/lib/observability/logger.ts`

```typescript
// Función que se llama al inicio y fin de cada paso del pipeline
async function logStep(params: {
  tenantId: string
  callId: string
  step: 'stt' | 'silence_detection' | 'llm_evaluation'
  provider: string
  modelVersion?: string
  promptHash?: string
  configSnapshot?: Record<string, unknown>
  audioDurationSeconds?: number
}): Promise<{ complete: (result: StepResult) => Promise<void> }>
```

Se usa así en el pipeline:
```typescript
const log = await logStep({ tenantId, callId, step: 'stt', provider: 'assemblyai' })
try {
  const result = await sttClient.transcribe(audio)
  await log.complete({ status: 'completed', costUsd: result.cost, durationMs: elapsed })
} catch (error) {
  await log.complete({ status: 'failed', errorMessage: error.message })
}
```

### 2.3 STT Types (interfaces agnósticas)

**Archivo nuevo:** `src/lib/stt/types.ts`

Interfaces que ambos proveedores (AssemblyAI/Deepgram) deben cumplir. Sin implementación de cliente aún.

### 2.4 Pipeline Types

**Archivo nuevo:** `src/lib/pipeline.ts` (solo types por ahora)

Interfaces de PipelineInput, PipelineOutput, CostBreakdown.

### 2.5 Migración DB para Callfast

**Archivo nuevo:** `docs/migrations/006_security_and_callfast.sql`

Incluye todo: drop anon policies + tablas campaigns/subcampaigns/commercial_offers/silence_events/usage_logs + columnas nuevas en tenants/calls/audits.

---

## Archivos a modificar/crear

| Archivo | Acción | Parte |
|---|---|---|
| `src/app/api/calls/upload/route.ts` | Modificar (eliminar getPublicUrl) | Security |
| `src/app/api/calls/process/route.ts` | Modificar (validar path) | Security |
| `src/app/api/calls/[id]/audio/route.ts` | Modificar (tenant scope + adaptar a path) | Security |
| `src/middleware.ts` | Crear (API key validation) | Security |
| `docs/migrations/006_security_and_callfast.sql` | Crear (drop anon + schema callfast) | Security + Pipeline |
| `.env.example` | Modificar (agregar INTERNAL_API_KEY) | Security |
| `src/lib/silence/detector.ts` | Crear | Pipeline |
| `src/lib/silence/__tests__/detector.test.ts` | Crear | Pipeline |
| `src/lib/stt/types.ts` | Crear | Pipeline |
| `src/lib/pipeline.ts` | Crear (types) | Pipeline |
| `src/lib/usage/tracker.ts` | Crear (registrar uso por llamada) | Billing |
| `src/lib/observability/logger.ts` | Crear (log por paso del pipeline) | Observabilidad |
| `src/types/database.ts` | Modificar (nuevos tipos) | Pipeline |

## Reconciliación: Conflictos detectados entre plan nuevo y código/spec existente

### Problema 1: Duplicación de tracking de costos

Hay 3 lugares donde se registran costos:
- `audits` tabla (existente): `cost_usd`, `input_tokens`, `output_tokens`, `total_tokens`
- `usage_logs` tabla (nueva): `stt_cost_usd`, `llm_cost_usd`, `total_internal_cost_usd`
- `processing_logs` tabla (nueva): `cost_usd` por paso

**Decisión de diseño:**

| Tabla | Propósito | Qué guarda |
|---|---|---|
| `audits` | Resultado de la auditoría | Score, resumen, transcript, etc. **Sin costos** (se mueven) |
| `processing_logs` | Observabilidad técnica | Costo por paso, tokens, duración, errores, prompt_hash |
| `usage_logs` | Facturación al cliente | Costo total, minutos, billing_status |

**Migración:** Eliminar las columnas de costos de `audits` (`cost_usd`, `input_tokens`, `output_tokens`, `total_tokens`, `stt_cost_usd`). Toda la info de costos vive en `processing_logs` (detalle técnico) y `usage_logs` (facturación).

### Problema 2: `database.ts` no tiene los tipos de los campos que ya se insertan

El código actual en `upload/route.ts` inserta campos (`cost_usd`, `input_tokens`, etc.) que NO existen en el type de `database.ts`. Esto funciona porque TypeScript no valida contra la DB real, pero es deuda técnica.

**Fix:** Actualizar `database.ts` con TODOS los tipos correctos — tanto existentes como nuevos.

### Problema 3: `unit-economics/route.ts` solo suma Gemini

**Fix:** Cambiar para que consulte de `processing_logs` en vez de `audits`. Así suma automáticamente todos los costos (STT + LLM + lo que venga).

### Problema 4: `pipeline_type` vs `processing_mode` son conceptos distintos

- `pipeline_type`: legacy (Gemini audio) vs callfast (STT + silencios + Gemini texto) → **qué pipeline se usa**
- `processing_mode`: full (con transcripción) vs compliance (sin transcripción) → **cuánto detalle se genera**

Ambos deben coexistir. No se mezclan.

### Problema 5: BYOAK y el modelo de costos

Cuando el tenant trae su propia API key:
- `processing_logs.cost_usd` = null (no sabemos el costo porque usa su key)
- `usage_logs` registra `billing_model='byoak'`, cobra por `price_per_audit` fijo
- `gemini.ts` necesita aceptar API key como parámetro en vez de leer de env var

**Para POC:** No implementar BYOAK. Solo registrar en `usage_logs` con `billing_model='platform'`.

### Problema 6: Campos faltantes en types

Agregar a `database.ts`:
- Tablas: `campaigns`, `subcampaigns`, `commercial_offers`, `silence_events`, `usage_logs`, `processing_logs`
- Campos en `calls`: `stt_transcript_url`, `channel_count`, `campaign_id`, `subcampaign_id`
- Campos en `tenants`: `pipeline_type`, `billing_model`, `price_per_minute`, `price_per_audit`
- Campos en `audits`: `agent_transcript`, `client_transcript`, `total_silence_seconds`, `silence_count`, `pipeline_type`
- **Eliminar** de `audits`: `cost_usd`, `stt_cost_usd`, `input_tokens`, `output_tokens`, `total_tokens` (se mueven a `processing_logs`)

---

## Archivos a modificar/crear (actualizado)

| Archivo | Acción | Parte |
|---|---|---|
| `src/app/api/calls/upload/route.ts` | Modificar (eliminar getPublicUrl, mover cost tracking a processing_logs) | Security + Observability |
| `src/app/api/calls/process/route.ts` | Modificar (validar path) | Security |
| `src/app/api/calls/[id]/audio/route.ts` | Modificar (tenant scope + adaptar a path) | Security |
| `src/app/api/stats/unit-economics/route.ts` | Modificar (consultar processing_logs en vez de audits) | Billing |
| `src/middleware.ts` | Crear (API key validation) | Security |
| `docs/migrations/006_security_and_callfast.sql` | Crear (drop anon + schema completo + mover costos) | Security + Pipeline + Billing |
| `.env.example` | Modificar (agregar INTERNAL_API_KEY) | Security |
| `src/lib/silence/detector.ts` | Crear | Pipeline |
| `src/lib/silence/__tests__/detector.test.ts` | Crear | Pipeline |
| `src/lib/stt/types.ts` | Crear | Pipeline |
| `src/lib/pipeline.ts` | Crear (types) | Pipeline |
| `src/lib/usage/tracker.ts` | Crear (registrar uso por llamada) | Billing |
| `src/lib/observability/logger.ts` | Crear (log por paso del pipeline) | Observabilidad |
| `src/types/database.ts` | Modificar (TODOS los tipos nuevos + corregir existentes) | Pipeline |
| `src/lib/gemini.ts` | Modificar (mover cost tracking a usar logger, aceptar API key como parámetro) | Observability + BYOAK prep |

## Security Hardening (hallazgos de la revisión de seguridad)

Estos hallazgos aplican a las adiciones de billing/observabilidad y se incorporan en la implementación:

### SH-1: BYOAK API Key Encryption (CRITICAL)

Las API keys de tenants (`gemini_api_key_encrypted`, `stt_api_key_encrypted`) requieren cifrado real con AES-256-GCM, no solo un campo `_encrypted` en el nombre.

**Archivo nuevo:** `src/lib/crypto/keys.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

export function encryptApiKey(plaintext: string): string {
  const key = Buffer.from(process.env.TENANT_KEY_ENCRYPTION_KEY!, 'hex') // 32 bytes
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptApiKey(stored: string): string {
  const key = Buffer.from(process.env.TENANT_KEY_ENCRYPTION_KEY!, 'hex')
  const [ivB64, tagB64, ctB64] = stored.split(':')
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return decipher.update(Buffer.from(ctB64, 'base64')) + decipher.final('utf8')
}
```

**`.env.example`:** Agregar `TENANT_KEY_ENCRYPTION_KEY` (generado con `openssl rand -hex 32`).

**Para POC:** No implementar BYOAK, pero dejar la infra de crypto lista.

### SH-2: RLS en tablas nuevas (HIGH)

En la migración `006_security_and_callfast.sql`, agregar RLS para `usage_logs` y `processing_logs`:

```sql
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede insertar/leer (desde API routes con service client)
CREATE POLICY "Service role full access on usage_logs"
  ON usage_logs FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on processing_logs"
  ON processing_logs FOR ALL USING (auth.role() = 'service_role');
```

### SH-3: Sanitización de `config_snapshot` (HIGH)

En `src/lib/observability/logger.ts`, implementar allowlist para evitar filtrar secrets:

```typescript
const ALLOWED_CONFIG_KEYS = [
  'threshold_seconds', 'criteria_names', 'processing_mode',
  'pipeline_type', 'channel_count', 'manual_length'
]

function safeConfigSnapshot(config: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const key of ALLOWED_CONFIG_KEYS) {
    if (key in config) safe[key] = config[key]
  }
  return safe
}
```

### SH-4: Sanitización de `error_message` (MEDIUM)

```typescript
function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .substring(0, 500)
}
```

### SH-5: NUMERIC para moneda (LOW)

En SQL usar `NUMERIC(10,6)` en vez de `FLOAT` para `cost_usd`, `price_per_minute`, `price_per_audit`, `total_internal_cost_usd`.

### SH-6: billing_status como ENUM (LOW)

```sql
CREATE TYPE billing_status AS ENUM ('pending', 'billed', 'free_tier');
-- Usar en usage_logs en vez de TEXT
```

---

## Verificación

1. **Security:** Intentar acceder a `/api/calls/upload` sin header `X-API-Key` → debe retornar 401
2. **Security:** Verificar que audio_url guardada es un path, no URL pública
3. **Pipeline:** `npm test` — silence detector tests pasan
4. **Observability:** Verificar que upload de audio crea registros en `processing_logs`
5. **Types:** `npx tsc --noEmit` — sin errores de tipos
6. **Regression:** Subir audio por pipeline legacy con API key → sigue funcionando
7. **Crypto:** Unit test para encrypt/decrypt roundtrip
8. **RLS:** Verificar que anon no puede leer `usage_logs` ni `processing_logs`

## Tests

Jest ya está configurado (jest ^30.2.0, ts-jest, @testing-library/react). Tests existentes en `src/__tests__/`.

### Test Suite 1: Silence Detector (`src/lib/silence/__tests__/detector.test.ts`)

```typescript
// Casos a cubrir:
describe('detectSilences', () => {
  it('detects silence > threshold between words on same channel')
  it('returns empty array when no silences exceed threshold')
  it('handles empty word array')
  it('differentiates agent (ch0) vs client (ch1) silences')
  it('uses default 30s threshold when none specified')
  it('uses custom threshold')
  it('calculates correct duration for each silence event')
  it('handles overlapping speech on different channels')
  it('handles single-channel audio (no channel field)')
})
```

### Test Suite 2: Observability Logger (`src/lib/observability/__tests__/logger.test.ts`)

```typescript
describe('logStep', () => {
  it('creates a started log entry and returns complete function')
  it('complete() updates log with status, cost, duration')
  it('complete() with failed status stores sanitized error message')
})

describe('safeConfigSnapshot', () => {
  it('only keeps allowed keys')
  it('strips api_key, password, secret fields')
  it('handles empty config')
})

describe('sanitizeErrorMessage', () => {
  it('redacts API keys from error messages')
  it('redacts Bearer tokens')
  it('truncates to 500 chars')
})
```

### Test Suite 3: Crypto + Middleware (`src/lib/crypto/__tests__/keys.test.ts` + `src/__tests__/middleware.test.ts`)

```typescript
// Crypto
describe('encryptApiKey / decryptApiKey', () => {
  it('roundtrip: decrypt(encrypt(key)) === key')
  it('different encryptions produce different ciphertexts (random IV)')
  it('throws on invalid TENANT_KEY_ENCRYPTION_KEY')
  it('throws on tampered ciphertext (auth tag fails)')
})

// Middleware
describe('API Key Middleware', () => {
  it('returns 401 when X-API-Key header is missing')
  it('returns 401 when X-API-Key is invalid')
  it('passes through when X-API-Key is valid')
  it('does not apply to non-API routes')
})
```

---

## Code Quality Review

Después de implementar todo, lanzar un agente de revisión de calidad que verifique:

### Checklist de Calidad

1. **TypeScript Strictness**
   - `npx tsc --noEmit` sin errores
   - No `any` types innecesarios
   - Todos los tipos nuevos en `database.ts` alineados con SQL

2. **Security**
   - No secrets en código (hardcoded keys, passwords)
   - Todas las rutas API protegidas por middleware
   - No `getPublicUrl()` en el codebase
   - RLS habilitado en todas las tablas nuevas
   - `config_snapshot` usa allowlist
   - `error_message` sanitizado

3. **Consistency**
   - Naming conventions consistentes (camelCase en TS, snake_case en SQL)
   - Import paths usando `@/` alias
   - Error handling consistente entre routes

4. **Test Coverage**
   - `npm test` — todos los tests pasan (existentes + nuevos)
   - `npm run test:coverage` — cobertura de archivos nuevos > 80%

5. **SQL Migration**
   - Migración es idempotente (usa IF EXISTS, IF NOT EXISTS)
   - Índices tienen nombres descriptivos
   - Foreign keys correctas
   - NUMERIC para moneda, no FLOAT

6. **No Regressions**
   - Pipeline legacy sigue funcionando
   - Dashboard existente no se rompe
   - Unit economics endpoint funciona (ahora contra processing_logs)

---

## Autenticación con Supabase Auth

### Estado Actual

- `@supabase/ssr` ^0.8.0 ya instalado
- `createBrowserClient` en `src/lib/supabase/client.ts`
- `createServerClient` con cookies en `src/lib/supabase/server.ts`
- `users.auth_id` existe en schema (nullable, para linking)
- **10 archivos** usan `DEMO_TENANT_ID` hardcoded
- **0 archivos** tienen auth real

### Diseño de Auth

**Modelo:** Supabase Auth (email/password) + tenant resolution por hostname + RLS real.

**Flujo:**
1. Usuario navega a `callfast.deepaudit.com`
2. Middleware resuelve hostname → `tenant_id`
3. Si no hay sesión → redirect a `/login`
4. Login via Supabase Auth (email/password)
5. Post-login: verificar que `users.tenant_id` match con tenant del hostname
6. Session cookie manejada por `@supabase/ssr`

### Archivos Nuevos

**`src/app/(auth)/login/page.tsx`** — Página de login

```typescript
// Form con email + password
// Llama supabase.auth.signInWithPassword()
// Redirect a / on success
// Muestra error on failure
// Branding dinámico según tenant (logo, nombre)
```

**`src/app/(auth)/layout.tsx`** — Layout para páginas de auth (sin sidebar)

**`src/lib/auth/tenant-resolver.ts`** — Resolución de tenant por hostname

```typescript
interface TenantContext {
  tenantId: string
  tenantName: string
  pipelineType: 'legacy' | 'callfast'
}

// Mapa de hostnames a tenants
// Para POC: hardcoded map
// Para MVP: lookup en DB
async function resolveTenant(hostname: string): Promise<TenantContext | null>
```

**`src/lib/auth/session.ts`** — Helper para obtener sesión + tenant en server components

```typescript
async function getAuthContext(): Promise<{
  user: User
  tenantId: string
  role: 'admin' | 'supervisor' | 'agent'
} | null>
```

### Archivos a Modificar

**`src/middleware.ts`** — Combinar API key validation + auth session check:

```typescript
// Para /api/* rutas: validar X-API-Key header
// Para /(dashboard)/* rutas: validar sesión Supabase
// Para /(auth)/* rutas: permitir sin sesión
// Inyectar tenant_id en headers para downstream
```

**10 archivos con DEMO_TENANT_ID** — Reemplazar por tenant del contexto auth:

| Archivo | Cambio |
|---|---|
| `src/app/(dashboard)/reportes/page.tsx` | `getAuthContext()` → `tenantId` |
| `src/app/(dashboard)/settings/page.tsx` | `getAuthContext()` → `tenantId` |
| `src/app/api/calls/process/route.ts` | `tenantId` del middleware header |
| `src/app/api/calls/upload/route.ts` | `tenantId` del middleware header |
| `src/app/api/settings/route.ts` | `tenantId` del middleware header |
| `src/app/api/stats/enterprise/route.ts` | `tenantId` del middleware header |
| `src/app/api/stats/unit-economics/route.ts` | `tenantId` del middleware header |
| `src/app/api/storage/upload-url/route.ts` | `tenantId` del middleware header |
| `src/app/api/calls/[id]/audio/route.ts` | `tenantId` del middleware header |
| `src/lib/constants.ts` | Mantener para fallback/seeds, marcar como deprecated |

### Migración Auth (incluir en 006)

```sql
-- Tenant hostname mapping
CREATE TABLE IF NOT EXISTS tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  hostname TEXT NOT NULL UNIQUE,  -- 'callfast.deepaudit.com'
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenant_domains_hostname ON tenant_domains(hostname);

-- Seed para POC
INSERT INTO tenant_domains (tenant_id, hostname, is_primary) VALUES
  ('00000000-0000-0000-0000-000000000001', 'localhost:3000', true),
  ('00000000-0000-0000-0000-000000000001', 'app.deepaudit.com', true);

-- Actualizar RLS policies para usar auth.uid() en vez de USING(true)
DROP POLICY IF EXISTS "Allow authenticated read audits" ON public.audits;
CREATE POLICY "Tenant isolation on audits"
  ON public.audits FOR ALL
  USING (
    call_id IN (
      SELECT id FROM calls WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Allow authenticated read calls" ON public.calls;
CREATE POLICY "Tenant isolation on calls"
  ON public.calls FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Service role bypass para API routes (usan service client)
CREATE POLICY "Service role full access on calls"
  ON public.calls FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on audits"
  ON public.audits FOR ALL
  USING (auth.role() = 'service_role');
```

### Tests de Auth

```typescript
// src/__tests__/auth/tenant-resolver.test.ts
describe('resolveTenant', () => {
  it('resolves known hostname to tenant')
  it('returns null for unknown hostname')
  it('handles localhost for development')
})

// src/__tests__/auth/middleware.test.ts (ampliar suite existente)
describe('Auth Middleware', () => {
  it('redirects to /login when no session on dashboard routes')
  it('allows access to /login without session')
  it('allows API routes with valid X-API-Key')
  it('injects tenant_id header from session')
})
```

---

## Orden de Ejecución (Fases Paralelas)

### Fase 1: Foundation (3 agentes en paralelo)

| Agente | Tareas | Dependencias |
|---|---|---|
| **Agent A: SQL + Types** | Migración `006_security_and_callfast.sql` completa (drop anon, nuevas tablas, tenant_domains, RLS real, auth policies) + actualizar `database.ts` con todos los tipos | Ninguna |
| **Agent B: Pipeline Core** | `src/lib/silence/detector.ts` + tests, `src/lib/stt/types.ts`, `src/lib/pipeline.ts` (types) | Ninguna |
| **Agent C: Infra** | `src/lib/crypto/keys.ts` + tests, `src/lib/observability/logger.ts` (con sanitización) + tests, `src/lib/usage/tracker.ts` | Ninguna |

### Fase 2: Security + Auth (2 agentes en paralelo)

Depende de: Fase 1 (types y migración listos)

| Agente | Tareas | Dependencias |
|---|---|---|
| **Agent D: Middleware + Auth** | `src/middleware.ts` (API key + auth session), `src/lib/auth/tenant-resolver.ts`, `src/lib/auth/session.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/layout.tsx`, `.env.example` | Fase 1A (types) |
| **Agent E: Security Fixes** | Fix upload/route.ts (eliminar getPublicUrl), Fix process/route.ts (validar path), Fix audio/route.ts (tenant scope + path), actualizar unit-economics/route.ts | Fase 1A (types) |

### Fase 3: Integration (2 agentes en paralelo)

Depende de: Fase 2 (auth y security fixes listos)

| Agente | Tareas | Dependencias |
|---|---|---|
| **Agent F: Tenant Migration** | Reemplazar DEMO_TENANT_ID en los 10 archivos por auth context, integrar observability logger en upload/process routes | Fase 2D (auth helpers) |
| **Agent G: Tests Integration** | Tests de middleware auth, tests de tenant-resolver, verificar que tests existentes siguen pasando | Fase 2D+E |

### Fase 4: Verification (1 agente)

Depende de: Fase 3

| Agente | Tareas |
|---|---|
| **Agent H: Quality Review** | `npx tsc --noEmit`, `npm test`, `npm run test:coverage`, security checklist, consistency check, no regressions |

---

## Resumen de Archivos por Fase

| Fase | Archivos Nuevos | Archivos Modificados |
|---|---|---|
| 1A | `docs/migrations/006_security_and_callfast.sql` | `src/types/database.ts` |
| 1B | `src/lib/silence/detector.ts`, `src/lib/silence/__tests__/detector.test.ts`, `src/lib/stt/types.ts`, `src/lib/pipeline.ts` | — |
| 1C | `src/lib/crypto/keys.ts`, `src/lib/crypto/__tests__/keys.test.ts`, `src/lib/observability/logger.ts`, `src/lib/observability/__tests__/logger.test.ts`, `src/lib/usage/tracker.ts` | — |
| 2D | `src/middleware.ts`, `src/lib/auth/tenant-resolver.ts`, `src/lib/auth/session.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/layout.tsx` | `.env.example` |
| 2E | — | `src/app/api/calls/upload/route.ts`, `src/app/api/calls/process/route.ts`, `src/app/api/calls/[id]/audio/route.ts`, `src/app/api/stats/unit-economics/route.ts` |
| 3F | — | 10 archivos con DEMO_TENANT_ID |
| 3G | `src/__tests__/auth/tenant-resolver.test.ts`, `src/__tests__/middleware.test.ts` | — |
| 4H | — | — (solo verificación) |

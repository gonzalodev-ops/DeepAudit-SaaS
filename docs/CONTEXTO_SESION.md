# Contexto de Sesion - DeepAudit SaaS

## Proyecto
**DeepAudit SaaS** - Plataforma de auditoria automatizada de llamadas de call center usando IA.

## Stack Actual
- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Storage)
- **IA:** Google Gemini 2.5 Flash (multimodal - procesa audio directo)
- **Repo:** https://github.com/gonzalodev-ops/DeepAudit-SaaS

## Estado Actual del MVP

### Implementado
1. **Dashboard** (`src/app/(dashboard)/page.tsx`)
   - Stats cards: llamadas, auditorias, score promedio, tokens
   - Tabla de llamadas recientes con estado (semaforo)
   - Card comparativa costos IA vs QA humano

2. **Upload** (`src/app/(dashboard)/upload/page.tsx`)
   - Drag & drop de archivos audio
   - Procesamiento sincronico con Gemini

3. **Detalle Auditoria** (`src/app/(dashboard)/calls/[id]/page.tsx`)
   - Score circular con colores
   - Info de llamada (fecha, agente, duracion, modo)
   - Audio player con momentos clave
   - Card de uso de tokens y costo
   - Tabs: Criterios, Transcripcion, Feedback
   - Boton regenerar para casos criticos

4. **API Routes**
   - `POST /api/calls/upload` - Sube audio y procesa
   - `POST /api/calls/[id]/regenerate` - Reprocesa con modo diferente

5. **Componentes**
   - `AudioPlayer` - Reproductor con timestamps
   - `RegenerateButton` - Para modo compliance o scores bajos
   - `CostComparisonCard` - Comparativa IA vs QA

6. **Gemini Integration** (`src/lib/gemini.ts`)
   - Procesa audio multimodal
   - Dos modos: 'full' (con transcripcion) y 'compliance' (solo metadata)
   - Detecta violaciones eticas (ETI-01, ETI-02, ETI-03)
   - Tracking de tokens y calculo de costos

### Pendiente
- [ ] Autenticacion con Supabase Auth (login/signup)
- [ ] Filtros en dashboard (por score, fecha, sentimiento)
- [ ] Pagina /settings para configurar tenant/manual

## Base de Datos (Supabase)

### Tablas
- `tenants` - Clientes/empresas con manual_text y audit_criteria
- `calls` - Llamadas con audio_url, status, duration
- `audits` - Resultados con scores, transcript, tokens, cost_usd
- `users` - Agentes (para asignar llamadas)

### Migracion Pendiente
Archivo: `docs/migrations/002_add_token_tracking.sql`
- Columnas: input_tokens, output_tokens, total_tokens, cost_usd
- processing_mode, key_moments (JSONB)

## Configuracion QA para Comparativa

```typescript
const QA_CONFIG = {
  monthlySalaryMXN: 30000,  // Costo total empleador
  callsPerHour: 5,          // 4-6 promedio
  hoursPerMonth: 160,       // 40h/semana
}
// Resultado: ~800 llamadas/mes, ~$2.18 USD por llamada
```

## Pricing Gemini 2.5 Flash
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Costo promedio por llamada: ~$0.002-0.003 USD

## Archivos Clave

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx           # Dashboard principal
│   │   ├── layout.tsx         # Layout con sidebar
│   │   ├── upload/page.tsx    # Subir audio
│   │   └── calls/[id]/page.tsx # Detalle auditoria
│   └── api/calls/
│       ├── upload/route.ts    # API upload
│       └── [id]/regenerate/route.ts
├── components/
│   ├── audio/audio-player.tsx
│   ├── audit/regenerate-button.tsx
│   ├── dashboard/cost-comparison-card.tsx
│   └── ui/                    # shadcn components
├── lib/
│   ├── gemini.ts              # Integracion Gemini
│   └── supabase/              # Clientes Supabase
└── types/database.ts
```

## Ultimo Commit
```
feat: MVP completo de DeepAudit SaaS
- 42 archivos, +6,261 lineas
```

## Notas Tecnicas

1. **Token counting:** Gemini reporta `totalTokenCount` mayor que `input + output`. Incluye tokens de audio/sistema. Usar totalTokenCount para costos.

2. **Procesamiento:** El audio se envia como base64 inline a Gemini, no hay transcripcion separada (ahorro ~90% vs Whisper + LLM).

3. **Modos de procesamiento:**
   - `full`: Transcripcion completa + analisis
   - `compliance`: Solo metadata y citas clave (para regulaciones que prohiben guardar transcripciones)

4. **Violaciones eticas (score = 0 automatico):**
   - ETI-01: Agresion verbal
   - ETI-02: Gaslighting operativo
   - ETI-03: Abandono hostil

## Para Continuar

1. Leer este archivo para contexto
2. Revisar `docs/PLAN_MVP.md` para features pendientes
3. El servidor corre en `http://localhost:3000` o `3001`
4. Credenciales en `.env.local`

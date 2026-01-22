# Plan: DeepAudit SaaS MVP - Demo para Inversionista

## Resumen Ejecutivo

**Objetivo:** Construir un MVP funcional de auditoria automatizada de llamadas para demostracion a inversionista/socio estrategico.

**Stack Tecnologico:**
- **Frontend:** Next.js 16 con TypeScript y Tailwind CSS
- **Backend:** Supabase (Auth + PostgreSQL + Storage)
- **IA:** Google Gemini 2.5 Flash (audio nativo multimodal)
- **Deployment:** Vercel (frontend) + Supabase (backend)

---

## Arquitectura

```
+----------------------------------------------------------+
|                 NEXT.JS APP (Vercel)                      |
+----------------------------------------------------------+
|  /                 -> Dashboard (lista de llamadas)       |
|  /calls/[id]       -> Detalle de auditoria               |
|  /upload           -> Subir nuevo audio                  |
+---------------------------+------------------------------+
                            |
                            v
+----------------------------------------------------------+
|                     SUPABASE                              |
+----------------------------------------------------------+
|  PostgreSQL    -> tenants, calls, audits                 |
|  Storage       -> Bucket: audios/                        |
+---------------------------+------------------------------+
                            |
                            v
+----------------------------------------------------------+
|              GOOGLE GEMINI 2.5 FLASH                      |
+----------------------------------------------------------+
|  Input:  Audio (base64) + Manual (texto) + Prompt        |
|  Output: JSON estructurado (AuditResult)                 |
+----------------------------------------------------------+
```

---

## Modelo de Datos

### Tabla: `tenants`
- id, name, industry, manual_text, audit_criteria (JSONB)

### Tabla: `calls`
- id, tenant_id, audio_url, status, duration_seconds, created_at

### Tabla: `audits`
- id, call_id, overall_score, summary, transcript
- criteria_scores (JSONB), strengths, areas_for_improvement
- input_tokens, output_tokens, total_tokens, cost_usd
- processing_mode ('full' | 'compliance'), key_moments (JSONB)

---

## Features Implementados

### P0 - Criticos (COMPLETADOS)
1. Dashboard Principal - Lista de llamadas con semaforo visual
2. Upload de Audio - Drag & drop con progress bar
3. Procesamiento con Gemini - API Route sincrónico
4. Vista de Resultado Detallado - Score, transcripcion, criterios, feedback

### P2 - Nice to Have (COMPLETADOS)
5. Audio Player - Con momentos clave y timestamps
6. Token Tracking - Costo real por llamada
7. Comparativa IA vs QA - Dashboard de ahorros
8. Modo Compliance - Sin transcripcion para regulaciones
9. Boton Regenerar - Para casos criticos

### PENDIENTES para completar MVP
- [ ] Autenticacion con Supabase Auth
- [ ] Filtros en dashboard (por score, fecha)
- [ ] Pagina /settings para configurar tenant

---

## Pricing Gemini 2.5 Flash

- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Costo promedio por llamada: ~$0.003 USD

---

## Comparativa Costos

| Metrica | QA Humano | DeepAudit IA |
|---------|-----------|--------------|
| Costo mensual | $30,000 MXN | Variable |
| Costo por llamada | ~$37.50 MXN | ~$0.05 MXN |
| Capacidad mensual | ~800 llamadas | Ilimitado |
| Ahorro | - | ~99.9% |

---

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
```

---

## Proximos Pasos Post-MVP

1. Autenticacion completa
2. Multi-tenant con selector
3. RAG con embeddings para manuales largos
4. Procesamiento batch
5. Reportes y analytics
6. Webhooks para integraciones

# Prompts para Continuar el Trabajo

---

## Prompt 1: Retomar la conversación (uso general)

Copia este prompt al iniciar una nueva sesión de Claude Code:

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
- Todos los tests pre-existentes corregidos (30 tests que fallaban en 6 suites)

Documentos clave que debes leer:
- spec/01-arquitectura-callfast.md → Arquitectura completa con estado ✅/⏳ por componente
- spec/02-plan-implementacion-security-pipeline.md → Detalle de implementación + tests + archivos

Pendiente principal (sección 8 del spec/01):
- Pasos 12-15: Contenido sintético para POC (scripts, transcripciones, seed data, audios)
- Pasos 16-23: Pipeline Callfast real (STT client, processTextWithGemini, Edge Function, frontend)
- Pasos 24-28: Infraestructura pre-deploy (migración SQL, env vars, bucket, dominio)

Tarea actual: [DESCRIBIR LA TAREA ESPECÍFICA]
```

---

## Prompt 2: Generar contenido sintético (para el fin de semana)

Este es el prompt específico para la tarea P1 — generar datos para probar el POC:

```
Contexto: Estoy continuando el trabajo en DeepAudit-SaaS, un proyecto SaaS multi-tenant
para auditoría automatizada de llamadas de call center. El primer cliente será Callfast.

Branch: claude/review-fasst-docs-6LEt8

Lee estos archivos antes de empezar:
- spec/01-arquitectura-callfast.md → Arquitectura y estado actual
- spec/02-plan-implementacion-security-pipeline.md → Detalle de todo lo implementado
- docs/migrations/006_security_and_callfast.sql → Schema de la DB
- src/types/database.ts → Tipos TypeScript de todas las tablas

Tarea actual: Generar contenido sintético para el POC (Paso 12-15 del plan).
Necesito datos realistas para demostrar la plataforma a Callfast.

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
   - Scores esperados por criterio

3. **Datos seed SQL** para insertar en Supabase (compatibles con el schema en 006):
   - 1 tenant: Callfast (id: 00000000-0000-0000-0000-000000000001)
   - 1 tenant_domain: localhost:3000
   - 1 usuario admin: admin@callfast.mx
   - 5 calls (uno por script, con audio_url simulado)
   - 5 audits con scores, transcript, summary, strengths, areas_for_improvement
   - processing_logs para cada call (step: llm_evaluation, status: completed, con cost_usd)
   - usage_logs para billing data

4. **Opcionalmente, generar audios con TTS** si tienes acceso a herramientas.

### Criterios de evaluación (pesos actuales):
- Respeto y Cortesía: 29%
- Cumplimiento de Protocolo: 24%
- Resolución del Problema: 29%
- Cierre Profesional: 18%

### Formato de transcripción JSON esperado:
{
  "words": [
    { "word": "Buenos", "start": 0.0, "end": 0.3, "channel": 0 },
    { "word": "días", "start": 0.3, "end": 0.6, "channel": 0 }
  ],
  "channels": 2,
  "duration_seconds": 180
}

### Ubicación de archivos:
- Scripts: docs/synthetic/scripts/
- Transcripciones JSON: docs/synthetic/transcripts/
- Seed SQL: docs/synthetic/seed.sql

Genera todo y commitea al branch.
```

---

## Prompt 3: Implementar pipeline real (después de tener contenido sintético)

```
Contexto: Estoy continuando el trabajo en DeepAudit-SaaS.

Branch: claude/review-fasst-docs-6LEt8

Lee estos archivos:
- spec/01-arquitectura-callfast.md → Sección "Pipeline Callfast" y "Procesamiento Asíncrono"
- spec/02-plan-implementacion-security-pipeline.md → Todo lo implementado
- src/lib/stt/types.ts → Interfaces STT ya definidas
- src/lib/pipeline.ts → Tipos de pipeline ya definidos
- src/lib/silence/detector.ts → Silence detector ya implementado
- src/lib/gemini.ts → Función existente processAudioWithGemini()
- docs/synthetic/ → Contenido sintético generado

Tarea: Implementar el pipeline Callfast real (Pasos 16-23 del spec/01):

1. Decidir proveedor STT (AssemblyAI vs Deepgram) — revisar pricing, calidad español, latencia
2. Implementar STT client en src/lib/stt/client.ts
3. Agregar processTextWithGemini() en src/lib/gemini.ts
4. Implementar pipeline orchestrator real en src/lib/pipeline.ts
5. Crear Supabase Edge Function en supabase/functions/process-call/
6. Modificar upload route para modo async (invocar Edge Function)
7. Crear endpoint GET /api/calls/[id]/status para polling
8. Actualizar frontend: polling con indicador de progreso, silencios, transcripción por canal

Usa las transcripciones sintéticas en docs/synthetic/transcripts/ para testear
sin necesitar audio real.
```

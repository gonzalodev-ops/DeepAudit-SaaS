# Prompts para Continuar el Trabajo

---

## Prompt 1: Retomar la conversación (uso general)

Copia este prompt al iniciar una nueva sesión de Claude Code:

```
Contexto: Estoy continuando el trabajo en DeepAudit-SaaS, un proyecto SaaS multi-tenant
para auditoría automatizada de llamadas de call center. El primer cliente es Callfast,
un call center de soporte técnico (ISP, 50+ modelos de modems).

Branch: claude/review-fasst-docs-6LEt8

Documentos de referencia del cliente (LEER PRIMERO):
- Fasst/guia-interna-callfast-v3.docx.md → Contexto del cliente, los 3 problemas que su
  proveedor actual no resolvió, entregables del POC
- Fasst/arquitectura-tecnica-roadmap.docx.md → Visión de producto, roadmap, principios

Plan y estado actual:
- spec/01-arquitectura-callfast.md → Arquitectura completa con estado ✅/⏳, secuencia de
  implementación con 41 pasos, definición de modo admin y modos de producto
- spec/02-plan-implementacion-security-pipeline.md → Detalle de implementación + tests
- spec/00-poc-mode-sin-datos-financieros.md → Diseño del modo POC

Estado actual:
- 220 tests, 0 fallos, 15 suites
- Infraestructura base completa (auth, security, middleware, silence detector, crypto,
  observability, usage tracking, cost migration)
- Página /operaciones implementada (métricas operativas sin datos financieros en POC)
- showFinancialData() retorna false en POC — INTENCIONAL, es estrategia comercial
- SQL migration lista pero NO ejecutada en Supabase

Los 3 entregables del POC (lo que el cliente pidió):
1. Detección de silencios (umbral 30s) — ✅ detector listo, ⏳ frontend
2. Validación comercial (oferta vigente, RAG estático para POC) — ⏳ pendiente
3. Resumen estructurado (acuerdos → acciones en sistema) — ⏳ pendiente

Pendiente inmediato (ver sección 8 de spec/01):
- Pasos 14-17: Modo admin (is_admin en BD, condicionar UI)
- Pasos 18-22: Contenido sintético (scripts, transcripciones, seed, oferta comercial)
- Pasos 23-30: Pipeline real (STT, Gemini texto, Edge Function, frontend)
- Pasos 31-36: Pre-deploy

IMPORTANTE:
- NO cambiar showFinancialData() — los datos financieros NO se muestran al cliente en POC
- El modo admin (is_admin en BD) permite al owner ver costos/tokens/proveedores internamente
- La prosodia se evalúa como experimento sobre transcripciones, no como desarrollo aparte
- Para el POC se usa UNA sola campaña con oferta comercial estática

Tarea actual: [DESCRIBIR LA TAREA ESPECÍFICA]
```

---

## Prompt 2: Implementar modo admin

```
Contexto: Estoy continuando el trabajo en DeepAudit-SaaS.

Branch: claude/review-fasst-docs-6LEt8

Lee estos archivos antes de empezar:
- spec/01-arquitectura-callfast.md → Sección "Modo Admin" y pasos 14-17
- Fasst/guia-interna-callfast-v3.docx.md → Contexto del cliente
- src/lib/feature-flags.ts → Feature flags actuales
- src/lib/auth/session.ts → getAuthContext()
- src/app/(dashboard)/layout.tsx → Dashboard layout
- src/app/(dashboard)/operaciones/page.tsx → Página de operaciones
- src/app/(dashboard)/reportes/page.tsx → Página de reportes financieros
- src/app/api/stats/unit-economics/route.ts → API de unit economics
- docs/migrations/006_security_and_callfast.sql → Migración actual

Tarea: Implementar modo admin (Pasos 14-17 del spec/01).

El modo admin es INDEPENDIENTE del product mode (poc/standard/enterprise). Permite al
owner de DeepAudit ver datos internos que el cliente NO debe ver.

1. Agregar columna `is_admin` (boolean, default false) a tabla `users` en la migración SQL
2. Actualizar database.ts types
3. Crear función/helper para consultar is_admin del usuario en sesión
4. En /operaciones: mostrar costos, tokens, proveedores SOLO si is_admin=true
5. En /reportes y unit-economics: permitir acceso en POC si is_admin=true
6. NO cambiar showFinancialData() — esa función sigue retornando false en POC
7. La lógica es: (showFinancialData() || isAdmin) para mostrar datos financieros

Tests y commit al branch.
```

---

## Prompt 3: Generar contenido sintético

```
Contexto: Estoy continuando el trabajo en DeepAudit-SaaS, un proyecto SaaS multi-tenant
para auditoría automatizada de llamadas de call center. El primer cliente es Callfast,
un call center de soporte técnico (ISP, 50+ modelos de modems).

Branch: claude/review-fasst-docs-6LEt8

Lee estos archivos antes de empezar:
- Fasst/guia-interna-callfast-v3.docx.md → Contexto del cliente, problemas, entregables POC
- Fasst/arquitectura-tecnica-roadmap.docx.md → Estructura multi-nivel, RAG estático vs dinámico
- spec/01-arquitectura-callfast.md → Arquitectura y estado actual, pasos 18-22
- docs/migrations/006_security_and_callfast.sql → Schema de la DB
- src/types/database.ts → Tipos TypeScript de todas las tablas

Tarea: Generar contenido sintético para el POC (Pasos 18-22 del plan).
Callfast es soporte técnico de ISP (internet, modems, configuraciones de red).

### Qué necesito generar:

1. **5 scripts de llamadas** (español mexicano, soporte técnico ISP):

   a) LLAMADA EXCELENTE (target score ~92):
      - Agente saluda con nombre, verifica identidad, diagnostica paso a paso
      - Resuelve problema de configuración de modem
      - Cierre con resumen de lo acordado
      - Duración: ~3 minutos

   b) LLAMADA DEFICIENTE (target score ~35):
      - No verifica identidad, no sigue protocolo técnico
      - Da información incorrecta sobre configuración
      - Cuelga sin resolver
      - Duración: ~2 minutos

   c) LLAMADA CON SILENCIOS (target score ~60):
      - 2 silencios de >30 segundos (hold sin avisar al cliente)
      - Un silencio de 45s buscando información en sistema
      - Duración: ~4 minutos

   d) LLAMADA CON OFERTA INCORRECTA (target score ~45):
      - Agente ofrece un paquete/promoción que NO coincide con la oferta vigente
      - Cliente acepta basándose en información incorrecta
      - Esto debe ser detectado por la validación comercial
      - Duración: ~3 minutos

   e) LLAMADA PROMEDIO (target score ~70):
      - Cumplimiento parcial de protocolo, resuelve pero sin empatía
      - Cierre apresurado
      - Duración: ~2.5 minutos

2. **Oferta comercial vigente** (texto estático para el RAG del POC):
   - Paquetes de internet disponibles (velocidades, precios)
   - Promociones vigentes
   - Condiciones y restricciones
   - Esto se usa para validar la llamada (d) contra lo que realmente ofrecía la empresa

3. **Para cada script generar:**
   - Texto del diálogo (AGENTE: / CLIENTE:)
   - Transcripción JSON con timestamps word-level y channel labels
   - Scores esperados por criterio

4. **Datos seed SQL** para Supabase:
   - 1 tenant: Callfast
   - 1 campaign: "Soporte Técnico ISP"
   - 1 commercial_offer: oferta vigente del POC
   - 1 usuario admin (is_admin=true)
   - 5 calls, 5 audits, processing_logs, usage_logs

### Criterios de evaluación (pesos actuales):
- Respeto y Cortesía: 29%
- Cumplimiento de Protocolo: 24%
- Resolución del Problema: 29%
- Cierre Profesional: 18%

### Formato de transcripción JSON:
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
- Oferta comercial: docs/synthetic/oferta-comercial-poc.md
- Seed SQL: docs/synthetic/seed.sql

Genera todo y commitea al branch.
```

---

## Prompt 4: Implementar pipeline real

```
Contexto: Estoy continuando el trabajo en DeepAudit-SaaS.

Branch: claude/review-fasst-docs-6LEt8

Lee estos archivos:
- Fasst/guia-interna-callfast-v3.docx.md → Los 3 entregables del POC
- spec/01-arquitectura-callfast.md → Sección "Pipeline Callfast", "gemini.ts", pasos 23-30
- src/lib/stt/types.ts → Interfaces STT ya definidas
- src/lib/pipeline.ts → Tipos de pipeline ya definidos
- src/lib/silence/detector.ts → Silence detector implementado
- src/lib/gemini.ts → Función existente processAudioWithGemini()
- docs/synthetic/ → Contenido sintético generado (scripts, transcripciones, oferta comercial)

Tarea: Implementar el pipeline Callfast real (Pasos 23-30 del spec/01):

1. Decidir proveedor STT (AssemblyAI vs Deepgram) — pricing, calidad español, latencia
2. Implementar STT client en src/lib/stt/client.ts
3. Agregar processTextWithGemini() en src/lib/gemini.ts que produzca:
   - Evaluación de calidad (scores, fortalezas, áreas de mejora)
   - Validación comercial (comparar lo dicho vs oferta vigente)
   - Resumen estructurado (acuerdos, compromisos, acciones para sistema)
4. Pipeline orchestrator: STT → silencios → Gemini texto
5. Supabase Edge Function: process-call
6. Upload route async + Edge Function invocation
7. Status endpoint + frontend polling
8. Frontend: timeline de silencios, transcripción por canal, resumen estructurado,
   sección de validación de oferta

Usa docs/synthetic/oferta-comercial-poc.md como contexto estático para la validación comercial.
Usa las transcripciones sintéticas para testear sin audio real.
```

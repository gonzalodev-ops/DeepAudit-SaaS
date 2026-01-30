# Investigación: Detección de Silencios, Transcripción y Arquitectura Híbrida

*Documento interno — 30 de enero de 2026*

---

## 1. Hallazgo Clave: Los Canales Separados Cambian Todo

Callfast puede entregar audio en **canales separados** (estéreo: un canal para el agente, otro para el cliente). Esto elimina la necesidad de diarización tradicional (que es costosa, imprecisa y agrega complejidad). Con canales separados:

- La **atribución de hablante es 100% precisa** por definición — sabemos quién habla por el canal.
- La **detección de silencios por hablante** se simplifica — solo medimos pausas en el canal del agente.
- Se reduce el costo porque no necesitamos modelos de diarización adicionales.

---

## 2. Qué Tenemos Hoy (DeepAudit Actual)

| Aspecto | Implementación Actual |
|---|---|
| **Transcripción** | Gemini 2.5 Flash (integrada en la evaluación) |
| **Evaluación** | Gemini 2.5 Flash con prompts dinámicos |
| **Resumen** | Generado por Gemini en la misma llamada API |
| **Detección de silencios** | No existe |
| **Diarización** | No existe |
| **Timestamps** | Gemini genera key_moments con timestamps, pero poco confiables |
| **Costo por llamada** | ~$0.07 MXN (~$0.004 USD) para llamadas de ~5 min |

**Problema central:** Gemini recibe el audio completo en base64 y hace todo en un paso. Esto funciona para evaluación general, pero:
- No tiene soporte nativo para multicanal
- Los timestamps son aproximados y poco confiables en Gemini 2.5
- No puede detectar silencios con precisión de segundos
- No puede atribuir silencio al agente vs. al cliente de forma estructurada

---

## 3. Qué Necesitamos para Callfast

| Requerimiento | Prioridad | Detalle |
|---|---|---|
| **Detección de silencios >30s** | Alta (POC) | Medir tiempos muertos del agente. Umbral: 30 segundos |
| **Atribución agente/cliente** | Alta (POC) | Saber si el silencio es del agente (problema) o del cliente (aceptable) |
| **Resumen estructurado** | Alta (POC) | Qué se acordó y debe reflejarse en sistema |
| **Transcripción con timestamps** | Alta (POC) | Base para silencios y resumen |
| **Validación comercial (RAG)** | Media (Post-POC) | Verificar oferta vs. lo dicho por el agente |

---

## 4. Opciones de Arquitectura

### Opción A: Gemini Solo (Extendido)

Mantener Gemini 2.5 Flash para todo, pero con pre-procesamiento del audio.

```
Audio estéreo (MP3)
    ↓
ffmpeg: separar canales → canal_agente.wav + canal_cliente.wav
    ↓
Gemini Flash: procesar cada canal por separado
    ↓
Merge de transcripciones por timestamps
    ↓
Gemini Flash: evaluación + resumen + detección de silencios (vía prompt)
```

| Pros | Contras |
|---|---|
| Un solo proveedor (Gemini) | Timestamps de Gemini son poco confiables en 2.5 |
| Costo más bajo por minuto (~$0.002/min) | Sin detección de silencios precisa |
| Ya lo tenemos integrado | Procesar 2 canales = doble costo de tokens |
| Simple de mantener | Resultados no determinísticos (depende del prompt) |
| | No hay API de silencios — solo inferencia del LLM |

**Costo estimado por llamada (5 min):**
- 2 canales × 5 min × ~$0.002/min = ~$0.02 USD transcripción
- 1 llamada evaluación = ~$0.002 USD
- **Total: ~$0.022 USD (~$0.44 MXN)**

**Veredicto:** No recomendado para producción. La detección de silencios no sería precisa ni confiable. Podría funcionar como prototipo rápido pero no cumple el requerimiento con rigor.

---

### Opción B: Híbrida — Servicio STT Dedicado + Gemini para Evaluación (RECOMENDADA)

Usar un servicio de transcripción especializado para obtener transcripción precisa con timestamps y detección de silencios, y mantener Gemini para evaluación/resumen.

```
Audio estéreo (MP3)
    ↓
Servicio STT (Deepgram/AssemblyAI): transcripción multicanal
    → Transcripción canal agente con timestamps por palabra
    → Transcripción canal cliente con timestamps por palabra
    → Detección de pausas/silencios por canal
    ↓
Procesamiento local: detectar silencios >30s del agente
    ↓
Gemini Flash: evaluación + resumen (recibe texto, no audio)
    → Más barato: procesa texto en vez de audio
    → Más rápido: no tiene que "escuchar" el audio
    → Más preciso: trabaja sobre transcripción verificada
```

| Pros | Contras |
|---|---|
| Silencios precisos al segundo | Dos proveedores que mantener |
| Timestamps confiables por palabra | Costo de transcripción adicional |
| Atribución 100% precisa (multicanal nativo) | Dependencia de API externa |
| Gemini procesa texto (más barato que audio) | |
| Resultados determinísticos para silencios | |
| Resumen más preciso (basado en transcripción real) | |
| Detección de silencios es código, no IA (confiable) | |

**Esta es la arquitectura recomendada.** La detección de silencios se convierte en un cálculo determinístico sobre timestamps, no una inferencia de IA.

---

### Opción C: Servicio STT Completo (Sin Gemini)

Usar un servicio STT + LLM genérico para todo, reemplazando Gemini completamente.

| Pros | Contras |
|---|---|
| Podríamos usar cualquier LLM para evaluación | Perdemos la integración actual con Gemini |
| Flexibilidad de cambiar modelos | Reescribir todo el pipeline de evaluación |
| | Mayor complejidad sin beneficio claro |

**Veredicto:** No tiene sentido reescribir lo que ya funciona. Gemini hace bien la evaluación y el resumen.

---

## 5. Comparativa de Servicios STT para la Opción B

### Para el componente de transcripción multicanal:

| Servicio | Precio/min | Multicanal Nativo | Timestamps Palabra | Detección Silencios | Español |
|---|---|---|---|---|---|
| **Deepgram** | $0.0065-0.0077 | Si (`multichannel=true`) | Si | Si (utterances) | Si |
| **AssemblyAI** | $0.005 (×2 canales = $0.01) | Si | Si | Inferido | Si |
| **Google STT V2 Batch** | $0.004 | Si | Si | No | Si |
| **AWS Transcribe** | $0.0102 (Tier 3: 1-5M min) | Si (gratis) | Si | Si (Call Analytics) | Si |
| **Whisper API** | $0.003-0.006 | No | Si | No | Si |

### Recomendación STT: **Deepgram**

1. **Multicanal nativo** con parámetro `multichannel=true` — no hay que separar canales manualmente
2. **Detección de pausas** integrada (utterance segmentation)
3. **$200 de crédito gratis** — suficiente para todo el POC (~45,000 minutos)
4. **Precio competitivo** a escala ($0.0065/min en plan Growth)
5. **API simple** — respuesta JSON con timestamps por palabra y etiqueta de canal

**Runner-up: Google STT V2 Batch** a $0.004/min si se busca el menor costo y se tolera procesamiento no real-time.

---

## 6. Costos Estimados — Opción B (Deepgram + Gemini)

### Por llamada individual (5 minutos promedio):

| Componente | Costo USD | Costo MXN (~$20) |
|---|---|---|
| Deepgram transcripción multicanal | $0.0385 | $0.77 |
| Gemini evaluación + resumen (texto) | $0.001 | $0.02 |
| **Total por llamada** | **$0.0395** | **$0.79** |

### Proyección mensual a distintos volúmenes:

| Volumen mensual | Costo Deepgram | Costo Gemini | Total USD | Total MXN |
|---|---|---|---|---|
| 150 llamadas (POC) | $5.78 | $0.15 | **$5.93** | $118.50 |
| 10,000 (muestra 0.3%) | $385 | $10 | **$395** | $7,900 |
| 175,000 (5% actual) | $6,738 | $175 | **$6,913** | $138,250 |
| 350,000 (10%) | $13,475 | $350 | **$13,825** | $276,500 |
| 3,500,000 (100%) | $134,750 | $3,500 | **$138,250** | $2,765,000 |

**Nota:** A volúmenes altos (>1M llamadas), Deepgram ofrece precios Enterprise que pueden bajar a ~$0.003/min. El 100% requeriría negociación de precio.

### Comparativa con auditoría humana:

| Métrica | Humano | DeepAudit (Opción B) |
|---|---|---|
| Costo por auditoría | ~$50 MXN | ~$0.79 MXN |
| Cobertura actual | 5% (~175K/mes) | Potencial 100% |
| Costo mensual (5%) | $8,750,000 MXN | $138,250 MXN |
| **Ahorro** | — | **98.4%** |

---

## 7. Cómo Funciona la Detección de Silencios (Técnicamente)

Con la Opción B, la detección de silencios es **código determinístico**, no IA:

```
1. Deepgram transcribe el canal del agente con timestamps por palabra:
   [
     { "word": "sí", "start": 0.5, "end": 0.7 },
     { "word": "claro", "start": 0.8, "end": 1.1 },
     // gap de 35 segundos
     { "word": "lo", "start": 36.1, "end": 36.2 },
     { "word": "sigo", "start": 36.3, "end": 36.5 },
     { "word": "atendiendo", "start": 36.6, "end": 37.0 }
   ]

2. Nuestro código calcula los gaps:
   - Gap entre end(1.1) y start(36.1) = 35 segundos → SILENCIO DETECTADO

3. Cruzamos con el canal del cliente:
   - Si el cliente habla durante ese gap → silencio del agente (esperado si escucha)
   - Si ambos canales están en silencio → silencio muerto (problema real)
   - Si solo el agente calla por >30s sin que el cliente hable → problema grave
```

Esta lógica es **100% confiable** porque se basa en timestamps reales del audio, no en inferencia de IA.

---

## 8. POC vs MVP — Diferencias Claras

| Aspecto | POC | MVP |
|---|---|---|
| **Objetivo** | Demostrar viabilidad técnica | Producto mínimo funcional en producción |
| **Usuarios** | Alejandro (Calidad) + Eduardo | Equipo de calidad completo |
| **Llamadas** | 100-150 muestras (batch) | Procesamiento continuo (diario) |
| **Silencios** | Detección básica con umbral fijo (30s) | Umbrales configurables por campaña |
| **Resumen** | Texto plano estructurado | Integrado con workflow de calidad |
| **RAG** | Estático (oferta vigente al momento del POC) | Dinámico (actualización diaria con versionamiento) |
| **Dashboard** | Básico/rudimentario | Vistas por rol (gerencial, calidad, supervisor) |
| **Prosodia** | Básica (Gemini) | Análisis de sentimiento por segmento |
| **Multi-tenant** | No (solo Callfast) | Si (preparado para otros clientes) |
| **Auth/Roles** | No necesario | Autenticación + roles + permisos |
| **Infraestructura** | Scripts locales o Vercel | Serverless escalable |
| **Costos** | ~$6 USD total | Depende del volumen contratado |
| **Duración** | 2-4 semanas | 2-3 meses post-POC |

**En resumen:**
- **POC** = "¿Funciona? ¿Resuelve los 3 dolores?" → Demostrar a Eduardo y Alejandro que sí.
- **MVP** = "¿Está listo para que lo use el equipo de calidad diario?" → Producto real, con login, roles, y procesamiento continuo.

---

## 9. Pipeline Propuesto para el POC

```
┌─────────────────────────────────────────────────────┐
│                    POC PIPELINE                      │
│                                                      │
│  1. UPLOAD                                           │
│     Audio MP3 estéreo (100-150 llamadas batch)       │
│              ↓                                       │
│  2. TRANSCRIPCIÓN (Deepgram)                         │
│     multichannel=true                                │
│     → Canal 0: Agente (timestamps por palabra)       │
│     → Canal 1: Cliente (timestamps por palabra)      │
│              ↓                                       │
│  3. ANÁLISIS DE SILENCIOS (Código propio)            │
│     → Calcular gaps >30s en canal agente             │
│     → Cruzar con actividad del canal cliente         │
│     → Clasificar: silencio muerto vs escucha activa  │
│              ↓                                       │
│  4. EVALUACIÓN + RESUMEN (Gemini Flash)              │
│     → Recibe transcripción texto (no audio)          │
│     → Evaluación con rúbrica del cliente             │
│     → Resumen estructurado                           │
│     → Detección de violaciones (ETI)                 │
│     → Clasificación de escenario                     │
│              ↓                                       │
│  5. RESULTADOS                                       │
│     → Dashboard básico                               │
│     → Silencios detectados con timestamps            │
│     → Resumen de la llamada                          │
│     → Score de evaluación                            │
└─────────────────────────────────────────────────────┘
```

### Beneficio adicional de la Opción B:

Al enviar **texto** a Gemini en vez de audio:
- **Más barato:** ~1,500 tokens de texto vs ~9,000 tokens de audio para 5 min
- **Más rápido:** no hay procesamiento de audio
- **Más preciso:** Gemini evalúa sobre una transcripción verificada
- **Más flexible:** podemos cambiar Gemini por otro LLM sin cambiar el pipeline de transcripción

---

## 10. Recomendación Final

**Opción B: Deepgram (transcripción) + Gemini Flash (evaluación)** es la arquitectura que recomiendo:

1. **Resuelve los 3 dolores** de Callfast con precisión
2. **Silencios confiables** — código determinístico, no inferencia de IA
3. **Costo razonable** — ~$0.79 MXN/llamada vs $50 MXN humano
4. **POC gratuito** — los $200 de crédito de Deepgram cubren las 150 llamadas
5. **Escala** — la arquitectura funciona igual para 150 que para 3.5M llamadas
6. **Mantiene lo que funciona** — Gemini sigue haciendo evaluación + resumen
7. **Separa responsabilidades** — cada servicio hace lo que mejor sabe hacer

### Próximos pasos sugeridos:

1. Validar el formato exacto de audio que entrega Callfast (MP3 estéreo, sample rate, bitrate)
2. Crear cuenta Deepgram y probar con 2-3 llamadas de muestra
3. Implementar el pipeline de detección de silencios
4. Adaptar el pipeline de Gemini para recibir texto en vez de audio
5. Correr las 100-150 llamadas del POC

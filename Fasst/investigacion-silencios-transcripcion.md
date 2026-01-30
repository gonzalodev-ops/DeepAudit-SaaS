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

## 10. Evaluación del Cliente (Sentimiento e Inferencia)

Un requerimiento adicional es no solo evaluar al agente, sino también inferir el comportamiento y reacción del cliente: si se frustra, se calma, se enoja, etc. Esto tiene implicaciones de arquitectura:

### ¿Qué necesitamos del canal del cliente?

| Análisis | Fuente | Método |
|---|---|---|
| **Sentimiento por segmento** | Transcripción canal cliente | LLM (Gemini/LeMUR) sobre texto |
| **Tono de voz / prosodia** | Audio canal cliente | Modelo de audio (futuro) |
| **Escalación emocional** | Ambos canales correlacionados | LLM comparando evolución |
| **Resultado de la llamada** | Contexto completo | LLM sobre transcripción completa |

### Ventaja de canales separados para esto:

Con canales separados podemos analizar el sentimiento del cliente **sin contaminación** de la voz del agente. Esto es más preciso que diarización, donde los segmentos pueden tener bleeding entre hablantes.

### Opciones de análisis de sentimiento:

| Servicio | Feature | Costo adicional |
|---|---|---|
| **AssemblyAI** | Sentiment Analysis built-in (por utterance) | +$0.02/min |
| **AssemblyAI LeMUR** | Análisis personalizado sobre transcripción | ~$0.003/min |
| **Deepgram** | Sentiment Analysis (beta) | Incluido |
| **Gemini Flash** | Análisis vía prompt sobre texto | ~$0.001 (ya lo usamos) |

**Nota:** Para el POC, el análisis de sentimiento vía Gemini sobre la transcripción texto es suficiente y no agrega costo. Features dedicadas de sentiment se evaluarán para MVP.

---

## 11. Comparativa Head-to-Head: AssemblyAI vs Deepgram

Ambos servicios son candidatos fuertes. En vez de descartar uno prematuramente, haremos una **evaluación lado a lado con audio real** de Callfast.

### 11.1 Comparativa Teórica

| Criterio | AssemblyAI | Deepgram |
|---|---|---|
| **Precio base** | $0.0025/min (Universal) | $0.0065/min (Growth) |
| **Precio efectivo (estéreo)** | ~$0.005/min (cobra por canal) | ~$0.0065/min (incluido) |
| **Precio x llamada 5 min** | $0.025 USD | $0.0325 USD |
| **Multicanal nativo** | Sí | Sí |
| **Timestamps por palabra** | Sí, con canal por palabra | Sí, con canal por utterance |
| **Sentiment Analysis** | Sí (add-on $0.02/min) | Sí (beta, incluido) |
| **LLM integrado** | **LeMUR** (resumen, Q&A, análisis) | No |
| **Español** | Sí (Universal, 99 idiomas) | Sí (Nova-3) |
| **Reputación** | Estándar en startups/developers | Fuerte en enterprise/call centers |
| **Free credits** | $50 | $200 |
| **Documentación** | Excelente | Muy buena |
| **SDK/API** | REST + SDKs (Python, JS, etc.) | REST + SDKs |

### 11.2 Ventajas Únicas de Cada Uno

**AssemblyAI:**
- **LeMUR**: LLM integrado que puede hacer resumen y análisis directamente sobre la transcripción. Potencialmente reemplaza a Gemini para el resumen, simplificando a **un solo proveedor** para transcripción + resumen.
- Precio base más bajo.
- Audio Intelligence add-ons: topic detection, content moderation, PII redaction.
- Muy buena documentación y developer experience.

**Deepgram:**
- $200 de crédito gratis (vs $50 de AssemblyAI) — cubre todo el POC holgadamente.
- Multicanal no cobra extra por canal.
- Más opciones de modelos (Nova-3, Enhanced, Base).
- Streaming real-time con multicanal (para futuro monitoreo en vivo).
- On-premises disponible para enterprise.

### 11.3 La Pregunta sobre LeMUR

Si LeMUR de AssemblyAI puede hacer el resumen + evaluación con calidad comparable a Gemini, el pipeline se simplificaría a:

```
Opción Pipeline A (dos proveedores):
  Audio → AssemblyAI/Deepgram (STT) → Gemini (evaluación + resumen)

Opción Pipeline B (un proveedor — solo AssemblyAI):
  Audio → AssemblyAI (STT + LeMUR para resumen + evaluación)
```

**Pipeline B es más simple**, pero depende de que LeMUR tenga la calidad suficiente para evaluación con rúbrica. Esto se validará en la prueba comparativa.

### 11.4 Plan de Evaluación Comparativa

Cuando tengamos las muestras de audio de Callfast (previo a las 100-150 del POC), tomaremos **5-10 llamadas** y correremos:

| Prueba | Qué medimos |
|---|---|
| **Transcripción multicanal** | Precisión del texto en español, manejo de jerga técnica (modems, ISP) |
| **Timestamps** | Precisión para detección de silencios (comparar gaps detectados) |
| **Atribución de canal** | Que cada utterance esté en el canal correcto |
| **Sentimiento** | Calidad del sentiment analysis por utterance del cliente |
| **LeMUR vs Gemini** | Calidad del resumen y evaluación con la misma rúbrica |
| **Latencia** | Tiempo de procesamiento por llamada |
| **Costo real** | Costo efectivo medido (no teórico) |

**Criterio de decisión:** La calidad de transcripción en español es el factor más importante. Si ambos son comparables en calidad, el precio y la simplicidad del pipeline decidirán.

---

## 12. Recomendación Actualizada

**Arquitectura híbrida confirmada** (STT dedicado + LLM para evaluación), pero el servicio STT se decidirá tras evaluación comparativa:

1. **Candidatos finales:** AssemblyAI vs Deepgram
2. **Evaluación:** Side-by-side con 5-10 llamadas reales de Callfast
3. **Decisión basada en datos:** calidad en español > precio > simplicidad
4. **LeMUR de AssemblyAI** se evaluará como posible reemplazo de Gemini para resumen

### Próximos pasos:

1. Validar formato de audio de Callfast (MP3 estéreo, sample rate, bitrate)
2. Obtener 5-10 llamadas de muestra para evaluación comparativa
3. Crear cuentas en AssemblyAI y Deepgram (créditos gratis)
4. Correr evaluación side-by-side documentada
5. Decidir servicio STT basado en resultados
6. Evaluar si LeMUR puede sustituir a Gemini para resumen/evaluación
7. Implementar pipeline de detección de silencios
8. Correr las 100-150 llamadas del POC

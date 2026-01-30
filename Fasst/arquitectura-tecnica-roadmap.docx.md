# **ARQUITECTURA TÉCNICA Y ROADMAP DE PRODUCTO**

*Documento confidencial \- Solo uso interno*  
Fecha: 29 de enero de 2026

# **1\. Visión de Producto**

Este documento describe la evolución técnica desde DeepAudit (prueba de concepto existente) hacia una solución comercializable para call centers.

## **1.1 Evolución del Producto**

| Fase | Descripción | Propósito |
| :---- | :---- | :---- |
| **DeepAudit** | Base técnica interna (POC existente) | Demostrar viabilidad técnica |
| **Proyecto Callfast** | Validación con cliente real \+ extensiones | Validar mercado, agregar funcionalidades |
| **Producto Multi-cliente** | Solución comercializable y escalable | Vender a otros call centers |

**Principio clave:** Todo lo que se desarrolle para Callfast debe ser modular y configurable, pensando en reutilización para otros clientes.

# **2\. Estado Actual: DeepAudit**

## **2.1 Capacidades Existentes**

| Componente | Estado | Notas |
| :---- | :---- | :---- |
| Transcripción de llamadas | ✅ Existe | Funcional |
| Evaluación con IA | ✅ Existe | Funcional |
| Resumen estructurado | ✅ Existe | Funcional |
| Despliegue | ✅ Existe | Vercel |

## **2.2 Métricas Demostradas**

* **Costo por evaluación:** \~$0.07 MXN por llamada  
* **Stack:** Vercel, IA (Claude/Gemini)

# **3\. Extensiones Requeridas para Callfast**

## **3.1 Matriz de Componentes**

| Componente | Estado | Ajustes para Callfast |
| :---- | :---- | :---- |
| Transcripción | Existe | Agregar timestamps palabra por palabra para detección de silencios |
| Evaluación con IA | Existe | Adaptar prompts a rúbrica específica de Callfast |
| Resumen estructurado | Existe | Formato específico para verificación en sistema de Callfast |
| Detección de silencios | NUEVO | Desarrollar. Umbral: 30 segundos. Requiere timestamps |
| RAG oferta comercial | NUEVO | Desarrollar. POC: estático. Solución: dinámico (diario) |
| Dashboard | NUEVO | Desarrollar. Multi-vista por rol (gerencial, calidad, supervisor) |
| Análisis de prosodia | NUEVO | Investigar/Desarrollar. Estado anímico agente y cliente |

# **4\. Arquitectura Multi-Tenant**

La estructura Cliente → Campaña → Subcampaña → Oferta Comercial debe ser genérica para soportar múltiples clientes en el futuro.

## **4.1 Modelo de Datos Propuesto**

| Entidad | Contiene | Frecuencia Cambio |
| :---- | :---- | :---- |
| Cliente | Configuración global, usuarios, roles, estructura organizacional | Muy baja |
| Campaña | Manual de calidad, rúbrica de evaluación, RAG base | Muy baja |
| Subcampaña | Reglas específicas, fechas vigencia | Baja-Media |
| Oferta Comercial | Precios, promociones, condiciones, vigencia temporal | **ALTA (diaria)** |
| Llamada | Audio, transcripción, evaluación, referencia a oferta vigente | Continua |

## **4.2 Versionamiento de Oferta Comercial**

**Problema crítico:** Cada llamada debe evaluarse contra la oferta vigente EN ESE MOMENTO, no contra la oferta actual.

**Solución propuesta:**

1. Cada versión de oferta comercial tiene fecha de vigencia (inicio/fin)  
2. Cada llamada registra su timestamp  
3. Al evaluar, se cruza timestamp de llamada con oferta vigente en ese momento  
4. El RAG se indexa por versión de oferta

# **5\. Análisis de Modelos de IA**

Evaluar costo-beneficio de diferentes modelos para cada componente:

| Categoría | Opciones | Notas |
| :---- | :---- | :---- |
| Transcripción | Whisper (local/API), Google Speech, AssemblyAI, Deepgram | Evaluar timestamps palabra por palabra |
| Evaluación/RAG | Claude (Sonnet, Haiku), Gemini (2.5, 3 Flash con audio nativo), GPT-4 | Balance precisión vs costo |
| Open Source (local) | Llama 3, Mistral, Qwen | Para Callfast que ya corre modelos locales |
| Embeddings | OpenAI, Cohere, Sentence Transformers (local) | Para RAG de ofertas comerciales |

**Criterios de evaluación:** Costo por llamada, precisión, latencia, capacidad de correr localmente, soporte español.

# **6\. Investigación Técnica Pendiente**

## **6.1 Análisis de Silencios**

* ¿Detección directa del audio vs análisis de timestamps de transcripción?  
* ¿Cómo diferenciar silencio del agente vs silencio del cliente?  
* Manejo de música de espera  
* Servicios que proveen timestamps a nivel de palabra

## **6.2 RAG Dinámico**

* Costos de re-indexación diaria  
* Scraping vs carga manual vs API/webhook  
* Estrategias de versionamiento temporal  
* Vector databases: Pinecone, Weaviate, Qdrant, Chroma

# **7\. Roadmap de Alto Nivel**

| Fase | Entregables | Objetivo de Negocio |
| :---- | :---- | :---- |
| **POC** | 3 entregables principales \+ dashboard básico \+ prosodia básica. RAG estático. | Demostrar valor, ganar confianza |
| **MVP** | RAG dinámico, dashboard completo, integración con sistemas Callfast | Primer cliente pagando |
| **Expansión** | Impacto en capacitación y retención, monitoreo tiempo real, apoyo a Súper Agente | El negocio grande |
| **Multi-cliente** | Producto empaquetado, onboarding self-service, pricing escalable | Venta a otros call centers |

# **8\. Principios de Diseño**

5. **Modularidad:** Cada componente debe ser independiente y reutilizable  
6. **Configurabilidad:** Parámetros por cliente/campaña, no hardcoded  
7. **Sin capacitación:** La solución debe ser tan intuitiva que no requiera capacitación  
8. **Escalabilidad:** Diseñar para múltiples clientes desde el inicio y con la posibilidad de cambiar de modelo base, agnóstico al llm  
9. **Costo-eficiencia:** Optimizar para \~$0.07/llamada o menos, pero tener visibilidad de las posibilidades aun cuando sea mas caro.
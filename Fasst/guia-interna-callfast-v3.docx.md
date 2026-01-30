# **GUÍA INTERNA: Proyecto Callfast**

*Documento confidencial \- Solo uso interno*  
Fecha: 29 de enero de 2026 | Versión 3

# **1\. Resumen Ejecutivo**

Callfast es un call center enfocado en soporte técnico (principalmente ISP con 50+ modelos de modems). La oportunidad surge a través de Fernando Morelos (socio, ya no opera) y Alberto David. El cliente tiene necesidades reales no resueltas por su proveedor actual en 3 puntos específicos.

# **2\. Visión Estratégica**

**⚠️ IMPORTANTE: El POC es la puerta de entrada, pero el negocio grande está en impactar CAPACITACIÓN Y RETENCIÓN. No perder de foco esta oportunidad aunque el POC vaya por evaluación de calidad.**

El potencial de ahorro más grande para Callfast está en reducir la rotación (hoy \~5% en base estable \+ abandono temprano) y acortar los ciclos de capacitación (hasta 2 meses en soporte técnico). Si logramos incrustarnos en esos temas, ya es un gran negocio.

**Estrategia:** Entrar por el POC de evaluación → Demostrar valor → Expandir hacia capacitación y retención.

# **3\. Contexto del Proyecto**

## **3.1 Posicionamiento**

**Objetivo:** Apoyar al equipo interno de Callfast en la construcción de la información que eventualmente conforme el RAG para el "Súper Agente". No competir con ellos, sino ser soporte y complemento.

## **3.2 Relaciones Clave**

| Persona | Rol | Relación |
| :---- | :---- | :---- |
| Alberto David | Conector | Amigo cercano, hizo el contacto inicial |
| Fernando Morelos | Socio Callfast (no opera) | Tío de Alberto, abrió la puerta |
| Eduardo Rugama | Director | Contacto principal para el proyecto |
| Jorge | Director Operativo | Stakeholder operaciones |
| Alejandro | Jefe de Calidad | Contacto técnico para POC |
| Diego, Pablo | Sistemas | Trabajan en proyecto interno de RAG |

***Nota estratégica:** Si el proyecto camina y se puede empaquetar para otros call centers, Fernando y Alberto son candidatos a socios. No mencionar explícitamente por ahora.*

# **4\. Problemas Identificados del Cliente**

## **4.1 Capacitación y Rotación**

* Capacitación de soporte técnico: hasta 2 meses  
* Abandono temprano: antes de 2 meses post-capacitación  
* Rotación base estable: \~5%  
* Recapacitación constante por nuevos equipos/configuraciones

## **4.2 Monitoreo de Calidad**

* Hoy evalúan menos del 5% de las llamadas  
* No tienen certeza del tipo de cada llamada (servicio técnico vs queja vs atención general)  
* Impacto en facturación: no saben cómo clasificar para cobrar

## **4.3 Proveedor Actual**

**Nota:** El proveedor actual NO es fallido. Ha resuelto muchas cosas, pero no ha podido con 3 puntos específicos:

1. **Resumen detallado:** Qué se hizo en la llamada y qué debe reflejarse en sistema (para no escuchar toda la llamada)  
2. **Control de silencios:** Umbral de 30 segundos. Por eso los operadores dicen "lo sigo atendiendo" para dar retroalimentación  
3. **Validación comercial:** Verificar que lo ofrecido coincida con la oferta vigente en ese momento

**→ Si resolvemos estos 3 puntos, entramos a competir. Después replicamos el resto.**

# **5\. Arquitectura de Información**

## **5.1 Estructura Multi-nivel**

Cada cliente (en este caso Callfast) tendrá múltiples campañas, y cada campaña puede tener subcampañas. Cada nivel requiere configuración específica:

| Nivel | Duración | Componentes | Freq. Cambio |
| :---- | :---- | :---- | :---- |
| Cliente | Permanente | Config general, estructura org | Muy baja |
| Campaña | Años o indefinida | RAG base, Manual calidad, Rúbrica | Muy baja |
| Subcampaña | Meses (fechas definidas) | Reglas específicas | Baja-Media |
| **Oferta Comercial** | Variable | Precios, promociones, condiciones | **ALTA (diaria)** |

## **5.2 Estrategia de RAG: POC vs Solución Real**

**Decisión clave de diseño**

| Fase | Tipo de RAG | Justificación |
| :---- | :---- | :---- |
| **POC** | RAG ESTÁTICO | Simplificar para demostrar viabilidad técnica. Usaremos la oferta comercial vigente al momento de las llamadas de muestra. |
| **Solución Real** | RAG DINÁMICO | Actualización frecuente (diaria). Requiere versionamiento para evaluar llamadas contra la oferta vigente en ese momento específico. |

**Importante:** Desde el diseño del POC se debe contemplar que la solución final requerirá RAG dinámico. Las decisiones de arquitectura deben facilitar esta transición.

**Investigación pendiente:**

* Limitaciones técnicas de actualización frecuente  
* Costos de re-indexación diaria  
* Estrategias de versionamiento (asociar llamada con oferta vigente en ese momento)  
* Scraping vs carga manual vs API/webhook

## **5.3 Estructura de Vistas por Rol**

El sistema debe soportar múltiples vistas de la misma información, filtradas según la posición o función del usuario:

| Rol | Vista/Necesidad |
| :---- | :---- |
| Gerencial | KPIs globales, tendencias, comparativas entre campañas |
| Calidad (Alejandro) | Campaña → Supervisor → Equipo → Agente |
| Operaciones | Estructura propia de supervisores y agentes |
| Supervisor | Detalle de su equipo, alertas de desempeño |
| Analista | Detalle de llamadas individuales, verificación contra sistema |

# **6\. Prueba de Concepto (POC)**

## **6.1 Entregables Principales**

| \# | Entregable | Descripción | Complejidad |
| :---- | :---- | :---- | :---- |
| 1 | Detección de silencios | Medir tiempos muertos del agente. Umbral: 30 segundos | Media |
| 2 | Validación comercial | Verificar que lo dicho coincida con la oferta vigente (RAG estático para POC) | Alta (RAG) |
| 3 | Resumen estructurado | Qué se acordó y debe reflejarse en sistema (sin escuchar toda la llamada) | Media |

## **6.2 Entregables Adicionales (Versión Básica/Rudimentaria)**

| \# | Entregable | Descripción |
| :---- | :---- | :---- |
| 4 | Dashboard básico | Visualización rudimentaria de resultados para demostrar capacidad |
| 5 | Análisis de prosodia | Evaluación básica del estado anímico del agente y cliente |

## **6.3 Materiales Requeridos del Cliente**

4. Muestras de llamadas (audio)  
5. Documentos de campaña  
6. Rúbrica de evaluación actual  
7. Manual de calidad de la campaña  
8. Evaluaciones previas realizadas (para contrastar)  
9. Material de oferta comercial vigente (para el RAG estático del POC)  
10. Formato actual de reportes de evaluación

# **7\. Oportunidades Futuras (Post-POC)**

* **RAG dinámico:** Evolución del RAG estático a actualización diaria con versionamiento  
* **Impacto en capacitación:** Reducir tiempos de onboarding con asistencia inteligente  
* **Impacto en retención:** Identificar señales tempranas de abandono  
* **Clasificación automática de llamadas:** Determinar tipo (servicio técnico, queja, atención general)  
* **Apoyo al Súper Agente:** Colaborar con equipo interno para construir el RAG de soporte técnico  
* **Monitoreo en tiempo real:** Detectar deterioro del desempeño durante el día  
* **Soporte visual:** Capturas de pantalla del cliente para diagnóstico

# **8\. Investigación Técnica Pendiente**

## **8.1 Análisis de Silencios**

**Objetivo:** Detectar y medir tiempos muertos del agente durante la llamada. Umbral: 30 segundos.  
**Preguntas a resolver:**

* ¿Se puede detectar silencios directamente del audio o se requiere la transcripción con timestamps?  
* ¿Qué servicios de transcripción proveen timestamps a nivel de palabra?  
* ¿Cómo diferenciar silencio del agente vs silencio del cliente?  
* ¿Cómo manejar llamadas con música de espera?

## **8.2 RAG Dinámico para Ofertas Comerciales**

**Objetivo:** Diseñar arquitectura que soporte actualización frecuente (diaria) de la oferta comercial.  
**Preguntas a resolver:**

* ¿Cómo estructurar el RAG para manejar versiones temporales de ofertas?  
* ¿Scraping automatizado es viable para su portal?  
* ¿Cómo asociar cada llamada con la oferta vigente en ese momento?  
* Costos de re-indexación diaria  
* Alternativas: scraping vs carga manual vs API/webhook

## **8.3 Análisis Costo-Beneficio de Modelos**

Evaluar una gama amplia de modelos, no solo los comerciales:

* **Familia Gemini:** Gemini 2.5, Flash, etc.  
* **Familia Claude:** Sonnet, Haiku, Opus  
* **Open Source:** Llama, Mistral, Qwen (pueden correr localmente)  
* **Whisper:** Para transcripción (local vs API)

**Criterios de evaluación:** Costo por llamada, precisión, latencia, capacidad de correr localmente.

# **9\. Principios de Diseño**

**Principio clave: La solución debe ser tan intuitiva y funcional que NO requiera capacitación para usarse.**

Esto es estratégico: si ayudamos a Callfast a reducir capacitación en sus agentes, nuestra propia solución no puede agregar carga de capacitación adicional.

# **10\. Lista de Pendientes**

## **10.1 Inmediatos**

| \# | Pendiente | Responsable | Estado |
| :---- | :---- | :---- | :---- |
| 1 | Enviar correo a Eduardo Rugama | Gonzalo | Pendiente |
| 2 | Enviar correo de agradecimiento a Fernando | Gonzalo | Pendiente |
| 3 | Firmar NDA | Eduardo / Gonzalo | Esperando |
| 4 | Recibir materiales para POC | Callfast | Esperando |
| 5 | Investigación: Análisis de silencios en audio | Gonzalo | En progreso |
| 6 | Investigación: RAG dinámico para ofertas comerciales | Gonzalo | En progreso |

## **10.2 Siguiente Fase**

1. Definir timeline del POC con Eduardo y Alejandro  
2. Evaluar scraping vs carga manual para ofertas comerciales  
3. Análisis costo-beneficio de modelos (Gemini, Claude, Open Source)  
4. Diseñar estructura de RAG multi-campaña

# **11\. Notas Adicionales**

## **11.1 Proyecto Interno de Callfast**

El equipo de sistemas (Diego, Pablo) está trabajando en un RAG para soporte técnico usando modelos locales. No competir, sino buscar complementar su trabajo.

## **11.2 Citas Relevantes de la Reunión**

*"La necesidad es muy real, es palpable, pero no les han sabido cumplir."*  
*"Hay que capacitar a la gente para que sepa hacer las preguntas adecuadas."*

**Nota estratégica sobre la segunda cita:** Esto refuerza la necesidad de diseñar una solución que no requiera capacitación adicional. Si ellos tienen que capacitar a su gente para hacer preguntas, nuestra herramienta debe ser tan intuitiva que no agregue carga.
# DOCUMENTO DE REQUERIMIENTOS DE PRODUCTO (PRD)

**Proyecto:** DeepAudit Enterprise (Edición Piloto de Inversión)**Versión:** 2.2 (Enfoque: Mitigación de Riesgo & Retención de Clientes)**Fecha de Entrega:** Lunes (Demo Inversionistas)**Stakeholder Principal:** Dirección General / Socio Estratégico

## 1\. VISIÓN DEL PRODUCTO

Transformar la narrativa del MVP actual: de una "herramienta de costos" a una **Plataforma de Blindaje Corporativo y Retención de Ingresos**. El sistema debe demostrar capacidad inmediata para auditar el 100% de las interacciones, detectando fugas de clientes (Churn) y riesgos legales críticos que la supervisión humana pasa por alto.

## 2\. IDENTIDAD Y BRANDING (FRONTEND)

* **Nombre Comercial:** **DeepAudit Enterprise**  
* **Subtítulo de Instancia:** *Powered by CallFasst Intelligence | Cliente Demo: Telecom Global*  
* **Lenguaje Visual:** Estética Enterprise B2B. Paleta de colores sobria (Azul Corporativo, Gris Acero) con acentos funcionales de alerta (Rojo Crítico para Riesgo, Verde para Retención).

## 3\. DASHBOARD OPERATIVO (UX/UI)

**Objetivo:** El usuario debe identificar a los agentes tóxicos y las oportunidades de retención en menos de 5 segundos.

### A. Sección Superior: KPIs de Alto Impacto

*Reemplazar visualización de costos por métricas de blindaje:*

* **Cobertura de Auditoría Real:**  
* **Visual:** Gráfico de anillo cerrado al 100%.  
* **Etiqueta:** "100% Auditado (vs 1.5% Humano)".  
* **Dinero Salvado (Retención):**  
* **Visual:** Indicador numérico verde.  
* **Dato:** **$15,000 MXN** (Estimado en LTV retenido hoy).  
* **Subtexto:** "3 Clientes Salvados de Cancelación".  
* **Alertas de Riesgo Crítico:**  
* **Visual:** Contador Rojo Pulsante.  
* **Dato:** **2 Alertas Graves** (Profeco / Abuso).

### B. Sección Central: Centro de Comando (Prioridad por Riesgo)

*Datos reales extraídos de las llamadas proporcionadas:*  
ID,Agente,Escenario,Sentimiento Cliente,Riesgo Legal,Resultado,Acción Sugerida  
\#RT-99285,"""X"" (Call 2)",Disputa Factura,🔴 Hostil (Furia),🔥 CRÍTICO (Abuso),❌ Colgado,🛑 Despido Inmediato  
\#RT-99284,Alex (Call 1),Cancelación,🔴 Negativo,⚠️ Alto (Profeco),📉 Churn,🎓 Coaching Urgente  
\#RT-99283,Sofía (Call 3),Retención,🟢 Positivo,🛡️ Seguro,✅ Retenido,⭐ Modelar Script

### C. Sección de Detalle (Drill-Down)

Al seleccionar una llamada específica, el sistema debe mostrar la evidencia irrefutable:  
**Caso 1: Riesgo Crítico (Llamada Telco 2\)**

* **Alerta:** "Lenguaje Ofensivo Detectado".  
* **Transcripción Resaltada:** *"Suerte con su deuda. Muerto de hambre."* 1\.  
* **Grounding (Violación):** "Infracción a Política de Cero Tolerancia, Cap. 1\. Agente insulta al cliente y niega su nombre".

**Caso 2: Riesgo Legal (Llamada Telco 1\)**

* **Alerta:** "Amenaza Legal Ignorada".  
* **Transcripción Resaltada:** *"Me voy a ir directo a la Profeco a ponerles una queja formal"* 2\.  
* **Falla de Protocolo:** El agente Alex responde con sarcasmo ("No me venga con cuentos") en lugar de activar protocolo de contención 3\.

**Caso 3: Éxito de Retención (Llamada Telco 3 \- Sofía)**

* **Highlight:** "Uso efectivo de herramienta de retención".  
* **Evidencia:** *"Bono de lealtad... descuento directo del 20%... sin cambiarle su plan"* 4\.  
* **Resultado:** Cliente acepta y desiste de Profeco 5\.

### D. Sección "Unit Economics" (Ubicación: Footer/Pestaña Admin)

*Validación financiera discreta pero accesible:*

* **Costo Real por Auditoría:** $0.08 MXN.  
* **Capacidad vs Humano:** 641x.  
* **Ahorro Operativo:** 99.8%.

## 4\. ESPECIFICACIONES TÉCNICAS (BACKEND)

### A. Motor de Inteligencia (Core)

* **Modelo:** **Gemini 2.5 Flash / 3.0 (Early Access)**.  
* **Justificación:** Procesamiento nativo de audio para captar entonación (sarcasmo en Llamada 1 vs. empatía en Llamada 3\) y ventana de contexto amplia para manuales extensos.  
* **Temperatura:** 0.1 (Para evaluación estricta de cumplimiento).

### B. Arquitectura RAG (Retrieval-Augmented Generation)

* **Ingesta:** PDF "Manual de Retención y Calidad Telco".  
* **Función:** El sistema usa el manual para validar si el ofrecimiento del "20% de descuento" hecho por Sofía 4 estaba autorizado o si Alex tenía obligación de transferir la llamada 3\.

### C. Configuración Multi-Tenant

* **Selector:** Dropdown "Campaña: Retención Postpago".  
* **Aislamiento:** Demostrar que las reglas de negocio de "Telco" (bonos de lealtad) no se mezclan con reglas de "Cobranza".

## 5\. USER STORIES PARA EL DEMO (NARRATIVA)

**Historia 1: El "Bombero" (Mitigación de Crisis)**  
*"Como Director de Operaciones, necesito identificar inmediatamente a un agente que esté insultando a un cliente para evitar un escándalo viral."*

* **Demo Flow:** Cargar **Llamada Telco 2** \-\> El Dashboard parpadea en Rojo Crítico \-\> Mostrar transcripción: *"Muerto de hambre"* \-\> Acción: Bloquear Agente.

**Historia 2: El "Abogado" (Protección Legal)**  
*"Como Oficial de Cumplimiento, quiero detectar menciones de 'PROFECO' que no fueron escaladas correctamente."*

* **Demo Flow:** Filtrar por Keyword "Profeco" \-\> Aparece **Llamada Telco 1** (Alex) \-\> Ver dictamen IA: "Agente falló en desescalar conflicto" \-\> Riesgo de Multa.

**Historia 3: El "Estratega" (Clonación de Éxito)**  
*"Como Gerente de Calidad, quiero entender qué hizo diferente Sofía para retener al cliente que Alex perdió."*

* **Demo Flow:** Comparar **Llamada 1 vs Llamada 3** \-\> IA resalta: Sofía usó "Empatía" \+ "Bono 20%" 4; Alex usó "Confrontación" 3\. \-\> Acción: Generar script de entrenamiento basado en Sofía.


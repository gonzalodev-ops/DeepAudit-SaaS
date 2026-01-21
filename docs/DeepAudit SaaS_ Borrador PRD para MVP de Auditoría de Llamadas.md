# PRD: DeepAudit SaaS \- MVP (Fase 1: Auditoría)

## 1\. Contexto y Visión

**Objetivo:** Construir un MVP de una plataforma SaaS Multi-Tenant para auditoría automatizada de Call Centers.**Problema:** La auditoría humana cubre solo el 1% de las llamadas. Necesitamos cobertura del 100% a bajo costo.**Solución:** Ingesta de audio agnóstica \+ Análisis con Gemini 1.5 Flash \+ RAG basado en manuales operativos del cliente.**Usuarios:** Gerentes de Calidad y Supervisores de Call Center (B2B).

## 2\. Alcance del MVP (Scope)

Este MVP se enfoca exclusivamente en la **"Capa de Auditoría" (Nivel 1\)**.

* **NO incluye:** Roleplay Bot, Copiloto en tiempo real (out of scope).  
* **SI incluye:** Gestión de múltiples clientes (Multi-tenant), subida de manuales PDF (Configuración), procesamiento de audio offline, y Dashboard de resultados.

## 3\. Stack Tecnológico Sugerido

* **Backend:** Python 3.11+ (FastAPI).  
* **Frontend:** Streamlit (para velocidad de desarrollo del MVP) o React simple.  
* **LLM:** Google Gemini 1.5 Flash (Optimizado para audio nativo y bajo costo).  
* **Base de Datos:** Firestore (NoSQL para flexibilidad de esquemas JSON).  
* **Almacenamiento:** Google Cloud Storage (Buckets separados por Tenant).  
* **RAG:** Vertex AI Search (o implementación simple con ChromaDB/FAISS para el MVP local).

## 4\. Arquitectura de Datos (Data Models)

Instrucción para Claude: *Usa estos esquemas Pydantic como referencia base.*  
from enum import Enum  
from typing import List, Optional  
from pydantic import BaseModel, Field  
from datetime import datetime

class CallSentiment(str, Enum):  
    POSITIVE \= "positive"  
    NEUTRAL \= "neutral"  
    NEGATIVE \= "negative"  
    CRITICAL \= "critical"

class ComplianceCheck(BaseModel):  
    item\_id: str  
    description: str  \# Ej: "Leyó aviso de privacidad"  
    passed: bool  
    evidence\_quote: Optional\[str\] \= None  \# Cita textual del fallo/acierto  
    timestamp\_start: Optional\[str\] \= None

class AuditResult(BaseModel):  
    call\_id: str  
    overall\_score: int \= Field(..., ge=0, le=100)  
    sentiment: CallSentiment  
    summary: str  
    compliance\_checklist: List\[ComplianceCheck\]  
    critical\_flags: List\[str\]  \# Ej: \["Amenaza legal", "Grosería"\]  
    processed\_at: datetime

class TenantConfig(BaseModel):  
    tenant\_id: str  
    name: str  
    industry: str  \# Ej: "Telco", "Cobranza"  
    manual\_pdf\_url: str  \# URL del documento en GCS  
    audit\_criteria: List\[str\]  \# Lista de puntos a evaluar extraídos o definidos

## 5\. Requerimientos Funcionales (User Stories)

### Historia 1: Configuración del Cliente (Onboarding)

* **Como:** Administrador del sistema.  
* **Quiero:** Crear un nuevo "Tenant" (Cliente) y subir su PDF de "Políticas de Calidad".  
* **Sistema:** Debe procesar el PDF (OCR/Parsing) y generar un índice vectorial (RAG) asociado a ese Tenant ID.

### Historia 2: Ingesta de Audio (Operación)

* **Como:** Gerente de Calidad.  
* **Quiero:** Subir un lote de archivos de audio (.mp3, .wav) o conectar una URL de grabación.  
* **Sistema:** Debe subir el archivo a GCS, crear un registro en Firestore con estado "PENDING" y encolar el trabajo de análisis.

### Historia 3: Procesamiento de Auditoría (El Core AI)

1. **Trigger:** Nuevo audio en cola.  
2. **Proceso:**  
3. Recuperar el contexto del cliente (Manuales PDF) usando el Tenant ID.  
4. Enviar Audio \+ Contexto Relevante \+ Prompt de Auditoría a **Gemini 1.5 Flash**.  
5. *Constraint:* Usar el modo nativo de audio de Gemini (Multimodal), no transcribir primero con Whisper (para ahorrar latencia/costo).  
6. Parsear la respuesta del LLM a JSON estricto (usando el esquema AuditResult).  
7. Guardar resultado en Firestore y actualizar estado a "COMPLETED".

### Historia 4: Visualización (Dashboard)

* **Como:** Supervisor.  
* **Quiero:** Ver una tabla con las llamadas procesadas, filtrar por "Score \< 70" o "Sentimiento Negativo".  
* **Visualización:** Al hacer clic en una llamada, ver el detalle: Transcripción (generada por Gemini), Checklist de cumplimiento (Semáforo Verde/Rojo) y resumen.

## 6\. Prompt Engineering (Guía para el LLM)

Instrucción para Claude: *Implementa este System Prompt en el servicio de auditoría.*  
"Eres un Auditor de Calidad experto (QA) para un BPO. Tu tarea es escuchar la llamada de audio proporcionada y evaluar el desempeño del agente basándote ESTRICTAMENTE en las políticas del manual proporcionado en el contexto.

1. **Analiza el sentimiento:** Detecta frustración del cliente.  
2. **Verifica cumplimiento:** Revisa si se cumplieron los puntos obligatorios (Saludo, Identificación, Aviso de Privacidad, Cierre).  
3. **Detecta Riesgos:** Busca groserías, amenazas de demanda o fugas de información (tarjetas de crédito dictadas).  
4. **Grounding:** Si marcas un punto como 'No Cumplido', DEBES citar en qué segundo ocurrió el error o qué faltó según la página X del manual.

Salida obligatoria: JSON siguiendo el esquema AuditResult."

## 7\. Criterios de Aceptación Técnicos

1. **Latencia:** El procesamiento de una llamada de 5 minutos no debe tomar más de 30 segundos (usando Gemini Flash).  
2. **Fiabilidad JSON:** El sistema debe manejar errores si el LLM devuelve un JSON malformado (usar librerías de *retry* o *output parsers*).  
3. **Seguridad:** Aislamiento de datos. Un Tenant A nunca debe poder acceder a los audios o manuales del Tenant B.

## 8\. Pasos para Claude Code (Plan de Acción)

1. Configura estructura del proyecto (FastAPI \+ Streamlit).  
2. Crea utilidades de conexión a Google Cloud (Storage, Firestore, Vertex AI).  
3. Implementa el módulo de RAG simple (Ingesta de PDF \-\> Texto \-\> Contexto para Prompt).  
4. Crea el endpoint POST /analyze que orquesta la llamada a Gemini.  
5. Construye la UI básica en Streamlit para demo.


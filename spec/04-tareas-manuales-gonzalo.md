# Tareas Manuales — Gonzalo

Acciones que requieren intervención directa en dashboards, consolas o gestión con el cliente. No se pueden hacer desde el CLI.

---

## AHORA (antes de seguir desarrollando)

### 1. Supabase Dashboard — Redirect URLs para emails
Los correos de confirmación ya usan `window.location.origin`, pero Supabase necesita tener los dominios permitidos.

**Dónde:** Supabase Dashboard → Authentication → URL Configuration
- **Site URL:** `https://tu-dominio-principal.vercel.app`
- **Redirect URLs:** Agregar `https://*.vercel.app/**` (wildcard para preview branches)

### 2. Supabase Dashboard — Personalizar email templates
Los correos de confirmación dicen "Powered by Supabase" y se ven genéricos.

**Dónde:** Supabase Dashboard → Authentication → Email Templates
- Personalizar: Confirm signup, Reset password, Magic link
- Cambiar branding a DeepAudit / Callfast

---

## PRE-DEPLOY (cuando estemos listos para mostrar)

### 3. Ejecutar migración SQL en Supabase
El archivo `docs/migrations/006_security_and_callfast.sql` tiene todas las tablas nuevas, columnas, RLS y triggers pero NO se ha ejecutado.

**Dónde:** Supabase Dashboard → SQL Editor → Pegar y ejecutar el archivo

### 4. Cambiar bucket a privado
El bucket `call-recordings` sigue como público en Supabase. El código ya no usa `getPublicUrl()` pero el bucket debe cerrarse.

**Dónde:** Supabase Dashboard → Storage → call-recordings → Settings → Private

### 5. Configurar env vars en Vercel
Variables necesarias en Vercel (Settings → Environment Variables):

| Variable | Valor | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | tu URL de Supabase | Ya debería estar |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key | Ya debería estar |
| `SUPABASE_SERVICE_ROLE_KEY` | tu service role key | Para API routes |
| `INTERNAL_API_KEY` | generar un UUID o string aleatorio | Para auth entre servicios |
| `TENANT_KEY_ENCRYPTION_KEY` | string de 64 caracteres hex | Para BYOAK crypto |
| `NEXT_PUBLIC_PRODUCT_MODE` | `poc` | Modo POC para Callfast |
| `GOOGLE_API_KEY` | tu API key de Gemini | Para evaluación IA |

### 6. Configurar dominio
**Dónde:** Vercel → Project Settings → Domains → Agregar `callfast.deepaudit.com`
**DNS:** CNAME `callfast` → `cname.vercel-dns.com`

### 7. Budget cap en Google Cloud
Prevenir costos desbocados por uso de Gemini API.

**Dónde:** Google Cloud Console → Billing → Budgets & Alerts → Crear presupuesto

### 8. Seed data en Supabase
Una vez ejecutada la migración, insertar datos iniciales. El seed SQL se generará con el contenido sintético (Prompt 3 de spec/03).

**Dónde:** Supabase Dashboard → SQL Editor → Ejecutar `docs/synthetic/seed.sql` (cuando exista)

---

## GESTIÓN CON CALLFAST

### 9. Solicitar información a Callfast

Esta es la solicitud de información más importante. Sin esto no podemos entregar un POC preciso ni dimensionar la solución real. Dividida en bloques:

#### 9A. Información técnica de los audios

Necesitamos certeza absoluta sobre el formato de los audios para configurar correctamente el pipeline de transcripción:

- [ ] **Formato de archivo:** ¿MP3, WAV, OGG, otro? ¿Bitrate?
- [ ] **Canales:** ¿Estéreo (2 canales separados: agente + cliente) o mono (mezclado)?
- [ ] **Sample rate:** ¿8kHz (telefonía), 16kHz, 44.1kHz?
- [ ] **Duración promedio:** ¿Cuánto dura una llamada típica? ¿Cuál es el rango (mín/máx)?
- [ ] **Peso promedio por archivo:** Para estimar storage y transferencia
- [ ] **¿Hay música de espera en el audio?** ¿Se graba o se corta?
- [ ] **¿Se graba desde que el agente contesta o desde que entra al IVR?**
- [ ] **Sistema de grabación:** ¿Qué PBX/sistema genera los archivos? (Avaya, Cisco, Genesys, etc.)
- [ ] **¿Cómo se identifican las llamadas?** ¿Tienen un ID único, número de ticket, etc.?
- [ ] **Muestras:** Mínimo 10 llamadas reales para pruebas (variadas: buenas, malas, con silencios)

#### 9B. Volumen y operación diaria

Para dimensionar infraestructura, estimar costos y planear procesamiento por lotes:

- [ ] **Llamadas por día:** ¿Cuántas llamadas se generan en total al día?
- [ ] **Llamadas por turno:** ¿Cuántos turnos hay? ¿Cuántas llamadas por turno?
- [ ] **Horario de operación:** ¿24/7 o horario específico?
- [ ] **¿Cuántas llamadas quieren auditar?** ¿100%? ¿Un porcentaje? ¿Solo ciertas campañas?
- [ ] **Latencia aceptable:** ¿Necesitan resultados en tiempo real (minutos) o está bien batch (horas)?
- [ ] **Picos:** ¿Hay días/horarios con picos de volumen? ¿Cuánto sube?
- [ ] **Cantidad de agentes activos:** Para estimar volumen total
- [ ] **¿Cómo se entrega el audio hoy?** ¿SFTP, API, carpeta compartida, descarga manual?

#### 9C. Estructura organizacional (para reportes y dashboards)

Para poder estructurar los reportes por nivel como ellos quieren:

- [ ] **Organigrama de la operación:** ¿Cuántos niveles hay entre Director y Agente?
- [ ] **Estructura de campañas:** Lista de campañas activas y subcampañas
- [ ] **Supervisores y equipos:** ¿Cuántos supervisores? ¿Cuántos agentes por supervisor?
- [ ] **¿Cómo identifican al agente en la llamada?** ¿ID de empleado, extensión, nombre?
- [ ] **¿Hay metadata asociada a cada llamada?** (campaña, subcampaña, supervisor, agente, tipo de llamada)
- [ ] **Roles que consumirán los reportes:** Confirmar: gerencial, calidad (Alejandro), operaciones, supervisor, analista
- [ ] **Formato actual de sus reportes:** ¿Excel, PDF, dashboard en otra herramienta? Pedir ejemplo

#### 9D. Los 3 entregables del POC — entender el "para qué"

Necesitamos entender no solo QUÉ quieren sino PARA QUÉ lo quieren, para entregar la información de la forma más útil posible:

**Detección de silencios:**
- [ ] **¿Qué hacen hoy cuando detectan silencios?** ¿Penalización? ¿Retroalimentación? ¿Indicador de desempeño?
- [ ] **¿El umbral de 30s es por política interna o por experiencia?** ¿Hay diferentes umbrales por tipo de llamada?
- [ ] **¿Qué acción toman con un agente con muchos silencios?** Capacitación, advertencia, etc.
- [ ] **¿Diferencian silencio "buscando info" vs silencio "no sabe qué hacer"?**

**Validación de oferta comercial:**
- [ ] **¿Qué pasa cuando un agente ofrece algo incorrecto?** ¿Se anula? ¿Se respeta lo dicho al cliente? ¿Quién asume el costo?
- [ ] **¿Con qué frecuencia cambian las ofertas?** ¿Diario, semanal, por campaña?
- [ ] **¿Cómo se comunican las ofertas a los agentes hoy?** ¿Sistema, correo, pizarra, brief diario?
- [ ] **¿Cuál es el impacto de negocio de una oferta mal comunicada?** Cancelaciones, quejas, pérdida económica
- [ ] **Proporcionar la oferta comercial vigente** para la campaña del POC (texto completo con precios, condiciones, restricciones, promociones)

**Resumen estructurado:**
- [ ] **¿Qué sistema usan para registrar lo acordado con el cliente?** CRM, ticketing, otro
- [ ] **¿Qué campos deben llenarse después de cada llamada?** Lista exacta
- [ ] **¿Quién verifica que el agente registró correctamente?** ¿Supervisor? ¿Calidad? ¿Nadie?
- [ ] **¿Cuál es el costo de que un acuerdo no se registre?** Ejemplo: cliente llama otra vez, contratación no se aplica, queja
- [ ] **Proporcionar ejemplo de un registro correcto** en su sistema (screenshot o campos)

#### 9E. Materiales del POC

- [ ] Rúbrica de evaluación actual (cómo califican hoy las llamadas)
- [ ] Manual de calidad de la campaña del POC
- [ ] Evaluaciones previas realizadas por su equipo (para contrastar con nuestros resultados)
- [ ] Formato actual de reportes de evaluación (ejemplo real)

### 10. Definir política de retención de datos
Acordar con Callfast cuánto tiempo se retienen audios y transcripciones.

### 11. Documentar sub-procesadores (DPA)
Documentar que Google (Gemini API) y el proveedor STT procesan audio del cliente. Necesario para compliance.

### 12. Firmar NDA
Estado: Esperando respuesta de Eduardo Rugama.

---

## EVALUACIÓN TÉCNICA (cuando haya audio real)

### 13. Evaluar proveedor STT
Comparar AssemblyAI vs Deepgram con audio real en español mexicano.
Criterios: calidad de transcripción, timestamps word-level, soporte multicanal, pricing, latencia.

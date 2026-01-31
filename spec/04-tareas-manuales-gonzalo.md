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

### 9. Solicitar materiales para el POC
Materiales que Callfast quedó de entregar:

- [ ] Muestras de llamadas (audio)
- [ ] Documentos de campaña
- [ ] Rúbrica de evaluación actual
- [ ] Manual de calidad de la campaña
- [ ] Evaluaciones previas realizadas (para contrastar resultados)
- [ ] Material de oferta comercial vigente (para validación comercial)
- [ ] Formato actual de reportes de evaluación

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

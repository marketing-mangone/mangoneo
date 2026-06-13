# Setup de Meta — Facebook + Instagram + Ads

Guía paso a paso para conectar el consumo de datos de Meta al Marketing Hub.
Al terminar tendrás métricas orgánicas de Facebook e Instagram, más datos de Meta Ads,
sincronizándose automáticamente cada 2 horas vía Celery.

> **Pre-requisito:** el Instagram debe ser una cuenta **Business** (o Creator) y estar
> **vinculada a una Página de Facebook**. Las cuentas personales de Instagram no exponen
> métricas vía API.

---

## 1. Crear la Meta App

1. Entra a [developers.facebook.com](https://developers.facebook.com/) con la cuenta que
   administra la Página de Mangone Law Firm.
2. **Mis Apps → Crear app → tipo "Business"**.
3. Dentro de la app, agrega estos productos (botón "Configurar" en cada uno):
   - **Facebook Login** (solo para generar tokens en el Explorer; opcional con System User)
   - **Instagram Graph API**
   - **Marketing API**
4. Anota en **Configuración → Básica**:
   - `App ID`  → `META_APP_ID`
   - `App Secret` → `META_APP_SECRET`

---

## 2. Generar el token (System User — recomendado, NO expira)

1. Entra a [business.facebook.com](https://business.facebook.com/) →
   **Configuración del negocio → Usuarios → Usuarios del sistema**.
2. **Agregar** → crea un usuario del sistema de tipo **Admin**.
3. Asígnale acceso (botón "Agregar activos") a:
   - La **Página** de Facebook
   - La **cuenta de Instagram**
   - La **cuenta publicitaria** (Ad Account)
4. Clic en **Generar nuevo token** → selecciona tu App → marca estos permisos:
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_manage_insights`
   - `ads_read`
5. Copia el token generado → `META_ACCESS_TOKEN`. **Este token no expira.**

> Alternativa rápida (caduca en 60 días): genera un token desde el
> [Graph API Explorer](https://developers.facebook.com/tools/explorer/) con los mismos
> permisos y luego córrelo por `python manage.py authorize_meta --token <TOKEN_CORTO>`
> para intercambiarlo por uno de larga duración.

---

## 3. Obtener los IDs

Con el token a mano, usa el [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
o `curl`:

**Page ID** (`META_PAGE_ID`):
```
GET /me/accounts          → lista tus páginas con su "id"
```

**Instagram Business Account ID** (`META_INSTAGRAM_ACCOUNT_ID`):
```
GET /{PAGE_ID}?fields=instagram_business_account
```

**Ad Account ID** (`META_AD_ACCOUNT_ID` — solo el número, sin el prefijo `act_`):
```
GET /me/adaccounts        → cada cuenta viene como "act_123456789"; usa solo 123456789
```

---

## 4. Configurar variables de entorno

En `.env` local **y** en Railway (Variables del servicio backend):

```env
META_APP_ID=...
META_APP_SECRET=...
META_ACCESS_TOKEN=...
META_PAGE_ID=...
META_INSTAGRAM_ACCOUNT_ID=...
META_AD_ACCOUNT_ID=...          # solo el número
```

---

## 5. Verificar y sincronizar

```bash
# 1. Verifica que el token es válido y tiene los permisos correctos
python manage.py authorize_meta

# 2. Crea las definiciones de métricas (idempotente)
python manage.py seed_meta_metrics

# 3. Primera sincronización (totales + últimas 4 semanas)
python manage.py sync_meta

#    Backfill de más semanas:
python manage.py sync_meta --weeks 12
```

Si todo salió bien, abre el Hub → **Métricas → pestaña Meta** y verás los datos.

---

## 6. Automatización (ya configurada)

- La tarea Celery `metrics.tasks.sync_meta_metrics` corre **cada 2 horas**.
- Se registra con: `python manage.py setup_periodic_tasks`.
- Requiere que el worker de Celery y Celery Beat estén corriendo (ver `docker-compose.yml`).

---

## Notas y gotchas

- **Instagram `impressions`:** Meta está deprecando esta métrica a nivel de cuenta en
  versiones recientes de la Graph API. El conector usa `v20.0`; si en el futuro la columna
  llega en `0`, hay que migrar a la métrica `views` (`metric_type=total_value`) en
  `backend/metrics/connectors/meta.py`.
- **Versión de la API:** definida en `BASE` dentro de `connectors/meta.py`. Meta deprecia
  cada versión ~2 años; revisa el changelog si las llamadas empiezan a fallar.
- **Sin credenciales:** las funciones del conector retornan `{}` si falta el ID
  correspondiente, así que el sync no revienta — simplemente no guarda esa fuente.
- **Permisos faltantes:** `authorize_meta` te dirá exactamente cuáles faltan.

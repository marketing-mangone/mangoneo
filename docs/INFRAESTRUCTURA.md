# Infraestructura del Marketing Hub

Documento de referencia para Claude Code y el equipo técnico. Actualizar cuando cambien servicios, usuarios o configuración.

---

## Servicios Desplegados

| Servicio | Plataforma | URL |
|----------|-----------|-----|
| Frontend (Next.js) | Vercel | https://mangoneo.vercel.app |
| Backend (Django) | Railway | https://mangoneo-production.up.railway.app |
| Base de datos | Railway (PostgreSQL 16) | Interna: `postgres.railway.internal:5432` |
| Cache / Broker | Railway (Redis) | Interna: `redis.railway.internal` |
| Storage de archivos | Cloudflare R2 | Bucket: `marketing-hub-files` |

---

## Railway

- **Proyecto:** `gallant-dedication`
- **Workspace:** `marketing-mangone's Projects`
- **Environment:** `production`
- **Servicios:** `mangoneo` (backend Django), `Postgres`, `Redis`
- **CLI:** instalado en el sistema, autenticado como `sebastian.q@mangonelawfirmllc.com`
- **SSH key:** `~/.ssh/railway_mangone` (registrada como `mangone-hub`)

### Conexión directa a Postgres (desde local)
```
postgresql://postgres:cqikazOmNKGsaXsQRwCRRHGWooFhulcq@viaduct.proxy.rlwy.net:10301/railway
```
Usar con psycopg2 o psql (libpq instalado en el sistema).

### Variables de entorno clave en Railway (servicio mangoneo)
| Variable | Valor actual |
|----------|-------------|
| `ALLOWED_HOSTS` | `mangoneo-production.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://mangoneo.vercel.app` |
| `DEBUG` | `False` |
| `NEXT_PUBLIC_API_URL` | `https://mangoneo-production.up.railway.app` ← solo referencial, NO afecta el frontend |

> ⚠️ `NEXT_PUBLIC_API_URL` para el frontend va en **Vercel**, no en Railway.

---

## Vercel

- **Proyecto:** `mangoneo`
- **Framework:** Next.js 14 (App Router)
- **Variable clave:** `NEXT_PUBLIC_API_URL=https://mangoneo-production.up.railway.app`
- **Redeploy automático:** sí, al hacer push a `main`

---

## GitHub

- **Repo:** `marketing-mangone/mangoneo`
- **Rama principal:** `main`
- **CI/CD:** push a `main` → Railway redeploy automático + Vercel redeploy automático

---

## Usuarios en Producción

| Username | Email | Rol |
|----------|-------|-----|
| `sebastian` | Sebastian.q@mangonelawfirmllc.com | **Superuser / Admin** |
| `cristofer` | saab@mangonelawfirmllc.com | Team |
| `sara` | sara.c@mangonelawfirmllc.com | Team |
| `andres` | andrescoronel@mangonelawfirmllc.com | Team |
| `natalia` | natalia@mangonelawfirmllc.com | Team |
| `francisco` | franciscop@mangonelawfirmllc.com | Team |
| `gloriana` | gloriana.l@mangonelawfirmllc.com | Team |
| `alejandra` | alejandra.a@mangonelawfirmllc.com | Team |
| `sebasdqc` | sebastian.q@mangonelawfirmllc.com | Team |

Para resetear contraseña en producción sin Railway CLI:
```python
# Conectar a Postgres con psycopg2 y correr desde el venv local:
import psycopg2, django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth.hashers import make_password
conn = psycopg2.connect('postgresql://postgres:...@viaduct.proxy.rlwy.net:10301/railway')
cur = conn.cursor()
cur.execute("UPDATE auth_user SET password=%s WHERE username='sebastian'", (make_password('NuevaPass123!'),))
conn.commit(); conn.close()
```

---

## Autenticación

El sistema usa **JWT con cookies httpOnly** en el backend. Sin embargo, como Vercel y Railway son dominios distintos, el frontend guarda los tokens en `localStorage` como fallback (los navegadores bloquean cookies cross-origin entre dominios distintos).

Flujo:
1. Login → backend devuelve tokens en body + setea cookies
2. Frontend guarda `access_token` y `refresh_token` en localStorage
3. `apiFetch` envía `Authorization: Bearer <token>` en cada request
4. Al expirar el access token (15 min), se refresca con el refresh token (3 días)

---

## Problemas Conocidos y Soluciones

### 301 redirect loop en Railway
**Causa:** `SECURE_SSL_REDIRECT=True` sin `SECURE_PROXY_SSL_HEADER` — Railway termina SSL en el proxy y Django no lo sabe.
**Solución aplicada:** `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` en `settings.py`.

### Cookies httpOnly bloqueadas cross-origin
**Causa:** `vercel.app` y `railway.app` son dominios distintos — browsers bloquean third-party cookies.
**Solución aplicada:** Frontend guarda tokens en localStorage y los envía como Bearer header. Ver `frontend/src/lib/api.ts`.

### Sesión inválida tras cambios de auth
**Causa:** Al cambiar el mecanismo de auth, las sesiones activas quedan inválidas.
**Solución:** Hacer logout + login de nuevo. Si la contraseña se perdió, resetear via psycopg2 (ver sección Usuarios).

---

## Comandos Útiles

```bash
# Ver logs del backend en Railway
railway logs --service mangoneo

# Ver variables de entorno del backend
railway variables --service mangoneo

# Conectar a Postgres de producción
railway connect Postgres

# Redeploy manual del backend
railway redeploy --service mangoneo

# Ver estado del proyecto
railway status
```

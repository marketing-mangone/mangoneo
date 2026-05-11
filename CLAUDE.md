# CLAUDE.md — Marketing Hub

## Proyecto

Plataforma interna (internal tool) para el Departamento de Marketing de **Mangone Law Firm, LLC**, una firma de abogados de inmigración con sede en Morris Plains, NJ. Sirve al mercado Latino/Hispano en EE.UU.

El Hub centraliza métricas, KPIs, manual de marca, SOPs, job descriptions, assets y recursos operativos del equipo de marketing (6 personas) en una sola interfaz profesional.

---

## Arquitectura

**Lee `docs/architecture.html` antes de escribir código.** Es el documento maestro con todas las decisiones técnicas, modelo de datos, endpoints, stack y roadmap.

### Stack

- **Backend:** Django 5.x + Django REST Framework + Python 3.12+
- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL 16
- **Cache / Broker:** Redis 7
- **Task Queue:** Celery + django-celery-beat
- **Storage:** Cloudflare R2 (compatible con S3 API) via django-storages
- **Charts:** Recharts
- **Auth:** JWT (djangorestframework-simplejwt)

### Estructura del Monorepo

```
marketing-hub/
├── backend/          → Django project
├── frontend/         → Next.js project
├── docs/
│   ├── architecture.html
│   └── references/   → Brand manual, logos, UI inspiration
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## Contexto de Marca (IMPORTANTE)

Revisa `docs/references/` para entender la identidad visual de la firma antes de tomar decisiones de diseño en el frontend.

### Reglas de marca no negociables

- **Nunca usar la palabra "especialistas"** en ningún copy o texto del sistema. Está prohibida por regulaciones de ética legal.
- La firma usa el nombre completo "Mangone Law Firm" o "Mangone Law Firm, LLC".
- El abogado principal es **Auguy Mangone**. Su historia personal de inmigración es un diferenciador emocional clave.
- Credenciales destacadas: **Inc. 5000**, **BBB Accredited**.
- Programas clave: **Golden Tickets** (referral program), **Consultation Day** (live-streamed events).
- Podcast host: **Natalia Martínez**.
- Áreas de práctica: VAWA, Visa U, Visa T, SIJS, reunificación familiar, defensa de deportación, naturalización.

---

## Usuarios del Sistema

| Rol | Acceso | Personas |
|-----|--------|----------|
| **Admin** | Todo el sistema | Sebas (Director de Marketing) |
| **Team** | SOPs, brand, KPIs de su área, calendarios | Alejandra (Content), Sara (Design), Gloriana (Video), Andrés (Web/SEO), Jesús (HubSpot) |
| **Leadership** | Dashboard ejecutivo read-only | Auguy Mangone + partners |
| **Viewer** | Brand guidelines y recursos públicos | Otros departamentos |

---

## Convenciones de Código

### Backend (Django)

- Settings divididos: `config/settings/{base,development,staging,production}.py`
- Cada módulo es una Django app en `apps/`: `accounts`, `dashboard`, `brand`, `documents`, `metrics`, `integrations`, `notifications`
- Utilidades compartidas en `core/` (permissions, mixins, pagination, storage)
- Serializers de DRF para toda validación de input
- Celery tasks en `apps/{app}/tasks.py`
- Nombres de modelos en inglés, pero labels/help_text pueden ser en español
- Tests en `apps/{app}/tests/`
- Usar `update_or_create` para métricas snapshot (idempotencia)
- Upload de archivos via presigned URLs, nunca a través de Django directamente

### Frontend (Next.js)

- App Router (`src/app/`)
- Rutas agrupadas: `(auth)` para login, `(hub)` para el shell principal con sidebar
- Componentes de shadcn/ui en `src/components/ui/`
- Componentes por módulo en `src/components/modules/`
- API client centralizado en `src/lib/api.ts`
- Types en `src/types/`
- Custom hooks en `src/hooks/`
- Tailwind para todo el styling, CSS variables para theming de marca
- Recharts para gráficos y visualizaciones
- Todo el UI en **español** (labels, botones, mensajes, placeholders)
- Responsive: desktop-first pero debe funcionar en tablet

### General

- Monorepo: un solo PR para features full-stack
- Docker Compose para desarrollo local
- Variables de entorno en `.env` (nunca hardcoded)
- Git: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)

---

## Integraciones Externas

El Hub se conecta a estas APIs para alimentar métricas automáticamente via Celery beat:

| Fuente | Datos | Frecuencia |
|--------|-------|------------|
| HubSpot API v3 | Leads, pipeline, email metrics | Cada 30 min |
| Google Analytics 4 Data API | Sesiones, conversiones, tráfico | Diario |
| Google Search Console API | Impresiones, clicks, CTR, queries | Diario |
| Meta Marketing API | Ad spend, reach, engagement, CPL | Cada 2h |
| Google Ads API | Spend, conversions, CPC | Cada 2h |
| Monday.com API v2 (GraphQL) | Tareas, workload, deadlines | Cada 15 min |

Las API keys van en `.env`. Nunca commitear credenciales.

---

## Módulos (Prioridad de Desarrollo)

### Fase 1 — Fundación (Semanas 1-3)
- [ ] Django project + Next.js project + Docker Compose
- [ ] PostgreSQL + Redis + Celery setup
- [ ] Auth system (JWT, roles RBAC)
- [ ] Frontend shell: layout, sidebar, routing, theme
- [ ] R2 storage con presigned URLs

### Fase 2 — Core (Semanas 4-6)
- [ ] Biblioteca de Documentos (CRUD, versionamiento, full-text search)
- [ ] Brand Center (guidelines, galería de assets, paleta interactiva)
- [ ] Upload directo a R2 con progress bar

### Fase 3 — Métricas (Semanas 7-10)
- [ ] Conectores: HubSpot, GA4, Meta, Google Ads, Search Console
- [ ] Dashboard con Recharts
- [ ] Celery beat para sync automático
- [ ] Alertas de KPIs bajo target

### Fase 4 — Team + Polish (Semanas 11-12)
- [ ] Team Hub (perfiles, JDs, organigrama)
- [ ] Notificaciones in-app
- [ ] Dashboard ejecutivo para Leadership
- [ ] Testing, security audit, documentación

---

## Deploy

- **Backend:** Railway (Django + Celery + PostgreSQL + Redis)
- **Frontend:** Vercel
- **Storage:** Cloudflare R2
- **Dominio:** subdominio de mangonelaw.com (ej: `hub.mangonelaw.com`)
- **SSL:** automático via Cloudflare o Let's Encrypt

---

## Comandos Útiles

```bash
# Levantar todo el entorno de desarrollo
docker-compose up -d

# Migraciones
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# Frontend dev
cd frontend && npm run dev

# Celery worker
docker-compose exec celery celery -A config worker -l info

# Tests
docker-compose exec backend python manage.py test
cd frontend && npm run test
```

---

## Notas para Claude Code

1. **Siempre revisa `docs/references/` para contexto visual** antes de tomar decisiones de diseño.
2. **El documento de arquitectura (`docs/architecture.html`) es la fuente de verdad** para decisiones técnicas. Si hay conflicto entre este archivo y una instrucción ad-hoc, pregunta.
3. **El UI debe ser en español.** Los comentarios de código y nombres de variables pueden ser en inglés, pero todo lo que ve el usuario final es en español.
4. **No uses la palabra "especialistas"** en ningún texto visible al usuario. Es una restricción legal real.
5. **Prioriza funcionalidad sobre perfección visual.** El equipo necesita el Hub funcionando; el polish se itera después.
6. **Presigned URLs para uploads.** Nunca rutear archivos a través del servidor Django.
7. **Métricas como snapshots.** No hacer proxy real-time a APIs externas en cada request.
